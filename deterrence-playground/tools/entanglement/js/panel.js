// Nuclear Entanglement: side panel. Status, readouts, mitigation levers, target posture and notional model weights.
import { MITIGATIONS, CATS, LIMITS, leverEffects } from './model.js';
import { slider, sec, pct } from './ui.js';
import { REFS } from '../data/refs.js';

const signed = x => (x <= 0 ? '−' : '+') + Math.abs(Math.round(x * 100)) + ' pts';

export function buildPanel(panel, S, onChange) {
  const st = sec(panel, 'Probability of nuclear escalation');
  st.insertAdjacentHTML('beforeend', `<div class="status" id="en-status"><b></b><span></span></div>
    <p class="fine">Notional model, not a prediction. Cumulative chance that the target uses nuclear weapons by the end of phase 4.</p>
    <dl class="readout" id="en-read"></dl>`);

  const mi = sec(panel, 'Mitigation levers');
  mi.insertAdjacentHTML('beforeend', `<p class="fine">Each lever changes named channels. The number shows what it does to the final risk from here.</p>`);
  const tgs = {};
  for (const m of MITIGATIONS) {
    const lab = document.createElement('label');
    lab.className = 'tg mit';
    lab.innerHTML = `<input type="checkbox" data-m="${m.id}"><span class="sw"></span><span class="t">${m.name} <em class="num" data-d="${m.id}"></em>
      <small>${m.text}</small><small class="lit">${m.lit} ${m.links.map(k => `<a href="${REFS[k].u}" target="_blank" rel="noopener">${REFS[k].short}</a>`).join(' · ')}</small></span>`;
    mi.appendChild(lab);
    tgs[m.id] = lab.querySelector('input');
    tgs[m.id].addEventListener('change', e => { S.mit[m.id] = e.target.checked ? 1 : 0; onChange(); });
  }

  const tp = sec(panel, 'Target and weapons');
  const sl = {};
  sl.surv = slider(tp, { key: 'surv', label: 'Target’s confidence in its second strike', min: 0, max: 1, step: 0.05,
    help: 'Low: a small or vulnerable force, so losses bite fast. High: a large, secure force.' }, S.P.surv, v => { S.P.surv = v; onChange(); });
  sl.amb = slider(tp, { key: 'amb', label: 'Share of your strike weapons that are dual-capable', min: 0, max: 1, step: 0.05,
    help: 'Higher means the incoming weapons themselves could be nuclear.' }, S.P.amb, v => { S.P.amb = v; onChange(); });
  const dl = document.createElement('label');
  dl.className = 'tg';
  dl.innerHTML = `<input type="checkbox" id="en-dl"><span class="sw"></span><span class="t">Target has a damage-limitation doctrine<small>It plans to hunt the other side’s nuclear forces and intercept its missiles. Acton argues this applies mainly to the United States.</small></span>`;
  tp.appendChild(dl);
  const dlIn = dl.querySelector('input');
  dlIn.addEventListener('change', e => { S.P.dlDoc = e.target.checked ? 1 : 0; onChange(); });

  const adv = document.createElement('details');
  adv.className = 'sec adv';
  adv.innerHTML = `<summary class="eyebrow">Model weights <span class="notional">notional</span></summary>
    <p class="fine">These are illustrative weights, not estimates. Change them to test how much each assumption drives the result.</p>`;
  panel.appendChild(adv);
  const g1 = document.createElement('div'); g1.className = 'advg'; adv.appendChild(g1);
  g1.insertAdjacentHTML('beforeend', '<p class="fine"><b>Nuclear role of each category</b> (how entangled it is)</p>');
  const nsl = CATS.map((c, i) => slider(g1, { key: 'n-' + c.id, label: c.short, min: 0, max: 1, step: 0.05 }, S.cats[i].n, v => { S.cats[i].n = v; onChange(); }));
  const g2 = document.createElement('div'); g2.className = 'advg'; adv.appendChild(g2);
  const specs = [
    ['h0', 'Baseline hazard per phase', 'The chance of nuclear use per phase in a conventional war with no entangled strikes.', 0.001],
    ['kci', 'Scale: use them or lose them', '', 0.005], ['kmw', 'Scale: misinterpreted warning', '', 0.005],
    ['kdl', 'Scale: damage-limitation window', '', 0.005], ['kwa', 'Scale: warhead and target ambiguity', '', 0.005],
    ['phi', 'Fog pessimism', 'How much degraded warning inflates the perceived threat.', 0.05],
    ['rep', 'Repair between strikes', 'Share of damage repaired in a phase with no strikes on that category.', 0.05],
  ];
  for (const [k, label, help, step] of specs) {
    sl[k] = slider(g2, { key: k, label, help, min: LIMITS[k][0], max: LIMITS[k][1], step, fmt: v => (+v).toFixed(step < 0.01 ? 3 : 2) }, S.P[k], v => { S.P[k] = v; onChange(); });
  }
  adv.insertAdjacentHTML('beforeend', `<button type="button" class="btn" id="en-reset">Reset everything</button>`);
  adv.querySelector('#en-reset').addEventListener('click', () => onChange('reset'));

  function render(R, B) {
    for (const k of Object.keys(sl)) sl[k].set(S.P[k]);
    S.cats.forEach((c, i) => nsl[i].set(c.n));
    dlIn.checked = !!S.P.dlDoc;
    for (const m of MITIGATIONS) tgs[m.id].checked = !!S.mit[m.id];
    const box = panel.querySelector('#en-status');
    box.dataset.s = R.pEsc < 0.1 ? 'good' : R.pEsc < 0.3 ? 'warn' : 'bad';
    box.querySelector('b').textContent = pct(R.pEsc);
    box.querySelector('span').textContent = `${pct(B.pEsc)} in the same war without these strikes. ${R.pEsc > 2 * B.pEsc + 0.02 ? 'Entangled strikes multiply the risk.' : 'Entangled strikes add little here.'}`;
    const peak = R.phases.reduce((a, b) => (b.p > a.p ? b : a));
    panel.querySelector('#en-read').innerHTML = [
      ['Conventional effect of campaign', `${Math.round(R.mil * 100)} / 100`],
      ['Use-or-lose pressure, peak', pct(R.pressure)],
      ['Fog of war at the end', pct(R.fog)],
      ['Riskiest phase', `Phase ${peak.t + 1} (${pct(peak.p)})`],
    ].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
    for (const e of leverEffects(S)) {
      const node = panel.querySelector(`[data-d="${e.id}"]`);
      const mil = Math.abs(e.milDelta) > 0.005 ? `, conventional effect ${e.milDelta < 0 ? '−' : '+'}${Math.round(Math.abs(e.milDelta) * 100)}` : '';
      node.textContent = `risk ${signed(e.delta)}${mil}`;
    }
  }
  return { render };
}
