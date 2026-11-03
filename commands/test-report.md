---
description: Generate a test summary / daily status / feedback synthesis report from the .qa workspace
argument-hint: <"summary" | "status" | "feedback <source>">, optional scope/version
---

Produce a test report:

$ARGUMENTS

Launch `tester-squad:test-reporter` with the requested report type (default: `summary`) and scope:

- `summary` — consolidate `.qa/` runs, sessions, specialist reports and bugs for the scope into `.qa/reports/<date>-summary-<slug>.md`, with metrics, coverage, open defects, residual risks, exit-criteria check and a GO / GO WITH RISKS / NO-GO recommendation.
- `status` — daily status (≤ 15 lines) into `.qa/reports/<date>-status.md`.
- `feedback <source>` — synthesise UAT/beta/app-store/support feedback from the given files or text into themes, frequency and actionable findings; send suspected bugs to `tester-squad:bug-triager` afterwards.

If `.qa/` is empty or missing, tell the user there is nothing to report yet and suggest `/tester-squad:test-feature` or `/tester-squad:regression`. Show the recommendation/headline first, then key numbers.
