---
description: Full feature testing pipeline — analysis → test design → execution (functional ∥ exploratory ∥ API ∥ UX/a11y) → bug triage → summary report
argument-hint: <feature, how to reach it (URL/start command), requirement sources>
---

Test this feature end-to-end with the tester-squad:

$ARGUMENTS

Derive a short kebab-case `<slug>`. Each agent starts cold, so every brief must include: what the feature is, how to reach/run the product (URL or start command), test accounts, requirement sources, the upstream `.qa/` artifacts to read, environment constraints (never production unless the user said so), and the deliverable path.

1. **Setup check** — confirm the product is reachable (open the URL or start it locally). If it is not, stop and ask the user how to access it.
2. **Analysis** — `tester-squad:test-analyst` → `.qa/analysis/<slug>.md` (conditions + risks). Skip for very small changes and say so.
3. **Design** — `tester-squad:test-designer` → `.qa/cases/<slug>.md` (+ `.steps.json` files for web UI cases where useful).
4. **Execute in parallel** (only the relevant ones; give each a distinct scope):
   - `tester-squad:functional-tester` — run the designed cases → `.qa/runs/<date>-<slug>.md`
   - `tester-squad:exploratory-tester` — 1–2 charters on the highest-risk areas → `.qa/sessions/<date>-<slug>.md`
   - `tester-squad:api-tester` — if the feature has API endpoints → `.qa/runs/<date>-api-<slug>.md`
   - `tester-squad:ux-accessibility-tester` — if the feature has UI → `.qa/reports/<date>-ux-a11y-<slug>.md`
   - `tester-squad:nonfunctional-tester` — only if performance/security/reliability is in scope or high-risk
5. **Bug triage** — `tester-squad:bug-triager`: reproduce, de-duplicate and write up all bug drafts from step 4 into `.qa/bugs/` and `.qa/BUGS.md`. Do not file to external trackers unless the user asked.
6. **Report** — `tester-squad:test-reporter` → `.qa/reports/<date>-summary-<slug>.md` with a GO / GO WITH RISKS / NO-GO recommendation.
7. **Close** — summarise for the user: coverage (tested / not tested), results, bugs by severity with IDs, recommendation, next steps (e.g. fix bugs → `/tester-squad:verify-fix`, automate → `/tester-squad:automate`).

Do not modify product code, commit, or push unless the user asks.
