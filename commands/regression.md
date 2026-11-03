---
description: Smoke + regression run on a build — existing automated suites and designed regression cases — then triage and report
argument-hint: <build/version, environment URL, optional scope (areas, tags, case IDs)>
---

Run smoke and regression testing for:

$ARGUMENTS

1. Identify the build/version, environment URL and test accounts. Find the regression assets: automated suites in the repo (e.g. `playwright.config.*`, `cypress.config.*`, e2e/API test folders, package scripts) and cases tagged `smoke`/`regression` in `.qa/cases/`. If no regression cases exist, ask the user whether to run `/tester-squad:test-plan` first or to do a risk-based smoke based on the main user journeys.
2. In parallel:
   - `tester-squad:automation-engineer` — run the existing automated suites (do not modify tests), report pass/fail/flaky counts and failing test names with traces → `.qa/reports/<date>-automation-regression.md`.
   - `tester-squad:functional-tester` — run `smoke` cases first (stop early and report if a critical path fails), then `regression` cases in scope → `.qa/runs/<date>-regression.md`.
3. `tester-squad:bug-triager` — triage all failures: real bug vs test/environment issue vs flaky; mark regressions (worked in the previous build); write up bugs.
4. `tester-squad:test-reporter` — summary with pass rate, new regressions, and a GO / GO WITH RISKS / NO-GO recommendation → `.qa/reports/<date>-summary-regression.md`.
5. Summarise for the user.
