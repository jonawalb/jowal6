"""Run every saved query against the generated Parquet files and check the agreement
and classifier statistics against an independent Python implementation (expected.json).

    uv run --with duckdb python scripts/check.py
"""

import json
import re
import sys
from pathlib import Path

import duckdb

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"


def load_queries():
    text = (DATA / "queries.sql").read_text()
    blocks = re.split(r"^-- @id: *", text, flags=re.M)[1:]
    out = {}
    for b in blocks:
        qid, rest = b.split("\n", 1)
        out[qid.strip()] = rest
    return out


def main():
    con = duckdb.connect()
    for p in DATA.glob("*.parquet"):
        con.execute(f"CREATE TABLE {p.stem} AS SELECT * FROM read_parquet('{p}')")
    exp = json.loads((HERE / "expected.json").read_text())
    ok = True
    results = {}
    for qid, sql in load_queries().items():
        df = con.execute(sql).fetchdf()
        results[qid] = df
        print(f"\n== {qid} ({len(df)} rows)")
        print(df.head(30).to_string())
    k = results["kappa_cohort"].set_index("cohort_pair")["cohen_kappa"].to_dict()
    for pair, v in exp["kappa_by_cohort_pair"].items():
        if abs(k[pair] - v) > 1e-3:
            ok = False
            print("KAPPA MISMATCH", pair, k[pair], v)
    a = results["alpha_period"].set_index("period")["kripp_alpha"]["All"]
    if abs(a - exp["alpha_overall"]) > 1e-3:
        ok = False
        print("ALPHA MISMATCH", a, exp["alpha_overall"])
    prf = results["classifier_prf"].set_index("policy_area")
    for area, d in exp["prf_vs_final_label"].items():
        for m in ("precision", "recall", "f1"):
            if abs(prf.loc[area, m] - d[m]) > 1e-3:
                ok = False
                print("PRF MISMATCH", area, m, prf.loc[area, m], d[m])
    print("\nCHECK", "PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
