---
description: Release readiness — smoke/regression ∥ non-functional ∥ UX/a11y checks → bug triage → GO / NO-GO test summary
argument-hint: <version/build, environment URL, release scope or changelog>
---

Assess release readiness for:

$ARGUMENTS

1. Identify the version/build, environment (staging or pre-production — never load/security-test production without explicit approval), release scope (changelog, tickets) and exit criteria (`.qa/plans/` or defaults: all P1 cases pass, no open critical/major bugs, no WCAG A/AA blockers on changed pages, performance within targets).
2. In parallel:
   - `tester-squad:functional-tester` — smoke + regression on the release scope, and verification of bugs marked fixed in this release → `.qa/runs/<date>-release-<version>.md`
   - `tester-squad:automation-engineer` — run the existing automated suites (no test modifications) → `.qa/reports/<date>-automation-release-<version>.md`
   - `tester-squad:nonfunctional-tester` — perceived performance, security smoke and reliability checks on critical journeys → `.qa/reports/<date>-nfr-release-<version>.md`
   - `tester-squad:ux-accessibility-tester` — only pages changed in this release → `.qa/reports/<date>-ux-a11y-release-<version>.md`
3. `tester-squad:bug-triager` — triage all failures and update `.qa/BUGS.md`.
4. `tester-squad:test-reporter` — test summary with exit-criteria check and a **GO / GO WITH RISKS / NO-GO** recommendation → `.qa/reports/<date>-summary-release-<version>.md`.
5. Present the recommendation first, then blocking items, accepted risks (and who must accept them), and evidence links. The release decision belongs to the user/product owner.
