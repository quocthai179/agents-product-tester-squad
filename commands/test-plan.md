---
description: Test planning pipeline — requirements analysis & risk → test strategy/plan → test cases with traceability
argument-hint: <feature / epic / release and where its requirements are>
---

Create the test plan and test cases for:

$ARGUMENTS

Derive a short kebab-case `<slug>` and use it for all artifact paths. Each agent starts cold — include the product description, how to reach it, and the requirement sources in every brief.

1. **Analysis & plan** — `tester-squad:test-analyst`: write `.qa/analysis/<slug>.md` (requirement review, test conditions, risks) and `.qa/plans/<slug>.md` (scope, out of scope, test types per risk, environments/browsers/devices, test data, entry/exit criteria, roles). If it raises questions that change scope, ask the user before continuing; otherwise proceed on its stated assumptions.
2. **Test design** — `tester-squad:test-designer`: write `.qa/cases/<slug>.md` with techniques per condition, test data, P1–P3 priorities, `smoke`/`regression`/`automation-candidate` tags and a traceability matrix; optionally a CSV export for a test management tool.
3. **Summarise** for the user: scope, number of cases by priority and type, coverage gaps, open questions, and the suggested next step (`/tester-squad:test-feature` or `/tester-squad:automate`).
