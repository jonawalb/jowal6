// Side panel: the selected cell's dated record and sources, and a summary of the selected treaty with a
// chart of how many states were bound by it each year.
import { STATES, UNTC } from '../data/treaties.js';
import { T, Y0, Y1, STATUS, when, statusAt, statusName, recordLines, eventsFor, esc, dateText, stateName, counts, BOUND } from './common.js';

const src = (url, title) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(title)}</a>`;

export function cellHTML(sel, year) {
  if (!sel) return '<p class="fine">Click any cell for the dates on record and their source.</p>';
  const [tid, iso] = sel.split('.');
  const t = T[tid], st = statusAt(tid, iso, year);
  const lines = recordLines(tid, iso);
  const evs = eventsFor(tid, iso);
  const source = t.url
    ? src(t.url + '/participants', `UNODA Treaties Database: ${t.short} participants`)
    : (t.evidence || []).map(e => src(e.url, e.title)).filter((v, i, a) => a.indexOf(v) === i).join('; ');
  return `<p class="eyebrow">${esc(stateName(iso))} · ${esc(t.short)}</p>
    <h3 class="tt-dh"><span class="tt-sw" data-s="${st.s}"></span>${esc(statusName(st.s))} <span class="num fine">${when(year)}</span></h3>
    ${lines.length ? `<ol class="tt-rec">${lines.map(l => `<li class="${l.d > year + '-12-31' ? 'later' : ''}"><span class="num">${dateText(l.d)}</span> ${esc(l.t)}</li>`).join('')}</ol>`
      : '<p class="fine">No signature, deposit or other action on record for this state.</p>'}
    ${evs.map(e => `<details${e.state === iso ? ' open' : ''}><summary>${dateText(e.date)}: ${esc(e.title)}</summary><blockquote class="tt-q">${esc(e.text)}</blockquote><p class="fine">${src(e.url, e.srcTitle)}</p></details>`).join('')}
    <p class="fine">Source: ${source}.</p>`;
}

function sparkline(tid) {
  const W = 320, H = 92, m = { l: 30, r: 8, t: 8, b: 18 };
  const isos = STATES.map(s => s.iso);
  const ys = [], vals = [];
  for (let y = Y0; y <= Y1; y++) { ys.push(y); vals.push(isos.filter(i => { const st = statusAt(tid, i, y).s; return BOUND.has(st) || st === 'ratified'; }).length); }
  const max = Math.max(5, ...vals);
  const x = y => m.l + (y - Y0) / (Y1 - Y0) * (W - m.l - m.r);
  const yv = v => H - m.b - v / max * (H - m.t - m.b);
  const d = ys.map((y, i) => `${i ? 'L' : 'M'}${x(y).toFixed(1)},${yv(vals[i]).toFixed(1)}`).join('');
  return { svg: (year) => `<svg class="tt-spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="States with an instrument deposited for the ${esc(T[tid].short)} each year, ${Y0} to ${Y1}">
      <g class="tsm-axis"><text x="${m.l - 4}" y="${yv(max) + 4}" text-anchor="end">${max}</text><text x="${m.l - 4}" y="${yv(0)}" text-anchor="end">0</text>
      <text x="${x(Y0)}" y="${H - 4}">${Y0}</text><text x="${x(Y1)}" y="${H - 4}" text-anchor="end">${Y1}</text></g>
      <line class="base" x1="${m.l}" x2="${W - m.r}" y1="${yv(0)}" y2="${yv(0)}"/>
      <path d="${d}"/><line class="cur" x1="${x(year)}" x2="${x(year)}" y1="${m.t}" y2="${yv(0)}"/>
      <circle cx="${x(year)}" cy="${yv(vals[year - Y0])}" r="3.5"/></svg>`, vals };
}

const sparkCache = {};
export function treatyHTML(tid, year) {
  const t = T[tid];
  const sp = sparkCache[tid] ||= sparkline(tid);
  const c = counts(tid, year);
  const shown = STATUS.filter(s => s.id !== 'none' && c[s.id]);
  const facts = [
    t.opened && ['Opened for signature', dateText(t.opened)],
    ['Entered into force', t.eif ? dateText(t.eif) : (/individually/i.test(t.eifNote || '') ? 'For each state on its own terms' : 'Not in force')],
    t.end && [t.endKind ? t.endKind[0].toUpperCase() + t.endKind.slice(1) : 'Ended', dateText(t.end)],
    t.depositaries && ['Depositary', t.depositaries.join('; ')],
    t.unodaParties != null && ['Parties now (UNODA)', t.unodaParties],
  ].filter(Boolean);
  const untc = UNTC[tid] ? `<p class="fine">Cross-checked against the <a href="${esc(UNTC[tid].url)}" target="_blank" rel="noopener">UN Treaty Collection</a> (${UNTC[tid].deposits} deposits listed).</p>` : '';
  return `<p class="eyebrow">Selected treaty</p><h3 class="tt-dh">${esc(t.name)}</h3>
    <dl class="readout">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    <p class="fine">States with an instrument deposited and not withdrawn, each year:</p>${sp.svg(year)}
    <ul class="tt-counts">${shown.map(s => `<li><span class="tt-sw" data-s="${s.id}"></span>${esc(s.name)} <b class="num">${c[s.id]}</b></li>`).join('')}</ul>
    ${untc}`;
}
