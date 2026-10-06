# FACTCHECK: Enforcement Ops

All queue, reviewer, classifier and appeal figures are synthetic (scripts/generate.py, seed 20261006) and labelled as such in the UI. The claims below are the only external facts on the page.

| Claim | Source | Verified |
|---|---|---|
| Cohen's kappa formula, κ = (p_o − p_e)/(1 − p_e) | Cohen 1960, Educ. Psych. Meas. 20(1):37–46, doi:10.1177/001316446002000104 (Crossref metadata checked 2026-10-06) | y |
| Landis & Koch bands: 0.61–0.80 "substantial", 0.81–1.00 "almost perfect" | Landis & Koch 1977, Biometrics 33(1):159–174, doi:10.2307/2529310 (Crossref checked; band values confirmed via irrCAC docs and secondary sources) | y |
| Krippendorff's α nominal, two coders, 1 − (n−1)Σo_ck/Σn_c n_k | Hayes & Krippendorff 2007, CMM 1(1):77–89, doi:10.1080/19312450709336664 (Crossref checked); also checked numerically against scripts/check.py | y |
| Krippendorff: rely on α ≥ .800, tentative conclusions for .667–.800 | Krippendorff 2004, Content Analysis 2nd ed., pp. 241–243, as quoted by Wikipedia "Krippendorff's alpha" (Significance section). Primary page not read directly | y (secondary) |
| p-chart limits p̄ ± 3√(p̄(1−p̄)/n) | NIST/SEMATECH e-Handbook 6.3.3.2, https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc332.htm (fetched 2026-10-06) | y |
| Laney p′ chart addresses over-dispersion in large-n attribute charts | Laney 2002, Quality Engineering 14(4):531–537, doi:10.1081/QEN-120003555 (Crossref checked) | y |
| DuckDB-WASM 1.30.0 on jsdelivr | https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.30.0/package.json | y |
| Jonathan ran inter-coder calibration on 311 RA-coded NSC meetings | Supplied by the coordinator brief (author's own record) | y (author) |
| The alert rule (3σ, or two consecutive weeks beyond 2σ same side) | Defined for this page, labelled as such; not attributed | n/a |
