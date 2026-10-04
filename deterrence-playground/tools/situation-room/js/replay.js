// Meeting replay: seats around the table, issue chips, turn strip and player.
import { MEETINGS, ISSUES, PEOPLE, ROLES, ROLE_COLOR, positions, splitDesc, esc, fmtDate, shortName, issueLetter } from './model.js';

const NS = 'http://www.w3.org/2000/svg';
const $ = id => document.getElementById(id);
const el = (tag, attrs = {}, parent, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
};
const SIDE = { 1: 'var(--c1)', 0: 'var(--c2)' };
const initials = n => n.split(' ').filter(w => /^[A-Z]/.test(w)).map(w => w[0]).slice(0, 2).join('') || n[0];

const WIDE = { W: 760, H: 440, cx: 380, cy: 222, rx: 300, ry: 160, tx: 232, ty: 104 };
const TALL = { W: 400, H: 600, cx: 200, cy: 300, rx: 140, ry: 236, tx: 84, ty: 168 };
let G = WIDE;

/** Seat geometry: President at the head (top), everyone else in order of first speaking. */
function seats(m) {
  const order = m.spk.map(s => s[0]).filter(p => p !== m.pres);
  const { cx, cy, rx, ry } = G;
  const out = new Map();
  const n = order.length + (m.pres != null ? 1 : 0);
  const start = -Math.PI / 2;
  const list = m.pres != null ? [m.pres, ...order] : order;
  list.forEach((pid, i) => {
    const a = n === 1 ? start : start + (i * 2 * Math.PI) / n + (m.pres == null ? Math.PI / n : 0);
    out.set(pid, { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a), a });
  });
  return out;
}

export function sideLabel(k, v) {
  const s = splitDesc(ISSUES[k].d);
  if (v === 'N/A') return 'N/A: asked, gave no view';
  const txt = v === 1 ? s.s1 : s.s0;
  return `Side ${v}${txt ? ': ' + txt : ''}`;
}

export function renderHeader(S, m) {
  $('m-title').textContent = m.subj || `Meeting ${m.id}`;
  const pres = m.pres != null ? PEOPLE[m.pres].n : 'President not recorded speaking';
  $('m-meta').innerHTML = `<span class="num">${fmtDate(m.date)}</span> · ${esc(m.admin)} administration · ${esc(pres)} · meeting ${esc(m.id)} · <span class="pill">${m.srs}</span> · ${esc(m.assess || '')}`;
  const box = $('m-issues');
  box.innerHTML = m.issues.length ? m.issues.map(k => `<button type="button" class="btn ichip" data-k="${k}" aria-pressed="${k === S.i}">${issueLetter(k)}</button>`).join('')
    : '<span class="fine">No coded issue in this meeting.</span>';
  const iq = $('m-iq');
  if (!S.i) { iq.innerHTML = m.issues.length ? '' : `<p class="fine">${esc(m.notes || '')}</p>`; return; }
  const s = splitDesc(ISSUES[S.i].d);
  iq.innerHTML = `<p class="q">${esc(s.q)}</p>${s.s1 ? `<div class="sides"><p><span class="key" style="background:var(--c1)"></span><b>1</b> ${esc(s.s1)}</p><p><span class="key" style="background:var(--c2)"></span><b>0</b> ${esc(s.s0)}</p></div>` : ''}`;
}

export function renderRoom(S, m, onSeat) {
  const svg = $('room');
  svg.innerHTML = '';
  G = (svg.parentElement.clientWidth || 760) < 560 ? TALL : WIDE;
  svg.setAttribute('viewBox', `0 0 ${G.W} ${G.H}`);
  const seatPos = seats(m);
  const { cx: CX, cy: CY } = G;
  el('ellipse', { cx: CX, cy: CY, rx: G.tx, ry: G.ty, class: 'tabletop' }, svg);
  const cur = m.turns[Math.min(S.t, m.turns.length - 1)];
  const pos = S.i ? positions(m, S.t)[S.i] : new Map();
  const iss = S.i ? ISSUES[S.i] : null;
  // Centre readout
  const c = el('g', { class: 'centre' }, svg);
  el('text', { x: CX, y: CY - 16, class: 'c-big' }, c, `Turn ${S.t + 1} of ${m.turns.length}`);
  el('text', { x: CX, y: CY + 8, class: 'c-small' }, c, cur ? cur[0] : '');
  if (iss) {
    const lean = iss.ps == null ? 'No President lean' : `President: side ${iss.ps}`;
    el('text', { x: CX, y: CY + 32, class: 'c-small' }, c, lean + (iss.hd === 'Y' && iss.ps != null ? (iss.ps === iss.hs ? ' (hawk)' : ' (dove)') : ''));
  }
  // Speaking line from the current speaker to the table centre
  if (cur && seatPos.has(cur[1])) {
    const p = seatPos.get(cur[1]);
    el('line', { x1: p.x, y1: p.y, x2: CX + (p.x - CX) * 0.55, y2: CY + (p.y - CY) * 0.55, class: 'speakline' }, svg);
  }
  for (const s of m.spk) {
    const pid = s[0], p = seatPos.get(pid);
    const st = pos.get(pid);
    const g = el('g', { class: 'seat', tabindex: 0, role: 'button', 'data-pid': pid,
      'aria-label': `${PEOPLE[pid].n}, ${s[1] || ROLES[s[2]]}, ${s[3]} turns${st ? ', ' + (st.v === 'N/A' ? 'N/A' : 'side ' + st.v) : ''}` }, svg);
    const speaking = cur && cur[1] === pid;
    if (speaking) el('circle', { cx: p.x, cy: p.y, r: 30, class: 'halo' }, g);
    const fill = st ? (st.v === 'N/A' ? 'var(--chip)' : SIDE[st.v]) : 'var(--panel)';
    el('circle', { cx: p.x, cy: p.y, r: 21, class: 'chair' + (st && st.v === 'N/A' ? ' na' : '') + (st ? ' coded' : ''),
      style: `fill:${fill};stroke:${ROLE_COLOR[s[2]]}` }, g);
    if (st && st.moved) el('circle', { cx: p.x, cy: p.y, r: 25, class: 'moved' }, g);
    if (pid === m.pres) el('path', { d: `M${p.x - 9},${p.y - 26} l3,-8 l6,5 l6,-5 l3,8 z`, class: 'crown' }, g);
    el('text', { x: p.x, y: p.y + 4.5, class: 'ini' + (st && st.v !== 'N/A' ? ' on' : '') }, g, initials(PEOPLE[pid].n));
    const below = p.y >= CY;
    el('text', { x: p.x, y: below ? p.y + 37 : p.y - 30 - (pid === m.pres ? 10 : 0), class: 'nm' + (speaking ? ' cur' : '') }, g, shortName(pid));
    g.addEventListener('click', () => onSeat(pid));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSeat(pid); } });
    g.addEventListener('pointerenter', e => tip(e, m, s, st));
    g.addEventListener('pointerleave', () => { $('room-tip').hidden = true; });
  }
  $('room-legend').innerHTML = `<li><span class="sw" style="background:var(--c1)"></span>Side 1</li><li><span class="sw" style="background:var(--c2)"></span>Side 0</li>
    <li><span class="sw na"></span>N/A (asked, no view)</li><li><span class="sw ring"></span>Moved between sides</li><li><span class="sw blank"></span>Not coded on this issue</li>
    <li class="fine">Ring colour = role: ${Object.entries(ROLES).filter(([k]) => m.spk.some(s => s[2] === k)).map(([k, v]) => `<span class="rk" style="border-color:${ROLE_COLOR[k]}"></span>${v}`).join(' ')}</li>`;
}

function tip(e, m, s, st) {
  const t = $('room-tip');
  const box = $('room').getBoundingClientRect(), host = t.parentElement.getBoundingClientRect();
  const sv = e.currentTarget.querySelector('.chair');
  const cx = Number(sv.getAttribute('cx')) / G.W * box.width + box.left - host.left;
  const cy = Number(sv.getAttribute('cy')) / G.H * box.height + box.top - host.top;
  t.innerHTML = `<b>${esc(PEOPLE[s[0]].n)}</b><span class="tt-d">${esc(s[1] || ROLES[s[2]])}</span><span class="tt-d">${s[3]} turn${s[3] === 1 ? '' : 's'} in this record${st ? ' · ' + (st.v === 'N/A' ? 'N/A' : 'side ' + st.v) + (st.moved ? ', moved' : '') : ''}</span>`;
  t.hidden = false;
  t.style.left = Math.max(4, Math.min(cx + 16, host.width - t.offsetWidth - 4)) + 'px';
  t.style.top = Math.max(4, cy - 10) + 'px';
}

export function renderStrip(S, m, onTurn) {
  const svg = $('strip');
  svg.innerHTML = '';
  const n = m.turns.length, w = 1000 / n;
  m.turns.forEach((t, i) => {
    const v = S.i && t[2] ? t[2][S.i] : undefined;
    const any = !!t[2];
    const h = v !== undefined ? 40 : any ? 22 : 10;
    const fill = v === 1 ? 'var(--c1)' : v === 0 ? 'var(--c2)' : v === 'N/A' ? 'var(--muted)' : any ? 'var(--faint)' : 'var(--rule)';
    const r = el('rect', { x: i * w + (w > 3 ? 0.5 : 0), y: 46 - h, width: Math.max(w - (w > 3 ? 1 : 0), 0.6), height: h, style: `fill:${fill}`, class: i <= S.t ? '' : 'future' }, svg);
    r.addEventListener('click', () => onTurn(i));
    if (t[1] === m.pres) el('rect', { x: i * w, y: 0, width: Math.max(w, 1), height: 3, class: 'presmark' }, svg);
  });
  el('rect', { x: S.t * w, y: 0, width: Math.max(w, 2), height: 46, class: 'cursor' }, svg);
  const r = $('p-range');
  r.max = n - 1; r.value = S.t;
  $('p-pos').textContent = `${S.t + 1}/${n}`;
}

export function renderTurn(S, m) {
  const t = m.turns[S.t];
  const box = $('turn');
  if (!t) { box.innerHTML = ''; return; }
  const sp = m.spk.find(s => s[0] === t[1]);
  const head = `<p class="who"><b>${esc(PEOPLE[t[1]].n)}</b> <span class="muted">${esc(sp ? sp[1] : '')}</span> <span class="num seg">${esc(t[0])}</span></p>`;
  if (!t[2]) { box.innerHTML = head + '<p class="fine">Not coded on any issue. The tool carries text only for coded turns.</p>'; return; }
  const tags = Object.entries(t[2]).map(([k, v]) => `<span class="tag" data-v="${v}">${issueLetter(k)} · ${esc(sideLabel(k, v))}</span>`).join('');
  box.innerHTML = `${head}<blockquote>${esc(t[3])}</blockquote><p class="fine cite">Meeting ${esc(m.id)}, ${fmtDate(m.date)}, segment ${esc(t[0])}. Excerpt from the coded record${t[3].endsWith('…') ? ', cut at 280 characters' : ''}.</p><div class="tags">${tags}</div>`;
}
