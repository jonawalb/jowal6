// After-action review: the outcome, a slider over the game's hours, believed-versus-true charts,
// a report scorecard with Kent-word calibration, and the cost-of-fog replays.
import { el } from '../../../shared/js/mapkit.js';
import { AXES, NORTH } from '../data/map.js';
import { KENT, GAME } from '../data/params.js';
import { beliefAt } from './sense.js';
import { runAll, REPLAYS } from './compare.js';
import { hhmm, NAME } from './panel.js';

const $ = id => document.getElementById(id);
const pct = x => `${Math.round(x * 100)}%`;

function chart(g, hour) {
  const svg = $('aar-chart');
  svg.replaceChildren();
  const T = g.snaps.length - 1;
  const Wd = Math.max(300, Math.round(svg.getBoundingClientRect().width) || 640);
  const narrow = Wd < 520;
  const Hh = narrow ? 3 * 140 + 10 : 220;
  svg.setAttribute('viewBox', `0 0 ${Wd} ${Hh}`);
  const bel = g.snaps.map((_, h) => beliefAt(g, h).axis);
  const tru = g.snaps.map(s => s.truth.axis);
  const ymax = Math.max(40, ...bel.flat(), ...tru.flat());
  for (let a = 0; a < 3; a++) {
    const pw = narrow ? Wd - 50 : (Wd - 50) / 3 - 14;
    const x0 = narrow ? 40 : 40 + a * ((Wd - 50) / 3), y0 = narrow ? 24 + a * 140 + 90 : 180, y1 = narrow ? 24 + a * 140 : 24;
    const sx = h => x0 + h / Math.max(1, T) * pw, sy = v => y0 - v / ymax * (y0 - y1);
    const ax = el('g', { class: 'tsm-axis' }, svg);
    for (const v of [0, Math.round(ymax / 2)]) {
      el('line', { x1: x0, x2: x0 + pw, y1: sy(v), y2: sy(v), class: 'fc-grid' }, ax);
      if (a === 0 || narrow) el('text', { x: x0 - 5, y: sy(v) + 4, 'text-anchor': 'end' }, ax, `${v}`);
    }
    for (const h of [0, 8, 16].filter(h => h <= T)) el('text', { x: sx(h), y: y0 + 14, 'text-anchor': h === 0 ? 'start' : h === T ? 'end' : 'middle' }, ax, hhmm(h));
    el('text', { x: x0, y: y1 - 6, class: `fc-ctitle${a === g.plan.main ? ' main' : ''}` }, svg, `${AXES[a]}${a === g.plan.main ? ' (Red main effort)' : a === g.plan.feint ? ' (feint)' : ' (probe)'}`);
    const line = arr => arr.map((v, h) => `${h ? 'L' : 'M'}${sx(h).toFixed(1)} ${sy(v[a]).toFixed(1)}`).join('');
    el('path', { d: line(tru), class: 'fc-l true' }, svg);
    el('path', { d: line(bel), class: 'fc-l bel' }, svg);
    el('line', { x1: sx(hour), x2: sx(hour), y1: y1, y2: y0, class: 'fc-now' }, svg);
  }
}

function scorecard(g) {
  const got = g.reports.filter(r => r.arrT <= g.t);
  const falseC = got.filter(r => r.falseC).length;
  const named = got.filter(r => r.type);
  const wrong = named.filter(r => !r.correct).length;
  const spoofed = named.filter(r => g.units.find(u => u.id === r.elem)?.type === 'decoy' && r.type === 'armor').length;
  const delays = got.map(r => r.arrT - r.obsT).sort((a, b) => a - b);
  const med = delays.length ? delays[delays.length >> 1] : 0;
  const late = g.reports.filter(r => r.arrT > g.t).length;
  $('aar-read').innerHTML = [
    ['Reports received', got.length],
    ['False contacts', falseC],
    ['Named a type', named.length],
    ['… and got it wrong', `${wrong}${spoofed ? ` (${spoofed} were decoys reported as tanks)` : ''}`],
    ['Median delay', `${Math.round(med * 60)} min`],
    ['Still in the pipeline at the end', late],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  const rows = Object.entries(KENT).map(([w, k]) => {
    const rs = got.filter(r => r.word === w);
    const ok = rs.filter(r => r.correct).length;
    return `<tr><td>${w}</td><td class="num">${rs.length}</td><td class="num">${rs.length ? pct(ok / rs.length) : '–'}</td><td class="num">${pct(k.p)} ± ${Math.round(k.pm * 100)}</td></tr>`;
  });
  $('aar-kent').innerHTML = '<thead><tr><th>Word</th><th>Reports</th><th>Right</th><th>Kent</th></tr></thead><tbody>' + rows.join('') + '</tbody>';
}

function outcome(g) {
  const p = g.plan;
  const where = `Red's main effort, four battalions, came down the ${AXES[p.main]} road, reaching ${NAME[NORTH[p.main]]} at ${hhmm(p.h0)}. The feint was on the ${AXES[p.feint]} road, with two decoy groups; a recon company probed the ${AXES[p.probe]} road.`;
  return g.over.held
    ? ['good', 'You held Tarn Crossing', `${where} You lost ${g.over.lossB.toFixed(0)} of 46 strength points; Red lost ${g.over.lossR.toFixed(0)} of 80.`]
    : ['bad', `Tarn Crossing fell at ${hhmm(g.over.h)}`, `${where} You lost ${g.over.lossB.toFixed(0)} of 46 strength points; Red lost ${g.over.lossR.toFixed(0)} of 80.`];
}

function fogView(rows) {
  const box = $('aar-fog');
  box.innerHTML = rows.map(r => `<div class="fc-fogrow${r.key === 'you' ? ' you' : ''}"><div class="fc-fogl"><b>${r.label}</b><small>${r.note}</small></div>
    <div class="fc-fogbar" role="img" aria-label="${r.label}: held in ${pct(r.p)} of ${r.n} replays"><i style="width:${(r.p * 100).toFixed(1)}%"></i></div>
    <div class="fc-fogn num"><b>${pct(r.p)}</b><small>held · Blue losses ${r.lossB.toFixed(1)}</small></div></div>`).join('');
  const by = Object.fromEntries(rows.map(r => [r.key, r]));
  const d = (a, b) => { const x = Math.round((by[a].p - by[b].p) * 100); return `${x >= 0 ? '+' : '−'}${Math.abs(x)} points`; };
  $('fog-sum').innerHTML = `<b>Cost of fog for your plan:</b> ${d('aim', 'you')} (perfect information vs. your orders). `
    + `<b>Cost of friction:</b> ${d('nodelay', 'you')} (no order delays vs. your orders). `
    + `The doctrinal commander holds ${pct(by.doc.p)} with reports and ${pct(by.docT.p)} with perfect information. `
    + `Your own game was one roll of these dice.`;
}

export function createAAR({ onHour, onAgain, onNew }) {
  let g = null, timer = null, ctrl = null;
  const range = $('aar-range');
  new ResizeObserver(() => { if (g && !$('aar').hidden) chart(g, +range.value); }).observe($('aar-chart'));
  const stop = () => { if (timer) { clearInterval(timer); timer = null; $('aar-play').textContent = 'Replay'; } };
  const setHour = h => { range.value = h; $('aar-h').textContent = hhmm(h); chart(g, h); onHour(h); };
  range.oninput = () => { stop(); setHour(+range.value); };
  $('aar-play').onclick = () => {
    if (timer) { stop(); return; }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let h = +range.value >= +range.max ? 0 : +range.value;
    $('aar-play').textContent = 'Pause';
    setHour(h);
    timer = setInterval(() => { h += 1; if (h > +range.max) { stop(); return; } setHour(h); }, reduce ? 1200 : 700);
  };
  $('aar-again').onclick = () => { stop(); ctrl?.abort(); onAgain(); };
  $('aar-new').onclick = () => { stop(); ctrl?.abort(); onNew(); };
  return {
    show(game) {
      g = game;
      const [s, t, sub] = outcome(g);
      $('aar').hidden = false;
      $('aar-status').dataset.s = s; $('aar-t').textContent = t; $('aar-sub').textContent = sub;
      range.max = g.snaps.length - 1;
      $('aar-note').textContent = 'Dashed: your staff\'s estimate from reports received by that hour. Solid: Red\'s true strength on that road. Move the slider to see the map at any hour, and switch the map between what you believed and what was true.';
      scorecard(g);
      setHour(g.snaps.length - 1);
      ctrl?.abort();
      ctrl = new AbortController();
      $('aar-fog').innerHTML = '<p class="fine num" id="fog-prog">Running replays…</p>';
      $('fog-sum').textContent = '';
      runAll(g, (done, total) => { const p = $('fog-prog'); if (p) p.textContent = `Running replays… ${done.toLocaleString('en-US')} of ${total.toLocaleString('en-US')}`; }, ctrl.signal)
        .then(rows => { if (rows) fogView(rows); });
    },
    hide() { stop(); ctrl?.abort(); $('aar').hidden = true; },
    REPLAYS,
  };
}
