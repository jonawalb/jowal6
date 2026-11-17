// Simple | Full detail switch. Sets body.detail-simple or body.detail-full; CSS hides .full-only in
// Simple mode. The choice is kept in localStorage key "et-detail" when storage is available.
const KEY = 'et-detail';
let onChange = () => {};

export function getDetail() { return document.body.classList.contains('detail-full') ? 'full' : 'simple'; }

export function setDetail(mode, save = true) {
  const m = mode === 'full' ? 'full' : 'simple';
  document.body.classList.toggle('detail-full', m === 'full');
  document.body.classList.toggle('detail-simple', m === 'simple');
  document.querySelectorAll('#detail [data-m]').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m));
  if (save) { try { localStorage.setItem(KEY, m); } catch { /* storage unavailable */ } }
  onChange(m);
}

export function initDetail(cb) {
  if (cb) onChange = cb;
  let m = 'simple';
  try { if (localStorage.getItem(KEY) === 'full') m = 'full'; } catch { /* storage unavailable */ }
  document.querySelectorAll('#detail [data-m]').forEach(b => b.addEventListener('click', () => setDetail(b.dataset.m)));
  setDetail(m, false);
}
