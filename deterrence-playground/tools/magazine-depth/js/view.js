// Magazine Depth: HTML and SVG painters. No game logic here; everything is read from the engine.
import { P, CLASSES, IDS, BY, COMPONENTS, CBY } from '../data/params.js';
import { lineCap, partnerCap, maxBuy, floorBuy, compCap, canDo, unitCost, stockNow, budget, capitalCost, buyCost, production, workLevel, isModern, secondActive, partnerActive } from './engine.js';

export const COL = { ad: 'var(--c1)', strike: 'var(--c2)', ship: 'var(--c3)', shell: 'var(--c4)', loiter: 'var(--c5)' };
const NS = 'http://www.w3.org/2000/svg';
const yr = t => P.startYear + t;
export const money = m => (Math.abs(m) >= 1000 ? `$${(m / 1000).toFixed(2)}bn` : Math.abs(m) < 10 && m % 1 ? `$${m.toFixed(2)}M` : `$${Math.round(m)}M`);
/** Quantity in the class's own unit, for people. */
export function qty(id, q) {
  const c = BY[id], n = Math.round(q);
  if (c.per === 1000) return `${n.toLocaleString('en-US')}k rounds`;
  if (c.per === 100) return `${(n * 100).toLocaleString('en-US')}`;
  return n.toLocaleString('en-US');
}
const kitNames = id => Object.keys(BY[id].kits).map(k => CBY[k].label.toLowerCase()).join(', ');
const pressed = (on, dis) => `aria-pressed="${on}"${dis ? ' disabled' : ''}`;

/* ---------- Peacetime ---------- */
export function linesHTML(s, d) {
  const t = s.year, eff = stockNow(s);
  return CLASSES.map(c => {
    const id = c.id, st = s.cls[id], mx = maxBuy(s, id), fl = floorBuy(s, id), q = d.buy[id];
    const pend = st.exp.filter(y => y + c.expand.lead > t).map(y => `+${c.expand.add}/yr in ${yr(y + c.expand.lead)}`);
    if (st.multi !== null && t < st.multi + P.multi.signal) pend.push(`suppliers grow the line in ${yr(st.multi + P.multi.signal)}`);
    if (st.coprod !== null && !partnerActive(s, id)) pend.push(`partner line from ${yr(st.coprod + P.coprod.lead)}`);
    if (st.modern_at !== null && t < st.modern_at) pend.push(`new type from ${yr(st.modern_at)}`);
    const opt = (kind, label, on, open) => `<button type="button" class="md-opt" data-opt="${kind}" data-id="${id}" ${pressed(on, !open && !on)}>${label}</button>`;
    const multiOn = st.multi !== null && t < st.multi + P.multi.years;
    return `<article class="md-line" style="--c:${COL[id]}">
      <h3>${c.label}${isModern(s, id) ? ' <span class="md-tag">new type</span>' : ''}</h3>
      <p class="md-stats"><span>Stock <b class="num">${qty(id, st.legacy + st.modern)}</b></span><span>War cover <b class="num">${(eff[id] / c.demand).toFixed(1)} wk</b></span><span>Line <b class="num">${qty(id, lineCap(s, id))}</b>/yr</span>${partnerCap(s, id) ? `<span>Partner <b class="num">${qty(id, partnerCap(s, id))}</b>/yr</span>` : ''}<span>Unit <b class="num">${money(unitCost(s, id))}</b></span></p>
      <div class="md-order"><label for="buy-${id}">Order</label>
        <input type="range" id="buy-${id}" data-buy="${id}" min="${fl}" max="${mx}" step="1" value="${q}" aria-valuetext="${qty(id, q)} of ${qty(id, mx)}">
        <output class="num" id="out-${id}">${qty(id, q)}</output></div>
      ${fl ? `<p class="fine">Multiyear contract: at least ${qty(id, fl)} this year.</p>` : ''}
      <div class="md-opts">
        ${opt('expand', `Expand line +${qty(id, c.expand.add)}/yr · ${money(c.expand.cost)} · ready ${yr(t + c.expand.lead)}`, d.expand.includes(id), true)}
        ${opt('multi', multiOn && !d.multi.includes(id) ? `Multiyear contract to ${yr(st.multi + P.multi.years - 1)}` : `Multiyear contract · −${P.multi.discount * 100}% · ${P.multi.years} yrs`, d.multi.includes(id), canDo(s, 'multi', id))}
        ${opt('coprod', st.coprod !== null ? 'Co-producing with a partner' : `Co-produce with a partner · ${money(P.coprod.cost)}`, d.coprod.includes(id), canDo(s, 'coprod', id))}
        ${opt('modern', st.modern_at !== null ? `New type ${yr(st.modern_at)}` : `Develop a new type · ${money(P.modern.cost)} · ${yr(t + P.modern.lead)}`, d.modern.includes(id), canDo(s, 'modern', id))}
      </div>
      <p class="fine">Needs ${kitNames(id)}.${pend.length ? ' Coming: ' + pend.join('; ') + '.' : ''}</p>
    </article>`;
  }).join('');
}

export function compsHTML(s, d) {
  const pr = production(s, d);
  return COMPONENTS.map(k => {
    const st = s.comp[k.id], cap = compCap(s, k.id), load = pr.load[k.id], known = st.known;
    const pct = known ? Math.min(100, 100 * load / cap) : 0, over = known && load > cap;
    const second = st.second !== null ? (secondActive(s, k.id) ? 'Second source running' : `Second source from ${yr(st.second + k.second.lead)}`) : `Second source +${k.second.share * 100}% · ${money(k.second.cost)} · ${yr(s.year + k.second.lead)}`;
    return `<div class="md-comp${over ? ' over' : ''}">
      <p><b>${k.label}</b> <small class="muted">${k.text}</small></p>
      <div class="md-cbar${known ? '' : ' unknown'}" role="img" aria-label="${known ? `Orders need ${Math.round(load)} of ${cap} kits` : 'Capacity unknown'}"><span style="width:${pct}%"></span></div>
      <p class="fine">${known ? `Orders need <b class="num">${Math.round(load)}</b> of <b class="num">${cap}</b> kits a year${over ? ' — <b class="bad">short</b>' : ''}` : `Orders need ${Math.round(load)} kits. Capacity unknown: the prime contractor reports no issues.`}</p>
      <div class="md-opts">
        ${!known ? `<button type="button" class="md-opt" data-opt="audit" data-id="${k.id}" ${pressed(d.audit.includes(k.id))}>Audit the sub-tier · ${money(P.audit)}</button>` : ''}
        <button type="button" class="md-opt" data-opt="second" data-id="${k.id}" ${pressed(d.second.includes(k.id), !canDo(s, 'second', k.id) && !d.second.includes(k.id))}>${second}</button>
      </div></div>`;
  }).join('') + `<div class="md-comp"><p><b>Workforce</b> <small class="muted">trained level ${workLevel(s)} of ${P.train.max}</small></p>
    <p class="fine">Lines run at ${Math.round(P.workEff[workLevel(s)] * 100)}% and can surge to ${P.surgeMax[workLevel(s)]}× in war.</p>
    <div class="md-opts"><button type="button" class="md-opt" data-opt="train" ${pressed(d.train, !canDo(s, 'train') && !d.train)}>Train workers · ${money(P.train.cost)} · from ${yr(s.year + 1)}</button></div></div>`;
}

export function budgetHTML(s, d) {
  const B = budget(s), cap = capitalCost(d), buy = buyCost(s, d), left = B - cap - buy;
  return `<span>Budget <b class="num">${money(B)}</b></span><span>Projects <b class="num">${money(cap)}</b></span><span>Orders up to <b class="num">${money(buy)}</b></span><span class="${left < 0 ? 'bad' : ''}">${left < 0 ? 'Over by' : 'Left'} <b class="num">${money(Math.abs(left))}</b></span>`;
}

export function resultHTML(h, log) {
  if (!h) return '';
  const rows = IDS.map(id => { const m = h.made[id]; const got = m.own + m.partner; return `<li style="--c:${COL[id]}"><b>${BY[id].short}</b>: ${qty(id, got)} of ${qty(id, m.ordered)} ordered${m.partner ? ` (${qty(id, m.partner)} from the partner)` : ''}${m.limitedBy ? ` · <span class="bad">held back by ${CBY[m.limitedBy].label.toLowerCase()}</span>` : ''}</li>`; }).join('');
  return `<h3>${yr(h.t)} delivered</h3><ul class="md-made">${rows}</ul>
    <p class="fine">Spent ${money(h.capital + h.cost)} of ${money(h.budget)} (${money(h.capital)} on projects).</p>
    ${log.filter(l => l.kind !== 'war').map(l => `<p class="md-note ${l.kind}">${l.text}</p>`).join('')}`;
}

/* ---------- Charts ---------- */
const el = (tag, a, parent) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (parent) parent.appendChild(n); return n; };
function frame(svg, W, H, m) { svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); return { x0: m.l, x1: W - m.r, y0: H - m.b, y1: m.t }; }
function axisY(svg, f, max, step, fmt) {
  for (let v = 0; v <= max + 1e-9; v += step) {
    const y = f.y0 - (f.y0 - f.y1) * v / max;
    el('line', { x1: f.x0, x2: f.x1, y1: y, y2: y, stroke: 'var(--rule)', 'stroke-width': 1 }, svg);
    el('text', { x: f.x0 - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--muted)', 'font-family': 'var(--mono)' }, svg).textContent = fmt(v);
  }
}
const label = (svg, x, y, txt, a = 'middle') => { el('text', { x, y, 'text-anchor': a, 'font-size': 11, fill: 'var(--muted)', 'font-family': 'var(--mono)' }, svg).textContent = txt; };

/** Weeks of war cover by class, across peacetime years and (if any) war weeks. */
export function chartTimeline(svg, s, initial) {
  const W = 640, H = 230, f = frame(svg, W, H, { l: 40, r: 12, t: 12, b: 26 });
  const peace = [{ x: 0, eff: initial }, ...s.history.map(h => ({ x: h.t + 1, eff: h.stock }))];
  const war = s.war ? s.war.series.map(p => ({ x: peace.length - 1 + p.week / P.weeks * 2.5, eff: p.eff })) : [];
  const pts = [...peace, ...war.slice(1)];
  const xMax = Math.max(P.years, pts[pts.length - 1].x);
  const yMax = Math.max(8, ...pts.flatMap(p => IDS.map(id => p.eff[id] / BY[id].demand)));
  const step = yMax > 30 ? 10 : 4, top = Math.ceil(yMax / step) * step;
  axisY(svg, f, top, step, v => `${v}w`);
  const X = x => f.x0 + (f.x1 - f.x0) * x / xMax, Y = v => f.y0 - (f.y0 - f.y1) * Math.min(v, top) / top;
  for (let t = 0; t <= P.years; t += 2) label(svg, X(t), H - 8, String(yr(t)));
  if (war.length) {
    el('rect', { x: X(war[0].x), y: f.y1, width: X(war[war.length - 1].x) - X(war[0].x), height: f.y0 - f.y1, fill: 'var(--red-soft, rgba(200,53,43,.12))' }, svg);
    label(svg, X(war[0].x) + 4, f.y1 + 12, 'war', 'start');
  }
  for (const id of IDS) {
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.eff[id] / BY[id].demand).toFixed(1)}`).join('');
    el('path', { d, fill: 'none', stroke: COL[id], 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, svg);
    if (s.war && s.war.dry[id] !== null) { const x = X(peace.length - 1 + s.war.dry[id] / 7 / P.weeks * 2.5); el('circle', { cx: x, cy: Y(0), r: 4, fill: COL[id], stroke: 'var(--panel)', 'stroke-width': 1.5 }, svg); }
  }
}

/** The war: the line-holds track and each class's stock in weeks of cover. */
export function chartWar(svg, war) {
  const W = 640, H = 220, f = frame(svg, W, H, { l: 40, r: 12, t: 12, b: 26 });
  axisY(svg, f, 100, 25, v => String(v));
  const X = w => f.x0 + (f.x1 - f.x0) * w / P.weeks, Y = v => f.y0 - (f.y0 - f.y1) * Math.max(0, Math.min(100, v)) / 100;
  for (let w = 0; w <= P.weeks; w += 4) label(svg, X(w), H - 8, `d${w * 7}`);
  el('line', { x1: f.x0, x2: f.x1, y1: Y(P.hold.critical), y2: Y(P.hold.critical), stroke: 'var(--bad)', 'stroke-dasharray': '5 4' }, svg);
  label(svg, f.x1, Y(P.hold.critical) - 4, 'critical shortfall', 'end');
  const top = Math.max(4, ...war.series.flatMap(p => IDS.map(id => p.eff[id] / BY[id].demand)));
  for (const id of IDS) {
    const d = war.series.map((p, i) => `${i ? 'L' : 'M'}${X(p.week).toFixed(1)} ${Y(100 * p.eff[id] / BY[id].demand / top).toFixed(1)}`).join('');
    el('path', { d, fill: 'none', stroke: COL[id], 'stroke-width': 1.6, opacity: 0.8 }, svg);
  }
  el('path', { d: war.series.map((p, i) => `${i ? 'L' : 'M'}${X(p.week).toFixed(1)} ${Y(p.hold).toFixed(1)}`).join(''), fill: 'none', stroke: 'var(--ink)', 'stroke-width': 3 }, svg);
}

export const legendHTML = () => IDS.map(id => `<span><i style="background:${COL[id]}"></i>${BY[id].short}</span>`).join('');
