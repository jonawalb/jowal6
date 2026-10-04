// Side panel controls: presets, per-side posture sliders (tabbed A/B) and exchange assumptions.
import { PRESETS } from '../data/presets.js';

const pct = v => Math.round(v * 100) + '%';
export const FIELDS = [
  { k: 'nf', n: 'Fixed launchers', min: 0, max: 1500, step: 10, fmt: v => Math.round(v).toLocaleString(), help: 'Silo-based or otherwise fixed. Targetable unless launched under attack.' },
  { k: 'mf', n: 'Warheads per fixed launcher', min: 1, max: 12, step: 1, fmt: v => String(v), help: 'More than one means a MIRVed launcher: several warheads on one missile.' },
  { k: 'ns', n: 'Survivable launchers', min: 0, max: 200, step: 1, fmt: v => Math.round(v).toLocaleString(), help: 'Submarines, mobile missiles or bombers: untargetable only while on alert.' },
  { k: 'ms', n: 'Warheads per survivable launcher', min: 1, max: 24, step: 1, fmt: v => String(v) },
  { k: 'alert', n: 'Day-to-day alert rate', min: 0, max: 1, step: 0.05, fmt: pct, help: 'Share of survivable launchers at sea, dispersed or on strip alert.', notional: true },
  { k: 'de', n: 'Damage expectancy per warhead', min: 0.3, max: 0.95, step: 0.05, fmt: pct, help: 'This side\'s chance of destroying one enemy launcher with one warhead.', notional: true },
  { k: 'w80', n: 'Enemy weapons to destroy 80% of value', min: 200, max: 5000, step: 50, fmt: v => Math.round(v).toLocaleString(), help: 'Sets how fast this side\'s damage curve rises. Lower means more vulnerable.', notional: true },
  { k: 'hold', n: 'Held back for a third country', min: 0, max: 0.5, step: 0.05, fmt: pct, help: 'Extension beyond Kent and Thaler. Withheld weapons take no part in this exchange.', notional: true },
];

const $ = id => document.getElementById(id);
let sliders = {};

function slider(parent, f, onInput) {
  const id = 'sl-' + f.k;
  const w = document.createElement('div');
  w.className = 'slider';
  w.innerHTML = `<div class="sl-h"><label for="${id}">${f.n}${f.notional ? ' <span class="notional">notional</span>' : ''}</label><output for="${id}"></output></div>
    <input type="range" id="${id}" min="${f.min}" max="${f.max}" step="${f.step}">${f.help ? `<small>${f.help}</small>` : ''}`;
  parent.appendChild(w);
  const input = w.querySelector('input'), out = w.querySelector('output');
  input.addEventListener('input', () => { out.textContent = f.fmt(+input.value); onInput(+input.value); });
  return { set: v => { input.value = v; out.textContent = f.fmt(v); } };
}

export function mountControls(S, update) {
  $('presets').innerHTML = PRESETS.map(p => `<button type="button" data-k="${p.k}"><b>${p.n}</b><br><small>${p.s}</small></button>`).join('');
  $('presets').querySelectorAll('button').forEach(b => b.onclick = () => {
    const p = PRESETS.find(x => x.k === b.dataset.k);
    Object.assign(S, { preset: p.k, A: { ...p.A }, B: { ...p.B }, prl: p.prl, wpt: p.wpt });
    update();
  });
  $('side-tabs').querySelectorAll('button').forEach(b => b.onclick = () => { S.edit = b.dataset.s; syncControls(S); });
  const box = $('side-sliders');
  FIELDS.forEach(f => { sliders[f.k] = slider(box, f, v => { S[S.edit][f.k] = v; S.preset = ''; update(); }); });
  $('prl').onchange = e => { S.prl = e.target.checked; S.preset = ''; update(); };
  $('wpt').querySelectorAll('button').forEach(b => b.onclick = () => { S.wpt = +b.dataset.v; S.preset = ''; update(); });
}

export function syncControls(S) {
  $('presets').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === S.preset));
  const note = PRESETS.find(p => p.k === S.preset)?.note;
  $('preset-note').hidden = !note;
  $('preset-note').textContent = note || '';
  $('side-tabs').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.s === S.edit));
  $('side-sliders').dataset.side = S.edit;
  FIELDS.forEach(f => sliders[f.k].set(S[S.edit][f.k]));
  $('prl').checked = S.prl;
  $('wpt').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === S.wpt));
}
