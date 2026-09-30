// Motion for Nuclear Entanglement. When you order a strike, the cell bursts, the damage pulses along the row
// through the later phases, and tracers run from the struck category to every escalation channel it feeds
// (the model's own weights), which then pulse. Risk bars grow from their last height, readouts count, and the
// status card shakes when the risk turns high. Presentation only: it never changes a number or delays input.
import { CATS, CHANNELS } from './model.js';
import { burst, ping, pulse, shake, tracer } from '../../../shared/js/motion.js';
import { reduced, trailer, count, replay, num } from './fxkit.js';

const NS = 'http://www.w3.org/2000/svg';
let last = null, layer = null;
const pctFmt = v => Math.round(v) + '%';

/** A pointer-transparent SVG over the stage for tracers between the planner and the channel cards. */
function overlay(stage) {
  if (!layer || !layer.isConnected) {
    layer = document.createElementNS(NS, 'svg');
    layer.setAttribute('class', 'fx-layer');
    layer.setAttribute('aria-hidden', 'true');
    stage.appendChild(layer);
  }
  const r = stage.getBoundingClientRect();
  layer.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
  layer.setAttribute('width', r.width); layer.setAttribute('height', r.height);
  return { svg: layer, at: el => { const b = el.getBoundingClientRect(); return [b.left - r.left + b.width / 2, b.top - r.top + b.height / 2, b]; } };
}

function strikeFx(stage, S, cells) {
  const { svg, at } = overlay(stage);
  const T = trailer(), cards = [...stage.querySelectorAll('#en-ch .ch')];
  const many = cells.length > 3;
  const hit = new Map();   // channel index -> delay
  cells.forEach(([c, t], k) => {
    const cell = stage.querySelector(`.pl-c[data-c="${c}"][data-t="${t}"]`);
    if (!cell) return;
    const [x, y] = at(cell), d0 = many ? k * 35 : k * 160;
    setTimeout(() => {
      burst(svg, x, y, { color: 'var(--accent)', n: T ? 14 : 10, r: T ? 30 : 22 });
      replay(cell, 'fx-hit');
    }, d0);
    // Damage carries through the later phases of the same row.
    for (let u = t + 1; u < 4; u++) replay(stage.querySelector(`.pl-c[data-c="${c}"][data-t="${u}"]`), 'fx-carry', d0 + (u - t) * 110);
    if (many) return;
    const cat = CATS.find(x => x.id === c);
    CHANNELS.forEach((ch, i) => {
      if ((cat.w[ch.id] || 0) < 0.2 || (ch.id === 'dl' && !S.P.dlDoc) || !cards[i]) return;
      const [, , b] = at(cards[i]), tx = b.left - stage.getBoundingClientRect().left + b.width / 2, ty = b.top - stage.getBoundingClientRect().top + 6;
      setTimeout(() => tracer(svg, x, y, tx, ty, { color: `var(${ch.col})`, ms: T ? 520 : 420, width: T ? 2.6 : 1.8 })
        .then(() => ping(svg, tx, ty, { color: `var(${ch.col})`, r: T ? 26 : 16 })), d0 + 120 + i * 60);
      hit.set(i, Math.max(hit.get(i) || 0, d0 + 120 + i * 60 + (T ? 520 : 420)));
    });
  });
  if (many) cards.forEach((c, i) => hit.set(i, cells.length * 35 + 200 + i * 60));
  hit.forEach((d, i) => replay(cards[i], 'fx-feed', d));
}

/** Grow the stacked hazard bars of each phase from their last total height. */
function growBars(svg, prev) {
  const phases = new Map();
  svg.querySelectorAll('rect.hz').forEach(r => {
    const x = r.getAttribute('x');
    if (!phases.has(x)) phases.set(x, []);
    phases.get(x).push(r);
  });
  const now = [];
  [...phases.values()].forEach((rects, i) => {
    const bottom = Math.max(...rects.map(r => +r.getAttribute('y') + +r.getAttribute('height')));
    const h = rects.reduce((s, r) => s + +r.getAttribute('height'), 0);
    now.push(h);
    const from = prev ? prev[i] : 0;
    if (reduced() || from == null || Math.abs(from - h) < 0.5 || !h) return;
    const k = Math.max(0, Math.min(3, from / h));
    rects.forEach(r => {
      r.style.transformOrigin = `0px ${bottom}px`;
      r.animate([{ transform: `scaleY(${k})` }, { transform: 'none' }], { duration: prev ? 420 : 650, delay: prev ? 0 : i * 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    });
  });
  return now;
}

export function afterRender(S, R) {
  const stage = document.getElementById('stage'), T = trailer();
  const plan = Object.fromEntries(CATS.map(c => [c.id, [...S.plan[c.id]]]));
  if (last) {
    const on = [];
    CATS.forEach(c => plan[c.id].forEach((v, t) => { if (v && !last.plan[c.id][t]) on.push([c.id, t]); }));
    if (on.length) strikeFx(stage, S, on);
    CATS.forEach(c => plan[c.id].forEach((v, t) => { if (!v && last.plan[c.id][t]) replay(stage.querySelector(`.pl-c[data-c="${c.id}"][data-t="${t}"]`), 'fx-lift'); }));
  }

  const bars = growBars(stage.querySelector('#en-time'), last?.bars);
  const time = stage.querySelector('#en-time');
  const dot = [...time.querySelectorAll('.cumdot')].pop();
  if (dot && last && Math.abs(R.pEsc - last.pEsc) > 0.004) ping(time, +dot.getAttribute('cx'), +dot.getAttribute('cy'), { color: R.pEsc > last.pEsc ? 'var(--bad)' : 'var(--good)', r: T ? 26 : 16 });

  // Channel cards: shares count, bars slide.
  const shares = [];
  stage.querySelectorAll('#en-ch .ch').forEach((card, i) => {
    const v = card.querySelector('.ch-v'), txtNode = v.firstChild, t = txtNode?.textContent || '';
    shares.push(t);
    if (/^\d+%$/.test(t) && last && /^\d+%$/.test(last.shares[i] || '') && t !== last.shares[i]) {
      const span = document.createElement('span'); span.className = 'fx-n';
      v.replaceChild(span, txtNode); count(span, num(last.shares[i]), num(t), pctFmt, 450);
    }
    const bar = card.querySelector('.ch-bar span');
    if (bar && last?.bw?.[i] != null && last.bw[i] !== bar.style.width && !reduced())
      bar.animate([{ width: last.bw[i] }, { width: bar.style.width }], { duration: 450, easing: 'cubic-bezier(.2,.8,.2,1)' });
  });
  const bw = [...stage.querySelectorAll('#en-ch .ch-bar span')].map(s => s.style.width);

  // Panel: the headline risk counts; the card pulses on a band change and shakes when it turns high.
  const box = document.getElementById('en-status'), b = box.querySelector('b');
  count(b, last ? Math.round(last.pEsc * 100) : 0, Math.round(R.pEsc * 100), pctFmt, last ? 450 : 700);
  if (last && box.dataset.s !== last.band) { if (box.dataset.s === 'bad') shake(box); else pulse(box); replay(box, 'fx-flash'); }
  if (last) {
    const levers = Object.keys(S.mit).filter(k => S.mit[k] !== last.mit[k]);
    levers.forEach(k => pulse(document.querySelector(`[data-m="${k}"]`)?.closest('.mit')?.querySelector('.sw')));
    document.querySelectorAll('#en-read dd').forEach((dd, i) => { if (last.read[i] !== undefined && dd.textContent !== last.read[i]) replay(dd, 'fx-flash'); });
  }
  last = { plan, bars, pEsc: R.pEsc, band: box.dataset.s, shares, bw, mit: { ...S.mit }, read: [...document.querySelectorAll('#en-read dd')].map(d => d.textContent) };
}
