// Documents dated before 2017 sit in a compressed "Earlier" band at the left edge.
// Binding texts (orders, laws, rules, standards, treaties) are squares; everything else, including bills not enacted, is a circle.
const BINDING = new Set(['standard', 'regulation', 'law', 'decree', 'executive-order', 'proclamation', 'agreement']);
// Timeline: four swim lanes (US, China, Russia, between them), one node per primary document,
// arcs for revocations, supersessions and amendments. Roving tabindex: arrows move between nodes.
import { DOCS } from '../data/policy.js';
import { COUNTRIES, C, D, REL, KIND, statusOf, esc, dateText } from './common.js';

const NS = 'http://www.w3.org/2000/svg';
const T0 = Date.UTC(2017, 0, 1), T1 = Date.UTC(2027, 0, 1);
const LABEL_W = 96, PAD_R = 18, EARLY_W = 64, ROW = 19, R = 6.5, LANE_PAD = 16, AXIS_H = 26;
const ts = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); };

export function createTimeline(host, { onSelect }) {
  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('ap-tl');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', 'Timeline of AI policy documents by country, 2017 to 2026. Use arrow keys to move between documents.');
  host.appendChild(svg);
  let st = { sel: null, themes: new Set(), lanes: new Set(), links: true, q: '', only: null };
  const shown = d => !st.only || st.only.has(d.id) || d.id === st.sel;
  let layout = null;

  function matches(d) {
    if (!st.lanes.has(d.country)) return false;
    if (st.themes.size && !d.themes.some(t => st.themes.has(t))) return false;
    if (st.q) {
      const hay = `${d.title} ${d.titleOrig || ''} ${d.issuer} ${d.summary}`.toLowerCase();
      if (!hay.includes(st.q.toLowerCase())) return false;
    }
    return true;
  }

  function compute(width) {
    const W = Math.max(860, width);
    const tmin = Math.min(...DOCS.filter(shown).map(d => ts(d.date)));
    const ew = tmin < T0 ? EARLY_W : 0, x0 = LABEL_W + ew;
    const x = t => t < T0
      ? LABEL_W + 6 + (t - tmin) / Math.max(1, T0 - tmin) * (ew - 16)
      : x0 + (t - T0) / (T1 - T0) * (W - x0 - PAD_R);
    const lanes = COUNTRIES.filter(c => st.lanes.has(c.id));
    const pos = {};
    let y = AXIS_H;
    const laneBoxes = [];
    for (const lane of lanes) {
      const docs = DOCS.filter(d => d.country === lane.id && shown(d)).sort((a, b) => a.date.localeCompare(b.date));
      const rowEnds = [];
      for (const d of docs) {
        const px = x(ts(d.date));
        let r = rowEnds.findIndex(e => px - e >= R * 2 + 3);
        if (r < 0) { r = rowEnds.length; rowEnds.push(-1e9); }
        rowEnds[r] = px;
        pos[d.id] = { x: px, row: r, lane: lane.id };
      }
      const rows = Math.max(1, rowEnds.length);
      const h = LANE_PAD * 2 + (rows - 1) * ROW;
      for (const d of docs) pos[d.id].y = y + LANE_PAD + pos[d.id].row * ROW;
      laneBoxes.push({ lane, y, h });
      y += h;
    }
    return { W, H: y + AXIS_H, x, pos, laneBoxes, ew };
  }

  function el(tag, attrs, parent, text) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  function render() {
    const width = host.clientWidth || 900;
    layout = compute(width);
    const { W, H, x, pos, laneBoxes, ew } = layout;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = '';
    const defs = el('defs', {}, svg);
    for (const [k, r] of Object.entries(REL)) {
      const m = el('marker', { id: `ap-arr-${k}`, viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M0,0 L8,4 L0,8 z', style: `fill:${r.color}` }, m);
    }
    // lanes
    laneBoxes.forEach((b, i) => {
      el('rect', { x: 0, y: b.y, width: W, height: b.h, class: i % 2 ? 'ap-lane alt' : 'ap-lane' }, svg);
      el('rect', { x: 0, y: b.y + 6, width: 4, height: b.h - 12, rx: 2, style: `fill:${b.lane.color}` }, svg);
      el('text', { x: 12, y: b.y + b.h / 2 + 4, class: 'ap-lanelab' }, svg, b.lane.short === 'Joint' ? 'Between' : b.lane.short);
    });
    // years
    for (let yr = 2017; yr <= 2026; yr++) {
      const gx = x(Date.UTC(yr, 0, 1));
      el('line', { x1: gx, x2: gx, y1: AXIS_H - 4, y2: H - AXIS_H + 4, class: 'ap-grid' }, svg);
      el('text', { x: gx + 4, y: AXIS_H - 9, class: 'ap-year' }, svg, yr);
      el('text', { x: gx + 4, y: H - 8, class: 'ap-year' }, svg, yr);
    }
    if (ew) {
      el('text', { x: LABEL_W + 2, y: AXIS_H - 9, class: 'ap-year' }, svg, 'Earlier');
      el('text', { x: LABEL_W + 2, y: H - 8, class: 'ap-year' }, svg, 'Earlier');
    }
    const now = x(Date.UTC(2026, 10, 16));
    el('line', { x1: now, x2: now, y1: AXIS_H - 4, y2: H - AXIS_H + 4, class: 'ap-now' }, svg);
    el('text', { x: now - 4, y: H - 8, class: 'ap-year ap-nowlab', 'text-anchor': 'end' }, svg, 'Now');
    // links
    const lg = el('g', { class: 'ap-links' }, svg);
    if (st.links) for (const d of DOCS) for (const r of d.rel || []) {
      const a = pos[d.id], b = pos[r.target];
      if (!a || !b || !REL[r.type]) continue;
      const on = st.sel && (st.sel === d.id || st.sel === r.target);
      const dim = !matches(d) && !matches(D[r.target]);
      const mx = (a.x + b.x) / 2, lift = Math.min(70, Math.abs(a.x - b.x) / 3 + 18);
      const cy = Math.min(a.y, b.y) - lift;
      el('path', {
        d: `M${a.x},${a.y - R} Q${mx},${cy} ${b.x},${b.y - R - 1}`,
        class: `ap-link k-${r.type}${on ? ' on' : ''}${dim ? ' dim' : ''}`,
        style: `stroke:${REL[r.type].color}`, 'marker-end': `url(#ap-arr-${r.type})`,
      }, lg);
    }
    // nodes
    const ng = el('g', { class: 'ap-nodes' }, svg);
    for (const d of DOCS) {
      const p = pos[d.id];
      if (!p) continue;
      const s = statusOf(d), col = C[d.country].color;
      const g = el('g', {
        class: `ap-node${matches(d) ? '' : ' dim'}${st.sel === d.id ? ' sel' : ''}`, 'data-id': d.id,
        role: 'button', tabindex: -1, transform: `translate(${p.x},${p.y})`,
        'aria-label': `${C[d.country].name}, ${dateText(d.date, d.datePrecision)}: ${d.title}. ${s.name}.`,
        'aria-pressed': st.sel === d.id ? 'true' : 'false',
      }, ng);
      el('title', {}, g, `${dateText(d.date, d.datePrecision)} · ${d.title} (${s.name})`);
      el('circle', { r: R + 7, class: 'ap-hit' }, g);
      el('circle', { r: R + 3.5, class: 'ap-ring', style: `stroke:${col}` }, g);
      const shape = BINDING.has(d.kind)
        ? el('rect', { x: -R, y: -R, width: R * 2, height: R * 2, rx: 1.5 }, g)
        : el('circle', { r: R }, g);
      shape.setAttribute('class', `ap-mark ${s.live === true ? 'live' : s.live === false ? 'dead' : s.live === 'unclear' ? 'unc' : 'prop'}`);
      shape.setAttribute('style', `--col:${col}`);
    }
    roving();
  }

  // Keyboard: roving tabindex across visible, matching nodes.
  function order() {
    return DOCS.filter(d => layout?.pos[d.id] && matches(d)).sort((a, b) => a.date.localeCompare(b.date));
  }
  function roving() {
    const list = order();
    const cur = list.find(d => d.id === st.sel) || list[list.length - 1];
    svg.querySelectorAll('.ap-node').forEach(n => n.setAttribute('tabindex', n.dataset.id === cur?.id ? 0 : -1));
  }
  function focusNode(id) { const n = svg.querySelector(`.ap-node[data-id="${CSS.escape(id)}"]`); n?.focus(); }
  svg.addEventListener('click', e => { const n = e.target.closest('.ap-node'); if (n) onSelect(n.dataset.id); });
  svg.addEventListener('keydown', e => {
    const n = e.target.closest('.ap-node'); if (!n) return;
    const id = n.dataset.id, d = D[id];
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(id); return; }
    const all = order();
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const lane = all.filter(x => x.country === d.country);
      const i = lane.findIndex(x => x.id === id);
      next = lane[i + (e.key === 'ArrowRight' ? 1 : -1)];
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const lanes = COUNTRIES.filter(c => st.lanes.has(c.id) && all.some(x => x.country === c.id)).map(c => c.id);
      const li = lanes.indexOf(d.country) + (e.key === 'ArrowDown' ? 1 : -1);
      if (lanes[li]) {
        const t = ts(d.date);
        next = all.filter(x => x.country === lanes[li]).sort((a, b) => Math.abs(ts(a.date) - t) - Math.abs(ts(b.date) - t))[0];
      }
    } else if (e.key === 'Home') next = all[0];
    else if (e.key === 'End') next = all[all.length - 1];
    if (next) { e.preventDefault(); onSelect(next.id); requestAnimationFrame(() => focusNode(next.id)); }
  });

  let rw = 0;
  new ResizeObserver(() => { const w = host.clientWidth; if (Math.abs(w - rw) > 4) { rw = w; render(); } }).observe(host);

  return {
    update(next) { st = { ...st, ...next }; render(); },
    scrollTo(id) {
      const p = layout?.pos[id]; if (!p) return;
      const wrap = host;
      if (p.x < wrap.scrollLeft + 60 || p.x > wrap.scrollLeft + wrap.clientWidth - 60) wrap.scrollLeft = p.x - wrap.clientWidth / 2;
    },
    focus: focusNode,
  };
}

/** Accessible list version of the same documents (default on narrow screens). */
export function listHTML(docs, sel) {
  if (!docs.length) return '<p class="fine">No documents match these filters.</p>';
  let year = null, out = '';
  for (const d of docs) {
    const y = d.date.slice(0, 4);
    if (y !== year) { if (year) out += '</ol>'; out += `<h3 class="ap-ly">${y}</h3><ol class="ap-list">`; year = y; }
    const s = statusOf(d);
    out += `<li><button type="button" class="ap-li" data-id="${esc(d.id)}" aria-pressed="${sel === d.id}">
      <span class="ap-cdot" style="background:${C[d.country].color}"></span>
      <span class="ap-li-t"><b>${esc(d.title)}</b><small>${esc(C[d.country].short)} · ${esc(dateText(d.date, d.datePrecision))} · ${esc(KIND[d.kind] || d.kind)} · <span class="ap-st" data-s="${s.s}">${esc(s.name)}</span></small></span>
    </button></li>`;
  }
  return out + '</ol>';
}
