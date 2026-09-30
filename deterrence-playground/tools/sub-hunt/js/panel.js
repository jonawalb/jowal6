// Panel: the hour bar, the plain-language hour summaries, Advanced settings and the page's static sections.
import { escapeHtml } from '../../../shared/js/mapkit.js';
import { GAME, BEHAVIOURS, ROUTES, PARAM_ROWS, SENSORS } from '../data/params.js';
import { SOURCES, HISTORY } from '../data/sources.js';
import { mathHtml, drawLRC } from './math.js';

const $ = id => document.getElementById(id);
export const pct = x => `${Math.round(x * 100)}%`;
const DIRS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const dirOf = brg => DIRS[Math.round(brg / 45) % 8];

/** "a", "a and b", "a, b and c". */
const list = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const who = a => (a.type === 'buoy' ? `sonobuoys ${a.name}` : a.type === 'mpa' ? `aircraft ${a.name}` : 'the ship');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function contactTag(g, c) {
  if (!g.over) return `<b>C${c.n}</b>`;
  return `<b>C${c.n}</b> <span class="pill ${c.real ? 'sh-real' : 'sh-false'}">${c.real ? 'real' : 'false'}</span>`;
}

/** One hour's events in words. Returns HTML (all text is generated here, nothing user-supplied). */
export function hourText(g, ev) {
  const heard = ev.results.filter(r => r.contacts.length), quiet = ev.results.filter(r => !r.contacts.length);
  const out = [];
  heard.forEach((r, k) => {
    const tags = r.contacts.map(c => contactTag(g, c)).join(', ');
    out.push(`${k ? '' : 'Contact! '}${cap(who(r.asset))} picked up ${r.contacts.length > 1 ? `${r.contacts.length} sounds` : 'a sound'} (${tags}).`);
  });
  const nc = ev.contacts.length;
  if (nc) out.push(`${nc > 1 ? 'Each' : 'It'} could be the sub, or noise.`);
  if (quiet.length) out.push(`${cap(list(quiet.map(r => who(r.asset))))} heard nothing.`);
  const s = ev.shift, moved = s && s.nm >= 1.5 ? `, and the odds moved ${dirOf(s.brg)}` : '';
  if (nc) out.push(`The odds pulled toward the contact${nc > 1 ? 's' : ''}.`);
  else if (ev.cover) out.push(`Hearing nothing cut the odds in the water you searched from ${pct(ev.cover[0])} to ${pct(ev.cover[1])}; the rest of the map gained that${moved}.`);
  else if (moved) out.push(`The odds moved ${dirOf(s.brg)}, away from the ship.`);
  out.push(`Best attack odds ${pct(ev.before)} → <b>${pct(ev.after)}</b>.`);
  return `<b>Hour ${ev.h}.</b> ${out.join(' ')}`;
}

export function renderStatus(g) {
  const snap = g.snaps[g.snaps.length - 1];
  $('hour').textContent = g.t;
  $('hours-left').textContent = g.over ? 'Hunt over' : `${GAME.hours - g.t} hour${GAME.hours - g.t === 1 ? '' : 's'} left`;
  $('odds').textContent = pct(snap.best.v);
  $('odds-bar').style.width = `${Math.round(snap.best.v * 100)}%`;
  $('left-buoy').textContent = `${g.left.buoy} of ${SENSORS.buoy.count} left`;
  $('left-mpa').textContent = `${g.left.mpa} of ${SENSORS.mpa.count} left`;
  const st = $('status');
  if (!g.over) {
    st.dataset.s = 'warn';
    $('st-t').textContent = 'Find the submarine';
    $('st-s').textContent = `Attack where you think it is before it slips out into the Atlantic or the ${GAME.hours} hours run out.`;
  } else {
    const k = g.over.kind;
    st.dataset.s = k === 'found' ? 'good' : 'bad';
    $('st-t').textContent = { found: 'Submarine found', missed: 'Attack missed', escaped: 'The sub slipped through', timeout: 'Time ran out' }[k];
    $('st-s').textContent = 'The true track is now on the map. Use the slider under the map to replay the hunt.';
  }
}

/** The hour-by-hour log, newest first. hour limits it during the replay. */
export function renderLog(g, hour = g.t) {
  const items = g.events.filter(e => e.h <= hour).map(e => `<li>${hourText(g, e)}</li>`).reverse();
  $('log').innerHTML = items.length ? items.join('')
    : '<li class="muted">Nothing yet. After each hour, what your sensors heard appears here, newest first.</li>';
}

export function renderSetup(g, onBeh) {
  const box = $('beh');
  box.innerHTML = Object.entries(BEHAVIOURS).map(([k, b]) =>
    `<button type="button" data-beh="${k}" aria-pressed="${k === g.beh}"><b>${b.label}</b><small>${b.help}</small></button>`).join('');
  box.querySelectorAll('button').forEach(b => { b.onclick = () => onBeh(b.dataset.beh); });
  $('sp').value = Math.round(g.share * 100);
  $('sp-o').textContent = `${Math.round(g.share * 100)}%`;
  $('seed').value = g.seed;
}

export const HINTS = {
  buoy: `Click the map to drop ${SENSORS.buoy.n} sonobuoys in a ${SENSORS.buoy.fieldR} nm circle. They listen for the next ${SENSORS.buoy.life} hours.`,
  mpa: `Click the map to send the aircraft. It searches a ${SENSORS.mpa.half * 2} nm square for the next ${SENSORS.mpa.onStation} hours.`,
  pros: `Click where you think the sub is. You will see your map's odds for the ${GAME.prosR} nm attack ring before you commit.`,
  used: 'You have searched this hour. Press End hour to see what your sensors hear (or Undo to move it).',
};

export function renderBelow() {
  $('param-table').innerHTML = '<tr><th>Value</th><th>Setting (all notional)</th></tr>' +
    PARAM_ROWS.map(([k, v]) => `<tr><td>${k}</td><td>${escapeHtml(v)}</td></tr>`).join('');
  const byId = Object.fromEntries(SOURCES.map((s, i) => [s.id, i + 1]));
  $('history').innerHTML = HISTORY.map(h => {
    const refs = [h.src, h.src2].filter(Boolean).map(id => `<a href="#src-${id}">[${byId[id]}]</a>`).join(' ');
    return `<li><b>${h.when}</b> ${escapeHtml(h.text)} ${refs}</li>`;
  }).join('');
  $('sources').innerHTML = SOURCES.map(s =>
    `<li id="src-${s.id}">${escapeHtml(s.text)} <a href="${s.url}" target="_blank" rel="noopener">link</a></li>`).join('');
  $('math').innerHTML = mathHtml();
  drawLRC($('math'));
}

export const routeName = i => ROUTES[i].name;
