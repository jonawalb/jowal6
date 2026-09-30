// End-of-game debrief: which arguments worked, which reasons were strong or weak and why, and how the board moved.
import { TRACKS, ACTORS, ACTOR_ORDER } from '../data/scenario.js';
import { score, rng } from './engine.js';
import { START, newGame, playerArgue, playerRoll, aiArgue, aiRoll, nextTurn } from './game.js';
import { MOVES } from '../data/moves.js';
import { esc, actorChip, deltaText } from './views.js';

const pct = (a, b) => (b ? `${a} of ${b}` : 'none');
const ok = r => r.band.k === 'decisive' || r.band.k === 'success';
const cache = {};

/** Benchmark: this actor's score over 200 seeded games where every choice is made at random. */
function benchmark(actor) {
  if (cache[actor]) return cache[actor];
  const out = [];
  for (let seed = 1; seed <= 200; seed++) {
    const g = newGame(actor, seed), r = rng(seed, 97, 97), M = MOVES[actor];
    while (!g.over) {
      const rs = M.reasons.map((_, i) => [i, r()]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(x => x[0]);
      playerArgue(g, Math.floor(r() * M.actions.length), rs);
      playerRoll(g);
      if (g.over) break;
      aiArgue(g, r() < 0.3 ? null : Math.floor(r() * M.counters.length));
      aiRoll(g);
      nextTurn(g);
    }
    out.push(score(actor, START, g.board));
  }
  out.sort((a, b) => a - b);
  return (cache[actor] = { med: out[100], q3: out[150], q1: out[50] });
}

export function renderDebrief(el, g) {
  const mine = g.turns.filter(r => r.player?.res).map(r => r.player);
  const theirs = g.turns.filter(r => r.ai?.res).map(r => r.ai);
  const strong2 = mine.filter(x => x.arg.reasons.filter(r => r.strong).length >= 2);
  const weakOnes = mine.flatMap(x => x.arg.reasons.filter(r => !r.strong));
  const offTopic = weakOnes.filter(r => r.why.includes('does not bear')).length;
  const strongReasons = mine.flatMap(x => x.arg.reasons.filter(r => r.strong).map(r => r.text));
  const topStrong = [...new Set(strongReasons)].map(t => [t, strongReasons.filter(x => x === t).length]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const hurt = mine.flatMap(x => x.arg.counters.filter(c => c.strong));
  const myCounters = theirs.filter(x => x.counterIdx != null);
  const myStrongCounters = myCounters.filter(x => x.arg.counters.some(c => c.byPlayer && c.strong));
  const moved = TRACKS.map(t => ({ t, d: g.board[t.k] - START[t.k] })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const s = score(g.actor, START, g.board);
  const bm = benchmark(g.actor);
  const verdict = s >= bm.q3 ? ['good', 'Better than most games'] : s >= bm.med ? ['good', 'Better than typical'] : s >= bm.q1 ? ['warn', 'Below typical'] : ['bad', 'Well below typical'];

  const lessons = [];
  if (strong2.length && strong2.length < mine.length) {
    lessons.push(`Arguments with two or more strong reasons succeeded ${pct(strong2.filter(x => ok(x.res)).length, strong2.length)}; the rest succeeded ${pct(mine.filter(x => !strong2.includes(x) && ok(x.res)).length, mine.length - strong2.length)}.`);
  } else if (mine.length) {
    lessons.push(`You won ${pct(mine.filter(x => ok(x.res)).length, mine.length)} arguments at an average of ${Math.round(100 * mine.reduce((a, x) => a + x.arg.p, 0) / mine.length)}% odds.`);
  }
  if (weakOnes.length) lessons.push(`${weakOnes.length} of your reasons were weak: ${offTopic} did not bear on the action you chose, and ${weakOnes.length - offTopic} were on point but the board did not back them up at the time. A reason is only as strong as the situation that supports it.`);
  if (hurt.length) {
    const by = ACTOR_ORDER.map(a => [a, hurt.filter(c => c.actor === a).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
    lessons.push(`Strong counter-arguments cost you ${hurt.length} point${hurt.length > 1 ? 's' : ''} of modifier, most from ${ACTORS[by[0][0]].name}. Choosing actions outside an opponent's strong ground avoids that.`);
  }
  if (theirs.length) lessons.push(`You countered ${pct(myCounters.length, theirs.length)} AI arguments; ${pct(myStrongCounters.length, myCounters.length)} of your counters were strong. The AI won ${pct(theirs.filter(x => ok(x.res)).length, theirs.length)} of its arguments.`);
  if (moved[0].d) lessons.push(`${moved[0].t.name} moved most, from ${START[moved[0].t.k]} to ${g.board[moved[0].t.k]}.`);

  const rows = ACTOR_ORDER.map(a => `<tr${a === g.actor ? ' class="me"' : ''}><td>${actorChip(a)}${a === g.actor ? ' (you)' : ''}</td>
    <td class="num">${score(a, START, g.board).toFixed(1)}</td><td>${esc(ACTORS[a].brief)}</td></tr>`).join('');

  el.innerHTML = `<p class="eyebrow">Debrief · fictional exercise</p>
    <h2>${g.halted ? 'The exercise stopped: escalation reached 10' : 'Six turns played'}</h2>
    <div class="mg-debrief-top">
      <div class="status" data-s="${verdict[0]}"><b>${verdict[1]}</b><span>Goal score for ${esc(ACTORS[g.actor].name)}: <b class="num">${s.toFixed(1)}</b>
        <span class="notional">notional</span>. Random play as ${esc(ACTORS[g.actor].name)} scores a median of <b class="num">${bm.med.toFixed(1)}</b> (middle half ${bm.q1.toFixed(1)} to ${bm.q3.toFixed(1)}) over 200 simulated games. Board change from the start: ${deltaText(Object.fromEntries(TRACKS.map(t => [t.k, g.board[t.k] - START[t.k]]).filter(x => x[1])))}.</span></div>
      <div><p class="eyebrow">What the arguments showed</p><ul class="mg-lessons">${lessons.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>
    </div>
    ${topStrong.length ? `<p class="eyebrow">Your reasons that carried weight</p><ul class="mg-lessons">${topStrong.map(([t, n]) => `<li>“${esc(t)}”${n > 1 ? ` (strong ${n} times)` : ''}</li>`).join('')}</ul>` : ''}
    <p class="eyebrow">How each actor fared on this board</p>
    <div class="tablewrap"><table><thead><tr><th>Actor</th><th>Score</th><th>Aim</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="fine">Scores weight the change in each track by the actor's notional goals (for example, Estonia gains from higher local sentiment and loses from higher escalation). They measure this one fictional game, not any real outcome.</p>
    <div class="mg-btns"><button type="button" class="btn solid" data-again>Play again</button>
      <button type="button" class="btn" data-print>Print the turn log</button><button type="button" class="btn" data-dl>Download log (.txt)</button></div>`;
}
