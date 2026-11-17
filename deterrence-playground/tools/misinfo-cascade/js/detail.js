// Simple | Full detail switch (house pattern). Body class detail-simple / detail-full; choice kept in localStorage 'et-detail'.
// Simple hides .full-only. The walkthrough never changes or stores the mode.
const KEY = 'et-detail';
let mode = 'simple';
try { if (localStorage.getItem(KEY) === 'full') mode = 'full'; } catch { /* storage blocked: default to Simple */ }

export const detailMode = () => mode;

export function setDetail(m) {
  mode = m === 'full' ? 'full' : 'simple';
  document.body.classList.toggle('detail-simple', mode === 'simple');
  document.body.classList.toggle('detail-full', mode === 'full');
  document.querySelectorAll('[data-detail]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.detail === mode)));
  try { localStorage.setItem(KEY, mode); } catch { /* ignore */ }
}

export function initDetail() {
  document.querySelectorAll('[data-detail]').forEach(b => b.addEventListener('click', () => setDetail(b.dataset.detail)));
  setDetail(mode);
}
