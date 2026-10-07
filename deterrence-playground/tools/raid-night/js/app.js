// Raid Night: game loop, input, overlays, URL hash and test hooks.
import { WEAPONS, WEAPON_ORDER, THREATS, SPEED, WAVE_TRACKS, FIELD, BATTERIES, ALL_SITES, MODES, MODE_NAME, RESUPPLY } from '../data/params.js';
import { RAIDS } from '../data/raids.js';
import { createGame, step, fire, canFire, nextWave, liveThreats, tti, coverage, summary, DT } from './sim.js';
import { createRenderer } from './render.js';
import { updateHud, buildControls } from './hud.js';
import { renderInfo } from './info.js';
import { renderAAR, resultText } from './aar.js';
import { learnButton, runLesson } from '../../../shared/js/learn.js';
import { lessonSteps, LESSON_SEED, SHEET } from './lesson.js';
import { randomSeed } from './rng.js';
import { clock, esc } from './fmt.js';
import { ORDER_KEYS, orderInfo, ordered, autoLock, cycleId } from './targeting.js';
import { emptyOrder, canAdd, applyResupply, proportionalOrder, orderCost } from './resupply.js';
import { readyHTML, breakHTML, pausedHTML, overHTML } from './overlays.js';
import { initFx, fired, gameEvent, cardIn, aarIn, waveIn } from './fx.js';

const $ = id => document.getElementById(id);
const canvas = $('field'), overlay = $('overlay');
const R = createRenderer(canvas, { onEvent: gameEvent });

// ---- state ----
const q = new URLSearchParams(location.hash.slice(1));
const hashSeed = parseInt(q.get('seed'), 10);
let seed = hashSeed >= 1 && hashSeed <= 999999 ? hashSeed : randomSeed();
let reduced = q.has('rm') ? q.get('rm') === '1' : matchMedia('(prefers-reduced-motion: reduce)').matches;
const pickMode = m => (MODES.includes(m) ? m : 'normal');
let mode = pickMode(q.get('mode'));
let modeFromLink = q.has('mode'); // true until the first night starts: the ready card says the link chose the mode
let lock = ORDER_KEYS.includes(q.get('lock')) ? q.get('lock') : 'closest';
// Batteries: normal mode has one ("N") that uses every site; hard mode has L and R, each with its own sites.
let bats = {}, order = emptyOrder(), batFired = { L: 0, R: 0 };
let S, hover = null, started = false, paused = false, shownOver = false;
let acc = 0, last = 0, hudAt = 0, lastPhase = '';
let hold = false, lesson = null; // hold: the tutorial freezes the clock while the player reads

const makeBats = () => (mode === 'hard'
  ? { L: { sel: null, weapon: 'gun' }, R: { sel: null, weapon: 'gun' } }
  : { N: { sel: null, weapon: 'gun' } });
const sitesOf = (k, w) => (k === 'N' ? ALL_SITES[w] : BATTERIES[k].sites[w]);
const batName = k => (k === 'N' ? '' : BATTERIES[k].name);
const citiesOf = k => (k === 'N' ? null : BATTERIES[k].cities);

function writeHash() {
  history.replaceState(null, '', `#seed=${seed}&mode=${mode}${lock !== 'closest' ? `&lock=${lock}` : ''}${reduced ? '&rm=1' : ''}`);
  $('seed').value = seed;
}

const ARIA = {
  easy: 'Raid Night game field, easy mode (normal controls, larger resupply). Incoming tracks fly from the sea at the top toward four cities on the coast. Keys: arrow keys select a track in the chosen lock order; Space fires; Tab (or 1, 2, 3) switches between guns, short-range and long-range; O changes the lock order; P pauses.',
  normal: 'Raid Night game field, normal mode. Incoming tracks fly from the sea at the top toward four cities on the coast. Keys: arrow keys select a track in the chosen lock order; Space fires; Tab (or 1, 2, 3) switches between guns, short-range and long-range; O changes the lock order; P pauses.',
  hard: 'Raid Night game field, hard mode with two batteries. Incoming tracks fly from the sea toward four cities. Left battery defends cities A and B: W fires, A and D select a track, Tab switches munition. Right battery defends cities C and D: Space or Up arrow fires, Left and Right arrows select a track, Return, Backslash or Delete switches munition. O changes the lock order; P pauses.',
};
function syncMode() {
  document.body.dataset.gameMode = mode;
  $('weapons').hidden = mode === 'hard';
  $('bats').hidden = mode !== 'hard';
  $('hard-note').hidden = mode !== 'hard';
  ['sel-prev', 'fire-sel', 'sel-next'].forEach(id => { $(id).hidden = mode === 'hard'; });
  canvas.setAttribute('aria-label', ARIA[mode]);
  $('mode-now').textContent = mode === 'hard' ? 'Hard (two batteries)' : MODE_NAME[mode];
  if (S) S.budget = RESUPPLY.budget[mode];
}

function reset(newSeed = seed) {
  seed = newSeed; S = createGame(seed, { budget: RESUPPLY.budget[mode] }); hover = null; started = false; paused = false; shownOver = false;
  bats = makeBats(); order = emptyOrder(); batFired = { L: 0, R: 0 };
  acc = 0; lastPhase = ''; $('aar').hidden = true;
  writeHash(); syncMode(); showReady(); hud(); syncPause();
}

// A restart, new raids, a new seed or a replay chosen by the player ends any running lesson and frees the clock.
function resetByPlayer(newSeed) { lesson?.stop(); hold = false; reset(newSeed); }

// ---- overlays ----
const mixLine = w => {
  const r = RAIDS[w], c = S.waves[w].counts;
  return `Raid mix modelled on ${esc(r.name)}: ${c.drone} drones, ${c.cruise} cruise, ${c.ballistic} ballistic.`;
};
function setOverlay(html, tall = false) {
  const was = overlay.hidden || !overlay.innerHTML;
  overlay.innerHTML = html; overlay.hidden = !html; overlay.classList.toggle('tall', tall);
  if (html && was) cardIn(overlay.querySelector('.ov-card'));
}
function showReady() {
  setOverlay(readyHTML(seed, mode, mixLine(0), modeFromLink), true);
  learnButton(overlay.querySelector('.ov-card'), { slug: 'raid-night', minutes: 4, onStart: startLesson, sheet: SHEET });
}
function showBreak(keepFocus) {
  const f = keepFocus && document.activeElement?.closest?.('#overlay [data-act]');
  const sig = f ? `[data-act="${f.dataset.act}"]${f.dataset.w ? `[data-w="${f.dataset.w}"]` : ''}` : '';
  setOverlay(breakHTML(S, order, summary(S), S.wave, mixLine(S.wave + 1)), true);
  const back = sig && overlay.querySelector(sig);
  (back && !back.disabled ? back : overlay.querySelector('[data-act="next"]'))?.focus({ preventScroll: true });
}
overlay.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'start') start(b.dataset.mode);
  else if (a === 'next') goNext();
  else if (a === 'resume') setPaused(false);
  else if (a === 'aar') $('aar').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  else if (a === 'add' && canAdd(S, order, b.dataset.w)) { order[b.dataset.w]++; showBreak(true); }
  else if (a === 'sub' && order[b.dataset.w] > 0) { order[b.dataset.w]--; showBreak(true); }
  else if (a === 'fill') { order = proportionalOrder(S); showBreak(true); }
  else if (a === 'clear') { order = emptyOrder(); showBreak(true); }
});

// ---- flow ----
function start(m) {
  if (started) return;
  if (m && m !== mode) { mode = pickMode(m); bats = makeBats(); syncMode(); }
  writeHash();
  modeFromLink = false;
  started = true; paused = false; setOverlay('');
  announce(`${MODE_NAME[mode]} mode. Wave 1 begins. ${RAIDS[0].short} mix.`);
  canvas.focus({ preventScroll: true }); syncPause();
}
function goNext() {
  if (S.phase !== 'break') return;
  const got = applyResupply(S, order);
  order = emptyOrder();
  nextWave(S);
  setOverlay('');
  const bought = WEAPON_ORDER.filter(w => got[w]).map(w => `${got[w]} ${WEAPONS[w].lc}`).join(', ');
  announce(`${bought ? `Loaded ${bought}. ` : ''}Wave ${S.wave + 1} begins. ${RAIDS[S.wave].short} mix.`);
  waveIn();
  canvas.focus({ preventScroll: true });
}
function setPaused(p) {
  if (!started || S.phase === 'over') return;
  paused = p;
  if (p) setOverlay(pausedHTML()); else if (S.phase === 'break') showBreak(); else setOverlay('');
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
  renderAAR(you, seed, { mode, batFired, lock });
  $('aar').hidden = false;
  setOverlay(overHTML(you, mode));
  cardIn(overlay.querySelector('.ov-card'), { count: true });
  aarIn();
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
function assign(k, id, w = bats[k].weapon, viaButton = false) {
  const r = fire(S, w, id, k === 'N' ? null : sitesOf(k, w));
  if (!r.ok) toast((k === 'N' ? '' : `${batName(k)}: `) + REASON[r.reason](w));
  else { toast(''); if (k !== 'N') batFired[k]++; fired(k, w, viaButton); }
  return r;
}
function announce(msg) { $('game-live').textContent = msg; }
const alive = id => id != null && S.threats.some(t => t.alive && t.id === id);
function describeSel() {
  $('sel-live').textContent = Object.entries(bats).map(([k, b]) => {
    const th = S.threats.find(t => t.alive && t.id === b.sel);
    if (!th) return '';
    return `${k === 'N' ? '' : `${batName(k)}, ${WEAPONS[b.weapon].short}: `}${THREATS[th.type].name}, ${tti(th).toFixed(0)} seconds to impact, bound for City ${th.city}${coverage(S, th) ? ', already engaged' : ''}.`;
  }).filter(Boolean).join(' ');
}
function cycle(k, d) {
  const b = bats[k];
  b.sel = cycleId(ordered(S, lock), b.sel, d, b.weapon, sitesOf(k, b.weapon), citiesOf(k));
  describeSel();
}
function fireBat(k, viaButton = false) {
  if (!started) return start();
  if (S.phase === 'break') return goNext();
  if (!alive(bats[k].sel)) cycle(k, 0);
  if (bats[k].sel != null && !paused) assign(k, bats[k].sel, undefined, viaButton);
}
function setWeapon(k, w) { bats[k].weapon = w; hud(); }
function cycleWeapon(k, d) {
  const i = WEAPON_ORDER.indexOf(bats[k].weapon), n = WEAPON_ORDER.length;
  setWeapon(k, WEAPON_ORDER[(i + d + n) % n]);
}
function setLock(k) {
  if (!ORDER_KEYS.includes(k)) return;
  lock = k; writeHash(); hud();
  announce(`Lock order: ${orderInfo(k).help}.`);
}
function hud() { updateHud(S, bats, mode, lock); }

// ---- input ----
canvas.addEventListener('pointerdown', e => {
  if (!started) return;
  const r = canvas.getBoundingClientRect();
  const th = R.pick(S, e.clientX - r.left, e.clientY - r.top, e.pointerType === 'touch' ? 38 : 26);
  if (!th) { toast(S.phase === 'wave' ? 'No track there.' : ''); return; }
  // Hard mode: the tap goes to the nearer battery, the one on the same half of the map as the track.
  const k = mode === 'hard' ? (th.x < FIELD.W / 2 ? 'L' : 'R') : 'N';
  bats[k].sel = th.id; describeSel();
  if (!paused) assign(k, th.id);
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const r = canvas.getBoundingClientRect();
  hover = R.pick(S, e.clientX - r.left, e.clientY - r.top, 26)?.id ?? null;
  canvas.style.cursor = hover ? 'crosshair' : 'default';
});
canvas.addEventListener('pointerleave', () => { hover = null; });
buildControls({ onWeapon: (k, w) => setWeapon(k, w), onLock: k => setLock(k) });
$('sel-prev').onclick = () => cycle('N', -1);
$('sel-next').onclick = () => cycle('N', 1);
$('fire-sel').onclick = () => fireBat('N', true);
$('pause').onclick = () => setPaused(!paused);

// Hard-mode key map, matched on KeyboardEvent.key (letters case-insensitive). Backspace is the Mac delete key.
const rSwitch = e => cycleWeapon('R', e.shiftKey ? -1 : 1);
const HARD = {
  w: () => fireBat('L'), a: () => cycle('L', -1), d: () => cycle('L', 1), Tab: e => cycleWeapon('L', e.shiftKey ? -1 : 1),
  ' ': () => fireBat('R'), ArrowUp: () => fireBat('R'), ArrowLeft: () => cycle('R', -1), ArrowRight: () => cycle('R', 1),
  Enter: rSwitch, '\\': rSwitch, Delete: rSwitch, Backspace: rSwitch,
};
document.addEventListener('keydown', e => {
  if (e.target.closest?.('input, textarea, select, [role="dialog"]') || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (k === 'p' || k === 'P' || (k === 'Escape' && started)) { setPaused(!paused); e.preventDefault(); return; }
  if ((k === 'n' || k === 'N') && started && S.phase === 'break') { goNext(); return; }
  if (k === 'o' || k === 'O') { setLock(ORDER_KEYS[(ORDER_KEYS.indexOf(lock) + (e.shiftKey ? 3 : 1)) % 4]); return; }
  // While a wave is running the game keys work anywhere on the page (not only with the field focused).
  // Paused or between waves, Tab goes back to moving between controls.
  const live = started && !paused && S.phase === 'wave';
  const inGame = document.activeElement === canvas || live;
  if (mode === 'hard') {
    const act = HARD[k.length === 1 ? k.toLowerCase() : k];
    if (!act) { if (live && k === 'ArrowDown') e.preventDefault(); return; }
    if (!inGame || (k === 'Tab' && !live)) return;
    e.preventDefault(); act(e); return;
  }
  if (k === '1' || k === '2' || k === '3') { setWeapon('N', WEAPON_ORDER[+k - 1]); return; }
  if (k === 'Tab' && live) { cycleWeapon('N', e.shiftKey ? -1 : 1); e.preventDefault(); return; }
  if (!inGame) return;
  if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'k' || k === 'K') { cycle('N', 1); e.preventDefault(); }
  else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'j' || k === 'J') { cycle('N', -1); e.preventDefault(); }
  else if (k === ' ' || k === 'Enter') { e.preventDefault(); fireBat('N'); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && started && !paused && S.phase === 'wave') setPaused(true); });

// ---- settings ----
$('seed').addEventListener('change', () => {
  const v = parseInt($('seed').value, 10);
  if (v >= 1 && v <= 999999) resetByPlayer(v); else $('seed').value = seed;
});
$('new-seed').onclick = () => resetByPlayer(randomSeed());
$('restart').onclick = () => resetByPlayer(seed);
$('reduced').checked = reduced;
initFx({ isReduced: () => reduced });
$('reduced').addEventListener('change', () => { reduced = $('reduced').checked; writeHash(); });
async function copy(text, btn) {
  const old = btn.textContent;
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
  catch { prompt('Copy this:', text); }
  setTimeout(() => { btn.textContent = old; }, 1600);
}
$('copy-link').onclick = e => copy(location.href, e.currentTarget);
$('aar-copy').onclick = e => copy(resultText(summary(S), seed, location.href, mode), e.currentTarget);
$('aar-again').onclick = () => { resetByPlayer(seed); $('fieldbox').scrollIntoView({ block: 'center' }); };
$('aar-new').onclick = () => { resetByPlayer(randomSeed()); $('fieldbox').scrollIntoView({ block: 'center' }); };

// ---- tutorial: Easy mode, fixed seed ----
const lessonApi = {
  get S() { return S; }, get started() { return started; }, get mode() { return mode; },
  hold: v => { hold = v; },
  /** Run the wave forward (frozen or not) until pred(S) holds, at most `sec` game seconds. */
  advanceUntil: (pred, sec) => { for (let i = 0; i < sec / DT && S.phase === 'wave' && !pred(S); i++) step(S); },
  /** Is a live track of this type inside the reach of this weapon (ready or reloading)? */
  inReach: (type, w) => liveThreats(S).some(t => t.type === type && !['range', 'ineffective', 'gone'].includes(canFire(S, w, t).reason)),
};
function startLesson() {
  lesson?.stop();
  modeFromLink = false; mode = 'easy'; reset(LESSON_SEED);
  $('fieldbox').scrollIntoView({ block: 'start', behavior: 'auto' });
  lesson = runLesson(lessonSteps(lessonApi), { slug: 'raid-night', title: 'Learn to play',
    onExit: () => { hold = false; lesson = null; canvas.focus({ preventScroll: true }); } });
}

// ---- loop ----
function frame(ts) {
  const dt = Math.min(0.1, (ts - (last || ts)) / 1000); last = ts;
  if (started && !paused && !hold && S.phase === 'wave') {
    acc += dt * (reduced ? SPEED.reduced : SPEED.normal);
    while (acc >= DT && S.phase === 'wave') { step(S); acc -= DT; }
  }
  if (S.phase !== lastPhase) {
    if (S.phase === 'break') { if (!paused) showBreak(); announce(`Wave ${S.wave + 1} over. Resupply before the next wave.`); }
    if (S.phase === 'over' && !shownOver) finish();
    lastPhase = S.phase;
  }
  // Auto-lock: a battery whose target is gone locks onto the first reachable track in the lock order
  // (in hard mode, preferring tracks bound for its own cities).
  if (started && S.phase === 'wave') {
    let list = null;
    for (const [k, b] of Object.entries(bats)) {
      if (alive(b.sel)) continue;
      list = list || ordered(S, lock);
      b.sel = list.length ? autoLock(list, b.weapon, sitesOf(k, b.weapon), citiesOf(k)) : null;
    }
  } else for (const b of Object.values(bats)) if (!alive(b.sel)) b.sel = null;
  const targeted = new Set(S.shots.map(s => s.target));
  R.draw(S, { mode, hover, reduced, targeted,
    bats: Object.entries(bats).map(([k, b]) => ({ k, sel: b.sel, weapon: b.weapon, sites: sitesOf(k, b.weapon) })) });
  if (ts - hudAt > 100) {
    hudAt = ts; hud();
    $('wave-t').textContent = `Wave ${S.wave + 1} of 3`;
    $('mix-t').textContent = `· raid mix modelled on ${RAIDS[S.wave].short}`;
    $('clock').textContent = clock(S.time);
    describeSel();
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
const defBat = () => (mode === 'hard' ? 'R' : 'N');
window.raidNight = {
  start, pause: () => setPaused(true), resume: () => setPaused(false), next: goNext,
  get paused() { return paused; },
  get mode() { return mode; },
  get lock() { return lock; },
  /** Choose the mode before the first wave (resets the night). */
  setMode: m => { mode = pickMode(m); reset(seed); },
  setLock,
  bats: () => Object.fromEntries(Object.entries(bats).map(([k, b]) => [k, { ...b }])),
  batFired: () => ({ ...batFired }),
  assign: (id, w, k = defBat()) => assign(k, id, w || bats[k].weapon),
  select: (k, id) => { bats[k].sel = id; describeSel(); },
  order: () => ({ ...order, cost: orderCost(order) }),
  setOrder: o => { order = { ...emptyOrder(), ...o }; if (S.phase === 'break' && !paused) showBreak(); },
  ordered: () => ordered(S, lock).map(t => t.id),
  tracks: () => liveThreats(S).map(t => ({ id: t.id, type: t.type, city: t.city, tti: +tti(t).toFixed(2), x: Math.round(t.x), y: Math.round(t.y), covered: +coverage(S, t).toFixed(2) })),
  /** Run the simulation forward synchronously by game seconds (works while paused). */
  advance: sec => { for (let i = 0; i < Math.round(sec / DT) && S.phase === 'wave'; i++) step(S); },
  state: () => ({ seed, mode, lock, phase: started ? S.phase : 'ready', wave: S.wave + 1, time: +S.time.toFixed(1), ammo: { ...S.ammo }, ...summary(S) }),
  reset: s => reset(s || seed), weapons: () => WEAPON_ORDER.slice(), waveTracks: WAVE_TRACKS,
};
