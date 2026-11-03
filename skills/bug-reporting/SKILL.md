---
name: bug-reporting
description: How to write bug reports developers can act on — report template, title formula, severity vs priority definitions and matrix, isolation and reproduction checklist, evidence to attach, handling cannot-reproduce, regressions and security issues, plus good vs bad examples. Use when writing, reviewing or triaging bug reports or tickets (GitHub Issues, Jira, YouTrack, Linear). Also - viết bug report, báo lỗi, phân loại mức độ nghiêm trọng, severity priority.
---

# Bug reporting

## Title formula

`<Area>: <what is wrong> when <condition>` — symptom, not cause, not blame.

- ✘ "Checkout broken", "Bug!!!", "Developer forgot validation"
- ✔ "Checkout: order total ignores voucher when cart has a discounted item"
- ✔ "Login: 500 error when email contains a plus sign (a+qa@example.test)"

## Template

```markdown
# BUG-<NNN>: <Area>: <what is wrong> when <condition>
- Severity: critical | major | minor | trivial      Priority: P1 | P2 | P3 | P4
- Type: functional | UI | UX | accessibility | performance | security | data | compatibility | localisation | content
- Status: new | confirmed | needs-info | cannot-reproduce | duplicate-of BUG-… | fixed | verified | wont-fix
- Build/version:     Environment/URL:     Browser/OS/device:     Account/role:
- Reproducibility: 3/3 | 1/5 (intermittent)       Regression?: yes (last good build …) | no | unknown
## Steps to reproduce
1. Log in as `qa.member@example.test` (role: member)
2. Add product "Áo thun basic" (SKU TS-001) ×2 to the cart
3. Apply voucher `SALE10`
## Expected result
Total = 2 × 200.000 ₫ − 10% = 360.000 ₫ (requirement PRD-4.2 / TC-CART-007)
## Actual result
Total stays 400.000 ₫; voucher shows "Applied" (screenshot 1).
## Evidence
- .qa/evidence/2026-11-03-cart/voucher-applied.png
- Console: `TypeError: Cannot read properties of undefined (reading 'rate')` at cart.js:212
- Network: POST /api/cart/voucher → 200, body `{"discount":null}`
## Scope / isolation notes
Happens only when the cart contains an already-discounted item; works with full-price items. Same on Chrome and Firefox.
## Suspected cause (hypothesis)
Discount calculation skips vouchers when `item.salePrice` is set.
## Workaround
Remove discounted items, apply voucher, re-add items.
```

## Severity vs priority

**Severity** = impact on the user/business (tester assesses). **Priority** = how soon to fix (product owner decides; tester proposes).

| Severity | Meaning | Examples |
|---|---|---|
| **Critical** | Core function unusable, data loss/corruption, security breach, money wrong, legal exposure, no workaround | Cannot pay; other users' orders visible; crash on launch; data deleted |
| **Major** | Important function broken or wrong, workaround exists but is hard; affects many users | Search returns wrong results; can't edit address on mobile; email not sent |
| **Minor** | Limited impact, easy workaround, edge case | Validation message unclear; sorting wrong on rare field; layout broken at one breakpoint |
| **Trivial** | Cosmetic, no functional impact | Typo, 2 px misalignment, inconsistent icon |

| Priority | When |
|---|---|
| **P1** | Fix now / blocks release or testing |
| **P2** | Fix before release |
| **P3** | Fix in a coming release |
| **P4** | Fix when convenient / backlog |

Typical mapping (adjust by frequency, visibility and timing): critical → P1; major → P1–P2; minor → P2–P4; trivial → P3–P4. A trivial typo on the home page or in a legal text can still be P1 — say why.

Accessibility: a WCAG A/AA failure that blocks a task for keyboard or screen-reader users is at least **major**.

## Reproduction & isolation checklist

- [ ] Reproduced on a clean state (new session / incognito / fresh test account).
- [ ] Minimal steps — every step is necessary.
- [ ] Varied one factor at a time: data, role, browser/device, network, locale, order of steps.
- [ ] Noted what does **not** trigger it (as valuable as what does).
- [ ] Checked whether it happens on the previous build/production (regression?), if accessible.
- [ ] Reproducibility rate recorded; for intermittent bugs, timestamps of each occurrence (helps log search).

## Evidence

Screenshot with the problem highlighted · short recording for flows/animations · console errors · failed network requests (method, URL, status, response excerpt) · server log lines/correlation IDs if accessible · exact test data · device/browser versions. **Redact** tokens, passwords, cookies and personal data before attaching anywhere.

## Special cases

- **Cannot reproduce** — keep the report, list what you tried and the environments; mark `cannot-reproduce` or `needs-info` and ask the reporter specific questions.
- **Duplicates** — search first (`.qa/BUGS.md`, tracker). Add new information to the existing report rather than creating another.
- **Regressions** — label clearly; include last good build; these usually deserve higher priority.
- **Security vulnerabilities** — mark confidential, describe impact and minimal reproduction, do not post in public trackers or chats; tell the user so it goes through the responsible disclosure/security process.
- **Requirement issues** — when the product matches the spec but the spec seems wrong, report it as a question/requirement issue, citing the oracle (comparable product, user expectation, law).

## Review checklist for an existing report

Can a developer reproduce it in five minutes without asking anything? Is the expected result justified (spec, test case, oracle)? Is there exactly one problem? Is severity based on impact? Is evidence attached and redacted?
