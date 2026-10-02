// Simple / Detailed view (UI streamline #6), Four Capitals' pattern: a body class, remembered in localStorage
// (wrapped in try/catch: private windows and blocked storage just forget). Default Detailed, with a
// "First game? Try Simple" hint until the player picks one. Simple hides the Biddle f_r chart, counter-battery,
// air and gas, the extra filters, range rings, the race clock and unit numbers other than Strength.
const VKEY = 'defense-in-depth:view';
const read = () => { try { return localStorage.getItem(VKEY); } catch { return null; } };
const write = v => { try { localStorage.setItem(VKEY, v); } catch { /* storage blocked: lasts this page */ } };

export const isSimple = () => document.body.classList.contains('dd-simple');

/** Switch the view; `remember` stores it and hides the hint. onChange() redraws. */
export function setView(v, remember = true, onChange = null) {
  document.body.classList.toggle('dd-simple', v === 'simple');
  document.querySelectorAll('.dd-viewsw [data-vm]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vm === v)));
  if (remember) { write(v); const h = document.getElementById('view-hint'); if (h) h.hidden = true; }
  if (onChange) onChange();
}

export function wireView(onChange) {
  const sw = document.querySelector('.dd-viewsw');
  if (!sw) return;
  sw.addEventListener('click', e => { const b = e.target.closest('[data-vm]'); if (b) setView(b.dataset.vm, true, onChange); });
  const saved = read();
  setView(saved === 'simple' ? 'simple' : 'detailed', false);
  const h = document.getElementById('view-hint');
  if (h) h.hidden = !!saved;
}
