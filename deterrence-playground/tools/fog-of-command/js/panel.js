// Side panel and text: status, the picture bars, the report log, orders in transit, the parameter table,
// quotes and sources.
import { NODES, AXES } from '../data/map.js';
import { SENSORS, TYPES, COMBAT, REPORT, ORDER_DELAY, GAME, KENT } from '../data/params.js';
import { SOURCES } from '../data/sources.js';
import { BALANCE } from '../data/balance.js';
import { INFO } from './map.js';

const $ = id => document.getElementById(id);
export const NAME = Object.fromEntries(NODES.map(n => [n.id, n.name]));
export const UNIT_NAME = { a: '1st Mech Bn', b: '2nd Mech Bn', e: '3rd Mech Bn', c: 'Recon Sqn', d: 'Armor Bn', drone: 'Drone' };
export const hhmm = x => { const m = Math.round((GAME.startClock + x) * 60); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const TYPE_WORD = { armor: 'tank battalion', mech: 'mechanized battalion', recon: 'recon company', decoy: 'decoy' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function reportText(r) {
  const who = r.sensor === 'watch' ? `${UNIT_NAME[r.by]} observers` : r.sensor === 'reconAdj' ? `${UNIT_NAME[r.by]} (looking next door)` : UNIT_NAME[r.by];
  const what = r.type === 'decoy' ? 'a decoy, not a real unit' : r.type ? `${TYPE_WORD[r.type]}${r.str != null ? `, about ${r.str}` : ''}` : 'enemy activity';
  return `<b>${who}</b>: <i>${r.word}</i> ${what} in ${NAME[r.node]} <span class="muted">(seen ${hhmm(r.obsT)})</span>`;
}

export function renderStatus(g, lossB) {
  const st = $('status');
  if (!g.over) {
    st.dataset.s = 'warn';
    $('st-t').textContent = 'Hold the crossing';
    $('st-s').textContent = `${GAME.hours - g.t} hours to go. Blue strength ${Math.round(46 - lossB)} of 46.`;
  } else {
    st.dataset.s = g.over.held ? 'good' : 'bad';
    $('st-t').textContent = g.over.held ? 'Crossing held' : `Crossing lost at ${hhmm(g.over.h)}`;
    $('st-s').textContent = 'The review is below the map.';
  }
}

export function renderPicture(pic, label = 'estimate') {
  const max = 60;
  const rows = AXES.map((a, i) => [a, pic.axis[i]]);
  if (pic.node.x > 0) rows.push(['Crossing', pic.node.x]);
  $('picture').innerHTML = rows.map(([a, v]) => `<div class="fc-pbar"><span>${a}</span><span class="fc-pbar-t"><i style="width:${Math.min(100, 100 * v / max).toFixed(0)}%"></i></span><b class="num">${Math.round(v)}</b></div>`).join('')
    + `<p class="fine fc-pscale">Red strength points (${label}). A Red tank battalion is about 12.</p>`;
}

export function renderReports(g) {
  const got = g.reports.filter(r => r.arrT <= g.t + 1e-9).sort((a, b) => b.arrT - a.arrT);
  const fresh = r => r.arrT > g.t - 1;
  $('reports').innerHTML = got.length ? got.slice(0, 40).map(r => `<li class="${fresh(r) ? 'new' : ''}"><span class="num fc-rt">${hhmm(r.arrT)}</span> ${reportText(r)}</li>`).join('')
    : '<li class="muted">No reports yet. Task the drone, or wait for your units to see something.</li>';
}

export function renderOrders(g) {
  const pend = g.orders.filter(o => !o.done && !o.cancelled);
  $('orders').innerHTML = pend.length ? pend.map(o => `<li><b>${UNIT_NAME[o.unit]}</b> → ${NAME[o.dest]} <span class="muted">sent ${hhmm(o.t)}, not yet received</span></li>`).join('')
    : '<li class="muted">None. Orders appear here until the unit receives them.</li>';
}

export function renderBelow() {
  const n = v => `<span class="notional">notional</span>`;
  const rows = [
    ['Blue units', 'Mech bn 10, armor bn 12, recon 4 (total 46)', n()],
    ['Red units', '5 mech/tank bns in the main effort and second echelon, 1 feint bn, 1 recon coy, 2 decoy groups (real strength 80)', n()],
    ['Red timing', 'Main effort reaches the north edge at 09:00, 10:00 or 11:00, attacks 3 hours later; feint 1 hour earlier; second echelon 5 hours after the main effort', n()],
    ['Defender multiplier k', `Prepared ${COMBAT.k.prepared}, hasty ${COMBAT.k.hasty}, meeting ${COMBAT.k.meeting}; √k matches FM 5-0 Table B-1 (3:1, 2.5:1, 1:1)`, 'calibrated'],
    ['Base kill rate c', `${COMBAT.c} per hour`, n()],
    ['Break threshold', `${COMBAT.breakFrac * 100}% losses, both sides (as in Mearsheimer's reconstruction)`, n()],
    ['Loss noise', `lognormal, σ = ${COMBAT.sigma} per hour; unit quality σ = ${COMBAT.quality}`, n()],
    ['Prepared after', `${GAME.prepHours} hours in place`, n()],
    ['Order delay', ORDER_DELAY.map(([h, p]) => `${h} h: ${p * 100}%`).join(', '), n()],
    ...Object.entries(SENSORS).map(([, s]) => [s.label, `detect ${Math.round(s.pd * 100)}%${s.pdEngaged ? ` (${Math.round(s.pdEngaged * 100)}% in a fight)` : ''}, names type ${Math.round(s.pid * 100)}%, type right ${Math.round(s.acc * 100)}%, decoy passes as tank ${Math.round(s.spoof * 100)}%, strength error σ ${s.sig}, median delay ${s.delay} h; says "${s.word}"`, n()]),
    ['False contacts', `${REPORT.falseRate} per sensor, per sector watched, per hour`, n()],
    ['Track life', `${REPORT.trackLife} hours without a new report; an unidentified contact counts as ${REPORT.unknownStr}`, n()],
    ['Confidence words', Object.entries(KENT).map(([w, k]) => `${w} ${k.p * 100}% ± ${k.pm * 100}`).join('; '), 'Kent 1964'],
  ];
  $('param-table').innerHTML = '<thead><tr><th>Value</th><th>Setting</th><th>Basis</th></tr></thead><tbody>'
    + rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('') + '</tbody>';
  const Q = [
    ['Clausewitz, Book I, ch. III', 'War is the province of uncertainty: three-fourths of those things upon which action in War must be calculated, are hidden more or less in the clouds of great uncertainty.', 'clausewitz'],
    ['Clausewitz, Book I, ch. VI', 'Great part of the information obtained in War is contradictory, a still greater part is false, and by far the greatest part is of a doubtful character. … The law of probability must be his guide.', 'clausewitz'],
    ['Clausewitz, Book I, ch. VII', 'Everything is very simple in War, but the simplest thing is difficult.', 'clausewitz'],
    ['Boyd, The Essence of Winning and Losing', 'Without OODA loops embracing all of the above and without the ability to get inside other OODA loops (or other environments), we will find it impossible to comprehend, shape, adapt to and in turn be shaped by an unfolding evolving reality that is uncertain, everchanging, and unpredictable', 'boyd'],
  ];
  const idx = id => SOURCES.findIndex(s => s.id === id) + 1;
  $('quotes').innerHTML = Q.map(([who, q, id]) => `<li><b>${who}</b> “${esc(q)}” <a href="#src-${id}">[${idx(id)}]</a></li>`).join('')
    + `<li><b>Kent's chart</b> gives each estimative word a range of odds: almost certain, 93% give or take about 6%; probable, 75% give or take about 12%; chances about even, 50% give or take about 10%. Every report in the game carries one of these words. <a href="#src-kent">[${idx('kent')}]</a></li>`;
  $('sources').innerHTML = SOURCES.map(s => `<li id="src-${s.id}">${esc(s.text)} <a href="${s.url}" target="_blank" rel="noopener">link</a></li>`).join('');
  $('balance').innerHTML = `<p class="fine">${BALANCE.note}</p><div class="tablewrap"><table><thead><tr><th>Strategy</th><th>Crossing held</th><th>Blue losses (of 46)</th><th>Red losses (of 80)</th></tr></thead><tbody>`
    + BALANCE.rows.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3]}</td></tr>`).join('') + '</tbody></table></div>';
}

export { INFO, TYPES };
