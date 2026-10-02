// Stance per sea area, set on the map: a click, tap, Enter or Space on an area opens a small popover with
// Defend / Contest / Attack (each with its fuel a month and what it means) and your formations there. The Forces
// step shows a compact summary whose buttons open the same popover. Same choice object as before
// (choice.orders.stance), so the rules and costs are unchanged.
import { SEA, AREA_LABEL, AREA_TEXT, STANCES, STANCE_LABEL, STANCE_TEXT } from '../data/theater.js';
import { FBY, TYPES, UPKEEP } from '../data/formations.js';
import { ZONE } from './view.js';
import { isPhone, setPhoneTab } from './steps.js';

const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n1 = x => { const v = Math.round(x * 10) / 10; return Object.is(v, -0) ? 0 : v; };
let getG = () => null, repaint = () => {}, open = null;

/** Sea areas where you can set a stance (Taiwan: only where its navy is or will be). */
export function stanceAreas(G) {
  const me = G.player, t = G.L.trial;
  return SEA.filter(a => me !== 'tw' || (t.f.tw[a] || 0) > 0 || (G.s.f.tw[a] || 0) > 0);
}
const stanceOf = (G, a) => G.choice.orders.stance[a] || G.s.stance[G.player][a];
const here = (G, a) => G.L.trial.units[G.player].filter(u => u.at === a && u.str > 0);
const selfDef = G => G.player === 'jp' && G.s.rung >= 3 && !G.s.jpDeclared;   // Japan before its survival declaration (js/politics.js)

/** Labels for the map: { area: 'Contest' } for the areas you can set. */
export const zoneStances = G => Object.fromEntries(stanceAreas(G).map(a => [a, STANCE_LABEL[stanceOf(G, a)]]));

/** Compact read-only summary for the Forces step; each area opens its popover on the map. */
export function stanceSummary(G) {
  const areas = stanceAreas(G);
  if (!areas.length) return '';
  return `<div class="k4-stsum"><p class="k4-sub">Stance by sea area <span class="muted">(set on the map)</span></p><div class="k4-stchips">${areas.map(a => {
    const k = here(G, a).length, st = stanceOf(G, a), fuel = k * UPKEEP.fuel[st];
    return `<button type="button" class="k4-stchip" data-openarea="${a}" aria-label="${AREA_LABEL[a]}: ${STANCE_LABEL[st]}, ${k ? `${n1(fuel)} fuel a month` : 'no formations'}. Change on the map">
      <b>${AREA_LABEL[a]}</b> ${STANCE_LABEL[st]}<small>${k ? `${n1(fuel)} fuel/mo` : '–'}</small></button>`;
  }).join('')}</div></div>`;
}

function popHTML(G, a) {
  const cur = stanceOf(G, a), us = here(G, a), k = us.length, left = Math.max(0, G.L.rows.fuel.left), sd = selfDef(G);
  const opts = STANCES.map(x => {
    const d = k * (UPKEEP.fuel[x] - UPKEEP.fuel[cur]), short = x !== cur && d > left + 1e-9, off = sd && x !== 'defend';
    return `<button type="button" data-stance="${a}" data-v="${x}" aria-pressed="${cur === x}" ${off ? 'disabled title="Needs a survival-threatening situation declaration first"' : `title="${esc(STANCE_TEXT[x])}"`}>
      <b>${STANCE_LABEL[x]}</b><small>${k ? `${n1(k * UPKEEP.fuel[x])} fuel/mo` : 'no upkeep'}${short ? ' · <span class="bad">can’t afford</span>' : ''}</small></button>`;
  }).join('');
  const units = us.map(u => { const f = FBY[u.id]; return `<li><span title="${esc(TYPES[f.type].text)}">${esc(f.name)}</span> <span class="muted">${TYPES[f.type].label} · str ${n1(u.str)} · ready ${u.ready}</span></li>`; }).join('');
  return `<div class="k4-poph"><b id="pop-t">${AREA_LABEL[a]}: your stance</b><button type="button" class="x" data-popclose aria-label="Close">×</button></div>
    <p class="fine k4-popx">${esc(AREA_TEXT[a])}</p>
    <div class="k4-popseg" role="group" aria-labelledby="pop-t">${opts}</div>
    <p class="fine"><b>${STANCE_LABEL[cur]}:</b> ${esc(STANCE_TEXT[cur])}</p>
    ${sd ? '<p class="fine bad">No survival-threatening situation declared: your forces hold to Defend.</p>' : ''}
    <p class="k4-sub">Your formations here <span class="muted">(after this month’s orders)</span></p>
    ${units ? `<ul class="k4-popu">${units}</ul>` : '<p class="fine">None. A stance only costs fuel where you have formations.</p>'}`;
}

function place(a) {
  const pop = $('area-pop'), svg = $('theatre'), wrap = pop.parentElement;
  const r = svg.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
  const sc = Math.min(r.width / 640, r.height / 400), ox = r.left - wr.left + (r.width - 640 * sc) / 2, oy = r.top - wr.top + (r.height - 400 * sc) / 2;
  const [zx, zy] = ZONE[a], w = Math.min(300, wr.width - 16);
  pop.style.width = w + 'px';
  const x = ox + zx * sc, y = oy + zy * sc;
  pop.style.left = Math.max(8, Math.min(wr.width - w - 8, x - w / 2)) + 'px';
  const h = pop.offsetHeight, below = y + 38 * sc;
  pop.style.top = Math.max(8, below + h <= wr.height - 8 ? below : y - 38 * sc - h >= 8 ? y - 38 * sc - h : wr.height - h - 8) + 'px';
}

/** Open the popover for area `a`; `focus` puts keyboard focus on its selected stance. */
export function openPop(a, focus = true) {
  const G = getG(); if (!G || !stanceAreas(G).includes(a)) return;
  open = a;
  const pop = $('area-pop');
  pop.innerHTML = popHTML(G, a); pop.hidden = false; pop.setAttribute('aria-labelledby', 'pop-t');
  document.querySelectorAll('#theatre [data-area]').forEach(z => z.setAttribute('aria-expanded', String(z.dataset.area === a)));
  place(a);
  if (focus) pop.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
}
export function closePop(refocus = false) {
  if (!open) return;
  const a = open; open = null; $('area-pop').hidden = true;
  document.querySelectorAll('#theatre [data-area]').forEach(z => z.setAttribute('aria-expanded', 'false'));
  if (refocus) document.querySelector(`#theatre [data-area="${a}"]`)?.focus();
}
/** After a repaint: redraw the open popover's content (the map was redrawn too). */
export function refreshPop() {
  if (!open) return;
  const f = document.activeElement?.closest?.('#area-pop [data-v]')?.dataset.v;
  openPop(open, false);
  if (f) $('area-pop').querySelector(`[data-v="${f}"]`)?.focus({ preventScroll: true });
}

export function wireAreaPop(get, rep) {
  getG = get; repaint = rep;
  const svg = $('theatre'), pop = $('area-pop');
  const zone = e => e.target.closest?.('[data-area]');
  svg.addEventListener('click', e => { const z = zone(e); if (!z) return; if (open === z.dataset.area) closePop(); else openPop(z.dataset.area, e.detail === 0); });
  svg.addEventListener('keydown', e => { const z = zone(e); if (z && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openPop(z.dataset.area, true); } });
  pop.addEventListener('click', e => {
    if (e.target.closest('[data-popclose]')) return closePop(true);
    const b = e.target.closest('[data-stance]'); if (!b || b.disabled) return;
    const G = getG(); G.choice.orders.stance[b.dataset.stance] = b.dataset.v; repaint();
    pop.querySelector(`[data-v="${b.dataset.v}"]`)?.focus({ preventScroll: true });
  });
  pop.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closePop(true); } });
  document.addEventListener('pointerdown', e => { if (open && !pop.contains(e.target) && !zone(e) && !e.target.closest('[data-openarea]')) closePop(); }, true);
  $('forces').addEventListener('click', e => {
    const b = e.target.closest('[data-openarea]'); if (!b) return;
    if (isPhone()) setPhoneTab('map');
    $('pane-map').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    openPop(b.dataset.openarea, true);
  });
  addEventListener('resize', () => { if (open) place(open); });
}
