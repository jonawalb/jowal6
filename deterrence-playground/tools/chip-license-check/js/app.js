// UI for "Does This Chip Need a License?"
import { tppOf, pdOf, classify, decide, compareRules, groupsOf, OUTCOMES, AK50_FIVE, fmt, defaultRules, rulesetLabels, ak50InForce } from './model.js';
import { drawChart } from './chart.js';
import { reasonLine, glossFor } from './simple.js';
import { CHIPS } from '../data/chips.js';
import { GROUPS } from '../data/groups.js';
import { TIMELINE } from '../data/timeline.js';
import { SOURCES } from '../data/sources.js';

const $ = (id) => document.getElementById(id);
const EXTRA_DEST = ['Brazil', 'Hong Kong', 'Indonesia', 'Malaysia', 'Philippines', 'Thailand'];
const DESTS = [...new Set([...Object.keys(GROUPS), ...EXTRA_DEST])].sort((a, b) => a.localeCompare(b));
const BITS = [4, 6, 8, 16, 32, 64];
const SHORT = { h100: 'H100', h200: 'H200', a100: 'A100', b200: 'B200', mi325x: 'MI325X', rtx4090: 'RTX 4090', rtx4080: 'RTX 4080', ascend910: 'Ascend 910' };

// Today's date in Washington (America/New_York), YYYY-MM-DD: Federal Register publication and effective dates are Eastern dates.
// The engine never reads the clock; it gets this value.
const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
const DEFAULT_RULES = defaultRules(TODAY);
const LABELS = rulesetLabels(TODAY);
const IN_FORCE = ak50InForce(TODAY);

const S = {
  preset: 'h200', rows: [], die: null, bw: null, dc: true, d5design: false, form: 'ic',
  dest: 'China (PRC)', endUser: 'commercial', hq: false, origin: 'us', ship: 'us', certs: true,
  rules: DEFAULT_RULES, usHq: 'no', dcUse: 'no',
  endUse: 'none', fn: 'none', oeccn: 'unknown', foundry: 'no', node: 'yes', dm: 'over',
};

function h(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'text') n.textContent = attrs[k];
    else if (k === 'class') n.className = attrs[k];
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), attrs[k]);
    else n.setAttribute(k, attrs[k]);
  }
  kids.flat().forEach(c => c != null && n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return n;
}
const link = (c) => h('a', { href: c.url, target: '_blank', rel: 'noopener', text: c.label });
const num = (v) => { const x = parseFloat(v); return Number.isFinite(x) && x > 0 ? x : null; };

// ---------- chip panel ----------
function loadPreset(id) {
  const c = CHIPS.find(x => x.id === id);
  S.preset = id;
  if (!c) return;
  S.rows = c.rows.map(r => ({ ...r }));
  S.die = c.dieMm2; S.bw = c.dramBw; S.dc = c.datacenter; S.d5design = !!c.designerD5;
  if (c.designerD5) S.origin = 'fdp';
}
function presetObj() { return CHIPS.find(x => x.id === S.preset); }

function renderPresetSelect() {
  const sel = $('preset');
  sel.textContent = '';
  CHIPS.forEach(c => sel.appendChild(h('option', { value: c.id, text: c.name })));
  sel.appendChild(h('option', { value: 'custom', text: 'Custom: enter your own figures' }));
  sel.addEventListener('change', () => { if (sel.value !== 'custom') loadPreset(sel.value); else S.preset = 'custom'; syncInputs(); update(); });
}

function renderRows() {
  const box = $('rows');
  box.textContent = '';
  const ov = presetObj()?.override;
  if (ov) { box.appendChild(h('p', { class: 'fine', text: 'No published figures for this part. The walk uses the sources named above.' })); $('add-row').hidden = true; return; }
  $('add-row').hidden = false;
  S.rows.forEach((r, i) => {
    const id = `r${i}`;
    const tops = h('input', { id: `${id}-t`, type: 'number', min: '0', step: 'any', inputmode: 'decimal', value: r.tops ?? '', 'aria-label': `Row ${i + 1} dense TOPS or TFLOPS` });
    const bits = h('select', { id: `${id}-b`, 'aria-label': `Row ${i + 1} input bit length` }, BITS.map(b => h('option', { value: b, text: `${b}-bit` })));
    bits.value = String(r.bits || 8);
    const lab = h('input', { type: 'text', value: r.label || '', placeholder: 'label', 'aria-label': `Row ${i + 1} label`, class: 'rl-in' });
    const out = h('span', { class: 'num rowtpp' });
    const del = h('button', { type: 'button', class: 'linkbtn', text: 'Remove', 'aria-label': `Remove row ${i + 1}` });
    const set = () => { r.tops = num(tops.value); r.bits = +bits.value; r.label = lab.value; S.preset = S.preset === 'custom' ? 'custom' : markCustom(); update(); };
    tops.addEventListener('input', set); bits.addEventListener('change', set); lab.addEventListener('input', () => { r.label = lab.value; });
    del.addEventListener('click', () => { S.rows.splice(i, 1); markCustom(); renderRows(); update(); });
    box.appendChild(h('div', { class: 'row' }, lab, tops, h('span', { class: 'x', text: '×' }), bits, out, S.rows.length > 1 ? del : null));
  });
}
function markCustom() { S.preset = 'custom'; $('preset').value = 'custom'; $('preset-note').textContent = 'Custom figures.'; return 'custom'; }

function syncInputs() {
  $('preset').value = S.preset;
  $('die').value = S.die ?? ''; $('bw').value = S.bw ?? '';
  $('dc').checked = S.dc; $('d5design').checked = S.d5design;
  setSeg('form', S.form); setSeg('origin', S.origin); setSeg('ship', S.ship);
  $('dest').value = S.dest; $('enduser').value = S.endUser; $('hq').checked = S.hq; $('certs').checked = S.certs;
  setSeg('rules', S.rules); $('ushq').value = S.usHq; $('dcuse').value = S.dcUse;
  $('enduse').value = S.endUse; $('fn').value = S.fn; $('oeccn').value = S.oeccn; $('foundry').value = S.foundry; $('node').value = S.node; $('dm').value = S.dm;
  const p = presetObj();
  const note = $('preset-note'); note.textContent = '';
  if (p) {
    if (p.note) note.appendChild(document.createTextNode(p.note + ' '));
    if (p.derived) note.appendChild(document.createTextNode(p.derived + ' '));
    p.src.forEach((s, i) => { if (i) note.appendChild(document.createTextNode(' · ')); note.appendChild(link(s)); });
  } else note.textContent = 'Custom figures.';
  renderRows();
}

function setSeg(id, v) { $(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v ? 'true' : 'false')); }
function bindSeg(id, key) {
  $(id).querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S[key] = b.dataset.v; setSeg(id, S[key]); update(); }));
}

// ---------- compute + render ----------
function currentChip() {
  const p = presetObj();
  const best = tppOf(S.rows);
  const tpp = best ? best.tpp : null;
  return { name: p ? p.name : 'Custom chip', tpp, best, pd: pdOf(tpp, S.die), datacenter: S.dc, dramBw: S.bw, form: S.form, designerD5: S.d5design, override: S.form === 'hbm' ? undefined : p?.override };
}

function update() {
  const chip = currentChip();
  // row readouts
  document.querySelectorAll('#rows .row').forEach((row, i) => {
    const r = S.rows[i]; const v = r && r.tops > 0 ? r.tops * r.bits : null;
    row.querySelector('.rowtpp').textContent = v ? `= ${fmt(v)}` : '';
  });
  $('ro-tpp').textContent = chip.override ? 'n/a' : fmt(chip.tpp);
  $('ro-tpp-sub').textContent = chip.best ? `${fmt(chip.best.tops)} × ${chip.best.bits}-bit${chip.best.label ? ` (${chip.best.label})` : ''}` : '';
  $('ro-pd').textContent = chip.override ? 'n/a' : chip.pd == null ? 'needs die area' : chip.pd.toFixed(2);
  let clsTxt = '–', clsSub = '';
  if (S.form === 'hbm') { clsTxt = '3A090.c'; clsSub = 'HBM; TPP does not apply'; }
  else if (chip.override === 'h20') { clsTxt = 'Not computable'; clsSub = 'no published figures'; }
  else if (chip.override === 'prc3a090') { clsTxt = '3A090 (per BIS)'; clsSub = 'paragraph not stated'; }
  else if (chip.tpp > 0) {
    const c = classify(chip);
    const ec = S.form === 'computer' ? '4A090' : '3A090';
    clsTxt = c.para === 'a' || c.para === 'b' ? `${ec}.${c.para}` : c.para === 'none' ? `Not ${ec}` : 'Undetermined';
    clsSub = c.clause && c.para !== 'none' ? `3A090.${c.clause}` : c.clause;
  }
  $('ro-cls').textContent = clsTxt; $('ro-cls-sub').textContent = clsSub;

  // destination groups line
  const g = groupsOf(S.dest);
  $('dest-groups').textContent = (S.dest === 'Hong Kong' ? 'Treated as China under the EAR. ' : '') +
    (g.length ? `Country Groups: ${g.join(', ')}` : 'Not in A:5, A:6, D:1, D:4, D:5, E:1 or E:2.');
  $('certs-wrap').hidden = !(['China (PRC)', 'Hong Kong', 'Macau'].includes(S.dest));
  const ak = S.rules === 'ak50';
  document.body.classList.toggle('mode-ak50', ak);
  // § 744.23(d)(2) matters for the (a)(1), (a)(2) and (a)(3)(i)(C) license paths; the U.S.-only AK50 exclusion for the five countries.
  $('ushq-wrap').hidden = !(S.endUse !== 'none' || (ak && (AK50_FIVE.includes(S.dest) || (S.foundry === 'unapproved' && S.form === 'ic'))));
  $('dcuse-wrap').hidden = !ak;
  $('fn-wrap').hidden = S.endUser !== 'entity';
  $('oeccn-wrap').hidden = !(S.endUse === 'supercomputer' || S.endUser === 'meu');
  $('dm-wrap').hidden = S.origin !== 'dm';
  $('foundry-wrap').hidden = S.form !== 'ic';
  $('node-wrap').hidden = !(S.form === 'ic' && S.foundry === 'unapproved');

  // decision
  const inp = { chip, origin: S.origin, shipFrom: S.ship, dest: S.dest, hqD5: S.hq, endUser: S.endUser, certs: S.certs, usHq: S.usHq, dc: S.dcUse,
    endUse: S.endUse, fn: S.fn, otherEccn: S.oeccn, foundry: S.foundry, node: S.node, dm: S.dm };
  const r = decide({ ...inp, rules: S.rules });
  const cmp = compareRules(inp);
  $('out-rules').textContent = ak ? (IN_FORCE ? 'Under the rules in force from 19 Nov 2026 (RIN 0694-AK50)' : 'Under RIN 0694-AK50, effective 19 Nov 2026')
    : (IN_FORCE ? 'Under the rules before 19 Nov 2026' : 'Under current rules');
  const ch = $('out-change');
  // Both rule sets are always compared, so Simple shows what 19 Nov 2026 changes without a trip to Full detail.
  ch.hidden = false;
  ch.textContent = ak ? (cmp.changed ? `Differs from the earlier text: ${cmp.summary}` : 'Same outcome as under the earlier text.')
    : (cmp.changed ? `${IN_FORCE ? 'Under the rules in force from 19 Nov 2026' : 'From 19 Nov 2026 (RIN 0694-AK50)'}: ${OUTCOMES[cmp.nw.outcome].label.toLowerCase()}.`
      : `Same result under ${IN_FORCE ? 'the rules in force from 19 Nov 2026' : 'the rule effective 19 Nov 2026 (RIN 0694-AK50)'}.`);
  const o = OUTCOMES[r.outcome];
  const box = $('outcome');
  box.dataset.s = o.s === 'neutral' ? '' : o.s;
  box.dataset.o = r.outcome;
  $('out-title').textContent = r.title;
  $('out-detail').textContent = r.detail;
  const p = presetObj();
  const ov = !!(p && p.override) && S.form !== 'hbm';
  // Presets with no published figures (H20, Ascend 910B/C/D): Simple shows the whole outcome text and the preset's own note.
  const reason = ov ? r.detail : reasonLine(r.detail, r.title);
  $('out-reason').textContent = reason;
  // For those presets, when the decisive step clears the case (e.g. the H20 notice does not cover this destination), say why.
  const last = r.steps[r.steps.length - 1];
  const why = ov && last && last.verdict === 'pass' ? last.text : '';
  $('out-why').textContent = why; $('out-why').hidden = !why;
  const on = $('out-note'); on.textContent = '';
  if (ov && p.note) { on.appendChild(document.createTextNode(p.note + ' ')); p.src.forEach((c, i) => { if (i) on.appendChild(document.createTextNode(' · ')); on.appendChild(link(c)); }); }
  on.hidden = !on.textContent;
  if (ov && S.preset !== lastOv) $('steps-disc').open = true;
  lastOv = ov ? S.preset : null;
  const gl = glossFor([r.title, reason, why, ov ? p.note : ''].join(' '));
  $('out-gloss').textContent = gl; $('out-gloss').hidden = !gl;
  $('out-bar-t').textContent = r.title;
  const chipTxt = ak ? (IN_FORCE ? 'Rules: in force from 19 Nov 2026' : 'Rules: from 19 Nov 2026 (not yet in effect)')
    : (IN_FORCE ? 'Rules: before 19 Nov 2026 (earlier text)' : 'Rules: before 19 Nov 2026');
  $('rules-chip-txt').textContent = chipTxt;
  $('rules-chip').classList.toggle('alt', S.rules !== DEFAULT_RULES);
  $('rules-chip-btn').textContent = ak ? 'Show the earlier rules' : `Show the ${IN_FORCE ? 'rules in force' : '19 Nov 2026 rule'}`;
  $('assume').textContent = assumeLine();
  $('out-intricate').hidden = !r.intricate;
  const oc = $('out-cites'); oc.textContent = '';
  (r.cites || []).forEach((c, i) => { if (i) oc.appendChild(document.createTextNode(' · ')); oc.appendChild(link(c)); });

  $('steps-disc').querySelector('summary').textContent = `Show the ${r.steps.length} steps, with CFR citations`;
  const walk = $('walk'); walk.textContent = '';
  r.steps.forEach(s => {
    walk.appendChild(h('li', { class: `step v-${s.verdict}` },
      h('div', { class: 'st-head' }, h('span', { class: 'st-n', text: String(s.n) }), h('h3', { text: s.title }), s.flag ? h('span', { class: 'st-flag', text: s.flag }) : null),
      h('p', { text: s.text }),
      h('p', { class: 'st-cites' }, s.cites.flatMap((c, i) => i ? [document.createTextNode(' · '), link(c)] : [link(c)]))));
  });

  drawChart($('chart'), {
    presets: CHIPS.filter(c => !c.override).map(c => { const b = tppOf(c.rows); const t = b ? b.tpp : null; return { id: c.id, name: c.name, short: SHORT[c.id], left: c.id === 'rtx4080' || c.id === 'ascend910', below: c.id === 'ascend910', tpp: t, pd: pdOf(t, c.dieMm2), datacenter: c.datacenter }; }),
    current: chip.override ? null : chip,
    onPick: (id) => { loadPreset(id); syncInputs(); update(); },
  });
  writeHash();
}

// ---------- simple mode helpers ----------
let lastOv = null;
const ORIGIN_TXT = { us: 'made in the U.S.', fdp: 'made abroad with U.S. technology', dm: 'made abroad with U.S.-origin parts inside', foreign: 'made abroad with no known U.S. nexus' };
const ENDUSE_TXT = { none: 'no known supercomputer or advanced-node fab end use', supercomputer: 'for a supercomputer in D:5 or Macau', fab: 'for an advanced-node fab in D:5 or Macau' };
function assumeLine() {
  const parts = [ORIGIN_TXT[S.origin], S.origin === 'dm' || S.ship !== 'us' ? 'reexported from abroad' : 'shipped from the U.S.',
    S.hq ? 'end user headquartered in an arms-embargoed country (D:5, incl. China) or Macau' : 'end user not headquartered in an arms-embargoed country (D:5, incl. China) or Macau', ENDUSE_TXT[S.endUse]];
  // Name any other Full-only input that is off its default, so Simple never hides a choice that changes the result.
  if (S.form === 'computer') parts.push('a server or board (4A090)');
  if (S.form === 'hbm') parts.push('an HBM stack (3A090.c)');
  if (S.foundry !== 'no' && S.form === 'ic') parts.push('shipped by a fab or OSAT for an unapproved designer');
  if (S.origin === 'dm' && S.dm === 'under') parts.push('U.S. content at or below de minimis');
  if (S.endUser === 'entity' && S.fn !== 'none') parts.push(`Entity List ${S.fn.replace('fn', 'footnote ')}`);
  if (S.rules === 'ak50' && S.dcUse !== 'no') parts.push(S.dcUse === 'yes' ? 'going to a data center covered by § 744.24' : 'a § 744.24 data center, recommender use only');
  if (S.usHq !== 'no' && !$('ushq-wrap').hidden) parts.push(S.usHq === 'us' ? 'U.S.-headquartered end user' : 'A:5- or A:6-headquartered end user');
  if (!S.certs && !$('certs-wrap').hidden) parts.push('Jan. 2026 certifications not available');
  return `Assumes ${parts.join(', ')}. Change these in Full detail.`;
}

// ---------- detail level ----------
function setDetail(v, save) {
  const full = v === 'full';
  document.body.classList.toggle('detail-full', full);
  document.body.classList.toggle('detail-simple', !full);
  setSeg('detail', full ? 'full' : 'simple');
  $('steps-disc').open = full;
  if (save) { try { localStorage.setItem('et-detail', full ? 'full' : 'simple'); } catch (e) { /* storage unavailable */ } }
}
function storedDetail() { try { return localStorage.getItem('et-detail') === 'full' ? 'full' : 'simple'; } catch (e) { return 'simple'; } }
$('detail').querySelectorAll('button').forEach(b => b.addEventListener('click', () => setDetail(b.dataset.v, true)));

// ---------- hash state ----------
function writeHash() {
  const p = new URLSearchParams();
  p.set('c', S.preset);
  if (S.preset === 'custom') {
    p.set('r', S.rows.filter(r => r.tops > 0).map(r => `${r.bits}:${r.tops}`).join(','));
    if (S.die) p.set('die', S.die); if (S.bw) p.set('bw', S.bw);
    p.set('dc', S.dc ? 1 : 0); if (S.d5design) p.set('p', 1);
  }
  p.set('f', S.form); p.set('d', S.dest); p.set('u', S.endUser); p.set('hq', S.hq ? 1 : 0);
  p.set('o', S.origin); p.set('s', S.ship); p.set('k', S.certs ? 1 : 0);
  if (S.rules !== DEFAULT_RULES) p.set('rs', S.rules);
  if (S.rules === 'ak50') p.set('dcu', S.dcUse);
  if (S.usHq !== 'no') p.set('us', S.usHq === 'us' ? 1 : 'a56');
  if (S.endUse !== 'none') p.set('eu', S.endUse);
  if ((S.endUse === 'supercomputer' || S.endUser === 'meu') && S.oeccn !== 'unknown') p.set('oe', S.oeccn);
  if (S.endUser === 'entity' && S.fn !== 'none') p.set('fn', S.fn);
  if (S.foundry !== 'no') p.set('fy', S.foundry);
  if (S.foundry !== 'no' && S.node !== 'yes') p.set('nd', S.node);
  if (S.origin === 'dm') p.set('dm', S.dm);
  const tab = document.querySelector('[role="tab"][aria-selected="true"]');
  if (tab && tab.id !== 'tab-check') p.set('v', tab.id.replace('tab-', ''));
  try { history.replaceState(null, '', '#' + p.toString()); } catch (e) { /* ignore */ }
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (!p.has('c')) { loadPreset(S.preset); return null; }
  const c = p.get('c');
  if (c === 'custom') {
    S.preset = 'custom';
    S.rows = (p.get('r') || '').split(',').filter(Boolean).map(x => { const [b, t] = x.split(':'); return { bits: +b, tops: num(t), label: '' }; });
    if (!S.rows.length) S.rows = [{ bits: 8, tops: null, label: '' }];
    S.dc = p.get('dc') !== '0'; S.d5design = p.get('p') === '1';
  } else if (CHIPS.some(x => x.id === c)) loadPreset(c); else loadPreset(S.preset);
  if (p.has('die')) S.die = num(p.get('die'));
  if (p.has('bw')) S.bw = num(p.get('bw'));
  if (['ic', 'computer', 'hbm'].includes(p.get('f'))) S.form = p.get('f');
  if (DESTS.includes(p.get('d'))) S.dest = p.get('d');
  if (['commercial', 'cloud', 'entity', 'meu', 'mieu', 'uaeok', 'veu'].includes(p.get('u'))) S.endUser = p.get('u');
  if (p.has('hq')) S.hq = p.get('hq') === '1';
  if (['us', 'fdp', 'dm', 'foreign'].includes(p.get('o'))) S.origin = p.get('o');
  if (['us', 'abroad'].includes(p.get('s'))) S.ship = p.get('s');
  if (p.has('k')) S.certs = p.get('k') === '1';
  if (['ak50', 'current'].includes(p.get('rs'))) S.rules = p.get('rs');
  if (['no', 'yes', 'recommender'].includes(p.get('dcu'))) S.dcUse = p.get('dcu');
  S.usHq = p.get('us') === '1' ? 'us' : p.get('us') === 'a56' ? 'a56' : 'no';
  if (['supercomputer', 'fab'].includes(p.get('eu'))) S.endUse = p.get('eu');
  if (['listed', 'listed741', 'ear99'].includes(p.get('oe'))) S.oeccn = p.get('oe');
  if (['fn1', 'fn4', 'fn5'].includes(p.get('fn'))) S.fn = p.get('fn');
  if (p.get('fy') === 'unapproved') S.foundry = 'unapproved';
  if (p.get('nd') === 'no') S.node = 'no';
  if (['over', 'under'].includes(p.get('dm'))) S.dm = p.get('dm');
  return p.get('v');
}

// ---------- tabs ----------
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab, focus) {
  tabs.forEach(t => {
    const on = t === tab;
    t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
    $(t.getAttribute('aria-controls')).hidden = !on;
  });
  if (focus) tab.focus();
  writeHash();
  syncBar();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', e => {
    let j = null;
    if (e.key === 'ArrowRight') j = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = tabs.length - 1;
    if (j !== null) { e.preventDefault(); selectTab(tabs[j], true); }
  });
});

// ---------- timeline + sources ----------
const KIND = { issued: 'Rule issued', amended: 'Rule amended', suspended: 'Rule suspended', related: 'Related action', guidance: 'Guidance', licensing: 'Licensing decision' };
const KGROUP = { issued: 'rule', amended: 'rule', suspended: 'rule', related: 'rule', guidance: 'guidance', licensing: 'licensing' };
function fmtDate(d) {
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p = d.split('-');
  return p.length === 2 ? `${m[+p[1] - 1]} ${p[0]}` : `${+p[2]} ${m[+p[1] - 1]} ${p[0]}`;
}
function renderTimeline(filter = 'all') {
  const box = $('timeline'); box.textContent = '';
  let year = null, list = null;
  TIMELINE.filter(e => filter === 'all' || KGROUP[e.kind] === filter).forEach(e => {
    const y = e.date.slice(0, 4);
    if (y !== year) { year = y; box.appendChild(h('h3', { class: 'tl-year', text: y })); list = h('ol', { class: 'tl' }); box.appendChild(list); }
    list.appendChild(h('li', { class: `k-${KGROUP[e.kind]}` },
      h('time', { datetime: e.date, text: fmtDate(e.date) }),
      h('div', {}, h('span', { class: 'kind', text: KIND[e.kind] }), h('strong', { text: e.title }), h('p', { text: e.text }), h('p', { class: 'st-cites' }, link(e.src)))));
  });
}
$('tl-filter').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
  $('tl-filter').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  renderTimeline(b.dataset.k);
}));
function renderSources() {
  const ul = $('srclist');
  SOURCES.forEach(g => ul.appendChild(h('li', {}, h('strong', { text: g.group }), h('ul', {}, g.items.map(([l, u]) => h('li', {}, h('a', { href: u, target: '_blank', rel: 'noopener', text: l })))))));
}

// ---------- init ----------
const dsel = $('dest');
DESTS.forEach(d => dsel.appendChild(h('option', { value: d, text: d })));
renderPresetSelect();
const view = readHash();
// A deep link to an input that lives only in Full detail opens Full detail. The rule set can be switched in Simple.
const fullOnlyLink = S.endUse !== 'none' || S.foundry !== 'no' || S.origin === 'dm' || S.form === 'hbm' || (S.endUser === 'entity' && S.fn !== 'none') || (S.endUser === 'meu' && S.oeccn !== 'unknown') || S.usHq !== 'no';
setDetail(fullOnlyLink ? 'full' : storedDetail(), false);
// Rule-set switch labels depend on the date: before 19 Nov 2026 AK50 is the toggle; from then on, the earlier text is.
$('rules').querySelector('[data-v="current"]').textContent = LABELS.current;
$('rules').querySelector('[data-v="ak50"]').textContent = LABELS.ak50;
syncInputs();
dsel.addEventListener('change', () => { S.dest = dsel.value; update(); });
$('enduser').addEventListener('change', e => { S.endUser = e.target.value; update(); });
$('hq').addEventListener('change', e => { S.hq = e.target.checked; update(); });
$('certs').addEventListener('change', e => { S.certs = e.target.checked; update(); });
$('ushq').addEventListener('change', e => { S.usHq = e.target.value; update(); });
$('dcuse').addEventListener('change', e => { S.dcUse = e.target.value; update(); });
$('enduse').addEventListener('change', e => { S.endUse = e.target.value; update(); });
$('fn').addEventListener('change', e => { S.fn = e.target.value; update(); });
$('oeccn').addEventListener('change', e => { S.oeccn = e.target.value; update(); });
$('foundry').addEventListener('change', e => { S.foundry = e.target.value; update(); });
$('node').addEventListener('change', e => { S.node = e.target.value; update(); });
$('dm').addEventListener('change', e => { S.dm = e.target.value; update(); });
$('dc').addEventListener('change', e => { S.dc = e.target.checked; markCustomIfPreset(); update(); });
$('d5design').addEventListener('change', e => { S.d5design = e.target.checked; markCustomIfPreset(); update(); });
$('die').addEventListener('input', e => { S.die = num(e.target.value); markCustomIfPreset(); update(); });
$('bw').addEventListener('input', e => { S.bw = num(e.target.value); markCustomIfPreset(); update(); });
$('add-row').addEventListener('click', () => { S.rows.push({ bits: 8, tops: null, label: '' }); markCustom(); renderRows(); update(); $(`r${S.rows.length - 1}-t`).focus(); });
function markCustomIfPreset() { if (S.preset !== 'custom') { markCustom(); renderRows(); } }
bindSeg('rules', 'rules'); bindSeg('form', 'form'); bindSeg('origin', 'origin'); bindSeg('ship', 'ship');
// The rule-set switch works in place in Simple mode: no jump to Full detail, no scroll.
$('rules-chip-btn').addEventListener('click', () => { S.rules = S.rules === 'ak50' ? 'current' : 'ak50'; setSeg('rules', S.rules); update(); });
$('copy-link').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy-msg').textContent = 'Link copied.'; }
  catch (e) { $('copy-msg').textContent = 'Copy the address bar to share this case.'; }
});
// Phone: a small bar shows the outcome while the outcome box is still below the screen.
const PHONE = matchMedia('(max-width: 640px)');
let outBelow = false;
function syncBar() { $('out-bar').hidden = !(PHONE.matches && outBelow && !$('view-check').hidden); }
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => { outBelow = !e.isIntersecting && e.boundingClientRect.top > 0; syncBar(); }).observe($('outcome'));
}
PHONE.addEventListener('change', syncBar);
$('out-bar-go').addEventListener('click', () => {
  $('outcome').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  $('outcome').focus({ preventScroll: true });
});
// Phone, Full detail: the long note on the 19 Nov 2026 rule starts collapsed.
if (PHONE.matches) $('rules-more').open = false;
renderTimeline(); renderSources();
update();
if (view) { const t = tabs.find(x => x.id === `tab-${view}`); if (t) selectTab(t); }
let rz = null;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(update, 150); });
