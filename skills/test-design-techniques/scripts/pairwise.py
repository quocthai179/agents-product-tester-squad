#!/usr/bin/env python3
"""pairwise.py - generate an all-pairs (2-way) combinatorial test set.

Every pair of values from any two parameters appears in at least one row, which
usually needs far fewer rows than the full cartesian product.

Input (JSON file or stdin):
    {
      "parameters": {
        "browser": ["Chrome", "Firefox", "Safari", "Edge"],
        "os": ["Windows", "macOS", "Android", "iOS"],
        "role": ["guest", "member", "admin"],
        "payment": ["card", "e-wallet", "COD"]
      },
      "constraints": [
        {"browser": "Safari", "os": "Windows"},
        {"browser": "Edge", "os": "iOS"}
      ]
    }
A bare {"param": [values], ...} object is also accepted. Each constraint is a
combination that must never appear in a row (all of its key/values together).

Usage:
    python3 pairwise.py params.json [--format md|csv|json] [--seed N] [--tries N] [--prefix CFG]
    python3 pairwise.py --param "browser=Chrome,Firefox" --param "os=Windows,macOS" ...

The script verifies its own coverage and prints the reduction versus the full
product on stderr.
"""
import argparse
import csv
import itertools
import json
import random
import sys


def load(args):
    if args.param:
        params = {}
        for p in args.param:
            name, _, values = p.partition("=")
            params[name.strip()] = [v.strip() for v in values.split(",") if v.strip()]
        return params, []
    raw = json.load(open(args.file, encoding="utf-8")) if args.file and args.file != "-" else json.load(sys.stdin)
    if "parameters" in raw:
        return raw["parameters"], raw.get("constraints", [])
    return raw, []


def violates(row, constraints):
    """row: dict param->value (may be partial). True if any constraint is fully matched."""
    for c in constraints:
        if all(k in row and row[k] == v for k, v in c.items()):
            return True
    return False


def generate(params, constraints, seed=0, candidates=40):
    names = list(params)
    if len(names) < 2:
        rows = [{names[0]: v} for v in params[names[0]] if not violates({names[0]: v}, constraints)] if names else []
        return rows, set()
    rng = random.Random(seed)

    uncovered = set()
    for (i, a), (j, b) in itertools.combinations(enumerate(names), 2):
        for va in params[a]:
            for vb in params[b]:
                if not violates({a: va, b: vb}, constraints):
                    uncovered.add((i, va, j, vb))

    def pair_key(i, vi, j, vj):
        return (i, vi, j, vj) if i < j else (j, vj, i, vi)

    rows = []
    stall = 0
    while uncovered:
        best_row, best_gain = None, -1
        for _ in range(candidates):
            # seed the row with one uncovered pair, then fill the rest greedily
            i, vi, j, vj = rng.choice(sorted(uncovered, key=str))
            row = {names[i]: vi, names[j]: vj}
            order = [k for k in range(len(names)) if k not in (i, j)]
            rng.shuffle(order)
            for k in order:
                best_v, best_score = None, -1
                values = list(params[names[k]])
                rng.shuffle(values)
                for v in values:
                    trial = dict(row)
                    trial[names[k]] = v
                    if violates(trial, constraints):
                        continue
                    score = sum(
                        1 for m, name_m in enumerate(names)
                        if name_m in row and pair_key(k, v, m, row[name_m]) in uncovered
                    )
                    if score > best_score:
                        best_v, best_score = v, score
                if best_v is None:  # every value violates a constraint: give up on this candidate
                    row = None
                    break
                row[names[k]] = best_v
            if row is None:
                continue
            gain = sum(
                1 for (a, b) in itertools.combinations(range(len(names)), 2)
                if (a, row[names[a]], b, row[names[b]]) in uncovered
            )
            if gain > best_gain:
                best_row, best_gain = row, gain
        if not best_row or best_gain <= 0:
            stall += 1
            if stall > 5:
                break
            continue
        stall = 0
        for (a, b) in itertools.combinations(range(len(names)), 2):
            uncovered.discard((a, best_row[names[a]], b, best_row[names[b]]))
        rows.append({n: best_row[n] for n in names})
    return rows, uncovered


def main():
    ap = argparse.ArgumentParser(description="All-pairs combinatorial test generator")
    ap.add_argument("file", nargs="?", help="JSON file with parameters (or '-' for stdin)")
    ap.add_argument("--param", action="append", help='inline parameter, e.g. "os=Windows,macOS"')
    ap.add_argument("--format", choices=["md", "csv", "json"], default="md")
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--tries", type=int, default=20, help="random restarts; the smallest result is kept (default 20)")
    ap.add_argument("--prefix", default="CFG", help="row ID prefix (default CFG)")
    args = ap.parse_args()
    if not args.file and not args.param:
        ap.error("give a JSON file, '-' for stdin, or --param options")

    params, constraints = load(args)
    for k, v in params.items():
        if not v:
            sys.exit(f"parameter {k!r} has no values")
    best = None
    for t in range(max(1, args.tries)):
        rows, uncovered = generate(params, constraints, seed=args.seed + t)
        if best is None or (len(uncovered), len(rows)) < (len(best[1]), len(best[0])):
            best = (rows, uncovered)
    rows, uncovered = best
    names = list(params)
    ids = [f"{args.prefix}-{n:02d}" for n in range(1, len(rows) + 1)]

    if args.format == "json":
        json.dump([{"id": i, **r} for i, r in zip(ids, rows)], sys.stdout, ensure_ascii=False, indent=2)
        print()
    elif args.format == "csv":
        w = csv.writer(sys.stdout)
        w.writerow(["id"] + names)
        for i, r in zip(ids, rows):
            w.writerow([i] + [r[n] for n in names])
    else:
        print("| ID | " + " | ".join(names) + " |")
        print("|---|" + "---|" * len(names))
        for i, r in zip(ids, rows):
            print(f"| {i} | " + " | ".join(str(r[n]) for n in names) + " |")

    full = 1
    for v in params.values():
        full *= len(v)
    msg = f"{len(rows)} rows cover all valid pairs (full product: {full} rows)"
    if uncovered:
        msg = f"WARNING: {len(uncovered)} pairs could not be covered (constraints too tight?). " + msg.replace("all valid", "most")
    print(msg, file=sys.stderr)
    sys.exit(1 if uncovered else 0)


if __name__ == "__main__":
    main()
