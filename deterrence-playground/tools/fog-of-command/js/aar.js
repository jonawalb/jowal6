// After-action review: the outcome, key moments, a slider over the game's hours (the map shows what
// you saw or what was true), believed-versus-true charts by road, an artillery scorecard, and the
// replays that price your deception and your plan.
import { el } from '../../../shared/js/mapkit.js';
import { COLS, NORTH, FORWARD, MAIN, REAR } from '../data/map.js';
import { beliefAt } from './vision.js';
import { runAll, REPLAYS } from './compare.js';
import { hhmm, DEF, foeOf, status } from './panel.js';
import { moments, planLine } from './story.js';

const $ = id => document.getElementById(id);
const pct = x => `${Math.round(x * 100)}%`;

/** True enemy strength per road at hour h, from the snapshot. */
function trueCols(g, me, h) {
  const s = g.snaps[h], foe = foeOf(me);
  return [0, 1, 2, 3].map(c => s.units.filter(u => u.side === foe && !u.broken && DEF[u.id].type !== 'decoy'
    && [NORTH[c], FORWARD[c], MAIN[c], REAR[c]].includes(u.node || (u.seg && u.seg.from))).reduce((a, u) => a + u.str, 0));
}

function chart(g, me, hour) {
  const svg = $('aar-chart');
  svg.replaceChildren();
  const T = g.snaps.length - 1;
  const Wd = Math.max(300, Math.round(svg.getBoundingClientRect().width) || 640);
  const narrow = Wd < 560;
  const per = narrow ? 2 : 4, rows = 4 / per, ph = 110;
  const Hh = rows * (ph + 46) + 6;
  svg.setAttribute('viewBox', `0 0 ${Wd} ${Hh}`);
  const bel = g.snaps.map((_, h) => beliefAt(g, me, h).col);
  const tru = g.snaps.map((_, h) => trueCols(g, me, h));
  const ymax = Math.max(30, ...bel.flat(), ...tru.flat());
  const cw = (Wd - 40) / per;
  const main = me === 'blue' && g.plan ? g.plan.main : null;
  for (let c = 0; c < 4; c++) {
    const x0 = 34 + (c % per) * cw, pw = cw - 18, y1 = 24 + Math.floor(c / per) * (ph + 46), y0 = y1 + ph;
    const sx = h => x0 + h / Math.max(1, T) * pw, sy = v => y0 - v / ymax * (y0 - y1);
    const ax = el('g', { class: 'tsm-axis' }, svg);
    for (const v of [0, Math.round(ymax / 2)]) {
      el('line', { x1: x0, x2: x0 + pw, y1: sy(v), y2: sy(v), class: 'fc-grid' }, ax);
      if (c % per === 0) el('text', { x: x0 - 5, y: sy(v) + 4, 'text-anchor': 'end' }, ax, `${v}`);
    }
    for (const h of [0, 8, 16].filter(x => x <= T)) el('text', { x: sx(h), y: y0 + 14, 'text-anchor': h === 0 ? 'start' : h === T ? 'end' : 'middle' }, ax, hhmm(h));
    el('text', { x: x0, y: y1 - 7, class: `fc-ctitle${c === main ? ' main' : ''}` }, svg, `${COLS[c]}${c === main ? ' (main effort)' : ''}`);
    const line = arr => arr.map((v, h) => `${h ? 'L' : 'M'}${sx(h).toFixed(1)} ${sy(v[c]).toFixed(1)}`).join('');
    el('path', { d: line(tru), class: 'fc-l true' }, svg);
    el('path', { d: line(bel), class: 'fc-l bel' }, svg);
    el('line', { x1: sx(hour), x2: sx(hour), y1, y2: y0, class: 'fc-now' }, svg);
  }
}

function artillery(g, me) {
  const mine = g.fires.filter(f => f.side === me), theirs = g.fires.filter(f => f.side === foeOf(me));
  const right = mine.filter(f => f.right).length, spotted = mine.filter(f => f.spotter).length;
  const ff = mine.reduce((s, f) => s + f.friendly.length, 0);
  const dmg = mine.reduce((s, f) => s + f.total, 0);
  const took = theirs.reduce((s, f) => s + f.hits.reduce((a, x) => a + x.loss, 0), 0);
  $('aar-arty').innerHTML = [
    ['Your fire missions', mine.length],
    ['Watched by your recon', `${spotted} of ${mine.length}`],
    ['Damage you did (true)', dmg.toFixed(1)],
    ['Damage reports that were right', `${right} of ${mine.length}`],
    ['Your recon hit by your own fire', ff],
    ['Damage the enemy artillery did to you', took.toFixed(1)],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

function fogView(rows, me) {
  $('aar-fog').innerHTML = rows.map(r => `<div class="fc-fogrow${r.key === 'you' ? ' you' : ''}"><div class="fc-fogl"><b>${r.label}</b><small>${r.note}</small></div>
    <div class="fc-fogbar" role="img" aria-label="${r.label}: won ${pct(r.p)} of ${r.n} replays"><i style="width:${(r.p * 100).toFixed(1)}%"></i></div>
    <div class="fc-fogn num"><b>${pct(r.p)}</b><small>won</small></div></div>`).join('');
  const by = Object.fromEntries(rows.map(r => [r.key, r]));
  const d = Math.round((by.you.p - by.seer.p) * 100);
  $('fog-sum').innerHTML = `<b>What hiding, feints and bait were worth to you:</b> ${d >= 0 ? '+' : '−'}${Math.abs(d)} points `
    + `(your orders won ${pct(by.you.p)} of replays against the commander you played, ${pct(by.seer.p)} against one who sees everything). `
    + `The scripted ${me === 'blue' ? 'defender' : 'attacker'} won ${pct(by.doc.p)} here, ${pct(by.docT.p)} with perfect information. Your own game was one roll of these dice.`;
}

export function createAAR({ onHour, onAgain, onNew }) {
  let g = null, me = 'blue', timer = null, ctrl = null;
  const range = $('aar-range');
  new ResizeObserver(() => { if (g && !$('aar').hidden) chart(g, me, +range.value); }).observe($('aar-chart'));
  const stop = () => { if (timer) { clearInterval(timer); timer = null; $('aar-play').textContent = 'Replay'; } };
  const setHour = h => { range.value = h; $('aar-h').textContent = hhmm(h); chart(g, me, h); onHour(h); };
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
    show(game, side) {
      g = game; me = side;
      const st = status(g, me, beliefAt(g, me, g.t));
      $('aar').hidden = false;
      $('aar-status').dataset.s = st.s; $('aar-t').textContent = st.t;
      $('aar-sub').textContent = `${planLine(g, me)} You lost ${(me === 'blue' ? g.over.lossB : g.over.lossR).toFixed(0)} of ${me === 'blue' ? g.over.totB : g.over.totR} strength points; the enemy lost ${(me === 'blue' ? g.over.lossR : g.over.lossB).toFixed(0)} of ${me === 'blue' ? g.over.totR : g.over.totB}.`;
      const ms = moments(g, me);
      $('aar-moments').innerHTML = ms.length ? ms.map(m => `<li class="${m.tone}"><span class="num">${hhmm(m.t)}</span> ${m.text}</li>`).join('') : '<li class="muted">A quiet day: no decisive moments.</li>';
      range.max = g.snaps.length - 1;
      artillery(g, me);
      setHour(g.snaps.length - 1);
      ctrl?.abort();
      ctrl = new AbortController();
      $('aar-fog').innerHTML = '<p class="fine num" id="fog-prog">Running replays…</p>';
      $('fog-sum').textContent = '';
      runAll(g, me, (done, total) => { const p = $('fog-prog'); if (p) p.textContent = `Running replays… ${done.toLocaleString('en-US')} of ${total.toLocaleString('en-US')}`; }, ctrl.signal)
        .then(rows => { if (rows) fogView(rows, me); });
    },
    hide() { stop(); ctrl?.abort(); $('aar').hidden = true; },
    REPLAYS,
  };
}
