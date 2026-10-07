// Notional outcome model for "Retry from the allied side". Not a prediction, and no number here comes from a source.
// State: a probability distribution over four ways the crisis could end (settlement, standoff, war, nuclear use).
// Each round of the crisis (one historical step, or one choice) sits on a Kahn rung. The rung's group sets how easily
// the crisis slides one outcome up or down; climbing many rungs at once adds risk, stepping down adds relief.
// The arithmetic is exact and has no random draws, so the same choices always give the same numbers.
import { GROUPS, groupOf } from '../data/ladder.js';

export const OUTCOMES = [
  { k: 'S', name: 'Negotiated settlement', cls: 'o-s' },
  { k: 'F', name: 'Frozen standoff', cls: 'o-f' },
  { k: 'W', name: 'Limited conventional war', cls: 'o-w' },
  { k: 'N', name: 'Nuclear use', cls: 'o-n' },
];

// All notional. `up[g]`/`down[g]` are per Kahn group, bottom to top.
export const DEFAULTS = Object.freeze({
  prior: [0.40, 0.50, 0.09, 0.01],
  up: [0.02, 0.06, 0.14, 0.30, 0.45, 0.60, 0.70],
  down: [0.30, 0.12, 0.05, 0.03, 0.02, 0.01, 0.01],
  jump: 0.012,   // extra up-hazard per rung climbed in one round
  relief: 0.02,  // extra down-hazard per rung descended in one round
  nuke: 0.15,    // share of the up-hazard that turns a war into nuclear use
  lean: 0.15,    // share moved toward settlement or standoff by an option that is itself a deal or a freeze
  // Model-generated branch (branch.js). resp[band][move] = chances the opponent backs down / holds / matches /
  // escalates. band: rungs 1–3, 4–9, 10–20. move: de-escalate, hold, escalate one step, major escalation.
  br: {
    resp: [
      [[0.45, 0.40, 0.10, 0.05], [0.25, 0.50, 0.15, 0.10], [0.15, 0.35, 0.35, 0.15], [0.10, 0.25, 0.35, 0.30]],
      [[0.35, 0.40, 0.15, 0.10], [0.20, 0.45, 0.20, 0.15], [0.15, 0.30, 0.35, 0.20], [0.10, 0.20, 0.35, 0.35]],
      [[0.30, 0.35, 0.20, 0.15], [0.15, 0.40, 0.25, 0.20], [0.10, 0.25, 0.35, 0.30], [0.05, 0.20, 0.35, 0.40]],
    ],
    shift: [-3, 0, 2, 5],     // rungs moved by your de-escalate / hold / escalate / major escalation
    rshift: [-2, 0, 2, 4],    // rungs moved by the opponent's back down / hold / match / escalate
    settle: [0.45, 0.30, 0.15], // settlement chance per round by band when either side softens
    settleBoth: 0.15,         // added when you de-escalate and the opponent backs down in the same round
    settleBase: 0.03,         // settlement chance per round otherwise
    war: 0.30,                // chance per round, at rung 12 or higher, that fighting locks in as a limited war
    rounds: 6,                // branch length before it is scored as it stands
  },
});

export const params = structuredClone(DEFAULTS);
export const resetParams = () => Object.assign(params, structuredClone(DEFAULTS));

const gi = r => GROUPS.indexOf(groupOf(r));

/** One round at rung r, coming from rung prev. lean: 'S' | 'F' | ''. Returns a new distribution. */
export function stepDist(p, r, prev, lean = '') {
  const d = r - prev, g = gi(r);
  let up = params.up[g] + params.jump * Math.max(0, d), dn = params.down[g] + params.relief * Math.max(0, -d);
  up = Math.min(Math.max(up, 0), 0.9); dn = Math.min(Math.max(dn, 0), 0.9);
  if (up + dn > 0.95) { const k = 0.95 / (up + dn); up *= k; dn *= k; }
  const [S, F, W, N] = p;
  const q = [
    S * (1 - up) + F * dn,
    F * (1 - up - dn) + S * up + W * dn,
    W * (1 - up * params.nuke - dn) + F * up,
    N + W * up * params.nuke,
  ];
  const L = Math.min(Math.max(params.lean, 0), 1);
  if (lean === 'S') { const m = q[1] * L; q[1] -= m; q[0] += m; }
  if (lean === 'F') { const m = q[0] * L; q[0] -= m; q[1] += m; }
  const t = q.reduce((a, b) => a + b, 0) || 1;
  return q.map(x => x / t);
}

function normPrior() {
  const p = params.prior.map(x => Math.max(0, Number(x) || 0)), t = p.reduce((a, b) => a + b, 0);
  return t ? p.map(x => x / t) : [...DEFAULTS.prior];
}

/**
 * Play a list of rounds [{ rung, lean }] from the prior. Returns the distribution after each round
 * (dists[0] is the prior, before any round).
 */
export function run(rounds, startRung) {
  const dists = [normPrior()];
  let prev = startRung;
  for (const r of rounds) { dists.push(stepDist(dists[dists.length - 1], r.rung, prev, r.lean || '')); prev = r.rung; }
  return dists;
}

export const pct = x => (x * 100 < 0.5 && x > 0 ? '<1' : Math.round(x * 100)) + '%';

/** Horizontal stacked bar. ref: optional {lo, hi, label} band drawn over the war-or-worse share. */
export function barHTML(p, label, ref) {
  const segs = OUTCOMES.map((o, i) => `<span class="${o.cls}" style="width:${(p[i] * 100).toFixed(2)}%" title="${o.name}: ${pct(p[i])}"></span>`).join('');
  const band = ref ? `<i class="cf-ref" style="left:${((1 - ref.hi) * 100).toFixed(1)}%;width:${((ref.hi - ref.lo) * 100).toFixed(1)}%" title="${ref.label}"></i>` : '';
  return `<div class="cf-barrow"><span class="cf-barlab">${label}</span><div class="cf-bar" role="img" aria-label="${label}: ${OUTCOMES.map((o, i) => o.name + ' ' + pct(p[i])).join(', ')}">${segs}${band}</div></div>`;
}

export const legendHTML = p => `<ul class="cf-leg">${OUTCOMES.map((o, i) =>
  `<li><i class="${o.cls}"></i>${o.name}${p ? ` <b class="num">${pct(p[i])}</b>` : ''}</li>`).join('')}</ul>`;

/** "Edit the model" form. onChange is called after any edit. */
const BR_BANDS = ['Rungs 1–3', 'Rungs 4–9', 'Rungs 10–20'], BR_MOVES = ['De-escalate', 'Hold', 'Escalate one step', 'Major escalation'];
export function mountEditor(root, onChange) {
  const inp = (path, v, step = 0.01, lo = 0, hi = 1) => `<input type="number" inputmode="decimal" min="${lo}" max="${hi}" step="${step}" data-p="${path}" value="${v}" aria-label="${path}">`;
  const B = () => params.br;
  const draw = () => {
    root.innerHTML = `
      <p class="fine">Every number below is <span class="notional">notional</span>: a placeholder chosen by the author of this tool to make the logic visible, not a value taken from any source. Change any of them and the bars update.</p>
      <div class="tablewrap"><table class="cf-ptab">
        <thead><tr><th>Kahn group (rungs)</th><th>Slide up <span class="notional">notional</span></th><th>Slide down <span class="notional">notional</span></th></tr></thead>
        <tbody>${GROUPS.map((g, i) => `<tr><td>${g.name} (${g.from}–${g.to})</td><td>${inp(`up.${i}`, params.up[i])}</td><td>${inp(`down.${i}`, params.down[i])}</td></tr>`).join('')}</tbody>
      </table></div>
      <div class="cf-pgrid">
        <label>Extra risk per rung climbed in one move ${inp('jump', params.jump, 0.001)}</label>
        <label>Extra relief per rung stepped down ${inp('relief', params.relief, 0.001)}</label>
        <label>Share of the slide-up that turns war into nuclear use ${inp('nuke', params.nuke)}</label>
        <label>Pull of an option that is itself a deal or a freeze ${inp('lean', params.lean)}</label>
      </div>
      <p class="fine" style="margin-top:8px">Starting distribution, before the crisis begins <span class="notional">notional</span> (rescaled to 100%):</p>
      <div class="cf-pgrid">${OUTCOMES.map((o, i) => `<label>${o.name} ${inp(`prior.${i}`, params.prior[i])}</label>`).join('')}</div>
      <h3 class="cf-eh">Model-generated branch <span class="notional">notional</span></h3>
      <p class="fine">After you leave the record, the opponent's response each round is rolled from this table: the row is the rung band after your move and the move you made. Rows are rescaled to 100%.</p>
      <div class="tablewrap"><table class="cf-ptab">
        <thead><tr><th>Band, your move</th><th>Backs down</th><th>Holds</th><th>Matches</th><th>Escalates</th></tr></thead>
        <tbody>${B().resp.map((g, gi) => g.map((row, mi) => `<tr><td>${BR_BANDS[gi]}, ${BR_MOVES[mi]}</td>${row.map((v, k) => `<td>${inp(`br.resp.${gi}.${mi}.${k}`, v)}</td>`).join('')}</tr>`).join('')).join('')}</tbody>
      </table></div>
      <div class="tablewrap"><table class="cf-ptab">
        <thead><tr><th>Rungs moved</th><th>De-escalate / back down</th><th>Hold</th><th>Escalate / match</th><th>Major / escalate</th></tr></thead>
        <tbody><tr><td>Your move</td>${B().shift.map((v, k) => `<td>${inp(`br.shift.${k}`, v, 1, -10, 10)}</td>`).join('')}</tr>
        <tr><td>Opponent's response</td>${B().rshift.map((v, k) => `<td>${inp(`br.rshift.${k}`, v, 1, -10, 10)}</td>`).join('')}</tr></tbody>
      </table></div>
      <div class="cf-pgrid">
        ${B().settle.map((v, k) => `<label>Settlement chance when either side softens, ${BR_BANDS[k].toLowerCase()} ${inp(`br.settle.${k}`, v)}</label>`).join('')}
        <label>Added when both soften in the same round ${inp('br.settleBoth', B().settleBoth)}</label>
        <label>Settlement chance otherwise ${inp('br.settleBase', B().settleBase)}</label>
        <label>War lock-in chance per round at rung 12+ ${inp('br.war', B().war)}</label>
        <label>Rounds before the branch is scored ${inp('br.rounds', B().rounds, 1, 1, 20)}</label>
      </div>
      <button type="button" class="btn" data-reset>Reset to defaults</button>`;
  };
  draw();
  root.addEventListener('input', e => {
    const el = e.target.closest('[data-p]'); if (!el) return;
    const raw = Number(el.value); if (el.value === '' || !Number.isFinite(raw)) return;
    const v = Math.min(Math.max(raw, Number(el.min)), Number(el.max));
    const path = el.dataset.p.split('.'), key = path.pop();
    const obj = path.reduce((o, k) => o[k], params);
    obj[key] = v;
    onChange();
  });
  // Show the clamped value once the reader leaves the field.
  root.addEventListener('change', e => {
    const el = e.target.closest('[data-p]'); if (!el) return;
    const raw = Number(el.value); if (el.value === '' || !Number.isFinite(raw)) return;
    const v = Math.min(Math.max(raw, Number(el.min)), Number(el.max));
    if (v !== raw) el.value = v;
  });
  root.addEventListener('click', e => { if (e.target.closest('[data-reset]')) { resetParams(); draw(); onChange(); } });
}
