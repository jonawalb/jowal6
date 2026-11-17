// Charts for the three proposition panels.
import { el, frame, axes, path, narrow, pct } from './ui.js';
import { regime } from './engine.js';

const REG = { fake: 'Fakes only', both: 'Fakes and adds music', music: 'Music only', none: 'Does nothing' };

/** P1: two stacked strips sharing a reversed log x-axis (music cost, high on the left). */
export function drawSubstitution(svg, sweep, cur, cmRange) {
  const small = narrow(svg), W = small ? 420 : 680, H = small ? 330 : 300;
  svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const m = { l: 46, r: 14 }, gap = 34, top = 22, bottom = 40, ph = (H - top - bottom - gap) / 2;
  const xt = [2, 1, 0.3, 0.1, 0.03, 0.01].filter(v => v >= cmRange[0] && v <= cmRange[1]);
  // Regime bands behind both strips.
  const F0 = frame(svg, { W, H, m: { ...m, t: top, b: bottom }, x: cmRange, y: [0, 1], xlog: true, xrev: true }, svg);
  const bands = el('g', {}, F0.g);
  let run = null;
  const flush = (i) => { if (!run) return; const a = F0.sx(sweep[run.i0].cm), b = F0.sx(sweep[Math.min(i, sweep.length - 1)].cm);
    el('rect', { x: Math.min(a, b), y: top, width: Math.abs(b - a), height: H - top - bottom, class: 'reg reg-' + run.k }, bands); };
  sweep.forEach((r, i) => { const k = regime(r); if (!run || run.k !== k) { flush(i); run = { k, i0: i }; } });
  flush(sweep.length - 1);
  const strip = (t, yMax, key, cls, label, yt, yf) => {
    const F = frame(svg, { W, H: t + ph + (H - t - ph), m: { ...m, t, b: H - t - ph }, x: cmRange, y: [0, yMax], xlog: true, xrev: true }, svg);
    axes(F, { xt, yt, xf: v => String(v), yf, noX: t === top, xl: t === top ? '' : 'Cost of the music, cm (cheaper to the right)', yl: label });
    el('path', { d: path(sweep.map(r => [r.cm, r[key]]), F.sx, F.sy), class: 'ln ' + cls }, F.g);
    el('line', { x1: F.sx(cur.cm), x2: F.sx(cur.cm), y1: t, y2: t + ph, class: 'now' }, F.g);
    el('circle', { cx: F.sx(cur.cm), cy: F.sy(cur[key]), r: 5.5, class: 'mark ' + cls }, F.g);
    return F;
  };
  strip(top, 3, 'f', 'fake', 'Faked evidence the sender buys, f', [0, 1, 2, 3], String);
  strip(top + ph + gap, 1, 'A', 'music', 'Arousal the sender buys with music, A', [0, 0.5, 1], v => String(v));
}
export const regimeLabel = k => REG[k];

/** P2: belief over hours for the two attacks, with the correction time and the accurate belief. */
export function drawCorrection(svg, cp, p) {
  const small = narrow(svg), W = small ? 420 : 680, H = small ? 300 : 280;
  const lo = Math.max(0, cp.truth - 0.06), hi = Math.min(1, cp.start + 0.06);
  const F = frame(svg, { W, H, m: { l: 46, r: 14, t: 22, b: 40 }, x: [0, 72], y: [lo, hi] });
  const step = (hi - lo) > 0.3 ? 0.1 : 0.05, yt = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) yt.push(+v.toFixed(2));
  axes(F, { xt: [0, 12, 24, 36, 48, 60, 72], yt, yf: v => pct(v), xl: 'Hours after exposure', yl: 'Belief that the claim is true' });
  const { g, sx, sy } = F;
  el('line', { x1: sx(0), x2: sx(72), y1: sy(cp.truth), y2: sy(cp.truth), class: 'truth' }, g);
  // Put the label on the side away from the correction line so the two never cross.
  const right = p.tc < 36;
  el('text', { x: right ? sx(72) - 4 : sx(0) + 6, y: sy(cp.truth) + 15, 'text-anchor': right ? 'end' : 'start', class: 'lbl' }, g, `what the true evidence justifies (${pct(cp.truth)})`);
  el('line', { x1: sx(p.tc), x2: sx(p.tc), y1: F.m.t, y2: H - F.m.b, class: 'corr' }, g);
  el('text', { x: sx(p.tc) + 5, y: F.m.t + 12, class: 'lbl corr-l' }, g, p.corr === 'text' ? 'text fact-check' : 'names the feeling');
  el('path', { d: path(cp.fake, sx, sy), class: 'ln fake' }, g);
  el('path', { d: path(cp.music, sx, sy), class: 'ln music' }, g);
}

/** P3: histogram of the share of listeners who act, across episodes, for independent moods and one melody. */
export function drawPopulation(svg, pop, mass) {
  const small = narrow(svg), W = small ? 420 : 680, H = small ? 280 : 250;
  const bins = 40, count = s => { const c = new Array(bins).fill(0); s.forEach(x => { c[Math.min(bins - 1, Math.floor(x * bins))]++; }); return c; };
  const ci = count(pop.indep.shares), cm = count(pop.melody.shares);
  const n = pop.indep.shares.length, ymax = Math.max(...ci, ...cm) / n;
  const top = Math.min(1, Math.ceil(ymax * 10) / 10 + 0.05);
  const F = frame(svg, { W, H, m: { l: 46, r: small ? 30 : 14, t: 22, b: 40 }, x: [0, 1], y: [0, top] });
  axes(F, { xt: [0, 0.25, 0.5, 0.75, 1], yt: [0, +(top / 2).toFixed(2), top], xf: v => pct(v), yf: v => pct(v), xl: small ? 'Share of listeners who act' : 'Share of listeners whose belief crosses the action line, per episode', yl: 'Share of episodes' });
  const { g, sx, sy } = F;
  const bw = (sx(1) - sx(0)) / bins;
  cm.forEach((c, i) => { if (c) el('rect', { x: sx(i / bins) + 0.5, y: sy(c / n), width: bw - 1, height: sy(0) - sy(c / n), class: 'bar melody' }, g); });
  ci.forEach((c, i) => { if (c) el('rect', { x: sx(i / bins) + bw * 0.25, y: sy(c / n), width: bw * 0.5, height: sy(0) - sy(c / n), class: 'bar indep' }, g); });
  el('line', { x1: sx(mass), x2: sx(mass), y1: F.m.t, y2: sy(0), class: 'corr' }, g);
  el('text', small ? { x: sx(mass) - 5, y: F.m.t + 12, 'text-anchor': 'end', class: 'lbl corr-l' } : { x: sx(mass) + 5, y: F.m.t + 12, class: 'lbl corr-l' }, g, small ? 'over half act' : 'more than half act together');
}

/** Dot grid of one episode: filled dots act. */
export function drawDots(svg, flags, cls) {
  const cols = 25, rows = Math.ceil(flags.length / cols), s = 12;
  svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${cols * s} ${rows * s}`);
  flags.forEach((on, i) => el('circle', { cx: (i % cols) * s + s / 2, cy: Math.floor(i / cols) * s + s / 2, r: 4, class: on ? 'dot on ' + cls : 'dot' }, svg));
}
