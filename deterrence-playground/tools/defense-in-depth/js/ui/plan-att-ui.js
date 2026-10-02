// The attacker's Plan pane (SPEC §1.2, §8.3): frontage (main effort, fixing and quiet columns), each battalion's
// formation and default posture, infiltration routes, the preparation and the creeping barrage with its
// timetable strip, battery roles, reserves, engineers' breach targets, the era's systems and the objective type.
// The H-hour orders follow from these choices (rebuildAtt), the same layout the default plan uses.
import { SCALES } from '../../data/scales.js';
import { STACK, PREP } from '../../data/params.js';
import { gridFor } from '../grid.js';
import { isBattery, isCompany, knows } from '../forces.js';
import { prepCost } from '../plan-att.js';
import { S, esc, unitOf } from './store.js';
import { timetable } from './plan-charts.js';

const LIFTS = [0.5, 1, 1.5, 2];
const bnOf = u => u.fmn[u.fmn.length - 1];

/** Battalions that assault (first wave, storm, and second wave). */
export const assaultBns = g => Object.values(g.fmns).filter(f => f.side === 'att' && f.kind === 'bn' && ['wave1', 'wave2', 'storm'].includes(f.role));

/** Re-derive placement and H-hour orders from the frontage and battalion choices (keeps routes and roles). */
export function rebuildAtt(g, plan) {
  const G = gridFor(g.scale), Sc = SCALES[g.scale], B = Sc.bands, obj = Sc.obj.row;
  const main = plan.mainCols.length ? plan.mainCols : [Math.floor(G.cols / 2)];
  plan.place = {}; plan.orders = []; plan.form = {}; plan.posture = {};
  const load = new Map();
  const put = (u, r, c) => {
    for (let k = 0; k < 4 * G.cols; k++) {
      const rr = k >= 2 * G.cols ? 1 - r : r, cc = Math.max(0, Math.min(G.cols - 1, c + (k % 2 ? -1 : 1) * Math.ceil((k % (2 * G.cols)) / 2))), s = G.idx(rr, cc);
      if ((load.get(s) || 0) < STACK.max) { load.set(s, (load.get(s) || 0) + 1); plan.place[u.id] = s; return s; }
    }
    return -1;
  };
  const att = g.units.filter(u => u.side === 'att' && !isBattery(u));
  const fixCols = [];
  for (let c = 0; c < G.cols; c++) if (!main.includes(c) && (plan.fix[c] || 'fix') === 'fix') fixCols.push(c);
  const fixers = att.filter(u => u.role === 'wave2' && u.type === 'rifle').slice(0, fixCols.length);
  fixers.forEach((u, i) => { put(u, 1, fixCols[i]); plan.form[u.id] = 'groups'; plan.orders.push({ unit: u.id, to: G.idx(B.nml[0], fixCols[i]) }); });
  const fixing = new Set(fixers.map(u => u.id));
  const setting = u => plan.bn[bnOf(u)] || {};
  let mi = 0;
  const byBn = new Map();
  for (const u of att) {
    if (fixing.has(u.id)) continue;
    const c = main[mi++ % main.length], st = setting(u);
    plan.form[u.id] = st.form || 'groups';
    if (u.role === 'storm' || (st.posture === 'infil' && (u.type === 'rifle' || u.type === 'storm'))) {
      put(u, 1, c); plan.posture[u.id] = 'infil';
      const route = plan.routes[u.id];
      plan.orders.push({ unit: u.id, to: route && route.length ? route[route.length - 1] : G.idx(obj, c) });
      continue;
    }
    if (u.role === 'wave1' || (u.role === 'wave2' && st.posture)) {
      put(u, u.role === 'wave1' ? 1 : 0, c);
      if (!byBn.has(bnOf(u))) byBn.set(bnOf(u), []); byBn.get(bnOf(u)).push(u); continue;
    }
    put(u, 0, c);
    if (u.role === 'mortar') plan.orders.push({ unit: u.id, to: G.idx(B.nml[0], c) });
    if (u.type === 'tank') plan.orders.push({ unit: u.id, to: G.idx(obj, c) });
  }
  let k = 0;
  for (const [bn, list] of byBn) {
    const st = plan.bn[bn] || {}, posture = st.posture || 'leapfrog';
    const ord = [...list.filter(u => u.type !== 'mg'), ...list.filter(u => u.type === 'mg')];
    if (posture === 'leapfrog') {
      for (let j = 0; j + 1 < ord.length; j += 2) { const to = G.idx(obj, main[k++ % main.length]); plan.orders.push({ unit: ord[j].id, unit2: ord[j + 1].id, to, to2: to }); }
      if (ord.length % 2) plan.orders.push({ unit: ord[ord.length - 1].id, to: G.idx(obj, main[k++ % main.length]) });
    } else for (const u of ord) { plan.posture[u.id] = 'rush'; plan.orders.push({ unit: u.id, to: G.idx(obj, main[k++ % main.length]) }); }
  }
  if (plan.barrage && plan.barrageOnMain !== false) plan.barrage.cols = main.slice();
  return plan;
}

/** Fill the editable fields a plan may lack (an Auto-plan or an old link). */
export function normalizeAtt(g, plan) {
  plan.fix ||= {}; plan.bn ||= {}; plan.routes ||= {}; plan.bats ||= {}; plan.reserves ||= {}; plan.engineers ||= {}; plan.prepTargets ||= [];
  plan.objective ||= { type: 'breakthrough' };
  for (const f of assaultBns(g)) plan.bn[f.id] ||= { form: 'groups', posture: f.role === 'storm' ? 'infil' : f.role === 'wave1' ? 'leapfrog' : '' };
  return plan;
}

/** Clear: one central main-effort column, waves rushing, no preparation or barrage. */
export function blankAtt(g) {
  const G = gridFor(g.scale), plan = normalizeAtt(g, { mainCols: [Math.floor(G.cols / 2)], prep: 'none', barrage: null, predicted: false });
  for (const f of assaultBns(g)) plan.bn[f.id] = { form: 'waves', posture: f.role === 'storm' ? 'infil' : f.role === 'wave1' ? 'rush' : '' };
  for (const b of g.units) if (b.side === 'att' && isBattery(b)) plan.bats[b.id] = 'call';
  return rebuildAtt(g, plan);
}

const opt = (v, cur, t) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${t}</option>`;

export function attPane(g, plan) {
  const G = gridFor(g.scale), Sc = SCALES[g.scale], tool = S.tool || {};
  const tbtn = (k, t) => `<button type="button" class="btn${tool.kind === k ? ' armed' : ''}" data-ptool="${k}">${t}</button>`;
  const colBtn = c => { const m = plan.mainCols.includes(c), f = !m && (plan.fix[c] || 'fix') === 'fix'; return `<button type="button" class="dd-colb ${m ? 'main' : f ? 'fix' : 'quiet'}" data-col="${c}" aria-label="Column ${c + 1}: ${m ? 'main effort' : f ? 'fixing' : 'quiet'}">${c + 1}<small>${m ? 'Main' : f ? 'Fix' : '—'}</small></button>`; };
  const bns = assaultBns(g), bats = g.units.filter(u => u.side === 'att' && isBattery(u));
  const nb = bats.filter(b => plan.bats[b.id] === 'barrage').length, ncb = bats.filter(b => plan.bats[b.id] === 'cb').length;
  const b = plan.barrage, bnRows = bns.filter(f => plan.bn[f.id] && plan.bn[f.id].posture).map(f => ({ name: `${g.fmns[f.parent]?.name || ''} ${f.name}`.trim(), posture: plan.bn[f.id].posture, start: f.role === 'wave2' ? 0 : 1 }));
  const tt = b ? timetable(b, [Sc.bands.outpost[0], Sc.obj.row], g.turns, bnRows) : null;
  const predicted = g.units.filter(u => u.side === 'att' && isBattery(u)).every(u => knows(u, 'CA1'));
  const echelon = Object.values(g.fmns).filter(f => f.side === 'att' && f.role === 'echelon2');
  const cost = prepCost(g, plan);
  return `
  <section class="dd-psec"><h3>Frontage</h3>
    <p class="fine">Tap a column to cycle Main effort → Fixing (one company pins the outposts) → Quiet. Narrow concentrates force but invites enfilade from both shoulders and crowding (Biddle pp. 43–44, 120; Hunzeker pp. 53–54).</p>
    <div class="dd-cols">${Array.from({ length: G.cols }, (_, c) => colBtn(c)).join('')}</div>
    ${plan.mainCols.length === 1 ? '<p class="dd-warnl">A one-column main effort is swept from both shoulders.</p>' : ''}</section>
  <section class="dd-psec"><h3>Battalions</h3>
    <div class="dd-bns">${bns.map(f => { const st = plan.bn[f.id] || {}; return `<div class="dd-bn"><b>${esc(g.fmns[f.parent]?.name || '')} · ${esc(f.name)}</b>
      <select data-bnform="${f.id}" aria-label="Formation">${opt('groups', st.form, 'Small groups')}${opt('waves', st.form, 'Waves')}</select>
      <select data-bnpost="${f.id}" aria-label="Posture">${f.role === 'wave2' ? opt('', st.posture, 'Second wave (assembly)') : ''}${opt('leapfrog', st.posture, 'Leapfrog pairs')}${opt('rush', st.posture, 'Rush')}${opt('infil', st.posture, 'Infiltrate')}</select></div>`; }).join('')}</div>
    <p class="fine">Leapfrog pairs the battalion’s companies: one overwatches while the other bounds (Hunzeker p. 56). Rush is fastest and most exposed.</p></section>
  <section class="dd-psec"><h3>Infiltration routes</h3><p class="fine">Select a storm company, press Route, and tap sectors in order. Green sectors are away from the trenches and strongpoints on your air photographs; amber ones are next to them.</p>
    <div class="dd-tools">${tbtn('route', 'Route')}<button type="button" class="btn" data-clearroute>Clear route</button></div></section>
  <section class="dd-psec"><h3>Fire plan <small class="num">${g.ammo.att} ammo</small></h3>
    <label class="dd-lab">Preparation <select data-prep>${opt('none', plan.prep, 'None')}${opt('hurricane', plan.prep, 'Hurricane (1 h)')}${opt('methodical', plan.prep, 'Methodical (6 h)')}</select></label>
    <p class="fine">${plan.prep === 'hurricane' ? `${predicted ? 'Predicted fire: no registration, no warning.' : 'Without predicted fire, registration warns the defender.'}` : plan.prep === 'methodical' ? `Destroy fire on up to ${PREP.sectorsPerGroup * Math.ceil(bats.length / PREP.groupSize)} sectors: cuts wire, kills exposed men, churns the ground and shows him where you will attack.` : 'No preparation: full surprise, nothing cut.'} Cost ${cost}.</p>
    ${plan.prep === 'methodical' ? `<div class="dd-tools">${tbtn('prep', `Preparation targets (${plan.prepTargets.length})`)}</div>` : ''}
    <label class="dd-lab"><input type="checkbox" data-barr ${b ? 'checked' : ''}> Creeping barrage on the main effort</label>
    ${b ? `<label class="dd-lab">Lift rate <select data-rate>${LIFTS.map(r => opt(r, b.rate, `${r} row${r === 1 ? '' : 's'} an hour`)).join('')}</select></label>
      <label class="dd-lab">Starts on <select data-r0>${Array.from({ length: Sc.bands.battle[0] - Sc.bands.nml[0] + 1 }, (_, i) => Sc.bands.nml[0] + i).map(r => opt(r, b.r0, `row ${r + 1}`)).join('')}</select></label>
      <div class="dd-ttbox">${tt.svg}</div>
      <p class="fine${tt.warn.late || tt.warn.early ? ' dd-warnl' : ''}">Predicted: ${tt.warn.early} arrival${tt.warn.early === 1 ? '' : 's'} after the barrage has lifted (gap), ${tt.warn.late} into its own barrage. Dots are battalions at their default pace (NOTIONAL: Rush 1 row/h, Leapfrog 0.75).</p>` : ''}
    <p>Batteries: <b>${nb}</b> barrage · <b>${ncb}</b> counter-battery · <b>${bats.length - nb - ncb}</b> on call
      <span class="dd-seg" role="group" aria-label="Batteries on the barrage"><button type="button" class="btn" data-bat="-1" aria-label="One fewer on the barrage">−</button><button type="button" class="btn" data-bat="1" aria-label="One more on the barrage">+</button></span>
      <span class="dd-seg" role="group" aria-label="Batteries on counter-battery"><button type="button" class="btn" data-cb="-1" aria-label="One fewer on counter-battery">CB −</button><button type="button" class="btn" data-cb="1" aria-label="One more on counter-battery">CB +</button></span></p></section>
  <section class="dd-psec"><h3>Reserves and support</h3>
    ${echelon.map(f => { const r = plan.reserves[f.id] || { mode: 'assembly' }; return `<label class="dd-lab">${esc(f.name)} <select data-res="${f.id}">${opt('assembly', r.mode === 'assembly' ? 'assembly' : '', 'Wait in assembly')}${[2, 3, 4, 5, 6, 8].map(h => opt(h, r.mode === 'follow' ? r.hour : '', `Follow success at H+${h}`)).join('')}</select></label>`; }).join('') || '<p class="fine">Second-wave battalions left in assembly are your reserve: send them in during the battle.</p>'}
    <p class="fine">Engineers clear wire or mines in 2 hours: select a pioneer company, press Breach, tap the obstacle. ${g.era === 'w' ? 'Your tank section follows the main effort; it crushes wire but breaks down often.' : 'Tank companies follow the main effort; keep infantry with them or anti-tank fire shreds them.'}</p>
    <div class="dd-tools">${tbtn('breach', 'Breach target')}${g.era === 'm' ? tbtn('ew', 'EW position') : ''}</div></section>
  <section class="dd-psec"><h3>Objective</h3>
    <label class="dd-lab">Type <select data-obj>${opt('breakthrough', plan.objective.type, 'Breakthrough (keep going)')}${opt('bite', plan.objective.type, 'Bite and hold (consolidate on a row)')}</select></label>
    ${plan.objective.type === 'bite' ? `<label class="dd-lab">Limit row <select data-objrow>${Array.from({ length: Sc.obj.row - Sc.bands.outpost[0] + 1 }, (_, i) => Sc.bands.outpost[0] + i).map(r => opt(r, plan.objective.row, `row ${r + 1}${r === Sc.obj.row ? ' (the objective line)' : ''}`)).join('')}</select></label>` : ''}
    <p class="fine">You win only by holding ${Sc.obj.need} side-by-side sectors of ${esc(Sc.obj.name)} at the end. Bite and hold digs in early against counterattacks; breakthrough keeps moving under (or beyond) your guns.</p></section>`;
}

/** Amber if a sector sits next to a trench or strongpoint on the attacker's air photographs. */
export const routeRisk = (g, s) => gridFor(g.scale).nbrs[s].concat(s).some(c => g.known.att[c] & 9);

export function attTap(g, plan, sec, tool) {
  const G = gridFor(g.scale), Sc = SCALES[g.scale], one = S.sel.length === 1 ? unitOf(S.sel[0]) : null;
  switch (tool.kind) {
    case 'route': {
      if (!one || !isCompany(one) || one.type !== 'storm') return 'Select one storm company first.';
      const r = plan.routes[one.id] || (plan.routes[one.id] = []);
      const last = r.length ? r[r.length - 1] : plan.place[one.id];
      if (!G.adj(last, sec)) return 'Tap a sector next to the end of the route.';
      r.push(sec); rebuildAtt(g, plan);
      return `Route: ${r.length} sector${r.length === 1 ? '' : 's'}; this one is ${routeRisk(g, sec) ? 'amber (next to a known position)' : 'green'}.`;
    }
    case 'prep': {
      const t = plan.prepTargets, i = t.indexOf(sec), max = PREP.sectorsPerGroup * Math.ceil(g.units.filter(u => u.side === 'att' && isBattery(u)).length / PREP.groupSize);
      if (i >= 0) t.splice(i, 1); else if (t.length < max) t.push(sec); else return `At most ${max} preparation targets.`;
      return `${t.length} of ${max} preparation targets.`;
    }
    case 'breach': if (!one || one.type !== 'pioneer') return 'Select a pioneer company first.'; plan.engineers[one.id] = sec; return 'Breach target set.';
    case 'ew': if (!one || one.type !== 'ew') return 'Select the EW team first.'; plan.ew[one.id] = sec; return 'Jamming position set.';
    case 'col': return cycleCol(g, plan, G.col[sec]);
    default: return Sc ? null : null;
  }
}

function cycleCol(g, plan, c) {
  const m = plan.mainCols.includes(c), f = !m && (plan.fix[c] || 'fix') === 'fix';
  if (m) { plan.mainCols = plan.mainCols.filter(x => x !== c); plan.fix[c] = 'fix'; }
  else if (f) plan.fix[c] = 'quiet';
  else { plan.mainCols = [...plan.mainCols, c].sort((a, b) => a - b); delete plan.fix[c]; }
  rebuildAtt(g, plan);
  return `Column ${c + 1}: ${plan.mainCols.includes(c) ? 'main effort' : (plan.fix[c] || 'fix') === 'fix' ? 'fixing' : 'quiet'}.`;
}

export function attClick(e, g, plan) {
  const col = e.target.closest('[data-col]');
  if (col) return cycleCol(g, plan, +col.dataset.col);
  const bats = g.units.filter(u => u.side === 'att' && isBattery(u));
  const shift = (role, d) => {
    if (d > 0) { const b = bats.find(x => (plan.bats[x.id] || 'call') === 'call'); if (b) plan.bats[b.id] = role; }
    else { const b = [...bats].reverse().find(x => plan.bats[x.id] === role); if (b) plan.bats[b.id] = 'call'; }
    if (plan.barrage) plan.barrage.bats = bats.filter(x => plan.bats[x.id] === 'barrage').map(x => x.id);
  };
  const bt = e.target.closest('[data-bat]'); if (bt) { shift('barrage', +bt.dataset.bat); return 'Battery roles changed.'; }
  const cb = e.target.closest('[data-cb]'); if (cb) { shift('cb', +cb.dataset.cb); return 'Battery roles changed.'; }
  if (e.target.closest('[data-clearroute]')) { for (const id of S.sel) delete plan.routes[id]; rebuildAtt(g, plan); return 'Route cleared.'; }
  return null;
}

export function attChange(e, g, plan) {
  const t = e.target, Sc = SCALES[g.scale];
  if (t.matches('[data-bnform]')) { (plan.bn[t.dataset.bnform] ||= {}).form = t.value; }
  else if (t.matches('[data-bnpost]')) { (plan.bn[t.dataset.bnpost] ||= {}).posture = t.value; }
  else if (t.matches('[data-prep]')) plan.prep = t.value;
  else if (t.matches('[data-barr]')) {
    const bats = g.units.filter(u => u.side === 'att' && isBattery(u));
    if (t.checked) { if (!bats.some(b => plan.bats[b.id] === 'barrage')) bats.slice(0, Math.ceil(bats.length / 2)).forEach(b => { plan.bats[b.id] = 'barrage'; });
      plan.barrage = { cols: plan.mainCols.slice(), r0: Sc.bands.outpost[0], rate: 1, bats: bats.filter(b => plan.bats[b.id] === 'barrage').map(b => b.id) }; }
    else plan.barrage = null;
  } else if (t.matches('[data-rate]')) plan.barrage.rate = +t.value;
  else if (t.matches('[data-r0]')) plan.barrage.r0 = +t.value;
  else if (t.matches('[data-res]')) plan.reserves[t.dataset.res] = t.value === 'assembly' ? { mode: 'assembly' } : { mode: 'follow', hour: +t.value };
  else if (t.matches('[data-obj]')) plan.objective = t.value === 'bite' ? { type: 'bite', row: Sc.bands.battle[0] + 2 } : { type: 'breakthrough' };
  else if (t.matches('[data-objrow]')) plan.objective.row = +t.value;
  else return false;
  rebuildAtt(g, plan);
  return true;
}
