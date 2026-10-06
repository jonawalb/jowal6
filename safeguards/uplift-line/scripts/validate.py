"""Validate data/scenarios.json for the Uplift Line trainer.

Run: uv run python scripts/validate.py   (from the uplift-line folder)
Checks required fields, decision and factor keys, score ranges, source keys,
context-shift pairs, and the share of should-answer cases.
"""
import json
import sys
from collections import Counter
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data" / "scenarios.json"


def main() -> int:
    d = json.loads(DATA.read_text(encoding="utf-8"))
    errors = []
    decisions = set(d["decisions"])
    factors = set(d["factors"])
    sources = set(d["sources"])
    ids = [s["id"] for s in d["scenarios"]]
    if len(ids) != len(set(ids)):
        errors.append("duplicate ids")
    for s in d["scenarios"]:
        sid = s["id"]
        for key in ("domain", "class", "title", "request", "ref"):
            if key not in s:
                errors.append(f"{sid}: missing {key}")
        if s["class"] not in ("answer", "gray", "violation"):
            errors.append(f"{sid}: bad class")
        ref = s["ref"]
        if ref["decision"] not in decisions:
            errors.append(f"{sid}: bad decision")
        if set(ref["factors"]) != factors:
            errors.append(f"{sid}: factor keys")
        if any(not 0 <= v <= 4 for v in ref["factors"].values()):
            errors.append(f"{sid}: factor range")
        for src in s.get("sources", []):
            if src not in sources:
                errors.append(f"{sid}: unknown source {src}")
        if "pair" in s and s["pair"] not in ids:
            errors.append(f"{sid}: pair not found")
        if "crossAt" in ref and not 1 <= ref["crossAt"] <= len(s.get("turns", [])):
            errors.append(f"{sid}: crossAt out of range")
    counts = Counter(s["class"] for s in d["scenarios"])
    print(f"{len(ids)} scenarios: {dict(counts)}; answer share {counts['answer'] / len(ids):.0%}")
    for e in errors:
        print("ERROR", e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
