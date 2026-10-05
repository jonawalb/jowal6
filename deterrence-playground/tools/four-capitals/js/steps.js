// The monthly decision as three steps (Posture, Moves, Forces) under a summary bar that shows the choices so far
// and jumps to any step; the phone tabs (Map | Your move | Situation); and the Simple / Detailed view switch.
// Presentation only: the choice object and every rule stay in decide.js, forces-panel.js and the engine.
import { POSTURES, MAX_MOVES } from '../data/actions.js';

const $ = id => document.getElementById(id);
const n1 = x => { const v = Math.round(x * 10) / 10; return Object.is(v, -0) ? 0 : v; };
export const STEP_NAMES = ['Posture', 'Moves', 'Forces'];
let G = null;

/** Force orders this month: formation orders plus sea areas whose stance you changed. */
const orderCount = g => g.choice.orders.moves.length
  + Object.entries(g.choice.orders.stance).filter(([a, v]) => v !== g.s.stance[g.player][a]).length;

/** Repaint the summary bar and show the current step. Called on every repaint of the decision. */
export function paintSteps(g) {
  G = g;
  if (!g.step) g.step = 1;
  const ch = g.choice, r = g.L.rows, warn = Object.keys(g.L.refused).length > 0, owarn = r.fuel.left < 0 || g.L.orderLog.some(l => !l.ok);
  const k = orderCount(g);
  const vals = [
    POSTURES.find(p => p.id === ch.posture).label,
    `${ch.actions.length} of ${MAX_MOVES}`,
    `${k} order${k === 1 ? '' : 's'}<br>Lift&nbsp;${n1(r.lift.left)} · Fuel&nbsp;${n1(r.fuel.left)}`,
  ];
  const bad = [false, warn, owarn];
  $('steps').innerHTML = STEP_NAMES.map((n, i) => `<button type="button" role="tab" id="st-${i + 1}" aria-controls="step-${i + 1}" aria-selected="${g.step === i + 1}" tabindex="${g.step === i + 1 ? 0 : -1}" class="${bad[i] ? 'warn' : ''}">
    <span class="k4-stn">${i + 1}</span><span class="k4-stl"><b>${n}</b><small>${vals[i]}${bad[i] ? '<span class="sr-only"> (needs attention)</span>' : ''}</small></span></button>`).join('');
  for (let i = 1; i <= 3; i++) $('step-' + i).hidden = g.step !== i;
  $('step-back').hidden = g.step === 1;
  $('step-next').textContent = g.step === 3 ? 'End month' : `Next: ${STEP_NAMES[g.step]}`;
}

/** Go to step n (1–3); `focus` moves keyboard focus to the step's heading (or to its tab when `tab`). */
export function setStep(n, focus = false, tab = false) {
  if (!G) return;
  G.step = Math.max(1, Math.min(3, n));
  paintSteps(G);
  if (focus) (tab ? $('st-' + G.step) : $('step-' + G.step).querySelector('.k4-sh'))?.focus();
}

/** Phone tabs: which pane shows (map, move or sit). Wider screens show all three. */
export function setPhoneTab(t) {
  $('play').dataset.tab = t;
  document.querySelectorAll('.k4-ptabs [data-ptab]').forEach(b => { b.setAttribute('aria-selected', String(b.dataset.ptab === t)); b.tabIndex = b.dataset.ptab === t ? 0 : -1; });
}
export const isPhone = () => matchMedia('(max-width: 760px)').matches;

/* ---------- Simple / Detailed view ---------- */
const VKEY = 'four-capitals:view';
const readView = () => { try { return localStorage.getItem(VKEY); } catch { return null; } };
const writeView = v => { try { localStorage.setItem(VKEY, v); } catch { /* private mode: lasts this page */ } };
export function setView(v, remember = true) {
  document.body.classList.toggle('k4-simple', v === 'simple');
  document.querySelectorAll('.k4-viewsw [data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  if (remember) { writeView(v); $('view-hint').hidden = true; console.info(`[Four Capitals] view: ${v}`); }
}

/** Arrow keys, Home and End move along a tablist (WAI-ARIA tabs pattern, automatic activation). */
function arrows(list, pick) {
  list.addEventListener('keydown', e => {
    const tabs = [...list.querySelectorAll('[role="tab"]')], i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const j = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (j == null) return;
    e.preventDefault();
    pick(tabs[(j + tabs.length) % tabs.length]);
  });
}

export function wireSteps() {
  $('steps').addEventListener('click', e => { const b = e.target.closest('[role="tab"]'); if (b) setStep(+b.id.slice(3), true, true); });
  arrows($('steps'), b => setStep(+b.id.slice(3), true, true));
  $('step-back').addEventListener('click', () => setStep(G.step - 1, true));
  $('step-next').addEventListener('click', () => { if (G.step === 3) $('end-turn').click(); else setStep(G.step + 1, true); });
  const ptabs = document.querySelector('.k4-ptabs');
  ptabs.addEventListener('click', e => { const b = e.target.closest('[data-ptab]'); if (b) setPhoneTab(b.dataset.ptab); });
  arrows(ptabs, b => { setPhoneTab(b.dataset.ptab); b.focus(); });
  document.querySelector('.k4-viewsw').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
  const saved = readView();
  setView(saved === 'detailed' ? 'detailed' : 'simple', false);   // first visit: Simple, until you pick
  $('view-hint').hidden = true;
}
