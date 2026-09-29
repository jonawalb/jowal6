// "Retry from the allied side": the player takes one side's decisions; each choice moves the crisis to a rung and
// updates the notional outcome distribution (model.js). Picking an option that did not happen leaves the record:
// from there the crisis continues as a model-generated branch (branch.js), clearly labelled as not history.
import { RUNGS, groupOf } from '../data/ladder.js';
import { CF, KENNEDY } from '../data/counterfactuals.js';
import { BRANCH } from '../data/branch-options.js';
import { run, barHTML, legendHTML, pct, OUTCOMES, params } from './model.js';
import { playBranch, monteCarlo, drivers, policyFn } from './branch.js';
import { logHTML, movesHTML, mcHTML, BR_TAG } from './branch-view.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const histIdx = d => d.options.findIndex(o => o.historical);

/**
 * Rounds for a crisis given the choices so far (option index per historical decision), the branch moves after a
 * departure and the dice seed. `rounds` feed the ladder and path chart (two points per branch round: your move,
 * then the response); `mrounds` feed the outcome model (one per branch round).
 */
export function buildRounds(c, choices, moves = [], seed = 1) {
  const cf = CF[c.id], rounds = [];
  const hist = (i, lean = '', k = -1) => rounds.push({ rung: c.steps[i].rung, lean, date: c.steps[i].date, title: c.steps[i].title, dec: k });
  let pos = 0, departedAt = -1, pending = -1, br = null, dep = null;
  for (let k = 0; cf && k < cf.decisions.length; k++) {
    const d = cf.decisions[k];
    for (; pos < Math.min(d.at, c.steps.length); pos++) hist(pos);
    const ci = choices[k];
    if (ci === undefined) { pending = k; break; }
    const o = d.options[ci];
    if (o.historical) {
      if (d.at < c.steps.length) { hist(d.at, o.lean, k); pos = d.at + 1; }
      else rounds.push({ rung: o.rung, lean: o.lean, date: o.then.date, title: o.then.title, dec: k });
      continue;
    }
    departedAt = k;
    const start = rounds.length ? rounds[rounds.length - 1].rung : 1;
    dep = { k, label: o.label, lean: o.lean, date: d.date, start };
    br = playBranch(start, o.rung, t => moves[t - 2] || null, seed);
    break;
  }
  if (pending < 0 && departedAt < 0) for (; pos < c.steps.length; pos++) hist(pos);
  const mrounds = [...rounds];
  if (br) br.rounds.forEach(r => {
    const lean = r.t === 1 ? dep.lean : r.mv === 'd' ? 'S' : '';
    rounds.push({ rung: r.pr, date: r.t === 1 ? dep.date : 'model', title: 'Round ' + r.t + ': your move', dec: r.t === 1 ? dep.k : -1 });
    if (r.rr !== undefined && r.resp) rounds.push({ rung: r.rr, date: 'model', title: 'Round ' + r.t + ': response' });
    mrounds.push({ rung: r.rr ?? r.pr, lean, title: 'Round ' + r.t, dec: r.t === 1 ? dep.k : -1 });
  });
  const done = pending < 0 && (!br || !!br.end);
  return { rounds, mrounds, pending, departedAt, br, dep, done };
}

export const historicalChoices = c => CF[c.id].decisions.map(histIdx);
/** Pseudo-crisis objects for the ladder and the path chart. */
export const asCrisis = (rounds, short, name) => ({ short, name, steps: rounds.map(r => ({ rung: r.rung, date: r.date || 'model' })) });

export function createPlay({ root, srcLinks, onChoose, onMove, onRestart, onLeave, onReseed }) {
  let reveal = false;   // true right after a historical-decision choice, until the player moves on
  let pol = 'mine', mcOn = false;
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-opt]');
    if (b) { reveal = true; mcOn = false; onChoose(Number(b.dataset.opt)); return; }
    const m = e.target.closest('[data-move]');
    if (m) { mcOn = false; onMove(m.dataset.move); return; }
    const p = e.target.closest('[data-pol]');
    if (p) { pol = p.dataset.pol; mcOn = true; onMove(null); return; }
    if (e.target.closest('[data-mc]')) { mcOn = true; onMove(null); return; }
    if (e.target.closest('[data-reseed]')) { mcOn = false; onReseed(); return; }
    if (e.target.closest('[data-next]')) { reveal = false; onChoose(null); return; }
    if (e.target.closest('[data-restart]')) { reveal = false; mcOn = false; onRestart(); return; }
    if (e.target.closest('[data-leave]')) { reveal = false; mcOn = false; onLeave(); }
  });

  function render(c, choices, moves, seed) {
    const cf = CF[c.id];
    const me = buildRounds(c, choices, moves, seed), hist = buildRounds(c, historicalChoices(c));
    const dists = run(me.mrounds, 1), hd = run(hist.mrounds, 1);
    const cur = dists[dists.length - 1];
    const ref = c.id === 'cuba' ? { lo: KENNEDY.lo, hi: KENNEDY.hi, label: "Kennedy's estimate of the chance of war" } : null;
    const lastK = choices.length - 1;

    const tree = cf.decisions.slice(0, choices.length).map((d, k) => {
      const o = d.options[choices[k]], h = histIdx(d) === choices[k];
      return `<li class="${h ? 'h' : 'x'}"><span class="d">${esc(d.date)}</span> <b>${esc(o.label)}</b>
        <span class="pill" style="color:var(${h ? '--good' : '--accent'})">${h ? 'what actually happened' : 'departs from the record'}</span> <span class="fine">→ rung ${o.historical && d.at < c.steps.length ? c.steps[d.at].rung : o.rung}</span></li>`;
    }).join('') + (me.br ? me.br.rounds.slice(1).map(r => `<li class="g"><span class="d">Round ${r.t}</span> <b>${esc(BRANCH[c.id].opts[r.mv].label)}</b> <span class="cf-gen">model branch</span> <span class="fine">→ rung ${r.rr ?? r.pr}</span></li>`).join('') : '');

    let body = '';
    if (reveal && lastK >= 0) body = revealHTML(c, cf.decisions[lastK], lastK, choices[lastK], dists, me);
    else if (me.pending >= 0) body = decisionHTML(cf.decisions[me.pending], me.pending, cf.decisions.length);
    else if (me.br) body = branchHTML(c, me, dists, hist, hd, seed);
    else body = endHTML(c, me, dists, hist, hd);

    root.innerHTML = `
      <div class="cf-head">
        <p class="eyebrow">Retry from the allied side</p>
        <p class="cf-player">You play <b>${esc(cf.player)}</b>.</p>
        <details class="cf-why"><summary>Why this side?</summary><p>${esc(cf.playerWhy)}</p><p><b>Limited conventional war</b> here means: ${esc(cf.wMeans)}</p></details>
      </div>
      <div class="cf-dist" aria-live="polite">
        <p class="cf-dh">Where this crisis ends <span class="cf-warnlab">Notional model, not a prediction</span> <button type="button" class="cf-link" data-open-model>Edit the model</button></p>
        ${barHTML(cur, me.done ? 'Your run, final' : 'Your run, now', ref)}
        ${legendHTML(cur)}
        ${ref ? `<p class="fine cf-kref"><i class="cf-ref-key"></i>Hatched band: where the war-or-worse share (the orange and red at the right end) would begin under Kennedy's own estimate. ${esc(KENNEDY.text)} ${srcLinks([KENNEDY.src])}</p>` : ''}
      </div>
      ${tree ? `<ol class="cf-tree" aria-label="Your choices">${tree}</ol>` : ''}
      <div class="cf-body">${body}</div>
      <div class="cf-foot"><button type="button" class="btn" data-restart>Start the retry again</button> <button type="button" class="btn" data-leave>Back to the historical steps</button></div>`;
    return { me, hist };
  }

  function decisionHTML(d, k, n) {
    return `<div class="cf-dec">
      <p class="d">Decision ${k + 1} of ${n} · ${esc(d.date)}</p>
      <h3>${esc(d.title)}</h3>
      <p>${esc(d.context)}</p>
      <p class="cf-ask">What do you do?</p>
      <div class="cf-opts">${d.options.map((o, i) => `<button type="button" class="cf-opt" data-opt="${i}">${esc(o.label)}</button>`).join('')}</div>
      <p class="fine">Every option here was considered or publicly debated at the time. Sources appear after you choose.</p>
    </div>`;
  }

  function revealHTML(c, d, k, ci, dists, me) {
    const o = d.options[ci], rung = o.historical && d.at < c.steps.length ? c.steps[d.at].rung : o.rung;
    const idx = me.mrounds.findIndex(r => r.dec === k), before = dists[idx], after = dists[idx + 1];
    const h = o.historical;
    const opts = d.options.map((x, i) => `<li class="${x.historical ? 'h' : ''} ${i === ci ? 'me' : ''}">
      <b>${esc(x.label)}</b> ${x.historical ? '<span class="pill" style="color:var(--good)">what actually happened</span>' : ''}${i === ci ? '<span class="pill" style="color:var(--blue)">your choice</span>' : ''}
      <p>${esc(x.note)}</p><div class="xlinks">${srcLinks(x.src)}</div></li>`).join('');
    const next = h ? (me.done ? 'See how your run ends' : 'Next decision') : `See how ${esc(BRANCH[c.id].opp)} responds (model)`;
    return `<div class="cf-rev">
      <p class="d">${esc(d.date)} · ${esc(d.title)}</p>
      <div class="kl-rq">The crisis moves to rung <b>${rung}</b>: “${esc(RUNGS[rung])}”<br><span class="fine">${esc(groupOf(rung).name)}${o.historical ? (d.at < c.steps.length ? ' · the historical step: ' + esc(c.steps[d.at].title) : ' · ' + esc(o.then.title)) : ' · coding by the author of this tool'}</span></div>
      ${o.why ? `<p class="fine">${esc(o.why)}</p>` : ''}
      ${o.then ? `<p>${esc(o.then.text)}</p>` : ''}
      ${after && h ? `<p class="fine">War or worse in the model: <b>${pct(before[2] + before[3])}</b> before this choice, <b>${pct(after[2] + after[3])}</b> after it.</p>` : ''}
      ${h ? '' : `<p class="cf-off">Your path leaves the historical record here. From now on the crisis is a model-generated branch: each round ${esc(BRANCH[c.id].opp)}'s response is rolled from a notional table, you choose again, and the branch runs until it settles, freezes, locks into war, crosses into nuclear use, or reaches ${params.br.rounds} rounds. None of it is history.</p>`}
      <p class="cf-oh">The options and their sources</p>
      <ul class="cf-olist">${opts}</ul>
      <button type="button" class="btn solid cf-go" data-next>${next}</button>
    </div>`;
  }

  function branchHTML(c, me, dists, hist, hd, seed) {
    const br = me.br, mine = br.rounds.slice(1).map(r => r.mv), firstMv = br.rounds[0].mv;
    const log = logHTML(c.id, br, me.dep.label);
    const dice = `<p class="fine cf-seed">Dice seed <b class="num">${seed}</b>. The same seed and choices replay the same rolls. <button type="button" class="cf-link" data-reseed>New dice</button></p>`;
    let mc = null, drv = null;
    if (mcOn) {
      const start = me.dep.start, first = br.rounds[0].pr, P = policyFn(pol, mine, firstMv);
      mc = monteCarlo(start, first, P, seed); drv = drivers(start, first, P, seed, mc);
    }
    const mcs = mcHTML(pol, mc, drv, seed);
    if (!br.end) return `<div class="cf-brwrap"><p class="cf-oh">The branch so far ${BR_TAG}</p>${log}${dice}${movesHTML(c.id, br, srcLinks, params.br.rounds)}${mcs}</div>`;
    const last = br.rounds[br.rounds.length - 1], O = OUTCOMES.find(o => o.k === br.end);
    return `<div class="cf-brwrap"><p class="cf-oh">The branch ${BR_TAG}</p>${log}${dice}
      <div class="cf-end">
        <h3>Your branch ended in: ${O.name}</h3>
        <p class="fine">This is one roll of the dice in a notional model (${esc(last.why)}), after ${br.rounds.length} round${br.rounds.length > 1 ? 's' : ''}. It is not what happened.</p>
        ${compareHTML(c, me, dists, hist, hd)}
      </div>${mcs}</div>`;
  }

  function compareHTML(c, me, dists, hist, hd) {
    const fin = dists[dists.length - 1], hfin = hd[hd.length - 1];
    const peak = ds => ds.reduce((m, p, i) => (p[2] + p[3] > m.v ? { v: p[2] + p[3], i } : m), { v: 0, i: 0 });
    const hp = peak(hd), mp = peak(dists);
    const cuba = c.id === 'cuba' ? `<p class="fine">On the historical path the model's war-or-worse share peaks at <b>${pct(hp.v)}</b>, after “${esc(hist.mrounds[hp.i - 1]?.title || '')}.” Kennedy's own estimate was one in three to even. The gap says more about the default numbers than about 1962; try them in “Edit the model.”</p>` : '';
    return `${barHTML(fin, 'Your run')}
      ${barHTML(hfin, 'What happened')}
      <table class="cf-cmp"><thead><tr><th></th>${OUTCOMES.map(o => `<th><i class="${o.cls}"></i>${o.name}</th>`).join('')}</tr></thead>
        <tbody><tr><th>Your run</th>${fin.map(x => `<td class="num">${pct(x)}</td>`).join('')}</tr>
        <tr><th>What happened</th>${hfin.map(x => `<td class="num">${pct(x)}</td>`).join('')}</tr></tbody></table>
      <p class="fine">Model outcome bars, not the rolled result. Highest war-or-worse share along the way: yours <b>${pct(mp.v)}</b>, history's <b>${pct(hp.v)}</b>. The ladder and the path chart show your path in blue and the historical path in orange.</p>
      ${cuba}
      <p class="fine">The historical path is the one the crisis actually took; the model's numbers for it are as notional as yours. Share this run with “Copy link”.</p>`;
  }

  function endHTML(c, me, dists, hist, hd) {
    return `<div class="cf-end"><h3>You followed the historical path</h3>${compareHTML(c, me, dists, hist, hd)}</div>`;
  }

  return { render, reset: () => { reveal = false; mcOn = false; } };
}
