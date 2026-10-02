// Map popover (UI streamline #10): tapping a unit opens its orders next to it on the map (a bottom sheet on
// phones). It closes on ×, Escape or a tap outside; a tap on the map still gives the order (then it closes, the
// selection stays). While it is open the side panel (#sel) hides its copy, so the orders never show twice.
// Keyboard: it opens with focus on its first control and Escape returns focus to where you were.
import { S, $, narrow } from './store.js';

let api = null, openId = null, back = null, panning = false;

/** api: { content(id) → HTML, onClick(e), onChange(e) }. */
export function wireUnitPop(a) {
  api = a;
  const pop = $('upop');
  pop.addEventListener('click', e => {
    if (e.target.closest('[data-popclose]')) { closeUnitPop(true); return; }
    api.onClick(e);
  });
  pop.addEventListener('change', e => api.onChange && api.onChange(e));
  pop.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closeUnitPop(true); } });
  document.addEventListener('pointerdown', e => {
    if (!openId || pop.contains(e.target) || e.target.closest('.dd-tip, #tour, #map, #tree, #sheet')) return;
    closeUnitPop(false);
  }, true);
  addEventListener('resize', () => place());
  addEventListener('scroll', () => place(), { passive: true });
}

export const popOpen = () => !!openId;
export const popUnit = () => openId;

/** Open (or move) the popover for unit `id`; `focus` puts keyboard focus inside. */
export function openUnitPop(id, focus = false) {
  if (!api) return;
  if (!openId) back = document.activeElement;
  openId = id;
  render();
  if (focus) $('upop').querySelector('button:not([aria-disabled="true"]), select')?.focus({ preventScroll: true });
}

export function closeUnitPop(refocus = false) {
  if (!openId) return;
  openId = null;
  $('upop').hidden = true; $('upop').innerHTML = '';
  document.body.classList.remove('dd-popopen');
  if (refocus && back && back.isConnected) back.focus({ preventScroll: true });
  back = null;
  if (S.ui.redraw) S.ui.redraw();
}

/** After a redraw: refresh the open popover (the unit may have moved or died). */
export function refreshUnitPop() {
  if (!openId) return;
  const keep = document.activeElement && $('upop').contains(document.activeElement) ? document.activeElement : null;
  const sel = keep ? [...Object.entries(keep.dataset)][0] : null;
  if (!render()) return;
  if (sel) $('upop').querySelector(`[data-${sel[0].replace(/[A-Z]/g, c => '-' + c.toLowerCase())}="${sel[1]}"]`)?.focus({ preventScroll: true });
}

function render() {
  const html = api.content(openId);
  if (!html) { openId = null; $('upop').hidden = true; document.body.classList.remove('dd-popopen'); return false; }
  const pop = $('upop');
  pop.innerHTML = `<div class="dd-poph"><span class="dd-popt">Orders</span><button type="button" class="x" data-popclose aria-label="Close the orders">×</button></div><div class="dd-popb">${html}</div>`;
  pop.hidden = false;
  document.body.classList.add('dd-popopen');
  place();
  return true;
}

/** Next to the unit's chip on the map (desktop); a bottom sheet on phones (CSS). */
export function place() {
  const pop = $('upop');
  if (!openId || pop.hidden) return;
  if (narrow()) {   // bottom sheet: keep the unit in view above it
    pop.style.left = ''; pop.style.top = ''; pop.style.width = '';
    const chip = document.querySelector(`#map [data-u="${CSS.escape(openId)}"]`), top = pop.getBoundingClientRect().top;
    if (chip && api.pan && !panning) { const r = chip.getBoundingClientRect(); if (r.bottom > top - 8 && r.height) {
      panning = true;
      try { api.pan(0, top - 12 - r.bottom); const r2 = chip.isConnected ? chip.getBoundingClientRect() : r; if (r2.bottom > top - 8) scrollBy(0, r2.bottom - top + 12); } finally { panning = false; }
    } }
    return;
  }
  const chip = document.querySelector(`#map [data-u="${CSS.escape(openId)}"]`) || $('box');
  const r = chip.getBoundingClientRect(), box = $('box').getBoundingClientRect();
  const w = Math.min(330, innerWidth - 24);
  pop.style.width = `${w}px`;
  const h = pop.offsetHeight, m = 8;
  // Level with the unit, but over the far half of the map, so the sectors around the unit (where moves, lanes
  // and local counterattacks go) stay free to tap.
  const leftHalf = r.left + r.width / 2 < box.left + box.width / 2;
  let x = leftHalf ? box.right - w - m : box.left + m;
  x = Math.max(m, Math.min(innerWidth - w - m, x));
  let y = Math.max(m, Math.min(innerHeight - h - m, r.top - 10));
  if (chip === $('box')) y = Math.max(m, Math.min(innerHeight - h - m, box.top + 10));
  pop.style.left = `${Math.round(x)}px`; pop.style.top = `${Math.round(y)}px`;
}
