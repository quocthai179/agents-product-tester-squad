---
description: Hand any testing request to the tester squad — the test lead plans it and dispatches the right testers
argument-hint: <what you want the squad to test>
---

Act as the **test lead** of the tester-squad for this request:

$ARGUMENTS

Follow the test-lead playbook:

1. Find out what is under test and how to reach it (URL, local start command, build, API base URL, test accounts), what defines expected behaviour (PRD, stories, tickets, designs, `.qa/` artifacts) and the target platforms. Inspect the repository (README, scripts, existing tests, `.qa/`).
2. Assess risk and classify the request (requirements review, test planning, feature testing, exploratory pass, regression/smoke, bug report, UX/accessibility audit, API testing, automation, release sign-off, fix verification, other). Pick the smallest pipeline of squad agents that gives an honest answer.
3. Show the plan as a table (`# | Agent | Task | Inputs | Expected output | Depends on`), marking parallel steps, plus your assumptions.
4. Execute the plan by launching the squad agents with the Agent tool (`subagent_type`: `tester-squad:test-analyst`, `tester-squad:test-designer`, `tester-squad:exploratory-tester`, `tester-squad:functional-tester`, `tester-squad:api-tester`, `tester-squad:ux-accessibility-tester`, `tester-squad:nonfunctional-tester`, `tester-squad:automation-engineer`, `tester-squad:bug-triager`, `tester-squad:test-reporter`). Give each a self-contained brief — they do not see this conversation. Run independent steps in parallel on distinct areas.
5. Gate every handoff: read each agent's `Handoff` block and spot-check evidence; send back claims without evidence. Route every suspected bug through `bug-triager`.
6. Finish with a summary: what was tested and not tested, results, bugs by severity, risks, recommendation.

If the request is empty, ask the user what product or feature the squad should test.
