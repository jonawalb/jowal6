// Patterns view: aggregates of the issue index by administration and period.
import { MEETINGS, ISSUES, PEOPLE, ADMINS, ROLE_COLOR, aggregate, fmtPct, esc, POSITIONS } from './model.js';

const NS = 'http://www.w3.org/2000/svg';
const $ = id => document.getElementById(id);
const el = (tag, attrs = {}, parent, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
};

function adminTable(idx) {
  const groups = ADMINS.map(a => [a, idx.filter(mi => MEETINGS[mi].admin === a)]).filter(([, l]) => l.length);
  groups.push(['All in view', idx]);
  const head = '<thead><tr><th scope="col">Administration</th><th>Meetings</th><th>With disagreement</th><th>Issues</th><th>Fact</th><th>About communism</th><th>Hawk–dove</th><th>President leaned</th></tr></thead>';
  const body = groups.map(([a, l]) => {
    const g = aggregate(l);
    return `<tr${a === 'All in view' ? ' class="tot"' : ''}><th scope="row">${a}</th><td>${g.meetings}</td><td>${g.code1} <span class="muted">${fmtPct(g.code1, g.meetings)}</span></td><td>${g.issues}</td>
      <td>${fmtPct(g.F, g.issues)}</td><td>${fmtPct(g.ac, g.issues)}</td><td>${fmtPct(g.hd, g.issues)}</td><td>${fmtPct(g.sp, g.issues)}</td></tr>`;
  }).join('');
  $('pt-admin').innerHTML = head + `<tbody>${body}</tbody>`;
}

/** Two-way bars per administration: a vs b counts. */
function splitBars(target, idx, keyA, keyB, labA, labB, colA, colB) {
  const groups = ADMINS.map(a => [a, aggregate(idx.filter(mi => MEETINGS[mi].admin === a))]).filter(([, g]) => g[keyA] + g[keyB]);
  const all = aggregate(idx);
  groups.push(['All in view', all]);
  const max = Math.max(1, ...groups.map(([, g]) => Math.max(g[keyA], g[keyB])));
  $(target).innerHTML = groups.length > 1 || all[keyA] + all[keyB] ? `<div class="dbar-h"><span style="color:${colA}">◀ ${labA}</span><span style="color:${colB}">${labB} ▶</span></div>` + groups.map(([a, g]) => `
    <div class="dbar${a === 'All in view' ? ' tot' : ''}"><span class="dl">${a}</span>
      <span class="dside l"><span class="num">${g[keyA]}</span><i style="width:${(100 * g[keyA]) / max}%;background:${colA}"></i></span>
      <span class="dside r"><i style="width:${(100 * g[keyB]) / max}%;background:${colB}"></i><span class="num">${g[keyB]}</span></span></div>`).join('')
    : '<p class="fine">No issues in view meet this condition.</p>';
}

const DIMS = {
  hd: { lab: ['Hawk vs dove', 'Other split'], f: i => i.hd === 'Y' },
  ac: { lab: ['About communism', 'Not about communism'], f: i => i.ac === 'Y' },
  fp: { lab: ['Fact or assessment (F)', 'Policy (P)'], f: i => i.fp === 'F' },
  sp: { lab: ['President leaned', 'President did not lean'], f: i => i.sp === 1 },
};
const PERIODS = [[1948, 1952], [1953, 1956], [1957, 1960], [1961, 1964], [1965, 1968], [1969, 1972], [1973, 1976], [1977, 1983]];

function timeChart(idx, dim) {
  const svg = $('pt-time');
  const W = 640, H = 230, padL = 34, padB = 34, top = 22;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const D = DIMS[dim];
  const rows = PERIODS.map(([a, b]) => {
    let yes = 0, no = 0;
    for (const mi of idx) { const m = MEETINGS[mi]; const y = +m.date.slice(0, 4); if (y < a || y > b) continue; for (const k of m.issues) (D.f(ISSUES[k]) ? yes++ : no++); }
    return { a, b, yes, no };
  });
  const max = Math.max(4, ...rows.map(r => r.yes + r.no));
  const bw = (W - padL - 10) / rows.length;
  const y = v => top + (H - padB - top) * (1 - v / max);
  for (let t = 0; t <= max; t += Math.ceil(max / 4)) {
    el('line', { x1: padL, x2: W - 6, y1: y(t), y2: y(t), class: 'grid' }, svg);
    el('text', { x: padL - 6, y: y(t) + 4, 'text-anchor': 'end', class: 'ax-t' }, svg, t);
  }
  rows.forEach((r, i) => {
    const x = padL + i * bw + 6, w = bw - 12;
    el('rect', { x, y: y(r.yes + r.no), width: w, height: y(r.yes) - y(r.yes + r.no), style: 'fill:var(--rule)' }, svg);
    el('rect', { x, y: y(r.yes), width: w, height: y(0) - y(r.yes), style: 'fill:var(--c4)' }, svg);
    if (r.yes + r.no) el('text', { x: x + w / 2, y: y(r.yes + r.no) - 4, 'text-anchor': 'middle', class: 'ax-t' }, svg, `${Math.round((100 * r.yes) / (r.yes + r.no))}%`);
    el('text', { x: x + w / 2, y: H - padB + 15, 'text-anchor': 'middle', class: 'ax-t' }, svg, `${r.a}–${String(r.b).slice(2)}`);
  });
  el('text', { x: padL, y: H - 4, class: 'ax-t' }, svg, 'Issues per period; label = share with the attribute');
  $('pt-time-legend').innerHTML = `<li><span class="sw" style="background:var(--c4)"></span>${D.lab[0]}</li><li><span class="sw" style="background:var(--rule)"></span>${D.lab[1]}</li>`;
}

function advice(idx, min, onPerson) {
  const inView = new Set(idx);
  const tally = new Map();
  for (const mi of inView) {
    const m = MEETINGS[mi];
    for (const k of m.issues) {
      const i = ISSUES[k]; if (i.ps == null) continue;
      for (const [pid, p] of POSITIONS[mi][k]) {
        if (pid === m.pres || (p.v !== 0 && p.v !== 1)) continue;
        const t = tally.get(pid) || { a: 0, n: 0 };
        t.n++; if (p.v === i.ps) t.a++;
        tally.set(pid, t);
      }
    }
  }
  const rows = [...tally].filter(([, t]) => t.n >= min).sort((x, y) => y[1].a / y[1].n - x[1].a / x[1].n || y[1].n - x[1].n);
  $('pt-advice').innerHTML = rows.length ? rows.map(([pid, t]) => `<button type="button" class="abar" data-pid="${pid}"><span class="an">${esc(PEOPLE[pid].n)}</span>
    <span class="ab"><i style="width:${(100 * t.a) / t.n}%;background:${ROLE_COLOR[PEOPLE[pid].role]}"></i></span><span class="num">${t.a}/${t.n}</span></button>`).join('')
    : '<p class="fine">Nobody in view meets the minimum.</p>';
  $('pt-advice').querySelectorAll('.abar').forEach(b => { b.onclick = () => onPerson(+b.dataset.pid); });
}

export function renderPatterns(idx, S, onPerson) {
  adminTable(idx);
  splitBars('pt-hawk', idx, 'presHawk', 'presDove', 'Hawk side', 'Dove side', 'var(--red)', 'var(--blue)');
  splitBars('pt-ac', idx, 'presAC', 'presNonAC', 'Side fearing looking soft', 'Other side', 'var(--c5)', 'var(--c3)');
  timeChart(idx, S.dim);
  advice(idx, S.min, onPerson);
}
