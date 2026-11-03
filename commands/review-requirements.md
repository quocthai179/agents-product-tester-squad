---
description: Static testing of a PRD / user stories / ticket — find ambiguity, gaps and untestable requirements before development
argument-hint: <path, URL or pasted requirements>
---

Review these requirements as a tester, before any code is written:

$ARGUMENTS

1. Launch `tester-squad:test-analyst` with the full requirement source (paths, URLs or the pasted text verbatim) and ask it to produce `.qa/analysis/<slug>.md`: requirement review table (ambiguous / incomplete / inconsistent / untestable, each as a question `Q-n` with a suggested answer), test conditions, proposed Given/When/Then acceptance criteria, and a product risk table. Derive a short kebab-case `<slug>`.
2. Present to the user: the top questions to resolve (most impactful first), the proposed acceptance criteria, and the high-risk areas — concise, in the user's language.

Do not design test cases yet unless the user asks.
