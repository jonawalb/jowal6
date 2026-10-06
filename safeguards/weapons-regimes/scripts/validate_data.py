"""Validate the Regime Explorer data files.

Checks referential integrity and that every claim carries a URL.
With --urls, also requests each distinct URL and reports the HTTP status
(some official sites block scripted requests; a 403 there is not a dead link).

Usage: python3 scripts/validate_data.py [--urls]
"""
import json
import sys
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"


def load(name):
    with open(DATA / name, encoding="utf-8") as f:
        return json.load(f)


def main():
    regimes = load("regimes.json")["regimes"]
    items = load("items.json")["items"]
    events = load("timeline.json")["events"]
    ids = {r["id"] for r in regimes}
    errors, urls = [], set()

    for r in regimes:
        for field in ("short", "name", "jurisdiction", "cite", "summary", "last_verified", "sources"):
            if not r.get(field):
                errors.append(f"regime {r['id']}: missing {field}")
        for k in r["key_provisions"] + r["changes"] + r["sources"]:
            if not k.get("url", "").startswith("http"):
                errors.append(f"regime {r['id']}: entry without URL: {k}")
            urls.add(k.get("url"))
    for it in items:
        for a in it["applies"]:
            if a["regime"] not in ids:
                errors.append(f"item {it['id']}: unknown regime {a['regime']}")
            if a["level"] not in ("direct", "conditional"):
                errors.append(f"item {it['id']}: bad level {a['level']}")
            if not a.get("url", "").startswith("http"):
                errors.append(f"item {it['id']}: {a['regime']} without URL")
            urls.add(a.get("url"))
    for e in events:
        if e["regime"] not in ids:
            errors.append(f"timeline {e['date']}: unknown regime {e['regime']}")
        urls.add(e.get("url"))

    print(f"{len(regimes)} regimes, {len(items)} items, "
          f"{sum(len(i['applies']) for i in items)} links, {len(events)} events, {len(urls)} URLs")

    if "--urls" in sys.argv:
        for u in sorted(urls):
            req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    code = resp.status
            except urllib.error.HTTPError as exc:
                code = exc.code
            except Exception as exc:  # network errors
                code = type(exc).__name__
            print(code, u)

    for e in errors:
        print("ERROR", e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
