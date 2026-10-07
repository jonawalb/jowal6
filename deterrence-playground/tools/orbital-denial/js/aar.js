// After-action review: same-seed counterfactuals, charts, the month slider and 1,000 replays.
import { TURNS, DEBRIS0 } from '../data/params.js';
import { playGame, newGame } from './model.js';
import { STRATEGIES, toReversible, toHoldFire, planPolicy, legacy } from './plans.js';
import { runSeed } from './rng.js';
import { lineChart, niceMax } from './charts.js';
import { verdicts, pct, fmt } from './views.js';

const $ = id => document.getElementById(id);
const REPLAYS = 1000;
let job = 0;

/** Finish a short plan (a game that ended early) with the reversible-only strategy. */
const extend = plan => g => (g.turn < plan.length ? plan[g.turn].map(x => ({ ...x })) : STRATEGIES.reversible.f(g));

export function showAAR(g, plan, P, { onView, setting = 'unknown' }) {
  const posture = g.posture;
  const alt = playGame(g.seed, posture, extend(toReversible(plan)), P);
  const hold = playGame(g.seed, posture, extend(toHoldFire(plan)), P);
  let years = 25;
  const draw = () => {
    const L = legacy(g, P, years), La = legacy(alt, P, years);
    const v = verdicts(g, alt, legacy(g, P, 25), legacy(alt, P, 25));
    $('aar-status').dataset.s = v.status[0]; $('aar-t').textContent = v.status[1]; $('aar-sub').textContent = v.sub;
    $('verdicts').innerHTML = v.cards.map(c => `<div><p>${c[0]}</p><b>${c[1]}</b><p>${c[2]}</p></div>`).join('');
    debrisChart(g, alt, L, La, years);
    capChart(g, alt);
    escChart(g, alt, hold);
  };
  document.querySelectorAll('#hz button').forEach(b => {
    b.setAttribute('aria-pressed', String(+b.dataset.y === years));
    b.onclick = () => { years = +b.dataset.y; document.querySelectorAll('#hz button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); };
  });
  $('aar').hidden = false;
  draw();
  // Month slider: the orbit view as it stood after month k.
  const rp = $('rp'), n = g.hist.length;
  rp.max = n; rp.value = n;
  const view = k => {
    $('rp-o').textContent = k;
    if (!k) { onView(newGame(g.seed, posture)); return; }
    const h = g.hist[k - 1];
    onView({ debris: h.debris, sides: { B: { alive: h.alive.B, pending: h.pend.B, cap: h.cap.B }, R: { alive: h.alive.R, pending: h.pend.R, cap: h.cap.R } } });
  };
  rp.oninput = () => view(+rp.value);
  view(n);
  runReplays(plan, P, g.seed, g.posture, setting);
}

function debrisChart(g, alt, L, La, years) {
  const T = g.hist.length, Ta = alt.hist.length, cut = 0.28;
  const war = (hist) => [[0, DEBRIS0], ...hist.map(h => [h.t, h.debris])];
  const pts = (hist, Lg, s, Tn) => [
    ...war(hist).map(([t, d]) => [cut * t / TURNS, d[s]]),
    ...Lg.series.map(r => [cut * Tn / TURNS + (1 - cut * Tn / TURNS) * r.y / years, r[s]])];
  const series = [
    { pts: pts(alt.hist, La, 'low', Ta), cls: 'low', dash: true }, { pts: pts(alt.hist, La, 'high', Ta), cls: 'high', dash: true },
    { pts: pts(g.hist, L, 'low', T), cls: 'low' }, { pts: pts(g.hist, L, 'high', T), cls: 'high' }];
  const ymax = niceMax(Math.max(...series.flatMap(s => s.pts.map(p => p[1]))) * 1.05);
  const x0 = cut * T / TURNS, yx = y => x0 + (1 - x0) * y / years;
  const xticks = [[0, 'M0'], [x0, `M${T}`], ...[0.2, 0.4, 0.6, 0.8, 1].map(f => [yx(years * f), `+${Math.round(years * f)}y`])];
  lineChart($('ch-deb'), { series, ymax, yfmt: v => fmt(v), xticks, marks: [[x0, 'war ends']], ylabel: 'Trackable fragments',
    out: $('ch-deb-o'),
    hover: x => {
      const near = (s) => s.pts.reduce((b, p) => (Math.abs(p[0] - x) < Math.abs(b[0] - x) ? p : b));
      const [a, b, c, d] = series.map(near);
      const when = x <= x0 ? `Month ${Math.round(x / cut * TURNS)}` : `${Math.round((x - x0) / (1 - x0) * years)} years after the war`;
      return `${when}: low LEO ${fmt(c[1])} (reversible ${fmt(a[1])}), high LEO ${fmt(d[1])} (reversible ${fmt(b[1])}).`;
    } });
}

function capChart(g, alt) {
  const m = h => h.map(r => [(r.t - 1) / (TURNS - 1), r.S]);
  const s = (hist, side) => m(hist).map(([x, S]) => [x, S[side] * 100]);
  lineChart($('ch-cap'), {
    series: [{ pts: s(alt.hist, 'B'), cls: 'you', dash: true }, { pts: s(alt.hist, 'R'), cls: 'red', dash: true },
      { pts: s(g.hist, 'B'), cls: 'you' }, { pts: s(g.hist, 'R'), cls: 'red' }],
    ymax: 100, yfmt: v => Math.round(v), ylabel: 'Space support (of 100)',
    xticks: [1, 4, 7, 10].map(t => [(t - 1) / (TURNS - 1), `M${t}`]), marks: [[3 / (TURNS - 1), 'war']],
    out: $('ch-cap-o'),
    hover: x => {
      const t = Math.round(x * (TURNS - 1)) + 1, a = g.hist[t - 1], b = alt.hist[t - 1];
      return `Month ${t}: you ${a ? Math.round(a.S.B * 100) : '–'} vs Red ${a ? Math.round(a.S.R * 100) : '–'}; reversible only: ${b ? Math.round(b.S.B * 100) : '–'} vs ${b ? Math.round(b.S.R * 100) : '–'}.`;
    } });
}

function escChart(g, alt, hold) {
  const s = hist => [[0, 0], ...hist.map(r => [r.t / TURNS, r.cumP * 100])];
  const top = Math.max(...[g, alt, hold].map(x => (1 - Math.exp(-x.cumH)) * 100));
  lineChart($('ch-esc'), {
    series: [{ pts: s(hold.hist), cls: 'alt2', dash: true }, { pts: s(alt.hist), cls: 'you', dash: true }, { pts: s(g.hist), cls: 'red' }],
    ymax: niceMax(Math.max(5, top * 1.1)), yfmt: v => `${Math.round(v)}%`, ylabel: 'Cumulative risk of nuclear escalation (notional)',
    xticks: [0, 2, 4, 6, 8, 10].map(t => [t / TURNS, `M${t}`]), out: $('ch-esc-o'),
    hover: x => {
      const t = Math.round(x * TURNS), at = h => (t ? (h.hist[Math.min(t, h.hist.length) - 1]?.cumP ?? 0) : 0);
      return `Month ${t}: your plan ${pct(at(g), 1)} (red line); reversible only ${pct(at(alt), 1)}; defenses only ${pct(at(hold), 1)}.`;
    } });
}

/** 1,000 replays of three plans on the same 1,000 seeds, run in slices so the page stays responsive. */
function runReplays(plan, P, seed, posture, setting) {
  const my = ++job, plans = [['Your plan', extend(plan)], ['Reversible', extend(toReversible(plan))], ['Defenses only', extend(toHoldFire(plan))]];
  const acc = plans.map(() => ({ blue: 0, draw: 0, red: 0, escalation: 0, cumP: 0, extra: 0, high: 0 }));
  let i = 0;
  $('mc').innerHTML = '<tbody><tr><td>Running 3,000 games…</td></tr></tbody>';
  const slice = () => {
    if (my !== job) return;
    const end = Math.min(REPLAYS, i + 100);
    for (; i < end; i++) {
      const sd = runSeed(seed, i);
      plans.forEach(([, pol], k) => {
        const g = playGame(sd, setting, pol, P), a = acc[k], L = legacy(g, P, 25);
        a[g.outcome]++; a.cumP += 1 - Math.exp(-g.cumH); a.extra += L.extra.B + L.extra.R + L.extra.O; a.high += g.debris.high;
      });
    }
    if (i < REPLAYS) { $('mc').innerHTML = `<tbody><tr><td>Running… ${i} of ${REPLAYS}</td></tr></tbody>`; setTimeout(slice, 0); return; }
    // Row labels carry a short form that replaces the long one on phones (CSS), so the table fits 390 px.
    const row = (lab, f, sh) => `<tr><th scope="row"><span class="lg">${lab}</span><span class="sh" aria-hidden="true">${sh}</span></th>${acc.map(a => `<td class="num">${f(a)}</td>`).join('')}</tr>`;
    $('mc').innerHTML = `<thead><tr><th scope="col"></th>${plans.map(p => `<th scope="col" class="r">${p[0]}</th>`).join('')}</tr></thead><tbody>
      ${row('You held the edge', a => pct(a.blue / REPLAYS), 'Your edge')}${row('Stalemate', a => pct(a.draw / REPLAYS), 'Stalemate')}
      ${row('Red held the edge', a => pct(a.red / REPLAYS), 'Red\'s edge')}${row('Nuclear threshold crossed', a => pct(a.escalation / REPLAYS), 'Threshold crossed')}
      ${row('Mean escalation risk', a => pct(a.cumP / REPLAYS), 'Mean risk')}${row('High LEO fragments at war\'s end', a => fmt(a.high / REPLAYS), 'High LEO fragments at end')}
      ${row('Extra satellites lost, 25 years', a => fmt(a.extra / REPLAYS), 'Extra losses, 25 y')}</tbody>`;
    $('mc-note').textContent = `Your ${plan.length} months of orders${plan.length < TURNS ? ' (finished with reversible-only moves)' : ''} replayed on 1,000 new sets of dice ${setting === 'unknown' ? `with Red's posture drawn each time (in this game it was ${posture})` : `against a ${setting} Red`}, next to the same orders with every destructive attack swapped for the reversible means against that target, and with attacks removed but defenses kept. Orders that become impossible in a replay are held.`;
  };
  setTimeout(slice, 30);
}
