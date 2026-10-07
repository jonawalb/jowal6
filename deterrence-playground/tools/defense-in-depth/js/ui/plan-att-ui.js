// The attacker's plan steps (SPEC §1.2, §8.3; UI streamline #3–#5): Frontage (main effort, pin = fixing, quiet
// columns), Battalions (one chip per battalion opening a small chooser, plus Apply to all), Infiltration routes,
// Fire plan (preparation with its ammunition cost, the creeping barrage; the timetable strip and battery roles
// in Detailed view) and Reserves (follow success at H+n, engineers, the objective type).
// The H-hour orders follow from these choices (rebuildAtt), the same layout the default plan uses.
import { SCALES } from '../../data/scales.js';
import { STACK, PREP } from '../../data/params.js';
import { gridFor } from '../grid.js';
import { isBattery, isCompany, knows } from '../forces.js';
import { prepCost, attachTanks } from '../plan-att.js';
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
  attachTanks(g, plan, load);   // 2026-10-07: tanks start with, and move with, first-wave rifle companies
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
const FORM = { groups: 'Small groups', waves: 'Waves' }, FORM_S = { groups: 'Groups', waves: 'Waves' };
const POST = { leapfrog: 'Leapfrog', rush: 'Rush', infil: 'Infiltrate', '': 'Second wave' };
const FORM_TIP = { groups: 'Small groups: harder to spot and to enfilade', waves: 'Waves: easier to control, but flanking fire hits three times as many' };
const POST_TIP = { leapfrog: 'Leapfrog: companies paired, one fires while the other bounds', rush: 'Rush: fastest and most exposed', infil: 'Infiltrate: storm and rifle companies slip past posts on covered routes', '': 'Second wave: waits in assembly as your reserve' };
const tbtn = (k, t, tip = '') => `<button type="button" class="btn${(S.tool || {}).kind === k ? ' armed' : ''}" data-ptool="${k}"${tip ? ` title="${esc(tip)}"` : ''}>${t}</button>`;

/** The numbers behind the step chips. */
export function attSummary(g, plan) {
  const G = gridFor(g.scale), bns = assaultBns(g), Sc = SCALES[g.scale];
  const storm = g.units.filter(u => u.side === 'att' && u.type === 'storm');
  const tt = plan.barrage ? timetable(plan.barrage, [Sc.bands.outpost[0], Sc.obj.row], g.turns, bnRows(g, plan)) : null;
  return { main: plan.mainCols.length, pin: Array.from({ length: G.cols }, (_, c) => c).filter(c => !plan.mainCols.includes(c) && (plan.fix[c] || 'fix') === 'fix').length,
    bns: bns.length, leapfrog: bns.filter(f => (plan.bn[f.id] || {}).posture === 'leapfrog').length, routes: storm.filter(u => (plan.routes[u.id] || []).length).length, storm: storm.length,
    prep: plan.prep, barrage: plan.barrage ? plan.barrage.rate : null, gaps: tt ? tt.warn.early + tt.warn.late : 0,
    follow: Object.values(plan.reserves || {}).filter(r => r && r.mode === 'follow').length };
}
const bnRows = (g, plan) => assaultBns(g).filter(f => plan.bn[f.id] && plan.bn[f.id].posture).map(f => ({ name: `${g.fmns[f.parent]?.name || ''} ${f.name}`.trim(), posture: plan.bn[f.id].posture, start: f.role === 'wave2' ? 0 : 1 }));

/** The chooser under a battalion row (or the Apply-to-all row). */
function chooser(key, st, wave2) {
  const seg = (k, list, cur, tips) => `<div class="dd-orow"><span class="dd-olab">${k === 'form' ? 'Formation' : 'Movement'}</span><div class="dd-seg" role="group" aria-label="${k === 'form' ? 'Formation' : 'Movement'}">${list.map(v => `<button type="button" class="btn" data-bnset="${key}" data-k="${k}" data-v="${v}" aria-pressed="${cur === v}" title="${esc(tips[v])}">${k === 'form' ? FORM[v] : POST[v]}</button>`).join('')}</div></div>`;
  return `<div class="dd-bnpick">${seg('form', ['groups', 'waves'], st.form, FORM_TIP)}${seg('posture', [...(wave2 ? [''] : []), 'leapfrog', 'rush', 'infil'], st.posture, POST_TIP)}</div>`;
}

/** One step of the attacker's plan: 'front' | 'bns' | 'infil' | 'fire' | 'res'. */
export function attStep(g, plan, id) {
  const G = gridFor(g.scale), Sc = SCALES[g.scale];
  if (id === 'front') {
    const colBtn = c => { const m = plan.mainCols.includes(c), f = !m && (plan.fix[c] || 'fix') === 'fix'; return `<button type="button" class="dd-colb ${m ? 'main' : f ? 'fix' : 'quiet'}" data-col="${c}" aria-label="Column ${c + 1}: ${m ? 'main effort' : f ? 'pin' : 'quiet'}" title="${m ? 'Main effort: your assault battalions' : f ? 'Pin (a fixing attack): one company holds the outposts in place' : 'Quiet: nothing attacks here'}">${c + 1}<small>${m ? 'Main' : f ? 'Pin' : '—'}</small></button>`; };
    return `<p class="fine">Tap a column: Main effort → Pin → Quiet. Too narrow and his MGs sweep you from both shoulders (Biddle pp. 43–44).</p>
    <div class="dd-cols">${Array.from({ length: G.cols }, (_, c) => colBtn(c)).join('')}</div>
    ${plan.mainCols.length === 1 ? '<p class="dd-warnl">A one-column main effort is swept from both shoulders.</p>' : ''}`;
  }
  if (id === 'bns') {
    const bns = assaultBns(g), open = S.bnOpen;
    const all = bns.reduce((a, f) => { const st = plan.bn[f.id] || {}; a.form = a.form === undefined || a.form === st.form ? st.form : null; return a; }, {});
    return `<div class="dd-bnrow dd-bnall"><b>All battalions</b><button type="button" class="dd-chip" data-bnopen="all" aria-expanded="${open === 'all'}">Apply to all <span aria-hidden="true">▾</span></button></div>
    ${open === 'all' ? chooser('all', { form: all.form, posture: null }, true) : ''}
    ${bns.map(f => { const st = plan.bn[f.id] || {}; return `<div class="dd-bnrow"><span class="dd-bnn"><b>${esc(f.name)}</b><small>${esc(g.fmns[f.parent]?.name || '')}</small></span><button type="button" class="dd-chip" data-bnopen="${f.id}" aria-expanded="${open === f.id}" aria-label="${esc(f.name)}, ${esc(g.fmns[f.parent]?.name || '')}: ${FORM[st.form] || 'Small groups'}, ${POST[st.posture || '']}. Change">${FORM_S[st.form] || 'Groups'} · ${POST[st.posture || '']} <span aria-hidden="true">▾</span></button></div>
      ${open === f.id ? chooser(f.id, st, f.role === 'wave2') : ''}`; }).join('')}`;
  }
  if (id === 'infil') {
    const storm = g.units.filter(u => u.side === 'att' && u.type === 'storm');
    return `<div class="dd-tools dd-mglist">${storm.map(u => `<button type="button" class="btn" data-pselu="${u.id}" aria-pressed="${S.sel.length === 1 && S.sel[0] === u.id}">${esc(u.short)} <small>${(plan.routes[u.id] || []).length ? `${plan.routes[u.id].length} sectors` : 'no route'}</small></button>`).join('')}</div>
    <div class="dd-tools">${tbtn('route', 'Draw route', 'Then tap sectors in order from its start')}<button type="button" class="btn" data-clearroute>Clear route</button></div>
    <p class="fine">Pick a storm company, press Draw route, tap sectors in order. Green sectors are away from the trenches and strongpoints on your air photographs; amber ones are next to them.</p>`;
  }
  if (id === 'res') {
    const echelon = Object.values(g.fmns).filter(f => f.side === 'att' && f.role === 'echelon2');
    const hh = h => `H+${h} (${String(5 + h).padStart(2, '0')}:00)`;
    return `${echelon.map(f => { const r = plan.reserves[f.id] || { mode: 'assembly' }; return `<label class="dd-lab" title="H-hour (H+0) is 05:00, when the attack starts; H+4 is four hours later">${esc(f.name)} <select data-res="${f.id}">${opt('assembly', r.mode === 'assembly' ? 'assembly' : '', 'Wait in assembly')}${[2, 3, 4, 5, 6, 8].map(h => opt(h, r.mode === 'follow' ? r.hour : '', `Follow success at ${hh(h)}`)).join('')}</select></label>`; }).join('') || '<p class="fine">Second-wave battalions left in assembly are your reserve: send them in during the battle.</p>'}
    <p class="fine">Engineers clear wire or mines in 2 hours: pick a pioneer company, press Breach target, tap the obstacle. ${g.era === 'w' ? 'Each tank section starts with a first-wave rifle company and moves with it; it crushes wire but breaks down often.' : 'Each tank company starts with a first-wave rifle company and moves with it.'} A move order to a tank detaches it; alone, a tank cannot take ground and anti-tank fire on it triples.</p>
    <div class="dd-tools">${tbtn('breach', 'Breach target')}${g.era === 'm' ? tbtn('ew', 'EW position') : ''}</div>
    <label class="dd-lab">Objective <select data-obj>${opt('breakthrough', plan.objective.type, 'Breakthrough (keep going)')}${opt('bite', plan.objective.type, 'Bite and hold (dig in on a row)')}</select></label>
    ${plan.objective.type === 'bite' ? `<label class="dd-lab">Limit row <select data-objrow>${Array.from({ length: Sc.obj.row - Sc.bands.outpost[0] + 1 }, (_, i) => Sc.bands.outpost[0] + i).map(r => opt(r, plan.objective.row, `row ${r + 1}${r === Sc.obj.row ? ' (the objective line)' : ''}`)).join('')}</select></label>` : ''}`;
  }
  // fire plan
  const bats = g.units.filter(u => u.side === 'att' && isBattery(u));
  const nb = bats.filter(b => plan.bats[b.id] === 'barrage').length, ncb = bats.filter(b => plan.bats[b.id] === 'cb').length;
  const b = plan.barrage, tt = b ? timetable(b, [Sc.bands.outpost[0], Sc.obj.row], g.turns, bnRows(g, plan)) : null;
  const predicted = bats.every(u => knows(u, 'CA1'));
  const maxT = PREP.sectorsPerGroup * Math.ceil(bats.length / PREP.groupSize);
  const PTIP = { none: 'No preparation: full surprise, nothing cut', hurricane: `Hurricane: one hour of fire on the front. ${predicted ? 'Predicted fire: no registration, no warning.' : 'Without predicted fire, registration warns him.'}`,
    methodical: 'Methodical: six hours of Destroy fire. Cuts wire and kills exposed men, but churns the ground and shows him where you will attack.' };
  const pcost = { none: 'free', hurricane: `${prepCost(g, { ...plan, prep: 'hurricane' })} ammo`, methodical: `${PREP.methodicalCost} ammo a target` };
  return `<p class="dd-plabel">Ammunition <b class="num">${g.ammo.att}</b></p>
    <div class="dd-orow dd-stack"><span class="dd-olab">Preparation</span><div class="dd-seg" role="group" aria-label="Preparation">${['none', 'hurricane', 'methodical'].map(k => `<button type="button" class="btn" data-prepset="${k}" aria-pressed="${plan.prep === k}" title="${esc(PTIP[k])}">${{ none: 'None', hurricane: 'Hurricane (1 h)', methodical: 'Methodical (6 h)' }[k]} <small>${pcost[k]}</small></button>`).join('')}</div></div>
    ${plan.prep === 'methodical' ? `<div class="dd-tools">${tbtn('prep', `Preparation targets (${plan.prepTargets.length} of ${maxT}) <small>${PREP.methodicalCost * plan.prepTargets.length} ammo</small>`)}</div>` : ''}
    <label class="dd-lab"><input type="checkbox" data-barr ${b ? 'checked' : ''}> Creeping barrage on the main effort <small class="muted">${nb || Math.ceil(bats.length / 2)} ammo an hour</small></label>
    ${b ? `<label class="dd-lab">Lift rate <select data-rate>${LIFTS.map(r => opt(r, b.rate, `${r} row${r === 1 ? '' : 's'} an hour`)).join('')}</select></label>
      <label class="dd-lab" title="H-hour (H+0) is 05:00: the barrage starts on this row">Starts on <select data-r0>${Array.from({ length: Sc.bands.battle[0] - Sc.bands.nml[0] + 1 }, (_, i) => Sc.bands.nml[0] + i).map(r => opt(r, b.r0, `row ${r + 1}`)).join('')}</select></label>
      <p class="fine${tt.warn.late || tt.warn.early ? ' dd-warnl' : ''}">Predicted: ${tt.warn.early} arrival${tt.warn.early === 1 ? '' : 's'} after the barrage has lifted (gap), ${tt.warn.late} into its own barrage.</p>
      <div class="dd-det"><div class="dd-ttbox">${tt.svg}</div><p class="fine">Dots are battalions at their default pace (NOTIONAL: Rush 1 row/h, Leapfrog 0.75).</p></div>` : ''}
    <p class="dd-det">Batteries: <b>${nb}</b> barrage · <b>${ncb}</b> counter-battery · <b>${bats.length - nb - ncb}</b> on call
      <span class="dd-seg" role="group" aria-label="Batteries on the barrage"><button type="button" class="btn" data-bat="-1" aria-label="One fewer on the barrage">−</button><button type="button" class="btn" data-bat="1" aria-label="One more on the barrage">+</button></span>
      <span class="dd-seg" role="group" aria-label="Batteries on counter-battery"><button type="button" class="btn" data-cb="-1" aria-label="One fewer on counter-battery" title="Counter-battery (CB)">CB −</button><button type="button" class="btn" data-cb="1" aria-label="One more on counter-battery" title="Counter-battery (CB)">CB +</button></span></p>`;
}

/** Planning tools for one unit (the map popover). */
export function attUnitTools(g, plan, u) {
  if (u.type === 'storm') return `<div class="dd-orow"><span class="dd-olab">Route</span><div class="dd-tools">${tbtn('route', 'Draw route', 'Tap sectors in order')}<button type="button" class="btn" data-clearroute>Clear route</button></div></div>`;
  if (u.type === 'pioneer') return `<div class="dd-tools">${tbtn('breach', 'Breach target')}</div>`;
  if (u.type === 'ew') return `<div class="dd-tools">${tbtn('ew', 'EW position')}</div>`;
  return '<p class="fine">Its start and its H-hour orders follow your frontage and battalion choices.</p>';
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
  const bo = e.target.closest('[data-bnopen]');
  if (bo) { S.bnOpen = S.bnOpen === bo.dataset.bnopen ? null : bo.dataset.bnopen; return ' '; }
  const bs = e.target.closest('[data-bnset]');
  if (bs) {
    const key = bs.dataset.bnset, k = bs.dataset.k, v = bs.dataset.v;
    const list = key === 'all' ? assaultBns(g).filter(f => k !== 'posture' || v !== '' || f.role === 'wave2') : [g.fmns[key]];
    for (const f of list) (plan.bn[f.id] ||= {})[k] = v;
    rebuildAtt(g, plan);
    return key === 'all' ? `All battalions: ${k === 'form' ? FORM[v] : POST[v]}.` : `${esc(g.fmns[key].name)}: ${k === 'form' ? FORM[v] : POST[v]}.`;
  }
  const ps = e.target.closest('[data-prepset]');
  if (ps) { plan.prep = ps.dataset.prepset; rebuildAtt(g, plan); return `Preparation: ${ps.textContent.trim()}.`; }
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
  if (t.matches('[data-barr]')) {
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
