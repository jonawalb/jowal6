// Page motion for Raid Night (outside the canvas): a pulse on the control that fired, flashes on magazine and
// cost readouts that change, a shake on the damage readout when a city is hit, and cards that rise in.
// Presentation only: nothing here reads or writes game state, and every call is a no-op under reduced motion
// (the system preference, via shared/js/motion.js, or the game's own reduced-motion setting).
import { pulse, flash, shake, countUp, reveal, reduced as prefersReduced } from '../../../shared/js/motion.js';

const $ = id => document.getElementById(id);
let gameCalm = () => false;
const calm = () => gameCalm() || prefersReduced();

/** Tell fx how to read the game's own reduced-motion setting. */
export function initFx({ isReduced }) { gameCalm = isReduced; }

/** The weapon (or battery munition) button that fired, and the on-screen Fire button if it was used. */
export function fired(k, w, viaButton = false) {
  if (calm()) return;
  const b = k === 'N' ? document.querySelector(`.wbtn[data-w="${w}"]`) : document.querySelector(`.bbtn[data-b="${k}"][data-w="${w}"]`);
  pulse(b);
  if (viaButton) pulse($('fire-sel'));
}

/** Renderer events: a leak shakes the damage readout. */
export function gameEvent(e) {
  if (e.k !== 'leak' || calm()) return;
  const dl = $('leaks');
  shake(dl.closest('.sec') || dl);
  flash(dl);
}

// Readouts that the HUD rewrites ten times a second: flash only when the text really changes.
const prev = new Map();
/** Set text and flash the element if the value changed (not on the first write). */
export function setText(el, text) {
  if (el.textContent === text) return;
  const had = prev.has(el);
  el.textContent = text; prev.set(el, text);
  if (had && !calm()) flash(el);
}

/** Magazine rows: countdown flash on each shot, a shake when one runs dry. */
export function magTick(row, before, after) {
  if (before == null || before === after || calm()) return;
  const n = row.querySelector('.num');
  flash(n);
  if (after === 0 && before > 0) shake(row);
}

/** An overlay card that just appeared rises in; the end-of-night numbers count up. */
export function cardIn(card, { count = false } = {}) {
  if (!card || calm()) return;
  card.classList.remove('rn-in'); void card.offsetWidth; card.classList.add('rn-in');
  if (count) card.querySelectorAll('p > b').forEach(b => { const v = +b.textContent; if (Number.isFinite(v)) countUp(b, v, { from: 0, ms: 650 }); });
}

/** After-action review: cards rise in with a stagger. */
export function aarIn() {
  if (calm()) return;
  const els = document.querySelectorAll('#aar .aar-card, #aar .aar-actions');
  els.forEach(e => e.classList.remove('m-in'));
  reveal(els);
}

/** A new wave: pulse the wave title. */
export function waveIn() { if (!calm()) pulse($('wave-t')); }
