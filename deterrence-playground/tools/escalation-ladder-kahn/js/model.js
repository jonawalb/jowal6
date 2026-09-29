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
export function mountEditor(root, onChange) {
  const inp = (path, v, step = 0.01) => `<input type="number" inputmode="decimal" min="0" max="1" step="${step}" data-p="${path}" value="${v}" aria-label="${path}">`;
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
      <button type="button" class="btn" data-reset>Reset to defaults</button>`;
  };
  draw();
  root.addEventListener('input', e => {
    const el = e.target.closest('[data-p]'); if (!el) return;
    const v = Number(el.value); if (!Number.isFinite(v)) return;
    const [k, i] = el.dataset.p.split('.');
    if (i === undefined) params[k] = v; else params[k][Number(i)] = v;
    onChange();
  });
  root.addEventListener('click', e => { if (e.target.closest('[data-reset]')) { resetParams(); draw(); onChange(); } });
}
