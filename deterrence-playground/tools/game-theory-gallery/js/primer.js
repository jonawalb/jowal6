// "Start here" primer shown above each model: the author's question, why it is a puzzle, the explanations the
// author weighs, a glossary, a numbered walk-through whose "Show me" buttons load states into the live model,
// the author's answer and what the model leaves out. Content lives in data/primers-*.js.
import { esc } from './ui.js';

const OPEN_KEY = 'gtg-primer-open';      // whole primer expanded (per viewer, all models)
const GLOSS_KEY = 'gtg-primer-gloss';    // glossary expanded

function readFlag(key, dflt) {
  try { const v = localStorage.getItem(key); return v === null ? dflt : v === '1'; } catch (e) { return dflt; }
}
function writeFlag(key, on) {
  try { localStorage.setItem(key, on ? '1' : '0'); } catch (e) { /* storage unavailable: keep the default */ }
}

/**
 * host: the <section> above the model. PR: one entry of PRIMERS (or undefined to hide the section).
 * kicker: the model's author/journal line. onStep(step, index): loads step.set into the model.
 */
export function renderPrimer(host, PR, kicker, onStep) {
  if (!PR) { host.hidden = true; host.innerHTML = ''; return; }
  host.hidden = false;
  const others = (PR.others || []).map(o => `<li class="pr-oth">
      <p class="pr-oth-n">${o.name}</p>
      <p class="pr-oth-c">${o.claim}</p>
      <p class="pr-oth-t"><span class="pr-lab">Author’s view:</span> ${o.take}${o.src ? ` <span class="pg">${o.src}</span>` : ''}</p>
    </li>`).join('');
  const terms = (PR.terms || []).map(t => `<div class="pr-term"><dt>${t.term}</dt><dd>${t.plain}</dd></div>`).join('');
  const n = (PR.steps || []).length;
  const steps = (PR.steps || []).map((s, i) => `<li class="pr-step" data-i="${i}">
      <span class="pr-num" aria-hidden="true">${i + 1}</span>
      <div class="pr-step-b">
        <h4>${s.t}</h4>
        <p>${s.text}</p>
        ${s.set ? `<button type="button" class="btn pr-show" data-i="${i}" aria-describedby="pr-step-${i}">Show me</button><span class="sr-only" id="pr-step-${i}">step ${i + 1} of ${n}: loads this setup into the figure and panel</span>` : ''}
      </div>
    </li>`).join('');

  host.innerHTML = `<details class="primer card"${readFlag(OPEN_KEY, true) ? ' open' : ''}>
    <summary>
      <span class="pr-top"><span class="eyebrow">Start here${kicker ? ` · ${esc(kicker)}` : ''}</span><span class="pr-tog" aria-hidden="true"></span></span>
      <span class="pr-qlab">The question</span>
      <h2 class="pr-q">${PR.question}</h2>
    </summary>
    <div class="pr-body">
      <section class="pr-sec"><h3>Why it’s a puzzle</h3><p class="pr-lead">${PR.puzzle}</p></section>
      ${others ? `<section class="pr-sec"><h3>Other explanations</h3>
        <p class="fine">Answers others have given, and what the author says about each. Page numbers refer to the published article.</p>
        <ul class="pr-others">${others}</ul></section>` : ''}
      ${terms ? `<section class="pr-sec"><details class="pr-gloss"${readFlag(GLOSS_KEY, true) ? ' open' : ''}>
        <summary><h3>Words you need</h3><span class="fine">${PR.terms.length} terms, including every symbol on the sliders</span></summary>
        <dl class="pr-terms">${terms}</dl></details></section>` : ''}
      ${steps ? `<section class="pr-sec"><h3>Walk through it</h3>
        <p class="fine">Each “Show me” loads a setup into the figures and the panel below, which then explains what changed.</p>
        <ol class="pr-steps">${steps}</ol></section>` : ''}
      <section class="pr-sec pr-answer"><h3>The answer</h3><p>${PR.answer}</p></section>
      ${PR.limits ? `<section class="pr-sec"><h3>What it leaves out</h3><p>${PR.limits}</p></section>` : ''}
      <p class="pr-now"><b>Now try it yourself:</b> move the sliders in the Parameters panel (to the right of the figures on a wide screen, below them on a phone) and watch the equilibrium respond.</p>
    </div>
  </details>`;

  const det = host.querySelector('details.primer');
  det.addEventListener('toggle', () => writeFlag(OPEN_KEY, det.open));
  const gl = host.querySelector('.pr-gloss');
  if (gl) gl.addEventListener('toggle', () => writeFlag(GLOSS_KEY, gl.open));
  host.querySelectorAll('.pr-show').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.i;
    host.querySelectorAll('.pr-step').forEach(li => {
      const on = +li.dataset.i === i;
      li.classList.toggle('on', on);
      if (on) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    onStep(PR.steps[i], i, n);
  }));
}
