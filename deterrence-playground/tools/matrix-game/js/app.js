// Baltic Matrix Game: page controller. Phases: compose -> p-adj -> p-res -> ai-counter -> ai-adj -> ai-res -> (next turn | debrief).
import { ACTORS, ACTOR_ORDER, FACTS, TRACKS } from '../data/scenario.js';
import { MOVES } from '../data/moves.js';
import { SOURCES } from '../data/sources.js';
import { MAX_REASONS } from './engine.js';
import { newGame, replay, cur, playerArgue, playerRoll, aiArgue, aiRoll, nextTurn, encodeMoves, TURNS } from './game.js';
import { renderBoard, renderInject, renderAdjudication, renderLog, logText, esc, actorChip, diceHtml } from './views.js';
import { renderDebrief } from './debrief.js';
import { createTour } from './tour.js';

const $ = s => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LS = 'mg-last-game';
let g, ui = { phase: 'compose', action: null, reasons: [], counter: null, delta: {} };

/* ---------- state and URL ---------- */
function readHash() {
  let h = location.hash.slice(1);
  if (!h) { try { h = localStorage.getItem(LS) || ''; } catch { h = ''; } }
  const q = new URLSearchParams(h);
  const actor = ACTORS[q.get('a')] ? q.get('a') : 'estonia';
  const s = parseInt(q.get('s'), 10);
  return { actor, seed: Number.isFinite(s) && s > 0 && s < 1e6 ? s : 2031, moves: q.get('m') || '' };
}
function writeHash() {
  const q = new URLSearchParams({ a: g.actor, s: g.seed });
  const m = encodeMoves(g);
  if (m) q.set('m', m);
  history.replaceState(null, '', '#' + q.toString());
  try { localStorage.setItem(LS, q.toString()); } catch { /* storage unavailable */ }
}
function load(actor, seed, moves) {
  g = replay(actor, seed, moves);
  ui = { phase: g.over ? 'debrief' : 'compose', action: null, reasons: [], counter: null, delta: {} };
  writeHash();
  render();
}
const newSeed = () => 1 + Math.floor(Math.random() * 999998);

/* ---------- panel ---------- */
function actorSec() {
  return `<div class="sec"><p class="eyebrow">Play as</p>
    <div class="choices mg-actors">${ACTOR_ORDER.map(a => `<button type="button" data-actor="${a}" aria-pressed="${a === g.actor}" style="--ac:${ACTORS[a].color}">
      <b>${esc(ACTORS[a].name)}</b><small>${esc(ACTORS[a].long)}</small></button>`).join('')}</div>
    <p class="fine">${esc(ACTORS[g.actor].brief)} Switching actor starts a new game.</p></div>`;
}

function composeSec() {
  const M = MOVES[g.actor];
  const act = M.actions.map((a, i) => `<button type="button" data-act="${i}" aria-pressed="${ui.action === i}">
    <span>${esc(a.text)}</span><small>${a.tags.map(t => `<span class="pill">${t}</span>`).join('')}${a.diff ? '<span class="pill mg-amb">ambitious −1</span>' : ''}</small></button>`).join('');
  const rs = M.reasons.map((r, i) => {
    const on = ui.reasons.includes(i);
    return `<button type="button" data-rsn="${i}" aria-pressed="${on}" ${!on && ui.reasons.length >= MAX_REASONS ? 'disabled' : ''}>
      <span>${esc(r.text)}</span><small>${r.tags.map(t => `<span class="pill">${t}</span>`).join('')}${r.src ? '<span class="pill mg-sourced">sourced fact</span>' : ''}</small></button>`;
  }).join('');
  return `<div class="sec" id="mg-actions"><p class="eyebrow">1 · Your action</p><div class="mg-list">${act}</div></div>
    <div class="sec" id="mg-reasons"><p class="eyebrow">2 · Up to three reasons <span class="num">(${ui.reasons.length}/${MAX_REASONS})</span></p>
      <p class="fine">A reason counts as strong (+1) if it bears on the action's tags and the board supports it right now.</p>
      <div class="mg-list">${rs}</div></div>
    <div class="sec"><button type="button" class="btn solid" id="mg-submit" ${ui.action == null ? 'disabled' : ''}>Put the argument to the adjudicator</button>
      <p class="fine">AI actors will raise counter-arguments. Then you roll.</p></div>`;
}

function counterSec() {
  const rec = cur(g), x = rec.ai, A = MOVES[x.actor].actions[x.actionIdx];
  const cs = MOVES[g.actor].counters.map((c, i) => `<button type="button" data-ctr="${i}" aria-pressed="${ui.counter === i}">
    <span>${esc(c.text)}</span><small>${c.vs.map(t => `<span class="pill">${t}</span>`).join('')}</small></button>`).join('');
  return `<div class="sec mg-ai"><p class="eyebrow">AI move · turn ${rec.t + 1}</p>
      <p>${actorChip(x.actor)} argues: <b>${esc(A.text)}</b></p>
      <ul class="mg-because">${x.reasonIdx.map(i => `<li>${esc(MOVES[x.actor].reasons[i].text)}</li>`).join('')}</ul>
      <p class="fine">Tags: ${A.tags.map(t => `<span class="pill">${t}</span>`).join('')}</p></div>
    <div class="sec" id="mg-counters"><p class="eyebrow">3 · Your counter-argument (optional)</p>
      <p class="fine">A counter is strong (−1 to their roll) if it engages the action's tags and the board backs it.</p>
      <div class="mg-list">${cs}<button type="button" data-ctr="none" aria-pressed="${ui.counter === 'none'}"><span>No counter-argument</span></button></div></div>
    <div class="sec"><button type="button" class="btn solid" id="mg-csubmit" ${ui.counter == null ? 'disabled' : ''}>Send to the adjudicator</button></div>`;
}

function waitSec() {
  const rec = cur(g);
  const p = ui.phase;
  let btn = '', msg = '';
  if (p === 'p-adj' || p === 'ai-adj') msg = 'The adjudicator has weighed the argument. Roll the dice in the adjudicator panel.';
  if (p === 'p-res') { btn = g.over ? '<button type="button" class="btn solid" data-next="debrief">See the debrief</button>' : `<button type="button" class="btn solid" data-next="ai">Next: ${esc(ACTORS[rec.ai.actor].name)} argues</button>`; }
  if (p === 'ai-res') btn = g.over ? '<button type="button" class="btn solid" data-next="debrief">See the debrief</button>' : `<button type="button" class="btn solid" data-next="turn">Start turn ${rec.t + 2}</button>`;
  return `<div class="sec"><p class="eyebrow">Turn ${rec.t + 1} of ${TURNS}</p>${msg ? `<p>${msg}</p>` : ''}${btn}</div>`;
}

function renderPanel() {
  const p = ui.phase;
  const body = p === 'compose' ? composeSec() : p === 'ai-counter' ? counterSec() : p === 'debrief'
    ? `<div class="sec"><p>The game is over. Read the debrief, print the log or play again.</p><button type="button" class="btn solid" data-again>Play again</button></div>` : waitSec();
  $('#mg-panel').innerHTML = actorSec() + body;
}

/* ---------- main render ---------- */
function render() {
  renderBoard($('#mg-board'), g, ui.delta);
  const rec = cur(g);
  renderInject($('#mg-inject'), rec);
  renderPanel();
  const adj = $('#mg-adj');
  const show = (x, who, onRoll) => renderAdjudication(adj, x.arg, x.res, { who, onRoll });
  if (['p-adj', 'p-res'].includes(ui.phase)) show(rec.player, 'your argument', () => doRoll('p'));
  else if (['ai-adj', 'ai-res'].includes(ui.phase)) show(rec.ai, `${ACTORS[rec.ai.actor].name}'s argument`, () => doRoll('ai'));
  else if (ui.phase === 'debrief') {
    const last = [...g.turns].reverse().find(r => r.ai?.res || r.player?.res);
    const x = last.ai?.res ? last.ai : last.player;
    show(x, 'last argument', null);
  } else {
    adj.innerHTML = `<p class="eyebrow">Adjudicator</p><h3>Waiting for an argument</h3>
      <p>Pick an action and up to three reasons in the panel. The adjudicator will score each reason, hear the AI actors' counter-arguments, set the odds and roll two dice.</p>
      <p class="fine">Method: an action, reasons for it and counter-arguments, after Chris Engle's matrix game. 2d6, 7 or more succeeds; each strong reason +1, each strong counter −1.</p>`;
  }
  const deb = $('#mg-debrief');
  deb.hidden = ui.phase !== 'debrief';
  if (!deb.hidden) renderDebrief(deb, g);
  renderLog($('#mg-log'), g);
  $('#mg-turn').textContent = g.over ? 'Game over' : `Turn ${cur(g).t + 1} of ${TURNS}`;
}

function doRoll(who) {
  const adj = $('#mg-adj');
  const btn = adj.querySelector('[data-roll]');
  if (btn) btn.disabled = true;
  const finish = () => {
    const res = who === 'p' ? playerRoll(g) : aiRoll(g);
    ui.delta = res.delta;
    ui.phase = who === 'p' ? 'p-res' : 'ai-res';
    if (who === 'ai' || g.over) writeHash();
    render();
    $('#mg-adj .mg-res')?.setAttribute('tabindex', '-1');
    $('#mg-adj .mg-res')?.focus({ preventScroll: true });
  };
  if (reduce) return finish();
  const row = adj.querySelector('.mg-rollrow');
  let n = 0;
  const tick = setInterval(() => {
    row.innerHTML = `${diceHtml([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)])}<span class="fine">Rolling…</span>`;
    if (++n > 6) { clearInterval(tick); finish(); }
  }, 70);
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.actor && t.dataset.actor !== g.actor) return load(t.dataset.actor, g.seed, '');
  if (t.dataset.act != null) { ui.action = +t.dataset.act; renderPanel(); focusSame(`[data-act="${t.dataset.act}"]`); return; }
  if (t.dataset.rsn != null) {
    const i = +t.dataset.rsn;
    ui.reasons = ui.reasons.includes(i) ? ui.reasons.filter(x => x !== i) : [...ui.reasons, i].slice(0, MAX_REASONS);
    renderPanel(); focusSame(`[data-rsn="${i}"]`); return;
  }
  if (t.dataset.ctr != null) { ui.counter = t.dataset.ctr === 'none' ? 'none' : +t.dataset.ctr; renderPanel(); focusSame(`[data-ctr="${t.dataset.ctr}"]`); return; }
  if (t.id === 'mg-submit' && ui.action != null) {
    playerArgue(g, ui.action, ui.reasons);
    ui.phase = 'p-adj'; ui.delta = {}; render(); scrollAdj(); return;
  }
  if (t.id === 'mg-csubmit' && ui.counter != null) {
    aiArgue(g, ui.counter === 'none' ? null : ui.counter);
    ui.phase = 'ai-adj'; ui.delta = {}; render(); scrollAdj(); return;
  }
  if (t.dataset.next === 'ai') { ui.phase = 'ai-counter'; ui.counter = null; render(); return; }
  if (t.dataset.next === 'turn') { nextTurn(g); ui = { phase: 'compose', action: null, reasons: [], counter: null, delta: {} }; render(); $('#mg-inject').scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); return; }
  if (t.dataset.next === 'debrief') { ui.phase = 'debrief'; render(); $('#mg-debrief').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return; }
  if (t.hasAttribute('data-again') || t.id === 'mg-new') return load(g.actor, newSeed(), '');
  if (t.hasAttribute('data-print') || t.id === 'mg-print') return window.print();
  if (t.hasAttribute('data-dl') || t.id === 'mg-dl') return download();
});
const focusSame = sel => $('#mg-panel ' + sel)?.focus();
function scrollAdj() {
  const el = $('#mg-adj');
  if (el.getBoundingClientRect().top > innerHeight * 0.6 || el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
}
function download() {
  const blob = new Blob([logText(g)], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `baltic-matrix-game-${g.actor}-${g.seed}.txt`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('#copy-link').onclick = async () => {
  writeHash();
  try { await navigator.clipboard.writeText(location.href); $('#copy-link').textContent = 'Link copied'; }
  catch { $('#copy-link').textContent = 'Copy the address bar'; }
  setTimeout(() => { $('#copy-link').textContent = 'Copy link'; }, 1800);
};
addEventListener('hashchange', () => {
  const h = readHash();
  if (h.actor !== g.actor || h.seed !== g.seed || h.moves !== encodeMoves(g)) load(h.actor, h.seed, h.moves);
});

/* ---------- static sections ---------- */
$('#facts').innerHTML = FACTS.map(f => `<li>${esc(f.text)} <a href="${SOURCES[f.src].url}" target="_blank" rel="noopener">Source</a></li>`).join('');
$('#sources').innerHTML = Object.values(SOURCES).map(s => `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)}</a>${s.note ? `. ${esc(s.note)}` : ''}</li>`).join('');
$('#tracks-table').innerHTML = `<thead><tr><th>Track</th><th>Start</th><th>Meaning</th></tr></thead><tbody>${TRACKS.map(t =>
  `<tr><td>${t.name}</td><td class="num">${t.start} <span class="notional">notional</span></td><td>${t.help}</td></tr>`).join('')}</tbody>`;

const tour = createTour(document.body, {
  demo: () => {
    if (ui.phase !== 'compose') return;
    ui.action = 0; ui.reasons = [0, 2]; renderPanel();
  },
});
$('#start-tour').onclick = () => tour.start();

const h = readHash();
load(h.actor, h.seed, h.moves);
