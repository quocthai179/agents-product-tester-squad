# agents-product-tester-squad

A **product tester agent squad** for [Claude Code](https://code.claude.com): 11 specialized testing agents, 13 workflow commands and 5 skills (including ready-to-run Playwright scripts), all working on a shared `.qa/` workspace with a common handoff format.

> Plugin name: **`tester-squad`**. It works alongside the `dev-squad` plugin: testers find and report bugs, and confirmed bugs are handed to `dev-squad:debugger` / `dev-squad:developer` for fixing.

## Installation

```bash
/plugin marketplace add quocthai179/agents-product-tester-squad
```

```bash
/plugin install tester-squad@agents-product-tester-squad
```

On Claude Code 2.1.275 or later you can install in one step:

```bash
/plugin install tester-squad --marketplace quocthai179/agents-product-tester-squad
```

Run a whole session with the test lead as the main agent:

```bash
claude --agent tester-squad:test-lead
```

## The squad (11 agents)

| Agent | Role | Main output |
|---|---|---|
| `test-lead` | Test lead: assesses risk, picks the pipeline, dispatches work, checks evidence, gives the verdict | Dispatch plan, final summary |
| `test-analyst` | Reviews requirements/PRDs (static testing), derives test conditions, analyses product risk, writes the test strategy/plan | `.qa/analysis/`, `.qa/plans/` |
| `test-designer` | Designs test cases with EP, BVA, decision tables, state transitions and pairwise; test data; traceability | `.qa/cases/` (+ CSV, `.steps.json`) |
| `exploratory-tester` | Charter-based exploratory testing with heuristics and tours, on the real product in a browser | `.qa/sessions/` |
| `functional-tester` | Executes test cases, smoke/regression runs, bug fix verification, runs existing automated suites | `.qa/runs/` |
| `api-tester` | Contract-based API testing: validation, authN/authZ (IDOR), status codes, idempotency, compatibility | `.qa/runs/…-api-…`, `.qa/api/` |
| `ux-accessibility-tester` | Usability (Nielsen), WCAG 2.2 AA (axe-core + manual checks), content, i18n/l10n, responsive | `.qa/reports/…-ux-a11y-…` |
| `nonfunctional-tester` | Perceived performance (LCP/INP/CLS), light load smoke, security smoke, reliability/recovery, compatibility | `.qa/reports/…-nfr-…` |
| `automation-engineer` | Automated regression (Playwright/Cypress/API) in the project's own framework, de-flaking | Test code + `.qa/reports/…-automation-…` |
| `bug-triager` | Reproduces, isolates, de-duplicates and classifies bugs (severity/priority), writes bug reports, maintains the bug register, files tickets (only when asked) | `.qa/bugs/`, `.qa/BUGS.md` |
| `test-reporter` | Test summary reports, metrics, GO / GO WITH RISKS / NO-GO recommendation, UAT/beta feedback synthesis | `.qa/reports/…-summary-…` |

## Workflow commands

| Command | What it does | Pipeline |
|---|---|---|
| `/tester-squad:squad <request>` | Hand any testing request to the squad; the test lead picks the pipeline | test-lead decides |
| `/tester-squad:review-requirements <PRD>` | Review requirements before coding: ambiguous, incomplete, inconsistent, untestable | analyst |
| `/tester-squad:test-plan <feature>` | Risk analysis → test plan → test cases + traceability | analyst → designer |
| `/tester-squad:test-feature <feature>` | Test a feature end to end | analyst → designer → functional ∥ exploratory ∥ api ∥ ux-a11y → triager → reporter |
| `/tester-squad:explore <area>` | 1–3 parallel exploratory sessions, then bug triage | exploratory ×N → triager |
| `/tester-squad:regression <build>` | Smoke + regression (automated suites + manual cases) | automation ∥ functional → triager → reporter |
| `/tester-squad:bug-report <description>` | Reproduce and write a proper bug report (add "file it" to create a ticket) | triager |
| `/tester-squad:verify-fix <bug IDs>` | Retest fixed bugs + nearby regression | functional → triager |
| `/tester-squad:a11y-audit <URLs>` | UX, WCAG 2.2 AA accessibility, localisation and responsive audit | ux-a11y → triager |
| `/tester-squad:api-test <spec>` | Contract-based API testing with a re-runnable test collection | api → triager |
| `/tester-squad:automate <cases>` | Turn stable test cases into automated tests | (designer) → automation |
| `/tester-squad:release-signoff <version>` | Release readiness assessment with a GO/NO-GO recommendation | functional ∥ automation ∥ nfr ∥ ux-a11y → triager → reporter |
| `/tester-squad:test-report [summary\|status\|feedback]` | Test summary / daily status / feedback synthesis | reporter |

## Skills

| Skill | Contents |
|---|---|
| `tester-playbook` | Roster, pipelines, risk-based test depth, how to write briefs, `.qa/` layout, handoff format |
| `test-design-techniques` | EP, BVA, decision tables, state transitions, pairwise, use cases, test data, test case checklist + **`pairwise.py`** (constrained all-pairs generator; example: 15 rows instead of 288) |
| `exploratory-heuristics` | Charters and session-based testing, SFDPOT, FEW HICCUPPS, tours, attack-input cheat sheet (including Vietnamese text, VN phone numbers, VND amounts, dates), web/mobile test ideas |
| `bug-reporting` | Bug report template, title formula, severity/priority matrix, reproduction checklist, handling cannot-reproduce / regressions / security vulnerabilities |
| `web-testing-toolkit` | **`probe.js`**: screenshots across viewports/browsers, console errors, failed requests, 4xx/5xx, broken images, horizontal overflow, TTFB/LCP/CLS, axe-core scan. **`run_steps.js`**: runs test cases declared in JSON, per-step pass/fail, screenshots on failure, secrets read from environment variables. Plus Playwright snippets: saved login state, slow network emulation, mocked backend failures, device emulation, traces |

Examples:

```bash
node skills/web-testing-toolkit/scripts/probe.js https://staging.example.com/ --viewports 375x812,1440x900 --axe --runs 3
```

```bash
QA_PASSWORD=*** node skills/web-testing-toolkit/scripts/run_steps.js .qa/cases/login/ --base-url https://staging.example.com
```

```bash
python3 skills/test-design-techniques/scripts/pairwise.py skills/test-design-techniques/scripts/example-params.json
```

## Usage examples

```text
/tester-squad:test-feature Voucher codes in the shopping cart. The app runs at http://localhost:3000 (npm run dev),
test account in QA_USER/QA_PASSWORD, requirements in docs/prd/voucher.md
```

```text
/tester-squad:explore Checkout page on staging https://staging.shop.example, 2 charters: input data & network interruptions
```

```text
/tester-squad:release-signoff v2.4.0 on https://staging.shop.example, changelog in CHANGELOG.md
```

```text
Use the tester squad to review this PRD: docs/prd/loyalty-points.md
```

Agents reply in the language you write in (for example Vietnamese) and keep IDs, code and file names in English.

## The `.qa/` workspace

```
.qa/
├── analysis/<slug>.md              # test-analyst
├── plans/<slug>.md                 # test-analyst
├── cases/<slug>.md                 # test-designer (+ <slug>/<TC-ID>.steps.json)
├── sessions/<date>-<slug>.md       # exploratory-tester
├── runs/<date>-<slug>.md           # functional-tester, api-tester
├── api/<slug>/                     # api-tester (when the project has no API test framework)
├── bugs/BUG-<NNN>-<slug>.md        # bug-triager
├── BUGS.md                         # bug register
├── evidence/<date>-<slug>/         # screenshots, probe output, logs (usually git-ignored)
└── reports/<date>-<type>-<slug>.md # ux-a11y, nfr, automation, summary, status, feedback
```

Every agent ends its response with:

```
### Handoff
- Status: done | blocked | needs-input
- Artifacts: <paths>
- Next: <agent> — <task>
- Risks / open questions: <...>
```

## Squad safety rules

- **Evidence or it didn't happen**: every pass/fail claim comes with command output, a screenshot or a log excerpt.
- Test only authorized environments (local/dev/staging or a target the user named). No load tests, fuzzing or security probes against production or third-party systems without explicit approval.
- Never use real customers' personal data as test data; secrets live only in environment variables.
- Testers do not change product code, and do not file tickets, commit, push or post messages unless the user asks.
- Suspected security vulnerabilities are marked confidential and never posted to public trackers.

## Repository layout

```
.claude-plugin/        plugin.json, marketplace.json
agents/                11 agents (.md with frontmatter)
commands/              13 workflow commands
skills/                5 skills (+ scripts)
tests/                 smoke tests + a demo page with planted defects
tools/validate_plugin.py   plugin consistency checks
```

## Development

```bash
python3 tools/validate_plugin.py
```

```bash
bash tests/smoke.sh
```

`tests/smoke.sh` checks the manifests, agents, commands and skills, verifies `pairwise.py` coverage, and (when Playwright is available) runs `run_steps.js` and `probe.js` against a demo page with planted defects to make sure the tools detect them. CI runs the same script in `.github/workflows/validate.yml`.

## License

MIT, see [LICENSE](LICENSE).
