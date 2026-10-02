// The start screen (SPEC §1.1, UI streamline #2), now two screens. Screen 1: side, single battle or campaign,
// and era, then Next. Screen 2: scale (Division recommended), difficulty and the offense–defense slider with
// its "easier / harder for you" words, then Start; Back keeps every choice. Defaults are pre-selected. Every
// control is a real button or input, at least 40 px tall, one column on a phone.
import { SCALES } from '../../data/scales.js';
import { ERAS } from '../../data/eras.js';
import { OFFDEF } from '../../data/params.js';
import { countForces } from '../forces.js';
import { $ } from './store.js';
import { startState, startReduce, startLabel, recap } from './start-flow.js';

let st = startState();
const DIFF = {
  e: ['Easy', 'Massed waves or a forward-heavy defense: brave, predictable, punished by depth and enfilade.'],
  s: ['Standard', 'The modern system: depth, reserves and counterattacks, or leapfrog under a creeping barrage.'],
  h: ['Hard', 'Standard plus feints, better lane siting, quicker reactions and well-timed counterattacks.'],
};

export const odLabel = v => (v === OFFDEF.standard ? 'standard' : v < OFFDEF.standard ? (v <= 2 ? 'strongly favors defense' : 'favors defense') : v >= 8 ? 'strongly favors offense' : 'favors offense');
export const odFor = (v, side) => (v === OFFDEF.standard ? null : (v < OFFDEF.standard) === (side === 'def') ? 'easier' : 'harder');

const seg = (name, label, opts, cur) => `<div class="dd-seg dd-big" role="group" aria-label="${label}">${opts.map(([v, t, sub]) => `<button type="button" class="btn" data-c="${name}" data-v="${v}" aria-pressed="${cur === v}"><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</button>`).join('')}</div>`;

function screen1(C) {
  const f = countForces(C.scale, C.era === 'm' ? 'm' : 'w'), Sc = SCALES[C.scale];
  return `<div class="dd-sides" role="group" aria-label="Side">
      <button type="button" class="dd-side blue" data-c="side" data-v="def" aria-pressed="${C.side === 'def'}"><b>Defend</b><span>Hold ${Sc.obj.name} with the Sorrel Republic’s ${f.def} units.</span><small>Thin outposts, a battle zone sited for enfilade, and a counterattack force in the rear.</small></button>
      <button type="button" class="dd-side red" data-c="side" data-v="att" aria-pressed="${C.side === 'att'}"><b>Attack</b><span>Break in with the Orvane Crown’s ${f.att} units.</span><small>Leapfrog under a creeping barrage, infiltrate, and take ${Sc.obj.need} side-by-side sectors. The board turns so you attack up the screen.</small></button>
    </div>
    <div class="dd-srow"><span class="eyebrow">Play</span>${seg('mode', 'Single battle or campaign', [['s', 'Single battle'], ['c', 'Campaign (4 battles)', 'with learning between battles']], C.mode)}</div>
    <div class="dd-srow"><span class="eyebrow">Era</span>${seg('era', 'Era', [['w', ERAS.w.label, ERAS.w.blurb], ['m', ERAS.m.label, ERAS.m.blurb]], C.era)}</div>`;
}

function screen2(C) {
  return `<p class="dd-recap"><b>${recap(C, e => ERAS[e].label)}</b></p>
    <div class="dd-srow"><span class="eyebrow">Scale</span>${seg('scale', 'Scale', [['d', 'Division (Recommended)', '4 × 10.5 km, 15–16 hours'], ['c', 'Corps (2×)', '6 × 14.5 km, 21 hours'], ['a', 'Army (4×)', '9 × 18.5 km, 25–27 hours']], C.scale)}
      ${C.scale !== 'd' ? `<p class="fine dd-exp">For experienced players: you command every company of a ${C.scale === 'c' ? 'corps (about 150 units)' : 'army (about 300)'}. Formation orders, filters and hotkeys help.</p>` : ''}</div>
    <div class="dd-srow"><span class="eyebrow">Difficulty</span>${seg('diff', 'Difficulty', Object.entries(DIFF).map(([k, [t, d]]) => [k, t, d]), C.diff)}</div>`;
}

export function renderStart() {
  const C = st.C, two = st.step === 2;
  $('start-step').textContent = two ? 'Step 2 of 2: scale and difficulty' : 'Step 1 of 2: side, game and era';
  $('start-body').innerHTML = two ? screen2(C) : screen1(C);
  $('od-box').hidden = !two;
  $('start-back').hidden = !two; $('start-go').hidden = !two; $('start-next').hidden = two;
  $('start-tours').hidden = two; $('start-practice').hidden = two;
  $('start-go').textContent = startLabel(C);
  odShow();
}

/** The slider's words (Fog's odShow): the output, its aria text, and the effect on the side you chose. */
export function odShow(v = +$('od').value) {
  $('od-out').textContent = `${v} — ${odLabel(v)}`;
  $('od').setAttribute('aria-valuetext', `${v}, ${odLabel(v)}`);
  const e = odFor(v, st.C.side);
  $('od-desc').textContent = v === OFFDEF.standard ? 'Standard. Lower favors the defending army; higher favors the attacking army.'
    : `${st.C.side === 'def' ? 'Defending' : 'Attacking'}, this is ${e} for you.`;
}

const go = (a, focus) => { st = startReduce(st, a); renderStart(); if (focus) $(focus)?.focus({ preventScroll: true }); };

/** Wire the start card once. onGo(choices) starts a game; onTour(side) starts a walkthrough; onPractice(choices)
 * opens the Practice field with screen 1's side and era. */
export function wireStart(onGo, onTour, onPractice) {
  $('start').addEventListener('click', e => {
    const b = e.target.closest('[data-c]');
    if (b) { go({ type: 'pick', key: b.dataset.c, v: b.dataset.v }); $('start').querySelector(`[data-c="${b.dataset.c}"][data-v="${b.dataset.v}"]`)?.focus(); return; }
    if (e.target.closest('#start-next')) { go({ type: 'next' }, 'start-go'); return; }
    if (e.target.closest('#start-back')) { go({ type: 'back' }, 'start-next'); return; }
    if (e.target.closest('#start-go')) { onGo(choices()); return; }
    if (e.target.closest('[data-practice]')) { onPractice(choices()); return; }
    const t = e.target.closest('[data-tour]');
    if (t) onTour(t.dataset.tour);
  });
  $('od').addEventListener('input', () => odShow());
}

/** Back to screen 1 (New game), keeping the choices. */
export function resetStart() { st = startReduce(st, { type: 'reset' }); }

export function choices() {
  return { ...st.C, od: Math.max(OFFDEF.min, Math.min(OFFDEF.max, Math.round(+$('od').value))), seed: 1 + Math.floor(Math.random() * 999998) };
}

/** Screen 2 with screen 1's choices kept (the Practice field's "Start the real game"). */
export function openStep2(ch) { setChoices(ch); st = startReduce(st, { type: 'next' }); renderStart(); $('start-go').focus({ preventScroll: true }); }

/** Put the controls back to a game's choices (after a share link loads). */
export function setChoices(ch) {
  const C = { ...st.C };
  for (const k of Object.keys(C)) if (ch[k] != null) C[k] = ch[k];
  st = { ...st, C };
  $('od').value = ch.od ?? OFFDEF.standard;
}
