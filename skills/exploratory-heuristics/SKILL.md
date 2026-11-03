---
name: exploratory-heuristics
description: Exploratory testing toolkit — session-based test management (charters, time boxes, session sheets, debriefs), test heuristics (SFDPOT, FEW HICCUPPS consistency oracles, CRUD, goldilocks, interruptions), tours (money, landmark, back-alley, saboteur, all-nighter), a cheat sheet of attack inputs and test data (including Vietnamese text), and web/mobile-specific test ideas. Use when exploring a product, running a bug bash, writing charters, or when stuck for test ideas. Also - kiểm thử khám phá, test thăm dò, bug bash, ý tưởng test.
---

# Exploratory testing heuristics

## Session-based test management

1. **Charter** — *Explore* `<target>` *with* `<resources, techniques, data>` *to discover* `<information/risk>`.
   - Explore the checkout with expired, declined and 3-D Secure cards to discover payment error handling problems.
   - Explore the profile form with long, unicode and empty inputs to discover validation and display issues.
   - Explore order history as two users in parallel to discover data leaks between accounts.
2. **Time box** — 45–90 minutes uninterrupted. Track rough split: setup / testing / bug investigation.
3. **Session sheet** — notes, bugs, issues/questions, coverage, follow-up charters (template in the `exploratory-tester` agent).
4. **Debrief** — what was tested, what was found, what was *not* tested, how testable it was.

## SFDPOT — what to cover ("San Francisco Depot")

| Letter | Look at | Example ideas |
|---|---|---|
| **S**tructure | What it is made of | pages, components, files, APIs, third-party widgets, feature flags |
| **F**unction | What it does | every button/menu/shortcut, calculations, error handling, undocumented features |
| **D**ata | What it processes | inputs, outputs, defaults, big/small/empty, persistence, import/export, sorting, search |
| **P**latform | What it depends on | browsers, OS, devices, screen sizes, network, locale/time zone, permissions |
| **O**perations | How it is used | common user journeys, novice vs expert, high volume, accessibility needs |
| **T**ime | When/how long | timeouts, session expiry, scheduling, time zones, DST, concurrency, race conditions, slow responses |

## FEW HICCUPPS — consistency oracles (is it a bug?)

The product should be consistent with: **F**amiliar problems (known bug patterns), **E**xplainability, **W**orld (real-world facts), **H**istory (previous versions), **I**mage (brand), **C**omparable products, **C**laims (docs, marketing, specs), **U**ser expectations, **P**roduct (itself elsewhere), **P**urpose, **S**tatutes and standards (law, accessibility, privacy). Name the oracle in the bug report when no spec exists.

## Tours

- **Money tour** — the features customers pay for or demos show; must be flawless.
- **Landmark tour** — jump between key features in different orders.
- **Back-alley tour** — least-used features, settings, admin pages, error pages, empty states.
- **Saboteur tour** — remove resources: kill network, deny permissions, fill the disk/quota, delete things it depends on.
- **All-nighter tour** — leave it open for hours, keep sessions alive, do many operations without reload.
- **Couch-potato tour** — do as little as possible: accept every default, skip optional fields.
- **Obsessive-compulsive tour** — repeat actions: double/triple click, submit twice, back-forward-back.
- **Supermodel tour** — look only at the UI: alignment, truncation, overlapping, consistency, dark mode.

## Interruption & state ideas

Back button after submit · refresh during save · open the same item in two tabs and edit both · log out in one tab and act in another · session expires while filling a long form · switch account/role mid-flow · lose network then regain · put the app in background (mobile) · rotate device · change language mid-flow · deep-link straight into a step that needs earlier steps · browser autofill · password manager · paste instead of type.

## CRUD & lifecycle

For every entity: Create, Read, Update, Delete — then: create duplicates, update to invalid, delete something that is referenced, restore/undo, read after delete (cache!), and permissions for each operation per role.

## Goldilocks data

Too small / too big / just right — for every input, list, file, number, date, and amount of data on screen (0 rows, 1 row, page+1 rows, 10 000 rows).

## Attack inputs cheat sheet

Use in test accounts on non-production environments; check that inputs are stored and displayed literally and never cause errors.

| Category | Values |
|---|---|
| Empty-ish | `""`, `" "`, `"\t"`, `null`, `undefined`, `0`, `-0` |
| Length | 1 char, max, max+1, 10 000 chars, a 5 MB paste |
| Numbers | `-1`, `0`, `2147483648`, `9999999999999999`, `1e309`, `0.1+0.2`, `1,5` vs `1.5`, `１２３` (full-width) |
| Vietnamese | `Nguyễn Văn Đức`, `Phạm Thị Ánh Tuyết`, `ĐƯỜNG ĐỒNG KHỞI`, decomposed `Nguye\u0302\u0303n`, search `duc` should/shouldn't find `Đức` per spec |
| Unicode | emoji `👩‍👩‍👧‍👦🇻🇳`, RTL `مرحبا`, CJK `测试テスト`, zero-width space `\u200b`, combining marks `Z̴͙a̵l̷g̸o` |
| Markup (rendered as text?) | `<b>qa</b>`, `"><i>qa</i>`, `{{7*7}}`, `${7*7}`, `<!--` |
| Quotes/SQL-ish | `O'Brien`, `' OR '1'='1`, `"; --`, `%`, `_` (wildcards in search) |
| Paths/URLs | `../../etc/passwd`, `C:\con`, `javascript:alert(1)` in URL fields, very long URL |
| Email | `a@b`, `a+tag@example.test`, `"quoted"@example.test`, uppercase domain, trailing dot, IDN `thử@ví-dụ.vn` |
| Phone (VN) | `0901234567`, `+84901234567`, `84 90 123 4567`, 9/11 digits, letters |
| Dates | 29/02 on non-leap years, 31/04, 00:00 and 23:59:59, DST change days, `dd/MM` vs `MM/dd` ambiguity (03/04), far past/future, time zone UTC+7 vs UTC |
| Money (VND) | `0`, `1`, `999.999`, `1.000.000`, negative, decimals on VND, very large, rounding of discounts |
| Files | 0 bytes, exactly max size, max+1, wrong extension, renamed `.exe`→`.jpg`, huge image dimensions, unicode filename, duplicate filename |

## Web-specific ideas

Console errors and failed requests on every page (`probe.js`) · deep links and refresh on every route (SPA 404s) · browser back/forward cache · multiple tabs · cookie/consent banners covering controls · zoom 200% and 400% · keyboard-only use · slow 3G · third-party script blocked · ad-blocker · dark mode · print view · copy/paste formatting · autofill · timezone and locale changes · cache after deploy (stale JS).

## Mobile-specific ideas

Interruptions (call, notification, low battery) · background/foreground · rotation · permissions denied then granted · offline/airplane mode · switching Wi-Fi ↔ 4G · small and very large screens, notches · OS font size and dark mode · app update with existing data · deep links from other apps · push notifications when logged out.

## When you find something

1. Reproduce again; note the rate.
2. Vary one factor at a time to isolate (data, role, browser, order of steps).
3. Capture evidence immediately (screenshot, console, network, time).
4. Write it down in the session sheet, then continue the charter — investigate deeper only within the time box.
