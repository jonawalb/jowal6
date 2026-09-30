// Plan panel: controls bound to the game plan, the per-weather forecast and the fleet, maintenance and
// construction readouts. Also the editable coefficient table below the tool.
import { COEF, DEPOT, PROJECTS } from '../data/params.js';
import { capacity, fleetOn, northCap, requirement } from './model.js';
import { requestOption } from './play.js';
import { dateOf, fmt, fmtDate, stepVal, esc } from './util.js';

const $ = id => document.getElementById(id);
const setPressed = (group, v) => group.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));

export function bindPanel(getGame, onChange, onAsk) {
  const plan = () => getGame().plan;
  const seg = (id, key, num) => $(id).addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    plan()[key] = num ? Number(b.dataset.v) : b.dataset.v; onChange();
  });
  seg('interval', 'interval', true); seg('approach', 'approach'); seg('hours', 'hours', true); seg('build', 'build', true);
  $('north').addEventListener('input', e => { plan().north = Number(e.target.value); onChange(); });
  $('c47').addEventListener('input', e => { plan().c47 = Number(e.target.value); onChange(); });
  $('dak').addEventListener('change', e => { plan().dak = e.target.checked; onChange(); });
  $('field').addEventListener('change', e => { plan().field = e.target.checked; onChange(); });
  $('prio').addEventListener('change', e => { plan().prio = e.target.checked ? 'tegel' : 'thf'; onChange(); });
  const mix = which => e => {
    const p = plan(); const v = Number(e.target.value);
    p[which] = v;
    const other = which === 'coal' ? 'food' : 'coal';
    if (p.coal + p.food > 100) p[other] = 100 - v;
    onChange();
  };
  $('coal').addEventListener('input', mix('coal'));
  $('food').addEventListener('input', mix('food'));
  $('ask').addEventListener('click', onAsk);
}

export function renderPanel(g) {
  const p = g.plan, d = dateOf(Math.min(g.day, 319));
  const f = fleetOn(g, d);
  const cap = northCap(d);
  const auto = $('autopilot').checked;
  // Controls
  const nMax = Math.min(cap, Math.round(f.c54));
  $('north').max = nMax; $('north').value = Math.min(p.north, nMax); $('north').disabled = nMax === 0 || auto;
  $('north-o').textContent = `${Math.min(p.north, nMax)} of ${nMax}`;
  $('north-s').textContent = cap === 0 ? 'Fassberg opens to C-54s on 21 Aug 1948.' : d < '1948-12-15' ? 'Room for more at Celle from mid-December.' : 'Fassberg and Celle are both open.';
  $('c47').max = f.c47; $('c47').value = Math.min(p.c47, f.c47); $('c47').disabled = f.c47 === 0 || auto;
  $('c47-o').textContent = f.c47 ? `${Math.min(p.c47, f.c47)} of ${f.c47}` : 'withdrawn';
  $('dak').checked = p.dak; $('field').checked = p.field; $('prio').checked = p.prio === 'tegel';
  setPressed($('interval'), p.interval); setPressed($('approach'), p.approach); setPressed($('hours'), p.hours); setPressed($('build'), p.build);
  $('coal').value = p.coal; $('food').value = p.food;
  const other = Math.max(0, 100 - p.coal - p.food);
  $('coal-o').textContent = p.coal + '%'; $('food-o').textContent = p.food + '%';
  const bar = $('mixbar').children; bar[0].style.width = p.coal + '%'; bar[1].style.width = p.food + '%'; bar[2].style.width = other + '%';
  const q = requirement(d);
  $('mix-note').textContent = `Other cargo ${other}%. Berlin needs about ${pct(q.coal, q.total)}% coal, ${pct(q.food, q.total)}% food and ${pct(q.other, q.total)}% other when you meet the full ${fmt(q.total)} tons.`;
  for (const id of ['dak', 'field', 'prio', 'coal', 'food']) $(id).disabled = auto;
  document.querySelectorAll('#panel .seg button').forEach(b => { b.disabled = auto; });
  // Forecast
  const rows = [['Good', [0, 0]], ['Cloud (instrument)', [1, 1]], ['Fog', [2, 2]]];
  let lim = '';
  $('fore').innerHTML = rows.map(([lbl, wx], i) => {
    const c = capacity(g, d, wx);
    if (i === 0) lim = limitText(c);
    const short = c.tons < q.total;
    return `<tr><th scope="row">${lbl}</th><td class="num${short ? ' bad' : ''}">${fmt(c.tons)}</td><td class="num">${fmt(c.flights)}</td></tr>`;
  }).join('');
  $('fore-lim').innerHTML = `Required: <b>${fmt(q.total)}</b> tons. ${lim}`;
  const o = requestOption(g);
  $('ask').hidden = !o || auto || g.over;
  if (o) $('ask').textContent = `${o.label} (support −${o.cost})`;
  // Fleet readout
  const c = capacity(g, d, [0, 0]);
  const dmg = t => g.dmg.filter(x => x.t === t).length;
  const inWork = Math.round(c.inWork), grounded = Math.round(c.grounded);
  $('fleet').innerHTML = [
    ['C-54s in theater', `${Math.round(f.c54)}`],
    ['  in inspection', `${inWork}`],
    ['  grounded, overdue', `<span class="${grounded ? 'bad' : ''}">${grounded}</span>`],
    ['  damaged', `${dmg('c54')}`],
    ['U.S. C-47s', f.c47 ? `${f.c47}` : 'withdrawn 30 Sep'],
    ['RAF Yorks / Hastings', `${f.york} / ${f.hast}`],
    ['RAF Dakotas', `${f.dak}${p.dak ? '' : ' (stood down)'}`],
    ['British civil', `${f.civ}`],
  ].map(([k, v]) => `<dt>${k.replace(/^  /, '&nbsp;&nbsp;')}</dt><dd>${v}</dd>`).join('');
  // Maintenance
  const depot = stepVal(DEPOT, d);
  const fat = g.fatigue;
  const fm = $('m-fat');
  fm.dataset.s = fat > 55 ? 'bad' : fat > 25 ? 'warn' : 'good';
  fm.querySelector('i').style.width = fat + '%';
  fm.querySelector('.m-v').textContent = fat.toFixed(0);
  $('maint').innerHTML = [
    ['Inspections due', `<span class="${g.due > 3 ? 'bad' : g.due > 1.5 ? 'warn' : ''}">${g.due.toFixed(1)}</span>`],
    ['Depot capacity', depot ? `${depot} a month${d < '1948-11-01' ? ' <span class="notional">notional</span>' : ''}` : 'none until 7 Aug'],
    ['Crew hours flown', `${fmt(c.H)} a month`],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  // Construction
  $('proj').innerHTML = PROJECTS.map(pr => {
    const s = g.proj[pr.k];
    const v = s.done ? `open ${fmtDate(s.done)}` : d < pr.start ? `starts ${fmtDate(pr.start)}` : `${Math.round(100 * s.tons / s.need)}% built`;
    return `<dt>${pr.name}</dt><dd>${v}</dd>`;
  }).join('');
}

const pct = (a, b) => Math.round(100 * a / b);

function limitText(c) {
  const s = c.limitS === 'slots' ? 'Tempelhof is out of landing slots' : 'the U.S.-zone fleet is the limit';
  const n = c.limitN === 'slots' ? 'Gatow and Tegel are out of slots' : 'the British-zone fleet is the limit';
  return `In good weather, ${s}; in the north, ${n}.`;
}

export function renderCoefs(g, onCoef) {
  const body = $('coefs');
  let grp = '', html = '';
  for (const c of COEF) {
    if (c.g !== grp) { grp = c.g; html += `<tr class="grp"><th colspan="2" scope="rowgroup">${esc(grp)}</th></tr>`; }
    const v = g.coef[c.k];
    html += `<tr><td><label for="cf-${c.k}">${esc(c.label)}${c.u ? ` (${esc(c.u)})` : ''}</label>${c.n ? ' <span class="notional">notional</span>' : ''}<small>${esc(c.src)}</small></td>
      <td><input type="number" id="cf-${c.k}" data-k="${c.k}" value="${v}" min="${c.min}" max="${c.max}" step="${c.st}" class="${v !== c.v ? 'changed' : ''}"></td></tr>`;
  }
  body.innerHTML = html;
  body.querySelectorAll('input').forEach(inp => inp.addEventListener('change', () => {
    const c = COEF.find(x => x.k === inp.dataset.k);
    let v = Number(inp.value);
    if (!Number.isFinite(v)) v = c.v;
    v = Math.max(c.min, Math.min(c.max, v));
    inp.value = v; inp.classList.toggle('changed', v !== c.v);
    onCoef(c.k, v);
  }));
}
