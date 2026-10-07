// The selection panel (SPEC §8.5) and the reports feed. Every percentage carries an "i" built from your own
// picture (js/tips-text.js). Buttons are at least 40 px; the panel offers only orders the selection can take.
import { ERAS } from '../../data/eras.js';
import { DETECT, BIDDLE, SUPP } from '../../data/params.js';
import { SCALES } from '../../data/scales.js';
import { expectedLoss, stallGauge } from '../engine.js';
import { gridFor } from '../grid.js';
import { alive, isBattery, isCompany } from '../forces.js';
import { tldr, visibleTo } from '../tldr.js';
import { moments } from '../story.js';
import { S, esc, pct, unitOf, hhmm } from './store.js';
import { pctTip, momentInfo } from './tips.js';
import { MISSION_WORD, missionsFor } from './actions.js';
import { STANDING } from '../ai/standing.js';
import { orderEffects, EFFECT } from './order-effects.js';

// A labelled row of choices (#7): each button carries its effect as a tooltip; a choice with no effect for this
// unit is greyed, tagged with why, and does nothing (#8; js/ui/order-effects.js).
const btn = (attr, v, t, pressed, fx, tip) => {
  const off = fx && !fx.active;
  return `<button type="button" class="btn${off ? ' dd-off' : ''}" data-${attr}="${v}" aria-pressed="${pressed}"${off ? ' aria-disabled="true"' : ''} title="${esc(off ? fx.reason : tip || '')}">${t}${off ? `<span class="dd-sr">: ${esc(fx.reason)}</span>` : ''}</button>`;
};
const row = (label, group, list, cur, fxs = {}, tips = {}, cls = '') => `<div class="dd-orow${cls ? ' ' + cls : ''}"><span class="dd-olab">${label}</span><div class="dd-seg" role="group" aria-label="${label}">${list.map(([v, t]) => btn(group, v, t, cur === v, fxs[v], tips[v])).join('')}</div></div>`;
const toolBtn = (k, t, fx = null, tip = '') => {
  const off = fx && !fx.active;
  return `<button type="button" class="btn${S.tool && S.tool.kind === k ? ' armed' : ''}${off ? ' dd-off' : ''}" data-tool="${k}"${off ? ' aria-disabled="true"' : ''} title="${esc(off ? fx.reason : tip || EFFECT.tool[k] || '')}">${t}${off ? `<span class="dd-sr">: ${esc(fx.reason)}</span>` : ''}</button>`;
};
const toolRow = (tools, label = 'Action') => `<div class="dd-orow"><span class="dd-olab">${label}</span><div class="dd-tools">${tools.join('')}</div></div>`;
const ATT_POSTURES = [['rush', 'Rush'], ['infil', 'Infiltrate'], ['hold', 'Hold'], ['consolidate', 'Consolidate'], ['withdraw', 'Withdraw']];
const DEF_STANCES = [['hold', 'Hold'], ['elastic', 'Give ground'], ['delay', 'Delay'], ['riposte', 'Local counterattack'], ['reserve', 'Reserve']];
const FORMS = [['waves', 'Waves'], ['groups', 'Small groups']];
const MODES = [['normal', 'Normal'], ['covered', 'Covered'], ['road', 'Road']];
const lodgNext = (g, u) => u.sec >= 0 && gridFor(g.scale).nbrs[u.sec].some(s => g.lodg[s]);

function believedWatchers(g, u) {
  const G = gridFor(g.scale), bel = g.beliefSec[u.side], out = [];
  if (bel[u.sec] > 0) out.push({ label: 'Enemy seen in its sector', d: DETECT.same });
  for (const c of G.nbrs[u.sec]) if (bel[c] > 0) out.push({ label: 'Enemy post seen next to it', d: DETECT.adjacent });
  return out;
}

function unitFacts(g, u) {
  const out = [], det = '<li class="dd-det">';
  out.push(`<li>Strength ${pctTip(pct(u.str / u.str0), 'strength', { str: u.str, str0: u.str0 })}</li>`);
  if (u.side === 'att') {
    const G = gridFor(g.scale);
    out.push(`${det}Cohesion ${pctTip(pct(u.coh ?? 1), 'cohesion', { coh: u.coh ?? 1, rows: Math.max(0, G.row[u.sec] - G.S.bands.nml[1]) })}</li>`);
  }
  out.push(`${det}Suppression on it ${pctTip(pct(u.supp || 0), 'suppression', { sources: u.supp ? [{ label: 'Fire on it last hour', s: u.supp }] : [] })}</li>`);
  const to = u.path.length ? u.path[0] : u.sec;
  const el = expectedLoss(g, u.id, { to });
  out.push(`${det}Expected loss this hour ${pctTip(pct(el.frac), 'expectedLoss', { loss: el.frac, exposure: el.terms.X, deadGround: el.terms.D, era: g.era })}</li>`);
  const tgt = u.path.length ? u.path[0] : null;
  if (tgt != null && g.beliefSec[u.side][tgt] > 0) {
    const sg = stallGauge(g, tgt, u.side, true, [u.id]);
    out.push(`${det}Assault on the next sector ${pctTip(`${sg.pct}%`, 'stall', { ratio: sg.ratio, k1: sg.k1, fe: sg.fe, supp: sg.supp, coh: sg.coh, od: g.od, ca: sg.ca, believed: true })} of the strength needed</li>`);
  }
  if (u.posture === 'infil' && u.stealth) {
    const w = believedWatchers(g, u), p = 1 - w.reduce((a, x) => a * (1 - x.d), 1) * 1, dark = !!(g.dark && g.dark[g.t]);
    out.push(`${det}Chance of being spotted ${pctTip(pct(dark ? p * 0.5 : p), 'detection', { watchers: w, fogNight: dark })}</li>`);
  }
  if (u.mode === 'road' || u.mode === 'covered') {
    const v = u.mode === 'road' ? 3 : 1, T = ERAS[g.era].T, p = Math.pow(T, -BIDDLE.k2 * v);
    out.push(`${det}Survives each observed hour on the move ${pctTip(pct(p), 'survival', { p, T, v, k2: BIDDLE.k2, mode: u.mode })}</li>`);
  }
  if (u.type === 'tank' && u.side === 'att' && u.side === S.me) {   // 2026-10-07: tanks fight with infantry (DECISIONS "Q68 redesign")
    const e = u.escort != null ? g.units[g.ix[u.escort]] : null;
    out.push(e ? `<li>With ${esc(e.name)}: moves with it. A move order detaches it.</li>`
      : '<li class="dd-warnl">On its own: it cannot take, pin or hold ground, and anti-tank fire on it is tripled. Keep it with infantry.</li>');
  }
  if (u.type === 'tank' && ERAS[g.era].tankBreakdown) out.push(`${det}Breakdown ${pctTip('12% an hour', 'breakdown', { p: 0.12 })}</li>`);
  if (u.type === 'mg') {   // DECISIONS "MG lanes are lost on a move"
    if (u.laneWant != null) out.push('<li>Lane: laid when it stops moving.</li>');
    else if (u.lane == null && u.laneLost) out.push('<li class="dd-warnl">Lane lost when it moved — lay it again.</li>');
  }
  if (u.pair != null) { const p = unitOf(u.pair); out.push(`<li>Leapfrog partner: <b>${esc(p ? p.short : u.pair)}</b>; this hour it ${u.lfOw ? 'overwatches' : 'bounds'}.</li>`); }
  return `<ul class="dd-facts">${out.join('')}</ul>`;
}

/** Every order row for a unit of this kind, greyed where it has no effect (#8). */
function orderRows(g, u, fx) {
  const att = u.side === 'att', cur = k => k;
  const rows = [att ? row('Posture', 'posture', ATT_POSTURES, cur(u.posture === 'bound' ? null : u.posture), fx.posture, EFFECT.posture)
    : row('Stance', 'stance', DEF_STANCES, cur(u.stance), fx.stance, EFFECT.stance),
  row('Formation', 'form', FORMS, cur(u.formation), fx.form, EFFECT.form),
  row('Route', 'mode', MODES, cur(u.mode), fx.mode, EFFECT.mode)];
  return rows.join('');
}

function batteryPanel(g, u) {
  const t = S.tool && S.tool.kind === 'fire' ? S.tool.m : 'suppress';
  const total = ((g.ui && g.ui.ammo0) || g.ammo)[u.side];
  const bns = Object.values(g.fmns).filter(f => f.side === u.side && f.kind === 'bn');
  const fx = orderEffects(u.type, u.side, { era: g.era });
  const all = ['suppress', 'destroy', ...(g.era === 'w' ? ['gas'] : []), 'smoke', 'cb', 'precision'];
  const MTIP = { suppress: 'Keeps heads down while the shells fall', destroy: 'Kills dug-in men and cuts wire: costs far more shells', gas: 'Masks and slows everyone in the sector for 3 hours',
    smoke: 'Blocks sight and fire lanes for the hour', cb: 'Counter-battery: fire on located enemy batteries', precision: 'A rocket strike on one target' };
  const cost = m => (SUPP.costs[m] ? ` (${SUPP.costs[m]} ammo)` : '');
  const mbtn = m => { const x = fx.mission[m] || { active: true }; return `<span class="${m === 'cb' || m === 'gas' ? 'dd-det' : ''}">${btn('mission', m, `${MISSION_WORD[m]}${x.active && SUPP.costs[m] ? ` <small>${SUPP.costs[m]}</small>` : ''}`, t === m, x, `${MTIP[m]}${cost(m)}`)}</span>`; };
  return `<p class="dd-ph"><b>${esc(u.name)}</b> · ${esc(u.typeName || u.type)} · ${u.guns}/${u.guns0} guns${u.located ? ' · <span class="warn">located by the enemy</span>' : ''}</p>
    <p class="fine">Pick a mission, then tap the target sector. Ammunition left ${pctTip(`${g.ammo[u.side]}`, 'ammo', { left: g.ammo[u.side], total })}</p>
    <div class="dd-orow"><span class="dd-olab">Mission</span><div class="dd-seg" role="group" aria-label="Mission">${all.map(mbtn).join('')}</div></div>
    ${toolRow([toolBtn('displace', 'Displace', fx.tool.displace), toolBtn('move', 'Move', fx.tool.move), toolBtn('lane', 'Lane', fx.tool.lane), toolBtn('breach', 'Breach', fx.tool.breach)])}
    <div class="dd-offrows">${orderRows(g, u, fx)}</div>
    ${u.side === 'att' && g.era === 'w' ? `<label class="dd-lab dd-det">Direct support (calls answered at once) <select data-ds="${u.id}"><option value="">None</option>${bns.map(f => `<option value="${f.id}" ${u.ds === f.id ? 'selected' : ''}>${esc(f.name)} (${esc(g.fmns[f.parent]?.name || '')})</option>`).join('')}</select></label>` : ''}`;
}

function onePanel(g, u) {
  const path = u.fmn.map(f => g.fmns[f] && g.fmns[f].name).filter(Boolean).join(' › ');
  if (isBattery(u)) return batteryPanel(g, u);
  const head = `<p class="dd-ph"><b>${esc(u.name)}</b> · ${esc(u.typeName || u.type)}<br><small class="muted">${esc(path)}</small></p>`;
  const fx = orderEffects(u.type, u.side, { era: g.era, lodgNext: lodgNext(g, u) });
  const tools = [toolBtn('move', 'Move', fx.tool.move), toolBtn('lane', 'Lane', fx.tool.lane, 'MG companies lay enfilading fire lanes')];
  if (u.side === 'def') tools.push(toolBtn('riposte', 'Local counterattack', fx.tool.riposte));
  tools.push(toolBtn('breach', 'Breach', fx.tool.breach));
  if (u.type === 'drone') return `${head}<div class="dd-orow"><span class="dd-olab">Sortie</span>${seg2('dronem', [['recon', 'Recon', 'Recon: exact sightings over a 3 × 3 block'], ['strike', 'Strike', 'Strike: hits men caught moving in the open']], S.tool && S.tool.m)}</div>${toolRow(tools)}${row('Route', 'mode', MODES, u.mode, fx.mode, EFFECT.mode)}`;
  if (u.type === 'ew') return `${head}<p class="fine">Jam the 5 × 5 area around a sector: enemy drones abort, his orders and calls for fire run an hour late.</p>${toolRow([toolBtn('jam', 'Jam', null, 'Tap the centre of the area to jam'), ...tools])}${row('Route', 'mode', MODES, u.mode, fx.mode, EFFECT.mode)}`;
  return `${head}${unitFacts(g, u)}${orderRows(g, u, fx)}${toolRow(tools)}
    ${u.type === 'mg' ? '<p class="fine dd-det">MG companies are the enfilade weapon: lay the lane across the enemy’s line of advance, from a flank.</p>' : ''}`;
}
const seg2 = (group, list, cur) => `<div class="dd-seg" role="group">${list.map(([v, t, tip]) => btn(group, v, t, cur === v, null, tip)).join('')}</div>`;

function multiPanel(g, units) {
  const att = S.me === 'att';
  const lf = units.length === 2 && units.every(u => isCompany(u));
  return `<p class="dd-ph"><b>${units.length} units selected</b></p>
    ${att ? row('Posture', 'posture', ATT_POSTURES, null, {}, EFFECT.posture) : row('Stance', 'stance', DEF_STANCES, null, {}, EFFECT.stance)}
    ${row('Formation', 'form', FORMS, null, {}, EFFECT.form)}
    ${toolRow([toolBtn('move', 'Move'), lf ? toolBtn('leapfrog', 'Leapfrog (L)', null, 'The first bounds while the second overwatches, then they swap') : toolBtn('leapfrog', 'Leapfrog (L)', { active: false, reason: 'Select exactly two companies to pair them' })])}`;
}

function fmnPanel(g, id) {
  const F = g.fmns[id], us = F.units.map(unitOf).filter(u => u && alive(u)), att = S.me === 'att';
  const cs = !att && F.cs, picked = S.tool && S.tool.kind === 'cs-pick' ? S.tool.secs.length : 0;
  const hrs = SCALES[g.scale].csPlan;
  return `<p class="dd-ph"><b>${esc(F.name)}</b> · ${us.length} units<br><small class="muted">One order goes to every unit; the engine keeps their layout. Tap a company in the list to drill down.</small></p>
    ${toolRow([toolBtn('move', 'Move'), att ? toolBtn('attack', 'Attack on axis', null, 'Spread over the target column and its neighbours; companies paired to leapfrog') : '', toolBtn('hold', 'Hold zone', null, 'Spread evenly over a zone, three columns wide'),
      cs ? toolBtn('cs', `Deliberate counterattack <small>· ${hrs} h planning</small>`, null, 'Counterstroke: tap lodgments, then launch; it strikes after its planning time with its own supporting fire') : '', att ? toolBtn('row', 'Consolidate at row', null, 'Units dig in on reaching that row') : ''].filter(Boolean))}
    ${cs ? `<button type="button" class="btn solid" data-launch ${picked ? '' : 'disabled'}>Launch counterattack${picked ? ` (${picked})` : ''}</button>` : ''}
    ${att ? row('Posture', 'posture', ATT_POSTURES, null, {}, EFFECT.posture) : row('Stance', 'stance', DEF_STANCES, null, {}, EFFECT.stance)}
    ${row('Formation', 'form', FORMS, null, {}, EFFECT.form)}
    ${!att ? '<button type="button" class="btn" data-fplan="riposte" title="Riposte authority: its companies counterattack fresh lodgments next to them at once">Local counterattack authority on</button>' : ''}`;
}

/** Standing orders (W3): what your units do on their own until you order them; each can be switched off. */
function standingHTML(g) {
  const st = g.standing && g.standing[S.me];
  if (!st) return '';
  const rows = STANDING[S.me].map(o => `<li><button type="button" class="btn" data-standing="${o.key}" aria-pressed="${!!st[o.key]}" title="${esc(o.text)}">${esc(o.label.replace('Counterstroke', 'Deliberate counterattack'))}: ${st[o.key] ? 'on' : 'off'}</button></li>`);
  return `<div class="dd-standing"><h3>Standing orders</h3><p class="muted"><small>Your units follow these until you order them (then they are yours for 3 hours). Switch one off to do that job yourself.</small></p><ul>${rows.join('')}</ul></div>`;
}

/** The selection panel HTML for battle. */
export function selPanel() {
  const g = S.g;
  if (!g || g.over || g.phase !== 'battle') return '';
  if (S.selFmn) return fmnPanel(g, S.selFmn);
  const units = S.sel.map(unitOf).filter(u => u && alive(u));
  if (!units.length) return `<p class="muted dd-hint">Pick a unit or a formation (on the map, in the list, or with <kbd>]</kbd>): its orders open next to it. Then tap where it should go.</p>${standingHTML(g)}`;
  return units.length === 1 ? onePanel(g, units[0]) : multiPanel(g, units);
}

// ---- Reports feed: newest hour first, older hours folded; the TL;DR heads each hour ----

const EXTRA = {
  warning: (g, e) => (e.level === 'full' ? `Long bombardment on columns ${e.cols.map(c => c + 1).join(', ')}: the attack will come there.` : `Registration fire observed on columns ${e.cols.map(c => c + 1).join(', ')}.`),
  msgLost: () => 'A runner with your barrage change was lost.',
  arrive: (g, e) => `${esc(unitOf(e.unit)?.short || 'A unit')} arrived.`,
  improvise: (g, e) => `${esc(unitOf(e.unit)?.short || 'A unit')} improvised: ${e.what === 'groups' ? 'broke into small groups' : e.what === 'riposte' ? 'counterattacked without orders' : 'infiltrated around the obstacle'}.`,
  breakdown: (g, e) => `${esc(unitOf(e.unit)?.short || 'A tank')} broke down.`,
  yield: (g, e) => `${esc(unitOf(e.unit)?.short || 'A unit')} gave ground.`,
};

export function feedHTML() {
  const g = S.g, me = S.me;
  if (!g || g.phase !== 'battle') return '<li class="muted">Reports appear here once the battle starts.</li>';
  const vis = { ...g, events: g.events.filter(e => visibleTo(e, me) && e.kind !== 'infiltrate') };
  const ms = moments(vis, me, Infinity);   // QA fix: every hour's reports, not only the battle's top 18 moments
  const out = [];
  for (let t = g.t - 1; t >= 0; t--) {
    const head = tldr(g, me, t).text;
    const items = ms.filter(m => m.t === t).map(m => `<li class="${m.tone}">${esc(m.text)}${momentInfo(m)}</li>`);
    for (const e of g.events) if (e.t === t && EXTRA[e.kind] && visibleTo(e, me)) items.push(`<li class="muted">${EXTRA[e.kind](g, e)}</li>`);
    const body = `<p class="dd-ftl">${esc(head)}</p>${items.length ? `<ul>${items.join('')}</ul>` : ''}`;
    out.push(t >= g.t - 2 || S.openHours.has(t) ? `<li class="dd-fh"><span>${hhmm(t)}–${hhmm(t + 1)}</span>${body}</li>`
      : `<li class="dd-fh dd-old"><details data-h="${t}"><summary>${hhmm(t)}–${hhmm(t + 1)} <small>${esc(head)}</small></summary>${body}</details></li>`);
  }
  for (const e of g.events) if (e.t === 0 && e.kind === 'warning' && visibleTo(e, me) && g.t === 0) out.push(`<li class="dd-fh"><span>Before H-hour</span><ul><li class="warn">${EXTRA.warning(g, e)}</li></ul></li>`);
  return out.join('') || `<li class="muted">${me === 'def' ? 'The attack starts at 05:00. Your outposts will report what they see.' : 'H-hour is 05:00. Your barrage is on the outpost line.'}</li>`;
}

