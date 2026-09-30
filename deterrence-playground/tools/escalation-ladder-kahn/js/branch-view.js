// Views for the model-generated branch: the round log with every roll, the move buttons, and the 1,000-futures card.
import { RUNGS } from '../data/ladder.js';
import { BRANCH, MOVES, MOVE_NAMES, RESP_NAMES } from '../data/branch-options.js';
import { BAND_NAMES, POLICIES, RUNS } from './branch.js';
import { OUTCOMES, pct } from './model.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const BR_TAG = '<span class="cf-gen">Model-generated branch: notional, not history</span>';
const OUT = Object.fromEntries(OUTCOMES.map(o => [o.k, o]));
const roll = (u, p) => `<span class="cf-roll${u < p ? ' hit' : ''}" title="${u < p ? 'under the chance' : 'over the chance'}">${u.toFixed(2)}</span>`;
const pc = x => Math.round(x * 100) + '%';

/** Label for a branch round's move: the departure option's own label for round 1. */
export const moveLabel = (id, r, depLabel) => (r.t === 1 ? depLabel : BRANCH[id].opts[r.mv].label);

export function logHTML(id, br, depLabel) {
  const opp = BRANCH[id].opp;
  const cards = br.rounds.map((r, i) => {
    const last = i === br.rounds.length - 1;
    const resp = r.resp ? `<p><b>${esc(opp)} ${RESP_NAMES[r.resp]}</b> · chance ${pc(r.pResp)} · roll ${roll(r.u1, 0)}
      <span class="fine">(response table row: ${esc(BAND_NAMES[r.g])}, ${MOVE_NAMES[r.mv].toLowerCase()}: back down ${pc(r.probs[0])}, hold ${pc(r.probs[1])}, match ${pc(r.probs[2])}, escalate ${pc(r.probs[3])})</span> → rung ${r.rr}</p>` : '';
    let endp = '';
    if (r.u2 !== undefined) {
      const res = r.end === 'S' ? 'settlement' : r.end === 'W' && r.why.startsWith('end roll') ? 'the fighting locks in as a limited war' : 'the crisis goes on';
      endp = `<p>End roll ${roll(r.u2, r.pS + r.pW)} against settlement ${pc(r.pS)}${r.pW ? ` then war lock-in ${pc(r.pW)} (band ${pc(r.pS)}–${pc(r.pS + r.pW)})` : ''}: <b>${res}</b></p>`;
    }
    const fin = r.end ? `<p class="cf-fin">Branch ends: <b>${OUT[r.end].name}</b> (${esc(r.why)}).</p>` : '';
    return `<li class="${last ? 'now' : ''}"><p class="d">Round ${r.t} ${BR_TAG}</p>
      <p>You: <b>${esc(moveLabel(id, r, depLabel))}</b> <span class="fine">(${MOVE_NAMES[r.mv].toLowerCase()})</span> → rung ${r.pr}</p>
      ${resp}${endp}${fin}
      <p class="fine">Now at rung ${r.rr ?? r.pr}: “${esc(RUNGS[r.rr ?? r.pr])}”</p></li>`;
  }).join('');
  return `<ol class="cf-log" aria-label="Branch log">${cards}</ol>`;
}

export function movesHTML(id, br, srcLinks, maxRounds) {
  const B = BRANCH[id], t = br.rounds.length + 1;
  const src = MOVES.filter(m => B.opts[m].src).map(m => `<li>“${esc(B.opts[m].label)}” was recorded as considered at the time: ${srcLinks(B.opts[m].src)}</li>`).join('');
  return `<div class="cf-dec cf-branch">
    <p class="d">Round ${t} of up to ${maxRounds} ${BR_TAG}</p>
    <h3>Your move</h3>
    <p class="fine">The options below are a generic, illustrative set of four moves worded for the period. The model, not the record, decides what ${esc(B.opp)} does next.</p>
    <div class="cf-opts">${MOVES.map(m => `<button type="button" class="cf-opt gen" data-move="${m}"><small>${MOVE_NAMES[m]}</small>${esc(B.opts[m].label)}</button>`).join('')}</div>
    ${src ? `<ul class="cf-srcs">${src}</ul>` : ''}
  </div>`;
}

export function mcHTML(pol, mc, drv, seed) {
  const buttons = POLICIES.map(p => `<button type="button" data-pol="${p.k}" aria-pressed="${p.k === pol}">${p.t}</button>`).join('');
  let res = '';
  if (mc) {
    const seg = OUTCOMES.map(o => `<span class="${o.cls}" style="width:${(mc[o.k] / mc.n * 100).toFixed(2)}%" title="${o.name}: ${pct(mc[o.k] / mc.n)}"></span>`).join('');
    const sign = x => (x > 0.0005 ? '+' : x < -0.0005 ? '−' : '±') + Math.abs(Math.round(x * 1000) / 10).toFixed(1);
    res = `<div class="cf-barrow"><span class="cf-barlab">${RUNS.toLocaleString('en-US')} futures</span><div class="cf-bar" role="img" aria-label="${OUTCOMES.map(o => o.name + ' ' + pct(mc[o.k] / mc.n)).join(', ')}">${seg}</div></div>
      <table class="cf-cmp"><thead><tr>${OUTCOMES.map(o => `<th><i class="${o.cls}"></i>${o.name}</th>`).join('')}<th>Rounds, average</th></tr></thead>
        <tbody><tr>${OUTCOMES.map(o => `<td class="num">${pct(mc[o.k] / mc.n)}</td>`).join('')}<td class="num">${mc.rounds.toFixed(1)}</td></tr></tbody></table>
      <p class="cf-nuke">Chance of nuclear use in these futures: <b>${pct(mc.N / mc.n)}</b> <span class="cf-warnlab">notional</span></p>
      <p class="cf-oh">Key drivers: one lever at a time, same dice</p>
      <div class="tablewrap"><table class="cf-cmp cf-drv"><thead><tr><th>Change</th><th>Nuclear use</th><th>Settlement</th><th>Limited war</th></tr></thead>
        <tbody>${drv.map(d => `<tr><td>${esc(d.t)}</td><td class="num">${sign(d.dN)}</td><td class="num">${sign(d.dS)}</td><td class="num">${sign(d.dW)}</td></tr>`).join('')}</tbody></table></div>
      <p class="fine">Changes in percentage points against the ${RUNS.toLocaleString('en-US')} futures above. Each row replays the same seeded dice with one notional number changed.</p>`;
  }
  return `<section class="cf-mc" aria-labelledby="mc-h">
    <h3 id="mc-h">Run ${RUNS.toLocaleString('en-US')} futures</h3>
    <p class="fine">Replays the branch ${RUNS.toLocaleString('en-US')} times from the moment you left the record, with your departure fixed and fresh dice each time (batch seed ${seed}). Pick the policy the U.S. or allied side follows in later rounds.</p>
    <div class="choices cf-pols" role="group" aria-label="Policy">${buttons}</div>
    <button type="button" class="btn solid cf-go" data-mc>Run ${RUNS.toLocaleString('en-US')} futures</button>
    <div aria-live="polite">${res}</div>
  </section>`;
}
