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
    // 2026-10-04 fix: redraw only after the press is over. Redrawing on pointerdown replaced the button under the
    // pointer (e.g. "Lay lane" in the plan pane), so the click never arrived and the first tap did nothing.
    closeUnitPop(false, true);
    const later = () => { removeEventListener('pointerup', later, true); removeEventListener('pointercancel', later, true); setTimeout(() => S.ui.redraw && S.ui.redraw(), 0); };
    addEventListener('pointerup', later, true); addEventListener('pointercancel', later, true);
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

export function closeUnitPop(refocus = false, noRedraw = false) {
  if (!openId) return;
  openId = null;
  $('upop').hidden = true; $('upop').innerHTML = '';
  document.body.classList.remove('dd-popopen');
  if (refocus && back && back.isConnected) back.focus({ preventScroll: true });
  back = null;
  if (!noRedraw && S.ui.redraw) S.ui.redraw();
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
    if (chip && api.pan && !panning && chip.getBoundingClientRect().height) {
      // 2026-10-04 fix: keep the unit inside the VISIBLE part of the map, between the sticky order bar (or the map's
      // own top edge) and the sheet. Panning alone used to push it above the map's top edge, out of sight, when
      // the map itself started low on the screen (the planning screen on a phone).
      panning = true;
      try {
        const bar = document.querySelector('.dd-obar'), barB = bar && !bar.hidden ? bar.getBoundingClientRect().bottom : 0;
        const boxT = () => Math.max(barB, $('box').getBoundingClientRect().top) + 8, lo = () => top - 12;
        let r = chip.getBoundingClientRect();
        if (boxT() + r.height > lo()) { scrollBy(0, $('box').getBoundingClientRect().top - barB - 8); r = chip.getBoundingClientRect(); }   // the map starts too low
        if (r.bottom > lo()) api.pan(0, lo() - r.bottom);
        else if (r.top < boxT()) api.pan(0, boxT() - r.top);
        r = chip.isConnected ? chip.getBoundingClientRect() : r;
        if (r.bottom > lo()) scrollBy(0, r.bottom - lo());
        else if (r.top < Math.max(barB, 0) + 8) scrollBy(0, r.top - barB - 8);
      } finally { panning = false; }
    }
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
  else {
    // 2026-10-04 fix: on a narrow map (the Learn to play board) the far half still covered the boxes next to the
    // unit, where a lane, a move or a local counterattack must be tapped. Keep clear of the unit's own box and its
    // neighbours: beside them if there is room, else above or below them.
    const u = S.g && S.g.ix[openId] != null ? S.g.units[S.g.ix[openId]] : null;
    const at = u ? (S.g.phase === 'plan' && S.plan ? S.plan.place[u.id] : u.sec) : null;
    const cell = at != null && at >= 0 ? document.querySelector(`#map [data-s="${at}"]`) : null;
    const sec = cell ? cell.getBoundingClientRect() : null, c = sec && sec.width ? sec.width : r.width * 2.2;
    const cx = sec && sec.width ? sec.left + sec.width / 2 : r.left + r.width / 2, cy = sec && sec.width ? sec.top + sec.height / 2 : r.top + r.height / 2;
    const nb = { left: cx - 1.5 * c, right: cx + 1.5 * c, top: cy - 1.5 * c, bottom: cy + 1.5 * c };
    const hits = (px, py) => !(px + w < nb.left || px > nb.right || py + h < nb.top || py > nb.bottom);
    if (hits(x, y)) {
      const fit = (px, py) => px >= m && px + w <= innerWidth - m && py >= m && py + h <= innerHeight - m;
      const tries = [[nb.right + m, y], [nb.left - w - m, y], [x, nb.bottom + m], [x, nb.top - h - m]];
      const ok = tries.find(([px, py]) => fit(px, py) && !hits(px, py));
      if (ok) [x, y] = ok;
    }
  }
  pop.style.left = `${Math.round(x)}px`; pop.style.top = `${Math.round(y)}px`;
}
