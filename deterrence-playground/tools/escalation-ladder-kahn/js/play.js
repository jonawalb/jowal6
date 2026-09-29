// "Retry from the allied side": the player takes one side's decisions; each choice moves the crisis to a rung and
// updates the notional outcome distribution (model.js). Picking an option that did not happen ends the record:
// the tool holds the crisis at that rung for the rounds history had left instead of inventing what came next.
import { RUNGS, groupOf } from '../data/ladder.js';
import { CF, KENNEDY } from '../data/counterfactuals.js';
import { run, barHTML, legendHTML, pct, OUTCOMES } from './model.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const histIdx = d => d.options.findIndex(o => o.historical);

/**
 * Rounds for a crisis given the choices made so far (array of option indices).
 * Returns { rounds, pending: decision index or -1, departedAt: decision index or -1, done }.
 */
export function buildRounds(c, choices) {
  const cf = CF[c.id], rounds = [];
  const hist = (i, lean = '', k = -1) => rounds.push({ rung: c.steps[i].rung, lean, date: c.steps[i].date, title: c.steps[i].title, dec: k });
  let pos = 0, departedAt = -1, pending = -1;
  const histLen = cf ? historyLength(c) : c.steps.length;
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
    rounds.push({ rung: o.rung, lean: o.lean, date: d.date, title: o.label, dec: k, cf: true });
    const left = Math.max(0, histLen - rounds.length);
    for (let j = 0; j < left; j++) rounds.push({ rung: o.rung, lean: o.lean, date: '', title: 'Held at this rung (no record)', hold: true });
    departedAt = k; break;
  }
  if (pending < 0 && departedAt < 0) for (; pos < c.steps.length; pos++) hist(pos);
  return { rounds, pending, departedAt, done: pending < 0 };
}

function historyLength(c) {
  const cf = CF[c.id];
  return c.steps.length + cf.decisions.filter(d => d.at >= c.steps.length).length;
}
export const historicalChoices = c => CF[c.id].decisions.map(histIdx);

/** Pseudo-crisis objects for the ladder and the path chart. */
export const asCrisis = (rounds, short, name) => ({ short, name, steps: rounds.map(r => ({ rung: r.rung, date: r.date || 'held' })) });

export function createPlay({ root, srcLinks, onChoose, onRestart, onLeave }) {
  let reveal = false;   // true right after a choice, until the player moves on
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-opt]');
    if (b) { reveal = true; onChoose(Number(b.dataset.opt)); return; }
    if (e.target.closest('[data-next]')) { reveal = false; onChoose(null); return; }
    if (e.target.closest('[data-restart]')) { reveal = false; onRestart(); return; }
    if (e.target.closest('[data-leave]')) { reveal = false; onLeave(); }
  });

  function render(c, choices) {
    const cf = CF[c.id];
    const me = buildRounds(c, choices), hist = buildRounds(c, historicalChoices(c));
    const dists = run(me.rounds, 1), hd = run(hist.rounds, 1);
    const cur = dists[dists.length - 1];
    const ref = c.id === 'cuba' ? { lo: KENNEDY.lo, hi: KENNEDY.hi, label: "Kennedy's estimate of the chance of war" } : null;
    const answered = cf.decisions.slice(0, choices.length);
    const lastK = choices.length - 1;
    const showReveal = reveal && lastK >= 0;

    const tree = answered.map((d, k) => {
      const o = d.options[choices[k]], h = histIdx(d) === choices[k];
      return `<li class="${h ? 'h' : 'x'}"><span class="d">${esc(d.date)}</span> <b>${esc(o.label)}</b>
        <span class="pill" style="color:var(${h ? '--good' : '--accent'})">${h ? 'what actually happened' : 'departs from the record'}</span> <span class="fine">→ rung ${o.historical && d.at < c.steps.length ? c.steps[d.at].rung : o.rung}</span></li>`;
    }).join('');

    let body = '';
    if (showReveal) body = revealHTML(c, cf.decisions[lastK], lastK, choices[lastK], dists, me);
    else if (!me.done) body = decisionHTML(cf.decisions[me.pending], me.pending, cf.decisions.length);
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
    const idx = me.rounds.findIndex(r => r.dec === k), before = dists[idx], after = dists[idx + 1];
    const h = o.historical;
    const opts = d.options.map((x, i) => `<li class="${x.historical ? 'h' : ''} ${i === ci ? 'me' : ''}">
      <b>${esc(x.label)}</b> ${x.historical ? '<span class="pill" style="color:var(--good)">what actually happened</span>' : ''}${i === ci ? '<span class="pill" style="color:var(--blue)">your choice</span>' : ''}
      <p>${esc(x.note)}</p><div class="xlinks">${srcLinks(x.src)}</div></li>`).join('');
    const next = me.done ? 'See how your run ends' : 'Next decision';
    return `<div class="cf-rev">
      <p class="d">${esc(d.date)} · ${esc(d.title)}</p>
      <div class="kl-rq">The crisis moves to rung <b>${rung}</b>: “${esc(RUNGS[rung])}”<br><span class="fine">${esc(groupOf(rung).name)}${o.historical ? (d.at < c.steps.length ? ' · the historical step: ' + esc(c.steps[d.at].title) : ' · ' + esc(o.then.title)) : ' · coding by the author of this tool'}</span></div>
      ${o.why ? `<p class="fine">${esc(o.why)}</p>` : ''}
      ${o.then ? `<p>${esc(o.then.text)}</p>` : ''}
      ${after ? `<p class="fine">War or worse in the model: <b>${pct(before[2] + before[3])}</b> before this choice, <b>${pct(after[2] + after[3])}</b> after it.</p>` : ''}
      ${h ? '' : '<p class="cf-off">Your path leaves the historical record here. The tool does not invent what came next: it holds the crisis at this rung for as many rounds as history had left, then stops.</p>'}
      <p class="cf-oh">The options and their sources</p>
      <ul class="cf-olist">${opts}</ul>
      <button type="button" class="btn solid cf-go" data-next>${next}</button>
    </div>`;
  }

  function endHTML(c, me, dists, hist, hd) {
    const fin = dists[dists.length - 1], hfin = hd[hd.length - 1];
    const peak = ds => ds.reduce((m, p, i) => (p[2] + p[3] > m.v ? { v: p[2] + p[3], i } : m), { v: 0, i: 0 });
    const hp = peak(hd), mp = peak(dists);
    const same = me.departedAt < 0;
    const cuba = c.id === 'cuba' ? `<p class="fine">On the historical path the model's war-or-worse share peaks at <b>${pct(hp.v)}</b>, after “${esc(hist.rounds[hp.i - 1]?.title || '')}.” Kennedy's own estimate was one in three to even. The gap says more about the default numbers than about 1962; try them in “Edit the model.”</p>` : '';
    return `<div class="cf-end">
      <h3>${same ? 'You followed the historical path' : 'Your run against history'}</h3>
      ${barHTML(fin, 'Your run')}
      ${barHTML(hfin, 'What happened')}
      <table class="cf-cmp"><thead><tr><th></th>${OUTCOMES.map(o => `<th><i class="${o.cls}"></i>${o.name}</th>`).join('')}</tr></thead>
        <tbody><tr><th>Your run</th>${fin.map(x => `<td class="num">${pct(x)}</td>`).join('')}</tr>
        <tr><th>What happened</th>${hfin.map(x => `<td class="num">${pct(x)}</td>`).join('')}</tr></tbody></table>
      <p class="fine">Highest war-or-worse share along the way: yours <b>${pct(mp.v)}</b>, history's <b>${pct(hp.v)}</b>. The ladder and the path chart now show your path in blue and the historical path in orange.</p>
      ${cuba}
      <p class="fine">The historical path is the one the crisis actually took; the model's numbers for it are as notional as yours. Share this run with “Copy link”.</p>
    </div>`;
  }

  return { render, reset: () => { reveal = false; } };
}
