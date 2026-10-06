"""Synthetic review-queue generator for the Enforcement Ops dashboard.

Everything this script writes is SYNTHETIC. No item carries content text; items are
metadata only. The random seed is fixed, so the output is reproducible byte for byte
(given the same numpy / pyarrow versions).

Run from this folder's parent:
    uv run --with numpy --with pyarrow python scripts/generate.py

Outputs (in ../data/):
    items.parquet, reviews.parquet, appeals.parquet, reviewers.parquet,
    traffic.parquet, score_hist.parquet, sla_policy.parquet, manifest.json
and scripts/expected.json (reference statistics used by scripts/check.py).

Injected patterns (week numbers are 1-indexed; week 1 starts Mon 2026-01-05):
    1. Classifier drift, weeks 11-12: a model update shifts scores upward for
       non-violating traffic, so the flag rate rises and precision falls.
    2. New reviewer cohort, joins week 9: lower accuracy and higher escalation at
       first, improving over about 12 weeks. Shows up as lower agreement (kappa).
    3. Policy-area surge, weeks 15-18: drones/UAS traffic roughly triples.
    4. Backlog spike, weeks 16-17: the surge meets a temporary capacity cut
       (reviewers pulled to training), so backlog and time-to-decision climb.
    5. Double-reviewed subset: 12% of queue items get an independent second review,
       which is the basis for the agreement statistics.
"""

from __future__ import annotations

import datetime as dt
import heapq
import json
from pathlib import Path

import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq

SEED = 20261006
rng = np.random.default_rng(SEED)

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "data"
OUT.mkdir(exist_ok=True)

START = dt.datetime(2026, 1, 5)  # Monday
WEEKS = 26
DAYS = WEEKS * 7
END = START + dt.timedelta(days=DAYS)

AREAS = [
    "firearms",
    "explosives-conventional",
    "drones-uas",
    "ammunition",
    "weapons-trafficking",
    "military-tech-dual-use",
    "other",
]
AREA_SHARE = np.array([0.30, 0.12, 0.10, 0.12, 0.08, 0.13, 0.15])
# Share of traffic that is truly violating (latent; never exported).
PREVALENCE = {
    "firearms": 0.08,
    "explosives-conventional": 0.12,
    "drones-uas": 0.07,
    "ammunition": 0.06,
    "weapons-trafficking": 0.15,
    "military-tech-dual-use": 0.05,
    "other": 0.03,
}
SURFACES = ["chat", "api", "agentic"]

DRIFT_WEEKS = {10, 11}  # 0-indexed -> weeks 11-12
SURGE_WEEKS = {14, 15, 16, 17}  # weeks 15-18
CAPACITY_DIP_WEEKS = {15, 16}  # weeks 16-17
NEW_COHORT_WEEK = 8  # week 9
QA_RATE = 0.08
DOUBLE_RATE = 0.12
FLAG_THRESHOLD = 0.5
SLA_HOURS = {1: 12, 2: 48, 3: 120}


# --------------------------------------------------------------------------- traffic
def gen_traffic():
    rows = []
    for d in range(DAYS):
        w = d // 7
        day = START + dt.timedelta(days=d)
        weekend = day.weekday() >= 5
        lam = 1100 * (1 + 0.008 * w) * (0.72 if weekend else 1.0)
        n = rng.poisson(lam)
        share = AREA_SHARE.copy()
        if w in SURGE_WEEKS:
            share[2] *= 3.2
        share /= share.sum()
        agentic = 0.08 + 0.10 * w / (WEEKS - 1)
        surf_p = np.array([1 - 0.28 - agentic, 0.28, agentic])
        area_idx = rng.choice(len(AREAS), size=n, p=share)
        surf_idx = rng.choice(3, size=n, p=surf_p)
        prev = np.array([PREVALENCE[AREAS[i]] for i in area_idx])
        if w in SURGE_WEEKS:
            prev = np.where(area_idx == 2, prev + 0.03, prev)
        truth = rng.random(n) < prev
        if w in DRIFT_WEEKS:
            neg = rng.beta(1.2, 4.6, n)
        else:
            neg = rng.beta(1.2, 6.5, n)
        pos = rng.beta(5.5, 2.0, n)
        score = np.where(truth, pos, neg)
        hours = rng.beta(2.0, 2.0, n) * 24
        for i in range(n):
            rows.append(
                (
                    day + dt.timedelta(seconds=int(hours[i] * 3600)),
                    w,
                    SURFACES[surf_idx[i]],
                    AREAS[area_idx[i]],
                    float(round(score[i], 4)),
                    bool(truth[i]),
                )
            )
    rows.sort(key=lambda r: r[0])
    return rows


# --------------------------------------------------------------------------- reviewers
def gen_reviewers():
    revs = []
    for i in range(16):
        tw = int(rng.integers(40, 110))
        revs.append(dict(reviewer_id=f"R{i + 1:02d}", cohort="tenured",
                         start_date=(END - dt.timedelta(weeks=tw)).date(), tenure_weeks=tw))
    for i in range(8):
        sd = START + dt.timedelta(weeks=NEW_COHORT_WEEK)
        revs.append(dict(reviewer_id=f"R{17 + i:02d}", cohort="new-2026-03",
                         start_date=sd.date(), tenure_weeks=(END - sd).days // 7))
    for i in range(3):
        tw = int(rng.integers(120, 200))
        revs.append(dict(reviewer_id=f"S{i + 1:02d}", cohort="senior",
                         start_date=(END - dt.timedelta(weeks=tw)).date(), tenure_weeks=tw))
    return revs


def accuracy(cohort, week, hard):
    if cohort == "tenured":
        a, pen = 0.982, 0.10
    elif cohort == "senior":
        a, pen = 0.99, 0.02
    else:
        a = 0.87 + 0.095 * min(1.0, max(0.0, (week - NEW_COHORT_WEEK) / 12))
        pen = 0.14
    return a - (pen if hard else 0.0)


def p_escalate(cohort, week, hard, tier):
    if cohort == "senior":
        return 0.0
    if cohort == "tenured":
        p = 0.012
    else:
        p = 0.045 - 0.025 * min(1.0, max(0.0, (week - NEW_COHORT_WEEK) / 12))
    return p + (0.06 if hard else 0) + (0.02 if tier == 1 else 0)


def draw_label(cohort, week, truth, score, tier):
    hard = 0.35 <= score <= 0.70
    if rng.random() < p_escalate(cohort, week, hard, tier):
        return "escalate"
    correct = rng.random() < accuracy(cohort, week, hard)
    is_v = truth if correct else not truth
    return "violating" if is_v else "non-violating"


def review_seconds(cohort, tier, role):
    base = {1: 150, 2: 95, 3: 60}[tier]
    if cohort == "new-2026-03":
        base *= 1.3
    if role == "adjudication":
        base *= 2.2
    return int(max(12, rng.lognormal(np.log(base), 0.55)))


# --------------------------------------------------------------------------- capacity
def hourly_capacity(ts, cohort_members, kind):
    """Items per hour the given group can clear in the hour starting at ts."""
    w = (ts - START).days // 7
    weekend = ts.weekday() >= 5
    h = ts.hour
    if kind == "primary":
        if weekend:
            if not 10 <= h < 18:
                return [], 0.0
            staff = 0.35
        else:
            if not 8 <= h < 20:
                return [], 0.0
            staff = 0.75
        if w in CAPACITY_DIP_WEEKS:
            staff *= 0.6
        active, rates = [], []
        for r in cohort_members:
            if r["cohort"] == "new-2026-03":
                if w < NEW_COHORT_WEEK:
                    continue
                rate = 1.1 + 0.5 * min(1.0, (w - NEW_COHORT_WEEK) / 10)
            else:
                rate = 1.75
            active.append(r)
            rates.append(rate)
        return list(zip(active, rates)), staff * sum(rates)
    # adjudication (seniors)
    if weekend:
        if not 10 <= h < 16:
            return [], 0.0
        staff = 0.34
    else:
        if not 9 <= h < 18:
            return [], 0.0
        staff = 0.9
    active = [(r, 2.5) for r in cohort_members]
    return active, staff * 2.5 * len(cohort_members)


def pick(active):
    rates = np.array([a[1] for a in active])
    return active[rng.choice(len(active), p=rates / rates.sum())][0]


def decide_time(hour_start, created, secs):
    t = hour_start + dt.timedelta(seconds=float(rng.uniform(0, 3600)))
    floor = created + dt.timedelta(seconds=secs + 30)
    return max(t, floor).replace(microsecond=0)


# --------------------------------------------------------------------------- main sim
def main():
    traffic = gen_traffic()
    reviewers = gen_reviewers()
    line = [r for r in reviewers if r["cohort"] != "senior"]
    seniors = [r for r in reviewers if r["cohort"] == "senior"]

    # traffic aggregates + score histogram (all classified traffic, not only queue)
    agg, hist = {}, {}
    items = []
    for ts, w, surf, area, score, truth in traffic:
        flag = score >= FLAG_THRESHOLD
        k = (w, surf, area)
        a = agg.setdefault(k, [0, 0])
        a[0] += 1
        a[1] += int(flag)
        b = min(19, int(score * 20))
        hist[(w, b)] = hist.get((w, b), 0) + 1
        qa = (not flag) and rng.random() < QA_RATE
        if flag or qa:
            if not flag:
                tier = 3
            elif score >= 0.9 or (score >= 0.8 and area in ("explosives-conventional", "weapons-trafficking")):
                tier = 1
            else:
                tier = 2
            items.append(dict(
                created_at=ts, week=w, surface=surf, policy_area=area,
                classifier_score=score, classifier_flag=flag, severity_tier=tier,
                route="classifier_flag" if flag else "qa_sample",
                qa_weight=1.0 if flag else round(1 / QA_RATE, 2),
                double_reviewed=bool(rng.random() < DOUBLE_RATE),
                _truth=truth, final_label=None, final_decided_at=None,
            ))
    for i, it in enumerate(items):
        it["item_id"] = f"Q{i + 1:06d}"

    reviews = []
    queue, adj_queue = [], []
    ptr = 0
    tokens = adj_tokens = 0.0
    seq = 0
    hour = START
    while hour < END:
        hour_end = hour + dt.timedelta(hours=1)
        while ptr < len(items) and items[ptr]["created_at"] < hour_end:
            it = items[ptr]
            heapq.heappush(queue, (it["severity_tier"], it["created_at"], ptr))
            ptr += 1
        active, cap = hourly_capacity(hour, line, "primary")
        tokens = tokens + cap if cap > 0 else 0.0
        w = (hour - START).days // 7
        while tokens >= 1 and queue:
            _, created, idx = heapq.heappop(queue)
            it = items[idx]
            tokens -= 1
            r1 = pick(active)
            s1 = review_seconds(r1["cohort"], it["severity_tier"], "primary")
            l1 = draw_label(r1["cohort"], w, it["_truth"], it["classifier_score"], it["severity_tier"])
            t1 = decide_time(hour, created, s1)
            reviews.append(dict(item_id=it["item_id"], reviewer_id=r1["reviewer_id"], review_role="primary",
                                label=l1, decided_at=t1, review_seconds=s1))
            labels = [l1]
            t_last = t1
            if it["double_reviewed"]:
                others = [a for a in active if a[0]["reviewer_id"] != r1["reviewer_id"]]
                r2 = pick(others)
                tokens -= 1
                s2 = review_seconds(r2["cohort"], it["severity_tier"], "second")
                l2 = draw_label(r2["cohort"], w, it["_truth"], it["classifier_score"], it["severity_tier"])
                t2 = decide_time(hour, created, s2)
                reviews.append(dict(item_id=it["item_id"], reviewer_id=r2["reviewer_id"], review_role="second",
                                    label=l2, decided_at=t2, review_seconds=s2))
                labels.append(l2)
                t_last = max(t1, t2)
            needs_adj = "escalate" in labels or len(set(labels)) > 1
            if needs_adj:
                seq += 1
                heapq.heappush(adj_queue, (it["severity_tier"], t_last, seq, idx))
            else:
                it["final_label"] = l1
                it["final_decided_at"] = t_last
        sactive, scap = hourly_capacity(hour, seniors, "adjudication")
        adj_tokens = adj_tokens + scap if scap > 0 else 0.0
        while adj_tokens >= 1 and adj_queue and adj_queue[0][1] < hour_end:
            _, ready, _, idx = heapq.heappop(adj_queue)
            it = items[idx]
            adj_tokens -= 1
            rs = pick(sactive)
            ss = review_seconds("senior", it["severity_tier"], "adjudication")
            ls = draw_label("senior", w, it["_truth"], it["classifier_score"], it["severity_tier"])
            ts_ = decide_time(hour, ready, ss)
            reviews.append(dict(item_id=it["item_id"], reviewer_id=rs["reviewer_id"], review_role="adjudication",
                                label=ls, decided_at=ts_, review_seconds=ss))
            it["final_label"] = ls
            it["final_decided_at"] = ts_
        hour = hour_end

    # drop anything decided after the window closes (cannot have happened yet)
    reviews = [r for r in reviews if r["decided_at"] < END]
    for it in items:
        if it["final_decided_at"] is not None and it["final_decided_at"] >= END:
            it["final_label"] = None
            it["final_decided_at"] = None

    # appeals: only on items actioned as violating
    appeals = []
    for it in items:
        if it["final_label"] != "violating":
            continue
        p = 0.04 if it["_truth"] else 0.35
        if rng.random() >= p:
            continue
        filed = it["final_decided_at"] + dt.timedelta(hours=float(rng.exponential(60)))
        if filed >= END:
            continue
        resolved = filed + dt.timedelta(hours=float(rng.uniform(24, 144)))
        if resolved >= END:
            outcome, resolved = "pending", None
        else:
            p_over = 0.05 if it["_truth"] else 0.80
            outcome = "overturned" if rng.random() < p_over else "upheld"
        appeals.append(dict(appeal_id=f"A{len(appeals) + 1:05d}", item_id=it["item_id"],
                            filed_at=filed.replace(microsecond=0),
                            resolved_at=resolved.replace(microsecond=0) if resolved else None,
                            outcome=outcome))

    write_tables(items, reviews, appeals, reviewers, agg, hist)
    write_expected(items, reviews, reviewers)


def write_tables(items, reviews, appeals, reviewers, agg, hist):
    ts = pa.timestamp("s")
    item_tbl = pa.table({
        "item_id": [i["item_id"] for i in items],
        "created_at": pa.array([i["created_at"] for i in items], ts),
        "surface": [i["surface"] for i in items],
        "policy_area": [i["policy_area"] for i in items],
        "classifier_score": pa.array([i["classifier_score"] for i in items], pa.float32()),
        "classifier_flag": [i["classifier_flag"] for i in items],
        "severity_tier": pa.array([i["severity_tier"] for i in items], pa.int8()),
        "route": [i["route"] for i in items],
        "qa_weight": pa.array([i["qa_weight"] for i in items], pa.float32()),
        "double_reviewed": [i["double_reviewed"] for i in items],
        "final_label": [i["final_label"] for i in items],
        "final_decided_at": pa.array([i["final_decided_at"] for i in items], ts),
    })
    rev_tbl = pa.table({
        "item_id": [r["item_id"] for r in reviews],
        "reviewer_id": [r["reviewer_id"] for r in reviews],
        "review_role": [r["review_role"] for r in reviews],
        "label": [r["label"] for r in reviews],
        "decided_at": pa.array([r["decided_at"] for r in reviews], ts),
        "review_seconds": pa.array([r["review_seconds"] for r in reviews], pa.int32()),
    })
    app_tbl = pa.table({
        "appeal_id": [a["appeal_id"] for a in appeals],
        "item_id": [a["item_id"] for a in appeals],
        "filed_at": pa.array([a["filed_at"] for a in appeals], ts),
        "resolved_at": pa.array([a["resolved_at"] for a in appeals], ts),
        "outcome": [a["outcome"] for a in appeals],
    })
    rvw_tbl = pa.table({
        "reviewer_id": [r["reviewer_id"] for r in reviewers],
        "cohort": [r["cohort"] for r in reviewers],
        "start_date": pa.array([r["start_date"] for r in reviewers], pa.date32()),
        "tenure_weeks": pa.array([r["tenure_weeks"] for r in reviewers], pa.int16()),
    })
    keys = sorted(agg)
    trf_tbl = pa.table({
        "week_start": pa.array([(START + dt.timedelta(weeks=k[0])).date() for k in keys], pa.date32()),
        "surface": [k[1] for k in keys],
        "policy_area": [k[2] for k in keys],
        "scored": pa.array([agg[k][0] for k in keys], pa.int32()),
        "flagged": pa.array([agg[k][1] for k in keys], pa.int32()),
    })
    hk = sorted(hist)
    hist_tbl = pa.table({
        "week_start": pa.array([(START + dt.timedelta(weeks=k[0])).date() for k in hk], pa.date32()),
        "score_bin": pa.array([round(k[1] / 20, 2) for k in hk], pa.float32()),
        "n": pa.array([hist[k] for k in hk], pa.int32()),
    })
    sla_tbl = pa.table({
        "severity_tier": pa.array([1, 2, 3], pa.int8()),
        "description": ["high-severity flag", "standard flag", "QA sample (unflagged)"],
        "sla_hours": pa.array([SLA_HOURS[t] for t in (1, 2, 3)], pa.int16()),
    })
    manifest = {"synthetic": True, "seed": SEED, "window_start": START.isoformat(),
                "window_end": END.isoformat(), "tables": {}}
    for name, tbl in [("items", item_tbl), ("reviews", rev_tbl), ("appeals", app_tbl),
                      ("reviewers", rvw_tbl), ("traffic", trf_tbl), ("score_hist", hist_tbl),
                      ("sla_policy", sla_tbl)]:
        path = OUT / f"{name}.parquet"
        pq.write_table(tbl, path, compression="zstd", compression_level=9)
        manifest["tables"][name] = {"rows": tbl.num_rows, "bytes": path.stat().st_size}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))


# --------------------------------------------------------------------------- reference stats
def cohen_kappa(a, b, cats):
    n = len(a)
    po = sum(x == y for x, y in zip(a, b)) / n
    pe = sum((a.count(c) / n) * (b.count(c) / n) for c in cats)
    return (po - pe) / (1 - pe)


def kripp_alpha_nominal(pairs):
    vals = [v for p in pairs for v in p]
    n = len(vals)
    counts = {c: vals.count(c) for c in set(vals)}
    do = 2 * sum(1 for x, y in pairs if x != y)
    de = sum(counts[c] * counts[k] for c in counts for k in counts if c != k)
    return 1 - (n - 1) * do / de


def write_expected(items, reviews, reviewers):
    cohort = {r["reviewer_id"]: r["cohort"] for r in reviewers}
    by_item = {}
    for r in reviews:
        by_item.setdefault(r["item_id"], {})[r["review_role"]] = r
    cats = ["violating", "non-violating", "escalate"]
    groups, pairs = {}, []
    for iid, d in by_item.items():
        if "primary" in d and "second" in d:
            p, s = d["primary"], d["second"]
            pairs.append((p["label"], s["label"]))
            key = " + ".join(sorted([cohort[p["reviewer_id"]], cohort[s["reviewer_id"]]]))
            groups.setdefault(key, ([], []))
            groups[key][0].append(p["label"])
            groups[key][1].append(s["label"])
    exp = {"kappa_by_cohort_pair": {k: round(cohen_kappa(a, b, cats), 4) for k, (a, b) in groups.items()},
           "alpha_overall": round(kripp_alpha_nominal(pairs), 4), "n_double": len(pairs)}
    prf = {}
    true_prf = {}
    for area in AREAS:
        dec = [i for i in items if i["policy_area"] == area and i["final_label"] is not None]
        tp = sum(i["qa_weight"] for i in dec if i["classifier_flag"] and i["final_label"] == "violating")
        fp = sum(i["qa_weight"] for i in dec if i["classifier_flag"] and i["final_label"] != "violating")
        fn = sum(i["qa_weight"] for i in dec if not i["classifier_flag"] and i["final_label"] == "violating")
        p, r = tp / (tp + fp), tp / (tp + fn)
        prf[area] = {"precision": round(p, 4), "recall": round(r, 4), "f1": round(2 * p * r / (p + r), 4)}
        ttp = sum(i["qa_weight"] for i in dec if i["classifier_flag"] and i["_truth"])
        tfp = sum(i["qa_weight"] for i in dec if i["classifier_flag"] and not i["_truth"])
        tfn = sum(i["qa_weight"] for i in dec if not i["classifier_flag"] and i["_truth"])
        true_prf[area] = {"precision": round(ttp / (ttp + tfp), 4), "recall": round(ttp / (ttp + tfn), 4)}
    exp["prf_vs_final_label"] = prf
    exp["prf_vs_latent_truth_NOT_EXPORTED"] = true_prf
    (HERE / "expected.json").write_text(json.dumps(exp, indent=2) + "\n")
    print(json.dumps(exp, indent=2))


if __name__ == "__main__":
    main()
