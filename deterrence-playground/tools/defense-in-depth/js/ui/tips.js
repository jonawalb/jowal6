// "i" tooltips (copied from tools/four-capitals/js/tips.js, dd- prefix): one floating panel for every info
// button (.dd-info with data-tip). Shows on hover and keyboard focus on desktop; a tap pins it open (phones);
// Escape, a tap elsewhere or scrolling closes it. Kept inside the viewport so it never scrolls sideways.
// Tip text comes from js/tips-text.js builders ({ title, lines, notes }), computed from the player's picture.
import { TIP_BUILDERS } from '../tips-text.js';

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** HTML for a tip { title, lines, notes }, to put (escaped) in a data-tip attribute. */
export const tipHTML = t => `<b>${esc(t.title)}</b>${t.lines.length ? `<ul>${t.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}${(t.notes || []).map(n => `<p>${esc(n)}</p>`).join('')}`;
/** An info button carrying `tip`; `label` is what a screen reader hears. */
export const infoBtn = (tip, label = tip.title) => `<button type="button" class="dd-info" aria-label="${esc('About: ' + label)}" aria-expanded="false" data-tip="${esc(tipHTML(tip))}">i</button>`;
/** QA fix: the "i" for a key moment / report line that shows a percentage (a stalled assault's gauge, already in %). */
export const momentInfo = m => (m && m.gauge != null ? infoBtn({ title: `Assault at ${m.gauge}% of the strength needed to advance`,
  lines: ['Your assaulting strength (less lost cohesion) divided by the strength needed: k1 = 2.5 × (1 − the holders’ exposure f_e) × their strength (less suppression) (Biddle eq. A.6, p. 212; Table A.1, p. 218)', 'The balance slider scales the strength needed'],
  notes: ['Above 100% the assault takes the sector; below it, it stalls and the men may go to ground. Shown between 0% and 300%.'] }, 'Stalled assault') : '');
/** A percentage with its "i": builder name from TIP_BUILDERS and its arguments. */
export const pctTip = (text, kind, args) => `<span class="dd-pct">${text}${infoBtn(TIP_BUILDERS[kind](args))}</span>`;

let wired = false;
export function wireTips() {
  if (wired) return;
  wired = true;
  const box = document.createElement('div');
  box.id = 'dd-tip'; box.className = 'dd-tip'; box.setAttribute('role', 'tooltip'); box.hidden = true;
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
    b.setAttribute('aria-describedby', 'dd-tip'); b.setAttribute('aria-expanded', 'true');
    place(b);
  };
  const hide = () => {
    if (cur) { cur.removeAttribute('aria-describedby'); cur.setAttribute('aria-expanded', 'false'); }
    cur = null; pinned = false; box.hidden = true;
  };
  const btn = e => e.target.closest?.('.dd-info[data-tip]');
  document.addEventListener('pointerover', e => { const b = btn(e); if (b && e.pointerType === 'mouse' && !pinned) show(b, false); });
  document.addEventListener('pointerout', e => { const b = btn(e); if (b && b === cur && !pinned && !b.contains(e.relatedTarget)) hide(); });
  document.addEventListener('focusin', e => { const b = btn(e); if (b && !pinned) show(b, false); });
  document.addEventListener('focusout', e => { const b = btn(e); if (b && b === cur && !pinned) hide(); });
  document.addEventListener('click', e => {
    const b = btn(e);
    if (b) { e.preventDefault(); e.stopPropagation(); if (cur === b && pinned) hide(); else show(b, true); return; }
    if (cur && !box.contains(e.target)) hide();
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && cur) { const b = cur; hide(); b.focus(); e.stopPropagation(); } }, true);
  addEventListener('scroll', () => { if (cur) { if (pinned) place(cur); else hide(); } }, { passive: true });
  addEventListener('resize', () => { if (cur) place(cur); });
}
