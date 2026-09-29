// The 9-player Cascade Game from Walberg, "A Coordination Theory of Moral Panic"
// (working paper, June 2026). Player k has intensity pair (x_k, y_k), from (2,10) at k=1 to (10,2) at k=9.
// Per-match payoff with each same-side partner: y_k on the Left, x_k on the Right (the deck's convention,
// which the paper verifies by reproducing all four deck rounds). EU_k = partners on k's side × per-match payoff.

export const XY = Array.from({ length: 9 }, (_, i) => [i + 2, 10 - i]);
export const DECK_START = [0, 0, 0, 0, 0, 1, 1, 1, 1]; // 0 = Left, 1 = Right: players 1-5 Left, 6-9 Right

export function eu(sides) {
  return sides.map((s, k) => {
    const partners = sides.filter((x, j) => j !== k && x === s).length;
    return partners * (s === 0 ? XY[k][1] : XY[k][0]);
  });
}
export function gain(sides, k) {
  const flip = sides.slice(); flip[k] = 1 - flip[k];
  return eu(flip)[k] - eu(sides)[k];
}

/** One round. 'all': every player who strictly gains switches at once (reproduces the deck's four rounds).
 *  'one': only the player with the largest gain switches, lowest index on ties (the paper's marginal rule). */
export function step(sides, rule) {
  const g = sides.map((_, k) => gain(sides, k));
  if (rule === 'one') {
    let best = -1, bg = 0;
    g.forEach((v, k) => { if (v > bg + 1e-9) { bg = v; best = k; } });
    if (best < 0) return null;
    const next = sides.slice(); next[best] = 1 - next[best];
    return { sides: next, movers: [best] };
  }
  const movers = g.map((v, k) => v > 1e-9 ? k : -1).filter(k => k >= 0);
  if (!movers.length) return null;
  return { sides: sides.map((s, k) => movers.includes(k) ? 1 - s : s), movers };
}

export function mountCascade9(root) {
  root.innerHTML = `
    <div class="fig-h"><p class="eyebrow">The Cascade Game, nine players</p>
      <div class="seg" role="group" aria-label="Switching rule">
        <button type="button" data-r="all" aria-pressed="true">All who gain switch</button><button type="button" data-r="one" aria-pressed="false">Largest gain first</button></div></div>
    <p class="fine">Each player earns a payoff from every partner on the same side. Low-numbered players prefer Left, high-numbered players prefer Right, and player 5 is indifferent. Click a player to move them, then step through the rounds.</p>
    <ol class="players" id="c9-p" aria-label="Players and their sides"></ol>
    <div class="row"><button type="button" class="btn" id="c9-step">Next round</button><button type="button" class="btn" id="c9-run">Run to the end</button><button type="button" class="btn" id="c9-reset">Paper’s starting split</button></div>
    <div class="tablewrap"><table class="eu"><thead id="c9-h"></thead><tbody id="c9-b"></tbody></table></div>
    <p class="fine" id="c9-note" aria-live="polite"></p>`;
  let rule = 'all', hist = [{ sides: DECK_START.slice(), movers: [] }];
  const cur = () => hist[hist.length - 1];
  root.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => {
    rule = b.dataset.r; root.querySelectorAll('[data-r]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    hist = [hist[0]]; render();
  }));
  root.querySelector('#c9-step').onclick = () => { const s = step(cur().sides, rule); if (s) hist.push(s); render(); };
  root.querySelector('#c9-run').onclick = () => { let s; while (hist.length < 30 && (s = step(cur().sides, rule))) hist.push(s); render(); };
  root.querySelector('#c9-reset').onclick = () => { hist = [{ sides: DECK_START.slice(), movers: [] }]; render(); };

  function render() {
    const c = cur(), e = eu(c.sides);
    root.querySelector('#c9-p').innerHTML = c.sides.map((s, k) => `<li><button type="button" data-k="${k}" class="pl ${s ? 'R' : 'L'}${c.movers.includes(k) ? ' mv' : ''}"
      aria-label="Player ${k + 1}, ${s ? 'Right' : 'Left'}, payoff ${e[k]}. Click to switch sides and restart from here.">
      <b>P${k + 1}</b><span>(${XY[k][0]},${XY[k][1]})</span><em>${s ? 'Right' : 'Left'}</em></button></li>`).join('');
    root.querySelectorAll('.pl').forEach(b => b.onclick = () => {
      const s = cur().sides.slice(); s[+b.dataset.k] = 1 - s[+b.dataset.k];
      hist = [{ sides: s, movers: [] }]; render();
    });
    root.querySelector('#c9-h').innerHTML = `<tr><th>Player</th>${hist.map((_, r) => `<th>Round ${r + 1}</th>`).join('')}</tr>`;
    const eus = hist.map(h => eu(h.sides));
    root.querySelector('#c9-b').innerHTML = XY.map((_, k) => `<tr><td>P${k + 1}</td>${hist.map((h, r) =>
      `<td class="num ${h.sides[k] ? 'R' : 'L'}${h.movers.includes(k) ? ' mv' : ''}">${eus[r][k]}</td>`).join('')}</tr>`).join('');
    const done = !step(c.sides, rule);
    const nL = c.sides.filter(s => s === 0).length;
    root.querySelector('#c9-note').textContent = done
      ? (nL === 9 || nL === 0 ? `Locked in: all nine players are on the ${nL ? 'Left' : 'Right'} after ${hist.length} rounds. Players who prefer the other side by intensity capitulate because isolation costs more than conviction.`
        : `No one gains by switching: ${nL} Left, ${9 - nL} Right.`)
      : `Round ${hist.length}: ${nL} Left, ${9 - nL} Right. Shaded cells in the table mark players who just switched.`;
  }
  render();
}
