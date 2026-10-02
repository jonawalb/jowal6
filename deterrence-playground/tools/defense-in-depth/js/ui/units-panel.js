// The Units pane (SPEC §8.4): your forces as a formation tree (Army › Corps › Division › Regiment/Group ›
// Battalion › Company) with counts, a mean strength bar, idle and in-contact counts; filter chips; tap a
// formation to select all its units (one formation order), tap a company to select it alone, Shift to add.
import { alive, isCompany, isBattery } from '../forces.js';
import { S, $, esc, unitOf } from './store.js';
import { FILTERS, matches, isIdle, isLate, letterOf, markOf, POSTURE_WORD, STANCE_WORD, pendingOrder } from './filters.js';
import { gridFor } from '../grid.js';

const open = new Set();          // expanded formation ids
let lastGame = null;

const hp = u => (u.str0 > 0 ? Math.max(0, u.str) / u.str0 : u.guns0 ? u.guns / u.guns0 : 1);
const bar = f => `<span class="dd-hpbar" aria-hidden="true"><i style="width:${Math.round(100 * Math.max(0, Math.min(1, f)))}%"></i></span>`;

/** Units of a formation (and its sub-formations) on your side. */
const fmnUnits = (g, id) => g.fmns[id].units.map(x => g.units[g.ix[x]]).filter(Boolean);

function statusText(g, u, planning) {
  const G = gridFor(g.scale);
  if (planning) {
    const s = S.plan && S.plan.place ? S.plan.place[u.id] : null;
    const where = s == null || s < 0 ? (isBattery(u) && u.side === 'att' ? 'gun line (off the map)' : 'not placed') : `${G.zone[s]} · row ${G.row[s] + 1}`;
    const st = S.plan && S.plan.stance && S.plan.stance[u.id];
    return `${where}${st ? ` · ${STANCE_WORD[st]}` : ''}${S.plan.lanes && S.plan.lanes[u.id] != null ? ' · lane laid' : u.type === 'mg' && u.side === 'def' ? ' · no lane' : ''}`;
  }
  if (!alive(u)) return u.broken ? 'broken' : u.arrive != null ? `arrives at hour ${u.arrive + 1}` : 'not on the map';
  if (isBattery(u)) { const m = g.missions.find(x => x.bat === u.id && !x.done); return m ? `${m.m} at ${m.due > g.t ? 'next hour' : 'this hour'}` : u.busy > g.t ? 'displacing' : 'ready to fire'; }
  const o = pendingOrder(g, u);
  if (o) return `${o.a.kind} order${o.due > g.t ? ', starts next hour' : ''}`;
  if (isIdle(g, u)) return 'Needs orders';
  const bits = [u.side === 'att' ? POSTURE_WORD[u.posture] || u.posture : STANCE_WORD[u.stance] || u.stance];
  if (u.path.length) bits.push(`moving, ${u.path.length} to go`);
  if (u.pair != null) bits.push(u.lfOw ? 'overwatch' : 'bounding');
  if (u.pinned > g.t) bits.push('pinned'); else if (u.stalled) bits.push('stalled');
  return bits.join(' · ');
}

/** Filter chips with counts (battle only). */
export function renderFilters(box) {
  const g = S.g;
  if (!g || g.phase !== 'battle' || g.over) { box.innerHTML = ''; return; }
  const mine = g.units.filter(u => u.side === S.me && alive(u));
  box.innerHTML = `<button type="button" class="dd-chip dd-multi" data-multi aria-pressed="${!!S.multi}" title="Taps add units to the selection (or Shift-click)">Select several</button>` + FILTERS.map(f => {
    const n = f.id === 'all' ? mine.length : mine.filter(u => matches(g, u, f.id)).length;
    return `<button type="button" class="dd-chip" data-filter="${f.id}" aria-pressed="${S.filter === f.id}">${f.label} <span class="num">${n}</span></button>`;
  }).join('');
}

/** The formation tree. */
export function renderTree(box) {
  const g = S.g;
  if (!g) { box.innerHTML = ''; return; }
  if (lastGame !== g) {
    lastGame = g; open.clear();
    const depth = g.scale === 'd' ? 3 : 2;
    const walk = (id, d) => { if (d < depth) { open.add(id); for (const k of g.fmns[id].kids) walk(k, d + 1); } };
    walk(g.tops[S.me], 0);
  }
  const planning = g.phase === 'plan', f = planning ? 'all' : S.filter, sel = new Set(S.sel);
  const rows = [];
  const visible = u => f === 'all' || matches(g, u, f);
  const walk = (id, depth) => {
    const F = g.fmns[id], us = fmnUnits(g, id);
    const live = planning ? us : us.filter(alive), shown = us.filter(visible);
    if (f !== 'all' && !shown.length) return;
    const isOpen = open.has(id) || f !== 'all';
    const idle = planning ? 0 : live.filter(u => isIdle(g, u)).length, contact = planning ? 0 : live.filter(u => matches(g, u, 'contact')).length;
    const mean = live.length ? live.reduce((a, u) => a + hp(u), 0) / live.length : 0;
    rows.push(`<div class="dd-frow${S.selFmn === id ? ' sel' : ''}" style="--d:${depth}">
      <button type="button" class="dd-tog" data-tog="${id}" aria-expanded="${isOpen}" aria-label="${isOpen ? 'Fold' : 'Unfold'} ${esc(F.name)}">${isOpen ? '▾' : '▸'}</button>
      <button type="button" class="dd-fbtn" data-fmn="${id}" aria-pressed="${S.selFmn === id}"><b>${esc(F.name)}${F.cs ? ' <small class="dd-cs">counterstroke</small>' : ''}</b>
      <small>${live.length}/${us.length} units${idle ? ` · <span class="warn">${idle} need orders</span>` : ''}${contact ? ` · ${contact} in contact` : ''}</small>${bar(mean)}</button></div>`);
    if (!isOpen) return;
    for (const k of F.kids) walk(k, depth + 1);
    const direct = g.fmns[id].units.filter(x => !F.kids.some(k => g.fmns[k].units.includes(x))).map(x => g.units[g.ix[x]]).filter(u => u && visible(u));
    for (const u of direct) {
      const dead = !planning && !alive(u), idle = !planning && isIdle(g, u), late = !planning && isLate(g, u);
      rows.push(`<button type="button" class="dd-urow${idle ? ' idle' : ''}" style="--d:${depth + 1}" data-u="${u.id}" aria-pressed="${sel.has(u.id)}" ${dead ? 'disabled' : ''}>
        <span class="dd-ug">${letterOf(u)}</span><b>${esc(u.short || u.name)}${markOf(u) ? ` <span class="dd-um">${markOf(u)}</span>` : ''}${late ? ' <span class="dd-clk" title="Order starts next hour">◷</span>' : ''}</b>
        <small class="${idle ? 'warn' : ''}">${esc(statusText(g, u, planning))}</small>${isCompany(u) || isBattery(u) ? bar(hp(u)) : ''}</button>`);
    }
  };
  walk(g.tops[S.me], 0);
  box.innerHTML = rows.join('') || '<p class="fine">No units match this filter.</p>';
}

/** Wire the pane's clicks once. select(ids, fmnId, add) is app.js's selection. */
export function wireUnits(treeBox, filterBox, select) {
  treeBox.addEventListener('click', e => {
    const t = e.target.closest('[data-tog]');
    if (t) { const id = t.dataset.tog; if (open.has(id)) open.delete(id); else open.add(id); renderTree(treeBox); return; }
    const f = e.target.closest('[data-fmn]');
    if (f) { const id = f.dataset.fmn, ids = fmnUnits(S.g, id).filter(u => S.g.phase === 'plan' || alive(u)).map(u => u.id); select(ids, id, false); return; }
    const u = e.target.closest('[data-u]');
    if (u && !u.disabled) select([u.dataset.u], null, e.shiftKey || e.metaKey || e.ctrlKey || !!S.multi);
  });
  filterBox.addEventListener('click', e => {
    if (e.target.closest('[data-multi]')) { S.multi = !S.multi; S.ui.redraw(); return; }
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    S.filter = b.dataset.filter;
    S.ui.redraw();
  });
}

/** Units in the current filter, in tree order (for ] and [). */
export function filtered() {
  const g = S.g;
  return g.units.filter(u => u.side === S.me && alive(u) && (S.filter === 'all' || matches(g, u, S.filter)));
}

/** Formations in tree order (for } and {). */
export function formations() {
  const g = S.g, out = [];
  const walk = id => { out.push(id); for (const k of g.fmns[id].kids) walk(k); };
  walk(g.tops[S.me]);
  return out;
}

/** Expand the tree to show a unit (after a hotkey picks it). */
export function reveal(id) {
  const u = unitOf(id);
  if (!u) return;
  for (const f of u.fmn) { let p = f; while (p) { open.add(p); p = S.g.fmns[p].parent; } }
}
