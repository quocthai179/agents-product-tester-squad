---
description: Reproduce, isolate and write a high-quality bug report (optionally file it to the tracker)
argument-hint: <bug description, screenshot/log paths, where it happens; add "file it" to create a ticket>
---

Turn this into a high-quality bug report:

$ARGUMENTS

1. Launch `tester-squad:bug-triager` with the full description verbatim, any attached screenshot/log paths, the product URL or start command, and test accounts if known. Ask it to: check `.qa/BUGS.md` for duplicates, reproduce and isolate minimal steps, collect evidence, classify severity/priority/type, and write `.qa/bugs/BUG-<NNN>-<slug>.md` plus a register row.
2. Only if the user explicitly asked to file/create a ticket, tell the triager which tracker to use (GitHub Issues, Jira, YouTrack, Linear — whichever tool is available) and to redact secrets/personal data first. Otherwise do not file anything externally.
3. Show the user the final report (title, severity/priority, steps, expected/actual, evidence) and its status (confirmed / cannot-reproduce / needs-info / duplicate).
