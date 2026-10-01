// Magazine Depth: the yearly budget screen, the weekly war screen and the debrief.
import { P, IDS, BY } from '../data/params.js';
import { newGame, applyYear, emptyDecision, fit, maxBuy, floorBuy, stockNow, canDo, totalCost, budget } from './engine.js';
import { warWeek, daysLeft, weeklyOutput, effStock, demandAt } from './war.js';
import { STRATEGIES } from './ai.js';
import { score, benchmark, percentile, counterfactuals, encode, decode } from './score.js';
import { linesHTML, compsHTML, budgetHTML, resultHTML, chartTimeline, chartWar, legendHTML, qty, money, COL } from './view.js';
import { pulse, flash, countUp, reduced } from '../../../shared/js/motion.js';

const $ = id => document.getElementById(id);
const newSeed = () => 1 + Math.floor(Math.random() * 999998);
const show = (...ids) => ['start', 'peace', 'warstart', 'war', 'end'].forEach(id => { $(id).hidden = !ids.includes(id); });

let g = null;   // { s, d, fire, initial, lastLog }

function begin(seed) {
  const s = newGame({ seed });
  const d = emptyDecision();
  for (const id of IDS) d.buy[id] = maxBuy(s, id);
  g = { s, d: fit(s, d), fire: {}, initial: stockNow(s, 0), lastLog: [] };
}
const save = () => history.replaceState(null, '', '#g=' + encode(g.s));
['legend1', 'legend2', 'legend3'].forEach(id => { $(id).innerHTML = legendHTML(); });

/* ---------- Peace ---------- */
function paintPeace(focusKey) {
  const s = g.s, t = s.year, w = s.warn[t];
  $('year-t').textContent = String(P.startYear + t);
  $('yearof').textContent = `year ${t + 1} of ${P.years}`;
  $('warn').innerHTML = `<span class="md-wl l${w.level}">Warning: ${P.warnLabel[w.level]}</span> ${w.text}`;
  $('lines').innerHTML = linesHTML(s, g.d);
  paintBudget();
  chartTimeline($('timeline'), s, g.initial);
  if (focusKey) document.querySelector(focusKey)?.focus();
}
function paintBudget() {
  $('budget').innerHTML = budgetHTML(g.s, g.d);
  $('comps').innerHTML = compsHTML(g.s, g.d);
  const over = totalCost(g.s, g.d) > budget(g.s) + 1e-6;
  $('end-year').textContent = over ? 'End year (orders trimmed)' : 'End year';
}

$('lines').addEventListener('input', e => {
  const id = e.target.dataset.buy; if (!id) return;
  g.d.buy[id] = +e.target.value;
  $('out-' + id).textContent = qty(id, g.d.buy[id]);
  e.target.setAttribute('aria-valuetext', `${qty(id, g.d.buy[id])} of ${qty(id, maxBuy(g.s, id))}`);
  paintBudget();
});
function toggle(e) {
  const b = e.target.closest('[data-opt]'); if (!b || b.disabled) return;
  const kind = b.dataset.opt, id = b.dataset.id;
  if (kind === 'train') g.d.train = !g.d.train;
  else if (g.d[kind].includes(id)) g.d[kind] = g.d[kind].filter(x => x !== id);
  else if (canDo(g.s, kind, id)) g.d[kind] = [...g.d[kind], id];
  if (kind === 'multi') for (const x of IDS) g.d.buy[x] = Math.max(g.d.buy[x], g.d.multi.includes(x) ? Math.floor(P.multi.floor * maxBuy(g.s, x)) : 0);
  const key = `[data-opt="${kind}"]${id ? `[data-id="${id}"]` : ''}`;
  if (b.closest('#lines')) paintPeace(key); else { paintBudget(); document.querySelector(key)?.focus(); }
}
$('lines').addEventListener('click', toggle);
$('comps').addEventListener('click', toggle);
$('fill').addEventListener('click', () => { for (const id of IDS) g.d.buy[id] = maxBuy(g.s, id); paintPeace(); });
$('clear').addEventListener('click', () => { for (const id of IDS) g.d.buy[id] = floorBuy(g.s, id); paintPeace(); });
$('advise').addEventListener('click', () => { g.d = STRATEGIES.balanced(g.s); paintPeace(); pulse($('lines')); });

$('end-year').addEventListener('click', () => {
  if (!g || g.s.phase !== 'peace') return;
  const { state, log } = applyYear(g.s, g.d);
  g.s = state; g.lastLog = log; save();
  afterYear();
});
function afterYear(quiet) {
  const s = g.s, h = s.history[s.history.length - 1];
  if (s.phase === 'war') return startWar(quiet);
  if (s.phase === 'over') return finish();
  if (h) g.d = carry(s, h.d);
  $('result').hidden = !h; $('result').innerHTML = resultHTML(h, g.lastLog);
  paintPeace();
  if (!quiet) { flash($('result')); $('result').focus(); }
}
/** Next year's draft: the same orders (clamped), no new projects. */
function carry(s, d) {
  const n = emptyDecision();
  for (const id of IDS) n.buy[id] = Math.min(maxBuy(s, id), Math.max(floorBuy(s, id), d.buy[id] || 0));
  return fit(s, n);
}

/* ---------- War ---------- */
function startWar(quiet) {
  const s = g.s, y = P.startYear + s.warYear;
  $('ws-t').textContent = `War, at the end of ${y}`;
  const eff = stockNow(s), thin = IDS.reduce((a, b) => (eff[a] / BY[a].demand < eff[b] / BY[b].demand ? a : b));
  $('ws-x').textContent = `The rival attacks. From today every line surges as far as its workers and suppliers allow, and nothing new you start will arrive in time. Your thinnest magazine is ${BY[thin].label.toLowerCase()}: about ${(eff[thin] / BY[thin].demand).toFixed(1)} weeks at full fire.`;
  if (quiet) return paintWar();
  show('warstart'); $('warstart').focus();
}
$('ws-go').addEventListener('click', () => { show('war'); paintWar(); $('next-week').focus(); });

function paintWar() {
  const s = g.s, war = s.war, w = war.week;
  $('day-t').textContent = `Day ${w * 7 + 1}`;
  $('weekof').textContent = `week ${Math.min(w + 1, P.weeks)} of ${P.weeks}`;
  const hv = Math.max(0, war.hold);
  $('hold-b').style.width = `${hv}%`; $('hold-b').className = hv < 50 ? 'bad' : hv < 75 ? 'warn' : '';
  $('hold-m').setAttribute('aria-valuenow', Math.round(hv)); $('hold-m').setAttribute('aria-valuetext', `${Math.round(hv)} of 100; critical below ${P.hold.critical}`);
  countUp($('hold-v'), Math.round(hv));
  const eff = effStock(war.stock, war.effL), dl = daysLeft(s, g.fire), { out } = weeklyOutput(s);
  $('wtable').innerHTML = `<thead><tr><th>Class</th><th class="num">Stock</th><th class="num">Need/wk</th><th class="num">Make/wk</th><th class="num">Days left</th><th>Fire</th></tr></thead><tbody>${IDS.map(id => {
    const f = g.fire[id] || 0, dry = war.dry[id] !== null;
    return `<tr style="--c:${COL[id]}" class="${dry ? 'dry' : ''}"><th scope="row"><b>${BY[id].short}</b></th>
      <td class="num">${qty(id, eff[id])}</td><td class="num">${qty(id, demandAt(s, id, w))}</td><td class="num">${qty(id, out[id].own + out[id].partner * s.rel)}</td>
      <td class="num ${dl[id] < 21 ? 'bad' : ''}">${dl[id] === Infinity ? '∞' : dl[id]}<span class="md-m"> days left</span></td>
      <td><div class="md-seg" role="radiogroup" aria-label="Fire for ${BY[id].label}">${P.fireLabel.map((l, i) => `<button type="button" role="radio" aria-checked="${f === i}" tabindex="${f === i ? 0 : -1}" data-fire="${id}" data-lv="${i}">${l}</button>`).join('')}</div></td></tr>`;
  }).join('')}</tbody>`;
  chartWar($('warchart'), war);
  $('wlog').innerHTML = `<h3>Dispatches</h3>${war.log.length ? `<ul>${war.log.slice(-8).reverse().map(l => `<li class="${l.kind}">${l.kind === 'dry' ? `Day ${war.dry[l.id]}: ` : ''}${l.text}</li>`).join('')}</ul>` : '<p class="fine">The opening weeks burn the most. Nothing has run out yet.</p>'}`;
}
$('wtable').addEventListener('click', e => {
  const b = e.target.closest('[data-fire]'); if (!b) return;
  g.fire[b.dataset.fire] = +b.dataset.lv; paintWar();
  document.querySelector(`[data-fire="${b.dataset.fire}"][data-lv="${b.dataset.lv}"]`)?.focus();
});
$('wtable').addEventListener('keydown', e => {
  const b = e.target.closest('[data-fire]'); if (!b || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const lv = (+b.dataset.lv + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : 2)) % 3;
  g.fire[b.dataset.fire] = lv; paintWar();
  document.querySelector(`[data-fire="${b.dataset.fire}"][data-lv="${lv}"]`)?.focus();
});
function weeks(n) {
  for (let i = 0; i < n && !g.s.war.done; i++) g.s = warWeek(g.s, g.fire).state;
  save();
  if (g.s.war.done) return finish();
  paintWar(); flash($('wlog'));
}
$('next-week').addEventListener('click', () => weeks(1));
$('run4').addEventListener('click', () => weeks(4));
$('run-end').addEventListener('click', () => weeks(P.weeks));

/* ---------- End ---------- */
function finish() {
  const s = g.s, sc = score(s), war = sc.war;
  save(); show('end');
  const lost = !!war.critical;
  $('end-k').textContent = s.warYear === null ? `${P.startYear}–${P.startYear + P.years - 1} · no war` : `War from the end of ${P.startYear + s.warYear}`;
  $('end-t').textContent = s.warYear === null ? 'No war came' : lost ? `Critical shortfall on day ${war.critical}` : `The line held for ${P.weeks * 7} days`;
  $('end-x').textContent = s.warYear === null
    ? `Ten years passed in peace. To score your industry, the computer fought a ${P.weeks}-week stress test with what you built: it ${war.critical ? `reached critical shortfall on day ${war.critical}` : 'held throughout'}.`
    : lost ? 'The front could no longer be supplied. Look below for when each magazine emptied and which early step would have bought the most time.' : 'Your stocks and lines carried the war to a pause.';
  $('total').textContent = sc.total; pulse($('total'));
  $('parts').innerHTML = sc.parts.map(p => `<tr><td>${p.label}</td><td class="num">${p.value}${p.id === 'days' ? ` of ${p.of} days` : ' / 100'}</td><td class="num">${p.pts.toFixed(1)} pts</td></tr>`).join('')
    + `<tr><td>Spent over the peace</td><td class="num">${money(s.spent)}</td><td class="muted">list value ${money(s.value)}</td></tr>`;
  chartTimeline($('endchart'), sc.state, g.initial);
  $('dry').innerHTML = IDS.map(id => `<li style="--c:${COL[id]}"><b>${BY[id].short}</b>: ${war.dry[id] !== null ? `ran out on day ${war.dry[id]}` : 'never ran out'}</li>`).join('');
  $('end').focus();
  setTimeout(() => { runBench(sc.total); runCf(s); }, 30);
}
function runBench(total) {
  const b = benchmark(g.s.seed, P.benchRuns);
  $('same').textContent = b.same;
  $('same-x').textContent = `the computer in your seat, same world${b.same > total ? ' (it beat you)' : b.same < total ? ' (you beat it)' : ''}`;
  $('pct').textContent = `${percentile(total, b.runs)}%`;
  $('pct-x').textContent = `of ${b.runs.length} computer games in other worlds scored below you`;
}
function runCf(s) {
  const { base, list } = counterfactuals(s);
  const top = list.filter(x => x.gain > 0).slice(0, 4);
  const dryTxt = c => { const ch = IDS.filter(id => c.dry[id] !== base.war.dry[id]); return ch.length ? ' ' + ch.map(id => `${BY[id].short}: ${base.war.dry[id] ?? 'never'} → ${c.dry[id] ?? 'never ran out'}`).join('; ') + '.' : ''; };
  $('cf').innerHTML = top.length ? top.map(c => `<li><b>${c.label}</b>: +${c.gain} days (${c.days} in all, score ${c.total}).${dryTxt(c)}</li>`).join('')
    : `<li>No single extra step in 2027 would have bought more days. ${list[0] ? `The closest was ${list[0].label.toLowerCase()} (${list[0].gain >= 0 ? '+' : ''}${list[0].gain} days).` : ''}</li>`;
}

$('begin').addEventListener('click', () => { begin(newSeed()); save(); show('peace'); afterYear(true); $('end-year').focus(); });
$('again').addEventListener('click', restart);
$('new-game').addEventListener('click', restart);
function restart() { g = null; history.replaceState(null, '', location.pathname + location.search); show('start'); $('start').scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); $('begin').focus(); }
$('copy-link').addEventListener('click', async e => {
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; } catch { e.target.textContent = 'Copy the address bar'; }
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1600);
});

/* ---------- Load: replay a shared link, or start fresh ---------- */
function load() {
  const m = location.hash.match(/#g=([^&]+)/);
  const d = m && decode(decodeURIComponent(m[1]));
  if (!d) { show('start'); return; }
  begin(d.seed);
  for (const y of d.years) { if (g.s.phase !== 'peace') break; const r = applyYear(g.s, y); g.s = r.state; g.lastLog = r.log; }
  if (g.s.phase === 'war') for (const f of d.fires) { if (g.s.war.done) break; g.s = warWeek(g.s, Object.fromEntries(IDS.map((id, i) => [id, +f[i]]))).state; }
  if (g.s.phase === 'over') return finish();
  if (g.s.phase === 'war') { show('war'); return paintWar(); }
  show('peace'); afterYear(true);
}
load();
