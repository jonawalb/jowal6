// Extended Deterrence: stage figures. Credibility waterfall, the "Boston for Bonn" curve and the cost frontier.
import { solve, waterfall, allPackages } from './model.js';
import { el, pct, f2, frame, axes, clamp, dragPlot } from './ui.js';

/** Narrow screens get a smaller viewBox so chart text stays legible. */
const vw = svg => ((svg.clientWidth || 760) < 560 ? 440 : 760);

const DCOL = { base: '--muted', treaty: '--c1', statements: '--c2', tripwire: '--c5', sharing: '--c4', screen: '--c3' };
export { DCOL };

/** Horizontal waterfall: credibility from interests alone, then each device in turn. */
export function drawWaterfall(svg, P, params) {
  const steps = waterfall(P, params);
  const n = steps.length + 1, rowH = 34;
  const H = 20 + n * rowH + 30;
  svg.innerHTML = '';
  const VW = vw(svg);
  svg.setAttribute('viewBox', `0 0 ${VW} ${H}`);
  const X0 = VW < 760 ? 132 : 190, W = VW - X0 - 64, sx = v => X0 + clamp(v, 0, 1) * W, g = el('g', {}, svg);
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    el('line', { x1: sx(v), x2: sx(v), y1: 12, y2: H - 26, class: 'grid' }, g);
    el('text', { x: sx(v), y: H - 10, 'text-anchor': 'middle', class: 'tk' }, g, pct(v));
  }
  let prev = 0;
  steps.forEach((s, k) => {
    const y = 18 + k * rowH;
    el('text', { x: X0 - 10, y: y + 17, 'text-anchor': 'end', class: 'rn' }, g, (k === 0 ? '' : '+ ') + (VW < 760 ? s.short : s.name));
    const a = k === 0 ? 0 : prev, b = s.kappa;
    el('rect', { x: sx(Math.min(a, b)), y, width: Math.max(1.5, Math.abs(sx(b) - sx(a))), height: rowH - 10, fill: `var(${DCOL[s.id]})`, class: 'wbar' }, g);
    const lbl = k === 0 ? pct(b) : `${b >= a ? '+' : '−'}${Math.round(Math.abs(b - a) * 100)} pts`;
    el('text', { x: sx(Math.max(a, b)) + 6, y: y + 17, class: 'wl' }, g, lbl);
    if (k > 0) el('line', { x1: sx(a), x2: sx(a), y1: y - 10, y2: y, class: 'conn' }, g);
    prev = b;
  });
  const y = 18 + steps.length * rowH;
  el('text', { x: X0 - 10, y: y + 17, 'text-anchor': 'end', class: 'rn b' }, g, 'Credibility');
  el('rect', { x: sx(0), y, width: sx(prev) - sx(0), height: rowH - 10, class: 'wtot' }, g);
  el('text', { x: sx(prev) + 6, y: y + 17, class: 'wl b' }, g, pct(prev));
}

/** Credibility and deterrence as the patron's war cost w rises: the "Boston for Bonn" problem. */
export function drawBonn(svg, P, params, onDrag) {
  const VW = vw(svg);
  const F = frame(svg, { W: VW, H: VW < 760 ? 300 : 270, m: { l: 52, r: 16, t: 14, b: 44 }, x: [0, 1.5], y: [0, 1] });
  const { g, sx, sy } = F;
  const series = [
    { dev: {}, cls: 'ln base', lbl: 'No devices' },
    { dev: P.dev, cls: 'ln cur', lbl: 'Your package' },
  ];
  for (const s of series) {
    for (const [key, dash] of [['kappa', ''], ['deter', '6 4']]) {
      let d = '';
      for (let i = 0; i <= 150; i++) {
        const w = 1.5 * i / 150, r = solve({ ...P, w }, s.dev, params);
        d += `${i ? 'L' : 'M'}${sx(w).toFixed(1)} ${sy(r[key]).toFixed(1)}`;
      }
      el('path', { d, class: s.cls, 'stroke-dasharray': dash || null }, g);
    }
  }
  el('line', { x1: sx(P.w), x2: sx(P.w), y1: sy(0), y2: sy(1), class: 'now' }, g);
  const r = solve(P, P.dev, params);
  el('circle', { cx: sx(P.w), cy: sy(r.kappa), r: 6, class: 'mark' }, g);
  el('text', { x: sx(P.w) + 6, y: sy(1) + 12, class: 'bl' }, g, `w = ${f2(P.w)}`);
  axes(F, { xt: VW < 760 ? [0, 0.5, 1, 1.5] : [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5], yt: [0, 0.25, 0.5, 0.75, 1], xl: VW < 760 ? 'Patron’s war cost w' : 'Patron’s cost of fighting for the ally, w', yl: 'Probability', yf: pct });
  if (onDrag && !svg.dataset.bound) {
    svg.dataset.bound = '1';
    dragPlot(svg, () => svg._F, x => onDrag(clamp(x, 0, 1.5)));
  }
  svg._F = F;
}

/** All 16 packages: peacetime cost against deterrence, sized by entrapment risk. */
export function drawFrontier(svg, P, params, onPick) {
  const pk = allPackages(P, params);
  const maxS = Math.max(0.3, ...pk.map(p => p.S)) * 1.08;
  const VW = vw(svg);
  const F = frame(svg, { W: VW, H: VW < 760 ? 320 : 280, m: { l: 52, r: 16, t: 14, b: 44 }, x: [0, maxS], y: [0, 1] });
  const { g, sx, sy } = F;
  const cur = pk.find(p => params.every(d => !!p.dev[d.id] === !!P.dev[d.id]));
  // frontier: packages not beaten on both cost and deterrence
  const eff = pk.filter(p => !pk.some(q => q.S <= p.S + 1e-9 && q.deter >= p.deter + 1e-9 && (q.S < p.S - 1e-9 || q.deter > p.deter + 1e-9)))
    .sort((a, b) => a.S - b.S);
  el('path', { d: eff.map((p, i) => `${i ? 'L' : 'M'}${sx(p.S)} ${sy(p.deter)}`).join(''), class: 'front' }, g);
  axes(F, { xt: ticks(maxS).filter((v, i) => VW === 760 || i % 2 === 0), yt: [0, 0.25, 0.5, 0.75, 1], xl: VW < 760 ? 'Peacetime cost (notional)' : 'Peacetime cost to the patron (notional units)', yl: 'Pr(challenger deterred)', yf: pct });
  for (const p of pk) {
    const on = p === cur;
    const c = el('circle', { cx: sx(p.S), cy: sy(p.deter), r: 5 + 22 * p.entrap, class: 'pk' + (on ? ' on' : ''), tabindex: 0, role: 'button',
      'aria-label': `${names(p.dev, params)}: deterred ${pct(p.deter)}, entrapment ${pct(p.entrap)}` }, g);
    el('title', {}, c, `${names(p.dev, params)}\nDeterred ${pct(p.deter)} · entrapment risk ${pct(p.entrap)} · peacetime cost ${f2(p.S)}`);
    const pick = () => onPick(p.dev);
    c.addEventListener('click', pick);
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  }
  if (cur) el('text', { x: sx(cur.S) + 10, y: sy(cur.deter) - 10, class: 'bl' }, g, 'your package');
}
const ticks = m => { const s = m > 0.5 ? 0.1 : 0.05, o = []; for (let v = 0; v <= m + 1e-9; v += s) o.push(+v.toFixed(2)); return o; };
export const names = (dev, params) => params.filter(d => dev[d.id]).map(d => d.name).join(' + ') || 'No devices';
