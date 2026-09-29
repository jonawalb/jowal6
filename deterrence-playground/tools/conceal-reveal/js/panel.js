// Conceal or Reveal? Side panel: equilibrium status, Proposition 1 checklist, readouts and parameter sliders.
import { KINDS, prop1, priors } from './model.js';
import { f2, pct, slider, sec, tex } from './ui.js';

export const SLIDERS = [
  { group: 'Stakes and war', items: [
    { key: 'b', label: 'Value of the contested good', math: 'b', min: 0.2, max: 2, step: 0.01 },
    { key: 'c', label: 'Cost of war (each side)', math: 'c', min: 0, max: 1.2, step: 0.01 },
    { key: 'piH', label: 'Win probability, high capability', math: 'π<sub>H</sub>', min: 0.05, max: 0.95, step: 0.01 },
    { key: 'piL', label: 'Win probability, low capability', math: 'π<sub>L</sub>', min: 0.01, max: 0.9, step: 0.01, help: 'Kept below π<sub>H</sub>.' },
  ] },
  { group: 'Disclosure', items: [
    { key: 'sig', label: 'Surprise advantage from concealing', math: 'σ', min: 0, max: 0.3, step: 0.005, help: 'Added to the Sender’s win probability if it concealed. Kept so that π<sub>H</sub> + σ &lt; 1.' },
    { key: 'V', label: 'Operational bonus', math: 'V', min: 0, max: 2, step: 0.01, help: 'Extra war payoff for operational types only.' },
    { key: 'r', label: 'Cost of revelation', math: 'r', min: 0, max: 1, step: 0.01, help: 'Countermeasures, exposed methods, arms racing.' },
  ] },
  { group: 'Prior over types', items: [
    { key: 'g', label: 'Share of coercive types', math: 'Pr(C)', min: 0.02, max: 0.98, step: 0.01 },
    { key: 'hC', label: 'Pr(high capability | coercive)', math: 'h<sub>C</sub>', min: 0.02, max: 0.98, step: 0.01 },
    { key: 'hO', label: 'Pr(high capability | operational)', math: 'h<sub>O</sub>', min: 0.02, max: 0.98, step: 0.01 },
  ] },
];

export function buildPanel(panel, P, onChange, onPick) {
  const st = sec(panel, 'Equilibrium');
  st.insertAdjacentHTML('beforeend', `<div class="status" id="cr-status"><b></b><span></span></div><p class="why" id="cr-why"></p>
    <div id="cr-eqs" class="eqs" role="group" aria-label="Equilibria at these values"></div>`);
  const pc = sec(panel, 'Proposition 1: intent-separating equilibrium');
  pc.insertAdjacentHTML('beforeend', `<ul class="checks" id="cr-checks"></ul><p class="fine" id="cr-gap"></p>`);
  const ro = sec(panel, 'Readout');
  ro.insertAdjacentHTML('beforeend', `<dl class="readout" id="cr-read"></dl>`);
  const sl = {};
  for (const grp of SLIDERS) {
    const s = sec(panel, grp.group);
    for (const it of grp.items) sl[it.key] = slider(s, it, P[it.key], v => { P[it.key] = v; fix(it.key); onChange(); });
  }
  const last = panel.lastElementChild;
  last.insertAdjacentHTML('beforeend', `<p class="fine">Payoffs are abstract utilities from the paper’s model. The values are illustrative and are <span class="notional">notional</span>: they are not estimates for any real state or weapon.</p>
    <button type="button" class="btn" id="cr-reset">Reset to the default example</button>`);

  function fix(k) {
    if (P.piL >= P.piH) { if (k === 'piL') P.piL = +(P.piH - 0.01).toFixed(2); else P.piL = Math.max(0.01, +(P.piH - 0.01).toFixed(2)); }
    const smax = +(0.99 - P.piH).toFixed(3);
    if (P.sig > smax) P.sig = Math.max(0, smax);
    sl.sig.setMax(Math.min(0.3, smax));
    for (const key of Object.keys(sl)) if (key !== k) sl[key].set(P[key]);
  }
  fix();

  function render(all, idx) {
    for (const key of Object.keys(sl)) sl[key].set(P[key]);
    const eq = all[idx];
    const box = panel.querySelector('#cr-status');
    const k = eq ? eq.kind : 'none';
    box.dataset.s = k === 'ise' ? 'good' : k === 'none' ? 'bad' : 'warn';
    box.querySelector('b').textContent = KINDS[k].label + (eq && eq.kind === 'ise' ? ' (Proposition 1)' : '');
    box.querySelector('span').textContent = KINDS[k].short;
    const pp = prop1(P);
    panel.querySelector('#cr-why').innerHTML = why(P, pp, eq);
    const eqs = panel.querySelector('#cr-eqs');
    eqs.innerHTML = all.length > 1 ? `<p class="fine">${all.length} pure-strategy equilibria exist here. Show:</p>` + all.map((e, i) =>
      `<button type="button" class="btn sm" data-i="${i}" aria-pressed="${i === idx}">${KINDS[e.kind].label}${e.kind === 'other' ? ' ' + sigStr(e) : ''}</button>`).join('') : '';
    eqs.querySelectorAll('button').forEach(b => b.addEventListener('click', () => onPick(+b.dataset.i)));
    checks(panel.querySelector('#cr-checks'), P, pp);
    panel.querySelector('#cr-gap').innerHTML = `(R-C) and (R-F) can hold together only when revealers are stronger on average than concealers by more than the surprise edge: π̄<sub>R</sub> − π̄<sub>K</sub> = ${f2(pp.pb.R - pp.pb.K)} ${pp.gap > 0 ? '&gt;' : '≤'} σ = ${f2(P.sig)}.`;
    const pr = priors(P);
    panel.querySelector('#cr-read').innerHTML = [
      ['π̄<sub>R</sub>: coercive types’ mean', f2(pp.pb.R)],
      ['π̄<sub>K</sub>: operational types’ mean', f2(pp.pb.K)],
      ['Pr(war) in the equilibrium shown', eq ? pct(eq.pWar) : '–'],
      ['Pr(Receiver concedes)', eq ? pct(eq.pConcede) : '–'],
      ['Prior share coercive', pct(P.g)],
      ['Prior share high capability', pct(pr.HC + pr.HO)],
    ].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
  }
  panel.querySelector('#cr-reset').addEventListener('click', () => onChange('reset'));
  return { render };
}

const sigStr = e => '(' + ['HC', 'HO', 'LC', 'LO'].filter(t => e.sig[t] === 'R').join(', ') + ' reveal)';

function checks(node, P, pp) {
  const rows = [
    ['RC', 'R-C', 'Receiver concedes after Reveal', `c=${f2(P.c)} > (1-\\bar\\pi_R)\\,b=${f2(pp.RC.rhs)}`],
    ['RF', 'R-F', 'Receiver fights after Conceal', `c=${f2(P.c)} < (1-\\bar\\pi_K-\\sigma)\\,b=${f2(pp.RF.rhs)}`],
    ['ICC', 'IC-C', 'Coercive types prefer to reveal (binding: high capability)', `b-r=${f2(pp.ICC.lhs)} \\ge (\\pi_H+\\sigma)b-c=${f2(pp.ICC.rhs)}`],
    ['ICO', 'IC-O', 'Operational types prefer to conceal (binding: low capability)', `(\\pi_L+\\sigma)b-c+V=${f2(pp.ICO.lhs)} \\ge b-r=${f2(pp.ICO.rhs)}`],
  ];
  node.innerHTML = rows.map(([k, tag, txt]) => `<li data-ok="${pp[k].ok}"><span class="ck">${pp[k].ok ? 'holds' : 'fails'}</span><b>(${tag})</b> ${txt}<div class="tx" data-k="${k}"></div></li>`).join('');
  rows.forEach(([k, , , src]) => tex(node.querySelector(`.tx[data-k="${k}"]`), src));
}

function why(P, pp, eq) {
  if (pp.ok) return `Coercive types reveal and the Receiver concedes; operational types conceal and the Receiver fights. The operational bonus V = ${f2(P.V)} is what keeps the low-capability operational type from copying the coercive types: switching would cost it σb + V = ${f2(P.sig * P.b + P.V)}, against σb = ${f2(P.sig * P.b)} for a coercive type.`;
  const fails = [];
  if (!pp.RC.ok) fails.push(`after a reveal the Receiver still expects to do well enough in war to fight (π̄<sub>R</sub> = ${f2(pp.pb.R)} is too low)`);
  if (!pp.RF.ok) fails.push(`after concealment the Receiver would rather concede, because the concealers plus surprise look too strong (π̄<sub>K</sub> + σ = ${f2(pp.pb.K + P.sig)})`);
  if (!pp.ICC.ok) fails.push(`revealing costs the high-capability coercive type more than a surprise war would (r = ${f2(P.r)} is too high)`);
  if (!pp.ICO.ok) fails.push(`the operational bonus is too small: the low-capability operational type would rather reveal and take the concession (needs V ≥ ${f2(pp.ICO.rhs - pp.ICO.lhs + P.V)})`);
  const lead = `The intent-separating equilibrium fails because ${fails.join('; and ')}.`;
  return eq ? `${lead} <em>Shown instead: ${KINDS[eq.kind].label.toLowerCase()}.</em>` : lead;
}
