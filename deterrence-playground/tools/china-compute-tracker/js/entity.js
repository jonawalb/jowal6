// Entity List view: PRC entries added per Federal Register rule, stacked by sector.
import { EL_RULES, SECTORS, SEC_COL, esc, fmtDate, yr, svgEl, keyable, AS_OF } from './common.js';

const SEC_KEYS = SECTORS.map(s => s.k);
export const ruleCount = (r, secs) => secs.reduce((a, k) => a + (r.bySector[k] || 0), 0);
const isCN = c => c.startsWith('CHINA');

export function renderEntity(root, S, { onPick, set, tip }) {
  const rules = EL_RULES.filter(r => ruleCount(r, S.secs) > 0 || (S.other && r.cn > r.cnRel));
  const tot = EL_RULES.reduce((a, r) => a + ruleCount(r, S.secs), 0);
  const hk = EL_RULES.reduce((a, r) => a + r.entities.filter(e => isCN(e.c) && e.s && S.secs.includes(e.s) && e.hk).length, 0);
  const third = EL_RULES.reduce((a, r) => a + r.entities.filter(e => !isCN(e.c) && e.s && S.secs.includes(e.s)).length, 0);
  const last = [...EL_RULES].filter(r => ruleCount(r, S.secs) > 0).sort((a, b) => b.date.localeCompare(a.date))[0];
  root.innerHTML = `
    <div class="card"><p class="eyebrow">Sectors counted</p>
      <div class="gchips" role="group" aria-label="Sectors">${SECTORS.map(s => `<button type="button" class="gchip" data-k="${s.k}" aria-pressed="${S.secs.includes(s.k)}" title="${esc(s.d)}"><i style="background:${SEC_COL[s.k]}"></i>${esc(s.n)}</button>`).join('')}</div>
      <label class="tg mt-s"><input type="checkbox" id="oth" ${S.other ? 'checked' : ''}><span class="sw"></span><span class="t">Show other PRC entries in the same rules<small>entries added for other reasons (Russia supply, hypersonics, quantum, Iran)</small></span></label>
    </div>
    <div class="stat-row">
      <div class="stat"><p class="big">${tot}</p><p>PRC entries added in these sectors, ${esc(fmtDate('2022-10-01'))} to ${esc(fmtDate(AS_OF))}</p></div>
      <div class="stat"><p class="big">${hk}</p><p>of them list a Hong Kong address (BIS lists these under China; some also list mainland addresses)</p></div>
      <div class="stat"><p class="big">${third}</p><p>related entries in other countries (Japan, Korea, Singapore, Taiwan)</p></div>
      <div class="stat"><p class="big">${last ? esc(fmtDate(last.date)) : '–'}</p><p>last rule adding PRC entries in these sectors</p></div>
    </div>
    <div class="card chartcard"><div class="chart-h"><p class="eyebrow">PRC entries added per rule, counting only the sectors selected</p><p class="fine">${rules.length} rules shown · click a bar</p></div>
      <ul class="keyrow">${SECTORS.filter(s => S.secs.includes(s.k)).map(s => `<li><span class="sw-i s-${s.k}"></span>${esc(s.n)}</li>`).join('')}${S.other ? '<li><span class="sw-i s-other"></span>Other PRC entries</li>' : ''}</ul>
      <div class="chartbox"><svg id="elc" class="chart el" role="group" aria-label="Bar chart of PRC Entity List entries per rule"></svg></div>
      <p class="warnline">No Federal Register rule from Oct. 10, 2025 through ${esc(fmtDate(AS_OF))} added PRC entities to the Entity List. The Entity List rules in that period only removed entries or addresses (FR Docs. 2025-19858, 2026-17230, 2026-17231); others changed the affiliates rule (see Timeline).</p>
    </div>
    <div class="card"><p class="eyebrow">Rules, newest first</p><ol class="list" id="rl"></ol></div>`;
  root.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => {
    const k = b.dataset.k, on = S.secs.includes(k);
    if (on && S.secs.length === 1) return;
    set({ secs: on ? S.secs.filter(x => x !== k) : SEC_KEYS.filter(x => x === k || S.secs.includes(x)) });
  }; });
  root.querySelector('#oth').onchange = e => set({ other: e.target.checked });
  drawBars(root.querySelector('#elc'), rules, S, { onPick, tip });
  const rl = root.querySelector('#rl');
  rl.innerHTML = [...rules].sort((a, b) => b.date.localeCompare(a.date)).map(r => `<li class="it${S.sel === 'r:' + r.doc ? ' on' : ''}"><button type="button" data-id="r:${esc(r.doc)}">
    <span class="it-d">${esc(fmtDate(r.date))}</span><span class="it-t">${esc(r.title)} <span class="fine">${esc(r.cite)}</span></span>
    <span class="it-a"><b>${ruleCount(r, S.secs)}</b> <span class="fine">tracked · ${r.cn} PRC · ${r.total} total</span></span></button></li>`).join('');
  rl.querySelectorAll('[data-id]').forEach(b => { b.onclick = () => onPick(b.dataset.id, true); });
}

function drawBars(svg, rules, S, { onPick, tip }) {
  const W = Math.max(300, svg.parentElement.clientWidth || 700);
  const L = 36, R = 10, T = 16, B = 24, H = 250;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const x0 = 2022.7, x1 = 2027.0;
  const X = v => L + (v - x0) / (x1 - x0) * (W - L - R);
  const val = r => ruleCount(r, S.secs) + (S.other ? r.cn - r.cnRel : 0);
  const max = Math.max(10, ...rules.map(val));
  const Y = v => H - B - v / max * (H - B - T);
  const step = max > 100 ? 50 : max > 40 ? 20 : 10;
  for (let v = 0; v <= max; v += step) {
    svgEl('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: 'grid' }, svg);
    svgEl('text', { x: L - 6, y: Y(v) + 4, 'text-anchor': 'end', class: 'ax-t' }, svg, String(v));
  }
  for (let y = 2023; y <= 2026; y++) svgEl('text', { x: X(y), y: H - 6, 'text-anchor': 'middle', class: 'ax-t' }, svg, String(y));
  const bw = Math.max(6, Math.min(16, (W - L - R) / 60));
  const sameDay = {};
  let lastLx = -99;
  for (const r of [...rules].sort((a, b) => a.date.localeCompare(b.date) || a.doc.localeCompare(b.doc))) {
    const k = sameDay[r.date] = (sameDay[r.date] || 0) + 1;
    const cx = X(yr(r.date)) + (k - 1) * (bw + 2);
    const g = svgEl('g', { class: `bar${S.sel === 'r:' + r.doc ? ' sel' : ''}` }, svg);
    let acc = 0;
    const parts = [...S.secs.map(s => [s, r.bySector[s] || 0]), ...(S.other ? [['other', r.cn - r.cnRel]] : [])];
    for (const [s, n] of parts) {
      if (!n) continue;
      svgEl('rect', { x: cx - bw / 2, y: Y(acc + n), width: bw, height: Y(acc) - Y(acc + n), style: `fill:${SEC_COL[s]}` }, g);
      acc += n;
    }
    svgEl('rect', { x: cx - bw / 2 - 2, y: Y(acc) - 2, width: bw + 4, height: Y(0) - Y(acc) + 2, fill: 'transparent' }, g);
    if (cx - lastLx > 8 + String(acc).length * 7) { svgEl('text', { x: cx, y: Y(acc) - 4, 'text-anchor': 'middle', class: 'lbl' }, svg, String(acc)); lastLx = cx; }
    keyable(g, `${fmtDate(r.date)}: ${r.title}, ${acc} PRC entries counted`, () => onPick('r:' + r.doc, true));
    g.addEventListener('mousemove', e => tip(e, `<b>${esc(fmtDate(r.date))}</b> · ${esc(r.cite)}<br>${esc(r.title)}<br>${parts.filter(p => p[1]).map(([s, n]) => `${n} ${s === 'other' ? 'other' : esc(SECTORS.find(x => x.k === s).n.toLowerCase())}`).join(', ')}`));
    g.addEventListener('mouseleave', () => tip(null));
  }
}

export function ruleDetail(r) {
  const groups = {};
  for (const e of r.entities) {
    const k = e.s || 'other';
    (groups[k] = groups[k] || []).push(e);
  }
  const order = [...SECTORS.map(s => s.k), 'other'];
  const check = r.countCheck === 'match' ? `Table count matches the rule's stated total (${r.stated}).`
    : r.stated == null ? 'The rule states no single total; counts come from its table.'
    : `The rule's summary says ${r.stated} entities; its table has ${r.total} new entries. Entries exceed entities when one entity is listed under more than one destination or with separate addresses.`;
  return `<p class="eyebrow">Entity List rule · ${esc(r.cite)}</p>
    <h3 class="d-h">${esc(r.title)}</h3>
    <p class="d-meta">Published ${esc(fmtDate(r.date))} · FR Doc. ${esc(r.doc)}</p>
    <div class="d-lv"><p><b>${r.cnRel}</b> PRC entries in tracked sectors${r.hkRel ? ` (${r.hkRel} with a Hong Kong address)` : ''}; ${r.cn} PRC entries and ${r.total} new entries in all.</p><p class="fine">${esc(check)}</p></div>
    ${order.filter(k => groups[k]).map(k => {
      const s = SECTORS.find(x => x.k === k);
      const why = [...new Set(groups[k].map(e => e.why).filter(Boolean))];
      return `<p class="eyebrow"><span class="sw-i s-${k}"></span>${esc(s ? s.n : 'Other reasons (not counted)')} · ${groups[k].length}</p>
        ${why.map(w => `<p class="fine">${esc(w)}</p>`).join('')}
        <ol class="ent-list">${groups[k].map(e => `<li>${esc(e.n)}${isCN(e.c) ? (e.hk ? ' <span class="fine">(Hong Kong address)</span>' : '') : ` <span class="fine">(${esc(e.c.charAt(0) + e.c.slice(1).toLowerCase())})</span>`}</li>`).join('')}</ol>`;
    }).join('')}
    <p class="fine">Sector tags are this tool's coding of the reason the rule gives for each group (paraphrased above). Names are as printed in the rule's table, first name only; aliases and addresses are in the rule.</p>
    <p class="eyebrow">Source</p><ol class="d-src"><li><a href="${esc(r.url)}" target="_blank" rel="noopener">Federal Register, ${esc(r.cite)}</a></li><li><a href="${esc(r.pdf)}" target="_blank" rel="noopener">Official PDF (govinfo)</a></li></ol>`;
}
