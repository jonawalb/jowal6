-- Saved queries for Enforcement Ops (synthetic data).
-- Each block starts with "-- @id:". The dashboard runs these in DuckDB-WASM and
-- draws each chart from the result, so the SQL shown is the SQL behind the chart.

-- @id: kpis
-- @title: Headline numbers
-- @panel: health
WITH esc AS (
  SELECT item_id, bool_or(label = 'escalate') AS escalated
  FROM reviews GROUP BY item_id
),
x AS (
  SELECT i.*, s.sla_hours, esc.escalated,
         epoch(coalesce(i.final_decided_at, TIMESTAMP '2026-07-06') - i.created_at) / 3600 AS elapsed_h
  FROM items i
  JOIN sla_policy s USING (severity_tier)
  LEFT JOIN esc USING (item_id)
)
SELECT
  count(*)                                                     AS queue_items,
  count(*) FILTER (WHERE final_label IS NOT NULL)              AS decided,
  count(*) FILTER (WHERE final_label IS NULL)                  AS open_at_close,
  round(quantile_cont(elapsed_h, 0.5) FILTER (WHERE final_label IS NOT NULL), 1) AS p50_hours,
  round(quantile_cont(elapsed_h, 0.9) FILTER (WHERE final_label IS NOT NULL), 1) AS p90_hours,
  -- open items count toward the SLA rate only once they are already past SLA
  round(avg(CASE WHEN elapsed_h > sla_hours THEN 1.0 ELSE 0.0 END)
        FILTER (WHERE final_label IS NOT NULL OR elapsed_h > sla_hours), 4) AS sla_breach_rate,
  round(avg(CASE WHEN escalated THEN 1.0 ELSE 0.0 END)
        FILTER (WHERE escalated IS NOT NULL), 4)               AS escalation_rate
FROM x;

-- @id: volume_by_area
-- @title: Weekly queue intake by policy area
-- @panel: health
SELECT
  strftime(date_trunc('week', created_at), '%Y-%m-%d') AS week,
  policy_area,
  count(*) AS items_in
FROM items
GROUP BY ALL
ORDER BY week, policy_area;

-- @id: backlog_daily
-- @title: Open items at end of each day
-- @panel: health
WITH days AS (
  SELECT unnest(generate_series(TIMESTAMP '2026-01-05 23:59:59',
                                TIMESTAMP '2026-07-05 23:59:59',
                                INTERVAL 1 DAY)) AS ts
)
SELECT
  strftime(d.ts, '%Y-%m-%d') AS day,
  count(i.item_id) AS open_items,
  count(i.item_id) FILTER (
    WHERE epoch(d.ts - i.created_at) / 3600 > s.sla_hours) AS open_past_sla
FROM days d
LEFT JOIN items i
  ON i.created_at <= d.ts
 AND coalesce(i.final_decided_at, TIMESTAMP '9999-01-01') > d.ts
LEFT JOIN sla_policy s ON s.severity_tier = i.severity_tier
GROUP BY d.ts
ORDER BY d.ts;

-- @id: time_to_decision
-- @title: Time to final decision by arrival week (hours)
-- @panel: health
SELECT
  strftime(date_trunc('week', created_at), '%Y-%m-%d') AS week,
  count(*) AS decided,
  round(quantile_cont(epoch(final_decided_at - created_at) / 3600, 0.5), 2) AS p50_hours,
  round(quantile_cont(epoch(final_decided_at - created_at) / 3600, 0.9), 2) AS p90_hours
FROM items
WHERE final_decided_at IS NOT NULL
GROUP BY 1
ORDER BY 1;

-- @id: sla_escalation
-- @title: SLA breach rate and escalation rate by arrival week
-- @panel: health
WITH esc AS (
  SELECT item_id, bool_or(label = 'escalate') AS escalated
  FROM reviews GROUP BY item_id
),
x AS (
  SELECT
    date_trunc('week', i.created_at) AS wk,
    epoch(coalesce(i.final_decided_at, TIMESTAMP '2026-07-06') - i.created_at) / 3600 AS elapsed_h,
    s.sla_hours,
    i.final_label IS NOT NULL AS decided,
    esc.escalated
  FROM items i
  JOIN sla_policy s USING (severity_tier)
  LEFT JOIN esc USING (item_id)
)
SELECT
  strftime(wk, '%Y-%m-%d') AS week,
  -- an open item counts only once it is already past its SLA
  round(avg(CASE WHEN elapsed_h > sla_hours THEN 1.0 ELSE 0.0 END)
        FILTER (WHERE decided OR elapsed_h > sla_hours), 4) AS sla_breach_rate,
  round(avg(CASE WHEN escalated THEN 1.0 ELSE 0.0 END)
        FILTER (WHERE escalated IS NOT NULL), 4) AS escalation_rate
FROM x
GROUP BY wk
ORDER BY wk;

-- @id: kappa_cohort
-- @title: Cohen's kappa on double-reviewed items, by reviewer-cohort pair
-- @panel: quality
WITH pr AS (
  SELECT p.label AS l1, s.label AS l2,
         least(rp.cohort, rs.cohort) || ' + ' || greatest(rp.cohort, rs.cohort) AS cohort_pair
  FROM reviews p
  JOIN reviews s ON s.item_id = p.item_id AND s.review_role = 'second'
  JOIN reviewers rp ON rp.reviewer_id = p.reviewer_id
  JOIN reviewers rs ON rs.reviewer_id = s.reviewer_id
  WHERE p.review_role = 'primary'
),
n AS (
  SELECT cohort_pair, count(*) AS n, avg(CASE WHEN l1 = l2 THEN 1.0 ELSE 0.0 END) AS po
  FROM pr GROUP BY 1
),
m1 AS (SELECT cohort_pair, l1 AS cat, count(*) AS k FROM pr GROUP BY ALL),
m2 AS (SELECT cohort_pair, l2 AS cat, count(*) AS k FROM pr GROUP BY ALL),
pe AS (
  SELECT m1.cohort_pair, sum(m1.k * m2.k)::DOUBLE / any_value(n.n * n.n) AS pe
  FROM m1 JOIN m2 USING (cohort_pair, cat) JOIN n USING (cohort_pair)
  GROUP BY 1
)
SELECT cohort_pair, n,
       round(po, 4) AS observed_agreement,
       round(pe, 4) AS chance_agreement,
       round((po - pe) / (1 - pe), 4) AS cohen_kappa
FROM n JOIN pe USING (cohort_pair)
ORDER BY cohen_kappa DESC;

-- @id: alpha_period
-- @title: Krippendorff's alpha (nominal) by month and overall
-- @panel: quality
WITH pr AS (
  SELECT strftime(i.created_at, '%Y-%m') AS period, p.label AS l1, s.label AS l2
  FROM reviews p
  JOIN reviews s ON s.item_id = p.item_id AND s.review_role = 'second'
  JOIN items i ON i.item_id = p.item_id
  WHERE p.review_role = 'primary'
),
p AS (SELECT * FROM pr UNION ALL SELECT 'All', l1, l2 FROM pr),
vals AS (SELECT period, l1 AS v FROM p UNION ALL SELECT period, l2 FROM p),
nc AS (SELECT period, v, count(*) AS n FROM vals GROUP BY ALL),
tot AS (SELECT period, sum(n) AS n FROM nc GROUP BY 1),
de AS (
  SELECT a.period, sum(a.n * b.n) AS e
  FROM nc a JOIN nc b ON a.period = b.period AND a.v <> b.v
  GROUP BY 1
),
dobs AS (
  SELECT period, count(*) AS units, 2 * count(*) FILTER (WHERE l1 <> l2) AS d
  FROM p GROUP BY 1
)
SELECT period, units,
       round(1 - (tot.n - 1) * dobs.d / de.e, 4) AS kripp_alpha
FROM dobs JOIN tot USING (period) JOIN de USING (period)
ORDER BY period = 'All', period;

-- @id: reviewer_agreement
-- @title: Each reviewer's agreement with the final label (double-reviewed items)
-- @panel: quality
SELECT
  r.reviewer_id,
  v.cohort,
  count(*) AS reviews,
  round(avg(CASE WHEN r.label = 'escalate' THEN 1.0 ELSE 0.0 END), 4) AS escalate_rate,
  round(avg(CASE WHEN r.label = i.final_label THEN 1.0 ELSE 0.0 END)
        FILTER (WHERE r.label <> 'escalate'), 4) AS agreement_with_final
FROM reviews r
JOIN items i USING (item_id)
JOIN reviewers v USING (reviewer_id)
WHERE i.double_reviewed
  AND i.final_label IS NOT NULL
  AND r.review_role IN ('primary', 'second')
GROUP BY ALL
ORDER BY agreement_with_final DESC;

-- @id: classifier_prf
-- @title: Classifier precision, recall, F1 vs final human label, by policy area
-- @panel: quality
WITH c AS (
  SELECT policy_area,
    sum(qa_weight) FILTER (WHERE classifier_flag AND final_label = 'violating')         AS tp,
    sum(qa_weight) FILTER (WHERE classifier_flag AND final_label = 'non-violating')     AS fp,
    sum(qa_weight) FILTER (WHERE NOT classifier_flag AND final_label = 'violating')     AS fn,
    count(*) AS decided_items
  FROM items
  WHERE final_label IS NOT NULL
  GROUP BY 1
)
SELECT policy_area, decided_items,
       round(tp / (tp + fp), 4) AS precision,
       round(tp / (tp + fn), 4) AS recall,
       round(2 * tp / (2 * tp + fp + fn), 4) AS f1
FROM c
ORDER BY f1 DESC;

-- @id: appeals
-- @title: Appeals and overturn rate by week of the enforcement decision
-- @panel: quality
SELECT
  strftime(date_trunc('week', i.final_decided_at), '%Y-%m-%d') AS week,
  count(DISTINCT i.item_id) AS actioned,
  count(a.appeal_id) AS appeals,
  count(*) FILTER (WHERE a.outcome = 'overturned') AS overturned,
  count(*) FILTER (WHERE a.outcome = 'upheld') AS upheld,
  round(count(*) FILTER (WHERE a.outcome = 'overturned')::DOUBLE
        / nullif(count(*) FILTER (WHERE a.outcome IN ('overturned', 'upheld')), 0), 4) AS overturn_rate
FROM items i
LEFT JOIN appeals a USING (item_id)
WHERE i.final_label = 'violating'
GROUP BY 1
ORDER BY 1;

-- @id: drift_pchart
-- @title: Weekly classifier positive rate with p-chart limits (baseline weeks 1-8)
-- @panel: drift
WITH w AS (
  SELECT week_start, sum(scored) AS n, sum(flagged) AS x
  FROM traffic GROUP BY 1
),
base AS (
  SELECT sum(x)::DOUBLE / sum(n) AS pbar
  FROM w WHERE week_start < DATE '2026-03-02'
),
prec AS (
  SELECT date_trunc('week', created_at)::DATE AS week_start,
         avg(CASE WHEN final_label = 'violating' THEN 1.0 ELSE 0.0 END) AS flag_precision
  FROM items
  WHERE classifier_flag AND final_label IS NOT NULL
  GROUP BY 1
),
z AS (
  SELECT w.week_start, w.n, w.x,
         w.x::DOUBLE / w.n AS pos_rate,
         b.pbar,
         sqrt(b.pbar * (1 - b.pbar) / w.n) AS sigma,
         (w.x::DOUBLE / w.n - b.pbar) / sqrt(b.pbar * (1 - b.pbar) / w.n) AS z
  FROM w CROSS JOIN base b
)
SELECT
  strftime(z.week_start, '%Y-%m-%d') AS week,
  z.n AS scored, z.x AS flagged,
  round(z.pos_rate, 5) AS pos_rate,
  round(z.pbar, 5) AS center,
  round(z.pbar - 3 * z.sigma, 5) AS lcl_3s,
  round(z.pbar + 3 * z.sigma, 5) AS ucl_3s,
  round(z.z, 2) AS z,
  -- Rule: alert if |z| > 3, or if this week and the previous week are both
  -- beyond 2 sigma on the same side.
  abs(z.z) > 3
    OR (abs(z.z) > 2 AND abs(lag(z.z) OVER (ORDER BY z.week_start)) > 2
        AND sign(z.z) = sign(lag(z.z) OVER (ORDER BY z.week_start))) AS alert,
  round(p.flag_precision, 4) AS flag_precision
FROM z LEFT JOIN prec p USING (week_start)
ORDER BY z.week_start;

-- @id: score_dist
-- @title: Weekly classifier score distribution (share of scored traffic per 0.05 bin)
-- @panel: drift
SELECT
  strftime(week_start, '%Y-%m-%d') AS week,
  score_bin,
  n,
  round(n::DOUBLE / sum(n) OVER (PARTITION BY week_start), 5) AS share
FROM score_hist
ORDER BY week_start, score_bin;
