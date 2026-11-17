// Simple | Full detail switch. Body class detail-simple / detail-full; choice kept in localStorage 'et-detail'.
// Full detail is the complete page. Simple hides .full-only and closes .cd-fold disclosures.
const KEY = 'et-detail';
let mode = 'simple';
try { if (localStorage.getItem(KEY) === 'full') mode = 'full'; } catch { /* storage blocked: default to Simple */ }

export const detailMode = () => mode;

/** Open or close fold disclosures to match the mode. In Full detail they are open and their summary is hidden. */
export function syncFolds(root = document) {
  root.querySelectorAll('details.cd-fold').forEach(d => { d.open = mode === 'full'; });
}

export function setDetail(m) {
  mode = m === 'full' ? 'full' : 'simple';
  document.body.classList.toggle('detail-simple', mode === 'simple');
  document.body.classList.toggle('detail-full', mode === 'full');
  document.querySelectorAll('[data-detail]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.detail === mode)));
  const how = document.getElementById('how');
  if (how) how.open = mode === 'full';
  syncFolds();
  try { localStorage.setItem(KEY, mode); } catch { /* ignore */ }
}

export function initDetail() {
  document.querySelectorAll('[data-detail]').forEach(b => b.addEventListener('click', () => setDetail(b.dataset.detail)));
  setDetail(mode);
}
