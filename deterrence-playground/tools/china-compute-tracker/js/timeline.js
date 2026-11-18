// Joined timeline: rule changes, Entity List additions, cases and estimates on one axis.
import { POLICY, EL_RULES, CASES, ESTIMATES, METRICS, GRADE_COL, esc, fmtDate, yr, svgEl, keyable, statusClass, clip } from './common.js';
import { ruleCount } from './entity.js';

export const LANES = [
  { k: 'policy', n: 'Rules & licensing', col: 'var(--ink)' },
  { k: 'ctx', n: 'Other events', col: 'var(--muted)' },
  { k: 'el', n: 'Entity List', col: 'var(--c2)' },
  { k: 'case', n: 'Cases', col: 'var(--bad)' },
  { k: 'est', n: 'Estimates', col: 'var(--c4)' },
];

export const isRule = p => !p.k || /^License/.test(p.k);

export function timelineItems(S) {
  const out = [];
  // U.S. rules, BIS guidance and licensing decisions go in the rules lane; bills, PRC actions, company roadmaps,
  // reports and announcements (entries with a `k` label other than a license step) go in "Other events".
  for (const p of POLICY) out.push({ lane: isRule(p) ? 'policy' : 'ctx', id: 'p:' + p.id, d: p.date, t: p.t });
  for (const r of EL_RULES) { const n = ruleCount(r, S.secs); if (n) out.push({ lane: 'el', id: 'r:' + r.doc, d: r.date, t: `${n} PRC entries added (${r.cite})`, n }); }
  for (const c of CASES) out.push({ lane: 'case', id: 'c:' + c.id, d: c.date, t: c.title, st: statusClass(c.status).k });
  const seen = new Set();
  for (const e of ESTIMATES) if (S.grades.includes(e.grade) && (S.rep || !e.repeats) && e.date && !seen.has(e.metric + e.source + e.date) && seen.add(e.metric + e.source + e.date)) out.push({ lane: 'est', id: 'e:' + e.id, d: e.date, t: `${METRICS.find(m => m.id === e.metric)?.name || e.metric}: ${e.source}`, g: e.grade });
  return out.filter(i => i.d >= '2022-10-01').sort((a, b) => a.d.localeCompare(b.d));
}

/** Items matching a search, title matches first, then newest first. Empty query returns null. */
export function searchTimeline(items, q) {
  q = (q || '').trim().toLowerCase();
  if (!q) return null;
  const lane = it => LANES.find(l => l.k === it.lane).n;
  const hit = it => [it.t, fmtDate(it.d), lane(it)].some(v => v.toLowerCase().includes(q));
  const rank = it => (it.t.toLowerCase().includes(q) ? 0 : 1);
  return items.filter(hit).sort((a, b) => rank(a) - rank(b) || b.d.localeCompare(a.d));
}

export function renderTimeline(root, S, { onPick, tip, set, rerender }) {
  const all = timelineItems(S);
  const hits = searchTimeline(all, S.tq);
  const items = hits ? [...hits].sort((a, b) => a.d.localeCompare(b.d)) : all;
  root.innerHTML = `<div class="card chartcard"><div class="chart-h"><p class="eyebrow">Controls, listings, cases and estimates, Oct. 2022 to Nov. 2026</p><p class="fine">${items.length} items · estimates follow your grade filter</p></div>
    <div class="chartbox"><svg id="tlc" class="chart tl" role="group" aria-label="Timeline. Use the list below to reach every item by keyboard."></svg></div></div>
    <div class="card"><div class="row qrow"><label class="vh" for="tq">Search the timeline</label><input id="tq" class="search" type="search" placeholder="Search: H20, Huawei, Malaysia, Entity List" value="${esc(S.tq || '')}" autocomplete="off"></div>
      <p class="eyebrow">${hits ? `${hits.length} of ${all.length} items match, best matches first` : 'All items, newest first'}</p><ol class="list" id="tll"></ol></div>`;
  let qt; root.querySelector('#tq').oninput = e => { clearTimeout(qt); qt = setTimeout(() => { set({ tq: e.target.value }); const i = document.getElementById('tq'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); };
  const svg = root.querySelector('#tlc');
  const W = Math.max(300, svg.parentElement.clientWidth || 700);
  const narrow = W < 560;
  const L = narrow ? 70 : 104, R = 10, T = 10, LH = 40, B = 24;
  const H = T + LANES.length * LH + B;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const x0 = 2022.7, x1 = 2027.0;
  const X = v => L + (v - x0) / (x1 - x0) * (W - L - R);
  LANES.forEach((l, i) => {
    const y = T + i * LH;
    svgEl('rect', { x: L, y: y + 3, width: W - L - R, height: LH - 6, class: 'lane', rx: 3 }, svg);
    svgEl('text', { x: L - 8, y: y + LH / 2 + 4, 'text-anchor': 'end', class: 'lane-t' }, svg, narrow ? l.n.split(' ')[0] : l.n);
  });
  for (let y = 2023; y <= 2026; y++) {
    svgEl('line', { x1: X(y), x2: X(y), y1: T, y2: H - B, class: 'yr-l' }, svg);
    svgEl('text', { x: X(y), y: H - 6, 'text-anchor': 'middle', class: 'ax-t' }, svg, String(y));
  }
  for (const it of items) {
    const li = LANES.findIndex(l => l.k === it.lane);
    const cy = T + li * LH + LH / 2;
    const cx = X(yr(it.d));
    const col = it.lane === 'est' ? GRADE_COL[it.g] : LANES[li].col;
    const r = it.lane === 'el' ? Math.min(13, 4 + Math.sqrt(it.n)) : 5.5;
    const shape = it.lane === 'policy' || it.lane === 'ctx'
      ? svgEl('rect', { x: cx - 2, y: cy - 10, width: 4, height: 20, style: `fill:${col}`, class: `mk${S.sel === it.id ? ' sel' : ''}` }, svg)
      : svgEl('circle', { cx, cy, r, style: `fill:${col}${it.lane === 'case' && it.st === 'alleged' ? ';fill-opacity:.45' : ''}`, class: `mk${S.sel === it.id ? ' sel' : ''}` }, svg);
    keyable(shape, `${fmtDate(it.d)}: ${it.t}`, () => onPick(it.id, true));
    shape.addEventListener('mousemove', e => tip(e, `<b>${esc(fmtDate(it.d))}</b><br>${esc(it.t)}`));
    shape.addEventListener('mouseleave', () => tip(null));
  }
  const ll = root.querySelector('#tll');
  ll.innerHTML = (hits || [...items].reverse()).map(it => `<li class="it${S.sel === it.id ? ' on' : ''}"><button type="button" data-id="${esc(it.id)}"><span class="it-d">${esc(fmtDate(it.d))}</span>
    <span class="it-t">${esc(it.t)}</span><span class="it-a fine">${esc(LANES.find(l => l.k === it.lane).n)}</span></button></li>`).join('');
  ll.querySelectorAll('[data-id]').forEach(b => { b.onclick = () => onPick(b.dataset.id, true); });
  if (!hits) clip(ll, 'timeline', 8, 'items', rerender);
  else if (!hits.length) ll.innerHTML = '<li class="none">No item matches this search.</li>';
}

export function policyDetail(p) {
  return `<p class="eyebrow">${esc(p.k || 'Rule change')}</p><h3 class="d-h">${esc(p.t)}</h3><p class="d-meta">${esc(fmtDate(p.date))}</p><p>${esc(p.x)}</p>${p.st ? `<p class="fine">${esc(p.st)}</p>` : ''}
    <p class="eyebrow">Sources</p><ol class="d-src">${p.src.map(([n, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a></li>`).join('')}</ol>`;
}
