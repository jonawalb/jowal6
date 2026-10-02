// The play screen's wiring (SPEC §8.2–§8.6): the map and its layer chips, zoom, the sector sheet, selection,
// taps on sectors (planning and battle), End hour with the TL;DR, phone tabs, start tips, and the hotkeys.
import { TYPES } from '../../data/units.js';
import { advance, undoLast, issue } from '../engine.js';
import { alive, isBattery } from '../forces.js';
import { tldr } from '../tldr.js';
import { S, $, esc, narrow, unitOf, say } from './store.js';
import { createMap, setGame, render, focusSector, stepSector, cellXY, CELL } from './map.js';
import { createMinimap } from './mapview.js';
import { liveView, planView, reviewView } from './view.js';
import { renderTree, renderFilters, wireUnits, filtered, formations, reveal } from './units-panel.js';
import { selPanel, feedHTML } from './panel.js';
import { renderBar } from './orders-bar.js';
import { battleTap, defaultTool, toolHint, setAll, launchCounterstroke, fmnPlan } from './actions.js';
import { renderPlan, planTap, planUnitPanel, planClick, planChange, planStepId } from './plan-ui.js';
import { FILTERS, matches } from './filters.js';
import { PRIMARY, moreLayers, defaultLayers, effectiveLayers, legendItems, STEP_LAYERS, LAYERS } from './layers.js';
import { isSimple } from './viewmode.js';
import { wireUnitPop, openUnitPop, closeUnitPop, refreshUnitPop, popOpen, place as placePop } from './unit-pop.js';
import { renderTip, showTips as tipsOn, wireTip } from './ctip.js';

let map = null, mini = null, moreOpen = false;

export function initPlay(hooks) {
  map = createMap($('map'), { onSector, onUnit, onKey, onZoom: () => { if (mini) mini.draw(); placePop(); } });
  mini = createMinimap($('box'), map);
  mini.show(false);
  $('layerbar').addEventListener('click', e => {
    if (e.target.closest('[data-more]')) { moreOpen = !moreOpen; renderLayerbar(); $('layerbar').querySelector('[data-more]')?.focus(); return; }
    const b = e.target.closest('[data-layer]'); if (!b) return;
    const k = b.dataset.layer; if (S.layers.has(k)) S.layers.delete(k); else S.layers.add(k);
    hooks.redraw(); $('layerbar').querySelector(`[data-layer="${k}"]`)?.focus();
  });
  $('legline').addEventListener('click', e => { if (e.target.closest('[data-legkey]')) { const f = $('legfull'); f.hidden = !f.hidden; e.target.closest('[data-legkey]').setAttribute('aria-expanded', String(!f.hidden)); } });
  $('box').querySelector('.dd-zoom').addEventListener('click', e => { const b = e.target.closest('[data-zoom]'); if (b) zoom(b.dataset.zoom); });
  wireUnits($('tree'), $('filters'), select);
  $('sel').addEventListener('click', selClick);
  $('sel').addEventListener('change', selChange);
  wireUnitPop({ content: popContent, pan: (dx, dy) => map.mv.pan(dx, dy), onClick: e => (S.g && S.g.phase === 'plan' ? planClick(e) : selClick(e)), onChange: e => (S.g && S.g.phase === 'plan' ? planChange(e) : selChange(e)) });
  wireTip();
  $('sheet').addEventListener('click', sheetClick);
  document.querySelectorAll('.dd-tabs [data-tab]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  matchMedia('(max-width: 640px)').addEventListener('change', () => { placeBits(); S.ui.redraw(); });
}
const selChange = e => { const s = e.target.closest('[data-ds]'); if (s && S.g) { issue(S.g, { kind: 'ds', unit: s.dataset.ds, fmn: s.value || '' }); S.ui.saved(); S.ui.redraw(); } };

/** The popover's content: battle orders, or the planning tools for one unit. Empty = nothing to show. */
function popContent(id) {
  const g = S.g;
  if (!g || g.over || !S.sel.includes(id)) return '';
  if (g.phase === 'plan') return S.sel.length === 1 ? planUnitPanel(unitOf(id)) : '';
  const u = unitOf(id);
  return u && alive(u) && u.sec >= 0 && !S.selFmn ? selPanel() : '';
}

/** Layer chips: the side's two primary layers, the rest under "More layers" (#11). */
function renderLayerbar() {
  const chip = ([k, t]) => `<button type="button" class="dd-chip" data-layer="${k}" aria-pressed="${S.layers.has(k)}">${t}</button>`;
  const prim = PRIMARY[S.me].map(k => LAYERS.find(x => x[0] === k));
  const more = moreLayers(S.me, isSimple()), on = more.filter(([k]) => S.layers.has(k)).length;
  $('layerbar').innerHTML = `${prim.map(chip).join('')}<span class="dd-more"><button type="button" class="dd-chip" data-more aria-expanded="${moreOpen}">More layers${on ? ` (${on} on)` : ''} <span aria-hidden="true">▾</span></button>
    ${moreOpen ? `<span class="dd-more-list" role="group" aria-label="More map layers">${more.map(chip).join('')}</span>` : ''}</span>`;
}

/** The legend line: only the symbols of layers that are on, and an "i" for the full key (#11). */
function renderLegend(layers) {
  $('legline').innerHTML = `${legendItems(layers).map(([, c, t]) => `<span><i class="${c}">${c === 'lg-wire' ? '×××' : c === 'lg-idle' ? '!' : ''}</i>${t}</span>`).join('')}
    <button type="button" class="dd-info" data-legkey aria-expanded="${!$('legfull').hidden}" aria-controls="legfull" aria-label="The full map key">i</button>`;
}

/** A new game on the board: draw its ground, turn the board if you attack, reset the view. */
export function newBoard() {
  setGame(map, S.g, S.me);
  const big = S.g.scale === 'c' || S.g.scale === 'a';   // the minimap is for the Corps and Army maps only
  mini.show(big && !narrow());
  $('box').querySelector('[data-zoom="mini"]').hidden = !big;
  S.sel = []; S.selFmn = null; S.tool = null; S.filter = 'idle'; S.focusSec = -1; S.openHours.clear(); S.planStep = 1;
  S.layers = defaultLayers(S.me); moreOpen = false;
  closeUnitPop(false);
  focusSector(map, S.me === 'def' ? 0 : map.G.n - 1, false);
  placeBits();
}

/** Tips (T): the one-line contextual tip above the map (#13). */
export function showTips(on = true) { tipsOn(on); }
function placeBits() {
  if (narrow()) $('box').after($('sel'));
  else $('ucol').prepend($('sel'));
}

export function setTab(t) {
  S.tab = t;
  document.body.dataset.tab = t;
  document.querySelectorAll('.dd-tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  if (narrow() && S.g && $('play').getBoundingClientRect().top < 0) $('play').scrollIntoView({ block: 'start', behavior: 'auto' });
  if (map && map.G && t === 'map') requestAnimationFrame(() => {
    if (map.mv.k * map.mv.W < 40) map.mv.fit(); else map.mv.apply();
    const u = S.sel.length === 1 ? unitOf(S.sel[0]) : null, s = u && S.g ? (S.g.phase === 'plan' ? S.plan.place[u.id] : u.sec) : -1;
    if (s != null && s >= 0) map.mv.ensure(...cellXY(map, s), CELL);   // the selected unit, in view on the Map tab
    placePop();
  });
}

/** Draw the map for the current phase (or a review hour). */
export function drawMap() {
  const g = S.g;
  if (!g) return;
  const force = g.phase === 'plan' ? STEP_LAYERS[planStepId()] || [] : [];
  S.drawLayers = effectiveLayers(S.layers, { simple: isSimple(), force });
  let v;
  if (g.phase === 'plan') v = planView(g, S.me, S.plan, { hint: [] });
  else if (g.over && S.aarHour != null) v = reviewView(g, S.me, S.aarHour, S.view);
  else v = liveView(g, S.me, { hint: toolHint(g) });
  if (v) render(map, v);
  renderLayerbar(); renderLegend(S.drawLayers);
  document.body.classList.toggle('dd-armed', !!S.tool);
}

export function drawPanels() {
  const g = S.g, planning = g.phase === 'plan';
  renderTree($('tree'));
  renderFilters($('filters'));
  refreshUnitPop();
  $('sel').innerHTML = planning || popOpen() ? '' : selPanel();
  if (planning) renderPlan();
  else $('feed').innerHTML = feedHTML();
  renderBar();
  renderTip();
}

/** Select units (ids) or a formation (fmn); add: Shift-click adds to (or removes from) the selection. */
export function select(ids, fmn = null, add = false, opts = {}) {
  const g = S.g;
  if (!g || g.over) return;
  if (add && !fmn) {
    const set = new Set(S.selFmn ? [] : S.sel);
    for (const id of ids) { if (set.has(id)) set.delete(id); else set.add(id); }
    S.sel = [...set]; S.selFmn = null;
  } else { S.sel = ids; S.selFmn = fmn; }
  S.tool = g.phase === 'battle' ? defaultTool(g, S.sel, S.selFmn) : null;
  const u = S.sel.length === 1 ? unitOf(S.sel[0]) : null;
  if (S.selFmn) say(`<b>${esc(g.fmns[S.selFmn].name)}</b>: ${S.sel.length} units selected. ${g.phase === 'plan' ? 'Tap a sector to place them there.' : 'Tap a sector to move the formation, or pick another order in the panel.'}`);
  else if (u) say(`<b>${esc(u.name)}</b> selected. ${g.phase === 'plan' ? 'Tap a sector to place it.' : isBattery(u) ? 'Choose a mission, then tap the target sector.' : 'Tap the sector where it should go.'}`);
  else if (S.sel.length) say(`${S.sel.length} units selected.${S.sel.length === 2 && g.phase === 'battle' ? ' Press Leapfrog (L) to pair them.' : ''}`);
  if (u) { reveal(u.id); const s = g.phase === 'plan' ? S.plan.place[u.id] : u.sec; if (s >= 0) map.mv.ensure(...cellXY(map, s), CELL); }
  const anchor = !S.selFmn && S.sel.length && S.sel.length <= 2 ? S.sel[S.sel.length - 1] : null;
  if (anchor && (g.phase === 'plan' ? S.sel.length === 1 : true)) openUnitPop(anchor, !!opts.focus); else closeUnitPop(false);
  S.ui.redraw();
}

function onUnit(id, e) {
  const g = S.g;
  if (!g || g.over) return;
  const u = unitOf(id);
  const sec = g.phase === 'plan' ? S.plan.place[id] : u && u.sec;
  if (S.tool && !['move', 'place'].includes(S.tool.kind) && sec != null) { onSector(sec, e); return; }
  if (S.sel.includes(id) && !e.shiftKey && S.sel.length === 1 && sec != null) { onSector(sec, e); return; }
  select([id], null, e.shiftKey || e.metaKey || e.ctrlKey || !!S.multi);
}

/** Your units standing in a sector (planning: where the plan puts them). */
const unitsAt = sec => S.g.units.filter(u => u.side === S.me && (S.g.phase === 'plan' ? S.plan.place[u.id] === sec && !(S.me === 'att' && isBattery(u)) : alive(u) && u.sec === sec));

export function onSector(sec, e = {}) {
  const g = S.g;
  if (!g || g.over) return;
  S.focusSec = sec;
  focusSector(map, sec, false);
  $('sheet').hidden = true;
  if (g.phase === 'plan') { if (planTap(sec)) { closeUnitPop(false); return; } }
  else if (S.tool && (S.sel.length || S.selFmn || S.tool.kind === 'air') && battleTap(sec)) { closeUnitPop(false); return; }
  const here = unitsAt(sec);
  if (!here.length) { say(g.phase === 'plan' ? 'No unit of yours here. Select units first, then tap a sector to place them.' : 'No unit of yours here. Pick a unit or formation first (list, map or ]).'); return; }
  if (here.length === 1) { select([here[0].id], null, !!e.shiftKey || !!S.multi, { focus: e.type === 'keydown' }); return; }
  openSheet(sec, here);
}

function openSheet(sec, here) {
  const sh = $('sheet');
  sh.innerHTML = `<div class="dd-sheet-h"><b>${here.length} units here</b><button type="button" class="x" data-close aria-label="Close">×</button></div>
    ${here.map(u => `<button type="button" class="dd-urow" data-pick="${u.id}"><span class="dd-ug">${TYPES[u.type].letter}</span><b>${esc(u.name)}</b><small>${Math.round(100 * (u.str0 ? Math.max(0, u.str) / u.str0 : 1))}%</small></button>`).join('')}
    <button type="button" class="btn" data-all="${here.map(u => u.id).join(',')}">Select all here</button>`;
  sh.hidden = false;
  sh.querySelector('[data-pick]').focus();
}
function sheetClick(e) {
  const p = e.target.closest('[data-pick]'), a = e.target.closest('[data-all]');
  if (e.target.closest('[data-close]')) { $('sheet').hidden = true; return; }
  if (p) { $('sheet').hidden = true; select([p.dataset.pick], null, e.shiftKey); }
  else if (a) { $('sheet').hidden = true; select(a.dataset.all.split(','), null, false); }
}

function onKey(e, sec) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSector(sec, e); if (!popOpen()) focusSector(map, sec, true); return; }
  if (e.key === 'Escape') { e.preventDefault(); $('map').closest('.mapbox').querySelector('[data-zoom="fit"]').focus(); return; }
  if (e.shiftKey) return;
  const to = stepSector(map, sec, e.key);
  if (to >= 0) { e.preventDefault(); S.focusSec = to; focusSector(map, to, true); }
  else if (e.key.startsWith('Arrow')) e.preventDefault();
}

export function selClick(e) {
  const g = S.g;
  if (!g) return;
  const b = e.target.closest('button');
  if (!b || b.getAttribute('aria-disabled') === 'true') return;
  const d = b.dataset;
  let msg = null;
  if (d.posture) msg = `${setAll('posture', d.posture)} unit(s) set to ${b.textContent}.`;
  else if (d.stance) msg = `${setAll('stance', d.stance)} unit(s) set to ${b.textContent}.`;
  else if (d.form) msg = `${setAll('form', d.form)} unit(s) in ${b.textContent.toLowerCase()}.`;
  else if (d.mode) msg = `${setAll('mode', d.mode)} unit(s) will move by ${b.textContent.toLowerCase()} routes.`;
  else if (d.mission) { S.tool = { kind: 'fire', m: d.mission }; msg = `${b.textContent}: tap the target sector.`; }
  else if (d.dronem) { S.tool = { kind: 'drone', m: d.dronem }; msg = `Drone ${d.dronem}: tap a sector.`; }
  else if (d.tool) { S.tool = S.tool && S.tool.kind === d.tool ? defaultTool(g, S.sel, S.selFmn) : { kind: d.tool }; msg = TOOL_SAY[d.tool] || 'Tap a sector.'; }
  else if (d.launch !== undefined) { launchCounterstroke(); return; }
  else if (d.standing) { const st = g.standing && g.standing[S.me]; if (st) { const on = !st[d.standing]; issue(g, { kind: 'standing', side: S.me, key: d.standing, on }); msg = `Standing order ${on ? 'on' : 'off'}: ${b.textContent.split(':')[0]}.`; } }
  else if (d.fplan) { const r = fmnPlan(d.fplan); msg = r.ok ? 'Local counterattack authority on: its companies strike fresh lodgments next to them at once.' : 'No change.'; }
  if (msg) say(msg);
  if ((d.tool || d.mission || d.dronem) && S.tool && narrow() && S.tab !== 'map') setTab('map');   // phones: the tap goes on the map
  S.ui.saved(); S.ui.redraw();
  const box = popOpen() ? $('upop') : $('sel');
  const again = box.querySelector(Object.entries(d).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}="${v}"]`).join(''));
  (again || box).focus?.();
}
const TOOL_SAY = { move: 'Tap the sector where it should go.', lane: 'Tap a sector up to three away: east or west runs the lane along the enemy’s lines.', riposte: 'Local counterattack: tap a fresh lodgment next to it.',
  breach: 'Tap the obstacle sector to clear.', displace: 'Tap a sector your side holds to move the battery there.', attack: 'Tap the target: the formation attacks on that axis.',
  hold: 'Tap a sector: the formation spreads over that zone, three columns wide.', cs: 'Tap one or more lodgments, then Launch counterattack.', leapfrog: 'Tap the target sector for the pair.',
  jam: 'Tap the centre of the area to jam.', row: 'Tap a sector on the row where its units should consolidate.' };

/** End the hour: play it out, say what happened, save the link. */
export function endHour() {
  const g = S.g;
  if (!g || g.over || g.phase !== 'battle') return;
  const t0 = g.t;
  S.tool = null; S.sel = []; S.selFmn = null; $('sheet').hidden = true; closeUnitPop(false);
  if (S.practice) { say(`<b>${S.practice.hour(g)}</b>`); S.ui.redraw(); $('end').focus({ preventScroll: true }); return; }   // the Practice field's hour
  advance(g);
  const line = tldr(g, S.me, t0).text;
  say(`<b>${line}</b>`);
  $('tldr').textContent = line;
  S.ui.saved();
  if (g.over) S.ui.finish(true); else { S.ui.redraw(); $('end').focus({ preventScroll: true }); }
}

export function undo() {
  const g = S.g;
  if (!g || g.over || g.phase !== 'battle') return;
  const a = undoLast(g);
  say(a ? `Withdrawn: your last order this hour (${a.kind}).` : 'Nothing to undo this hour.');
  S.ui.saved(); S.ui.redraw();
}

export function zoom(k) {
  if (!map || !S.g) return;
  if (k === 'in') map.mv.zoom(1.3); else if (k === 'out') map.mv.zoom(1 / 1.3); else if (k === 'fit') { const all = map.mv.k * map.mv.H > map.mv.size()[1] + 1; map.mv.fit(all ? 'all' : map.flip ? 'bottom' : 'top'); }
  else if (k === 'mini') mini.show(mini.el.hidden);
}
export const pan = (dx, dy) => map && map.mv.pan(dx, dy);

/** Hotkey helpers (js/ui/keys.js). */
export const hot = {
  cycleUnit(d, f) {
    const g = S.g;
    if (!g || g.over) return;
    let list = g.phase === 'plan' ? g.units.filter(u => u.side === S.me && !(S.me === 'att' && isBattery(u))) : f ? g.units.filter(u => u.side === S.me && alive(u) && matches(g, u, f)) : filtered();
    if (!list.length && !f && S.filter !== 'all') list = g.units.filter(u => u.side === S.me && alive(u));   // ] with nothing in the filter: every unit
    if (!list.length) { say(`No units ${f === 'idle' ? 'need orders' : f === 'contact' ? 'are in contact' : `in the filter “${FILTERS.find(x => x.id === S.filter).label}”`}.`); return; }
    const i = list.findIndex(u => u.id === S.sel[0]);
    select([list[(i + d + list.length) % list.length].id]);
  },
  cycleFmn(d) {
    const g = S.g; if (!g || g.over) return;
    const list = formations(), i = list.indexOf(S.selFmn), id = list[(i + d + list.length) % list.length];
    select(g.fmns[id].units.filter(x => alive(unitOf(x))), id);
  },
  cycleFilter() { const i = FILTERS.findIndex(f => f.id === S.filter); S.filter = FILTERS[(i + 1) % FILTERS.length].id; say(`Filter: ${FILTERS.find(f => f.id === S.filter).label}.`); S.ui.redraw(); },
  set(kind, cycle) {
    const g = S.g; if (!g || g.over || g.phase !== 'battle' || (!S.sel.length && !S.selFmn)) { say('Select a unit or formation first.'); return; }
    const u = unitOf(S.sel[0]);
    const cur = u ? u[kind === 'form' ? 'formation' : kind] : null, i = cycle.indexOf(cur), v = cycle[(i + 1) % cycle.length];
    say(`${setAll(kind, v)} unit(s): ${v}.`); S.ui.saved(); S.ui.redraw();
  },
  tool(kind, need) {
    const g = S.g; if (!g || g.over || g.phase !== 'battle') return;
    const u = S.sel.length === 1 ? unitOf(S.sel[0]) : null;
    if (need && !need(u)) { say(kind === 'lane' ? 'Select one MG company: only MG companies lay fire lanes.' : kind === 'leapfrog' ? 'Select two units first (Shift-click the second, or use Select several).' : 'Select a defending company first.'); return; }
    S.tool = { kind }; say(TOOL_SAY[kind]); S.ui.redraw();
  },
  battery() {
    const g = S.g; if (!g || g.over) return;
    const bats = g.units.filter(u => u.side === S.me && isBattery(u) && alive(u));
    if (!bats.length) return;
    const i = bats.findIndex(b => b.id === S.sel[0]);
    select([bats[(i + 1) % bats.length].id]);
  },
};
