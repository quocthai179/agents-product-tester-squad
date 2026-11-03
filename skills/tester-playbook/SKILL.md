---
name: tester-playbook
description: Playbook for working with the tester-squad agent team — which tester agent to use for which job, the standard testing pipelines (requirements review, test planning, feature testing, exploratory, regression, bug report, fix verification, accessibility audit, API testing, automation, release sign-off), the shared `.qa/` workspace layout, how to write briefs and the handoff format. Use when the user asks to "use the tester squad / QA team", wants several testers to collaborate, asks which tester agent fits a task, or mentions `.qa/` artifacts. Also - đội tester, đội kiểm thử, product tester.
---

# Tester-squad playbook

## Roster

| Agent (`subagent_type`) | Role | Touches the product? |
|---|---|---|
| `tester-squad:test-lead` | Test lead: risk-based approach, dispatch, gates handoffs, verdict | Coordination only |
| `tester-squad:test-analyst` | Requirement review (static testing), test conditions, risk analysis, test plan | No (docs) |
| `tester-squad:test-designer` | Test cases via formal techniques, test data, traceability, `.steps.json` | No (docs) |
| `tester-squad:exploratory-tester` | Charter-based exploratory sessions, heuristics, session sheets | Uses it like a user |
| `tester-squad:functional-tester` | Executes cases, smoke/regression, fix verification | Uses it like a user |
| `tester-squad:api-tester` | Contract-based API tests: validation, authz, semantics, compatibility | Calls APIs (test data only) |
| `tester-squad:ux-accessibility-tester` | Usability heuristics, WCAG 2.2 AA, content, i18n/l10n, responsive | Uses it like a user |
| `tester-squad:nonfunctional-tester` | Perceived perf, load smoke, security smoke, reliability, compatibility | Measures it (non-prod) |
| `tester-squad:automation-engineer` | Automated e2e/API/visual regression in the project's framework | Writes test code only |
| `tester-squad:bug-triager` | Reproduce, isolate, de-duplicate, classify, write bugs, register, tracker filing | Reproduces bugs |
| `tester-squad:test-reporter` | Test summary, metrics, GO/NO-GO recommendation, feedback synthesis | No (docs) |

Subagents cannot launch other subagents. Pipelines therefore run from the main session — via the `/tester-squad:*` commands or by following this playbook — or with the test lead as the main agent (`claude --agent tester-squad:test-lead`).

Testers never change product code. Confirmed bugs go to developers — `dev-squad:debugger` / `dev-squad:developer` if the dev-squad plugin is installed, otherwise the user.

## Pipelines

| Command | Pipeline |
|---|---|
| `/tester-squad:review-requirements` | test-analyst |
| `/tester-squad:test-plan` | test-analyst → test-designer |
| `/tester-squad:test-feature` | analyst → designer → functional ∥ exploratory ∥ api ∥ ux-a11y (∥ nonfunctional) → bug-triager → test-reporter |
| `/tester-squad:explore` | exploratory-tester × 1–3 charters (parallel) → bug-triager |
| `/tester-squad:regression` | automation-engineer (run suites) ∥ functional-tester (smoke → regression) → bug-triager → test-reporter |
| `/tester-squad:bug-report` | bug-triager |
| `/tester-squad:verify-fix` | functional-tester → bug-triager |
| `/tester-squad:a11y-audit` | ux-accessibility-tester → bug-triager |
| `/tester-squad:api-test` | api-tester → bug-triager |
| `/tester-squad:automate` | (test-designer) → automation-engineer |
| `/tester-squad:release-signoff` | functional ∥ automation ∥ nonfunctional ∥ ux-a11y → bug-triager → test-reporter (GO/NO-GO) |
| `/tester-squad:test-report` | test-reporter |
| `/tester-squad:squad` | test-lead chooses |

Skip steps that add nothing (a copy fix needs no test plan) and say which steps were skipped.

## Risk-based depth

| Risk (likelihood × impact) | Typical depth |
|---|---|
| High (6–9): payments, auth, data loss, legal, core journey | Formal design (BVA, decision tables, state), exploratory charter, API + negative tests, automation candidates |
| Medium (3–4) | Key cases + short exploratory pass |
| Low (1–2) | Smoke check only |

## Writing briefs

Agents start with no memory of the conversation. Every brief contains:

1. Goal and why it matters (what decision the testing informs).
2. What is under test and **how to reach it**: URL or start command, build/version, test accounts (as environment variable names, never pasted secrets).
3. Exact scope: features, pages, endpoints, case IDs, charter; and what is out of scope.
4. Upstream artifacts to read (`.qa/analysis/<slug>.md`, `.qa/cases/<slug>.md`, …).
5. Constraints: environment (never production unless the user said so), data rules, time box, browsers/devices.
6. The deliverable and where to save it.

## `.qa/` workspace

```
.qa/
├── analysis/<slug>.md            # test-analyst: requirement review, conditions, risks
├── plans/<slug>.md               # test-analyst: test strategy / plan
├── cases/<slug>.md               # test-designer: test cases + traceability (+ .csv)
├── cases/<slug>/<TC-ID>.steps.json   # executable web cases (web-testing-toolkit)
├── sessions/<date>-<slug>.md     # exploratory-tester: session sheets
├── runs/<date>-<slug>.md         # functional-tester / api-tester: execution logs
├── api/<slug>/                   # api-tester: runnable API tests (if the project has none)
├── bugs/BUG-<NNN>-<slug>.md      # bug-triager
├── BUGS.md                       # bug register (single source of truth for bugs)
├── evidence/<date>-<slug>/       # screenshots, probe output, logs (may be git-ignored)
└── reports/<date>-<type>-<slug>.md   # ux-a11y, nfr, automation, summary, status, feedback
```

Teams may commit `.qa/` (shared test history) or git-ignore it; `evidence/` is usually ignored because of size.

## Handoff block

Every agent ends with:

```
### Handoff
- Status: done | blocked | needs-input
- Artifacts: <paths>
- Next: <agent> — <task>
- Risks / open questions: <...>
```

Do not advance a pipeline past a `blocked` / `needs-input` status, a FAIL verdict without triage, or results without evidence; route it back with specific feedback.

## Related skills

- `test-design-techniques` — EP, BVA, decision tables, state transitions, pairwise generator.
- `exploratory-heuristics` — charters, SFDPOT, FEW HICCUPPS, tours, test-idea and data cheat sheets.
- `bug-reporting` — bug template, severity/priority matrix, good vs bad examples.
- `web-testing-toolkit` — `probe.js` (console/network/perf/axe/screenshots) and `run_steps.js` (declarative web test execution).
