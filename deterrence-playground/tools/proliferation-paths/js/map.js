// World map: every country drawn from Natural Earth 1:110m; states the datasets code are shaded by stage for the
// chosen year and dataset, with a dot on each so small states (Israel, Taiwan, the Koreas) stay clickable.
import { WORLD } from '../data/world.js';
import { STATES } from '../data/codings.js';
import { createProjection } from '../../../shared/js/mapkit.js';
import { esc, stageAt, disagree, STAGE_LABEL, DS_LABEL, covers, STAGE_COLOR } from './common.js';
import { grow, onFirstView, ping } from './fx.js';

const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};
const byIso = Object.fromEntries(WORLD.map(f => [f.iso, f]));
const INHERITED = new Set(['UKR', 'BLR', 'KAZ']);

function anchor(id, proj) {
  const s = STATES.find(x => x.id === id);
  const rings = s.iso.flatMap(i => byIso[i]?.rings || []);
  if (id === 'FRA') rings.splice(0, rings.length, ...byIso.FRA.rings.filter(r => r[0][0] > -10));
  let best = null, area = -1;
  for (const r of rings) {
    let a = 0, cx = 0, cy = 0;
    const p = r.map(pt => proj.project(pt));
    for (let i = 0; i < p.length - 1; i++) {
      const f = p[i][0] * p[i + 1][1] - p[i + 1][0] * p[i][1];
      a += f; cx += (p[i][0] + p[i + 1][0]) * f; cy += (p[i][1] + p[i + 1][1]) * f;
    }
    if (Math.abs(a) > area) { area = Math.abs(a); best = a ? [cx / (3 * a), cy / (3 * a)] : p[0]; }
  }
  if (id === 'USA') best = proj.project([-98, 39]);
  if (id === 'RUS') best = proj.project([60, 58]);
  return best;
}

export function createMap(host, { onSelect }) {
  const proj = createProjection({ lon0: -170, lon1: 190, lat0: -56, lat1: 80, width: 1000 });
  const svg = mk('svg', { viewBox: `0 0 ${proj.W} ${proj.H}`, role: 'group', 'aria-label': 'World map of proliferation stage by country' });
  host.appendChild(svg);
  mk('rect', { class: 'pp-sea', x: 0, y: 0, width: proj.W, height: proj.H }, svg);
  // Rings that straddle the antimeridian (Chukotka, Fiji) move whole to the east; others shift only west of -170.
  const shift = f => f.rings.map(r => {
    const wrap = (r.some(([x]) => x > 170) && r.some(([x]) => x < -150)) || r.some(([x]) => x < -170);
    return r.map(([x, y]) => [(wrap ? x < 0 : x < -170) ? x + 360 : x, y]);
  });
  const coded = new Map(STATES.map(s => [s.id, s]));
  const isoToState = {};
  for (const s of STATES) for (const i of s.iso) isoToState[i] = s.id;
  const land = mk('g', {}, svg);
  const paths = {};
  for (const f of WORLD) {
    const sid = isoToState[f.iso];
    const p = mk('path', { d: proj.path(shift(f)), class: 'pp-land' + (sid ? ' coded' : '') + (INHERITED.has(sid) ? ' inh' : '') }, land);
    if (sid) (paths[sid] ||= []).push(p);
  }
  const dots = mk('g', {}, svg);
  const tip = document.createElement('div');
  tip.className = 'tooltip'; tip.hidden = true;
  host.appendChild(tip);
  const dotEl = {};
  for (const s of STATES) {
    const a = anchor(s.id, proj);
    if (!a) continue;
    const g = mk('g', { class: 'pp-dot', tabindex: 0, role: 'button', transform: `translate(${a[0].toFixed(1)} ${a[1].toFixed(1)})` }, dots);
    mk('circle', { r: 7 }, g);
    dotEl[s.id] = g;
    const pick = () => onSelect(s.id);
    g.addEventListener('click', pick);
    g.addEventListener('keydown', k => { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); pick(); } });
    for (const p of paths[s.id] || []) p.addEventListener('click', pick);
  }
  let cur = null, seen = false, last = null;
  // Motion: dots pop in on first view; a dot whose stage changes when the year moves sends a ping.
  onFirstView(host, () => { seen = true; grow(dots.querySelectorAll('circle'), { axis: 'xy', ms: 420, stagger: 14 }); });
  const show = (id, ev) => {
    const s = coded.get(id);
    const st = stageAt(cur.ds, id, cur.year);
    const dis = cur.ds === 'any' && disagree(id, cur.year);
    tip.innerHTML = `<b>${esc(s.name)}</b><small>${cur.year} · ${esc(STAGE_LABEL[st])}${INHERITED.has(id) ? ' (not coded by any dataset)' : ''}${dis ? ' · datasets disagree' : ''}</small>`;
    const r = host.getBoundingClientRect();
    let px = ev.clientX - r.left + 12;
    if (px > r.width - 220) px = ev.clientX - r.left - 230;
    tip.style.left = Math.max(0, px) + 'px'; tip.style.top = Math.max(0, ev.clientY - r.top - 10) + 'px'; tip.hidden = false;
  };
  for (const id of Object.keys(dotEl)) {
    for (const el of [dotEl[id], ...(paths[id] || [])]) {
      el.addEventListener('pointerenter', ev => show(id, ev));
      el.addEventListener('pointermove', ev => show(id, ev));
      el.addEventListener('pointerleave', () => { tip.hidden = true; });
    }
  }

  function draw(state) {
    const stepped = seen && last && last.year !== state.year && last.ds === state.ds;
    last = { year: state.year, ds: state.ds };
    cur = state;
    host.dataset.out = state.ds !== 'any' && !covers(state.ds, state.year) ? '1' : '';
    for (const s of STATES) {
      const st = stageAt(state.ds, s.id, state.year);
      const vis = state.visible.has(s.id);
      const dis = state.ds === 'any' && disagree(s.id, state.year);
      for (const p of paths[s.id] || []) { p.dataset.st = vis ? st : 'none'; p.classList.toggle('dis', vis && dis); }
      const d = dotEl[s.id];
      if (!d) continue;
      if (stepped && vis && d.dataset.st !== st) {
        const [, tx, ty] = d.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/) || [];
        if (tx != null) ping(svg, +tx, +ty, { color: STAGE_COLOR[st] || 'var(--muted)', r: 26, ms: 700, width: 1.8 });
      }
      d.dataset.st = st;
      d.classList.toggle('dim', !vis);
      d.classList.toggle('sel', state.sel === s.id);
      d.classList.toggle('dis', dis);
      d.setAttribute('aria-label', `${s.name}: ${STAGE_LABEL[st]} in ${state.year} (${DS_LABEL[state.ds]})`);
    }
  }
  return { draw };
}
