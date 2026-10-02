// The start screen (SPEC §1.1): mode, side, scale (Division recommended), era, difficulty, the offense–defense
// slider with its "easier / harder for you" words, the Start button and the two walkthrough buttons. Every
// control is a real button or input, at least 40 px tall, one column on a phone.
import { SCALES } from '../../data/scales.js';
import { ERAS } from '../../data/eras.js';
import { OFFDEF } from '../../data/params.js';
import { countForces } from '../forces.js';
import { $ } from './store.js';

const C = { mode: 's', side: 'def', scale: 'd', era: 'w', diff: 's' };
const DIFF = {
  e: ['Easy', 'Massed waves or a forward-heavy defense: brave, predictable, punished by depth and enfilade.'],
  s: ['Standard', 'The modern system: depth, reserves and counterattacks, or leapfrog under a creeping barrage.'],
  h: ['Hard', 'Standard plus feints, better lane siting, quicker reactions and well-timed counterattacks.'],
};

export const odLabel = v => (v === OFFDEF.standard ? 'standard' : v < OFFDEF.standard ? (v <= 2 ? 'strongly favors defense' : 'favors defense') : v >= 8 ? 'strongly favors offense' : 'favors offense');
export const odFor = (v, side) => (v === OFFDEF.standard ? null : (v < OFFDEF.standard) === (side === 'def') ? 'easier' : 'harder');

const seg = (name, opts, cur) => `<div class="dd-seg dd-big" role="group" aria-label="${name}">${opts.map(([v, t, sub]) => `<button type="button" class="btn" data-c="${name}" data-v="${v}" aria-pressed="${cur === v}"><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</button>`).join('')}</div>`;

export function renderStart() {
  const f = countForces(C.scale, C.era === 'm' ? 'm' : 'w'), Sc = SCALES[C.scale];
  const od = +$('od').value;
  $('start-body').innerHTML = `
    <div class="dd-srow"><span class="eyebrow">Play</span>${seg('mode', [['s', 'Single battle'], ['c', 'Campaign (4 battles)', 'with learning between battles']], C.mode)}</div>
    <div class="dd-sides">
      <button type="button" class="dd-side blue" data-c="side" data-v="def" aria-pressed="${C.side === 'def'}"><b>Defend</b><span>Hold ${Sc.obj.name} with the Sorrel Republic’s ${f.def} units.</span><small>Thin outposts, a battle zone sited for enfilade, and a counterstroke force in the rear.</small><em class="dd-odfx" data-odfx="def"></em></button>
      <button type="button" class="dd-side red" data-c="side" data-v="att" aria-pressed="${C.side === 'att'}"><b>Attack</b><span>Break in with the Orvane Crown’s ${f.att} units.</span><small>Leapfrog under a creeping barrage, infiltrate, and take ${Sc.obj.need} side-by-side sectors. The board turns so you attack up the screen.</small><em class="dd-odfx" data-odfx="att"></em></button>
    </div>
    <div class="dd-srow"><span class="eyebrow">Scale</span>${seg('scale', [['d', 'Division sector (Recommended)', '4 × 10.5 km, 15–16 hours'], ['c', 'Corps sector (2×)', '6 × 14.5 km, 21 hours'], ['a', 'Army sector (4×)', '9 × 18.5 km, 25–27 hours']], C.scale)}
      ${C.scale !== 'd' ? `<p class="fine dd-exp">For experienced players: you command every company of a ${C.scale === 'c' ? 'corps (about 150 units)' : 'army (about 300)'}. Formation orders, filters and hotkeys help.</p>` : ''}</div>
    <div class="dd-srow"><span class="eyebrow">Era</span>${seg('era', [['w', ERAS.w.label, ERAS.w.blurb], ['m', ERAS.m.label, ERAS.m.blurb]], C.era)}</div>
    <div class="dd-srow"><span class="eyebrow">Difficulty</span>${seg('diff', Object.entries(DIFF).map(([k, [t, d]]) => [k, t, d]), C.diff)}</div>`;
  $('start-go').textContent = C.mode === 'c' ? 'Begin campaign' : C.side === 'def' ? 'Plan your defense' : 'Plan your attack';
  odShow(od);
}

/** The slider's words (Fog's odShow): the output, its aria text, and the effect on each side. */
export function odShow(v = +$('od').value) {
  $('od-out').textContent = `${v} — ${odLabel(v)}`;
  $('od').setAttribute('aria-valuetext', `${v}, ${odLabel(v)}`);
  $('od-desc').textContent = v === OFFDEF.standard ? 'Standard. Lower favors the defending army; higher favors the attacking army.'
    : `Defending, this is ${odFor(v, 'def')} for you; attacking, ${odFor(v, 'att')}.`;
  document.querySelectorAll('[data-odfx]').forEach(n => {
    const e = odFor(v, n.dataset.odfx);
    n.textContent = e ? `Balance ${v}: ${e} for you` : 'Standard balance';
    n.dataset.e = e || '';
  });
}

/** Wire the start card once. onGo(choices) starts a game; onTour(side) starts a walkthrough. */
export function wireStart(onGo, onTour) {
  $('start').addEventListener('click', e => {
    const b = e.target.closest('[data-c]');
    if (b) { C[b.dataset.c] = b.dataset.v; renderStart(); $('start').querySelector(`[data-c="${b.dataset.c}"][data-v="${b.dataset.v}"]`)?.focus(); return; }
    if (e.target.closest('#start-go')) onGo(choices());
    const t = e.target.closest('[data-tour]');
    if (t) onTour(t.dataset.tour);
  });
  $('od').addEventListener('input', () => odShow());
}

export function choices() {
  return { ...C, od: Math.max(OFFDEF.min, Math.min(OFFDEF.max, Math.round(+$('od').value))), seed: 1 + Math.floor(Math.random() * 999998) };
}

/** Put the controls back to a game's choices (after a share link loads). */
export function setChoices(ch) {
  for (const k of Object.keys(C)) if (ch[k] != null) C[k] = ch[k];
  $('od').value = ch.od ?? OFFDEF.standard;
}
