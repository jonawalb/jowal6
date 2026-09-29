// Historical illustrations card: pick a case, read what happened, load a notional model reading.
import { CASES, SRC } from '../data/cases.js';
import { A_DEFAULTS } from './models/crisis.js';
import { B_DEFAULTS } from './models/signal.js';
import { C_DEFAULTS } from './models/reputation.js';

const DEF = { A: A_DEFAULTS, B: B_DEFAULTS, C: { N: C_DEFAULTS.N, p0: C_DEFAULTS.p0, b: C_DEFAULTS.b, a: C_DEFAULTS.a } };
/** A reading's full parameter set: module defaults overridden by the reading (C keeps the viewer's defender type and seed). */
const full = (m, set) => ({ ...DEF[m], ...set });

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const picked = { A: 0, B: 0, C: 0 };

/** Preselect a case by id (used by the walkthrough) before the card mounts. */
export function pickCase(m, id) {
  const i = CASES[m].findIndex(c => c.id === id);
  if (i >= 0) picked[m] = i;
}

/**
 * Append the case card to the stage for module m.
 * apply(set) loads a parameter reading; returns { sync(P) } to mark the reading that matches P.
 */
export function mountCases(stage, m, apply) {
  const list = CASES[m];
  const card = document.createElement('div');
  card.className = 'card cases';
  card.innerHTML = `<div class="fig-h"><p class="eyebrow">Historical illustrations</p>
      <p class="fine">Pick a case, then load a reading of it. Loaded values are <span class="notional">notional</span>: they place the case in a region of the model and estimate nothing.</p></div>
    <div class="case-tabs" role="group" aria-label="Historical case"></div>
    <div class="case-body"></div>`;
  stage.appendChild(card);
  const tabs = card.querySelector('.case-tabs'), body = card.querySelector('.case-body');
  list.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.i = i;
    b.innerHTML = `<b>${esc(c.title)}</b><span>${esc(c.when)} · ${esc(c.where)}</span>`;
    b.addEventListener('click', () => { picked[m] = i; draw(); sync(lastP); });
    tabs.appendChild(b);
  });
  let lastP = null;

  function draw() {
    const c = list[picked[m]];
    tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === picked[m])));
    body.innerHTML = `<p class="case-what">${c.what}</p>
      <div class="readings">${c.readings.map((r, j) => `<div class="reading">
        <button type="button" class="btn" data-j="${j}" aria-pressed="false">Load: ${esc(r.label)}</button>
        <p>${r.text}</p></div>`).join('')}</div>
      <p class="case-caveat"><b>Caveat.</b> ${c.caveat}</p>
      <p class="case-src">Sources: ${c.src.map(k => `<a href="${SRC[k].u}" target="_blank" rel="noopener">${esc(SRC[k].t)}</a>`).join(' · ')}</p>`;
    body.querySelectorAll('[data-j]').forEach(b => b.addEventListener('click', () => apply(full(m, c.readings[+b.dataset.j].set))));
  }

  /** Mark the reading whose values match the current parameters, if any. */
  function sync(P) {
    lastP = P;
    if (!P) return;
    const c = list[picked[m]];
    body.querySelectorAll('[data-j]').forEach(b => {
      const set = full(m, c.readings[+b.dataset.j].set);
      const on = Object.entries(set).every(([k, v]) => typeof v === 'string' ? P[k] === v : Math.abs(P[k] - v) < 1e-6);
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('solid', on);
    });
  }
  draw();
  return { sync };
}
