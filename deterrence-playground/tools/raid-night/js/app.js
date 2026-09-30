// Raid Night: game loop, input, overlays, URL hash and test hooks.
import { WEAPONS, WEAPON_ORDER, THREATS, SPEED, BREAK_SECONDS, WAVE_TRACKS } from '../data/params.js';
import { RAIDS } from '../data/raids.js';
import { createGame, step, fire, nextWave, liveThreats, tti, coverage, summary, DT } from './sim.js';
import { createRenderer } from './render.js';
import { updateHud } from './hud.js';
import { renderInfo } from './info.js';
import { renderAAR, resultText } from './aar.js';
import { createTour } from './tour.js';
import { randomSeed } from './rng.js';
import { clock, esc } from './fmt.js';

const $ = id => document.getElementById(id);
const canvas = $('field'), overlay = $('overlay');
const R = createRenderer(canvas);

// ---- state ----
const q = new URLSearchParams(location.hash.slice(1));
const hashSeed = parseInt(q.get('seed'), 10);
let seed = hashSeed >= 1 && hashSeed <= 999999 ? hashSeed : randomSeed();
let reduced = q.has('rm') ? q.get('rm') === '1' : matchMedia('(prefers-reduced-motion: reduce)').matches;
let S, weapon = 'gun', sel = null, hover = null, started = false, paused = false, breakLeft = 0, shownOver = false;
let acc = 0, last = 0, hudAt = 0, lastPhase = '';

function writeHash() {
  history.replaceState(null, '', `#seed=${seed}${reduced ? '&rm=1' : ''}`);
  $('seed').value = seed;
}

function reset(newSeed = seed) {
  seed = newSeed; S = createGame(seed); sel = hover = null; started = false; paused = false; shownOver = false;
  acc = 0; lastPhase = ''; $('aar').hidden = true;
  writeHash(); showReady(); updateHud(S, weapon); syncPause();
}

// ---- overlays ----
const mixLine = w => {
  const r = RAIDS[w], c = S.waves[w].counts;
  return `Raid mix modelled on ${esc(r.name)}: ${c.drone} drones, ${c.cruise} cruise, ${c.ballistic} ballistic.`;
};
function setOverlay(html) { overlay.innerHTML = html; overlay.hidden = !html; }
function showReady() {
  setOverlay(`<div class="ov-card"><p class="eyebrow">Notional model · seed ${seed}</p><h2>Raid Night</h2>
    <p>Three waves, about a minute each. Stop what you can, spend as little as you can.</p>
    <p class="fine">Wave 1. ${mixLine(0)}</p>
    <button type="button" class="btn solid" data-act="start">Start the night</button></div>`);
}
function showBreak() {
  const m = summary(S), w = S.wave;
  setOverlay(`<div class="ov-card"><p class="eyebrow">Wave ${w + 1} of 3 over</p>
    <p><b>${m.leakTotal}</b> leakers so far · <b>${m.dmgTotal}</b> damage points · long-range left <b>${S.ammo.lri}</b></p>
    <p class="fine">Next: wave ${w + 2}. ${mixLine(w + 1)}</p>
    <button type="button" class="btn solid" data-act="next">Start wave ${w + 2} <span class="num" id="brk"></span></button></div>`);
}
function showPaused() {
  setOverlay(`<div class="ov-card"><h2>Paused</h2><p class="fine">Press P or the button to resume.</p>
    <button type="button" class="btn solid" data-act="resume">Resume</button></div>`);
}
overlay.addEventListener('click', e => {
  const a = e.target.closest('[data-act]')?.dataset.act;
  if (a === 'start') start();
  else if (a === 'next') goNext();
  else if (a === 'resume') setPaused(false);
  else if (a === 'aar') $('aar').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
});

// ---- flow ----
function start() {
  if (started) return;
  started = true; paused = false; setOverlay(''); announce(`Wave 1 begins. ${RAIDS[0].short} mix.`);
  canvas.focus({ preventScroll: true }); syncPause();
}
function goNext() {
  if (!nextWave(S)) return;
  setOverlay(''); announce(`Wave ${S.wave + 1} begins. ${RAIDS[S.wave].short} mix.`);
  canvas.focus({ preventScroll: true });
}
function setPaused(p) {
  if (!started || S.phase === 'over') return;
  paused = p;
  if (p) showPaused(); else if (S.phase === 'break') showBreak(); else setOverlay('');
  syncPause();
}
function syncPause() {
  const b = $('pause');
  b.textContent = paused ? 'Resume' : 'Pause';
  b.setAttribute('aria-pressed', String(paused));
  b.disabled = !started || S.phase === 'over';
}
function finish() {
  shownOver = true;
  const you = summary(S);
  renderAAR(you, seed);
  $('aar').hidden = false;
  setOverlay(`<div class="ov-card"><p class="eyebrow">Night over</p><p><b>${you.leakTotal}</b> leakers · <b>${you.dmgTotal}</b> damage points</p>
    <button type="button" class="btn solid" data-act="aar">See the after-action review</button></div>`);
  announce(`Night over. ${you.leakTotal} leakers. After-action review below.`);
  syncPause();
  $('aar').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  $('aar-h').setAttribute('tabindex', '-1'); $('aar-h').focus({ preventScroll: true });
}

// ---- engagement ----
const REASON = {
  range: w => `Out of range for ${WEAPONS[w].lc}. Try another weapon or wait.`,
  reload: w => `Every site with ${WEAPONS[w].lc} in range is reloading.`,
  empty: w => `${WEAPONS[w].name} magazine is empty.`,
  ineffective: () => 'Guns and EW cannot stop a ballistic missile.',
  gone: () => 'That track is gone.', idle: () => '',
};
let toastT = 0;
function toast(msg) { $('toast').textContent = msg; toastT = performance.now(); }
function assign(id, w = weapon) {
  const r = fire(S, w, id);
  if (!r.ok) toast(REASON[r.reason](w));
  else toast('');
  return r;
}
function announce(msg) { $('game-live').textContent = msg; }
function describeSel() {
  const th = S.threats.find(t => t.alive && t.id === sel);
  $('sel-live').textContent = th ? `${THREATS[th.type].name}, ${tti(th).toFixed(0)} seconds to impact, bound for City ${th.city}${coverage(S, th) ? ', already engaged' : ''}.` : '';
}
function cycle(d) {
  const live = liveThreats(S).sort((a, b) => tti(a) - tti(b));
  if (!live.length) { sel = null; describeSel(); return; }
  const i = live.findIndex(t => t.id === sel);
  sel = live[i < 0 ? 0 : (i + d + live.length) % live.length].id;
  describeSel();
}
function setWeapon(w) { weapon = w; updateHud(S, weapon); }

// ---- input ----
canvas.addEventListener('pointerdown', e => {
  if (!started) { start(); return; }
  const r = canvas.getBoundingClientRect();
  const th = R.pick(S, e.clientX - r.left, e.clientY - r.top, e.pointerType === 'touch' ? 38 : 26);
  if (!th) { toast(S.phase === 'wave' ? 'No track there.' : ''); return; }
  sel = th.id; describeSel();
  if (!paused) assign(th.id);
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const r = canvas.getBoundingClientRect();
  hover = R.pick(S, e.clientX - r.left, e.clientY - r.top, 26)?.id ?? null;
  canvas.style.cursor = hover ? 'crosshair' : 'default';
});
canvas.addEventListener('pointerleave', () => { hover = null; });
document.querySelectorAll('.wbtn').forEach(b => b.addEventListener('click', () => setWeapon(b.dataset.w)));
$('sel-prev').onclick = () => cycle(-1);
$('sel-next').onclick = () => cycle(1);
$('fire-sel').onclick = () => { if (!started) return start(); if (sel == null) cycle(0); if (sel != null && !paused) assign(sel); };
$('pause').onclick = () => setPaused(!paused);

document.addEventListener('keydown', e => {
  if (e.target.closest?.('input, textarea, select, [role="dialog"]') || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (k === '1' || k === '2' || k === '3') { setWeapon(WEAPON_ORDER[+k - 1]); return; }
  if (k === 'p' || k === 'P' || (k === 'Escape' && started)) { setPaused(!paused); e.preventDefault(); return; }
  if ((k === 'n' || k === 'N') && S.phase === 'break') { goNext(); return; }
  // While a wave is running the arrows, Space and Tab work anywhere on the page (not only with the field focused).
  // Paused or between waves, Tab goes back to moving between controls.
  const live = started && !paused && S.phase === 'wave';
  if (k === 'Tab' && live) {
    const i = WEAPON_ORDER.indexOf(weapon), n = WEAPON_ORDER.length;
    setWeapon(WEAPON_ORDER[(i + (e.shiftKey ? n - 1 : 1)) % n]); e.preventDefault(); return;
  }
  const inGame = document.activeElement === canvas || live;
  if (!inGame) return;
  if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'k' || k === 'K') { cycle(1); e.preventDefault(); }
  else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'j' || k === 'J') { cycle(-1); e.preventDefault(); }
  else if (k === ' ' || k === 'Enter') {
    e.preventDefault();
    if (!started) return start();
    if (S.phase === 'break') return goNext();
    if (sel == null || !S.threats.some(t => t.alive && t.id === sel)) cycle(0);
    if (sel != null && !paused) assign(sel);
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && started && !paused && S.phase === 'wave') setPaused(true); });

// ---- settings ----
$('seed').addEventListener('change', () => {
  const v = parseInt($('seed').value, 10);
  if (v >= 1 && v <= 999999) reset(v); else $('seed').value = seed;
});
$('new-seed').onclick = () => reset(randomSeed());
$('restart').onclick = () => reset(seed);
$('reduced').checked = reduced;
$('reduced').addEventListener('change', () => { reduced = $('reduced').checked; writeHash(); });
async function copy(text, btn) {
  const old = btn.textContent;
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
  catch { prompt('Copy this:', text); }
  setTimeout(() => { btn.textContent = old; }, 1600);
}
$('copy-link').onclick = e => copy(location.href, e.currentTarget);
$('aar-copy').onclick = e => copy(resultText(summary(S), seed, location.href), e.currentTarget);
$('aar-again').onclick = () => { reset(seed); $('fieldbox').scrollIntoView({ block: 'center' }); };
$('aar-new').onclick = () => { reset(randomSeed()); $('fieldbox').scrollIntoView({ block: 'center' }); };

const tour = createTour($('tour-slot'), {
  onOpen: () => { if (started && !paused) setPaused(true); },
  onClose: () => {},
});
$('start-tour').onclick = () => tour.start();

// ---- loop ----
function frame(ts) {
  const dt = Math.min(0.1, (ts - (last || ts)) / 1000); last = ts;
  if (started && !paused) {
    if (S.phase === 'wave') {
      acc += dt * (reduced ? SPEED.reduced : SPEED.normal);
      while (acc >= DT && S.phase === 'wave') { step(S); acc -= DT; }
    } else if (S.phase === 'break' && !tour.open) {
      breakLeft -= dt;
      const b = $('brk'); if (b) b.textContent = `(${Math.max(0, Math.ceil(breakLeft))})`;
      if (breakLeft <= 0) goNext();
    }
  }
  if (S.phase !== lastPhase) {
    if (S.phase === 'break') { breakLeft = BREAK_SECONDS; if (!paused) showBreak(); announce(`Wave ${S.wave + 1} over.`); }
    if (S.phase === 'over' && !shownOver) finish();
    lastPhase = S.phase;
  }
  if (sel != null && !S.threats.some(t => t.alive && t.id === sel)) sel = null;
  const targeted = new Set(S.shots.map(s => s.target));
  R.draw(S, { weapon, sel, hover, reduced, targeted });
  if (ts - hudAt > 100) {
    hudAt = ts; updateHud(S, weapon);
    $('wave-t').textContent = `Wave ${S.wave + 1} of 3`;
    $('mix-t').textContent = `· raid mix modelled on ${RAIDS[S.wave].short}`;
    $('clock').textContent = clock(S.time);
    if (sel != null) describeSel();
    if (toastT && ts - toastT > 2200) { $('toast').textContent = ''; toastT = 0; }
  }
  requestAnimationFrame(frame);
}

// ---- boot ----
function fit() { R.resize(); }
new ResizeObserver(fit).observe(canvas);
renderInfo();
reset(seed);
fit();
requestAnimationFrame(frame);

// Test and scripting hooks.
window.raidNight = {
  start, pause: () => setPaused(true), resume: () => setPaused(false), next: goNext,
  get paused() { return paused; },
  assign: (id, w) => assign(id, w || weapon),
  tracks: () => liveThreats(S).map(t => ({ id: t.id, type: t.type, city: t.city, tti: +tti(t).toFixed(2), x: Math.round(t.x), y: Math.round(t.y), covered: +coverage(S, t).toFixed(2) })),
  /** Run the simulation forward synchronously by game seconds (works while paused). */
  advance: sec => { for (let i = 0; i < Math.round(sec / DT) && S.phase === 'wave'; i++) step(S); },
  state: () => ({ seed, phase: started ? S.phase : 'ready', wave: S.wave + 1, time: +S.time.toFixed(1), ammo: { ...S.ammo }, ...summary(S) }),
  reset: s => reset(s || seed), weapons: () => WEAPON_ORDER.slice(), waveTracks: WAVE_TRACKS,
};
