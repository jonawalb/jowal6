// Side panel: grouped sliders, the attack toggle, the equilibrium-selection control, and the advanced drawer.
import { SPEC } from './params.js';

const GROUPS = [
  ['mu', 'What fighters believe · <span class="sym-n">μ</span>', 'Inputs to the public mean (memo eq. 1).'],
  ['info', 'Information', 'Precisions of public and private information (eqs. 2, 5).'],
  ['pay', 'Fighting payoffs', 'Fight pays θ + bW − k; not fighting pays 0 (eq. 3).'],
  ['gov', 'Government · Level 2', 'Resolve R (eqs. 23–26).'],
  ['opp', 'Adversary', 'Estimate μ̂ and attack rule (eqs. 30–32).'],
];
const ADV = [['gov2', 'Advanced: war dynamics and win probability'], ['adv', 'Advanced: weights in <span class="sym-n">μ</span>']];

function slider(parent, key, value, onInput) {
  const s = SPEC[key], id = 'sl-' + key;
  const w = document.createElement('div');
  w.className = 'slider';
  w.innerHTML = `<div class="sl-h"><label for="${id}">${s[6]} <span class="sym">${s[7]}</span></label><output for="${id}" id="o-${key}"></output></div>
    <input type="range" id="${id}" min="${s[1]}" max="${s[2]}" step="${s[3]}">${s[8] ? `<small>${s[8]}</small>` : ''}`;
  parent.appendChild(w);
  const input = w.querySelector('input'), out = w.querySelector('output');
  const dec = s[3] < 0.01 ? 3 : s[3] < 0.1 ? 2 : 1;
  const show = v => { out.textContent = (+v).toFixed(dec).replace('-', '−'); };
  input.value = value; show(value);
  input.addEventListener('input', () => { show(input.value); onInput(key, +input.value); });
  return { set(v) { input.value = v; show(v); } };
}

function toggle(parent, key, value, onInput) {
  const w = document.createElement('label');
  w.className = 'tg';
  w.innerHTML = `<input type="checkbox" id="tg-${key}"><span class="sw" aria-hidden="true"></span><span class="t">Country is under attack <small>A = 1 adds the rally effect r to μ. The adversary panel always evaluates the attack.</small></span>`;
  parent.appendChild(w);
  const input = w.querySelector('input');
  input.checked = !!value;
  input.addEventListener('change', () => onInput(key, input.checked ? 1 : 0));
  return { set(v) { input.checked = !!v; } };
}

/**
 * Build the panel. Returns { sync(state), muOut(el) }. onParam(key, value) and onMode(mode) are callbacks.
 */
export function mountPanel(root, state, onParam, onMode) {
  root.innerHTML = '';
  const ctl = {};
  const sec = (title, help) => {
    const s = document.createElement('div');
    s.className = 'sec';
    s.innerHTML = `<p class="eyebrow">${title}</p>${help ? `<p class="fine">${help}</p>` : ''}`;
    root.appendChild(s);
    return s;
  };
  for (const [g, title, help] of GROUPS) {
    const s = sec(title, help);
    for (const [k, sp] of Object.entries(SPEC)) {
      if (sp[5] !== g) continue;
      ctl[k] = k === 'A' ? toggle(s, k, state.p[k], onParam) : slider(s, k, state.p[k], onParam);
    }
    if (g === 'mu') {
      const r = document.createElement('p');
      r.className = 'wf-mu num'; r.id = 'mu-readout';
      s.appendChild(r);
    }
    if (g === 'pay') {
      const m = document.createElement('div');
      m.innerHTML = `<p class="fine" id="mode-l">When there are several equilibria, show</p>
        <div class="seg" role="group" aria-labelledby="mode-l">
          <button type="button" data-m="follow" title="Stay on the current branch: shows hysteresis">Follow branch</button>
          <button type="button" data-m="high">Most cohesive</button>
          <button type="button" data-m="low">Least cohesive</button></div>`;
      s.appendChild(m);
      ctl._mode = [...m.querySelectorAll('button')];
      ctl._mode.forEach(b => b.addEventListener('click', () => onMode(b.dataset.m)));
    }
  }
  for (const [g, title] of ADV) {
    const d = document.createElement('details');
    d.className = 'sec wf-adv';
    d.innerHTML = `<summary class="eyebrow">${title}</summary>`;
    const body = document.createElement('div');
    body.className = 'wf-adv-b';
    d.appendChild(body);
    root.appendChild(d);
    for (const [k, sp] of Object.entries(SPEC)) if (sp[5] === g) ctl[k] = slider(body, k, state.p[k], onParam);
  }
  return {
    sync(st) {
      for (const k of Object.keys(SPEC)) ctl[k]?.set(st.p[k]);
      ctl._mode.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === st.mode)));
    },
  };
}
