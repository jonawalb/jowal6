// Panel: status, readouts, contact log, setup controls and the page's static sections.
import { escapeHtml } from '../../../shared/js/mapkit.js';
import { GAME, BEHAVIOURS, ROUTES, PARAM_ROWS, SENSORS } from '../data/params.js';
import { SOURCES, HISTORY } from '../data/sources.js';
import { activeAt, pDetect } from './sensors.js';
import { HEAT } from './filter.js';
import { BOX } from './geo.js';

const $ = id => document.getElementById(id);
const pct = x => `${Math.round(x * 100)}%`;
const TYPE = { buoy: 'Sonobuoys', mpa: 'Aircraft', ship: 'Towed array' };
const fmtP = p => `${Math.abs(p[1]).toFixed(1)}°N ${Math.abs(p[0]).toFixed(1)}°W`;

/** Cell area in nm² at the map's middle latitude, for the "sharpness" readout. */
const CELL_NM2 = ((BOX[2] - BOX[0]) / HEAT.nx * 60 * Math.cos(63.75 * Math.PI / 180)) * ((BOX[3] - BOX[1]) / HEAT.ny * 60);

/** Probability the sub is inside at least one sensor that will work next hour. */
function pCovered(g) {
  const h = g.t + 1, act = g.assets.filter(a => activeAt(a, h));
  if (!act.length) return 0;
  let s = 0;
  g.filter.parts.forEach((p, i) => {
    if (p.out) return;
    if (act.some(a => pDetect(a, { ...p, sprint: true }) > 0)) s += g.filter.w[i];
  });
  return s;
}

export function renderStatus(g) {
  const snap = g.snaps[g.snaps.length - 1];
  $('hour').textContent = g.t;
  $('budget').textContent = g.budget;
  $('pips').innerHTML = Array.from({ length: GAME.budget }, (_, i) => `<i class="${i < g.budget ? 'on' : ''}"></i>`).join('');
  const st = $('status');
  if (!g.over) {
    st.dataset.s = 'warn';
    $('st-t').textContent = g.t === 0 ? 'Sub somewhere in the ring' : `Hunting, hour ${g.t}`;
    $('st-s').textContent = `${GAME.hours - g.t} hours left. The sub is hidden until the hunt ends.`;
  } else {
    const k = g.over.kind;
    st.dataset.s = k === 'found' ? 'good' : 'bad';
    $('st-t').textContent = { found: 'Submarine found', missed: 'Attack missed', escaped: 'The sub broke out', timeout: 'Time ran out' }[k];
    $('st-s').textContent = 'See the reveal under the map.';
  }
  const rows = [
    ['Through a gap already', pct(snap.pOut)],
    ['Inside next hour\'s sensors', pct(pCovered(g))],
    ['Last hour\'s search could detect', g.t ? pct(snap.pAny) : '–'],
    ['Half the map fits in', `${Math.round(snap.half * CELL_NM2 / 1000).toLocaleString()}k nm²`],
    ['Contacts so far', `${g.contacts.length}`],
  ];
  $('read').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

export function renderLog(g, hour = g.t) {
  const items = [];
  for (const c of g.contacts.filter(c => c.h <= hour)) {
    const tag = g.over ? (c.real ? '<span class="pill sh-real">real</span>' : '<span class="pill sh-false">false</span>') : '';
    items.push({ h: c.h, html: `<b>C${c.n}</b> hour ${c.h}: ${TYPE[c.type]} contact near ${fmtP(c.p)} ${tag}` });
  }
  for (const c of g.clues.filter(c => c.h <= hour)) items.push({ h: c.h, html: `<b>Clue</b> hour ${c.h}: ${escapeHtml(c.text)}`, clue: true });
  items.sort((a, b) => b.h - a.h);
  $('log').innerHTML = items.length ? items.map(i => `<li class="${i.clue ? 'clue' : ''}">${i.html}</li>`).join('')
    : '<li class="muted">Nothing yet. Contacts and clues appear here, newest first. Some contacts are false.</li>';
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
  buoy: `Click the map to lay ${SENSORS.buoy.n} buoys in a ${SENSORS.buoy.fieldR} nm circle. They listen from next hour for ${SENSORS.buoy.life} hours.`,
  mpa: `Click the map to send an aircraft. It flies a ${SENSORS.mpa.half * 2} × ${SENSORS.mpa.half * 2} nm box for ${SENSORS.mpa.onStation} hours, starting ${SENSORS.mpa.delay + 1} hours from now.`,
  ship: 'Click the map to set the ship\'s destination. It moves 12 nm an hour and listens along its track.',
  pros: `Click where you think the sub is. You will see your map's odds before you commit to the ${GAME.prosR} nm attack ring.`,
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
}

export const routeName = i => ROUTES[i].name;
