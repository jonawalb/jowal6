// The choice shown when a model is opened: learn about it first, or go straight to it. A native <dialog>
// opened with showModal(), so focus is trapped and Esc closes it; Esc, the close control and a click on the
// backdrop all mean "straight to the model". "Don't ask again" remembers the answer in localStorage.
import { esc } from './ui.js';

const SKIP_KEY = 'gtg-open-choice';   // 'learn' or 'model' once the viewer ticks "Don't ask again"

export function rememberedChoice() {
  try { const v = localStorage.getItem(SKIP_KEY); return v === 'learn' || v === 'model' ? v : null; } catch (e) { return null; }
}
function remember(v) {
  try { localStorage.setItem(SKIP_KEY, v); } catch (e) { /* storage unavailable: ask again next time */ }
}

/** dlg: the <dialog>. onPick(choice) is called with 'learn' or 'model' after the dialog closes. */
export function createChoice(dlg, onPick) {
  let pick = 'model';
  dlg.addEventListener('close', () => {
    if (!pick) return;                                   // dismissed by the page itself (see dismiss)
    if (dlg.querySelector('#ch-skip')?.checked) remember(pick);
    onPick(pick);
  });
  dlg.addEventListener('cancel', () => { pick = 'model'; });                     // Esc
  dlg.addEventListener('click', e => { if (e.target === dlg) { pick = 'model'; dlg.close(); } });   // backdrop

  function open(card, question) {
    pick = 'model';
    dlg.innerHTML = `<div class="ch-in">
        <button type="button" class="ch-x" aria-label="Close and go to the model">×</button>
        <p class="eyebrow">You picked</p>
        <h2 id="ch-title">${esc(card.title)}</h2>
        <p class="ch-who">${esc(card.who)}</p>
        <p class="ch-q" id="ch-q">${question || esc(card.blurb)}</p>
        <div class="ch-btns">
          <button type="button" class="btn solid" data-pick="learn">Learn about this model first</button>
          <button type="button" class="btn" data-pick="model">Take me straight to the model</button>
        </div>
        <label class="ch-skip"><input type="checkbox" id="ch-skip"> Don’t ask again</label>
      </div>`;
    dlg.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => { pick = b.dataset.pick; dlg.close(); }));
    dlg.querySelector('.ch-x').addEventListener('click', () => { pick = 'model'; dlg.close(); });
    dlg.showModal();
    dlg.querySelector('[data-pick="learn"]').focus();
  }
  /** Close without acting on it, e.g. when the address changes underneath. */
  function dismiss() { if (dlg.open) { pick = null; dlg.close(); } }
  return { open, dismiss };
}
