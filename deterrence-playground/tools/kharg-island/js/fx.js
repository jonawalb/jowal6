// Motion for Kharg Island: presentation only. Nothing here changes a number or waits on the game; every
// effect is skipped under prefers-reduced-motion (the shared helpers and the CSS both check it).
import { reduced, pulse, shake, flash, ping as ping0, burst, tracer } from '../../../shared/js/motion.js';
// Start rings on the next frame: the shared ring can compute a negative radius on its first frame when the
// frame timestamp predates the call (reported for shared/js/motion.js).
const ping = (...a) => requestAnimationFrame(() => ping0(...a));

const $ = id => document.getElementById(id);
const trailer = () => document.documentElement.dataset.skin === 'trailer';
const later = (ms, f) => setTimeout(f, ms);

/** Restart a CSS animation class on an element. */
function replay(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

/** Centre of an SVG element in the map's user units, or null when it is not drawn (hidden on phones). */
function centre(node) {
  if (!node || !node.getClientRects().length) return null;
  const b = node.getBBox();
  return [b.x + b.width / 2, b.y + b.height / 2];
}

/** Tween a number in an element from `from` to `to`, ending on the exact text the page rendered. */
function tweenText(el, from, to, fmt, ms = 650) {
  if (!el || reduced() || from === to || !Number.isFinite(from)) return;
  const final = el.textContent, t0 = performance.now();
  const step = now => {
    const u = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - u, 3);
    el.textContent = u < 1 ? fmt(from + (to - from) * e) : final;
    if (u < 1) requestAnimationFrame(step);
  };
  el.textContent = fmt(from);
  requestAnimationFrame(step);
}

/** A meter bar that slides from its old width to the one just rendered. */
function slide(span, fromPct) {
  if (!span || reduced()) return;
  const to = span.style.width;
  span.style.transition = 'none'; span.style.width = fromPct + '%';
  void span.offsetWidth;
  span.style.transition = 'width .6s cubic-bezier(.2,.8,.2,1)'; span.style.width = to;
}

/** The die face for the combat roll (shown in the trailer look; tumbles in on a new turn). */
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
export function dieHtml(n) {
  return `<span class="kh-die" aria-hidden="true" data-n="${n}">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `<i${PIPS[n].includes(i) ? ' class="p"' : ''}></i>`).join('')}</span>`;
}

/**
 * Effects for stepping forward one turn: rolls tumble in, the combat table finds its cell, shots fly on the
 * map, meters slide and numbers count to their new values. `prev` and `st` are the states before and after.
 */
export function turnFx({ svg, T, prev, st, cfg, last, outcome, was = [] }) {
  if (reduced()) return;
  const rich = trailer();
  // Turn log: rows slide in, then each die tumbles and lands on its value.
  const rows = [...document.querySelectorAll('#log tbody tr')];
  rows.forEach((r, i) => { r.style.animationDelay = Math.min(i * 28, 520) + 'ms'; });
  document.querySelectorAll('#log .roll').forEach((d, i) => { d.style.animationDelay = Math.min(120 + i * 22, 760) + 'ms'; });
  replay($('log'), 'kh-anim');

  // Combat results table: the column lights top to bottom, the die lands, the result cell pops.
  if (T.crt) {
    document.querySelectorAll('#crt td.col').forEach((c, i) => { c.style.animationDelay = i * 55 + 'ms'; });
    replay($('crt'), 'kh-anim');
    replay($('crt-note'), 'kh-anim');
  }

  // State readout: values that moved get a brief highlight.
  document.querySelectorAll('#readout dd').forEach((dd, i) => { if (was[i] != null && was[i] !== dd.textContent) flash(dd); });

  // Escalation, cost and oil price count to their new values; meters slide.
  const escB = document.querySelector('#esc .lbl b.num'), costB = document.querySelectorAll('#esc .lbl b.num')[1];
  tweenText(escB, prev.esc, st.esc, n => String(Math.round(n)));
  tweenText(costB, prev.cost, st.cost, n => String(Math.round(n)));
  tweenText(document.querySelector('#oil .lbl b.num'), prev.price, st.price, n => `$${Math.round(n)}`);
  const meters = document.querySelectorAll('#esc .meter > span');
  slide(meters[0], Math.min(100, prev.esc)); slide(meters[1], Math.min(100, prev.cost));
  if (st.esc > prev.esc) { replay(document.querySelector('#esc'), 'kh-alarm'); }
  Object.keys(st.ev).forEach((k, i) => { if (st.ev[k] > prev.ev[k]) flash(document.querySelectorAll('#esc .chips li')[i]); });

  mapFx(svg, T, prev, st, cfg, rich);

  // Last turn: the result line rises in; a bad end shakes the table.
  if (last) {
    const end = document.querySelector('#log .endline');
    if (end) later(rows.length * 28 + 250, () => replay(end, 'kh-end'));
    if (outcome === 'fail') later(700, () => shake($('box')));
  }
}

function mapFx(svg, T, prev, st, cfg, rich) {
  const us = centre(svg.querySelector('.kh-uszone .kh-usarea'));
  const irZone = svg.querySelector('.kh-zone rect');
  const ir = centre(irZone);
  const toks = [...svg.querySelectorAll('.kh-zone .kh-tok')];
  const ships = [...svg.querySelectorAll('.kh-uszone .kh-ship')];
  const nA = cfg.ir.ascm, nD = cfg.ir.drones, amph = cfg.us.meu * 3;
  let delay = 0;
  const shot = (from, to, color, onHit, gap = 110) => {
    if (!from || !to) return;
    later(delay, () => tracer(svg, from[0], from[1], to[0], to[1], { color, ms: rich ? 520 : 420, width: rich ? 2.6 : 2 }).then(onHit));
    delay += gap;
  };

  // U.S. strikes on Iran's launchers, drone teams and boats: one tracer per token destroyed this turn.
  const killed = [];
  for (let i = st.ascm; i < prev.ascm; i++) killed.push(i);
  for (let i = st.drones; i < prev.drones; i++) killed.push(nA + i);
  for (let i = st.fac; i < prev.fac; i++) killed.push(nA + nD + i);
  const strikeFrom = us ? [us[0] + 14, us[1] - 18] : null;
  for (const i of killed.slice(0, 8)) {
    const at = centre(toks[i]);
    shot(strikeFrom, at, 'var(--accent)', () => burst(svg, at[0], at[1], { color: 'var(--accent)', n: rich ? 14 : 10, r: rich ? 26 : 20 }));
  }
  const struck = T.rows.some(r => r.ph === 'Strikes' && r.p != null);
  if (struck && !killed.length && ir) shot(strikeFrom, [ir[0], ir[1] + 10], 'var(--accent)', () => ping(svg, ir[0], ir[1] + 10, { color: 'var(--accent)', r: 26 }));

  // Iran's salvos, drone waves and swarms at the ships. Hits burst on the ship that went out of action.
  const lost = [];
  for (let i = st.amph; i < prev.amph; i++) lost.push(i);
  for (let i = st.ddg; i < prev.ddg; i++) lost.push(amph + i);
  const raids = T.rows.filter(r => ['Missile salvos', 'Drone waves', 'FAC swarms'].includes(r.ph) && r.rolls.length).length;
  const irFrom = ir ? [ir[0] - 60, ir[1] + 30] : null;
  if (irFrom && us) {
    for (let k = 0; k < Math.min(3, Math.max(raids, lost.length)); k++) {
      const tgt = lost[k] != null ? centre(ships[lost[k]]) : [us[0] + (k - 1) * 18, us[1] - 4];
      const hit = lost[k] != null;
      shot(irFrom, tgt, 'var(--red)', () => {
        if (hit) { burst(svg, tgt[0], tgt[1], { color: 'var(--red)', n: rich ? 16 : 12, r: rich ? 30 : 22 }); shake($('box')); }
        else ping(svg, tgt[0], tgt[1], { color: 'var(--us)', r: rich ? 30 : 22 });
      }, 140);
    }
  }

  // Reinforcements from the mainland: a red run down the route, or a ping where they were turned back.
  if (st.lastReinf != null && prev !== st) {
    const route = svg.querySelector('.kh-reinf');
    if (route && route.getClientRects().length) {
      const L = route.getTotalLength(), a = route.getPointAtLength(0), b = route.getPointAtLength(L), m = route.getPointAtLength(L / 2);
      if (st.lastReinf) shot([a.x, a.y], [b.x, b.y], 'var(--red)', null);
      else later(delay, () => ping(svg, m.x, m.y, { color: 'var(--accent)', r: 28 }));
    }
  }

  // Ground: the lodgment pings when it grows or advances; the garrison bursts when it loses strength.
  const lodge = centre(svg.querySelector('.kh-lodge circle'));
  if (lodge && (st.ashore > prev.ashore + 0.01 || st.progress > prev.progress)) later(delay + 80, () => ping(svg, lodge[0], lodge[1], { color: 'var(--us)', r: rich ? 34 : 26 }));
  const garr = centre(svg.querySelector('.kh-garr rect'));
  if (garr && st.garrison < prev.garrison - 0.01) later(delay + 160, () => burst(svg, garr[0], garr[1], { color: 'var(--accent)', n: 10, r: 18 }));
  if (lodge && st.ashore < prev.ashore - 0.01) later(delay + 160, () => burst(svg, lodge[0], lodge[1], { color: 'var(--red)', n: 10, r: 18 }));
}

/** A pulse on the button that moved the game on. */
export const press = btn => pulse(btn);

// ---- Monte Carlo: the 1,000 replays fill the outcome bar -------------------------------------------------
let seen = false, io = null, pending = null;
/**
 * First time the card is on screen, the replays pour in: a counter runs to 1,000 while the outcome bar fills
 * in its final proportions and the counts climb. Later updates slide from the previous shares.
 */
export function mcFx(box, mc, prevShares) {
  if (reduced()) return;
  const stagger = () => {
    box.querySelectorAll('.eb-bar span').forEach((s, i) => { s.style.animationDelay = i * 60 + 'ms'; });
    box.querySelectorAll('td.dbar span').forEach((s, i) => { s.style.animationDelay = 200 + Math.floor(i / 2) * 35 + 'ms'; });
  };
  if (seen) {
    stagger(); replay(box, 'kh-anim');
    if (prevShares) box.querySelectorAll('.mc-bar .seg').forEach((s, i) => {
      const to = s.style.width;
      s.style.transition = 'none'; s.style.width = prevShares[i] + '%'; void s.offsetWidth;
      s.style.transition = 'width .45s cubic-bezier(.2,.8,.2,1)'; s.style.width = to;
    });
    return;
  }
  const run = () => {
    if (reduced()) return;
    seen = true;
    stagger(); replay(box, 'kh-anim');
    const segs = [...box.querySelectorAll('.mc-bar .seg')], finals = segs.map(s => s.style.width);
    const legB = [...box.querySelectorAll('.mc-leg b.num')], legN = [...box.querySelectorAll('.mc-leg .muted.num')];
    const legT = legB.map(b => b.textContent), legNT = legN.map(b => b.textContent);
    const head = $('mc-h'), headT = head.textContent;
    const keys = ['win', 'mixed', 'fail'], n = mc.n, ms = trailer() ? 1300 : 1000, t0 = performance.now();
    box.classList.add('kh-filling');
    segs.forEach(s => { s.style.transition = 'none'; });
    const frame = now => {
      if (!box.contains(segs[0])) return; // a newer result replaced the card
      const u = Math.min(1, (now - t0) / ms), g = Math.round(n * (1 - Math.pow(1 - u, 2)));
      if (u < 1) {
        keys.forEach((k, i) => {
          const c = Math.round(mc[k] * g / n);
          if (segs[i]) segs[i].style.width = c / n * 100 + '%';
          if (legB[i]) legB[i].textContent = `${Math.round(c / n * 100)}%`;
          if (legN[i]) legN[i].textContent = `(${c})`;
        });
        head.textContent = headT.replace(/^[\d,]+/, g.toLocaleString('en-US'));
        requestAnimationFrame(frame);
      } else {
        segs.forEach((s, i) => { s.style.width = finals[i]; s.style.transition = ''; });
        legB.forEach((b, i) => { b.textContent = legT[i]; });
        legN.forEach((b, i) => { b.textContent = legNT[i]; });
        head.textContent = headT;
        box.classList.remove('kh-filling');
        replay(box.querySelector('.mc-bar'), 'kh-done');
      }
    };
    requestAnimationFrame(frame);
  };
  // Wait until the card comes on screen so the fill is seen; the newest result is the one that plays.
  if (!('IntersectionObserver' in window)) { run(); return; }
  pending = run;
  if (io) return;
  io = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    io.disconnect(); io = null; const f = pending; pending = null; f?.();
  }, { threshold: 0 });
  io.observe(box);
}
