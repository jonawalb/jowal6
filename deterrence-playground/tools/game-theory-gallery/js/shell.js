// Mounts one model: setup text, sub-view tabs, figures, insight, "Try this" prompts and illustrations in the
// stage; equilibrium status, "What changed and why", controls and readout in the side panel.
import { sec, esc, f2, pct } from './ui.js';

const fmtVal = (spec, v) => spec.fmt ? spec.fmt(v) : (+v).toFixed(spec.step < 0.01 ? 3 : spec.step >= 1 ? 0 : 2);
const fmtMetric = m => m.f === 'pct' ? pct(m.n) : m.f === 'raw' ? m.s : f2(m.n);

/**
 * model: view module (see views/*.js). P: this model's params (mutated in place). N: notes from data/notes.js.
 * onChange(): called after every change so app.js can write the hash.
 */
export function mountModel(stage, panel, model, P, N, onChange) {
  stage.innerHTML = ''; panel.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'card mhead';
  head.innerHTML = `<div class="mhead-t"><p class="eyebrow">${esc(N.kicker)}</p><h2>${esc(N.title)}</h2>
      <p class="cite">${N.cite}</p></div>
    ${model.views ? `<div class="seg vtabs" role="group" aria-label="Part of the model">${model.views.map(o =>
      `<button type="button" data-v="${o.v}" aria-pressed="false">${esc(o.t)}</button>`).join('')}</div>` : ''}
    <div class="setup"></div>`;
  stage.appendChild(head);
  const figs = document.createElement('div');
  figs.className = 'figs';
  stage.appendChild(figs);
  const extra = document.createElement('div');
  extra.className = 'extras';
  stage.appendChild(extra);

  // Panel
  const stSec = sec(panel, 'Equilibrium');
  stSec.insertAdjacentHTML('beforeend', `<div class="status" aria-live="polite"><b></b><span></span></div><p class="why"></p>`);
  const chSec = sec(panel, 'What changed and why', 'chg');
  chSec.insertAdjacentHTML('beforeend', `<div class="chg-body" aria-live="polite"><p class="fine">Move a slider or load a “Try this” prompt, and this box explains what the change did.</p></div>`);
  const ctlSec = sec(panel, 'Parameters');
  const ctlBody = document.createElement('div');
  ctlBody.className = 'ctl';
  ctlSec.appendChild(ctlBody);
  const roSec = sec(panel, 'Readout');
  roSec.insertAdjacentHTML('beforeend', `<dl class="readout"></dl>`);

  let drawer = null, ctrls = {}, eq = null;

  function buildView() {
    head.querySelectorAll('.vtabs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === P.v)));
    const setup = typeof N.setup === 'object' ? (N.setup[P.v] || '') : N.setup;
    head.querySelector('.setup').innerHTML = setup;
    figs.innerHTML = '';
    drawer = model.figures(figs, P, set => apply(set, 'drag'));
    buildControls();
    buildExtras();
  }

  function buildControls() {
    ctlBody.innerHTML = ''; ctrls = {};
    for (const spec of model.controls(P).filter(x => !x.hidden)) {
      const id = `c-${model.id}-${spec.key}`;
      const w = document.createElement('div');
      if (spec.type === 'seg' || spec.type === 'toggle') {
        const opts = spec.type === 'toggle' ? [{ v: 0, t: spec.off || 'Off' }, { v: 1, t: spec.on || 'On' }] : spec.opts;
        w.className = 'slider segctl';
        w.innerHTML = `<div class="sl-h"><span id="${id}-l">${spec.label}</span></div>
          <div class="seg" role="group" aria-labelledby="${id}-l">${opts.map(o => `<button type="button" data-val="${o.v}" aria-pressed="false">${esc(o.t)}</button>`).join('')}</div>
          ${spec.help ? `<small>${spec.help}</small>` : ''}`;
        w.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
          const raw = b.dataset.val, val = spec.type === 'toggle' || typeof opts[0].v === 'number' ? +raw : raw;
          change(spec, val);
        }));
        ctrls[spec.key] = { spec, sync: () => w.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(String(P[spec.key]) === b.dataset.val))) };
      } else {
        w.className = 'slider';
        w.innerHTML = `<div class="sl-h"><label for="${id}">${spec.label}${spec.math ? ` <span class="sym">${spec.math}</span>` : ''}${spec.notional ? ' <span class="notional">notional</span>' : ''}</label><output for="${id}"></output></div>
          <input type="range" id="${id}" step="${spec.step}">${spec.help ? `<small>${spec.help}</small>` : ''}`;
        const input = w.querySelector('input'), out = w.querySelector('output');
        input.addEventListener('input', () => change(spec, +input.value));
        ctrls[spec.key] = {
          spec, sync: () => {
            const lo = typeof spec.min === 'function' ? spec.min(P) : spec.min, hi = typeof spec.max === 'function' ? spec.max(P) : spec.max;
            input.min = lo; input.max = hi; input.value = P[spec.key]; out.textContent = fmtVal(spec, P[spec.key]);
          },
        };
      }
      ctlBody.appendChild(w);
    }
    ctlBody.insertAdjacentHTML('beforeend', `<p class="fine">${model.scaleNote || 'Payoffs are abstract utilities chosen to show the logic. They are not estimates for any real state.'}</p>`);
  }

  function buildExtras() {
    extra.innerHTML = `<div class="card insight"><p class="eyebrow">Classic insight</p><p>${N.insight}</p></div>
      <div class="card tries"><p class="eyebrow">Try this</p><ol>${N.tries.map((t, i) =>
        `<li><button type="button" class="linkbtn" data-t="${i}">${t.t}</button>${t.q ? `<span class="q">${t.q}</span>` : ''}</li>`).join('')}</ol></div>
      ${N.illus && N.illus.length ? `<div class="card illus"><p class="eyebrow">Historical illustrations the author uses</p>
        <p class="fine">Each is the author’s own example, cited to the page or chapter. They illustrate the mechanism; the tool does not fit the model to them.</p>
        <ul>${N.illus.map(x => `<li><b>${x.t}.</b> ${x.text} <span class="pg">${x.src}</span></li>`).join('')}</ul></div>` : ''}`;
    extra.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => {
      const t = N.tries[+b.dataset.t];
      apply({ ...model.defaults, ...t.set }, 'try', t.t);
      document.querySelector('.layout')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }));
  }

  function change(spec, val) {
    const prevP = { ...P }, prevEq = eq;
    P[spec.key] = val;
    if (model.fix) model.fix(P, spec.key);
    if (spec.type === 'view') { buildView(); render(); explain(prevP, prevEq, spec); onChange(); return; }
    if (spec.rebuild) buildControls();
    render();
    explain(prevP, prevEq, spec);
    onChange();
  }

  /** Load a set of values (Try this prompt, drag on a plot, walkthrough). */
  function apply(set, how, label) {
    const prevP = { ...P }, prevEq = eq, viewChange = set.v && set.v !== P.v;
    Object.assign(P, set);
    if (model.fix) Object.keys(set).forEach(k => model.fix(P, k));
    if (viewChange) buildView();
    render();
    if (how === 'drag') explain(prevP, prevEq, null, 'drag');
    else explain(prevP, viewChange ? null : prevEq, null, how, label);
    onChange();
  }

  function explain(prevP, prevEq, spec, how, label) {
    const body = chSec.querySelector('.chg-body');
    const moved = Object.keys(P).filter(k => P[k] !== prevP[k] && !(k === 'v' && model.views));
    const specs = model.controls(P);
    const lab = k => { const s = specs.find(x => x.key === k); return s ? s.label : k; };
    const val = k => { const s = specs.find(x => x.key === k); return s && s.type === 'range' ? fmtVal(s, P[k]) : String(P[k]); };
    const pval = k => { const s = specs.find(x => x.key === k); return s && s.type === 'range' ? fmtVal(s, prevP[k]) : String(prevP[k]); };
    let h = '';
    if (how === 'try') h += `<p class="chg-what">Loaded: ${label}</p>`;
    else if (spec && spec.type === 'view') h += `<p class="chg-what">Switched to <b>${esc(model.views.find(o => o.v === P.v).t)}</b>.</p>`;
    else if (moved.length) h += `<p class="chg-what">${moved.slice(0, 3).map(k => `<b>${lab(k)}</b> ${pval(k)} → ${val(k)}`).join('; ')}${moved.length > 3 ? '…' : ''}</p>`;
    if (prevEq && (!spec || spec.type !== 'view')) {
      const a = model.status(prevP, prevEq), b = model.status(P, eq);
      if (a.b !== b.b) h += `<p><b>Outcome:</b> ${esc(a.b)} → <b>${esc(b.b)}</b></p>`;
      const ma = model.metrics(prevP, prevEq), mb = model.metrics(P, eq);
      const diffs = mb.filter(m => m.track).map(m => {
        const o = ma.find(x => x.k === m.k);
        if (!o || o.n == null || m.n == null || Math.abs(o.n - m.n) < 0.005) return '';
        return `<li>${m.k}: ${fmtMetric(o)} → <b>${fmtMetric(m)}</b></li>`;
      }).filter(Boolean);
      if (diffs.length) h += `<ul class="diffs">${diffs.join('')}</ul>`;
      const key = moved.length === 1 ? moved[0] : null;
      const eff = model.effect ? model.effect(key, P, eq, prevP, prevEq) : '';
      if (eff) h += `<p class="eff">${eff}</p>`;
      if (!diffs.length && a.b === b.b && !eff) h += `<p class="fine">The equilibrium did not change.</p>`;
    }
    body.innerHTML = h || `<p class="fine">Nothing changed.</p>`;
  }

  function render() {
    for (const k in ctrls) ctrls[k].sync();
    eq = model.solve(P);
    drawer.draw(P, eq);
    const st = model.status(P, eq), box = stSec.querySelector('.status');
    box.dataset.s = st.s; box.querySelector('b').textContent = st.b; box.querySelector('span').textContent = st.t;
    stSec.querySelector('.why').innerHTML = model.why(P, eq);
    roSec.querySelector('.readout').innerHTML = model.metrics(P, eq).filter(m => !m.hide).map(m => `<dt>${m.k}</dt><dd>${fmtMetric(m)}</dd>`).join('');
  }

  head.querySelectorAll('.vtabs button').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.v !== P.v) change({ key: 'v', type: 'view' }, b.dataset.v);
  }));
  buildView();
  render();
  return { render, apply };
}
