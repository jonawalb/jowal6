// Info tooltips: one floating panel for every info button (.k4-info with data-tip). Shows on hover and keyboard
// focus on desktop; a tap or click pins it open (phones), and Escape, a tap elsewhere or scrolling closes it.
// Positioned inside the viewport so it never causes sideways scrolling.
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** HTML for a tip { title, lines, notes }, to put (escaped) in a data-tip attribute. */
export const tipHTML = t => `<b>${esc(t.title)}</b>${t.lines.length ? `<ul>${t.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}${t.notes.map(n => `<p>${esc(n)}</p>`).join('')}`;
/** An info button carrying `tip`; `label` is what a screen reader hears, `text` what shows on the button. */
export const infoBtn = (tip, label, text = 'i', cls = '') => `<button type="button" class="k4-info ${cls}" aria-label="${esc(label)}" aria-expanded="false" data-tip="${esc(tipHTML(tip))}">${text}</button>`;

export function wireTips() {
  const box = document.createElement('div');
  box.id = 'k4-tip'; box.className = 'k4-tip'; box.setAttribute('role', 'tooltip'); box.hidden = true;
  document.body.appendChild(box);
  let cur = null, pinned = false;
  const place = b => {
    const r = b.getBoundingClientRect(), w = Math.min(320, innerWidth - 16);
    box.style.width = w + 'px';
    box.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    const below = r.bottom + 6, h = box.offsetHeight;
    box.style.top = (below + h > innerHeight - 8 && r.top - 6 - h > 8 ? r.top - 6 - h : below) + 'px';
  };
  const show = (b, pin) => {
    if (cur && cur !== b) hide();
    cur = b; pinned = pin;
    box.innerHTML = b.dataset.tip; box.hidden = false;
    b.setAttribute('aria-describedby', 'k4-tip'); b.setAttribute('aria-expanded', 'true');
    place(b);
  };
  const hide = () => {
    if (cur) { cur.removeAttribute('aria-describedby'); cur.setAttribute('aria-expanded', 'false'); }
    cur = null; pinned = false; box.hidden = true;
  };
  const btn = e => e.target.closest?.('.k4-info[data-tip]');
  document.addEventListener('pointerover', e => { const b = btn(e); if (b && e.pointerType === 'mouse' && !pinned) show(b, false); });
  document.addEventListener('pointerout', e => { const b = btn(e); if (b && b === cur && !pinned && !b.contains(e.relatedTarget)) hide(); });
  document.addEventListener('focusin', e => { const b = btn(e); if (b && !pinned) show(b, false); });
  document.addEventListener('focusout', e => { const b = btn(e); if (b && b === cur && !pinned) hide(); });
  document.addEventListener('click', e => {
    const b = btn(e);
    if (b) { e.preventDefault(); e.stopPropagation(); if (cur === b && pinned) hide(); else show(b, true); return; }
    if (cur && !box.contains(e.target)) hide();
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && cur) { const b = cur; hide(); b.focus(); } });
  addEventListener('scroll', () => { if (cur) { if (pinned) place(cur); else hide(); } }, { passive: true });
  addEventListener('resize', () => { if (cur) place(cur); });
}
