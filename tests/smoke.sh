#!/usr/bin/env bash
# Smoke tests for the plugin: manifest/agent consistency, pairwise generator, and
# (when Playwright + Chromium are available) the web-testing-toolkit scripts.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mktemp -d)"
trap 'kill ${SERVER_PID:-0} 2>/dev/null || true; rm -rf "$OUT"' EXIT

echo "== plugin consistency"
python3 "$ROOT/tools/validate_plugin.py"

echo "== pairwise generator"
python3 "$ROOT/skills/test-design-techniques/scripts/pairwise.py" \
  "$ROOT/skills/test-design-techniques/scripts/example-params.json" --format json > "$OUT/pw.json"
python3 - "$ROOT/skills/test-design-techniques/scripts/example-params.json" "$OUT/pw.json" <<'PY'
import itertools, json, sys
spec = json.load(open(sys.argv[1])); rows = json.load(open(sys.argv[2]))
params, cons = spec["parameters"], spec["constraints"]
assert not [r for r in rows if any(all(r[k] == v for k, v in c.items()) for c in cons)], "constraint violated"
need = [(a, va, b, vb) for a, b in itertools.combinations(params, 2) for va in params[a] for vb in params[b]
        if not any(set(c) <= {a, b} and c.get(a, va) == va and c.get(b, vb) == vb for c in cons)]
miss = [n for n in need if not any(r[n[0]] == n[1] and r[n[2]] == n[3] for r in rows)]
assert not miss, f"missing pairs: {miss[:5]}"
full = 1
for v in params.values(): full *= len(v)
print(f"ok: {len(rows)} rows cover {len(need)} pairs (full product {full})")
PY

echo "== node syntax"
for f in "$ROOT"/skills/web-testing-toolkit/scripts/*.js; do node --check "$f"; done

if ! node -e "require('playwright')" 2>/dev/null; then
  echo "playwright not available — skipping browser tests"; exit 0
fi

echo "== browser tests"
(cd "$ROOT/tests/fixtures/demo-site" && exec python3 -m http.server 8765 >/dev/null 2>&1) &
SERVER_PID=$!
for i in $(seq 1 50); do curl -fs http://localhost:8765/ >/dev/null && break; sleep 0.1; done

set +e
QA_PASSWORD=demo-password node "$ROOT/skills/web-testing-toolkit/scripts/run_steps.js" \
  "$ROOT/tests/fixtures/cases" --out "$OUT/steps"
code=$?
set -e
[ "$code" -eq 1 ] || { echo "run_steps: expected exit 1 (one deliberate failure), got $code"; exit 1; }
node -e '
const r = require(process.argv[1]);
const s = Object.fromEntries(r.map(x => [x.id, x.status]));
if (s["TC-DEMO-001"] !== "pass" || s["TC-DEMO-002"] !== "fail") { console.error("unexpected", s); process.exit(1); }
console.log("ok: run_steps results", s);' "$OUT/steps/results.json"

AXE_ARGS=()
if node -e "require.resolve('axe-core',{paths:[process.cwd()]})" 2>/dev/null; then AXE_ARGS=(--axe); fi
node "$ROOT/skills/web-testing-toolkit/scripts/probe.js" http://localhost:8765/ \
  --viewports 375x812,1440x900 "${AXE_ARGS[@]}" --out "$OUT/probe"
node -e '
const { results } = require(process.argv[1]);
for (const r of results) {
  const problems = [];
  if (r.htmlLang !== null) problems.push("missing lang not detected");
  if (!r.horizontalOverflow) problems.push("overflow not detected");
  if (!r.brokenImages.length) problems.push("broken image not detected");
  if (!r.consoleMessages.some(m => m.text.includes("demo console error"))) problems.push("console error not detected");
  if (!r.badResponses.some(b => b.status === 404)) problems.push("404 not detected");
  if (r.axe && !r.axe.violations.some(v => v.id === "image-alt")) problems.push("axe image-alt not detected");
  if (problems.length) { console.error(r.viewport, problems); process.exit(1); }
}
console.log("ok: probe detected all planted defects" + (results[0].axe ? " (incl. axe)" : " (axe skipped)"));' "$OUT/probe/probe.json"
echo "ALL SMOKE TESTS PASSED"
