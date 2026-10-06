// Expandable explainers beside treaty names. Each disclosure is a button (aria-expanded, aria-controls) that shows a
// short plain-English note from data/explainers.js with its sources. Open/closed state is kept by key, so panels that
// are redrawn on every slider move keep an explainer open.
import { EXPLAINERS } from '../data/explainers.js';
import { T, esc } from './common.js';

const open = new Set();
const id = key => 'tt-ex-' + key.replace(/[^a-z0-9-]/gi, '-');

/** The small "i" button. `key` must be unique on the page; it ties the button to its text block. */
export function infoBtn(tid, key) {
  if (!EXPLAINERS[tid]) return '';
  const on = open.has(key);
  return `<button type="button" class="tt-info" data-ex="${esc(key)}" aria-expanded="${on}" aria-controls="${id(key)}" aria-label="About the ${esc(T[tid].name)}" title="What is the ${esc(T[tid].short)}?"><span aria-hidden="true">i</span></button>`;
}

/** The explainer text block for `tid`, hidden unless open. `tag` lets a table use a row. */
export function explainHTML(tid, key, tag = 'div', cols = 0) {
  const e = EXPLAINERS[tid];
  if (!e) return '';
  const body = `<p>${esc(e.text)}</p><p class="fine">Source: ${e.src.map(([u, t]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('; ')}.</p>`;
  const hid = open.has(key) ? '' : ' hidden';
  return tag === 'tr'
    ? `<tr class="tt-exrow" id="${id(key)}"${hid}><td colspan="${cols}"><div class="tt-ex">${body}</div></td></tr>`
    : `<div class="tt-ex" id="${id(key)}"${hid}>${body}</div>`;
}

// One delegated handler for every explainer button on the page.
document.addEventListener('click', ev => {
  const b = ev.target.closest('.tt-info[data-ex]');
  if (!b) return;
  const key = b.dataset.ex, on = b.getAttribute('aria-expanded') !== 'true';
  on ? open.add(key) : open.delete(key);
  b.setAttribute('aria-expanded', on);
  const box = document.getElementById(b.getAttribute('aria-controls'));
  if (box) box.hidden = !on;
});
