---
name: test-design-techniques
description: Black-box test design techniques with worked examples — equivalence partitioning, boundary value analysis, decision tables, state transition testing, pairwise/combinatorial testing (with a runnable all-pairs generator), use-case/scenario testing, error guessing and test data design — plus a test case writing checklist. Use when designing or reviewing test cases, choosing how many tests are enough, reducing a combinatorial explosion of configurations, or building a traceability matrix. Also - thiết kế test case, kỹ thuật kiểm thử, phân vùng tương đương, giá trị biên, bảng quyết định.
---

# Test design techniques

Pick the technique from the shape of the thing under test. Most features need two or three techniques combined.

| Shape of the requirement | Technique |
|---|---|
| Input field, range, format, list of allowed values | Equivalence partitioning + boundary values |
| Several conditions combine into different outcomes (business rules, pricing, eligibility) | Decision table |
| Statuses, lifecycle, wizard steps, modes | State transition |
| Many independent parameters (browser × OS × role × locale × plan) | Pairwise |
| End-to-end goal of a user | Use case / scenario |
| Anything — on top of the above | Error guessing (see `exploratory-heuristics`) |

## 1. Equivalence partitioning (EP)

Split each input into classes the system should treat the same; test one value per class. Always include invalid classes.

*Example — "Quantity: integer 1–99"*: valid `1..99`; invalid `≤0`, `≥100`, non-integer `2.5`, non-numeric `abc`, empty, whitespace, leading zeros `007`, full-width digits `１２`.

Rules: one invalid class per test (otherwise one error masks another); valid classes can be combined.

## 2. Boundary value analysis (BVA)

Bugs cluster at edges. For a range `[min, max]` test **min−1, min, min+1, max−1, max, max+1** (3-value BVA) — or at least min−1/min/max/max+1 (2-value).

Apply to every kind of edge, not just numbers:
- length (0, 1, max−1, max, max+1 characters; and byte limits for multi-byte text such as Vietnamese/emoji),
- dates (end of month, 29 Feb, year end, DST change, time-zone midnight),
- money (0, smallest unit, rounding at .5, currency without decimals like VND),
- counts (0 items, 1 item, page size, page size + 1),
- time limits (just before / at / just after expiry),
- file size and type limits.

## 3. Decision tables

List conditions and actions; each column is a rule. Collapse columns where a condition does not matter (`–`) and drop impossible combinations — say why.

*Example — free shipping*: member? order ≥ 500.000 ₫? voucher FREESHIP valid?

| Rule | R1 | R2 | R3 | R4 | R5 |
|---|---|---|---|---|---|
| Member | Y | Y | N | N | – |
| Order ≥ 500k | Y | N | Y | N | – |
| Valid FREESHIP voucher | – | N | N | N | Y |
| **Free shipping** | ✔ | ✘ | ✘ | ✘ | ✔ |

One test per rule (5 tests instead of 8), plus BVA on the 500k boundary (499.999 / 500.000).

## 4. State transition testing

Draw the states and events (a table is enough). Cover:
1. every valid transition at least once (0-switch coverage);
2. important sequences of two transitions (1-switch) for high-risk flows;
3. **invalid transitions** — events that must be rejected in a given state (pay an already-cancelled order, approve twice, back button after submit).

*Example — order*: `Draft → Placed → Paid → Shipped → Delivered`; `Placed/Paid → Cancelled`; `Delivered → Returned` within 7 days. Invalid: `Cancelled → Paid`, `Shipped → Cancelled`, `Delivered → Returned` on day 8.

| State \ Event | pay | cancel | ship | deliver | return |
|---|---|---|---|---|---|
| Placed | Paid | Cancelled | ✘ | ✘ | ✘ |
| Paid | ✘ | Cancelled (+refund) | Shipped | ✘ | ✘ |
| Shipped | ✘ | ✘ | ✘ | Delivered | ✘ |
| Delivered | ✘ | ✘ | ✘ | ✘ | Returned (≤7d) |

Each ✘ is a negative test candidate; prioritise by risk.

## 5. Pairwise (all-pairs) testing

Most interaction bugs are triggered by one parameter or a pair of parameters. All-pairs covers every pair of values at least once with far fewer rows than the full product.

```bash
python3 <this-skill>/scripts/pairwise.py params.json            # markdown table
python3 <this-skill>/scripts/pairwise.py params.json --format csv
python3 <this-skill>/scripts/pairwise.py --param "browser=Chrome,Firefox,Safari" --param "os=Windows,macOS,iOS" --param "role=guest,admin"
```

`params.json` (also in `scripts/example-params.json`):

```json
{
  "parameters": {
    "browser": ["Chrome", "Firefox", "Safari", "Edge"],
    "os": ["Windows", "macOS", "Android", "iOS"],
    "role": ["guest", "member", "admin"],
    "payment": ["card", "e-wallet", "COD"],
    "lang": ["vi", "en"]
  },
  "constraints": [
    {"browser": "Safari", "os": "Windows"},
    {"browser": "Edge", "os": "iOS"}
  ]
}
```

Example output: 15 rows instead of 288 for the parameters above. The script checks its own coverage and exits non-zero if constraints made some pairs impossible. Add specific high-risk combinations (e.g. the most common customer configuration) as extra rows by hand.

## 6. Use case / scenario testing

For each user goal: main success path, each alternative path, each exception (payment declined, out of stock mid-checkout, session expired, network lost). Scenario tests catch integration problems that field-level tests miss.

## 7. Test data design

- Synthetic only — never real customer personal data. Use reserved domains (`example.test`, `example.com`) and obviously fake phone numbers.
- Cover: typical, boundary, invalid, empty, very long, unicode (Vietnamese with diacritics `Nguyễn Thị Ánh Tuyết`, composed vs decomposed forms), emoji, RTL text, special characters (`' " < > & ; % _ \`), leading/trailing spaces, mixed case for case-insensitive fields.
- Per role/permission and per account state (new, active, locked, deleted, unpaid).
- Make data setup reproducible (seed scripts, API calls, fixtures) and note cleanup.

## Test case checklist

- [ ] One purpose per case; title says what is verified (`Checkout rejects expired card`).
- [ ] Traces to a requirement/condition/risk.
- [ ] Preconditions and test data are concrete.
- [ ] Steps are numbered, minimal and unambiguous.
- [ ] Expected result is observable and specific (exact message, value, state, HTTP status).
- [ ] Independent of other cases' order.
- [ ] Priority (P1–P3) and tags (`smoke`, `regression`, `automation-candidate`).
- [ ] Negative and boundary cases exist for every input.

## How many tests are enough?

Coverage targets, in order: every acceptance criterion; every equivalence class and boundary of high-risk inputs; every decision-table rule; every valid state transition and high-risk invalid one; all pairs of configuration parameters. Stop adding cases when new ones only repeat already-covered partitions — and record the remaining risk instead.
