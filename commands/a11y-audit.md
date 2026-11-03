---
description: UX, accessibility (WCAG 2.2 AA), localisation and responsive audit of pages or flows
argument-hint: <URLs or flows, target locales/browsers/devices>
---

Audit the user experience and accessibility of:

$ARGUMENTS

1. Confirm the URLs/flows, how to log in if needed, target locales, browsers and devices (defaults: Chromium/Firefox/WebKit; viewports 375×812, 768×1024, 1440×900; the product's main locale).
2. Launch `tester-squad:ux-accessibility-tester` with that scope. It runs `probe.js --axe` from the `web-testing-toolkit` skill plus a manual WCAG 2.2 AA pass (keyboard, focus, semantics, contrast, zoom/reflow, forms), a heuristic usability walkthrough of the primary tasks, a content/localisation check and a responsive/cross-browser comparison → `.qa/reports/<date>-ux-a11y-<slug>.md`.
3. Launch `tester-squad:bug-triager` to write up the critical and serious failures as bugs (suggestions stay in the report).
4. Summarise: WCAG conformance verdict, top issues by user impact with the WCAG criterion, quick wins, and what was not covered.
