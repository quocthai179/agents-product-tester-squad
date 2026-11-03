---
description: Run charter-based exploratory testing sessions on a product area, then triage the bugs found
argument-hint: <area / URL / charter, optional time box and number of parallel sessions>
---

Run exploratory testing on:

$ARGUMENTS

1. Confirm how to reach the product (URL or local start command) and test accounts; ask the user if unknown.
2. Write 1–3 charters (`Explore <area> with <resources> to discover <information>`) covering distinct areas or risk types (e.g. data/inputs, workflows & state, roles & permissions, interruptions & errors). Default: one charter, 45-minute time box, unless the user asked for more.
3. Launch one `tester-squad:exploratory-tester` per charter, in parallel, each with its own charter, scope boundaries, access details and output path `.qa/sessions/<date>-<slug>-<n>.md`.
4. Launch `tester-squad:bug-triager` with all session sheets to reproduce, de-duplicate and write up bugs in `.qa/bugs/` and `.qa/BUGS.md`.
5. Summarise: charters covered, bugs by severity (IDs and titles), notable UX issues and questions, suggested follow-up charters.
