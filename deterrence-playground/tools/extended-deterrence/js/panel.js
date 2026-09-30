// Extended Deterrence: side panel. Commitment devices, stakes, readouts and the notional device parameters.
import { DEVICES, solve } from './model.js';
import { f2, pct, slider, sec } from './ui.js';

export function buildPanel(panel, S, onChange) {
  const st = sec(panel, 'Result');
  st.insertAdjacentHTML('beforeend', `<div class="status" id="ed-status"><b></b><span></span></div><p class="why" id="ed-why"></p>`);

  const dv = sec(panel, 'Stack commitment devices');
  dv.insertAdjacentHTML('beforeend', DEVICES.map(d => `<label class="tg"><input type="checkbox" data-dev="${d.id}"><span class="sw"></span>
    <span class="t">${d.name} <em class="kind">${d.kind}</em><small>${d.help}</small></span></label>`).join('') +
    `<label class="tg"><input type="checkbox" id="ed-screen"><span class="sw"></span><span class="t">Sunk costs signal resolve<small>Fearon’s screening logic: a patron that pays peacetime cost S must value the ally at least S, so the challenger rules out lower values.</small></span></label>`);
  dv.querySelectorAll('[data-dev]').forEach(i => i.addEventListener('change', () => { S.dev[i.dataset.dev] = i.checked ? 1 : 0; onChange(); }));
  dv.querySelector('#ed-screen').addEventListener('change', e => { S.screen = e.target.checked ? 1 : 0; onChange(); });

  const sk = sec(panel, 'Stakes');
  const sl = {
    w: slider(sk, { key: 'w', label: 'Patron’s cost of fighting for the ally', math: 'w', min: 0, max: 1.5, step: 0.01, help: 'Rises when the challenger can strike the patron’s homeland: would Boston be traded for Bonn?. The patron’s value of the ally is at most 1.' }, S.w, v => { S.w = v; onChange(); }),
    kC: slider(sk, { key: 'kC', label: 'Challenger’s loss if the patron fights', math: 'k<sub>C</sub>', min: 0, max: 2, step: 0.01, help: 'Before any denial effect of forward forces. Its gain from an unopposed attack is at most 1.' }, S.kC, v => { S.kC = v; onChange(); }),
  };

  const ro = sec(panel, 'Readout');
  ro.insertAdjacentHTML('beforeend', `<dl class="readout" id="ed-read"></dl>`);

  const adv = sec(panel, '');
  adv.insertAdjacentHTML('beforeend', `<details class="adv"><summary>Device parameters <span class="notional">notional</span></summary>
    <p class="fine">a: cost of backing out. s: peacetime cost. t: chance the device makes defense automatic. d: added loss to an attacker from local defense.</p><div id="ed-adv"></div></details>
    <button type="button" class="btn" id="ed-reset">Reset</button>`);
  const advRoot = adv.querySelector('#ed-adv'), advSl = [];
  for (const [i, d] of DEVICES.entries()) {
    const box = document.createElement('div');
    box.className = 'advdev';
    box.innerHTML = `<p class="eyebrow">${d.name}</p>`;
    advRoot.appendChild(box);
    for (const [k, max] of [['a', 1], ['s', 0.5], ['t', 1], ['d', 1]]) {
      advSl.push([i, k, slider(box, { key: `${d.id}-${k}`, label: k, min: 0, max, step: 0.01 }, S.params[i][k], v => { S.params[i][k] = v; onChange(); })]);
    }
  }
  panel.querySelector('#ed-reset').addEventListener('click', () => onChange('reset'));

  function render() {
    panel.querySelectorAll('[data-dev]').forEach(i => { i.checked = !!S.dev[i.dataset.dev]; });
    panel.querySelector('#ed-screen').checked = !!S.screen;
    sl.w.set(S.w); sl.kC.set(S.kC);
    for (const [i, k, s] of advSl) s.set(S.params[i][k]);
    const r = solve(S, S.dev, S.params), base = solve(S, {}, S.params);
    const box = panel.querySelector('#ed-status');
    box.dataset.s = r.deter >= 0.8 ? 'good' : r.deter >= 0.4 ? 'warn' : 'bad';
    box.querySelector('b').textContent = `Deterrence holds ${pct(r.deter)} of the time`;
    box.querySelector('span').textContent = `Credibility ${pct(r.kappa)} (interests alone: ${pct(base.kappa)}).`;
    panel.querySelector('#ed-why').innerHTML = why(S, r, base);
    panel.querySelector('#ed-read').innerHTML = [
      ['Credibility: Pr(patron fights | attack)', pct(r.kappa)],
      ['Pr(challenger attacks)', pct(r.pAttack)],
      ['Pr(war)', pct(r.pWar)],
      ['Pr(ally abandoned)', pct(r.pAbandon)],
      ['If attacked: Pr(patron fights a war not worth it on the merits)', pct(r.entrap)],
      ['Peacetime cost S (sunk)', f2(r.S)],
      ['Expected audience cost paid', f2(r.audience)],
      ['Hands tied: cost of backing out A', f2(r.A)],
      ['Automatic defense T', pct(r.T)],
    ].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
  }
  return { render };
}

function why(S, r, base) {
  const parts = [];
  if (S.w > 1 && !r.T) parts.push(`War costs the patron more than the ally can be worth (w = ${f2(S.w)} &gt; 1), so without automatic devices only tied hands can make it fight.`);
  if (r.A > 0) parts.push(`Tied hands add ${f2(r.A)} to the price of walking away, so the patron fights whenever its value of the ally exceeds ${f2(Math.max(0, S.w - r.A))}.`);
  if (r.T > 0) parts.push(`Automatic devices commit the patron in ${pct(r.T)} of attacks whatever it would prefer; that is also where entrapment comes from.`);
  if (S.screen && r.S > 0) parts.push(`Paying ${f2(r.S)} up front tells the challenger the patron values the ally at least that much.`);
  if (!parts.length) parts.push(`With no devices the patron fights only if the ally is worth more to it than the war costs (v ≥ w), which the challenger thinks happens ${pct(base.kappa)} of the time.`);
  parts.push(`The challenger attacks when its gain exceeds ${r.xStar === Infinity ? 'any possible gain' : f2(Math.min(r.xStar, 99))}.`);
  return parts.join(' ');
}
