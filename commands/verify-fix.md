---
description: Verify bug fixes on a new build — retest the exact repro steps plus nearby regression, then update bug status
argument-hint: <bug IDs or ticket links, build/version and environment>
---

Verify the fixes for:

$ARGUMENTS

1. Read the bug reports (`.qa/bugs/BUG-*.md` or the linked tickets) and confirm the build/version that contains the fixes and the environment URL.
2. Launch `tester-squad:functional-tester` to, for each bug: re-run the exact reproduction steps, then the related cases around it (same screen, rule, data, role) and any cases listed in the bug's scope notes. Result per bug: Verified-fixed / Still-failing / Fixed-with-regression, with evidence → `.qa/runs/<date>-verify-<slug>.md`.
3. Launch `tester-squad:bug-triager` to update each bug's status and the register (and, only if the user asked, the external tracker), and to write up any new regressions as new bugs.
4. Summarise per bug with evidence links.
