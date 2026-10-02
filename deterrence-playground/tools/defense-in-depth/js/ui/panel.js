// The selection panel (SPEC §8.5) and the reports feed. Every percentage carries an "i" built from your own
// picture (js/tips-text.js). Buttons are at least 40 px; the panel offers only orders the selection can take.
import { TYPES } from '../../data/units.js';
import { ERAS } from '../../data/eras.js';
import { DETECT, BIDDLE } from '../../data/params.js';
import { expectedLoss, stallGauge } from '../engine.js';
import { gridFor } from '../grid.js';
import { alive, isBattery, isCompany } from '../forces.js';
import { inContact } from '../move.js';
import { tldr, visibleTo } from '../tldr.js';
import { moments } from '../story.js';
import { S, esc, pct, unitOf, hhmm } from './store.js';
import { pctTip, momentInfo } from './tips.js';
import { MISSION_WORD, missionsFor } from './actions.js';
import { STANDING } from '../ai/standing.js';

const seg = (group, list, cur, label) => `<div class="dd-seg" role="group" aria-label="${label}">${list.map(([v, t]) => `<button type="button" class="btn" data-${group}="${v}" aria-pressed="${cur === v}">${t}</button>`).join('')}</div>`;
const toolBtn = (k, t, extra = '') => `<button type="button" class="btn${S.tool && S.tool.kind === k ? ' armed' : ''}" data-tool="${k}" ${extra}>${t}</button>`;
const ATT_POSTURES = [['rush', 'Rush'], ['infil', 'Infiltrate'], ['hold', 'Hold'], ['consolidate', 'Consolidate'], ['withdraw', 'Withdraw']];
const DEF_STANCES = [['hold', 'Hold'], ['elastic', 'Elastic'], ['delay', 'Delay'], ['riposte', 'Riposte'], ['reserve', 'Reserve']];

function believedWatchers(g, u) {
  const G = gridFor(g.scale), bel = g.beliefSec[u.side], out = [];
  if (bel[u.sec] > 0) out.push({ label: 'Enemy seen in its sector', d: DETECT.same });
  for (const c of G.nbrs[u.sec]) if (bel[c] > 0) out.push({ label: 'Enemy post seen next to it', d: DETECT.adjacent });
  return out;
}

function unitFacts(g, u) {
  const out = [];
  out.push(`<li>Strength ${pctTip(pct(u.str / u.str0), 'strength', { str: u.str, str0: u.str0 })}</li>`);
  if (u.side === 'att') {
    const G = gridFor(g.scale);
    out.push(`<li>Cohesion ${pctTip(pct(u.coh ?? 1), 'cohesion', { coh: u.coh ?? 1, rows: Math.max(0, G.row[u.sec] - G.S.bands.nml[1]) })}</li>`);
  }
  out.push(`<li>Suppression on it ${pctTip(pct(u.supp || 0), 'suppression', { sources: u.supp ? [{ label: 'Fire on it last hour', s: u.supp }] : [] })}</li>`);
  const to = u.path.length ? u.path[0] : u.sec;
  const el = expectedLoss(g, u.id, { to });
  out.push(`<li>Expected loss this hour ${pctTip(pct(el.frac), 'expectedLoss', { loss: el.frac, exposure: el.terms.X, deadGround: el.terms.D, era: g.era })}</li>`);
  const tgt = u.path.length ? u.path[0] : null;
  if (tgt != null && g.beliefSec[u.side][tgt] > 0) {
    const sg = stallGauge(g, tgt, u.side, true, [u.id]);
    out.push(`<li>Assault on the next sector ${pctTip(`${sg.pct}%`, 'stall', { ratio: sg.ratio, k1: sg.k1, fe: sg.fe, supp: sg.supp, coh: sg.coh, od: g.od, ca: sg.ca, believed: true })} of the strength needed</li>`);
  }
  if (u.posture === 'infil' && u.stealth) {
    const w = believedWatchers(g, u), p = 1 - w.reduce((a, x) => a * (1 - x.d), 1) * 1, dark = !!(g.dark && g.dark[g.t]);
    out.push(`<li>Chance of being spotted ${pctTip(pct(dark ? p * 0.5 : p), 'detection', { watchers: w, fogNight: dark })}</li>`);
  }
  if (u.mode === 'road' || u.mode === 'covered') {
    const v = u.mode === 'road' ? 3 : 1, T = ERAS[g.era].T, p = Math.pow(T, -BIDDLE.k2 * v);
    out.push(`<li>Survives each observed hour on the move ${pctTip(pct(p), 'survival', { p, T, v, k2: BIDDLE.k2, mode: u.mode })}</li>`);
  }
  if (u.type === 'tank' && ERAS[g.era].tankBreakdown) out.push(`<li>Breakdown ${pctTip('12% an hour', 'breakdown', { p: 0.12 })}</li>`);
  if (u.pair != null) { const p = unitOf(u.pair); out.push(`<li>Leapfrog partner: <b>${esc(p ? p.short : u.pair)}</b>; this hour it ${u.lfOw ? 'overwatches' : 'bounds'}.</li>`); }
  return `<ul class="dd-facts">${out.join('')}</ul>`;
}

function batteryPanel(g, u) {
  const t = S.tool && S.tool.kind === 'fire' ? S.tool.m : 'suppress';
  const total = ((g.ui && g.ui.ammo0) || g.ammo)[u.side];
  const bns = Object.values(g.fmns).filter(f => f.side === u.side && f.kind === 'bn');
  return `<p class="dd-ph"><b>${esc(u.name)}</b> · ${esc(u.typeName || u.type)} · ${u.guns}/${u.guns0} guns${u.located ? ' · <span class="warn">located by the enemy</span>' : ''}</p>
    <p class="fine">Pick a mission, then tap the target sector. Ammunition left ${pctTip(`${g.ammo[u.side]}`, 'ammo', { left: g.ammo[u.side], total })}</p>
    ${seg('mission', missionsFor(g, u).map(m => [m, MISSION_WORD[m]]), t, 'Mission')}
    <div class="dd-tools">${toolBtn('displace', 'Displace')}</div>
    ${u.side === 'att' && g.era === 'w' ? `<label class="dd-lab">Direct support (calls answered at once) <select data-ds="${u.id}"><option value="">None</option>${bns.map(f => `<option value="${f.id}" ${u.ds === f.id ? 'selected' : ''}>${esc(f.name)} (${esc(g.fmns[f.parent]?.name || '')})</option>`).join('')}</select></label>` : ''}`;
}

function onePanel(g, u) {
  const path = u.fmn.map(f => g.fmns[f] && g.fmns[f].name).filter(Boolean).join(' › ');
  if (isBattery(u)) return batteryPanel(g, u);
  const head = `<p class="dd-ph"><b>${esc(u.name)}</b> · ${esc(u.typeName || u.type)}<br><small class="muted">${esc(path)}</small></p>`;
  if (u.type === 'drone') return `${head}<p class="fine">Two recon and two strike sorties an hour. Pick one, then tap a sector.</p>${seg('dronem', [['recon', 'Recon'], ['strike', 'Strike']], S.tool && S.tool.m, 'Sortie')}<div class="dd-tools">${toolBtn('move', 'Move')}</div>`;
  if (u.type === 'ew') return `${head}<p class="fine">Tap a sector to jam the 5 × 5 area around it: enemy drones abort, his orders and calls for fire run an hour late.</p><div class="dd-tools">${toolBtn('jam', 'Jam')}${toolBtn('move', 'Move')}</div>`;
  const att = u.side === 'att';
  const tools = [toolBtn('move', 'Move')];
  if (u.type === 'mg') tools.push(toolBtn('lane', 'Lane', 'title="MG companies lay enfilading fire lanes"'));
  if (!att) tools.push(toolBtn('riposte', 'Riposte'));
  if (TYPES[u.type].engineer) tools.push(toolBtn('breach', 'Breach'));
  return `${head}${unitFacts(g, u)}
    ${att ? seg('posture', ATT_POSTURES, u.posture === 'bound' ? null : u.posture, 'Posture (P)') : seg('stance', DEF_STANCES, u.stance, 'Stance (G)')}
    ${seg('form', [['waves', 'Waves'], ['groups', 'Small groups']], u.formation, 'Formation (W)')}
    ${!att || !inContact(g, u) ? seg('mode', [['normal', 'Normal'], ['covered', 'Covered'], ['road', 'Road']], u.mode, 'Movement') : ''}
    <div class="dd-tools">${tools.join('')}</div>
    ${u.type === 'mg' ? '<p class="fine">MG companies are the enfilade weapon: lay the lane across the enemy’s line of advance, from a flank.</p>' : ''}`;
}

function multiPanel(g, units) {
  const att = S.me === 'att';
  const lf = units.length === 2 && units.every(u => isCompany(u));
  return `<p class="dd-ph"><b>${units.length} units selected</b></p>
    ${att ? seg('posture', ATT_POSTURES, null, 'Posture for all') : seg('stance', DEF_STANCES, null, 'Stance for all')}
    ${seg('form', [['waves', 'Waves'], ['groups', 'Small groups']], null, 'Formation for all')}
    <div class="dd-tools">${toolBtn('move', 'Move')}${lf ? toolBtn('leapfrog', 'Leapfrog (L)') : ''}</div>
    ${lf ? '<p class="fine">Leapfrog: the first bounds while the second overwatches, then they swap. Tap the target sector.</p>' : ''}`;
}

function fmnPanel(g, id) {
  const F = g.fmns[id], us = F.units.map(unitOf).filter(u => u && alive(u)), att = S.me === 'att';
  const cs = !att && F.cs, picked = S.tool && S.tool.kind === 'cs-pick' ? S.tool.secs.length : 0;
  return `<p class="dd-ph"><b>${esc(F.name)}</b> · ${us.length} units<br><small class="muted">One order goes to every unit; the engine keeps their layout. Tap a company in the list to drill down.</small></p>
    <div class="dd-tools">${toolBtn('move', 'Move')}${att ? toolBtn('attack', 'Attack on axis') : ''}${toolBtn('hold', 'Hold zone')}${cs ? toolBtn('cs', 'Counterstroke') : ''}${att ? toolBtn('row', 'Consolidate at row') : ''}</div>
    ${cs ? `<p class="fine">Counterstroke: tap lodgments, then launch. It strikes after ${g.ctx && g.ctx.csPlan ? g.ctx.csPlan : 'its'} planning time.</p><button type="button" class="btn solid" data-launch ${picked ? '' : 'disabled'}>Launch counterstroke${picked ? ` (${picked})` : ''}</button>` : ''}
    ${att ? seg('posture', ATT_POSTURES, null, 'Posture for all') : seg('stance', DEF_STANCES, null, 'Stance for all')}
    ${seg('form', [['waves', 'Waves'], ['groups', 'Small groups']], null, 'Formation for all')}
    ${!att ? '<button type="button" class="btn" data-fplan="riposte">Riposte authority on</button>' : ''}`;
}

/** Standing orders (W3): what your units do on their own until you order them; each can be switched off. */
function standingHTML(g) {
  const st = g.standing && g.standing[S.me];
  if (!st) return '';
  const rows = STANDING[S.me].map(o => `<li><button type="button" class="btn" data-standing="${o.key}" aria-pressed="${!!st[o.key]}">${esc(o.label)}: ${st[o.key] ? 'on' : 'off'}</button> <small class="muted">${esc(o.text)}</small></li>`);
  return `<div class="dd-standing"><h3>Standing orders</h3><p class="muted"><small>Your units follow these until you give them an order (then they are yours for 3 hours). Switch one off to take that job over yourself.</small></p><ul>${rows.join('')}</ul></div>`;
}

/** The selection panel HTML for battle. */
export function selPanel() {
  const g = S.g;
  if (!g || g.over || g.phase !== 'battle') return '';
  if (S.selFmn) return fmnPanel(g, S.selFmn);
  const units = S.sel.map(unitOf).filter(u => u && alive(u));
  if (!units.length) return `<p class="muted dd-hint">Pick a unit or a formation (in the list, on the map, or with <kbd>]</kbd>), then tap where it should go. Batteries: pick, choose a mission, tap the target.</p>${standingHTML(g)}`;
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

