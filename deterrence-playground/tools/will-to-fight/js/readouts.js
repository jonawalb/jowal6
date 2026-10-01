// Text readouts: the uniqueness indicator (Prop. 1), equilibrium summary, resolve gauge (Prop. 5),
// adversary panel (Prop. 4), and the per-parameter justification cards for a case preset.
import { fmt } from './plots.js';
import { SPEC, DEFAULTS } from './params.js';
import { etaOf } from '../data/cases.js';

const pc = x => `${Math.round(x * 100)}%`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const QUAD = {
  cohesive: ['Cohesive and resolute', 'good', 'The government fights and most of the force fights with it.'],
  hollow: ['Hollow resolve', 'warn', 'The government would fight, but most of the force does not (Kabul-type divergence).'],
  wavering: ['Wavering government', 'warn', 'Most of the force fights, but the government would concede.'],
  collapse: ['Collapse and concession', 'bad', 'Neither the force nor the government holds.'],
};

/** Status row: Prop. 1 indicator, equilibrium count, cohesion. */
export function renderStatus(node, L1, p) {
  const u = L1.uniq, n = L1.roots.length;
  node.innerHTML = `
    <div class="status" data-s="${u.unique ? 'good' : 'bad'}" id="uniq-box">
      <b>${u.unique ? 'Unique for all μ and k' : 'Multiplicity possible'}</b>
      <span>Prop. 1 (eq. 11): √(β(α+2β)/(α+β)) = <span class="num">${fmt(u.lhs, 3)}</span> ${u.unique ? '≥' : '<'} bα/√(2π) = <span class="num">${fmt(u.rhs, 3)}</span></span>
      ${L1.band ? `<span>Three equilibria for μ in (${fmt(L1.band.lo)}, ${fmt(L1.band.hi)}) (eq. 12b)</span>` : ''}
      <span>Critical b<sub>c</sub> = <span class="num">${fmt(u.bCrit)}</span>; critical α<sub>c</sub> = <span class="num">${fmt(u.alphaCrit)}</span></span>
    </div>
    <div class="status" data-s="${n === 1 ? 'good' : 'warn'}">
      <b>${n} equilibri${n === 1 ? 'um' : 'a'} here</b>
      <span>Cut-off${n > 1 ? 's' : ''} x* = <span class="num">${L1.roots.map(x => fmt(x)).join(', ')}</span>${n > 1 ? `; showing <span class="num">${fmt(L1.xs)}</span>` : ''}</span>
      <span>μ = <span class="num">${fmt(L1.mu)}</span>; tipping point μ† = k − b/2 = <span class="num">${fmt(L1.tip)}</span></span>
    </div>
    <div class="status" data-s="${L1.EW >= 0.5 ? 'good' : 'bad'}">
      <b>E[W] = <span class="num" id="ew">${pc(L1.EW)}</span></b>
      <span>Realized W = <span class="num">${pc(L1.W)}</span> at θ = μ + z/√α = <span class="num">${fmt(L1.theta)}</span></span>
      <span>dE[W]/dμ = <span class="num">${fmt(L1.stat.dEWdmu, 3)}</span> ${u.unique ? `(peak at μ†: <span class="num">${fmt(L1.slopeTip, 3)}</span>, eq. 20)` : '(eq. 20 peak undefined under multiplicity)'}</span>
    </div>`;
}

/** Resolve gauge (eqs. 26, 29) and the Prop. 5 quadrant. */
export function renderGauge(node, L1, L2) {
  const [t, s, d] = QUAD[L2.quad];
  const lim = Math.max(1, Math.abs(L2.R) * 1.2), pos = 50 + 50 * Math.max(-1, Math.min(1, L2.R / lim));
  const wb = L2.WBar === -Infinity ? 'below 0: fights at any cohesion' : L2.WBar === Infinity ? 'above 1: concedes at any cohesion' : pc(L2.WBar);
  node.innerHTML = `
    <div class="wf-bar" role="img" aria-label="Resolve ${fmt(L2.R)}: ${L2.fights ? 'fight' : 'concede'}">
      <span class="wf-bar-l">concede</span><div class="wf-track"><i style="left:${pos}%"></i></div><span class="wf-bar-r">fight</span>
    </div>
    <dl class="readout">
      <dt>R = V<sub>F</sub> + L</dt><dd>${fmt(L2.R)} → <b>${L2.fights ? 'fights' : 'concedes'}</b></dd>
      <dt>q (win if decided)</dt><dd>${pc(L2.q)}; needs q̄ = ${fmt(L2.qBar)}</dd>
      <dt>critical cohesion W̄</dt><dd>${wb}</dd>
    </dl>
    <div class="status" data-s="${s}"><b>${t}</b><span>${d} Realized W = ${pc(L1.W)}.</span></div>`;
}

/** Adversary panel (Prop. 4). */
export function renderAdversary(node, A) {
  const verdict = A.misjudged ? ['Attacks on a misjudgment', 'bad', 'With correct beliefs it would not attack: its μ̂ sits below the attack line but the true μ does not.']
    : A.deterredWrongly ? ['Deterred by a misjudgment', 'warn', 'With correct beliefs it would attack: it overrates the defender.']
    : A.attacks ? ['Attacks, and would with correct beliefs', 'warn', 'Its estimate and the truth both clear the bar.']
    : ['Stays out', 'good', 'Neither its estimate nor the truth clears the bar.'];
  node.innerHTML = `
    <div class="tablewrap"><table>
      <thead><tr><th scope="col"></th><th scope="col">What it expects</th><th scope="col">What happens</th></tr></thead>
      <tbody>
        <tr><th scope="row">Defender’s <span class="sym-n">μ</span></th><td class="num">μ̂ = ${fmt(A.muHat)}</td><td class="num">μ = ${fmt(A.muTrue)}</td></tr>
        <tr><th scope="row">Expected cohesion</th><td class="num">${pc(A.EWhat)}</td><td class="num">${pc(A.EWtrue)}</td></tr>
        <tr><th scope="row">P(quick collapse)</th><td class="num">${pc(A.pcHat)}</td><td class="num">${pc(A.pcTrue)}</td></tr>
      </tbody></table></div>
    <p class="fine">Attack bar P̄ = K/(G+K) = ${pc(A.PBar)}. Attack line: it attacks iff its μ̂ ≤ ${fmt(A.muAttack)} (eq. 33). Misjudgment band width (1 − κ)r − η = ${fmt(A.muTrue - A.muHat)}.</p>
    <div class="status" data-s="${verdict[1]}"><b>${verdict[0]}</b><span>${verdict[2]}</span></div>`;
}

/** One-sentence live summary for screen readers and sighted users. */
export function summary(L1, L2, A) {
  const n = L1.roots.length;
  return `${n === 1 ? 'One equilibrium' : `${n} equilibria (showing the ${L1.xs === L1.roots[0] ? 'most' : L1.xs === L1.roots[n - 1] ? 'least' : 'middle'} cohesive)`}: expected cohesion ${pc(L1.EW)}, realized ${pc(L1.W)}. `
    + `The government ${L2.fights ? 'fights' : 'concedes'} (R = ${fmt(L2.R)}). `
    + `The adversary ${A.attacks ? 'attacks' : 'stays out'}${A.misjudged ? ', on a misjudgment' : A.deterredWrongly ? ', wrongly deterred' : ''}.`;
}

/** Justification cards for a loaded case preset. */
export function renderWhy(node, cs, levelsMap) {
  if (!cs) { node.innerHTML = ''; return; }
  let cards = Object.entries(cs.levels).map(([k, lev]) => {
    const w = cs.why[k] || {}, val = levelsMap[k][lev];
    const src = (w.src || []).map(s => `<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>`).join('; ');
    return `<article class="wf-card"><h3><span class="sym">${SPEC[k][7]}</span> ${SPEC[k][6]} <span class="pill">${lev} = ${val}</span></h3>
      <p>${w.text || 'No case-specific evidence; held at the level shown.'}</p>${src ? `<p class="case-src">Source: ${src}</p>` : ''}</article>`;
  }).join('');
  if (cs.why.eta) {
    const e = etaOf(cs, DEFAULTS.lamL);
    cards += `<article class="wf-card"><h3><span class="sym">η</span> Adversary’s other bias <span class="pill">derived = ${e}</span></h3>
      <p>${cs.why.eta.text}</p><p class="case-src">Source: ${(cs.why.eta.src || []).map(s => `<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>`).join('; ')}</p></article>`;
  }
  const out = cs.outcome ? `<p><b>What happened.</b> ${cs.outcome.text} ${(cs.outcome.src || []).map(s => `<a class="case-src" href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>`).join('; ')}</p>` : '';
  node.innerHTML = `<p class="wf-case-lede"><b>${cs.name}.</b> ${cs.lede}</p>${out}
    ${cs.caveat ? `<p class="case-caveat">${cs.caveat}</p>` : ''}
    <div class="wf-cards">${cards}</div>
    <p class="fine">Parameters not listed stay at their defaults for every case. Outcomes are shown for face validity only; the levels were set from the evidence above, not fitted to the outcome.</p>`;
}
