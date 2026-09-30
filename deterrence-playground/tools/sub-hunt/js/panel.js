// Panel: the turn bar (effort meter, stocks, attack odds), the plain-language turn summaries, the map's
// odds on each behaviour, Practice settings and the page's static sections.
import { escapeHtml } from '../../../shared/js/mapkit.js';
import { GAME, BEHAVIOURS, ROUTES, PARAM_ROWS, SENSORS, ACTIONS } from '../data/params.js';
import { SOURCES, HISTORY } from '../data/sources.js';
import { mathHtml, drawLRC } from './math.js';
import { effortLeft, spent, thisTurn, lastSnap, TYPE, hourOf } from './game.js';
import { BEHS } from './sub.js';

const $ = id => document.getElementById(id);
export const pct = x => `${Math.round(x * 100)}%`;
const DIRS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
export const dirOf = brg => DIRS[Math.round(brg / 45) % 8];
const list = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const ERR = { circle: SENSORS.circle.loc * 2, line: SENSORS.line.loc * 2, air: SENSORS.air.loc * 2, helo: SENSORS.helo.loc * 2, net: SENSORS.net.loc * 2 };
const WHO = { circle: 'Buoy circle', line: 'Buoy line', air: 'Aircraft', helo: 'Helicopter dip' };

function tag(g, c) {
  const t = `<b>C${c.n}</b>`;
  if (!g.over) return t;
  return `${t} <span class="pill ${c.real ? 'sh-real' : 'sh-false'}">${c.real ? 'real' : 'false'}</span>`;
}

function contactText(g, c) {
  if (c.type === 'ship') return `the ship's towed array heard a bearing, ${Math.round(c.brg)}° ±${SENSORS.ship.brg * 2}° (${tag(g, c)})`;
  if (c.type === 'net') return `the listening network heard a sprint, within ±${ERR.net} nm (${tag(g, c)})`;
  return `${WHO[c.type]} ${c.by} heard something, within ±${ERR[c.type]} nm (${tag(g, c)})`;
}

/** One turn's events in words. Returns HTML (all text is generated here, nothing user-supplied). */
export function turnText(g, ev) {
  const out = [];
  ev.attacks.forEach(a => {
    out.push(a.hit ? `<b>Hit!</b> Your attack landed ${a.d.toFixed(1)} nm from the sub.`
      : `Your attack missed; the map now rules out that ring. A sub within ${GAME.alertR} nm heard it and will sprint away for 2 hours, which makes it loud.`);
  });
  const cs = ev.contacts;
  if (cs.length) {
    const s = cs.map(c => contactText(g, c));
    out.push(`${s.length > 1 ? 'Contacts: ' : 'Contact: '}${s.join('; ')}.`);
    if (cs.some(c => c.type !== 'net')) out.push('Any of these except the network could be noise.');
  }
  const quiet = Object.entries(ev.heard).filter(([k, n]) => !n && k !== 'Ship').map(([k]) => k);
  if (quiet.length) out.push(`${list(quiet)} heard nothing, so the odds there dropped.`);
  else if (!cs.length && ev.h1 > ev.h0 && !ev.attacks.some(a => a.hit)) out.push('Nothing heard anywhere.');
  if (!ev.attacks.some(a => a.hit)) out.push(`Best attack odds ${pct(ev.before)} → <b>${pct(ev.after)}</b>.`);
  const when = ev.attacks.some(a => a.hit) ? `Hour ${ev.h0}` : `Hours ${ev.h0}–${ev.h1}`;
  return `<b>${when}.</b> ${out.join(' ')}`;
}

function pips(g) {
  const used = g.over ? 0 : spent(g), have = g.over ? 0 : g.effort;
  let s = '';
  for (let i = 0; i < GAME.bank; i++) s += `<i class="${i < have - used ? 'on' : i < have ? 'used' : ''}"></i>`;
  return s;
}

export function renderStatus(g) {
  const snap = lastSnap(g);
  $('turn').textContent = Math.min(g.turn + 1, GAME.turns);
  $('hours').textContent = g.over ? `Hunt over at hour ${g.over.h}` : `hours ${hourOf(g)}–${hourOf(g) + GAME.turnHours}`;
  $('pips').innerHTML = pips(g);
  $('effort').textContent = g.over ? '0' : `${effortLeft(g)}`;
  $('effort-of').textContent = g.over ? '' : ` of ${g.effort}`;
  const qBuoy = thisTurn(g).filter(e => ACTIONS[TYPE[e.k]].stock === 'buoys').length;
  $('buoys').textContent = `${g.buoys}`;
  $('torps').textContent = `${g.torps - thisTurn(g).filter(e => e.k === 'x').length}`;
  $('buoys').title = qBuoy ? `${qBuoy} queued this turn` : '';
  $('odds').textContent = pct(snap.best.v);
  $('odds-bar').style.width = `${Math.round(snap.best.v * 100)}%`;
  const st = $('status');
  if (!g.over) {
    st.dataset.s = 'warn';
    $('st-t').textContent = 'Find the submarine';
    $('st-s').textContent = `Hit it with an attack before it slips out into the Atlantic or the ${GAME.turns * GAME.turnHours} hours run out.`;
  } else {
    const k = g.over.kind;
    st.dataset.s = k === 'found' ? 'good' : 'bad';
    $('st-t').textContent = { found: 'Submarine found', escaped: 'The sub slipped through', timeout: 'Time ran out' }[k];
    $('st-s').textContent = 'The review under the map replays its true track against your searches.';
  }
  renderBeh(snap.beh, g);
}

/** Bars for the map's odds on each behaviour; after the hunt, the true one is marked. */
function renderBeh(o, g) {
  $('beh-odds').innerHTML = BEHS.map(k => {
    const truth = g.over && g.sub.beh === k ? ' <span class="pill sh-real">this one</span>' : '';
    return `<div class="sh-bo"><span>${BEHAVIOURS[k].short}${truth}</span><b class="num">${pct(o[k])}</b><span class="sh-bo-bar"><i style="width:${Math.round(o[k] * 100)}%"></i></span></div>`;
  }).join('');
}

/** The turn-by-turn log, newest first. hour limits it during the replay. */
export function renderLog(g, hour = Infinity) {
  const items = g.events.filter(e => Math.min(e.h1, g.over?.h ?? e.h1) <= hour).map(e => `<li>${turnText(g, e)}</li>`).reverse();
  $('log').innerHTML = items.length ? items.join('')
    : '<li class="muted">Nothing yet. After each turn, what your sensors heard appears here, newest first.</li>';
}

/** The queued actions for this turn, as removable chips (Undo takes the last one). */
export function renderQueue(g) {
  const q = g.over ? [] : thisTurn(g);
  $('queue').innerHTML = q.length ? q.map(e => `<li>${ACTIONS[TYPE[e.k]].name} <span class="num">${ACTIONS[TYPE[e.k]].cost}</span></li>`).join('')
    : '<li class="muted">Nothing queued yet: pick an action, then click the map.</li>';
}

export function renderSetup(g, onBeh) {
  const box = $('beh');
  const opts = [['any', 'Any (normal)', 'One of the four, picked by the seed. The map starts unsure which.'],
    ...BEHS.map(k => [k, BEHAVIOURS[k].label, BEHAVIOURS[k].help])];
  box.innerHTML = opts.map(([k, l, h]) =>
    `<button type="button" data-beh="${k}" aria-pressed="${k === g.beh}"><b>${l}</b><small>${h}</small></button>`).join('');
  box.querySelectorAll('button').forEach(b => { b.onclick = () => onBeh(b.dataset.beh); });
  $('seed').value = g.seed;
}

export function renderBelow() {
  $('param-table').innerHTML = '<tr><th>Value</th><th>Setting (all notional)</th></tr>' +
    PARAM_ROWS.map(([k, v]) => `<tr><td>${k}</td><td>${escapeHtml(v)}</td></tr>`).join('');
  $('beh-list').innerHTML = BEHS.map(k => `<li><b>${BEHAVIOURS[k].label}.</b> ${escapeHtml(BEHAVIOURS[k].help)}</li>`).join('');
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
