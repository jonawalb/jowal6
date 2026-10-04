// Timeline, people list and network views.
import { MEETINGS, ISSUES, ISSUE_MEETING, PEOPLE, PERSON, PAIRS, ROLES, ROLE_COLOR, esc, fmtDate, shortName, issueLetter, splitDesc } from './model.js';
import { personStats } from './panels.js';

const NS = 'http://www.w3.org/2000/svg';
const $ = id => document.getElementById(id);
const el = (tag, attrs = {}, parent, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
};
const ADMIN_START = [['Truman', '1948'], ['Eisenhower', '1953-01-20'], ['Kennedy', '1961-01-20'], ['Johnson', '1963-11-22'],
  ['Nixon', '1969-01-20'], ['Ford', '1974-08-09'], ['Carter', '1977-01-20'], ['Reagan', '1981-01-20']];
const yearFrac = d => { const [y, m, dd] = d.split('-').map(Number); return y + ((m || 1) - 1) / 12 + ((dd || 1) - 1) / 365; };
const placeTip = (tip, host, x, y) => {
  tip.hidden = false;
  const w = host.getBoundingClientRect().width;
  tip.style.left = Math.max(4, Math.min(x + 12, w - tip.offsetWidth - 4)) + 'px';
  tip.style.top = Math.max(4, y - tip.offsetHeight - 8) + 'px';
};
const fill = m => (m.code === 1 ? 'var(--accent)' : m.issues.length ? 'var(--c7)' : 'var(--rule)');

// ---- Timeline -------------------------------------------------------------------------------
export function drawTimeline(idx, sel, onPick) {
  const svg = $('tl');
  const W = 1000, Y0 = 1948, Y1 = 1984, padL = 8, padR = 8, top = 34, cell = 13;
  const byYear = {};
  for (const mi of idx) (byYear[MEETINGS[mi].date.slice(0, 4)] ||= []).push(mi);
  const maxN = Math.max(4, ...Object.values(byYear).map(a => a.length));
  const H = top + maxN * cell + 30;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const x = v => padL + ((v - Y0) / (Y1 - Y0)) * (W - padL - padR);
  const colW = x(Y0 + 1) - x(Y0);
  el('rect', { x: x(yearFrac('1964-08-07')), y: top - 6, width: x(yearFrac('1973-01-27')) - x(yearFrac('1964-08-07')), height: maxN * cell + 8, class: 'vband' }, svg);
  ADMIN_START.forEach(([n, d], i) => {
    const x0 = x(Math.max(Y0, yearFrac(d.length === 4 ? d + '-01-01' : d)));
    const x1 = i < ADMIN_START.length - 1 ? x(yearFrac(ADMIN_START[i + 1][1])) : x(Y1);
    el('rect', { x: x0, y: 4, width: x1 - x0 - 1, height: 18, class: 'aband' + (i % 2 ? ' alt' : '') }, svg);
    if (x1 - x0 > 50) el('text', { x: (x0 + x1) / 2, y: 17, class: 'aname' }, svg, n);
  });
  for (let yv = 1950; yv <= 1980; yv += 5) {
    el('text', { x: x(yv) + colW / 2, y: H - 8, class: 'tsm-axis ax-t', 'text-anchor': 'middle' }, svg, yv);
    el('line', { x1: x(yv), x2: x(yv), y1: top - 6, y2: top + maxN * cell + 2, class: 'grid' }, svg);
  }
  const tip = $('tl-tip'), host = tip.parentElement;
  for (const [yr, list] of Object.entries(byYear)) {
    list.sort((a, b) => MEETINGS[a].date.localeCompare(MEETINGS[b].date));
    list.forEach((mi, j) => {
      const m = MEETINGS[mi];
      const s = Math.min(cell - 2, colW - 3);
      const cx = x(+yr) + (colW - s) / 2, cy = top + (maxN - 1 - j) * cell;
      const r = el('rect', { x: cx, y: cy, width: s, height: s, rx: 2, class: 'mq' + (m.id === sel ? ' sel' : '') + (/Level-2/.test(m.assess) ? ' l2' : ''),
        style: `fill:${fill(m)}`, tabindex: 0, role: 'button', 'aria-label': `${fmtDate(m.date)}: ${m.subj}. ${m.assess}` }, svg);
      if (m.issues.some(k => ISSUES[k].ps != null)) el('circle', { cx: cx + s / 2, cy: cy + s / 2, r: Math.max(1.6, s / 6), class: 'pdot' }, svg);
      r.addEventListener('click', () => onPick(m.id));
      r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(m.id); } });
      r.addEventListener('pointerenter', () => {
        const b = svg.getBoundingClientRect(), hb = host.getBoundingClientRect();
        tip.innerHTML = `<b>${esc(m.subj)}</b><span class="tt-d">${fmtDate(m.date)} · ${m.admin} · ${m.id}</span><span class="tt-d">${esc(m.assess)}</span>`;
        placeTip(tip, host, (cx / W) * b.width + b.left - hb.left, (cy / H) * b.height + b.top - hb.top);
      });
      r.addEventListener('pointerleave', () => { tip.hidden = true; });
    });
  }
  $('tl-legend').innerHTML = `<li><span class="sw" style="background:var(--accent)"></span>In-room disagreement</li>
    <li><span class="sw" style="background:var(--c7)"></span>Level-2 advice issue only</li><li><span class="sw" style="background:var(--rule)"></span>No coded issue</li>
    <li><span class="sw dot"></span>President leaned on an issue</li><li><span class="sw vb"></span>U.S. ground war in Vietnam</li>`;
}

export function meetingList(idx, limit, onPick) {
  const list = idx.slice().sort((a, b) => MEETINGS[a].date.localeCompare(MEETINGS[b].date));
  $('tl-list').innerHTML = list.slice(0, limit).map(mi => {
    const m = MEETINGS[mi];
    return `<li><button type="button" class="mrow" data-m="${m.id}"><span class="num">${m.date}</span><span class="sq" style="background:${fill(m)}"></span><span class="mt">${esc(m.subj)}</span><span class="fine">${m.issues.length ? m.issues.length + ' issue' + (m.issues.length > 1 ? 's' : '') : ''}</span></button></li>`;
  }).join('') || '<li class="fine">No meetings match the filters.</li>';
  $('tl-more').hidden = list.length <= limit;
  $('tl-list').querySelectorAll('.mrow').forEach(b => { b.onclick = () => onPick(b.dataset.m); });
}

// ---- People ---------------------------------------------------------------------------------
/** People who spoke in the filtered meetings, with corpus-wide stats. */
export function peopleList(idx, { sort, q, sel }, onPick) {
  const inView = new Set();
  for (const mi of idx) MEETINGS[mi].spk.forEach(s => inView.add(s[0]));
  const qq = q.trim().toLowerCase();
  const rows = [...inView].filter(pid => !qq || PEOPLE[pid].n.toLowerCase().includes(qq)).map(pid => {
    const s = personStats(pid);
    return { pid, st: s.sided.length, m: PERSON[pid].meetings.length, agree: s.agreeRate ?? -1, hawk: s.hawkRate ?? -1, n: PEOPLE[pid].n.split(' ').pop() };
  });
  rows.sort((a, b) => (sort === 'n' ? a.n.localeCompare(b.n) : b[sort] - a[sort] || b.st - a.st));
  $('pp-list').innerHTML = rows.slice(0, 120).map(r => {
    const p = PEOPLE[r.pid];
    const v = sort === 'agree' ? (r.agree < 0 ? '–' : Math.round(r.agree * 100) + '%') : sort === 'hawk' ? (r.hawk < 0 ? '–' : Math.round(r.hawk * 100) + '%') : sort === 'm' ? r.m : r.st;
    return `<li><button type="button" class="prow" data-pid="${r.pid}" aria-pressed="${r.pid === sel}"><span class="rk" style="border-color:${ROLE_COLOR[p.role]}"></span><span class="pn">${esc(p.n)}</span><span class="fine pr">${esc(ROLES[p.role])}</span><span class="num">${v}</span></button></li>`;
  }).join('') || '<li class="fine">Nobody matches.</li>';
  $('pp-list').querySelectorAll('.prow').forEach(b => { b.onclick = () => onPick(+b.dataset.pid); });
}

// ---- Network --------------------------------------------------------------------------------
const ROLE_ORDER = ['pres', 'vp', 'state', 'def', 'mil', 'intel', 'nsc', 'econ', 'cong', 'other'];

export function drawNetwork(idx, { mode, n, w, sel }, onPick) {
  const svg = $('nw');
  svg.innerHTML = '';
  const inMeet = new Set(idx);
  // Pair weights restricted to meetings in view.
  const pair = new Map();
  for (const [k, e] of PAIRS) {
    const list = (mode === 'opp' ? e.opIss : e.sameIss).filter(ik => inMeet.has(ISSUE_MEETING[ik]));
    if (list.length) pair.set(k, list);
  }
  const deg = new Map();
  for (const [k, l] of pair) for (const p of k.split('|')) deg.set(+p, (deg.get(+p) || 0) + l.length);
  const nodes = [...deg.keys()].sort((a, b) => deg.get(b) - deg.get(a)).slice(0, n)
    .sort((a, b) => ROLE_ORDER.indexOf(PEOPLE[a].role) - ROLE_ORDER.indexOf(PEOPLE[b].role) || PEOPLE[a].n.localeCompare(PEOPLE[b].n));
  const C = 320, R = 220;
  const pos = new Map(nodes.map((p, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / nodes.length; return [p, { x: C + R * Math.cos(a), y: C + R * Math.sin(a), a }]; }));
  const edges = [...pair].map(([k, l]) => { const [a, b] = k.split('|').map(Number); return { a, b, l }; })
    .filter(e => pos.has(e.a) && pos.has(e.b) && e.l.length >= w).sort((x, y) => x.l.length - y.l.length);
  const maxW = Math.max(1, ...edges.map(e => e.l.length));
  const tip = $('nw-tip'), host = tip.parentElement;
  const gE = el('g', {}, svg), gN = el('g', {}, svg);
  for (const e of edges) {
    const A = pos.get(e.a), B = pos.get(e.b);
    const on = sel == null || e.a === sel || e.b === sel;
    const path = el('path', { d: `M${A.x},${A.y} Q${C + (A.x + B.x - 2 * C) * 0.15},${C + (A.y + B.y - 2 * C) * 0.15} ${B.x},${B.y}`,
      class: 'edge ' + mode + (on ? '' : ' dim'), 'stroke-width': 1 + (4 * e.l.length) / maxW }, gE);
    path.addEventListener('pointerenter', ev => {
      const hb = host.getBoundingClientRect();
      tip.innerHTML = `<b>${esc(PEOPLE[e.a].n)} · ${esc(PEOPLE[e.b].n)}</b><span class="tt-d">${e.l.length} issue${e.l.length > 1 ? 's' : ''} on ${mode === 'opp' ? 'opposite sides' : 'the same side'}</span>`;
      placeTip(tip, host, ev.clientX - hb.left, ev.clientY - hb.top);
    });
    path.addEventListener('pointerleave', () => { tip.hidden = true; });
  }
  for (const p of nodes) {
    const P = pos.get(p), person = PEOPLE[p];
    const g = el('g', { class: 'node' + (sel === p ? ' sel' : ''), tabindex: 0, role: 'button', 'aria-label': `${person.n}: ${deg.get(p)} pairings` }, gN);
    el('circle', { cx: P.x, cy: P.y, r: 5 + Math.min(9, Math.sqrt(deg.get(p))), style: `fill:${ROLE_COLOR[person.role]}` }, g);
    const out = 16 + Math.min(9, Math.sqrt(deg.get(p)));
    const lx = P.x + out * Math.cos(P.a), ly = P.y + out * Math.sin(P.a);
    el('text', { x: lx, y: ly + 4, class: 'nl', 'text-anchor': Math.cos(P.a) > 0.2 ? 'start' : Math.cos(P.a) < -0.2 ? 'end' : 'middle' }, g, shortName(p));
    g.addEventListener('click', () => onPick(sel === p ? null : p));
    g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onPick(sel === p ? null : p); } });
  }
  const used = new Set(nodes.map(p => PEOPLE[p].role));
  $('nw-legend').innerHTML = ROLE_ORDER.filter(r => used.has(r)).map(r => `<li><span class="sw" style="background:${ROLE_COLOR[r]};border-radius:50%"></span>${ROLES[r]}</li>`).join('');
  // Ranked pairs
  const ranked = [...pair].map(([k, l]) => ({ k, l })).filter(r => sel == null || r.k.split('|').map(Number).includes(sel)).sort((a, b) => b.l.length - a.l.length).slice(0, 12);
  $('nw-list-h').textContent = `${sel == null ? 'Most frequent pairings' : 'Pairings for ' + PEOPLE[sel].n}: ${mode === 'opp' ? 'opposite sides' : 'same side'}`;
  $('nw-list').innerHTML = ranked.map(r => {
    const [a, b] = r.k.split('|').map(Number);
    return `<li><span class="num">${r.l.length}</span> <b>${esc(PEOPLE[a].n)}</b> and <b>${esc(PEOPLE[b].n)}</b><div class="fine">${r.l.slice(0, 4).map(ik => { const m = MEETINGS[ISSUE_MEETING[ik]]; return `<button type="button" class="ilink" data-m="${m.id}" data-k="${ik}">${m.date.slice(0, 4)} ${issueLetter(ik)}: ${esc(splitDesc(ISSUES[ik].d).q)}</button>`; }).join('')}${r.l.length > 4 ? `<span class="muted">and ${r.l.length - 4} more</span>` : ''}</div></li>`;
  }).join('') || '<li class="fine">No pairs in view.</li>';
  return edges.length;
}
