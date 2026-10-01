// Text for the play screen and the page: clock, status, the hour-by-hour report feed, the parameter
// table, balance tables, quotes and sources.
import { NODES } from '../data/map.js';
import { GAME, TYPES, COMBAT, ORDER_DELAY, ORDER_DELAY_MAXRUN, ARTILLERY, VISION, FORCES, DISENGAGE, AI, OFFDEF } from '../data/params.js';
import { OFFDEF_TABLE } from '../data/offdef.js';
import { tilt } from './combat.js';
import { SOURCES } from '../data/sources.js';
import { BALANCE } from '../data/balance.js';
import { beliefAt } from './vision.js';

export const NAME = Object.fromEntries(NODES.map(n => [n.id, n.name]));
export const SIDE = { blue: 'Blue', red: 'Red' };
export const foeOf = s => (s === 'blue' ? 'red' : 'blue');
export const DEF = Object.fromEntries([...FORCES.blue, ...FORCES.red].map(d => [d.id, d]));
export const hhmm = x => { const m = Math.round((GAME.startClock + x) * 60); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n1 = x => (Math.round(x * 10) / 10).toFixed(1);
const list = a => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const word = t => TYPES[t]?.word || 'unit';

/** When Red's units arrive, as a phrase: "Recon A at 06:00, the first echelon at 07:00 and the second echelon at 09:00". */
export function waveText() {
  const by = {};
  for (const d of FORCES.red) if (d.type !== 'arty') (by[d.arrive] ||= []).push(d);
  const ts = Object.keys(by).map(Number).sort((a, b) => a - b);
  const names = ['the first echelon', 'the second echelon', 'the third echelon'];
  let k = 0;
  return list(ts.map(t => {
    const only = by[t].every(d => d.type === 'recon');
    const what = only ? (by[t].length === 1 ? 'a recon troop' : 'recon') : names[k++];
    return `${what} at ${hhmm(t)}`;
  }));
}
export const endTime = () => hhmm(GAME.hours);

/**
 * The offense-defense slider in words. v: 0-10 (OFFDEF). label: "standard", "defense favored", "offense strongly
 * favored" ...; what: what it does in combat; ratio: the attack-to-defense ratio at which a prepared defense breaks even.
 */
export function odWords(v) {
  const d = v - OFFDEF.standard, a = Math.abs(d), side = d < 0 ? 'defense' : 'offense';
  const how = a === 1 ? 'slightly ' : a >= 5 ? 'strongly ' : '';
  const more = a === 1 ? 'a little ' : a >= 5 ? 'much ' : '';
  const ratio = Math.sqrt(COMBAT.k.prepared * tilt(v)).toFixed(1);
  if (!d) return { label: 'standard', what: 'the calibrated game, in which a prepared defense breaks even against 3:1', ratio };
  return {
    label: `${side} ${how}favored`, ratio,
    what: `${d < 0 ? `dug-in units hold ${more}better` : `attacks hit ${more}harder`} (a prepared defense breaks even against ${ratio}:1 instead of 3:1)`,
  };
}
/** How the slider setting changes the game for the side you play: 'easier', 'harder' or null (standard). */
export const odFor = (v, side) => (v === OFFDEF.standard ? null : (v < OFFDEF.standard) === (side === 'blue') ? 'easier' : 'harder');
export const secondPick = () => AI.red.secondDecide;

/** Had side `me` already exposed the decoy before this fire mission? */
function decoyKnown(g, me, f) {
  return g.seen[me].some(s => s.type === 'decoy' && (s.obsT < f.t || (s.obsT === f.t && !s.byFire)))
    || g.fires.some(x => x.side === me && x.t < f.t && x.reveal.some(r => r.type === 'decoy'));
}

/** What a spotter saw under a fire mission: listed when short, summarised when not. */
function sawText(g, me, f) {
  const real = f.reveal.filter(r => r.type !== 'decoy'), dec = f.reveal.some(r => r.type === 'decoy');
  const parts = [];
  if (real.length > 2) parts.push(`${real.length} units hit, average ${Math.round(100 * real.reduce((s, r) => s + r.hp, 0) / real.length)}% left`);
  else parts.push(...real.map(r => `${word(r.type)} at <b>${Math.round(100 * r.hp)}%</b>`));
  if (dec) parts.push(decoyKnown(g, me, f) ? 'the decoy group' : '<b>a decoy group</b> (now exposed)');
  return parts.length ? list(parts) : 'nothing there';
}

/** One line for a fire mission, as the firing side hears it. */
export function fireText(g, f) {
  const rep = f.reported < 0.25 ? 'no effect seen' : `about ${n1(f.reported)} points of damage`;
  let s = `Your artillery fired on <b>${NAME[f.node]}</b>: ${rep}.`;
  if (f.spotter) s += ` ${DEF[f.spotter].name} watched it land: ${sawText(g, f.side, f)}.`;
  else s += ' <span class="muted">No recon next to it, so no one saw what was hit. Damage reports are right 9 times in 10.</span>';
  for (const x of f.friendly) s += ` <b class="fc-bad">Danger close: ${DEF[x.unit].name} was hit by your own fire (lost ${n1(x.loss)}).</b>`;
  return s;
}

/** Two short lines for the tag drawn next to the target on the map. */
export function fireTag(g, f) {
  const first = f.reported < 0.25 ? 'No effect seen' : `About ${n1(f.reported)} pts damage`;
  const bits = [];
  if (f.spotter) {
    const real = f.reveal.filter(r => r.type !== 'decoy');
    bits.push(real.length ? `${real.length} hit, avg ${Math.round(100 * real.reduce((s, r) => s + r.hp, 0) / real.length)}% left` : 'nothing there');
    if (f.reveal.some(r => r.type === 'decoy')) bits.push(decoyKnown(g, f.side, f) ? 'decoy' : 'decoy exposed');
  } else bits.push('not watched');
  if (f.friendly.length) bits.push('danger close!');
  return { node: f.node, lines: [first, bits.join(' · ')] };
}

/** Feed entries for hour h, from side `me`'s point of view. `now`: only the start-of-hour items. */
function hourItems(g, me, h, now) {
  const foe = foeOf(me), out = [];
  const mine = id => DEF[id]?.side === me || g.units.find(u => u.id === id)?.side === me;
  for (const f of g.fires.filter(x => x.t === h && x.side === foe)) {
    const hit = f.hits.filter(x => mine(x.unit) && x.loss > 0.05);
    if (hit.length > 2) out.push(['bad', `${SIDE[foe]} artillery hit <b>${NAME[f.node]}</b>: ${hit.length} of your units hit, ${n1(hit.reduce((a, x) => a + x.loss, 0))} points lost in all.`]);
    else if (hit.length) out.push(['bad', `${SIDE[foe]} artillery hit <b>${NAME[f.node]}</b>: ${list(hit.map(x => `${DEF[x.unit].short} lost ${n1(x.loss)}`))}.`]);
  }
  for (const f of g.fires.filter(x => x.t === h && x.side === me)) out.push(['', fireText(g, f)]);
  const arr = g.events.filter(e => e.t === h && e.kind === 'arrive' && mine(e.unit));
  for (const n of [...new Set(arr.map(e => e.node))]) out.push(['', `Arrived at <b>${NAME[n]}</b>: ${list(arr.filter(e => e.node === n).map(e => DEF[e.unit].short))}.`]);
  if (now) return out;
  const moving = g.events.filter(e => e.t === h && e.kind === 'order' && mine(e.unit));
  if (moving.length) out.push(['', `On the move: ${moving.map(e => `${DEF[e.unit].short} to ${NAME[e.dest]}${e.sent < h ? ` (ordered ${hhmm(e.sent)})` : ''}`).join('; ')}.`]);
  for (const e of g.events.filter(x => x.t === h)) {
    if (e.kind === 'give' && mine(e.unit)) out.push(['', `${DEF[e.unit].short} gave ground from ${NAME[e.from]} to ${NAME[e.to]} (lost ${n1(e.loss)}).`]);
    if (e.kind === 'give' && !mine(e.unit) && g.fights.some(f => f.t === h && f.node === e.to)) out.push(['good', `The enemy gave ground from ${NAME[e.from]}.`]);
    if (e.kind === 'halt' && mine(e.unit)) out.push(['warn', `<b>${DEF[e.unit].short} halted at ${NAME[e.node]}</b> (contact); its order to ${NAME[e.dest]} is cancelled. Give it a new order.`]);
    if (e.kind === 'leave' && mine(e.unit)) out.push(['', `${DEF[e.unit].short} broke contact at ${NAME[e.node]} (lost ${n1(e.loss)}).`]);
  }
  for (const f of g.fights.filter(x => x.t === h)) {
    const iDef = f.def === me;
    const how = f.kind === 'meeting' ? 'a meeting engagement' : f.kind === 'flank' ? `<b>a flank attack</b>: ${iDef ? 'your' : 'their'} defense counts for nothing`
      : iDef ? `you defend, ${f.kind}` : `you attack a ${f.kind} defense`;
    const [lm, lf] = me === 'blue' ? [f.lb, f.lr] : [f.lr, f.lb];
    out.push([f.kind === 'flank' ? (iDef ? 'bad' : 'good') : '', `Fighting at <b>${NAME[f.node]}</b> (${how}): you lost ${n1(lm)}, the enemy ${n1(lf)}.`]);
  }
  for (const e of g.events.filter(x => x.t === h && x.kind === 'break')) {
    if (mine(e.unit)) out.push(['bad', `<b>${DEF[e.unit].short} broke</b> after heavy losses and left the battle.`]);
    else if (g.fights.some(f => f.t === h && f.node === e.node)) out.push(['good', `An enemy ${word(DEF[e.unit].type)} broke at ${NAME[e.node]}.`]);
  }
  // New sightings at the end of the hour.
  const before = beliefAt(g, me, h), after = beliefAt(g, me, h + 1);
  const known = new Map(before.tracks.map(t => [t.elem, t.node]));
  const fresh = after.tracks.filter(t => t.age === 0 && (!known.has(t.elem) || known.get(t.elem) !== t.node));
  const seenNow = fresh.filter(t => !t.heard), heard = fresh.filter(t => t.heard);
  for (const n of [...new Set(seenNow.map(t => t.node))]) out.push(['seen', `Seen at <b>${NAME[n]}</b>: ${list(seenNow.filter(t => t.node === n).map(t => (t.type === 'decoy' ? 'a decoy group' : word(t.type))))}.`]);
  for (const n of [...new Set(heard.map(t => t.node))]) out.push(['seen', `Recon hear what sounds like a tank battalion at <b>${NAME[n]}</b> (two sectors out; not seen).`]);
  const oldMarks = new Set(before.marks.map(m => m.node));
  const newMarks = after.marks.filter(m => !oldMarks.has(m.node));
  if (newMarks.length) out.push(['seen', `Recon reports movement at ${list(newMarks.map(m => `<b>${NAME[m.node]}</b>`))} (an hour old).`]);
  return out;
}

/** The report feed: this hour so far and the last hour open, older hours folded (open ones stay open). */
export function feedHTML(g, me, open = new Set(), hours = GAME.hours) {
  const blocks = [];
  if (!g.over) {
    const now = hourItems(g, me, g.t, true);
    if (now.length) blocks.push(block(`Now, ${hhmm(g.t)}`, now, null));
  }
  for (let h = g.t - 1; h >= Math.max(0, g.t - hours); h--) {
    const items = hourItems(g, me, h, false);
    const fold = h < g.t - 1 ? h : null;
    blocks.push(block(`${hhmm(h)} to ${hhmm(h + 1)}`, items.length ? items : [['muted', 'Nothing new.']], fold, open.has(h)));
  }
  return blocks.join('') || '<li class="muted">No reports yet. Pick a unit, click where it should go, then press End hour.</li>';
}
const block = (head, items, fold, isOpen) => {
  const body = `<ul>${items.map(([c, t]) => `<li class="${c}">${t}</li>`).join('')}</ul>`;
  if (fold === null) return `<li class="fc-fh"><span class="num">${head}</span>${body}</li>`;
  const bad = items.filter(([c]) => c === 'bad').length;
  return `<li class="fc-fh fc-old"><details data-h="${fold}"${isOpen ? ' open' : ''}><summary><span class="num">${head}</span> <small>${items.length} report${items.length > 1 ? 's' : ''}${bad ? `, ${bad} bad` : ''}</small></summary>${body}</details></li>`;
};

/** Status box text for side `me`. */
export function status(g, me, pic) {
  const tot = g.units.filter(u => u.side === me).reduce((s, u) => s + u.str0, 0);
  const now = g.units.filter(u => u.side === me && !u.broken && u.node !== 'gone').reduce((s, u) => s + u.str, 0);
  const seen = Math.round(pic.tracks.reduce((s, t) => s + t.est, 0));
  if (!g.over) {
    return { s: 'warn', t: me === 'blue' ? 'Hold Tarn Crossing' : 'Take Tarn Crossing',
      sub: `${GAME.hours - g.t} hour${GAME.hours - g.t === 1 ? '' : 's'} left. Your strength ${Math.round(now)} of ${tot}. Enemy strength you can see: ${seen}${pic.marks.length ? ', plus movement' : ''}.` };
  }
  const won = g.over.winner === me;
  const t = g.over.winner === 'blue' ? (me === 'blue' ? 'You held Tarn Crossing' : 'Blue held Tarn Crossing') : (me === 'red' ? `You took Tarn Crossing at ${hhmm(g.over.h)}` : `Tarn Crossing fell at ${hhmm(g.over.h)}`);
  return { s: won ? 'good' : 'bad', t, sub: 'The review is below the map.' };
}

export function renderBelow($) {
  const N = '<span class="notional">notional</span>';
  const rows = [
    ['Blue force', `${FORCES.blue.length} units: 4 mech battalions (10 each), a tank battalion (12), a weapons company (6), 2 recon troops (4 each) and an artillery battalion. 66 points.`, N],
    ['Red force', `${FORCES.red.length} units: 2 recon troops, 3 mech battalions, 5 tank battalions, a weapons company, a decoy group and an artillery battalion. 104 real points. Arrivals: ${waveText()}.`, N],
    ['Length', `${GAME.hours} one-hour turns, ${hhmm(0)} to ${endTime()}`, N],
    ['Defender multiplier k', `Prepared ${COMBAT.k.prepared}, hasty ${COMBAT.k.hasty}, meeting ${COMBAT.k.meeting}, flank ${COMBAT.k.flank}; √k matches FM 5-0 Table B-1 (3:1, 2.5:1, 1:1, 1:1). These are the standard game (balance ${OFFDEF.standard})`, 'calibrated'],
    ['Offense–defense balance', `Slider ${OFFDEF.min}–${OFFDEF.max}, standard ${OFFDEF.standard}: prepared and hasty k × ${OFFDEF.step}<sup>(${OFFDEF.standard} − setting)</sup>, from ×${tilt(OFFDEF.min).toFixed(2)} at ${OFFDEF.min} to ×${tilt(OFFDEF.max).toFixed(2)} at ${OFFDEF.max}; meeting and flank unchanged`, 'notional; step calibrated by simulation'],
    ['Prepared after', `${GAME.prepHours} hours in place`, N],
    ['Flank attack', 'A defender already fighting attackers from one sector and then hit from a second sector fights at k = 1 (Table B-1: flank counterattack 1:1)', 'rule notional, value sourced'],
    ['Base kill rate c', `${COMBAT.c} per hour`, N],
    ['Break threshold', `${COMBAT.breakFrac * 100}% losses, both sides (as in Mearsheimer's reconstruction)`, N],
    ['Loss noise', `lognormal, σ = ${COMBAT.sigma} per hour; unit quality σ = ${COMBAT.quality}`, N],
    ['Weapons company', `×${TYPES.weapons.prepared} in a prepared defense, ×${TYPES.weapons.attack} when attacking`, N],
    ['Breaking contact', `A unit leaving a sector the enemy holds takes ${DISENGAGE * 100}% of one hour of the enemy's fire (k = 1)`, N],
    ['Artillery', `One mission an hour; each enemy unit in the sector loses ${ARTILLERY.frac * 100}% (σ ${ARTILLERY.sigma}); report right ${ARTILLERY.reportRight * 100}% of the time; recon in the sector hit ${ARTILLERY.friendlyHit * 100}% of the time for ${ARTILLERY.friendlyFrac * 100}%; recon next door shows the sector exactly`, 'rules from the brief; values notional'],
    ['Seeing', `Your sector: exact. Next door: ${VISION.next * 100}% chance per unit, type and full strength, decoys look like tanks. Recon: movement up to ${VISION.farHops} sectors away, ${VISION.farDelay} hour late${VISION.decoyHeard ? `; a decoy group that far is heard as a tank battalion${VISION.heardDelay ? `, ${VISION.heardDelay} hour late` : ', at once'}` : ''}. Sightings kept ${VISION.memory} hours`, N],
    ['Order delay', `${ORDER_DELAY.map(([h, p]) => `${h} h: ${p * 100}%`).join(', ')}; one roll per side per hour, shown before you give orders${ORDER_DELAY_MAXRUN ? `; never more than ${ORDER_DELAY_MAXRUN} late hours in a row` : ''}`, N],
    ['Movement', '1 hour per sector on a road; 2 across a ridge and on the long roads from the outer columns to the crossing', N],
  ];
  $('param-table').innerHTML = '<thead><tr><th>Value</th><th>Setting</th><th>Basis</th></tr></thead><tbody>'
    + rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('') + '</tbody>';
  const table = (rows, head) => `<div class="tablewrap"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  $('balance').innerHTML = `<p class="fine">${BALANCE.games.toLocaleString('en-US')} seeded games per row (the same scenarios in every row).</p>`
    + `<p class="eyebrow">Defending, against the game's Red commander</p>` + table(BALANCE.defend, ['Blue strategy', 'Blue holds', `Blue losses (of ${BALANCE.blue})`, `Red losses (of ${BALANCE.red})`, 'Reserve sent first to the feint'])
    + `<p class="eyebrow mt">Attacking, against the game's Blue commander</p>` + table(BALANCE.attack, ['Red strategy', 'Red takes the crossing', `Blue losses (of ${BALANCE.blue})`, `Red losses (of ${BALANCE.red})`, 'Blue reserve sent first to the feint'])
    + (BALANCE.payoff ? `<p class="eyebrow mt">Feint payoff: feint and mass minus mass on one road</p>` + table([['Feint payoff (percentage points)', BALANCE.payoff.fog, BALANCE.payoff.truth]], ['', "Against the game's Blue commander", 'Against a Blue commander who sees everything'])
      + `<p class="fine">The gain comes from fooling Blue: against a commander who sees everything, the same feint adds almost nothing.</p>` : '');
  $('od-table').innerHTML = `<p class="fine">${OFFDEF_TABLE.games.toLocaleString('en-US')} seeded games per cell (seeds 1000–${999 + OFFDEF_TABLE.games}, the same scenarios in every cell), step ${OFFDEF_TABLE.step}. Defending rows: scripted Blue against the game's Red commander; attacking rows: scripted Red against the game's Blue commander. The last column is the game's two commanders against each other.</p>`
    + table(OFFDEF_TABLE.rows, OFFDEF_TABLE.head);
  const Q = [
    ['Clausewitz, On War, Book I, ch. VI', 'Great part of the information obtained in War is contradictory, a still greater part is false, and by far the greatest part is of a doubtful character. … The law of probability must be his guide.', 'clausewitz'],
    ['Clausewitz, On War, Book I, ch. VII', 'Everything is very simple in War, but the simplest thing is difficult.', 'clausewitz'],
    ['FM 3-90, para. 5-160', 'A feint is a form of attack used to deceive the enemy as to the location or time of the actual decisive operation. Forces conducting a feint seek direct fire contact with the enemy but avoid decisive engagement.', 'fm390'],
    ['FM 3-90, ch. 10', 'It focuses on destroying the attacking force by permitting the enemy to advance into a position that exposes him to counterattack and envelopment.', 'fm390'],
    ['FM 3-90, para. 3-29', 'Generally, a commander prefers to conduct an envelopment instead of a penetration or a frontal attack because the attacking force tends to suffer fewer casualties while having the most opportunities to destroy the enemy.', 'fm390'],
  ];
  const idx = id => SOURCES.findIndex(s => s.id === id) + 1;
  $('quotes').innerHTML = Q.map(([who, q, id]) => `<li><b>${who}</b> “${esc(q)}” <a href="#src-${id}">[${idx(id)}]</a></li>`).join('');
  $('sources').innerHTML = SOURCES.map(s => `<li id="src-${s.id}">${esc(s.text)} <a href="${s.url}" target="_blank" rel="noopener">link</a></li>`).join('');
}
