// Play tab: walk the game tree one move at a time. The user plays A, B, both or neither; the computer plays
// the logical (backward-induction) move for any side the user does not control. Chance moves are rolled.
import { netShare } from '../data/engine.js';
import { f2, pct, esc } from './util.js';

const ROLES = [['A', 'You play A'], ['B', 'You play B'], ['both', 'You play both'], ['watch', 'Watch both']];

export function mountPlay(el, ctx) {
  const st = { role: 'A', hints: true, node: null, log: [], rolled: null };
  el.innerHTML = `<section class="ci-sec ci-play">
    <div class="ci-play-bar">
      <div class="seg" role="group" aria-label="Who you play" id="ci-role">${ROLES.map(([k, l]) => `<button type="button" data-role="${k}">${l}</button>`).join('')}</div>
      <label class="ci-tog"><input type="checkbox" id="ci-hints" checked> Show the logical responses</label>
      <button type="button" class="btn ghost" id="ci-restart">Restart</button>
    </div>
    <ol class="ci-log" id="ci-log" aria-label="Moves so far"></ol>
    <div class="ci-card" id="ci-card" aria-live="polite"></div>
  </section>`;
  const $ = s => el.querySelector(s);

  const mine = who => st.role === 'both' || st.role === who;
  const valueTxt = n => `<span class="pa">A ${f2(n.v[0])}</span> · <span class="pb">B ${f2(n.v[1])}</span>`;

  function start() { st.node = ctx.root; st.log = []; st.rolled = null; draw(); }

  function record(who, situation, choice, note) { st.log.push({ who, situation, choice, note }); }

  function why(n) {
    const i = n.kind === 'A' ? 0 : 1, best = n.edges[n.best];
    const others = n.edges.filter((_, k) => k !== n.best);
    if (!others.length) return '';
    const alt = others.reduce((a, b) => (b.node.v[i] > a.node.v[i] ? b : a));
    const tie = Math.abs(alt.node.v[i] - best.node.v[i]) < 1e-9;
    return `${best.label} is worth <b>${f2(best.node.v[i])}</b> to ${n.kind}; the next best, ${alt.label}, is worth ${f2(alt.node.v[i])}.` +
      (tie ? ' They tie, and ties go to the less escalatory option.' : '');
  }

  function decide(n, k, byUser) {
    const e = n.edges[k];
    const logical = k === n.best;
    record(n.kind, n.label, e.label, byUser ? (logical ? 'the logical move' : `not the logical move (that was ${n.edges[n.best].label})`) : 'logical move');
    st.node = e.node; st.rolled = null; draw();
  }

  function roll(n) {
    let r = Math.random(), k = 0;
    for (; k < n.edges.length - 1; k++) { r -= n.edges[k].p; if (r < 0) break; }
    st.rolled = k;
    record('C', n.label, n.edges[k].label, `chance ${pct(n.edges[k].p)}`);
    draw();
  }

  function card() {
    const n = st.node, P = ctx.P;
    if (n.kind === 'leaf') {
      const eq = ctx.root;
      return `<p class="eyebrow">Outcome</p><h3>${esc(n.label)}</h3>
        <table class="ci-out"><thead><tr><th></th><th>Share of the pie</th><th>Losses</th><th>Payoff</th></tr></thead><tbody>
          <tr><th class="pa">A</th><td>${pct(n.s)}</td><td>${f2(n.la)}</td><td>${f2(n.v[0])}</td></tr>
          <tr><th class="pb">B</th><td>${pct(1 - n.s)}</td><td>${f2(n.lb)}</td><td>${f2(n.v[1])}</td></tr></tbody></table>
        <p>A's net share: <b>${f2(netShare(P, n))}</b> (share minus losses divided by stakes ${f2(P.V_A)}).</p>
        <p class="fine">If both sides had played logically from the start, A's <em>expected</em> payoff would be ${f2(eq.v[0])} and B's ${f2(eq.v[1])}. Chance can make a single game turn out better or worse than that.</p>
        <p><button type="button" class="btn" id="ci-again">Play again</button></p>`;
    }
    if (n.kind === 'C') {
      const done = st.rolled !== null;
      return `<p class="eyebrow">Chance</p><h3>${esc(n.label)}</h3>
        <ul class="ci-opts">${n.edges.map((e, k) => `<li class="${done && k === st.rolled ? 'hit' : done ? 'miss' : ''}">
          <span class="o-l">${esc(e.label)}</span><span class="o-p">${pct(e.p)}</span>
          ${st.hints ? `<span class="o-v">worth ${valueTxt(e.node)}</span>` : ''}</li>`).join('')}</ul>
        ${done ? `<p><button type="button" class="btn" id="ci-next">Continue</button></p>` : `<p><button type="button" class="btn" id="ci-roll">Roll the dice</button></p>`}`;
    }
    const who = n.kind, user = mine(who);
    const head = `<p class="eyebrow ${who === 'A' ? 'pa' : 'pb'}">${who === 'A' ? 'Player A, the initiator' : 'Player B, the responder'} ${user ? '(you)' : '(computer)'}</p><h3>${esc(n.label)}</h3>`;
    const opts = `<ul class="ci-opts ${user ? 'pick' : ''}">${n.edges.map((e, k) => `<li class="${st.hints && k === n.best ? 'best' : ''}">
        ${user ? `<button type="button" data-k="${k}">` : '<span class="o-wrap">'}
          <span class="o-l">${esc(e.label)}${e.note ? `<small>${esc(e.note)}</small>` : ''}</span>
          ${st.hints ? `<span class="o-v">${valueTxt(e.node)}</span>${k === n.best ? '<span class="o-b">Logical choice</span>' : ''}` : ''}
        ${user ? '</button>' : '</span>'}</li>`).join('')}</ul>`;
    const expl = st.hints ? `<p class="ci-why">${why(n)} Values are what each side expects from that option if everyone plays logically from there on.</p>` : '';
    const cpu = user ? '' : `<p><button type="button" class="btn" id="ci-cpu">${who} plays ${esc(n.edges[n.best].label)}</button></p>`;
    return head + opts + expl + cpu;
  }

  function draw() {
    el.querySelectorAll('#ci-role button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.role === st.role)));
    $('#ci-log').innerHTML = st.log.map(l => `<li><b class="${l.who === 'A' ? 'pa' : l.who === 'B' ? 'pb' : ''}">${l.who === 'C' ? 'Chance' : l.who}</b>: ${esc(l.choice)} <span class="fine">(${esc(l.note)})</span></li>`).join('') ||
      '<li class="fine">No moves yet. A opens.</li>';
    $('#ci-card').innerHTML = card();
    const n = st.node;
    $('#ci-card').querySelectorAll('button[data-k]').forEach(b => b.addEventListener('click', () => decide(n, +b.dataset.k, true)));
    $('#ci-cpu')?.addEventListener('click', () => decide(n, n.best, false));
    $('#ci-roll')?.addEventListener('click', () => roll(n));
    $('#ci-next')?.addEventListener('click', () => { st.node = n.edges[st.rolled].node; st.rolled = null; draw(); });
    $('#ci-again')?.addEventListener('click', start);
  }

  el.querySelectorAll('#ci-role button').forEach(b => b.addEventListener('click', () => { st.role = b.dataset.role; start(); }));
  $('#ci-hints').addEventListener('change', e => { st.hints = e.target.checked; draw(); });
  $('#ci-restart').addEventListener('click', start);
  start();
  return { reset: start };
}
