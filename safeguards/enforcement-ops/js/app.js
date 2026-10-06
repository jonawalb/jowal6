// Enforcement Ops: loads the synthetic review-queue tables into DuckDB-WASM and
// draws every chart from a saved SQL query (data/queries.sql).
import * as duckdb from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.30.0/+esm';
import { lineChart, stackedBars, hbars, dotRows, heatmap, cssVar, fmtDay, pct, num, hideTip } from './charts.js';

const TABLES = ['items', 'reviews', 'appeals', 'reviewers', 'traffic', 'score_hist', 'sla_policy'];
const AREAS = [
  ['firearms', 'Firearms', '--c1'],
  ['explosives-conventional', 'Explosives (conventional)', '--c2'],
  ['drones-uas', 'Drones / UAS', '--c3'],
  ['ammunition', 'Ammunition', '--c4'],
  ['weapons-trafficking', 'Weapons trafficking', '--c5'],
  ['military-tech-dual-use', 'Military tech / dual-use', '--c6'],
  ['other', 'Other', '--c7'],
];
const AREA_NAME = Object.fromEntries(AREAS.map(([k, n]) => [k, n]));
const COHORT = { tenured: ['Tenured', '--c1'], 'new-2026-03': ['New cohort (Mar 2026)', '--c3'] };
// Injected events, as 0-indexed weeks (see scripts/generate.py).
const EVENTS = {
  drift: { from: 10, to: 11, label: 'injected: model update' },
  surge: { from: 14, to: 17, label: 'injected: drone surge' },
  dip: { from: 15, to: 16, label: 'injected: capacity cut' },
  cohort: { from: 8, to: 8, label: 'new cohort joins' },
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let conn;
let QUERIES = [];
const cache = new Map();

function setStatus(text, cls) {
  const s = $('#status');
  s.className = `status ${cls || ''}`;
  $('#status-text').textContent = text;
}

// ---------------------------------------------------------------- DuckDB
async function initDB() {
  const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
  const workerUrl = URL.createObjectURL(new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' }));
  const worker = new Worker(workerUrl);
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);
  conn = await db.connect();
  for (const t of TABLES) {
    const res = await fetch(`data/${t}.parquet`);
    if (!res.ok) throw new Error(`Could not load data/${t}.parquet (${res.status})`);
    await db.registerFileBuffer(`${t}.parquet`, new Uint8Array(await res.arrayBuffer()));
    await conn.query(`CREATE TABLE ${t} AS SELECT * FROM read_parquet('${t}.parquet')`);
  }
  // Lock the session down: no file or network access, no settings changes.
  for (const s of ['SET enable_external_access = false', 'SET lock_configuration = true']) {
    try { await conn.query(s); } catch (e) { /* older builds may not support a setting */ }
  }
}

function normalize(v, typeStr) {
  if (v == null) return null;
  if (typeof v === 'bigint') return Number(v);
  if (v instanceof Date) return v.toISOString().replace('T', ' ').slice(0, 19);
  if (typeof v === 'number' && /^(Timestamp|Date)/.test(typeStr)) {
    const iso = new Date(v).toISOString();
    return typeStr.startsWith('Date') ? iso.slice(0, 10) : iso.replace('T', ' ').slice(0, 19);
  }
  if (typeof v === 'object') {
    const n = Number(v);
    return Number.isFinite(n) ? n : String(v);
  }
  return v;
}

async function runSQL(sql) {
  const t0 = performance.now();
  const table = await conn.query(sql);
  const ms = performance.now() - t0;
  const fields = table.schema.fields.map((f) => ({ name: f.name, type: String(f.type) }));
  const cols = fields.map((_, j) => table.getChildAt(j));
  const rows = [];
  for (let i = 0; i < table.numRows; i++) {
    const o = {};
    fields.forEach((f, j) => { o[f.name] = normalize(cols[j].get(i), f.type); });
    rows.push(o);
  }
  return { fields, rows, ms };
}

async function q(id) {
  if (!cache.has(id)) {
    const def = QUERIES.find((x) => x.id === id);
    cache.set(id, runSQL(def.sql).then((r) => r.rows));
  }
  return cache.get(id);
}

function parseQueries(text) {
  return text.split(/^-- @id: */m).slice(1).map((block) => {
    const [idLine, ...rest] = block.split('\n');
    const body = rest.join('\n');
    const title = (body.match(/^-- @title: *(.*)$/m) || [])[1] || idLine;
    const panel = (body.match(/^-- @panel: *(.*)$/m) || [])[1] || '';
    const sql = body.replace(/^-- @(title|panel):.*\n/gm, '').trim();
    return { id: idLine.trim(), title, panel, sql };
  });
}

// ---------------------------------------------------------------- charts
const showEvents = () => $('#events').checked;
const shade = (...keys) => (showEvents() ? keys.map((k) => EVENTS[k]) : []);
const dayShade = (key) => {
  const e = EVENTS[key];
  return { from: e.from * 7, to: e.to * 7 + 6, label: e.label };
};
const legend = (el, items) => {
  el.innerHTML = items.map(([name, color, line]) => `<span><i class="${line ? 'line' : ''}" style="background:${color}"></i>${esc(name)}</span>`).join('');
};

const RENDER = {
  async health() {
    const [k] = await q('kpis');
    $('#kpis').innerHTML = [
      ['Queue items', num(k.queue_items), '26 weeks, synthetic'],
      ['Open at close', num(k.open_at_close), 'undecided on Jul 5'],
      ['Median time to decision', `${k.p50_hours} h`, 'arrival to final label'],
      ['p90 time to decision', `${k.p90_hours} h`, ''],
      ['SLA breach rate', pct(k.sla_breach_rate), 'tier SLAs 12 / 48 / 120 h'],
      ['Escalation rate', pct(k.escalation_rate), 'any reviewer chose escalate'],
    ].map(([l, v, s]) => `<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s}</div></div>`).join('');

    const vol = await q('volume_by_area');
    const weeks = [...new Set(vol.map((r) => r.week))];
    const series = AREAS.map(([key, name, c]) => ({
      name, color: cssVar(c),
      values: weeks.map((w) => (vol.find((r) => r.week === w && r.policy_area === key) || {}).items_in || 0),
    }));
    legend($('#lg-volume'), series.map((s) => [s.name, s.color]));
    stackedBars($('#ch-volume'), { labels: weeks, series, xFormat: fmtDay, aria: 'Stacked bar chart of weekly queue intake by policy area.' });

    const bl = await q('backlog_daily');
    lineChart($('#ch-backlog'), {
      labels: bl.map((r) => r.day), xFormat: fmtDay, yFormat: num,
      series: [
        { name: 'Open items', color: cssVar('--c1'), values: bl.map((r) => r.open_items), fill: true, fillOpacity: 0.18, width: 1.5 },
        { name: 'Open and past SLA', color: cssVar('--alert'), values: bl.map((r) => r.open_past_sla), width: 1.5 },
      ],
      shade: showEvents() ? [dayShade('dip')] : [],
      aria: 'Line chart of open items at the end of each day.',
    });
    legend($('#lg-backlog'), [['Open items', cssVar('--c1')], ['Open and past SLA', cssVar('--alert'), 1]]);

    const ttd = await q('time_to_decision');
    lineChart($('#ch-ttd'), {
      labels: ttd.map((r) => r.week), xFormat: fmtDay, yFormat: (v) => `${num(v, v < 10 ? 1 : 0)} h`,
      series: [
        { name: 'p50', color: cssVar('--c1'), values: ttd.map((r) => r.p50_hours), points: true },
        { name: 'p90', color: cssVar('--c3'), values: ttd.map((r) => r.p90_hours), points: true },
      ],
      shade: shade('dip'), aria: 'Line chart of median and 90th percentile hours to decision by week.',
    });
    legend($('#lg-ttd'), [['p50', cssVar('--c1'), 1], ['p90', cssVar('--c3'), 1]]);

    const se = await q('sla_escalation');
    lineChart($('#ch-sla'), {
      labels: se.map((r) => r.week), xFormat: fmtDay, yFormat: (v) => pct(v, 0),
      series: [
        { name: 'SLA breach rate', color: cssVar('--alert'), values: se.map((r) => r.sla_breach_rate), points: true },
        { name: 'Escalation rate', color: cssVar('--c4'), values: se.map((r) => r.escalation_rate), points: true },
      ],
      tip: (i) => `<b>Week of ${fmtDay(se[i].week)}</b><div class="row"><span>SLA breach</span><span>${pct(se[i].sla_breach_rate)}</span></div><div class="row"><span>Escalation</span><span>${pct(se[i].escalation_rate)}</span></div>`,
      shade: shade('dip'), aria: 'Line chart of weekly SLA breach and escalation rates.',
    });
    legend($('#lg-sla'), [['SLA breach rate', cssVar('--alert'), 1], ['Escalation rate', cssVar('--c4'), 1]]);
  },

  async quality() {
    const kap = await q('kappa_cohort');
    const cohortLabel = (p) => p.split(' + ').map((c) => (COHORT[c] ? COHORT[c][0] : c)).join(' + ');
    hbars($('#ch-kappa'), {
      rows: kap.map((r) => ({
        label: cohortLabel(r.cohort_pair), sub: `n = ${num(r.n)} · raw agreement ${pct(r.observed_agreement)}`,
        value: r.cohen_kappa, color: r.cohort_pair.includes('new') ? cssVar('--c3') : cssVar('--c1'),
      })),
      domain: [0, 1], format: (v) => v.toFixed(2),
      refs: [{ x: 0.61, label: '0.61' }, { x: 0.81, label: '0.81' }],
      aria: "Bar chart of Cohen's kappa by reviewer cohort pair.",
    });

    const al = await q('alpha_period');
    const overall = al.find((r) => r.period === 'All');
    const months = al.filter((r) => r.period !== 'All');
    const mlabel = (p) => { const [, m] = p.split('-'); return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'][+m - 1] + (p === '2026-07' ? '*' : ''); };
    $('#alpha-overall').textContent = overall.kripp_alpha.toFixed(3);
    lineChart($('#ch-alpha'), {
      labels: months.map((r) => r.period), xFormat: mlabel, categorical: true, yMin: 0.5, yMax: 0.9,
      yFormat: (v) => v.toFixed(2),
      series: [{ name: 'α', color: cssVar('--c1'), values: months.map((r) => r.kripp_alpha), points: true, r: 4 }],
      hlines: [{ y: 0.8, label: '0.800' }, { y: 0.667, label: '0.667' }],
      tip: (i) => `<b>${months[i].period}${months[i].period === '2026-07' ? ' (5 days)' : ''}</b><div class="row"><span>α</span><span>${months[i].kripp_alpha.toFixed(3)}</span></div><div class="row"><span>double-reviewed items</span><span>${num(months[i].units)}</span></div>`,
      aria: "Line chart of Krippendorff's alpha by month.",
    });

    const ra = await q('reviewer_agreement');
    lineChart($('#ch-reviewers'), {
      labels: ra.map((r) => r.reviewer_id), categorical: true, yMin: 0.85, yMax: 1, yFormat: (v) => pct(v, 0),
      series: [{ name: 'Agreement', color: cssVar('--c1'), line: false, points: true, r: 4.5,
        values: ra.map((r) => r.agreement_with_final), pointColors: ra.map((r) => cssVar(COHORT[r.cohort][1])) }],
      tip: (i) => `<b>${ra[i].reviewer_id}</b> · ${COHORT[ra[i].cohort][0]}<div class="row"><span>agreement with final</span><span>${pct(ra[i].agreement_with_final)}</span></div><div class="row"><span>escalate rate</span><span>${pct(ra[i].escalate_rate)}</span></div><div class="row"><span>reviews</span><span>${num(ra[i].reviews)}</span></div>`,
      aria: 'Dot chart of each reviewer agreement with the final label.',
    });
    legend($('#lg-reviewers'), Object.values(COHORT).map(([n, c]) => [n, cssVar(c)]));

    const prf = await q('classifier_prf');
    const keys = [
      { key: 'precision', name: 'Precision', color: cssVar('--c1'), shape: 'circle' },
      { key: 'recall', name: 'Recall', color: cssVar('--c3'), shape: 'square' },
      { key: 'f1', name: 'F1', color: cssVar('--c4'), shape: 'diamond' },
    ];
    dotRows($('#ch-prf'), {
      rows: prf.map((r) => ({ label: `${AREA_NAME[r.policy_area]} (n = ${num(r.decided_items)})`, vals: r })),
      keys, domain: [0.4, 1], format: (v) => v.toFixed(2),
      aria: 'Dot chart of classifier precision, recall and F1 by policy area.',
    });
    legend($('#lg-prf'), keys.map((k) => [k.name, k.color]));

    const ap = await q('appeals');
    lineChart($('#ch-appeals'), {
      labels: ap.map((r) => r.week), xFormat: fmtDay, yFormat: (v) => pct(v, 0), yMin: 0,
      series: [
        { name: 'Overturn rate', color: cssVar('--alert'), values: ap.map((r) => r.overturn_rate), points: true },
        { name: 'Appeal rate', color: cssVar('--c4'), values: ap.map((r) => r.appeals / r.actioned), points: true },
      ],
      tip: (i) => `<b>Decisions in week of ${fmtDay(ap[i].week)}</b><div class="row"><span>actioned items</span><span>${num(ap[i].actioned)}</span></div><div class="row"><span>appeals</span><span>${num(ap[i].appeals)} (${pct(ap[i].appeals / ap[i].actioned)})</span></div><div class="row"><span>overturned / upheld</span><span>${ap[i].overturned} / ${ap[i].upheld}</span></div><div class="row"><span>overturn rate</span><span>${pct(ap[i].overturn_rate)}</span></div>`,
      shade: shade('drift'), aria: 'Line chart of weekly appeal rate and overturn rate.',
    });
    legend($('#lg-appeals'), [['Overturn rate (resolved appeals)', cssVar('--alert'), 1], ['Appeal rate (appeals ÷ actioned)', cssVar('--c4'), 1]]);
  },

  async drift() {
    const pc = await q('drift_pchart');
    lineChart($('#ch-pchart'), {
      labels: pc.map((r) => r.week), xFormat: fmtDay, yFormat: (v) => pct(v, 1), yMin: 0.06, yMax: 0.135,
      series: [{ name: 'Positive rate', color: cssVar('--c1'), values: pc.map((r) => r.pos_rate), points: true,
        pointColors: pc.map((r) => (r.alert ? cssVar('--alert') : cssVar('--c1'))) }],
      band: { lo: pc.map((r) => r.lcl_3s), hi: pc.map((r) => r.ucl_3s) },
      hlines: [{ y: pc[0].center, label: `baseline ${pct(pc[0].center, 2)}` }],
      markers: pc.map((r, i) => (r.alert ? { i, y: r.pos_rate } : null)).filter(Boolean),
      shade: shade('drift', 'surge'),
      tip: (i) => `<b>Week of ${fmtDay(pc[i].week)}</b><div class="row"><span>scored</span><span>${num(pc[i].scored)}</span></div><div class="row"><span>flagged</span><span>${num(pc[i].flagged)}</span></div><div class="row"><span>positive rate</span><span>${pct(pc[i].pos_rate, 2)}</span></div><div class="row"><span>3σ limits</span><span>${pct(pc[i].lcl_3s, 2)} – ${pct(pc[i].ucl_3s, 2)}</span></div><div class="row"><span>z</span><span>${pc[i].z.toFixed(2)}</span></div>${pc[i].alert ? '<div><b style="color:var(--alert)">Alert</b></div>' : ''}`,
      aria: 'Control chart of weekly classifier positive rate with 3-sigma limits.',
    });
    legend($('#lg-pchart'), [['Weekly positive rate', cssVar('--c1'), 1], ['3σ limits', cssVar('--g200')], ['Alert', cssVar('--alert')]]);

    const base = pc.slice(0, 8).reduce((a, r) => a + r.flag_precision, 0) / 8;
    lineChart($('#ch-precision'), {
      labels: pc.map((r) => r.week), xFormat: fmtDay, yFormat: (v) => pct(v, 0), yMin: 0.5, yMax: 0.9,
      series: [{ name: 'Precision of flags', color: cssVar('--c4'), values: pc.map((r) => r.flag_precision), points: true }],
      hlines: [{ y: base, label: `weeks 1–8 mean ${pct(base, 0)}`, below: true }],
      shade: shade('drift', 'surge'), aria: 'Line chart of weekly precision of classifier flags.',
    });

    const sd = await q('score_dist');
    const wk = [...new Set(sd.map((r) => r.week))];
    const bins = [...new Set(sd.map((r) => r.score_bin))].sort((a, b) => a - b);
    const look = new Map(sd.map((r) => [`${r.week}|${r.score_bin}`, r]));
    heatmap($('#ch-scores'), {
      xLabels: wk, yLabels: bins, value: (i, j) => (look.get(`${wk[i]}|${bins[j]}`) || {}).share || 0,
      floor: 1e-3, hline: 0.5, hlineLabel: 'flag threshold 0.50',
      tip: (i, j) => { const r = look.get(`${wk[i]}|${bins[j]}`) || { n: 0, share: 0 }; return `<b>Week of ${fmtDay(wk[i])}</b><div class="row"><span>score ${bins[j].toFixed(2)}–${(bins[j] + 0.05).toFixed(2)}</span><span>${pct(r.share, 2)}</span></div><div class="row"><span>items</span><span>${num(r.n)}</span></div>`; },
      aria: 'Heatmap of weekly classifier score distribution.',
    });

    $('#alerts').innerHTML = pc.filter((r) => r.alert).map((r) => {
      const drop = base - r.flag_precision;
      const read = drop > 0.08
        ? `Precision of flags fell to ${pct(r.flag_precision, 0)} (baseline ${pct(base, 0)}). Extra flags are mostly non-violating: check for a classifier or threshold change.`
        : `Precision held at ${pct(r.flag_precision, 0)}. More flags without more false positives: check the traffic mix (policy area, surface) before touching the model.`;
      return `<li><span class="wk">${fmtDay(r.week)}</span><span>Positive rate ${pct(r.pos_rate, 2)}, z = ${r.z.toFixed(1)}. ${read}</span></li>`;
    }).join('') || '<li>No alerts.</li>';
  },
};

async function renderPanel(name) {
  if (!conn || !RENDER[name]) return;
  try {
    await RENDER[name]();
  } catch (e) {
    console.warn(e);
    setStatus(`Chart error: ${e.message}`, 'error');
  }
}

// ---------------------------------------------------------------- tabs
const TABS = ['health', 'quality', 'drift', 'console', 'method'];
function selectTab(name, focus) {
  if (!TABS.includes(name)) name = 'health';
  hideTip();
  for (const t of TABS) {
    const b = $(`#tab-${t}`);
    b.setAttribute('aria-selected', String(t === name));
    b.tabIndex = t === name ? 0 : -1;
    $(`#panel-${t}`).hidden = t !== name;
  }
  if (focus) $(`#tab-${name}`).focus();
  if (history.replaceState) history.replaceState(null, '', `#${name}`);
  renderPanel(name);
}

// ---------------------------------------------------------------- console
const READ_ONLY_START = /^(select|with|from|describe|show|summarize|explain|values|pragma\s+table_info|table)\b/i;
const BLOCKED = /\b(insert|update|delete|create|drop|alter|copy|attach|detach|install|load|export|import|set|reset|call|checkpoint|vacuum|truncate|replace|merge|grant|use)\b/i;
function guard(sql) {
  const noComments = sql.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const noStrings = noComments.replace(/'(?:[^']|'')*'/g, "''").replace(/"(?:[^"]|"")*"/g, '""');
  const body = noStrings.trim().replace(/;\s*$/, '');
  if (!body) return 'Type a query first.';
  if (body.includes(';')) return 'Run one statement at a time.';
  if (!READ_ONLY_START.test(body)) return 'This console is read-only. Start with SELECT, WITH, FROM, DESCRIBE, SHOW, SUMMARIZE or EXPLAIN.';
  if (/^pragma/i.test(body)) return null;
  const m = body.match(BLOCKED);
  if (m && !/^(replace)$/i.test(m[1])) return `This console is read-only ("${m[1]}" is not allowed).`;
  return null;
}

async function runConsole() {
  const sql = $('#sql').value;
  const err = $('#sql-err');
  err.textContent = '';
  const g = guard(sql);
  if (g) { err.textContent = g; return; }
  $('#run').disabled = true;
  $('#run-msg').textContent = 'Running…';
  try {
    const { fields, rows, ms } = await runSQL(sql.trim().replace(/;\s*$/, ''));
    const shown = rows.slice(0, 1000);
    const isNum = fields.map((f) => /Int|Float|Decimal|Double/.test(f.type));
    $('#result').innerHTML = `<table class="res"><thead><tr>${fields.map((f) => `<th scope="col">${esc(f.name)}</th>`).join('')}</tr></thead><tbody>${
      shown.map((r) => `<tr>${fields.map((f, j) => `<td class="${isNum[j] ? 'num' : ''}">${r[f.name] == null ? '<span style="color:var(--muted)">NULL</span>' : esc(typeof r[f.name] === 'number' && !Number.isInteger(r[f.name]) ? +r[f.name].toFixed(6) : r[f.name])}</td>`).join('')}</tr>`).join('')
    }</tbody></table>`;
    $('#run-msg').textContent = `${num(rows.length)} row${rows.length === 1 ? '' : 's'}${rows.length > 1000 ? ' (showing first 1,000)' : ''} · ${ms.toFixed(0)} ms`;
  } catch (e) {
    err.textContent = e.message;
    $('#run-msg').textContent = '';
  } finally {
    $('#run').disabled = false;
  }
}

function loadSaved(id, run = true) {
  const def = QUERIES.find((x) => x.id === id);
  if (!def) return;
  $('#sql').value = `-- ${def.title}\n${def.sql}\n`;
  $$('.saved button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.id === id)));
  if (run && conn) runConsole();
}

async function buildSchema() {
  const { rows } = await runSQL(`SELECT table_name, column_name, data_type FROM information_schema.columns
    WHERE table_schema = 'main' ORDER BY table_name, ordinal_position`);
  const counts = {};
  for (const t of TABLES) counts[t] = (await runSQL(`SELECT count(*) AS n FROM ${t}`)).rows[0].n;
  $('#schema').innerHTML = TABLES.map((t) => `<details${t === 'items' ? ' open' : ''}><summary>${t} <small>${num(counts[t])} rows</small></summary><ul>${
    rows.filter((r) => r.table_name === t).map((r) => `<li><button type="button" data-ins="${esc(r.column_name)}" title="Insert at cursor">${esc(r.column_name)}</button> <span>${esc(r.data_type.toLowerCase())}</span></li>`).join('')
  }</ul></details>`).join('');
}

function insertAtCursor(text) {
  const ta = $('#sql');
  const s = ta.selectionStart, e = ta.selectionEnd;
  ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
  ta.selectionStart = ta.selectionEnd = s + text.length;
  ta.focus();
}

// ---------------------------------------------------------------- boot
async function main() {
  $$('nav.tabs button').forEach((b, i, all) => {
    b.addEventListener('click', () => selectTab(b.dataset.tab));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
      selectTab(next.dataset.tab, true);
    });
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sql]');
    if (b) { selectTab('console'); loadSaved(b.dataset.sql); $('#sql').focus(); }
    const ins = e.target.closest('[data-ins]');
    if (ins) insertAtCursor(ins.dataset.ins);
  });
  $('#run').addEventListener('click', runConsole);
  $('#sql').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); runConsole(); }
  });
  $('#events').addEventListener('change', () => renderPanel(currentTab()));
  const currentTab = () => TABS.find((t) => !$(`#panel-${t}`).hidden);
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => renderPanel(currentTab()), 150); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => renderPanel(currentTab()));

  selectTab(location.hash.slice(1) || 'health');

  try {
    QUERIES = parseQueries(await (await fetch('data/queries.sql')).text());
    $('#saved').innerHTML = QUERIES.map((d) => `<li><button type="button" data-id="${d.id}">${esc(d.title)}<small>${d.panel} · ${d.id}</small></button></li>`).join('');
    $$('#saved button').forEach((b) => b.addEventListener('click', () => loadSaved(b.dataset.id)));
    loadSaved('kappa_cohort', false);
    setStatus('Loading DuckDB-WASM and 7 synthetic tables (about 1 MB)…');
    await initDB();
    setStatus('Ready. Every chart below is computed in your browser by the SQL shown in the console.', 'ready');
    $('#run').disabled = false;
    await renderPanel(currentTab());
    await buildSchema();
    loadSaved('kappa_cohort', true);
  } catch (e) {
    console.warn(e);
    setStatus(`Could not start the in-browser database: ${e.message}`, 'error');
  }
}

main();
