---
description: Turn stable test cases into automated regression tests (Playwright/Cypress/API) in the project's framework
argument-hint: <test case file / IDs / feature; target framework if no existing one>
---

Automate these tests:

$ARGUMENTS

1. Locate the cases (`.qa/cases/<slug>.md` or the IDs given). If none exist, first launch `tester-squad:test-designer` to write them for the named feature.
2. Launch `tester-squad:automation-engineer` with the case file, the product URL/start command, test accounts (as environment variable names), and constraints (reuse the existing framework; ask before adding a new framework or dependencies; do not change product code except adding test IDs if the user allows; CI changes only if the user asked). It runs each new test ≥ 3 times for stability and writes `.qa/reports/<date>-automation-<slug>.md`.
3. Summarise: automated vs not automated (with reasons), files added, run results, the command to run the suite, and testability requests.

Do not commit or push unless the user asks.
