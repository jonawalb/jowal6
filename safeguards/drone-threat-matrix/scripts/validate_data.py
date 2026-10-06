"""Validate the drone misuse matrix data files.

Usage:
    uv run python scripts/validate_data.py               # schema checks
    uv run python scripts/validate_data.py --check-urls  # also request every source URL

Run from the tool folder (safeguards/drone-threat-matrix).
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONF = {"well-documented", "reported", "single-source"}
DATE_RE = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")


def load(name):
    return json.loads((ROOT / "data" / name).read_text())


def main():
    tax, actors, cases = load("taxonomy.json"), load("actors.json")["actors"], load("cases.json")["cases"]
    techs = {t["id"] for ta in tax["tactics"] for t in ta["techniques"]}
    actor_ids = {a["id"] for a in actors}
    errors, ids = [], set()
    for c in cases:
        cid = c.get("id")
        if cid in ids:
            errors.append(f"duplicate id {cid}")
        ids.add(cid)
        if c["actor_id"] not in actor_ids:
            errors.append(f"{cid}: unknown actor {c['actor_id']}")
        if not DATE_RE.match(str(c["date"])):
            errors.append(f"{cid}: bad date {c['date']}")
        if c["confidence"] not in CONF:
            errors.append(f"{cid}: bad confidence")
        for t in c["techniques"]:
            if t not in techs:
                errors.append(f"{cid}: unknown technique {t}")
        if not c["sources"]:
            errors.append(f"{cid}: no sources")
        if c["confidence"] == "well-documented" and len(c["sources"]) < 2:
            errors.append(f"{cid}: well-documented needs 2+ sources")
        for s in c["sources"]:
            if not s.get("url", "").startswith("https://"):
                errors.append(f"{cid}: non-https url {s.get('url')}")
    for a in actors:
        if not any(c["actor_id"] == a["id"] for c in cases):
            errors.append(f"actor {a['id']} has no cases")
    print(f"{len(cases)} cases, {len(actors)} actors, {len(techs)} techniques")
    if "--check-urls" in sys.argv:
        urls = sorted({s["url"] for c in cases for s in c["sources"]} | {s["url"] for a in actors for s in a.get("sources", [])})
        for u in urls:
            req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
            try:
                with urllib.request.urlopen(req, timeout=20) as r:
                    code = r.status
            except Exception as e:  # report, do not fail: many publishers block scripts
                code = getattr(e, "code", type(e).__name__)
            print(code, u)
    if errors:
        print("\n".join(errors))
        sys.exit(1)
    print("OK")


if __name__ == "__main__":
    main()
