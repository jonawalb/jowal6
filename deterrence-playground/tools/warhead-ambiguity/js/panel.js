// Is It a Nuke? Side panel: recommendation, the detection (context and evidence), beliefs, posture and notional costs.
import { ACTIONS, CONTEXTS, SITES, TRAJS, STATES, COSTS, LIMITS } from './model.js';
import { slider, sec, choices, pct } from './ui.js';

export function buildPanel(panel, S, onChange) {
  const P = S.P;
  const st = sec(panel, 'Decision');
  st.insertAdjacentHTML('beforeend', `<div class="status" id="wa-status"><b></b><span></span></div>
    <p class="fine"><span class="notional">notional</span> Notional model, not a prediction.</p>
    <dl class="readout" id="wa-read"></dl>`);

  const cx = sec(panel, 'Context');
  const ctx = choices(cx, Object.entries(CONTEXTS).map(([v, c]) => ({ v, t: c.name, s: c.s })), P.ctx, v => {
    P.ctx = v; P.pReal = CONTEXTS[v].pReal; P.pNuc = CONTEXTS[v].pNuc; onChange();
  }, 'Context of the detection');
  const sl = {};
  const pf = v => (v < 0.01 ? (v * 100).toFixed(1) : Math.round(v * 100)) + '%';
  sl.pReal = slider(cx, { key: 'pReal', label: 'Prior: the detection is a real attack', min: 0.001, max: 0.999, step: 0.001, fmt: pf,
    help: 'Before looking at the evidence. Low in peacetime, high once missiles are flying.' }, P.pReal, v => { P.pReal = v; onChange(); });
  sl.pNuc = slider(cx, { key: 'pNuc', label: 'Prior: a real launch carries a nuclear warhead', min: 0.001, max: 0.999, step: 0.001, fmt: pf,
    help: 'In a conventional war most dual-capable launches are conventional.' }, P.pNuc, v => { P.pNuc = v; onChange(); });

  const ev = sec(panel, 'What your sensors show');
  ev.insertAdjacentHTML('beforeend', '<p class="fine"><b>Launch site</b></p>');
  const site = choices(ev, SITES.map(s => ({ v: s.id, t: s.name, s: s.s })), P.site, v => { P.site = v; onChange(); }, 'Launch site');
  ev.insertAdjacentHTML('beforeend', '<p class="fine"><b>Trajectory and apparent target</b></p>');
  const traj = choices(ev, TRAJS.map(s => ({ v: s.id, t: s.name, s: s.s })), P.traj, v => { P.traj = v; onChange(); }, 'Trajectory and apparent target');
  const cl = document.createElement('label');
  cl.className = 'tg';
  cl.innerHTML = `<input type="checkbox" id="wa-corr"><span class="sw"></span><span class="t">Confirmed by a second, independent sensor<small>For example, radar tracks confirm what a satellite saw.</small></span>`;
  ev.appendChild(cl);
  const corrIn = cl.querySelector('input');
  corrIn.addEventListener('change', e => { P.corr = e.target.checked ? 1 : 0; onChange(); });

  const en = sec(panel, 'Entanglement');
  sl.Eo = slider(en, { key: 'Eo', label: 'Entanglement you assume', min: 0, max: 1, step: 0.05,
    help: 'How mixed you believe the adversary’s nuclear and conventional forces are. You read the evidence through this.' }, P.Eo, v => { P.Eo = v; onChange(); });
  sl.E = slider(en, { key: 'E', label: 'Actual entanglement', min: 0, max: 1, step: 0.05,
    help: 'How mixed they really are. It drives what the long-run results below the chart produce. Drag the map to set it.' }, P.E, v => { P.E = v; onChange(); });
  en.insertAdjacentHTML('beforeend', '<button type="button" class="btn sm" id="wa-match">Assume the actual level</button>');
  en.querySelector('#wa-match').addEventListener('click', () => { P.Eo = P.E; onChange(); });

  const po = sec(panel, 'Your posture');
  sl.surv = slider(po, { key: 'surv', label: 'Survivability of your retaliatory force', min: 0, max: 1, step: 0.05,
    help: 'Share of your deterrent that would survive a nuclear strike. Low survivability makes waiting costly.' }, P.surv, v => { P.surv = v; onChange(); });
  const lc = document.createElement('label');
  lc.className = 'tg';
  lc.innerHTML = `<input type="checkbox" id="wa-low"><span class="sw"></span><span class="t">Able to launch before impact<small>Acton (2020): only the United States and Russia can launch a nuclear response before incoming weapons detonate.</small></span>`;
  po.appendChild(lc);
  const lowIn = lc.querySelector('input');
  lowIn.addEventListener('change', e => { P.lowCap = e.target.checked ? 1 : 0; onChange(); });
  sl.K = slider(po, { key: 'K', label: 'Conventional launches in a campaign', min: 1, max: 500, step: 1, fmt: v => String(Math.round(v)),
    help: 'Used for the campaign-level risk below the chart.' }, P.K, v => { P.K = v; onChange(); });

  const adv = document.createElement('details');
  adv.className = 'sec adv';
  adv.innerHTML = `<summary class="eyebrow">Costs and weights <span class="notional">notional</span></summary>
    <p class="fine">Cost of each action if the truth is each state, in arbitrary units. “Deterrent loss” is added in the nuclear case, scaled by one minus survivability.</p>
    <div class="tablewrap"><table class="costs"><thead><tr><th>Action</th>${STATES.map(s => `<th>${s.name}</th>`).join('')}<th>Deterrent loss</th></tr></thead><tbody>
    ${ACTIONS.map(a => `<tr><th>${a.name}</th>${['F', 'C', 'N', 'Nloss'].map(k => `<td><input type="number" min="0" max="5000" step="1" data-a="${a.id}" data-k="${k}" aria-label="Cost of ${a.name.toLowerCase()} if ${k === 'Nloss' ? 'nuclear: deterrent loss' : STATES.find(x => x.id === k).name.toLowerCase()}"></td>`).join('')}</tr>`).join('')}
    </tbody></table></div>`;
  panel.appendChild(adv);
  adv.querySelectorAll('input[type=number]').forEach(inp => inp.addEventListener('change', () => {
    const v = Number(inp.value);
    if (Number.isFinite(v) && v >= 0) { S.costs[inp.dataset.a][inp.dataset.k] = Math.min(5000, v); onChange(); }
  }));
  sl.lrC = slider(adv, { key: 'lrC', label: 'Weight of a second sensor', min: 1, max: 200, step: 1, fmt: v => '×' + Math.round(v),
    help: 'How much less likely a false alarm is once a second sensor agrees.' }, P.lrC, v => { P.lrC = v; onChange(); });
  adv.insertAdjacentHTML('beforeend', `<button type="button" class="btn" id="wa-reset">Reset everything</button>`);
  adv.querySelector('#wa-reset').addEventListener('click', () => onChange('reset'));

  function render(mu, dec) {
    for (const k of Object.keys(sl)) sl[k].set(P[k]);
    ctx.set(P.ctx); site.set(P.site); traj.set(P.traj);
    corrIn.checked = !!P.corr; lowIn.checked = !!P.lowCap;
    adv.querySelectorAll('input[type=number]').forEach(inp => { if (document.activeElement !== inp) inp.value = S.costs[inp.dataset.a][inp.dataset.k]; });
    const a = ACTIONS.find(x => x.id === dec.best);
    const box = panel.querySelector('#wa-status');
    box.dataset.s = dec.best === 'low' ? 'bad' : dec.best === 'conv' ? 'warn' : 'good';
    box.querySelector('b').textContent = a.name;
    box.querySelector('span').textContent = `${a.long}. Pr(nuclear) = ${pct(mu.N)}.`;
    panel.querySelector('#wa-read').innerHTML = [
      ['Pr(no attack)', pct(mu.F)], ['Pr(conventional)', pct(mu.C)], ['Pr(nuclear)', pct(mu.N)],
      ...ACTIONS.map(x => [`Expected cost: ${x.name.toLowerCase()}`, x.id === 'low' && !P.lowCap ? 'n/a' : Math.round(dec.ec[x.id])]),
    ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  }
  return { render, LIMITS };
}
