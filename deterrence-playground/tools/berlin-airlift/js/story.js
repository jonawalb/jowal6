// Event cards and the end-of-game debrief.
import { MONTHLY, ANCHORS, EASTER_AVG, TOTALS } from '../data/history.js';
import { HIST_CUM } from './charts.js';
import { dateOf, fmt, fmtDate, esc } from './util.js';

const $ = id => document.getElementById(id);

export function showEvent(ev, onChoose) {
  const card = $('event');
  if (!ev) { card.hidden = true; card.innerHTML = ''; return; }
  card.innerHTML = `<p class="ev-d">${fmtDate(ev.date)} · decision</p><h3>${esc(ev.title)}</h3><p>${esc(ev.body)}</p>
    <p class="ev-src">Source: ${esc(ev.src)}. Choices and their effects are the game's.</p>
    <div class="ev-ch">${ev.choices.map((c, i) => `<button type="button" data-i="${i}" class="${c.hist && ev.choices.length > 1 ? 'hist' : ''}"><b>${esc(c.label)}</b>${c.note ? `<small>${esc(c.note)}</small>` : ''}</button>`).join('')}</div>`;
  card.hidden = false;
  card.querySelectorAll('button').forEach(b => b.addEventListener('click', () => onChoose(Number(b.dataset.i))));
  card.querySelector('button').focus({ preventScroll: true });
  const r = card.getBoundingClientRect();
  if (r.top < 0 || r.bottom > innerHeight) card.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

export function showDebrief(g) {
  const card = $('debrief');
  if (!g.over) { card.hidden = true; return; }
  const rec = g.rec, last = rec[rec.length - 1], n = rec.length;
  const endD = dateOf(n - 1);
  const head = {
    lifted: ['Berlin held', `The blockade is lifted on 12 May 1949. You kept the city supplied for ${n} days.`],
    abandoned: ['The airlift is abandoned', `Political support ran out on ${fmtDate(endD)}. Washington and London turn to negotiation on Soviet terms or to an armed convoy, the option the airlift was meant to avoid.`],
    starved: ['Berlin runs out of food', `The food reserve stayed empty for five days to ${fmtDate(endD)}. The western sectors cannot hold.`],
  }[g.outcome];
  card.dataset.s = g.outcome === 'lifted' ? 'good' : 'bad';
  const hist = HIST_CUM[n - 1];
  const met = rec.filter(r => r.tons >= r.req).length;
  const histMonths = MONTHLY.filter(m => m.m >= '1948-07' && m.m <= '1949-04');
  const histMet = histMonths.filter(m => m.total / m.days >= reqFor(m.m)).length;
  const acc = rec.reduce((a, r) => a + r.acc, 0), fatal = rec.reduce((a, r) => a + r.fatal, 0);
  const flights = rec.reduce((a, r) => a + r.flights, 0);
  const histAcc = flights * (TOTALS.usMajorAccidents + TOTALS.rafSalvageAccidents) / TOTALS.flights;
  const best = rec.reduce((a, r) => (r.tons > a.tons ? r : a), rec[0]);
  const million = rec.find(r => r.cum >= 1e6);
  const minFood = Math.min(...rec.map(r => r.food)), minCoal = Math.min(...rec.map(r => r.coal));
  const lessons = [];
  const grounded = rec.filter(r => r.grounded > 0.5).length;
  if (grounded) lessons.push(`Overdue 200-hour inspections grounded C-54s on ${grounded} days. The real airlift hit the same wall in the winter, when the new Burtonwood depot managed only 18 inspections in November and 49 in December and the flying bases had to make up the rest (Miller, p. 77).`);
  const stack = rec.filter(r => r.stack && r.day > 48).length;
  if (stack) lessons.push(`You stacked aircraft over Berlin in bad weather on ${stack} days after Black Friday. Tunner's one-attempt rule let the airlift land 30 aircraft in the 90 minutes a stack of 9 took (Miller, p. 65).`);
  const thfFull = rec.filter(r => r.limitS === 'slots').length;
  if (thfFull > 40) lessons.push(`Tempelhof ran out of landing slots on ${thfFull} days. The Allies answered with the shorter northern route from Fassberg and Celle, new runways, and Tegel, built in three months.`);
  const surge = rec.filter(r => r.hours >= 150).length;
  if (surge > 30) lessons.push(`Crews flew surge hours on ${surge} days. The model raises accident risk and, past a point, cuts the hours crews can actually fly.`);
  if (minCoal < 10) lessons.push(`Coal fell to ${minCoal.toFixed(0)} days of reserve. Coal made up about 65 percent of all cargo flown (Miller, p. 86), and on 24 December 1948 Berlin had about 20 days of coal in reserve (p. 97).`);
  if (minFood < 10) lessons.push(`Food fell to ${minFood.toFixed(0)} days of reserve. Planners flew flour and dehydrated potatoes rather than bread and fresh potatoes to save weight (Miller, p. 28).`);
  if (!lessons.length) lessons.push('No single bottleneck dominated your airlift. Try a harsher weather seed, or cut the construction lift and see when Tegel opens.');
  card.innerHTML = `<p class="eyebrow">Debrief</p><h3>${head[0]}</h3><p>${head[1]}</p>
    <p class="db-grade">You delivered <b>${fmt(last.cum)}</b> tons; the historical airlift had delivered about <b>${fmt(hist)}</b> by the same day (${pctDiff(last.cum, hist)}).</p>
    <ul>
      <li>You met the daily requirement on ${met} of ${n} days. The historical monthly average met it in ${histMet} of the ${histMonths.length} full months from July 1948 to April 1949.</li>
      <li>Your best day: ${fmt(best.tons)} tons on ${fmtDate(best.d)}. Historical records: ${fmt(ANCHORS[3].t)} tons on Air Force Day and ${fmt(ANCHORS[6].t)} in the Easter Parade, after which the ten-day average rose from ${fmt(EASTER_AVG.before)} to ${fmt(EASTER_AVG.after)} tons a day.</li>
      <li>${million ? `Your millionth ton reached Berlin on ${fmtDate(million.d)}; the historical millionth ton arrived on 18 February 1949.` : 'You did not reach a million tons; the historical airlift did on 18 February 1949.'}</li>
      <li>${acc} major accidents (${fatal} fatal) in ${fmt(flights)} landings. At the airlift's own rate you would expect about ${fmt(histAcc)}. The real airlift cost 31 American, 39 British and 13 German lives (Miller, p. 109).</li>
      <li>Lowest reserves: food ${minFood.toFixed(0)} days, coal ${minCoal.toFixed(0)} days.</li>
    </ul>
    <p class="eyebrow">What held you back</p><ul>${lessons.map(l => `<li>${l}</li>`).join('')}</ul>
    <p class="fine">Drag the replay slider under the chart to step through your season, or start a new game with a different weather seed.</p>`;
  card.hidden = false;
}

function reqFor(m) { return m < '1949-01' ? 4500 : 5620; }
function pctDiff(a, b) { const p = Math.round(100 * (a - b) / b); return p === 0 ? 'the same' : p > 0 ? `${p}% more` : `${-p}% less`; }
