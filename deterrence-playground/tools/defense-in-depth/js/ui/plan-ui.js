// The planning phase (SPEC §1.2, §8.3): the same map, a Plan pane (defender or attacker) and the Units pane;
// phone tabs Map | Plan | Units. Auto-plan fills the Standard computer's plan for your side, Clear empties it,
// and the checklist must have every required item green before "Start the battle".
import { SCALES } from '../../data/scales.js';
import { STACK } from '../../data/params.js';
import { gridFor } from '../grid.js';
import { isBattery, isCompany } from '../forces.js';
import { checkDef, planReady } from '../plan-def.js';
import { checkAtt } from '../plan-att.js';
import { S, $, esc, say, unitOf } from './store.js';
import { autoPlan } from './ai-bridge.js';
import { defPane, defTap, defClick, defChange, blankDef } from './plan-def-ui.js';
import { attPane, attTap, attClick, attChange, blankAtt, normalizeAtt } from './plan-att-ui.js';

const clone = x => JSON.parse(JSON.stringify(x));

/** A fresh plan: the Standard computer's plan for your side (you can change everything). */
export function startPlan() {
  const g = S.g;
  S.plan = clone(autoPlan(g, S.me));
  if (S.me === 'att') normalizeAtt(g, S.plan);
  else S.plan.csTargets ||= [];
}

export const checklist = () => (S.me === 'def' ? checkDef(S.g, S.plan) : checkAtt(S.g, S.plan));

export function renderPlan() {
  const g = S.g, Sc = SCALES[g.scale];
  const list = checklist(), ready = planReady(list);
  $('plan-head').innerHTML = `<h2>${S.me === 'def' ? 'Plan your defense' : 'Plan your attack'}</h2>
    <p class="fine">${S.me === 'def' ? `Hold ${esc(Sc.obj.name)}: the attacker needs ${Sc.obj.need} side-by-side sectors of it at the end.` : `Take ${Sc.obj.need} side-by-side sectors of ${esc(Sc.obj.name)} and hold them at the end.`} The plan below is a sound doctrinal one; change anything, or press Clear and build your own. There is no clock.</p>
    <div class="dd-go"><button type="button" class="btn" data-pa="auto">Auto-plan (doctrinal)</button><button type="button" class="btn" data-pa="clear">Clear</button></div>`;
  $('plan-body').innerHTML = S.me === 'def' ? defPane(g, S.plan) : attPane(g, S.plan);
  $('plan-check').innerHTML = `<ul class="dd-check">${list.map(x => `<li class="${x.ok ? 'ok' : x.level === 'required' ? 'bad' : x.level === 'warn' ? 'warn' : 'info'}"><span aria-hidden="true">${x.ok ? '✓' : x.level === 'required' ? '✗' : '!'}</span> ${esc(x.text)}${!x.ok && x.level === 'required' ? ' <small>(required)</small>' : ''}</li>`).join('')}</ul>
    <button type="button" class="btn solid dd-startb" id="plan-start" ${ready ? '' : 'disabled'}>Start the battle</button>`;
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

/** Wire the plan pane (once). onStart: begin the battle with S.plan. */
export function wirePlan(onStart) {
  const box = $('plan');
  box.addEventListener('click', e => {
    const g = S.g;
    if (!g || g.phase !== 'plan') return;
    const a = e.target.closest('[data-pa]');
    if (a) {
      if (a.dataset.pa === 'auto') { startPlan(); say('Auto-plan: the doctrinal plan the Standard computer would use for your side.'); }
      else { S.plan = S.me === 'def' ? blankDef(g) : blankAtt(g); say('Plan cleared. Required items are marked ✗ in the checklist.'); }
      S.tool = null; S.ui.redraw(); return;
    }
    if (e.target.closest('#plan-start')) { onStart(); return; }
    const tb = e.target.closest('[data-ptool]');
    if (tb) {
      const k = tb.dataset.ptool, w = tb.dataset.w;
      S.tool = S.tool && S.tool.kind === k && S.tool.w === w ? null : { kind: k, w };
      say(S.tool ? toolHelp(S.tool) : 'Tool put away. Select units and tap a sector to place them.');
      S.ui.redraw(); return;
    }
    const msg = S.me === 'def' ? (defClick(e, S.plan) ? 'Plan updated.' : null) : attClick(e, g, S.plan);
    if (msg) { say(msg); S.ui.redraw(); }
  });
  box.addEventListener('change', e => {
    const g = S.g;
    if (!g || g.phase !== 'plan') return;
    if (S.me === 'def' ? defChange(e, S.plan) : attChange(e, g, S.plan)) S.ui.redraw();
  });
}

function toolHelp(t) {
  const k = t.kind;
  if (k === 'work') return 'Tap sectors to add or remove this work.';
  if (k === 'lane') return 'Tap a sector up to three from the selected MG company to lay its lane.';
  if (k === 'sos') return 'Tap up to two sectors for the selected battery’s SOS fire.';
  if (k === 'cstgt') return 'Tap sectors to mark planned counterstroke targets.';
  if (k === 'route') return 'Tap sectors one after another to draw the storm company’s route.';
  if (k === 'prep') return 'Tap sectors for the methodical preparation’s Destroy fire.';
  if (k === 'breach') return 'Tap the obstacle the selected pioneer company should clear.';
  return 'Tap a sector.';
}

