#!/usr/bin/env node
/**
 * run_steps.js — execute declarative web test cases (".steps.json") with Playwright
 * and record pass/fail per step with evidence.
 *
 * Usage:
 *   node run_steps.js <case.steps.json | dir> [more ...] [options]
 *
 * Options:
 *   --out <dir>              evidence/output dir (default: .qa/evidence/<YYYY-MM-DD>-steps)
 *   --browser <name>         chromium | firefox | webkit (default: chromium)
 *   --base-url <url>         overrides "baseUrl" in the files
 *   --storage-state <file>   Playwright storage state for an authenticated session
 *   --timeout <ms>           per-step timeout (default: 10000)
 *   --screenshot-each        screenshot after every step (default: only on failure and "screenshot" steps)
 *
 * File format (one test case per file):
 * {
 *   "id": "TC-LOGIN-001",
 *   "title": "Valid user can sign in",
 *   "baseUrl": "http://localhost:3000",
 *   "viewport": { "width": 1280, "height": 800 },
 *   "steps": [
 *     { "goto": "/login" },
 *     { "fill": { "label": "Email" }, "value": "qa.user@example.test" },
 *     { "fill": { "selector": "#password" }, "value": "${QA_PASSWORD}" },
 *     { "click": { "role": "button", "name": "Sign in" } },
 *     { "expectUrl": "/dashboard" },
 *     { "expectText": "Welcome" },
 *     { "expectVisible": { "testId": "user-menu" } },
 *     { "screenshot": "signed-in" }
 *   ]
 * }
 *
 * Target (locator) forms: "css selector" | {"selector"} | {"role","name"?,"exact"?} | {"label"} |
 *   {"text","exact"?} | {"testId"} | {"placeholder"} | {"altText"} | {"title"}; add "nth": n to pick one.
 * Actions: goto, click, dblclick, fill(+value), type(+value), press(+key, target optional), select(+value),
 *   check, uncheck, hover, upload(+files), waitFor(target), wait(ms — avoid), reload, back.
 * Assertions: expectText (string; optional "in": target), expectNoText, expectVisible, expectHidden,
 *   expectEnabled, expectDisabled, expectValue(+value), expectCount(+count), expectUrl (substring or "/regex/"),
 *   expectTitle (substring or "/regex/"), expectNoConsoleErrors (true).
 * Every step may have "name" (shown in the report) and "optional": true (failure is a warning).
 * "${VAR}" in any string is replaced with the environment variable VAR (never commit secrets).
 *
 * Output: <out>/results.json, <out>/results.md, screenshots. Exit code 1 if any case fails.
 */
'use strict';

const fs = require('fs');
const path = require('path');

let playwright;
try { playwright = require('playwright'); } catch (e) {
  console.error('Cannot load "playwright". Install it (npm i -D playwright) or run where it is available.');
  process.exit(2);
}

function parseArgs(argv) {
  const o = { files: [], out: null, browser: 'chromium', baseUrl: null, storageState: null, timeout: 10000, screenshotEach: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--out') o.out = next();
    else if (a === '--browser') o.browser = next();
    else if (a === '--base-url') o.baseUrl = next();
    else if (a === '--storage-state') o.storageState = next();
    else if (a === '--timeout') o.timeout = Number(next());
    else if (a === '--screenshot-each') o.screenshotEach = true;
    else if (a === '-h' || a === '--help') { console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]); process.exit(0); }
    else if (a.startsWith('--')) { console.error(`Unknown option ${a}`); process.exit(2); }
    else o.files.push(a);
  }
  if (!o.files.length) { console.error('Usage: node run_steps.js <case.steps.json|dir> [options] (see --help)'); process.exit(2); }
  if (!o.out) o.out = path.join('.qa', 'evidence', `${new Date().toISOString().slice(0, 10)}-steps`);
  return o;
}

function expandFiles(inputs) {
  const files = [];
  for (const p of inputs) {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      for (const f of fs.readdirSync(p).sort()) if (f.endsWith('.steps.json')) files.push(path.join(p, f));
    } else files.push(p);
  }
  return files;
}

function subst(v) {
  if (typeof v === 'string') {
    return v.replace(/\$\{([A-Z0-9_]+)\}/gi, (_, name) => {
      if (process.env[name] === undefined) throw new Error(`Environment variable ${name} is not set`);
      return process.env[name];
    });
  }
  if (Array.isArray(v)) return v.map(subst);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, subst(x)]));
  return v;
}

function locator(page, t) {
  if (typeof t === 'string') return page.locator(t).first();
  const loc = allMatches(page, t);
  return typeof t.nth === 'number' ? loc.nth(t.nth) : loc.first();
}

function allMatches(page, t) {
  if (typeof t === 'string') return page.locator(t);
  let loc;
  if (t.selector) loc = page.locator(t.selector);
  else if (t.role) loc = page.getByRole(t.role, t.name !== undefined ? { name: t.name, exact: !!t.exact } : {});
  else if (t.label) loc = page.getByLabel(t.label, { exact: !!t.exact });
  else if (t.text) loc = page.getByText(t.text, { exact: !!t.exact });
  else if (t.testId) loc = page.getByTestId(t.testId);
  else if (t.placeholder) loc = page.getByPlaceholder(t.placeholder, { exact: !!t.exact });
  else if (t.altText) loc = page.getByAltText(t.altText, { exact: !!t.exact });
  else if (t.title) loc = page.getByTitle(t.title, { exact: !!t.exact });
  else throw new Error(`Unrecognised target ${JSON.stringify(t)}`);
  return loc;
}

function matcher(s) {
  const m = /^\/(.*)\/([gimsuy]*)$/.exec(s);
  return m ? new RegExp(m[1], m[2]) : null;
}

async function poll(fn, timeout, describe) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    last = await fn();
    if (last === true) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(describe(last));
}

const ACTIONS = ['goto', 'click', 'dblclick', 'fill', 'type', 'press', 'select', 'check', 'uncheck', 'hover', 'upload',
  'waitFor', 'wait', 'reload', 'back', 'screenshot', 'expectText', 'expectNoText', 'expectVisible', 'expectHidden',
  'expectEnabled', 'expectDisabled', 'expectValue', 'expectCount', 'expectUrl', 'expectTitle', 'expectNoConsoleErrors'];

async function runStep(page, step, ctx) {
  const kind = ACTIONS.find((k) => k in step);
  if (!kind) throw new Error(`Unknown step: ${JSON.stringify(step)}`);
  const s = subst(step);
  const v = s[kind];
  const T = ctx.timeout;
  switch (kind) {
    case 'goto': {
      const url = /^https?:\/\//.test(v) ? v : new URL(v, ctx.baseUrl).toString();
      const resp = await page.goto(url, { waitUntil: 'load', timeout: Math.max(T, 30000) });
      if (resp && resp.status() >= 400) throw new Error(`HTTP ${resp.status()} for ${url}`);
      return `opened ${url}`;
    }
    case 'click': await locator(page, v).click({ timeout: T }); return 'clicked';
    case 'dblclick': await locator(page, v).dblclick({ timeout: T }); return 'double-clicked';
    case 'fill': await locator(page, v).fill(String(s.value ?? ''), { timeout: T }); return 'filled';
    case 'type': await locator(page, v).pressSequentially(String(s.value ?? ''), { timeout: T, delay: 20 }); return 'typed';
    case 'press':
      if (typeof v === 'string' && !s.key) { await page.keyboard.press(v); return `pressed ${v}`; }
      await locator(page, v).press(s.key, { timeout: T }); return `pressed ${s.key}`;
    case 'select': await locator(page, v).selectOption(s.value, { timeout: T }); return `selected ${JSON.stringify(s.value)}`;
    case 'check': await locator(page, v).check({ timeout: T }); return 'checked';
    case 'uncheck': await locator(page, v).uncheck({ timeout: T }); return 'unchecked';
    case 'hover': await locator(page, v).hover({ timeout: T }); return 'hovered';
    case 'upload': await locator(page, v).setInputFiles(s.files, { timeout: T }); return 'uploaded';
    case 'waitFor': await locator(page, v).waitFor({ state: 'visible', timeout: T }); return 'visible';
    case 'wait': await page.waitForTimeout(Number(v)); return `waited ${v}ms`;
    case 'reload': await page.reload({ waitUntil: 'load' }); return 'reloaded';
    case 'back': await page.goBack({ waitUntil: 'load' }); return 'navigated back';
    case 'screenshot': {
      const p = path.join(ctx.out, `${ctx.caseSlug}_${String(v).replace(/[^a-z0-9-_]+/gi, '-')}.png`);
      await page.screenshot({ path: p, fullPage: true });
      ctx.shots.push(p);
      return `screenshot ${p}`;
    }
    case 'expectText': {
      const scope = s.in ? locator(page, s.in) : page.locator('body');
      await poll(async () => (await scope.innerText().catch(() => '')).includes(v), T, () => `text "${v}" not found`);
      return `found "${v}"`;
    }
    case 'expectNoText': {
      const scope = s.in ? locator(page, s.in) : page.locator('body');
      const txt = await scope.innerText().catch(() => '');
      if (txt.includes(v)) throw new Error(`unexpected text "${v}" is present`);
      return `"${v}" absent`;
    }
    case 'expectVisible': await locator(page, v).waitFor({ state: 'visible', timeout: T }); return 'visible';
    case 'expectHidden': await locator(page, v).waitFor({ state: 'hidden', timeout: T }); return 'hidden';
    case 'expectEnabled':
      await poll(() => locator(page, v).isEnabled().catch(() => false), T, () => 'element is not enabled'); return 'enabled';
    case 'expectDisabled':
      await poll(() => locator(page, v).isDisabled().catch(() => false), T, () => 'element is not disabled'); return 'disabled';
    case 'expectValue':
      await poll(async () => (await locator(page, v).inputValue().catch(() => null)) === String(s.value), T,
        () => `value is not "${s.value}"`);
      return `value "${s.value}"`;
    case 'expectCount': {
      const base = allMatches(page, v);
      let n;
      await poll(async () => (n = await base.count()) === Number(s.count), T, () => `count is ${n}, expected ${s.count}`);
      return `count ${s.count}`;
    }
    case 'expectUrl': {
      const re = matcher(v);
      await poll(() => (re ? re.test(page.url()) : page.url().includes(v)), T, () => `URL is ${page.url()}`);
      return `URL ${page.url()}`;
    }
    case 'expectTitle': {
      const re = matcher(v);
      let t;
      await poll(async () => { t = await page.title(); return re ? re.test(t) : t.includes(v); }, T, () => `title is "${t}"`);
      return `title "${t}"`;
    }
    case 'expectNoConsoleErrors':
      if (ctx.consoleErrors.length) throw new Error(`console errors: ${ctx.consoleErrors.slice(0, 3).join(' | ')}`);
      return 'no console errors';
    default: throw new Error(`Unhandled ${kind}`);
  }
}

function describe(step) {
  if (step.name) return step.name;
  const kind = ACTIONS.find((k) => k in step) || '?';
  const v = step[kind];
  const t = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return `${kind} ${t}${step.value !== undefined ? ` = ${String(step.value).includes('${') ? step.value : JSON.stringify(step.value)}` : ''}`;
}

(async () => {
  const o = parseArgs(process.argv.slice(2));
  fs.mkdirSync(o.out, { recursive: true });
  const files = expandFiles(o.files);
  const bt = playwright[o.browser];
  if (!bt) { console.error(`Unknown browser ${o.browser}`); process.exit(2); }
  const browser = await bt.launch();
  const results = [];
  for (const file of files) {
    const tc = JSON.parse(fs.readFileSync(file, 'utf8'));
    const id = tc.id || path.basename(file, '.steps.json');
    const caseSlug = id.replace(/[^a-z0-9-_]+/gi, '-');
    const ctxOpts = { viewport: tc.viewport || { width: 1280, height: 800 } };
    if (o.storageState) ctxOpts.storageState = o.storageState;
    if (tc.locale) ctxOpts.locale = tc.locale;
    if (tc.timezoneId) ctxOpts.timezoneId = tc.timezoneId;
    const context = await browser.newContext(ctxOpts);
    const page = await context.newPage();
    const ctx = { baseUrl: o.baseUrl || tc.baseUrl || 'http://localhost', timeout: o.timeout, out: o.out, caseSlug, shots: [], consoleErrors: [] };
    page.on('console', (m) => { if (m.type() === 'error') ctx.consoleErrors.push(m.text().slice(0, 300)); });
    page.on('pageerror', (e) => ctx.consoleErrors.push(`Uncaught: ${String(e.message || e).slice(0, 300)}`));
    const stepResults = [];
    let status = 'pass';
    const started = Date.now();
    for (let i = 0; i < (tc.steps || []).length; i++) {
      const step = tc.steps[i];
      const t0 = Date.now();
      try {
        const detail = await runStep(page, step, ctx);
        stepResults.push({ n: i + 1, step: describe(step), result: 'pass', detail, ms: Date.now() - t0 });
        if (o.screenshotEach) {
          const p = path.join(o.out, `${caseSlug}_step${i + 1}.png`);
          await page.screenshot({ path: p }); ctx.shots.push(p);
        }
      } catch (e) {
        const msg = String(e.message || e).split('\n')[0];
        const shot = path.join(o.out, `${caseSlug}_FAIL_step${i + 1}.png`);
        await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
        ctx.shots.push(shot);
        if (step.optional) {
          stepResults.push({ n: i + 1, step: describe(step), result: 'warn', detail: msg, ms: Date.now() - t0, screenshot: shot });
          continue;
        }
        stepResults.push({ n: i + 1, step: describe(step), result: 'fail', detail: msg, ms: Date.now() - t0, screenshot: shot });
        status = 'fail';
        for (let j = i + 1; j < tc.steps.length; j++) stepResults.push({ n: j + 1, step: describe(tc.steps[j]), result: 'not-run' });
        break;
      }
    }
    await context.close();
    results.push({ id, title: tc.title || '', file, status, url: page.url(), durationMs: Date.now() - started, steps: stepResults, consoleErrors: ctx.consoleErrors, screenshots: ctx.shots });
    console.log(`${status === 'pass' ? 'PASS' : 'FAIL'} ${id} ${tc.title || ''}`);
    if (status === 'fail') {
      const f = stepResults.find((s) => s.result === 'fail');
      console.log(`     step ${f.n}: ${f.step} → ${f.detail}`);
    }
  }
  await browser.close();

  const pass = results.filter((r) => r.status === 'pass').length;
  const L = [`# Step run — ${new Date().toISOString()} (${o.browser})`, '', `Total ${results.length} | Pass ${pass} | Fail ${results.length - pass}`, ''];
  L.push('| Case | Title | Result | Duration | Failure |', '|---|---|---|---|---|');
  for (const r of results) {
    const f = r.steps.find((s) => s.result === 'fail');
    L.push(`| ${r.id} | ${r.title} | ${r.status.toUpperCase()} | ${(r.durationMs / 1000).toFixed(1)}s | ${f ? `step ${f.n}: ${f.detail.replace(/\|/g, '\\|')}` : ''} |`);
  }
  for (const r of results) {
    L.push('', `## ${r.id} — ${r.status.toUpperCase()}`, '', '| # | Step | Result | Detail |', '|---|---|---|---|');
    for (const s of r.steps) L.push(`| ${s.n} | ${s.step.replace(/\|/g, '\\|')} | ${s.result} | ${(s.detail || '').replace(/\|/g, '\\|')}${s.screenshot ? ` (\`${s.screenshot}\`)` : ''} |`);
    if (r.consoleErrors.length) L.push('', 'Console errors:', ...r.consoleErrors.map((c) => `- ${c}`));
  }
  fs.writeFileSync(path.join(o.out, 'results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(o.out, 'results.md'), L.join('\n'));
  console.log(`\nTotal ${results.length} | Pass ${pass} | Fail ${results.length - pass}\nWrote ${path.join(o.out, 'results.md')}`);
  process.exit(pass === results.length ? 0 : 1);
})();
