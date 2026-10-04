// Timeline of declaratory changes: one row per state, one marker per dated document or statement.
// Drag across it to set the "as of" year that drives the matrix and the comparison.
import { STATES, EVENTS } from '../data/policies.js';
import { STATE_COLOR, esc, dateText } from './common.js';

export const T0 = 1960, T1 = 2026;
const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};
const yf = d => { const [y, m = 7] = d.split('-').map(Number); return y + (m - 0.5) / 12; };

export function createTimeline(host, { onYear, onEvent }) {
  const svg = mk('svg', { role: 'group', 'aria-label': 'Timeline of declared nuclear policy documents by state' });
  host.appendChild(svg);
  const tip = document.createElement('div');
  tip.className = 'tooltip'; tip.hidden = true;
  host.appendChild(tip);
  let geo = null, drag = false;
  const yearAt = ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) * (geo.W / r.width);
    return Math.max(T0, Math.min(T1, Math.round(geo.xi(px))));
  };
  svg.addEventListener('pointerdown', ev => { if (ev.target.closest('.ev')) return; drag = true; svg.setPointerCapture(ev.pointerId); onYear(yearAt(ev)); });
  svg.addEventListener('pointermove', ev => { if (drag) onYear(yearAt(ev)); });
  svg.addEventListener('pointerup', () => { drag = false; });
  svg.addEventListener('pointercancel', () => { drag = false; });

  function draw(state) {
    const W = Math.max(300, Math.round(host.clientWidth || 800)), narrow = W < 560;
    const states = STATES.filter(s => state.states.has(s.id));
    const rowH = narrow ? 26 : 30, m = { l: narrow ? 62 : 118, r: 12, t: 22, b: 24 };
    const H = m.t + m.b + rowH * Math.max(1, states.length);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const pw = W - m.l - m.r;
    const x = y => m.l + (y - T0) / (T1 - T0) * pw;
    geo = { W, xi: px => T0 + (px - m.l) / pw * (T1 - T0) };
    const ax = mk('g', { class: 'tsm-axis' }, svg);
    for (let y = T0; y <= T1; y += narrow ? 20 : 10) {
      mk('line', { class: 'gl', x1: x(y), x2: x(y), y1: m.t - 6, y2: H - m.b }, svg);
      mk('text', { x: x(y), y: H - 6, 'text-anchor': 'middle' }, ax).textContent = y;
    }
    mk('rect', { class: 'after', x: x(state.asOf + 1), y: m.t - 6, width: Math.max(0, x(T1 + 0.5) - x(state.asOf + 1)), height: H - m.t - m.b + 6 }, svg);
    states.forEach((s, i) => {
      const cy = m.t + rowH * i + rowH / 2;
      mk('line', { class: 'row', x1: m.l, x2: m.l + pw, y1: cy, y2: cy }, svg);
      mk('text', { class: 'rl', x: m.l - 8, y: cy + 4, 'text-anchor': 'end' }, svg).textContent = narrow ? s.short : s.name;
      EVENTS.filter(e => e.state === s.id).forEach(e => {
        const g = mk('g', { class: 'ev' + (state.ev === e.id ? ' on' : ''), 'data-ev': e.id, tabindex: 0, role: 'button', 'aria-label': `${s.name}, ${dateText(e.date)}: ${e.title}` }, svg);
        const c = mk('circle', { cx: x(yf(e.date)), cy, r: narrow ? 5 : 6 }, g);
        c.style.fill = STATE_COLOR[s.id];
        g.addEventListener('click', () => onEvent(e.id));
        g.addEventListener('keydown', k => { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); onEvent(e.id); } });
        g.addEventListener('pointerenter', ev => {
          tip.innerHTML = `<b>${esc(e.title)}</b><small>${esc(s.name)} · ${dateText(e.date)}</small>`;
          const r = host.getBoundingClientRect();
          let px = ev.clientX - r.left + 12; if (px > r.width - 240) px = ev.clientX - r.left - 250;
          tip.style.left = Math.max(0, px) + 'px'; tip.style.top = Math.max(0, ev.clientY - r.top - 8) + 'px'; tip.hidden = false;
        });
        g.addEventListener('pointerleave', () => { tip.hidden = true; });
      });
    });
    const cx = x(state.asOf + 1);
    mk('line', { class: 'cursor', x1: cx, x2: cx, y1: m.t - 10, y2: H - m.b }, svg);
    const right = cx > W - 80;
    mk('text', { class: 'cursor-lab', x: cx + (right ? -5 : 5), y: m.t - 8, 'text-anchor': right ? 'end' : 'start' }, svg).textContent = `as of ${state.asOf}`;
  }
  return { draw };
}

export function eventCard(id) {
  const e = EVENTS.find(k => k.id === id);
  if (!e) return '<p class="fine">Click a marker for the document, its date and a link to the source. Drag across the timeline to set the year the matrix shows.</p>';
  return `<div class="dp-ev"><p class="eyebrow">${esc(STATES.find(s => s.id === e.state).name)} · ${dateText(e.date)}</p><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p>
    <p class="fine"><a href="${esc(e.url)}" target="_blank" rel="noopener">Source</a>${e.archive ? ` · <a href="${esc(e.archive)}" target="_blank" rel="noopener">archived copy</a>` : ''}</p></div>`;
}
