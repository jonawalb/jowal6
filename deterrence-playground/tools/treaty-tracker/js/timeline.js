// Timeline of withdrawals, suspensions, revocations and expiries, one row per treaty. Markers that fall close
// together stack upward. Click a marker for its source passage; drag across the chart to set the year.
import { EVENTS } from '../data/treaties.js';
import { T, when, esc, dateText, stateName } from './common.js';

export const TL0 = 2002, TL1 = 2026;
export const KINDS = [
  { id: 'withdrawal', name: 'Withdrawal', color: 'var(--bad)' },
  { id: 'suspension', name: 'Suspension', color: 'var(--c2)' },
  { id: 'revocation', name: 'Ratification revoked', color: 'var(--c4)' },
  { id: 'expiry', name: 'Expiry or supersession', color: 'var(--faint)' },
  { id: 'notice', name: 'Notice, extension or statement', color: 'var(--c1)' },
];
const MAX_LANES = 6;
const kindOf = k => (['extension', 'statement', 'notice'].includes(k) ? 'notice' : k);
const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};
const yf = d => { const [y, m, day] = d.split('-').map(Number); return y + (m - 1 + (day - 1) / 31) / 12; };

export function createTimeline(host, { onYear, onEvent }) {
  const svg = mk('svg', { role: 'group', 'aria-label': 'Timeline of treaty withdrawals, suspensions and expiries' });
  host.appendChild(svg);
  const tip = document.createElement('div');
  tip.className = 'tooltip'; tip.hidden = true;
  host.appendChild(tip);
  let geo = null, drag = false;
  const yearAt = ev => {
    const r = svg.getBoundingClientRect();
    return Math.max(TL0, Math.min(TL1, Math.floor(geo.xi((ev.clientX - r.left) * (geo.W / r.width)))));
  };
  svg.addEventListener('pointerdown', ev => { if (ev.target.closest('.ev')) return; drag = true; svg.setPointerCapture(ev.pointerId); onYear(yearAt(ev)); });
  svg.addEventListener('pointermove', ev => { if (drag) onYear(yearAt(ev)); });
  svg.addEventListener('pointerup', () => { drag = false; });
  svg.addEventListener('pointercancel', () => { drag = false; });

  function draw(state) {
    const W = Math.max(300, Math.round(host.clientWidth || 800)), narrow = W < 560;
    const m = { l: narrow ? 74 : 104, r: narrow ? 20 : 12, t: 22, b: 24 }, pw = W - m.l - m.r;
    const x = y => m.l + (y - TL0) / (TL1 + 1 - TL0) * pw;
    geo = { W, xi: px => TL0 + (px - m.l) / pw * (TL1 + 1 - TL0) };
    const evs = EVENTS.filter(e => state.kinds.has(kindOf(e.kind)) && yf(e.date) >= TL0);
    const tids = [...new Set(evs.map(e => e.treaty))].sort((a, b) => Object.keys(T).indexOf(a) - Object.keys(T).indexOf(b));
    const r = narrow ? 4.5 : 5.5, step = r * 2 + 1.5;
    // Assign stacking lanes per treaty row.
    const rows = tids.map(tid => {
      const lanes = [];
      const items = evs.filter(e => e.treaty === tid).sort((a, b) => a.date.localeCompare(b.date)).map(e => {
        const cx = x(yf(e.date));
        let lane = lanes.findIndex(last => cx - last > step), px = cx;
        if (lane < 0 && lanes.length < MAX_LANES) { lane = lanes.length; lanes.push(cx); }
        else if (lane < 0) { lane = lanes.indexOf(Math.min(...lanes)); px = lanes[lane] + step; lanes[lane] = px; }
        else lanes[lane] = cx;
        return { e, cx: px, lane };
      });
      return { tid, items, h: Math.max(26, lanes.length * step + 12) };
    });
    const H = m.t + m.b + rows.reduce((s, rw) => s + rw.h, 0) + 4;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const refocus = document.activeElement?.closest?.('.ev')?.dataset.id; // keep keyboard focus across the redraw
    svg.replaceChildren();
    const ax = mk('g', { class: 'tsm-axis' }, svg);
    for (let y = TL0; y <= TL1; y += narrow ? 6 : 2) {
      mk('line', { class: 'gl', x1: x(y), x2: x(y), y1: m.t - 6, y2: H - m.b }, svg);
      mk('text', { x: x(y), y: H - 6, 'text-anchor': 'middle' }, ax).textContent = y;
    }
    mk('rect', { class: 'after', x: x(state.year + 1), y: m.t - 6, width: Math.max(0, x(TL1 + 1) - x(state.year + 1)), height: H - m.t - m.b + 6 }, svg);
    let top = m.t;
    rows.forEach(rw => {
      const base = top + rw.h - 10;
      mk('line', { class: 'row', x1: m.l, x2: m.l + pw, y1: base, y2: base }, svg);
      mk('text', { class: 'rl', x: m.l - 8, y: base + 4, 'text-anchor': 'end' }, svg).textContent = T[rw.tid].short;
      rw.items.forEach(({ e, cx, lane }) => {
        const who = e.state ? stateName(e.state) : 'All parties';
        const g = mk('g', { class: 'ev' + (state.ev === e.id ? ' on' : ''), tabindex: 0, role: 'button', 'aria-label': `${dateText(e.date)}, ${T[e.treaty].short}: ${e.title}`, 'data-id': e.id }, svg);
        const c = mk('circle', { cx, cy: base - lane * step, r }, g);
        c.style.fill = KINDS.find(k => k.id === kindOf(e.kind)).color;
        g.addEventListener('click', () => onEvent(e.id));
        g.addEventListener('keydown', k => { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); onEvent(e.id); } });
        g.addEventListener('pointerenter', ev => {
          tip.innerHTML = `<b>${esc(e.title)}</b><small>${esc(who)} · ${dateText(e.date)}</small>`;
          const b = host.getBoundingClientRect();
          let px = ev.clientX - b.left + 12; if (px > b.width - 240) px = ev.clientX - b.left - 250;
          tip.style.left = Math.max(0, px) + 'px'; tip.style.top = Math.max(0, ev.clientY - b.top - 8) + 'px'; tip.hidden = false;
        });
        g.addEventListener('pointerleave', () => { tip.hidden = true; });
        if (refocus === e.id) g.focus({ preventScroll: true });
      });
      top += rw.h;
    });
    if (state.year >= TL0) {
      const cx = x(state.year + 1), right = cx > W - 80;
      mk('line', { class: 'cursor', x1: cx, x2: cx, y1: m.t - 10, y2: H - m.b }, svg);
      mk('text', { class: 'cursor-lab', x: cx + (right ? -5 : 5), y: m.t - 8, 'text-anchor': right ? 'end' : 'start' }, svg).textContent = when(state.year).replace(/^(at the |on )/, '');
    }
  }
  return { draw };
}

export function eventCard(id) {
  const e = EVENTS.find(k => k.id === id);
  if (!e) return '<p class="fine">Click a marker for the depositary record or statement behind it. Drag across the chart to set the year.</p>';
  const note = e.kind === 'suspension' && e.treaty === 'cfe'
    ? `<p class="fine">Notified to the depositary ${dateText(e.notice)}${e.effective ? `; effective ${dateText(e.effective)} as stated in the note` : '; the note gives the effective date, if any, in the text below'}.</p>` : '';
  return `<div class="tt-ev"><p class="eyebrow">${esc(T[e.treaty].short)} · ${esc(e.state ? stateName(e.state) : 'All parties')} · ${dateText(e.date)}</p>
    <h3>${esc(e.title)}</h3>${note}<blockquote class="tt-q">${esc(e.text)}</blockquote>
    <p class="fine"><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.srcTitle)}</a></p></div>`;
}
