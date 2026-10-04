// Orbital Denial: state, orders panel, month stepping and rendering.
import { PDEF, MISSIONS, MISSION_KEYS, TURNS, CRISIS_TURNS, DEBRIS0 } from '../data/params.js';
import { newGame, step } from './model.js';
import { ACTS, ACT_KEYS, valid } from './actions.js';
import { legacy } from './plans.js';
import { createOrbit, BG_NOTE } from './orbit.js';
import { logItem, promptFor, outlookHtml, actText, pct } from './views.js';
import { readHash, writeHash } from './hash.js';
import { showAAR } from './aar.js';
import { renderBelow } from './below.js';
import { STEPS, SHEET, LESSON_SEED } from './lesson.js';
import { learnButton, runLesson } from '../../../shared/js/learn.js';
import { fxLayer, monthFx, countTo, countFrags, logFx, aarFx } from './fx.js';

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const h0 = readHash();
const st = { seed: h0.seed || 1 + Math.floor(Math.random() * 999998), redSetting: h0.redSetting, fragMult: h0.fragMult, plan: [] };
let P, g, pending = [], sel = null;

const orbit = createOrbit($('orbit'), { onPick: m => choose(m) });
$('bg-note').textContent = BG_NOTE;
const fx = fxLayer($('orbit'));

// ---- Game lifecycle ---------------------------------------------------------------------------------
function start(plan = []) {
  P = { ...PDEF, fragMult: st.fragMult };
  g = newGame(st.seed, st.redSetting);
  st.plan = [];
  pending = []; sel = null;
  $('log').innerHTML = '';
  $('aar').hidden = true;
  for (const t of plan) { if (g.over) break; play(t, false); }
  render();
}

function play(orders, anim = true) {
  const o = orders.slice(0, 2);
  while (o.length < 2) o.push({ a: 'hold', m: null });
  st.plan.push(o.map(x => ({ a: x.a, m: x.m })));
  step(g, o, P);
  $('log').insertAdjacentHTML('afterbegin', logItem(g.hist[g.hist.length - 1]));
  if (g.over) showAAR(g, st.plan, P, { onView: drawOrbit, setting: st.redSetting });
}

$('end').onclick = () => {
  if (g.over) return;
  const was = shown(), alive0 = { ...g.sides.B.alive }, deb0 = { ...g.debris };
  play(pending); pending = []; sel = null;
  render();
  const hm = g.hist[g.hist.length - 1];
  monthFx(fx, hm, alive0, { card: document.querySelector('.od-orbitcard'), endBtn: $('end') });
  if (!g.over) countFrags($('orbit'), deb0, g.debris, n => Math.round(n).toLocaleString('en-US'));
  countBar(was);
  logFx($('log').firstElementChild);
  if (g.over) aarFx($('aar'));
  if (g.over) $('aar').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
};
$('undo').onclick = () => {
  if (sel) { sel = null; render(); return; }
  if (pending.length) { pending.pop(); render(); return; }
  if (st.plan.length) { const p = st.plan.slice(0, -1); const last = st.plan[st.plan.length - 1]; start(p); pending = last.filter(x => x.a !== 'hold'); render(); }
};

// ---- Orders panel -----------------------------------------------------------------------------------
const GROUPS = { rev: 'acts-rev', kin: 'acts-kin', def: 'acts-def' };
function buildActs() {
  for (const k of ACT_KEYS) {
    const A = ACTS[k], box = $(GROUPS[A.kind] || 'acts-def');
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.a = k; b.className = A.kind;
    b.innerHTML = `<b>${A.t}</b><small id="stk-${k}"></small>`;
    b.onclick = () => pickAct(k);
    box.appendChild(b);
  }
}
function pickAct(k) {
  if (g.over || pending.length >= 2) return;
  if (k === 'hold') { pending.push({ a: 'hold', m: null }); sel = null; render(); return; }
  if (k === 'prolif') { if (valid(g, 'B', { a: k, m: 'com' }, pending)) { pending.push({ a: k, m: 'com' }); sel = null; } render(); return; }
  sel = sel === k ? null : k;
  render();
  if (sel) $('tgts').querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
}
function choose(m) {
  if (!sel) return;
  const x = { a: sel, m };
  if (!valid(g, 'B', x, pending)) return;
  pending.push(x); sel = null;
  render();
  (pending.length >= 2 ? $('end') : $('acts-rev').querySelector('button'))?.focus({ preventScroll: true });
}

function renderPanel() {
  const pr = promptFor(g, pending);
  $('prompt').dataset.s = pr.s; $('prompt-t').textContent = pr.t; $('prompt-s').textContent = pr.d;
  $('slots').innerHTML = [0, 1].map(i => {
    const x = pending[i];
    return x ? `<li class="full"><span>${i + 1}. ${actText(x, 'B')}</span><button type="button" class="x" data-i="${i}" aria-label="Remove order ${i + 1}">×</button></li>`
      : `<li class="muted">${i + 1}. ${i === pending.length && sel ? `${ACTS[sel].t}: now pick a target` : 'empty'}</li>`;
  }).join('');
  $('slots').querySelectorAll('.x').forEach(b => { b.onclick = () => { pending.splice(+b.dataset.i, 1); render(); }; });
  const full = pending.length >= 2 || g.over;
  for (const k of ACT_KEYS) {
    const A = ACTS[k], b = document.querySelector(`[data-a="${k}"]`);
    const any = A.ms.some(m => valid(g, 'B', { a: k, m }, pending));
    b.disabled = full || !any;
    b.setAttribute('aria-pressed', String(sel === k));
    $('stk-' + k).textContent = A.stock ? `${g.sides.B.stock[A.stock] - pending.filter(x => x.a === k).length} left` : A.kind === 'rev' ? 'wears off' : k === 'harden' ? 'permanent' : '';
  }
  $('act-d').textContent = sel ? ACTS[sel].d : 'Tap an action to read what it does.';
  const on = sel ? ACTS[sel].on : null;
  $('tgts').innerHTML = MISSION_KEYS.map(m => {
    const ok = sel && valid(g, 'B', { a: sel, m }, pending);
    const who = on === 'own' ? g.sides.B : g.sides.R;
    return `<button type="button" data-m="${m}" ${ok ? '' : 'disabled'}>${on === 'own' ? 'Your' : 'Red\'s'} ${MISSIONS[m].short}<small>${who.alive[m]} working, ${MISSIONS[m].need} needed${MISSIONS[m].entangled ? ' · nuclear role' : ''}</small></button>`;
  }).join('');
  $('tgts').querySelectorAll('button').forEach(b => { b.onclick = () => choose(b.dataset.m); });
  $('end').disabled = g.over;
  $('panel').classList.toggle('done', g.over);
  $('end').classList.toggle('ready', pending.length >= 2 && !g.over);
  $('undo').disabled = !sel && !pending.length && !st.plan.length;
  $('pick-hint').textContent = sel ? `Now tap ${ACTS[sel].on === 'own' ? 'one of your' : 'one of Red\'s'} constellations (highlighted), or use the target buttons.` : 'Pick an action in the panel, then a target here or in the panel.';
  document.querySelectorAll('#red-post button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === st.redSetting)));
  document.querySelectorAll('#frag button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === st.fragMult)));
  $('seed').value = st.seed;
}

// ---- Stage ------------------------------------------------------------------------------------------
function drawOrbit(v) {
  orbit.draw(v, { pick: !g.over && sel ? ACTS[sel].on : null, valid: (side, m) => (side === 'B' ? ACTS[sel]?.on === 'own' : ACTS[sel]?.on === 'enemy') && valid(g, 'B', { a: sel, m }, pending) });
}
function renderBar() {
  const m = Math.min(g.turn + 1, TURNS), last = g.hist[g.hist.length - 1];
  $('month').textContent = g.over ? `Month ${g.turn}` : `Month ${m}`;
  $('phase-t').textContent = (g.over ? g.turn : m) <= CRISIS_TURNS ? 'Crisis' : 'War';
  $('pips').innerHTML = Array.from({ length: TURNS }, (_, i) => `<li class="${i >= CRISIS_TURNS ? 'war' : ''} ${i < g.turn ? 'done' : ''} ${i === g.turn && !g.over ? 'now' : ''}"></li>`).join('');
  $('k-sb').textContent = last ? Math.round(last.S.B * 100) : 100;
  $('k-sr').textContent = last ? Math.round(last.S.R * 100) : 100;
  const a = $('k-adv'); a.textContent = `${g.adv >= 0 ? '+' : ''}${g.adv.toFixed(2)}`;
  a.className = 'num ' + (g.adv >= 0.5 ? 'good' : g.adv <= -0.5 ? 'bad' : '');
  const cp = 1 - Math.exp(-g.cumH), e = $('k-esc');
  e.textContent = pct(cp, cp < 0.1 ? 1 : 0); e.className = 'num ' + (cp >= 0.25 ? 'bad' : cp >= 0.1 ? 'warn' : '');
  $('k-esc-s').textContent = last ? `this month ${pct(last.pTurn, 1)}` : 'so far this game';
}
/** The numbers the bar shows, for counting from last month's values to this month's. */
function shown() {
  const last = g.hist[g.hist.length - 1];
  return { sb: last ? Math.round(last.S.B * 100) : 100, sr: last ? Math.round(last.S.R * 100) : 100, adv: g.adv, esc: 1 - Math.exp(-g.cumH) };
}
function countBar(was) {
  const now = shown(), ed = now.esc < 0.1 ? 1 : 0;
  countTo($('k-sb'), was.sb, now.sb, v => `${Math.round(v)}`);
  countTo($('k-sr'), was.sr, now.sr, v => `${Math.round(v)}`);
  countTo($('k-adv'), +was.adv.toFixed(2), +now.adv.toFixed(2), v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`);
  countTo($('k-esc'), was.esc, now.esc, v => pct(v, ed));
}
function render() {
  renderBar();
  renderPanel();
  if (g.over) return writeHash(st);
  drawOrbit(g);
  $('outlook').innerHTML = outlookHtml(g, legacy(g, P, 25, g.turn), P, DEBRIS0);
  $('outlook-note').textContent = 'Risk is the chance per year that debris ends a satellite\'s mission, against the pre-war level. Losses assume both sides rebuild to full strength after the war.';
  writeHash(st);
}

// ---- Settings, sharing, help -----------------------------------------------------------------------
const restart = () => { start(); history.replaceState(null, '', location.pathname + location.search); writeHash(st); };
document.querySelectorAll('#red-post button').forEach(b => { b.onclick = () => { st.redSetting = b.dataset.v; restart(); }; });
document.querySelectorAll('#frag button').forEach(b => { b.onclick = () => { st.fragMult = +b.dataset.v; restart(); }; });
$('restart').onclick = () => { const v = Math.round(+$('seed').value); if (v >= 1 && v <= 999999) st.seed = v; restart(); };
$('new-game').onclick = () => { st.seed = 1 + Math.floor(Math.random() * 999998); restart(); window.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' }); };
$('again').onclick = () => { restart(); window.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' }); };
$('again-new').onclick = () => $('new-game').click();
$('copy-link').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy-link').textContent = 'Link copied'; }
  catch { $('copy-link').textContent = 'Copy the address bar'; }
  setTimeout(() => { $('copy-link').textContent = 'Copy link'; }, 1800);
};
// "Learn to play": a guided first game on a fixed seed with the default settings.
const lesson = () => {
  st.seed = LESSON_SEED; st.redSetting = 'unknown'; st.fragMult = 1;
  restart();
  window.scrollTo({ top: 0, behavior: 'auto' });
  runLesson(STEPS, { slug: 'orbital-denial', title: 'Learn to play', onFinish: () => banner.refresh() });
};
const banner = learnButton($('learn'), { slug: 'orbital-denial', minutes: 5, onStart: lesson, sheet: SHEET });

buildActs();
renderBelow($('below'), () => P);
start(h0.plan);
