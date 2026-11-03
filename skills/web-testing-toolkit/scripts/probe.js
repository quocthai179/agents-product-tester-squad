#!/usr/bin/env node
/**
 * probe.js — quick health / quality probe of one or more web pages.
 *
 * For every URL × browser × viewport it records:
 *   - full-page screenshot
 *   - console errors/warnings and uncaught page errors
 *   - failed requests and HTTP responses >= 400
 *   - navigation timing, LCP, CLS, transfer size, request count
 *   - broken images, horizontal overflow, missing <html lang>, missing <title>
 *   - (optional) axe-core accessibility violations
 *
 * Usage:
 *   node probe.js <url> [<url> ...] [options]
 *
 * Options:
 *   --out <dir>              output directory (default: .qa/evidence/<YYYY-MM-DD>-probe)
 *   --viewports <list>       e.g. 375x812,768x1024,1440x900 (default: 1440x900)
 *   --browsers <list>        chromium,firefox,webkit (default: chromium)
 *   --axe                    run axe-core (needs `npm i axe-core` in the project or next to this script)
 *   --axe-tags <list>        axe rule tags (default: wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa)
 *   --storage-state <file>   Playwright storage state JSON for an authenticated session
 *   --wait <ms>              extra wait after load before measuring (default: 1000)
 *   --timeout <ms>           navigation timeout (default: 30000)
 *   --runs <n>               repeat each probe n times and report the median timings (default: 1)
 *
 * Output: <out>/probe.json, <out>/probe.md and screenshots. Exit code 0 always
 * (it is an observation tool); read the summary to judge results.
 */
'use strict';

const fs = require('fs');
const path = require('path');

let playwright;
try {
  playwright = require('playwright');
} catch (e) {
  console.error('Cannot load "playwright". Install it (npm i -D playwright) or run where it is available.');
  process.exit(2);
}

function parseArgs(argv) {
  const opts = {
    urls: [],
    out: null,
    viewports: ['1440x900'],
    browsers: ['chromium'],
    axe: false,
    axeTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
    storageState: null,
    wait: 1000,
    timeout: 30000,
    runs: 1,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--out': opts.out = next(); break;
      case '--viewports': opts.viewports = next().split(',').filter(Boolean); break;
      case '--browsers': opts.browsers = next().split(',').filter(Boolean); break;
      case '--axe': opts.axe = true; break;
      case '--axe-tags': opts.axeTags = next().split(',').filter(Boolean); break;
      case '--storage-state': opts.storageState = next(); break;
      case '--wait': opts.wait = Number(next()); break;
      case '--timeout': opts.timeout = Number(next()); break;
      case '--runs': opts.runs = Math.max(1, Number(next())); break;
      case '-h': case '--help':
        console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]);
        process.exit(0);
      default:
        if (a.startsWith('--')) { console.error(`Unknown option ${a}`); process.exit(2); }
        opts.urls.push(a);
    }
  }
  if (!opts.urls.length) { console.error('Usage: node probe.js <url> [options] (see --help)'); process.exit(2); }
  if (!opts.out) {
    const d = new Date().toISOString().slice(0, 10);
    opts.out = path.join('.qa', 'evidence', `${d}-probe`);
  }
  return opts;
}

function loadAxeSource() {
  try {
    const p = require.resolve('axe-core', { paths: [process.cwd(), __dirname] });
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    return null;
  }
}

function slug(s) {
  return s.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'page';
}

function median(nums) {
  const v = nums.filter((n) => typeof n === 'number' && !Number.isNaN(n)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}

async function collectMetrics(page) {
  return page.evaluate(async () => {
    const out = {};
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
      out.ttfbMs = Math.round(nav.responseStart - nav.startTime);
      out.domContentLoadedMs = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
      out.loadMs = Math.round(nav.loadEventEnd - nav.startTime);
    }
    const resources = performance.getEntriesByType('resource');
    out.requestCount = resources.length + 1;
    out.transferKB = Math.round(
      (resources.reduce((s, r) => s + (r.transferSize || 0), 0) + ((nav && nav.transferSize) || 0)) / 1024
    );
    const observe = (type) => new Promise((resolve) => {
      const entries = [];
      try {
        const po = new PerformanceObserver((list) => entries.push(...list.getEntries()));
        po.observe({ type, buffered: true });
        setTimeout(() => { po.disconnect(); resolve(entries); }, 300);
      } catch (e) { resolve(null); }
    });
    const lcp = await observe('largest-contentful-paint');
    out.lcpMs = lcp && lcp.length ? Math.round(lcp[lcp.length - 1].startTime) : null;
    const shifts = await observe('layout-shift');
    out.cls = shifts ? Number(shifts.filter((e) => !e.hadRecentInput).reduce((s, e) => s + e.value, 0).toFixed(3)) : null;
    out.title = document.title;
    out.htmlLang = document.documentElement.getAttribute('lang');
    out.horizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    out.brokenImages = Array.from(document.images)
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src)
      .slice(0, 20);
    return out;
  });
}

async function probeOnce(browser, url, vp, opts, axeSource, shotPath) {
  const [width, height] = vp.split('x').map(Number);
  const ctxOpts = { viewport: { width, height } };
  if (opts.storageState) ctxOpts.storageState = opts.storageState;
  if (width < 600) { ctxOpts.isMobile = browser.browserType().name() !== 'firefox'; ctxOpts.hasTouch = true; }
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();
  const consoleMsgs = [];
  const pageErrors = [];
  const failedRequests = [];
  const badResponses = [];
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) consoleMsgs.push({ type: m.type(), text: m.text().slice(0, 500) });
  });
  page.on('pageerror', (e) => pageErrors.push(String(e && e.message ? e.message : e).slice(0, 500)));
  page.on('requestfailed', (r) => failedRequests.push({ url: r.url(), error: (r.failure() || {}).errorText }));
  page.on('response', (r) => { if (r.status() >= 400) badResponses.push({ url: r.url(), status: r.status() }); });

  const result = { url, browser: browser.browserType().name(), viewport: vp };
  try {
    const resp = await page.goto(url, { waitUntil: 'load', timeout: opts.timeout });
    result.status = resp ? resp.status() : null;
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(opts.wait);
    Object.assign(result, await collectMetrics(page));
    if (shotPath) {
      await page.screenshot({ path: shotPath, fullPage: true });
      result.screenshot = shotPath;
    }
    if (opts.axe && axeSource) {
      await page.addScriptTag({ content: axeSource });
      const axe = await page.evaluate(async (tags) => {
        // eslint-disable-next-line no-undef
        const r = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
        return {
          version: r.testEngine && r.testEngine.version,
          violations: r.violations.map((v) => ({
            id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, tags: v.tags.filter((t) => t.startsWith('wcag')),
            nodes: v.nodes.length, targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
          })),
          incomplete: r.incomplete.length,
          passes: r.passes.length,
        };
      }, opts.axeTags);
      result.axe = axe;
    }
  } catch (e) {
    result.error = String(e.message || e).split('\n')[0];
  }
  result.consoleMessages = consoleMsgs;
  result.pageErrors = pageErrors;
  result.failedRequests = failedRequests;
  result.badResponses = badResponses;
  await context.close();
  return result;
}

function toMarkdown(results, opts, axeMissing) {
  const L = [];
  L.push(`# Page probe — ${new Date().toISOString()}`);
  L.push('');
  if (axeMissing) L.push('> axe-core not found — accessibility scan skipped. Install with `npm i -D axe-core` in the project (or next to probe.js) and re-run with --axe.\n');
  L.push('| URL | Browser | Viewport | Status | TTFB ms | DCL ms | Load ms | LCP ms | CLS | KB | Req | Console err | Page err | Failed/4xx-5xx | Broken img | H-overflow | Axe violations |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    const ce = r.consoleMessages.filter((m) => m.type === 'error').length;
    const axeCount = r.axe ? r.axe.violations.length : (opts.axe ? 'n/a' : '-');
    L.push(`| ${r.url} | ${r.browser} | ${r.viewport} | ${r.error ? 'ERROR' : r.status} | ${r.ttfbMs ?? ''} | ${r.domContentLoadedMs ?? ''} | ${r.loadMs ?? ''} | ${r.lcpMs ?? ''} | ${r.cls ?? ''} | ${r.transferKB ?? ''} | ${r.requestCount ?? ''} | ${ce} | ${r.pageErrors.length} | ${r.failedRequests.length + r.badResponses.length} | ${(r.brokenImages || []).length} | ${r.horizontalOverflow ? 'YES' : 'no'} | ${axeCount} |`);
  }
  L.push('');
  for (const r of results) {
    const issues = [];
    if (r.error) issues.push(`- Navigation error: ${r.error}`);
    if (r.title === '') issues.push('- Empty <title>');
    if (r.htmlLang === null && !r.error) issues.push('- Missing <html lang> attribute');
    if (r.horizontalOverflow) issues.push('- Horizontal overflow (page wider than viewport)');
    for (const m of r.consoleMessages) issues.push(`- console.${m.type}: ${m.text}`);
    for (const e of r.pageErrors) issues.push(`- Uncaught error: ${e}`);
    for (const f of r.failedRequests) issues.push(`- Request failed: ${f.url} (${f.error})`);
    for (const b of r.badResponses) issues.push(`- HTTP ${b.status}: ${b.url}`);
    for (const i of r.brokenImages || []) issues.push(`- Broken image: ${i}`);
    if (r.axe) for (const v of r.axe.violations) issues.push(`- axe [${v.impact}] ${v.id} (${v.tags.join(', ')}): ${v.help} — ${v.nodes} node(s), e.g. \`${v.targets[0] || ''}\``);
    if (issues.length) {
      L.push(`## ${r.url} — ${r.browser} ${r.viewport}`);
      if (r.screenshot) L.push(`Screenshot: \`${r.screenshot}\``);
      L.push(...issues, '');
    }
  }
  return L.join('\n');
}

(async () => {
  const opts = parseArgs(process.argv.slice(2));
  fs.mkdirSync(opts.out, { recursive: true });
  const axeSource = opts.axe ? loadAxeSource() : null;
  const axeMissing = opts.axe && !axeSource;
  const results = [];
  for (const bName of opts.browsers) {
    const bt = playwright[bName];
    if (!bt) { console.error(`Unknown browser ${bName}`); continue; }
    let browser;
    try { browser = await bt.launch(); } catch (e) {
      console.error(`Cannot launch ${bName}: ${String(e.message).split('\n')[0]}`);
      continue;
    }
    for (const url of opts.urls) {
      for (const vp of opts.viewports) {
        const runs = [];
        for (let i = 0; i < opts.runs; i++) {
          const shot = i === 0 ? path.join(opts.out, `${slug(url)}_${bName}_${vp}.png`) : null;
          runs.push(await probeOnce(browser, url, vp, opts, i === 0 ? axeSource : null, shot));
        }
        const r = runs[0];
        if (opts.runs > 1) {
          for (const k of ['ttfbMs', 'domContentLoadedMs', 'loadMs', 'lcpMs', 'transferKB']) r[k] = median(runs.map((x) => x[k]));
          r.cls = runs.map((x) => x.cls).filter((x) => x !== null).sort((a, b) => a - b)[Math.floor(runs.length / 2)] ?? null;
          r.runs = opts.runs;
        }
        results.push(r);
        console.log(`${r.error ? 'ERR ' : 'ok  '} ${bName} ${vp} ${url}${r.error ? ' — ' + r.error : ''}`);
      }
    }
    await browser.close();
  }
  fs.writeFileSync(path.join(opts.out, 'probe.json'), JSON.stringify({ options: { ...opts, storageState: opts.storageState ? '(provided)' : null }, results }, null, 2));
  const md = toMarkdown(results, opts, axeMissing);
  fs.writeFileSync(path.join(opts.out, 'probe.md'), md);
  console.log(`\nWrote ${path.join(opts.out, 'probe.md')} and probe.json`);
  if (axeMissing) console.log('Note: axe-core not found; accessibility scan skipped (npm i -D axe-core).');
})();
