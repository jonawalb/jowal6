// The defender's plan steps (SPEC §1.2, §8.3; UI streamline #3): Zones (zone bar, share held back = f_r, the
// mini Fig. A.2, stances), MG lanes (coverage), Works (costs on each button), Counterattack (the counterstroke
// formation, its planning hours, plan targets) and Artillery (defensive-fire = SOS sectors, counter-battery,
// the era's systems), plus the per-unit tools the map popover shows.
import { SCALES } from '../../data/scales.js';
import { WORKS } from '../../data/terrain.js';
import { STACK } from '../../data/params.js';
import { gridFor, laneCells, popcount, FWD, opp } from '../grid.js';
import { isBattery, isCompany } from '../forces.js';
import { wpSpent, zoneShares } from '../plan-def.js';
import { S, esc, pct, unitOf } from './store.js';
import { EFFECT } from './order-effects.js';
import { infoBtn, pctTip } from './tips.js';
import { miniA2 } from './plan-charts.js';

const WORK_ORDER = ['trench', 'comm', 'obst', 'obstC', 'strong', 'concrete', 'dugout', 'dummy'];
const STANCES = [['hold', 'Hold'], ['elastic', 'Give ground'], ['delay', 'Delay'], ['riposte', 'Local counterattack'], ['reserve', 'Reserve']];

/** An empty plan (Clear): no works or lanes, everyone in the rear zone, no counterstroke formation. */
export function blankDef(g) {
  const G = gridFor(g.scale), Sc = SCALES[g.scale], plan = { works: [], place: {}, lanes: {}, stance: {}, sos: {}, cs: null, csTargets: [], cbPriority: 'located', ew: {}, drones: {}, form: {} };
  let k = 0;
  for (const u of g.units) {
    if (u.side !== 'def') continue;
    let s;
    do { s = G.idx(Sc.obj.row + 1 + Math.floor(k / (G.cols * STACK.max)), Math.floor(k / STACK.max) % G.cols); k++; } while (s < 0 && k < 9999);
    plan.place[u.id] = s >= 0 ? s : G.idx(G.rows - 1, 0);
    plan.stance[u.id] = 'hold';
  }
  return plan;
}

/** Share of battle-zone sectors covered from two or more directions under this plan. */
export function cover2(g, plan) {
  const G = gridFor(g.scale), m = new Uint8Array(G.n), place = plan.place || {};
  for (const u of g.units) {
    if (u.side !== 'def' || !isCompany(u)) continue;
    const s = place[u.id];
    if (s == null || s < 0) continue;
    if (u.type === 'mg' && plan.lanes[u.id] != null) for (const c of laneCells(G, g.sectors.elev, s, plan.lanes[u.id])) m[c] |= 1 << opp(plan.lanes[u.id]);
    for (const d of [FWD.def, (FWD.def + 1) & 7, (FWD.def + 7) & 7]) { const c = G.at(s, d); if (c >= 0) m[c] |= 1 << opp(d); }
  }
  let n = 0, k = 0;
  for (let s = 0; s < G.n; s++) if (G.zone[s] === 'battle') { n++; if (popcount(m[s]) >= 2) k++; }
  return n ? k / n : 0;
}

const tbtn = (k, t, extra = {}, tip = '') => { const tool = S.tool || {}; return `<button type="button" class="btn${tool.kind === k && (extra.w == null || tool.w === extra.w) ? ' armed' : ''}" data-ptool="${k}"${extra.w ? ` data-w="${extra.w}"` : ''}${tip ? ` title="${esc(tip)}"` : ''}>${t}</button>`; };
const WORK_TIP = { trench: 'Frontal cover for the men in it', comm: 'Covered movement front to rear', obst: 'Holds attackers in your fire for an hour', obstC: 'Concealed: not on his air photographs',
  strong: 'All-round cover; keeps firing into the flanks of a break-in', concrete: 'Halves artillery losses in a strongpoint', dugout: 'Cuts artillery losses for men who stay put', dummy: 'Looks like a strongpoint to the enemy' };

/** The numbers behind the step chips. */
export function defSummary(g, plan) {
  const Sc = SCALES[g.scale], z = zoneShares(g, plan.place), mgs = g.units.filter(u => u.side === 'def' && u.type === 'mg');
  const bats = g.units.filter(u => u.side === 'def' && isBattery(u)), cs = plan.cs && g.fmns[plan.cs];
  return { fr: z.fr, fwd: z.fwd, lanes: mgs.filter(u => plan.lanes[u.id] != null).length, mgs: mgs.length, wp: wpSpent(plan), wpMax: Sc.wp,
    cs: cs ? cs.name : null, sos: bats.filter(b => plan.sos[b.id] && plan.sos[b.id].length).length, bats: bats.length };
}

/** One step of the defender's plan: 'zones' | 'lanes' | 'works' | 'cs' | 'arty'. */
export function defStep(g, plan, id) {
  const Sc = SCALES[g.scale], G = gridFor(g.scale);
  if (id === 'works') {
    const wp = wpSpent(plan);
    return `<p class="dd-plabel">Work points <b class="num">${wp} of ${Sc.wp}</b></p><div class="dd-budget" aria-hidden="true"><i style="width:${Math.min(100, 100 * wp / Sc.wp)}%"></i></div>
    <div class="dd-tools">${WORK_ORDER.map(w => tbtn('work', `${WORKS[w].label.replace('Wire / minefield', g.era === 'm' ? 'Mines' : 'Wire')} <small>${WORKS[w].wp} pt${WORKS[w].wp === 1 ? '' : 's'}</small>`, { w }, `${WORK_TIP[w] || ''}: costs ${WORKS[w].wp} work point${WORKS[w].wp === 1 ? '' : 's'}`)).join('')}</div>
    <p class="fine">Pick a work, then tap sectors behind the outpost line. Tap again to remove. The main trench rows are already dug.</p>`;
  }
  if (id === 'lanes') {
    const mgs = g.units.filter(u => u.side === 'def' && u.type === 'mg'), c2 = cover2(g, plan);
    return `<p>Battle zone covered from 2+ directions: ${pctTip(pct(c2), 'coverage', { share: c2 })}</p>
    <div class="dd-tools dd-mglist">${mgs.map(u => `<button type="button" class="btn" data-pselu="${u.id}" aria-pressed="${S.sel.length === 1 && S.sel[0] === u.id}">${esc(u.short)} <small>${plan.lanes[u.id] != null ? '✓ lane' : 'no lane'}</small></button>`).join('')}</div>
    <div class="dd-tools">${tbtn('lane', 'Lay lane (K)', {}, 'Then tap a sector up to three away from the selected MG')}${tbtn('nolane', 'Clear lane')}</div>
    <p class="fine">Only MG companies lay fire lanes. Pick one, press Lay lane, tap a sector to its side: east–west lanes run along the attackers’ lines.</p>`;
  }
  if (id === 'cs') {
    const cs = Object.values(g.fmns).filter(f => f.side === 'def' && f.cs);
    return `<div class="dd-seg" role="group" aria-label="Counterattack formation">${cs.map(f => `<button type="button" class="btn" data-pcs="${f.id}" aria-pressed="${plan.cs === f.id}" title="The counterstroke formation">${esc(f.name)}</button>`).join('')}</div>
    <p class="fine">It waits in the rear zone and strikes a lodgment <b>${Sc.csPlan} h</b> after you order it (planning time). Marking targets now is optional.</p>
    <div class="dd-tools">${tbtn('cstgt', 'Mark planned targets')}</div>`;
  }
  if (id === 'arty') {
    const bats = g.units.filter(u => u.side === 'def' && isBattery(u));
    return `<p class="fine">Each battery fires at once, with no delay, on the first of its two defensive-fire sectors that attackers enter (Hunzeker p. 75). <b>${bats.filter(b => plan.sos[b.id] && plan.sos[b.id].length).length} of ${bats.length}</b> batteries have sectors.</p>
    <div class="dd-tools dd-mglist">${bats.map(u => `<button type="button" class="btn" data-pselu="${u.id}" aria-pressed="${S.sel.length === 1 && S.sel[0] === u.id}">${esc(u.short)} <small>${(plan.sos[u.id] || []).length} of 2</small></button>`).join('')}</div>
    <div class="dd-tools">${tbtn('sos', 'Defensive fire sectors', {}, 'SOS: pick a battery, then tap up to two sectors')}</div>
    <label class="dd-lab dd-det" title="Counter-battery (CB): your guns answer his located batteries">Counter-battery <select data-pcb><option value="located" ${plan.cbPriority !== 'none' ? 'selected' : ''}>Fire on located batteries</option><option value="none" ${plan.cbPriority === 'none' ? 'selected' : ''}>None</option></select></label>
    ${g.era === 'm' ? `<p class="fine">Drones and EW: pick a drone team and tap its patrol area, or the EW team and tap where it jams.</p><div class="dd-tools">${tbtn('drone', 'Drone patrol')}${tbtn('ew', 'EW position')}</div>`
    : '<p class="fine dd-det">Air observation (one sortie an hour over a 3 × 3 block) and gas are ordered during the battle.</p>'}`;
  }
  // zones
  const z = zoneShares(g, plan.place), rows = Object.values(plan.place).filter(s => s >= 0).map(s => G.row[s]);
  const depth = rows.length ? (Math.max(...rows) - Sc.bands.outpost[0] + 1) * 0.5 : 0;
  const sel = S.sel.map(unitOf).filter(Boolean);
  const frTip = { title: `Share held back: ${pct(z.fr)} (f_r = ${z.fr.toFixed(2)})`, lines: ['Rear-zone share of your infantry strength: Biddle’s reserve fraction f_r', `Outpost ${pct(z.outpost)} · battle ${pct(z.battle)} · rear ${pct(z.rear)}`],
    notes: ['On Biddle’s own chart (Fig. A.2, p. 220) shallow defenses or tiny reserves break; depth and reserves are weak substitutes for each other. An illustration, not a forecast for this map.'] };
  return `<div class="dd-zbar" aria-label="Infantry strength by zone"><i class="o" style="width:${100 * z.outpost}%"></i><i class="b" style="width:${100 * z.battle}%"></i><i class="r" style="width:${100 * z.rear}%"></i></div>
    <p class="dd-zl">Outpost ${pct(z.outpost)} · Battle ${pct(z.battle)} · Rear ${pct(z.rear)} · <b>Share held back ${pct(z.fr)}</b>${infoBtn(frTip, 'Share held back')}</p>
    ${z.fwd > 0.5 ? `<p class="dd-warnl">${pct(z.fwd)} of your infantry is in the outpost zone or the first trench row: dense front lines die to bombardment (Hunzeker pp. 55, 80).</p>` : ''}
    <div class="dd-a2box dd-det">${miniA2(z.fr, depth)}<p class="fine">Biddle’s Fig. A.2 (p. 220), redrawn. Your dot: f_r ${z.fr.toFixed(2)}, ${depth.toFixed(1)} km deep.</p></div>
    <p class="fine">Select units (map, list, or a whole formation), then tap a sector to place them.${S.sel.length ? ` <b>${S.sel.length} selected.</b>` : ''}</p>
    ${sel.length ? `<div class="dd-orow"><span class="dd-olab">Stance</span><div class="dd-seg" role="group" aria-label="Stance for the selection">${STANCES.map(([v, t]) => `<button type="button" class="btn" data-pstance="${v}" aria-pressed="${sel.every(u => plan.stance[u.id] === v)}" title="${esc(EFFECT.stance[v])}">${t}</button>`).join('')}</div></div>` : ''}`;
}

/** Planning tools for one unit (the map popover). */
export function defUnitTools(g, plan, u) {
  const out = [];
  if (isCompany(u)) out.push(`<div class="dd-orow"><span class="dd-olab">Stance</span><div class="dd-seg" role="group" aria-label="Stance">${STANCES.map(([v, t]) => `<button type="button" class="btn" data-pstance="${v}" aria-pressed="${plan.stance[u.id] === v}" title="${esc(EFFECT.stance[v])}">${t}</button>`).join('')}</div></div>`);
  if (u.type === 'mg') out.push(`<div class="dd-orow"><span class="dd-olab">Fire lane</span><div class="dd-tools">${tbtn('lane', 'Lay lane (K)', {}, 'Then tap a sector up to three away')}${tbtn('nolane', 'Clear lane')}</div></div>`);
  if (isBattery(u)) out.push(`<div class="dd-orow"><span class="dd-olab">Fire</span><div class="dd-tools">${tbtn('sos', `Defensive fire sectors <small>${(plan.sos[u.id] || []).length} of 2</small>`, {}, 'SOS: tap up to two sectors')}</div></div>`);
  if (u.type === 'drone') out.push(`<div class="dd-tools">${tbtn('drone', 'Drone patrol')}</div>`);
  if (u.type === 'ew') out.push(`<div class="dd-tools">${tbtn('ew', 'EW position')}</div>`);
  return out.join('');
}

/** A tap on the planning map with a defender tool armed. Returns a message or null. */
export function defTap(g, plan, sec, tool) {
  const G = gridFor(g.scale), Sc = SCALES[g.scale];
  const behind = G.row[sec] >= Sc.bands.outpost[0];
  const one = S.sel.length === 1 ? unitOf(S.sel[0]) : null;
  switch (tool.kind) {
    case 'work': {
      if (!behind) return 'Works go behind the outpost line, in your own zones.';
      const i = plan.works.findIndex(w => w.sec === sec && w.kind === tool.w);
      if (i >= 0) { plan.works.splice(i, 1); return `${WORKS[tool.w].label} removed.`; }
      if (tool.w === 'concrete' && !plan.works.some(w => w.sec === sec && w.kind === 'strong') && !g.sectors.feat.strong[sec]) return 'Concrete needs a strongpoint in the same sector.';
      if (wpSpent(plan) + WORKS[tool.w].wp > Sc.wp) return `Not enough work points (${WORKS[tool.w].wp} needed).`;
      plan.works.push({ sec, kind: tool.w });
      return `${WORKS[tool.w].label} added (${WORKS[tool.w].wp} WP).`;
    }
    case 'lane': case 'nolane': {
      if (!one || one.type !== 'mg') return 'Select one MG company first: only MG companies lay fire lanes.';
      if (tool.kind === 'nolane') { delete plan.lanes[one.id]; return 'Lane cleared.'; }
      const from = plan.place[one.id], d = G.dirTo(from, sec);
      if (d < 0) return 'Tap a sector away from the MG, in one of eight directions.';
      plan.lanes[one.id] = d; S.lanesLaid = (S.lanesLaid || 0) + 1;   // the walkthrough watches this count
      const cells = laneCells(G, g.sectors.elev, from, d);
      return `${esc(one.short)} lane laid: ${cells.length} sector${cells.length === 1 ? '' : 's'}${cells.length < 3 ? ' (a crest cuts it short)' : ''}${d === 2 || d === 6 ? ', across the front: it enfilades waves' : ''}.`;
    }
    case 'sos': {
      if (!one || !isBattery(one)) return 'Select one battery first.';
      const list = plan.sos[one.id] || (plan.sos[one.id] = []);
      const i = list.indexOf(sec);
      if (i >= 0) list.splice(i, 1); else { if (list.length >= 2) list.shift(); list.push(sec); }
      return `${esc(one.short)} defensive fire: ${list.length} sector${list.length === 1 ? '' : 's'}.`;
    }
    case 'cstgt': {
      const t = plan.csTargets || (plan.csTargets = []), i = t.indexOf(sec);
      if (i >= 0) t.splice(i, 1); else t.push(sec);
      return `${t.length} planned counterstroke target${t.length === 1 ? '' : 's'}.`;
    }
    case 'drone': if (!one || one.type !== 'drone') return 'Select a drone team first.'; plan.drones[one.id] = sec; return 'Patrol area set.';
    case 'ew': if (!one || one.type !== 'ew') return 'Select the EW team first.'; plan.ew[one.id] = sec; return 'Jamming position set.';
    default: return null;
  }
}

/** Clicks inside the defender pane. Returns true if handled. */
export function defClick(e, plan) {
  const st = e.target.closest('[data-pstance]');
  if (st) { for (const id of S.sel) if (unitOf(id) && unitOf(id).side === 'def') plan.stance[id] = st.dataset.pstance; return true; }
  const c = e.target.closest('[data-pcs]');
  if (c) { plan.cs = c.dataset.pcs; return true; }
  return false;
}
export function defChange(e, plan) {
  if (e.target.matches('[data-pcb]')) { plan.cbPriority = e.target.value; return true; }
  return false;
}
