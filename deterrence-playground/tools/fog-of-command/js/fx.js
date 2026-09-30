// Motion for Fog of Command: units sliding between sectors, artillery arcs and bursts, the recon watching
// the fall of shot, fights, new contacts, and the fog lifting in the review. Everything draws on its own
// layer on top of the map and never changes the game: the state is already updated when an effect starts,
// clicks go straight through, and under prefers-reduced-motion nothing moves.
import { ping, burst, reduced } from '../../../shared/js/motion.js';
import { skin } from '../../../shared/js/skin.js';

const NS = 'http://www.w3.org/2000/svg';
const ease = u => 1 - Math.pow(1 - u, 3);
const rich = () => skin() === 'trailer';
const mk = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.appendChild(n); return n; };

/** The effects layer: last child of the map, cleared only when the map is rebuilt. */
export function fxLayer(m) {
  if (!m.fx || !m.fx.isConnected) m.fx = mk('g', { class: 'fc-fx', 'aria-hidden': 'true', 'pointer-events': 'none' }, m.svg);
  else m.svg.appendChild(m.fx);
  return m.fx;
}

function frames(ms, frame, done) {
  const t0 = performance.now();
  const step = now => { const u = Math.min(1, (now - t0) / ms); if (frame(u) === false) return; if (u < 1) requestAnimationFrame(step); else done?.(); };
  requestAnimationFrame(step);
}

const parse = tf => { const a = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)\s*scale\(([-\d.]+)\)/.exec(tf || ''); return a ? { x: +a[1], y: +a[2], k: +a[3] } : null; };

/** Where every unit and enemy marker sits now, keyed by id. */
export function snap(m) {
  const out = { units: new Map(), foe: new Map() };
  m.svg.querySelectorAll('[data-unit]').forEach(g => { const p = parse(g.getAttribute('transform')); if (p) out.units.set(g.dataset.unit, p); });
  m.svg.querySelectorAll('[data-elem]').forEach(g => { const p = parse(g.getAttribute('transform')); if (p) out.foe.set(g.dataset.elem, p); });
  return out;
}

/** Slide markers from where they were (before) to where render() just put them. forward: the clock moved on. */
export function slide(m, before, { ms = 480, forward = true } = {}) {
  if (!before || reduced()) return;
  const fx = fxLayer(m), dur = rich() ? ms * 1.15 : ms;
  const moves = [];
  const track = (sel, key, prev, color) => m.svg.querySelectorAll(sel).forEach(g => {
    const to = parse(g.getAttribute('transform')), from = prev.get(g.dataset[key]);
    if (!to) return;
    if (!from) { if (forward) { g.style.opacity = '0'; moves.push({ g, to, fade: true }); } return; }
    if (Math.hypot(to.x - from.x, to.y - from.y) < 1) return;
    moves.push({ g, from, to });
    if (rich() && forward) {
      const l = mk('line', { x1: from.x, y1: from.y, x2: from.x, y2: from.y, stroke: color, 'stroke-width': 1.4, 'stroke-dasharray': '3 4', opacity: .8 }, fx);
      frames(dur * 1.6, u => { const e = ease(Math.min(1, u * 1.6)); l.setAttribute('x2', from.x + (to.x - from.x) * e); l.setAttribute('y2', from.y + (to.y - from.y) * e); l.setAttribute('opacity', .8 * (1 - u)); }, () => l.remove());
    }
  });
  track('[data-unit]', 'unit', before.units, 'var(--mine)');
  track('[data-elem]', 'elem', before.foe, 'var(--foe)');
  // Units that were on the map and are gone (broken): a last burst where they stood.
  if (forward) {
    const now = new Set([...m.svg.querySelectorAll('[data-unit]')].map(g => g.dataset.unit));
    for (const [id, p] of before.units) if (!now.has(id)) burst(fx, p.x, p.y, { color: 'var(--mine)', n: rich() ? 16 : 10, r: 24 * p.k });
  }
  if (!moves.length) return;
  for (const mv of moves) if (mv.from) mv.g.setAttribute('transform', `translate(${mv.from.x} ${mv.from.y}) scale(${mv.to.k})`);
  frames(dur, u => {
    const e = ease(u);
    let live = false;
    for (const mv of moves) {
      if (!mv.g.isConnected) continue;
      live = true;
      if (mv.fade) { mv.g.style.opacity = String(Math.min(1, u * 1.6)); continue; }
      mv.g.setAttribute('transform', `translate(${(mv.from.x + (mv.to.x - mv.from.x) * e).toFixed(1)} ${(mv.from.y + (mv.to.y - mv.from.y) * e).toFixed(1)}) scale(${mv.to.k})`);
    }
    if (!live) return false;
  }, () => moves.forEach(mv => { if (mv.fade) mv.g.style.opacity = ''; }));
  // A render during the slide replaces these nodes, so nothing is left half-way.
}

/** An artillery round: an arc from behind one side's line to a sector, then the burst. Resolves on impact. */
export function shell(m, node, { foe = false, color, from = null } = {}) {
  const c = m.G.cells[node];
  if (!c || reduced()) return Promise.resolve();
  const fx = fxLayer(m), G = m.G;
  const x1 = from ? from.x : G.W / 2 + (c.cx - G.W / 2) * .35, y1 = from ? from.y - 12 * G.k : foe ? -6 : G.H + 6, x2 = c.cx, y2 = c.cy;
  const qx = (x1 + x2) / 2 + (foe ? 60 : -60), qy = foe ? 30 : Math.max(10, Math.min(y1, y2) - 90);
  const col = color || (foe ? 'var(--foe)' : rich() ? 'var(--accent)' : 'var(--c3)');
  return new Promise(res => {
    const p = mk('path', { d: `M${x1} ${y1}Q${qx} ${qy} ${x2} ${y2}`, fill: 'none', stroke: col, 'stroke-width': rich() ? 2.6 : 2.2, 'stroke-linecap': 'round' }, fx);
    const L = p.getTotalLength(), seg = Math.max(30, L * .22);
    p.setAttribute('stroke-dasharray', `${seg} ${L + seg}`);
    if (from) ping(fx, from.x, from.y, { color: col, r: 26 * G.k, ms: 500 });
    frames(rich() ? 620 : 480, u => { p.setAttribute('stroke-dashoffset', String(seg - (L + seg) * ease(u))); }, () => {
      p.remove();
      burst(fx, x2, y2, { color: col, n: rich() ? 18 : 12, r: rich() ? 38 : 28 });
      if (rich()) ping(fx, x2, y2, { color: col, r: 60, ms: 800 });
      res();
    });
  });
}

/** The recon troop watching the fall of shot: a sight line to the target, then every enemy there lights up. */
export function spot(m, spotterId, node) {
  if (reduced()) return;
  const fx = fxLayer(m), c = m.G.cells[node];
  const sg = m.svg.querySelector(`[data-unit="${spotterId}"]`), sp = sg && parse(sg.getAttribute('transform'));
  if (sp && c) {
    const l = mk('line', { x1: sp.x, y1: sp.y, x2: c.cx, y2: c.cy, stroke: 'var(--mine)', 'stroke-width': 1.6, 'stroke-dasharray': '2 5', opacity: 0 }, fx);
    frames(900, u => l.setAttribute('opacity', String(u < .25 ? u * 4 : 1 - (u - .25) / .75)), () => l.remove());
    ping(fx, sp.x, sp.y, { color: 'var(--mine)', r: 26 });
  }
  if (!c) return;
  const inside = [...m.svg.querySelectorAll('[data-elem]')].filter(g => { const p = parse(g.getAttribute('transform')); return p && p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h; });
  inside.forEach((g, i) => setTimeout(() => {
    const p = parse(g.getAttribute('transform'));
    if (!p) return;
    ping(fx, p.x, p.y, { color: 'var(--foe)', r: rich() ? 34 : 24 });
    if (g.isConnected) { g.classList.remove('fc-lit'); void g.getBoundingClientRect(); g.classList.add('fc-lit'); }
  }, 120 + i * 90));
}

/** Fights this hour: a flare at each fight marker. New contacts: a ping on each fresh enemy marker. */
export function contacts(m, fightNodes = []) {
  if (reduced()) return;
  const fx = fxLayer(m);
  for (const n of fightNodes) {
    const g = m.svg.querySelector(`.fc-fight[data-node="${n}"]`), p = g && parse(g.getAttribute('transform'));
    if (p) burst(fx, p.x, p.y, { color: 'var(--accent)', n: rich() ? 14 : 8, r: rich() ? 30 : 20 });
  }
  m.svg.querySelectorAll('.fc-trk.fresh, .fc-move').forEach((g, i) => {
    const p = parse(g.getAttribute('transform'));
    if (p) setTimeout(() => ping(fx, p.x, p.y, { color: 'var(--foe)', r: rich() ? 34 : 24 }), i * 50);
  });
}

/** The review's "What was true": the fog thins away from your side of the board and the truth appears. */
export function lift(m, clearing = true) {
  if (reduced()) return;
  const fx = fxLayer(m), G = m.G;
  const id = 'fc-fogg';
  const defs = m.svg.querySelector('defs') || mk('defs', {}, m.svg);
  if (!m.svg.querySelector(`#${id}`)) {
    const lg = mk('linearGradient', { id, x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
    mk('stop', { offset: 0, 'stop-color': 'var(--bg)', 'stop-opacity': 0 }, lg);
    mk('stop', { offset: .35, 'stop-color': 'var(--bg)', 'stop-opacity': .92 }, lg);
    mk('stop', { offset: 1, 'stop-color': 'var(--bg)', 'stop-opacity': .92 }, lg);
  }
  const H = G.Hv || G.H;
  const r = mk('rect', { x: 0, y: 0, width: G.W, height: H * 1.6, fill: `url(#${id})` }, fx);
  const ms = clearing ? (rich() ? 900 : 700) : 450;
  frames(ms, u => {
    const e = ease(u);
    // Clearing: the fog bank rolls off the far edge. Returning: a thin veil that fades.
    if (clearing) r.setAttribute('y', String(-H * 1.6 * e));
    else { r.setAttribute('y', String(-H * .6)); r.setAttribute('opacity', String(.55 * (1 - e))); }
  }, () => r.remove());
  if (clearing) m.svg.querySelectorAll('.fc-trk').forEach((g, i) => { g.classList.remove('fc-pop'); void g.getBoundingClientRect(); g.style.setProperty('--d', `${120 + i * 25}ms`); g.classList.add('fc-pop'); });
}
