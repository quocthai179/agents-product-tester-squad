---
name: web-testing-toolkit
description: Ready-to-run Playwright tools for testers on web products — `probe.js` (screenshots across viewports/browsers, console errors, failed requests, 4xx/5xx, broken images, horizontal overflow, TTFB/LCP/CLS/transfer size, optional axe-core WCAG scan) and `run_steps.js` (execute declarative `.steps.json` test cases with per-step pass/fail, screenshots on failure, secrets from environment variables) — plus Playwright snippets for auth state, throttling, mocking failures and device emulation. Use when testing a web UI, smoke-checking pages, running designed web test cases, collecting evidence, or doing quick accessibility/performance checks.
---

# Web testing toolkit

Scripts live in `scripts/` next to this file. They need Node.js and the `playwright` package (in cloud sessions it is pre-installed; elsewhere run `npm i -D playwright && npx playwright install chromium`). If a browser tool is available in the session (Playwright MCP, Claude in Chrome), it is fine to use it for interactive exploration; use these scripts for repeatable runs and evidence.

Never point these tools at production or third-party sites unless the user explicitly asked for that target.

## probe.js — page health and quality probe

```bash
node <skill>/scripts/probe.js https://staging.example.com/ https://staging.example.com/cart \
  --viewports 375x812,768x1024,1440x900 --browsers chromium,firefox,webkit --axe --runs 3 \
  --out .qa/evidence/2026-11-03-probe
```

Writes `probe.md` (summary table + issues per page) and `probe.json`, plus full-page screenshots. Per URL × browser × viewport it reports HTTP status, TTFB/DCL/load, LCP, CLS, transfer KB, request count, console errors/warnings, uncaught errors, failed requests and 4xx/5xx responses, broken images, horizontal overflow, missing `<title>`/`<html lang>`, and axe-core violations (impact, rule, WCAG tags, sample selectors).

- `--axe` needs `axe-core` resolvable from the current directory or the script folder: `npm i -D axe-core` (if not installed, the scan is skipped with a note — say so in your report).
- `--storage-state auth.json` probes logged-in pages (see "Authenticated sessions").
- `--runs N` reports median timings — use ≥ 3 for performance statements.
- Browsers that are not installed are skipped with a message; report which ones actually ran.

## run_steps.js — execute declarative web test cases

```bash
QA_PASSWORD=... node <skill>/scripts/run_steps.js .qa/cases/login/ --base-url https://staging.example.com \
  --out .qa/evidence/2026-11-03-login
```

Accepts `.steps.json` files or directories of them. Writes `results.md` / `results.json`, a screenshot for each failing step and for each `screenshot` step. Exit code 1 if any case failed. See `examples/TC-LOGIN-001.steps.json`.

```json
{
  "id": "TC-LOGIN-001",
  "title": "Member can sign in with valid credentials",
  "baseUrl": "http://localhost:3000",
  "viewport": { "width": 1280, "height": 800 },
  "locale": "vi-VN",
  "timezoneId": "Asia/Ho_Chi_Minh",
  "steps": [
    { "goto": "/login" },
    { "fill": { "label": "Email" }, "value": "qa.member@example.test" },
    { "fill": { "label": "Mật khẩu" }, "value": "${QA_PASSWORD}" },
    { "click": { "role": "button", "name": "Đăng nhập" } },
    { "expectUrl": "/dashboard" },
    { "expectText": "Xin chào" },
    { "expectNoConsoleErrors": true },
    { "screenshot": "signed-in" }
  ]
}
```

**Targets**: CSS string, or `{"role","name"}`, `{"label"}`, `{"text"}`, `{"testId"}`, `{"placeholder"}`, `{"altText"}`, `{"title"}`, `{"selector"}`; add `"nth"` to choose among matches, `"exact": true` for exact text.
**Actions**: `goto`, `click`, `dblclick`, `fill`, `type`, `press`, `select`, `check`, `uncheck`, `hover`, `upload`, `waitFor`, `wait` (avoid), `reload`, `back`, `screenshot`.
**Assertions**: `expectText` (optionally `"in": target`), `expectNoText`, `expectVisible`, `expectHidden`, `expectEnabled`, `expectDisabled`, `expectValue`, `expectCount`, `expectUrl`, `expectTitle` (substring or `"/regex/flags"`), `expectNoConsoleErrors`.
Any step can have `"name"` and `"optional": true`. `${VAR}` reads environment variables — never write secrets into case files.

Prefer role/label/test-id targets (resilient to markup changes). When a step fails, read the failure screenshot before concluding it is a product bug — it may be a wrong locator or test data (then it is a test issue, not a bug).

## Playwright snippets

Run ad-hoc scripts with `node script.js` (CommonJS `require('playwright')`).

**Authenticated sessions** — log in once, save state, reuse it:

```js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto(process.env.BASE_URL + '/login');
  await p.getByLabel('Email').fill(process.env.QA_USER);
  await p.getByLabel('Password').fill(process.env.QA_PASSWORD);
  await p.getByRole('button', { name: /sign in|đăng nhập/i }).click();
  await p.waitForURL(/dashboard/);
  await p.context().storageState({ path: '.qa/auth.json' }); // git-ignore this file
  await b.close();
})();
```

**Slow network + CPU throttling** (Chromium):

```js
const cdp = await page.context().newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
```

**Simulate failures of backend/third-party calls:**

```js
await page.route('**/api/payments/**', (r) => r.fulfill({ status: 503, body: '{"error":"unavailable"}' }));
await page.route('**/api/search**', async (r) => { await new Promise((s) => setTimeout(s, 8000)); await r.continue(); });
await page.context().setOffline(true); // then false
```

**Device emulation:** `const { devices } = require('playwright'); browser.newContext({ ...devices['iPhone 13'], locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' })`.

**Keyboard-only walk:** press `Tab` repeatedly and log `document.activeElement` (tag, accessible name, bounding box) to check focus order and visibility; screenshot each focus stop for evidence.

**Capture a trace for a bug report:** `await context.tracing.start({ screenshots: true, snapshots: true })` … `await context.tracing.stop({ path: '.qa/evidence/<slug>/trace.zip' })` — open with `npx playwright show-trace`.
