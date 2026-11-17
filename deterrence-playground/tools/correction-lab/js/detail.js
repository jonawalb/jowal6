// Simple | Full detail switch (house pattern). Body class detail-simple / detail-full; the reader's choice is kept
// in localStorage 'et-detail'. Simple hides .full-only. The walkthrough may switch modes without persisting them.
const KEY = 'et-detail';
let mode = 'simple';
try { if (localStorage.getItem(KEY) === 'full') mode = 'full'; } catch { /* storage blocked: default to Simple */ }

export const detailMode = () => mode;

/** Apply a mode. persist = false is for the walkthrough, which must not overwrite the reader's choice. */
export function setDetail(m, persist = true) {
  mode = m === 'full' ? 'full' : 'simple';
  document.body.classList.toggle('detail-simple', mode === 'simple');
  document.body.classList.toggle('detail-full', mode === 'full');
  document.querySelectorAll('[data-detail]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.detail === mode)));
  if (persist) { try { localStorage.setItem(KEY, mode); } catch { /* ignore */ } }
}

export function initDetail(onChange) {
  document.querySelectorAll('[data-detail]').forEach(b => b.addEventListener('click', () => { setDetail(b.dataset.detail); if (onChange) onChange(); }));
  setDetail(mode, false);
}
