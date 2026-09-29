// Below-the-fold lists: every IAEA report used, event sources and breakout sources, built from the data files.
import { ROWS, niceDate, esc, fmtKg } from './series.js';
import { RETRIEVED } from '../data/stockpile.js';
import { EVENTS } from '../data/events.js';
import { BREAKOUT, YARDSTICK, TIMELINESS } from '../data/breakout.js';

const a = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
const BASIS = { verified: 'verified', estimated: 'IAEA estimate', limit: 'no figure; limit not exceeded', unknown: 'stockpile not reported' };

export function renderNotes() {
  document.getElementById('ie-reports').innerHTML = ROWS.map(r => `<li>${a(r.url, esc(r.id))}, issued ${niceDate(r.date)}; ${r.band
    ? `figures as of ${niceDate(r.asof)}, total ${fmtKg(r.total)} kg`
    : ''}${r.band ? '; ' : ''}${BASIS[r.basis]}${r.via ? `; PDF read from the ${a(r.via, 'Wayback Machine')}` : ''}.</li>`).join('');
  const seen = new Set();
  const src = [];
  for (const e of EVENTS) for (const s of [e.src, e.src.also].filter(Boolean)) {
    if (seen.has(s.url + s.name)) continue;
    seen.add(s.url + s.name);
    src.push(`<li>${niceDate(e.date)}, ${esc(e.title)}: ${a(s.url, esc(s.name))}</li>`);
  }
  document.getElementById('ie-evsrc').innerHTML = src.join('');
  document.getElementById('ie-bosrc').innerHTML = [...BREAKOUT.map(b => `<li>${niceDate(b.date)}, ${esc(b.who)}: ${a(b.src.url, esc(b.src.name))}</li>`),
    `<li>40 kg yardstick: ${a(YARDSTICK.src.url, esc(YARDSTICK.src.name))}</li>`,
    `<li>One-month HEU timeliness goal: ${a(TIMELINESS.src.url, esc(TIMELINESS.src.name))}</li>`].join('');
  document.getElementById('ie-retrieved').textContent = niceDate(RETRIEVED);
}
