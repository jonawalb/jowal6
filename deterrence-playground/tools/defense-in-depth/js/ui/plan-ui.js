// The planning phase (SPEC §1.2, §8.3; UI streamline #3): the same map, the stepped "Your plan" panel (a summary
// bar of step chips, one step at a time with a one-line lead) and the Units pane; phone tabs Map | Plan | Units.
// Auto-plan fills the Standard computer's plan for your side, Clear empties it, and the checklist must have
// every required item green before "Start the battle". The map popover shows one unit's planning tools.
import { SCALES } from '../../data/scales.js';
import { STACK } from '../../data/params.js';
import { gridFor } from '../grid.js';
import { isBattery, isCompany } from '../forces.js';
import { checkDef, planReady } from '../plan-def.js';
import { checkAtt } from '../plan-att.js';
import { S, $, esc, say, unitOf, narrow } from './store.js';
import { autoPlan } from './ai-bridge.js';
import { defStep, defSummary, defUnitTools, defTap, defClick, defChange, blankDef } from './plan-def-ui.js';
import { attStep, attSummary, attUnitTools, attTap, attClick, attChange, blankAtt, normalizeAtt } from './plan-att-ui.js';
import { stepsFor, clampStep, defChips, attChips } from './plan-steps.js';
import { STANCE_WORD } from './filters.js';

const clone = x => JSON.parse(JSON.stringify(x));

/** A fresh plan: the Standard computer's plan for your side (you can change everything). */
export function startPlan() {
  const g = S.g;
  S.plan = clone(autoPlan(g, S.me));
  if (S.me === 'att') normalizeAtt(g, S.plan);
  else S.plan.csTargets ||= [];
}

export const checklist = () => (S.me === 'def' ? checkDef(S.g, S.plan) : checkAtt(S.g, S.plan));

/** The id of the open plan step ('zones', 'front', ...). */
export const planStepId = () => (S.g && S.g.phase === 'plan' ? stepsFor(S.me)[clampStep(S.me, S.planStep) - 1].id : null);

export function renderPlan() {
  const g = S.g, Sc = SCALES[g.scale];
  const list = checklist(), ready = planReady(list);
  const steps = stepsFor(S.me), n = clampStep(S.me, S.planStep), step = steps[n - 1];
  const chips = S.me === 'def' ? defChips(defSummary(g, S.plan)) : attChips(attSummary(g, S.plan));
  $('plan-head').innerHTML = `<div class="dd-phead"><h2>Your plan</h2><div class="dd-go"><button type="button" class="btn" data-pa="auto" title="The doctrinal plan the Standard computer would use">Auto-plan</button><button type="button" class="btn" data-pa="clear">Clear</button></div></div>
    <p class="fine">${S.me === 'def' ? `Hold ${esc(Sc.obj.name)}.` : `Take ${Sc.obj.need} side-by-side sectors of ${esc(Sc.obj.name)}.`} A sound plan is filled in: change anything. The map stays live throughout.</p>`;
  $('plan-body').innerHTML = `<div class="dd-steps" role="tablist" aria-label="Plan steps">${chips.map((c, i) => `<button type="button" role="tab" data-pstep="${i + 1}" id="pst-${i + 1}" aria-selected="${i + 1 === n}" tabindex="${i + 1 === n ? 0 : -1}" class="${c.warn ? 'warn' : ''}"><span class="dd-stn">${i + 1}</span><span class="dd-stl"><b>${esc(c.name)}</b><small>${esc(c.val)}</small></span></button>`).join('')}</div>
    <section class="dd-psec" id="pstep" role="tabpanel" aria-labelledby="pst-${n}" data-step="${step.id}"><h3 tabindex="-1">${n}. ${esc(step.name)}</h3><p class="dd-lead">${esc(step.lead)}</p>
    ${S.me === 'def' ? defStep(g, S.plan, step.id) : attStep(g, S.plan, step.id)}</section>
    <div class="dd-pnav"><button type="button" class="btn" data-pnav="-1" ${n === 1 ? 'hidden' : ''}>Back</button>${n < steps.length ? `<button type="button" class="btn" data-pnav="1">Next: ${esc(steps[n].name)}</button>` : ''}</div>`;
  const bad = list.filter(x => !x.ok);
  $('plan-check').innerHTML = `<p class="fine dd-chkh">${list.length - bad.length} of ${list.length} checks done${bad.length ? '' : ': ready'}</p>${bad.length ? `<ul class="dd-check">${bad.map(x => `<li class="${x.level === 'required' ? 'bad' : x.level === 'warn' ? 'warn' : 'info'}"><span aria-hidden="true">${x.level === 'required' ? '✗' : '!'}</span> ${esc(x.text)}${x.level === 'required' ? ' <small>(required)</small>' : ''}</li>`).join('')}</ul>` : ''}
    <button type="button" class="btn solid dd-startb" id="plan-start" ${ready ? '' : 'disabled'}>Start the battle</button>`;
}

/** Go to plan step n (1-based); focus its heading when asked. */
export function setPlanStep(n, focus = false) {
  S.planStep = clampStep(S.me, n);
  S.ui.redraw();
  if (focus) $('pstep')?.querySelector('h3')?.focus({ preventScroll: true });
}

/** The map popover in planning: one unit's planning tools. */
export function planUnitPanel(u) {
  const g = S.g;
  if (!u || !g) return '';
  const G = gridFor(g.scale), s = S.plan.place[u.id];
  const where = s == null || s < 0 ? 'not on the map' : `${G.zone[s]} zone, row ${G.row[s] + 1}`;
  const st = S.plan.stance && S.plan.stance[u.id];
  const tools = S.me === 'def' ? defUnitTools(g, S.plan, u) : attUnitTools(g, S.plan, u);
  return `<p class="dd-ph"><b>${esc(u.name)}</b> · ${esc(u.typeName || u.type)}<br><small class="muted">${esc(where)}${st ? ` · ${esc(STANCE_WORD[st] || st)}` : ''}</small></p>
    <p class="fine">Tap a sector to ${S.me === 'def' ? 'place it there' : 'move its start there'}.</p>${tools}`;
}

/** Can units of your side stand in sector s during planning? */
function placeable(g, s) {
  const G = gridFor(g.scale), Sc = SCALES[g.scale];
  return S.me === 'def' ? G.row[s] >= Sc.bands.outpost[0] : G.row[s] <= Sc.bands.assembly[1];
}

function place(g, sec) {
  const G = gridFor(g.scale), plan = S.plan;
  const ids = S.sel.filter(id => { const u = unitOf(id); return u && !(S.me === 'att' && isBattery(u)); });
  if (!ids.length) return 'Select units first (in the list, on the map, or a whole formation).';
  if (!placeable(g, sec)) return S.me === 'def' ? 'Place your units behind the outpost line.' : 'Your units start in the assembly trenches (the two rows at your end of the map).';
  const load = new Map();
  for (const u of g.units) if (u.side === S.me && isCompany(u) && !ids.includes(u.id) && plan.place[u.id] != null) load.set(plan.place[u.id], (load.get(plan.place[u.id]) || 0) + 1);
  const ring = [sec, ...G.nbrs[sec], ...G.nbrs[sec].flatMap(c => G.nbrs[c])].filter((s, i, a) => a.indexOf(s) === i && placeable(g, s));
  let k = 0, placed = 0;
  for (const id of ids) {
    const u = unitOf(id);
    if (!isCompany(u)) { plan.place[id] = sec; placed++; continue; }
    while (k < ring.length && (load.get(ring[k]) || 0) >= STACK.max) k++;
    if (k >= ring.length) break;
    plan.place[id] = ring[k]; load.set(ring[k], (load.get(ring[k]) || 0) + 1); placed++;
    if (ids.length > 1 && (load.get(ring[k]) || 0) >= 2) k++;   // spread a formation, two companies a sector
  }
  return `${placed} unit${placed === 1 ? '' : 's'} placed${placed < ids.length ? ` (${ids.length - placed} would not fit: at most ${STACK.max} companies a sector)` : ''}.`;
}

/** A tap on the planning map. Returns true if it did something. */
export function planTap(sec) {
  const g = S.g, t = S.tool;
  let msg = null;
  if (t && t.kind !== 'place') msg = S.me === 'def' ? defTap(g, S.plan, sec, t) : attTap(g, S.plan, sec, t);
  else if (S.sel.length) msg = place(g, sec);
  else return false;
  if (msg) say(msg);
  S.ui.redraw();
  return true;
}

/** Clicks in the plan pane or the planning popover. Returns true if handled. */
export function planClick(e) {
  const g = S.g;
  if (!g || g.phase !== 'plan') return false;
  const a = e.target.closest('[data-pa]');
  if (a) {
    if (a.dataset.pa === 'auto') { startPlan(); say('Auto-plan: the doctrinal plan the Standard computer would use for your side.'); }
    else { S.plan = S.me === 'def' ? blankDef(g) : blankAtt(g); say('Plan cleared. Required items are marked ✗ in the checklist.'); }
    S.tool = null; S.ui.redraw(); return true;
  }
  if (e.target.closest('#plan-start')) { onStartFn(); return true; }
  const ps = e.target.closest('[data-pstep]'); if (ps) { setPlanStep(+ps.dataset.pstep); $('plan-body').querySelector(`[data-pstep="${S.planStep}"]`)?.focus(); return true; }
  const pn = e.target.closest('[data-pnav]'); if (pn) { setPlanStep(S.planStep + +pn.dataset.pnav, true); return true; }
  const pu = e.target.closest('[data-pselu]'); if (pu) { S.ui.select([pu.dataset.pselu]); return true; }
  const tb = e.target.closest('[data-ptool]');
  if (tb) {
    const k = tb.dataset.ptool, w = tb.dataset.w;
    S.tool = S.tool && S.tool.kind === k && S.tool.w === w ? null : { kind: k, w };
    say(S.tool ? toolHelp(S.tool) : 'Tool put away. Select units and tap a sector to place them.');
    if (S.tool && narrow() && S.tab !== 'map' && S.ui.tab) S.ui.tab('map');   // phones: the tap goes on the map
    S.ui.redraw(); return true;
  }
  const msg = S.me === 'def' ? (defClick(e, S.plan) ? 'Plan updated.' : null) : attClick(e, g, S.plan);
  if (msg) { if (msg.trim()) say(msg); S.ui.redraw(); return true; }
  return false;
}
export function planChange(e) {
  const g = S.g;
  if (!g || g.phase !== 'plan') return;
  if (S.me === 'def' ? defChange(e, S.plan) : attChange(e, g, S.plan)) S.ui.redraw();
}
let onStartFn = () => {};

/** Wire the plan pane (once). onStart: begin the battle with S.plan. */
export function wirePlan(onStart) {
  onStartFn = onStart;
  const box = $('plan');
  box.addEventListener('click', planClick);
  box.addEventListener('change', planChange);
  box.addEventListener('keydown', e => {
    const tabs = [...box.querySelectorAll('[data-pstep]')], i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const j = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (j == null) return;
    e.preventDefault(); setPlanStep(((j % tabs.length) + tabs.length) % tabs.length + 1);
    box.querySelector(`[data-pstep="${S.planStep}"]`)?.focus();
  });
}

function toolHelp(t) {
  const k = t.kind;
  if (k === 'work') return 'Tap sectors to add or remove this work.';
  if (k === 'lane') return 'Tap a sector up to three from the selected MG company to lay its lane.';
  if (k === 'sos') return 'Tap up to two sectors for the selected battery’s defensive fire (SOS).';
  if (k === 'cstgt') return 'Tap sectors to mark planned counterstroke targets.';
  if (k === 'route') return 'Tap sectors one after another to draw the storm company’s route.';
  if (k === 'prep') return 'Tap sectors for the methodical preparation’s Destroy fire.';
  if (k === 'breach') return 'Tap the obstacle the selected pioneer company should clear.';
  return 'Tap a sector.';
}

