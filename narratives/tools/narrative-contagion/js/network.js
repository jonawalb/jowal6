// SVG network: countries (or outlets grouped by country) on a ring, links = clusters shared, arrows = who was first.
// Also draws the replay of a single cluster spreading outward from its first-seen source.

const NS = 'http://www.w3.org/2000/svg';
const W = 800, H = 640, CX = 400, CY = 318, R = 228;
export const RING = ['RU', 'BY', 'TR', 'SY', 'IR', 'PK', 'IN', 'CN', 'TW', 'US', 'VE', 'CU', 'KP'];
const TYPE_NAME = { o: 'official', s: 'state media', m: 'independent media' };

const el = (tag, attrs = {}, parent, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Node positions for a level. Countries sit on the ring; outlets fan out just outside their country. */
export function layout(D, level) {
  const cs = RING.filter(c => D.countries[c]);
  const ang = c => -Math.PI / 2 + (2 * Math.PI * cs.indexOf(c)) / cs.length;
  const pos = new Map();
  if (level === 'country') {
    cs.forEach(c => pos.set(c, { x: CX + R * Math.cos(ang(c)), y: CY + R * Math.sin(ang(c)), a: ang(c), c }));
    return pos;
  }
  const byC = {};
  D.outlets.forEach((o, i) => (byC[o.c] = byC[o.c] || []).push(i));
  const w = cs.map(c => Math.max(2.5, (byC[c] || []).length));
  const tot = w.reduce((a, b) => a + b, 0);
  let acc = 0;
  cs.forEach((c, ci) => {
    const a0 = -Math.PI / 2 - (Math.PI * w[0]) / tot + (2 * Math.PI * acc) / tot, sector = (2 * Math.PI * w[ci]) / tot;
    acc += w[ci];
    const list = (byC[c] || []).sort((a, b) => D.outlets[a].type.localeCompare(D.outlets[b].type) || D.outlets[a].name.localeCompare(D.outlets[b].name));
    list.forEach((o, k) => {
      const a = a0 + sector * (0.12 + (0.76 * (k + 0.5)) / list.length);
      const r = R + (k % 2 ? 22 : -8);
      pos.set(o, { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a), a, c });
    });
    pos.set(`label:${c}`, { a: a0 + sector / 2 });
  });
  return pos;
}

function curve(p, q, bend = 0.28) {
  const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
  const cx = mx + (CX - mx) * bend, cy = my + (CY - my) * bend;
  return `M${p.x.toFixed(1)},${p.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${q.x.toFixed(1)},${q.y.toFixed(1)}`;
}
/** Shorten a path end so arrowheads sit outside the node circle. */
function trim(p, q, rp, rq) {
  const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
  return [{ x: p.x + (dx / d) * rp, y: p.y + (dy / d) * rp }, { x: q.x - (dx / d) * rq, y: q.y - (dy / d) * rq }];
}

export function createNetwork(svg, tip, handlers) {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const defs = el('defs', {}, svg);
  for (const [id, cls] of [['nc-arrow', 'nc-arrowhead'], ['nc-arrow-hot', 'nc-arrowhead hot']]) {
    const m = el('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 10, markerHeight: 10, markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0,0 L10,5 L0,10 z', class: cls }, m);
  }
  const gLinks = el('g', { class: 'nc-links' }, svg), gNodes = el('g', { class: 'nc-nodes' }, svg), gNote = el('g', {}, svg);

  function showTip(evt, html) {
    tip.innerHTML = html; tip.hidden = false;
    const box = svg.parentElement.getBoundingClientRect();
    const x = (evt.clientX ?? box.left + box.width / 2) - box.left, y = (evt.clientY ?? box.top + 60) - box.top;
    tip.style.left = `${Math.max(4, Math.min(box.width - tip.offsetWidth - 4, x + 12))}px`;
    tip.style.top = `${Math.max(4, y - tip.offsetHeight - 10)}px`;
  }
  const hideTip = () => { tip.hidden = true; };
  svg.addEventListener('mouseleave', hideTip);

  function nodeName(D, level, k) {
    if (level === 'country') return `${D.countries[k]}`;
    const o = D.outlets[k];
    return `${o.name} (${D.countries[o.c]}, ${TYPE_NAME[o.type]})`;
  }

  /** Aggregate view. net = model.network(); fresh = Set of link ids new in the current playback month. */
  function draw(D, level, net, { fresh = new Set(), minLink = 1, focus = null } = {}) {
    gLinks.replaceChildren(); gNodes.replaceChildren(); gNote.replaceChildren();
    const pos = layout(D, level);
    const maxN = Math.max(1, ...net.nodes.values());
    const links = net.links.filter(l => l.n >= minLink && pos.has(l.a) && pos.has(l.b)).sort((a, b) => a.n - b.n);
    const maxL = Math.max(1, ...links.map(l => l.n));
    const rad = k => (level === 'country' ? 9 + 20 * Math.sqrt((net.nodes.get(k) || 0) / maxN) : 4 + 9 * Math.sqrt((net.nodes.get(k) || 0) / maxN));
    for (const l of links) {
      const dir = l.aFirst + l.bFirst;
      const lead = dir >= 3 && Math.max(l.aFirst, l.bFirst) / dir >= 0.6 ? (l.aFirst > l.bFirst ? 'a' : 'b') : null;
      const [from, to] = lead === 'b' ? [l.b, l.a] : [l.a, l.b];
      const [p, q] = trim(pos.get(from), pos.get(to), rad(from) + 1, rad(to) + 3);
      const id = `${l.a}|${l.b}`, hot = fresh.has(id);
      const dim = focus != null && l.a !== focus && l.b !== focus;
      const path = el('path', { d: curve(p, q), class: `nc-link${hot ? ' hot' : ''}${lead ? '' : ' even'}${dim ? ' dim' : ''}`,
        'stroke-width': (0.8 + 7 * Math.sqrt(l.n / maxL)).toFixed(2), 'marker-end': lead ? `url(#${hot ? 'nc-arrow-hot' : 'nc-arrow'})` : null }, gLinks);
      const A = nodeName(D, level, l.a), B = nodeName(D, level, l.b);
      const html = `<b>${esc(A)} ↔ ${esc(B)}</b><br>${l.n} shared cluster${l.n === 1 ? '' : 's'}<br>${esc(A)} first: ${l.aFirst} · ${esc(B)} first: ${l.bFirst} · same day: ${l.same}`;
      path.addEventListener('mousemove', e => showTip(e, html));
      path.addEventListener('mouseleave', hideTip);
      if (level === 'country') {
        path.setAttribute('tabindex', '0'); path.setAttribute('role', 'button');
        path.setAttribute('aria-label', `${A} and ${B}: ${l.n} shared clusters. ${A} first ${l.aFirst}, ${B} first ${l.bFirst}, same day ${l.same}. Show these clusters.`);
        path.addEventListener('click', () => handlers.onPair(l.a, l.b));
        path.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlers.onPair(l.a, l.b); } });
        path.addEventListener('focus', () => { const b = path.getBBox(); const r = svg.getBoundingClientRect(); showTip({ clientX: r.left + (b.x + b.width / 2) * r.width / W, clientY: r.top + (b.y + b.height / 2) * r.height / H }, html); });
        path.addEventListener('blur', hideTip);
      }
    }
    for (const [k, p] of pos) {
      if (typeof k === 'string' && k.startsWith('label:')) continue;
      const n = net.nodes.get(k) || 0;
      const g = el('g', { class: `nc-node${n ? '' : ' empty'}${focus != null && focus !== k ? ' dim' : ''}`, transform: `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})` }, gNodes);
      const type = level === 'country' ? 'c' : D.outlets[k].type;
      el('circle', { r: rad(k).toFixed(1), class: `t-${type}` }, g);
      if (level === 'country' && n) el('circle', { r: (rad(k) * Math.sqrt((net.official.get(k) || 0) / n)).toFixed(1), class: 't-o inner' }, g);
      const out = level === 'country' ? 1 : 0;
      const lx = Math.cos(p.a) * (rad(k) + 7), ly = Math.sin(p.a) * (rad(k) + 7);
      const anchor = Math.cos(p.a) > 0.3 ? 'start' : Math.cos(p.a) < -0.3 ? 'end' : 'middle';
      if (out) el('text', { x: lx.toFixed(1), y: (ly + (Math.sin(p.a) > 0.3 ? 12 : Math.sin(p.a) < -0.3 ? -4 : 4)).toFixed(1), 'text-anchor': anchor, class: 'nc-label' }, g, k === 'US' ? 'U.S.' : D.countries[k]);
      else if (n && rad(k) >= 7.5) el('text', { x: lx.toFixed(1), y: (ly + 3).toFixed(1), 'text-anchor': anchor, class: 'nc-label small' }, g, D.outlets[k].name);
      const html = `<b>${esc(nodeName(D, level, k))}</b><br>${n} cluster${n === 1 ? '' : 's'} in the current filter${level === 'country' && n ? `<br>with an official text from ${esc(D.countries[k])}: ${net.official.get(k) || 0}` : ''}`;
      g.addEventListener('mousemove', e => showTip(e, html));
      g.addEventListener('mouseleave', hideTip);
      if (n) {
        g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
        g.setAttribute('aria-label', `${nodeName(D, level, k)}: ${n} clusters. Filter to ${level === 'country' ? 'this country' : 'its country'}.`);
        const go = () => handlers.onCountry(level === 'country' ? k : D.outlets[k].c);
        g.addEventListener('click', go);
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      }
    }
    if (level === 'outlet') {
      for (const c of RING.filter(x => D.countries[x])) {
        const a = pos.get(`label:${c}`).a;
        el('text', { x: (CX + (R + 84) * Math.cos(a)).toFixed(1), y: (CY + (R + 84) * Math.sin(a) + 4).toFixed(1), 'text-anchor': 'middle', class: 'nc-label country' }, gNote, c);
      }
    }
  }

  /** Replay one cluster up to `day` (absolute day number). Members are mapped to nodes of the current level. */
  function replay(D, level, c, day) {
    gLinks.replaceChildren(); gNodes.replaceChildren(); gNote.replaceChildren();
    const pos = layout(D, level);
    const key = m => (level === 'country' ? m.country : m.outlet);
    const firstAt = new Map();
    c.members.forEach(m => { const k = key(m); if (!firstAt.has(k)) firstAt.set(k, m); });
    const drawn = new Set();
    c.members.forEach((m, i) => {
      const p = c.parents[i];
      if (p < 0 || m.day > day) return;
      const a = key(c.members[p]), b = key(m);
      if (a === b || drawn.has(`${a}>${b}`) || !pos.has(a) || !pos.has(b)) return;
      drawn.add(`${a}>${b}`);
      const [s, t] = trim(pos.get(a), pos.get(b), 12, 15);
      el('path', { d: curve(s, t, 0.18), class: `nc-link replay${m.day === day ? ' hot' : ''}`, 'stroke-width': 2.4, 'marker-end': `url(#${m.day === day ? 'nc-arrow-hot' : 'nc-arrow'})` }, gLinks);
    });
    for (const [k, p] of pos) {
      if (typeof k === 'string' && k.startsWith('label:')) continue;
      const f = firstAt.get(k), on = f && f.day <= day;
      const g = el('g', { class: `nc-node${on ? '' : ' empty'}${f && f.day === day ? ' pulse' : ''}`, transform: `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})` }, gNodes);
      const type = level === 'country' ? (f && on ? f.otype : 'c') : D.outlets[k].type;
      el('circle', { r: f ? 11 : 5, class: `t-${type}${f && !on ? ' pending' : ''}` }, g);
      const anchor = Math.cos(p.a) > 0.3 ? 'start' : Math.cos(p.a) < -0.3 ? 'end' : 'middle';
      const lx = Math.cos(p.a) * 18, ly = Math.sin(p.a) * 18, up = Math.sin(p.a) < -0.3;
      if (level === 'country' || f) el('text', { x: lx.toFixed(1), y: (ly + (up ? -10 : 4)).toFixed(1), 'text-anchor': anchor, class: `nc-label${level === 'outlet' ? ' small' : ''}` }, g,
        level === 'country' ? (k === 'US' ? 'U.S.' : D.countries[k]) : D.outlets[k].name);
      if (f && on) el('text', { x: lx.toFixed(1), y: (ly + (up ? 4 : 17)).toFixed(1), 'text-anchor': anchor, class: 'nc-date' }, g,
        f === c.members[0] ? `first seen ${f.date}` : `+${f.day - c.members[0].day}d`);
    }
    el('text', { x: CX, y: CY - 6, 'text-anchor': 'middle', class: 'nc-center' }, gNote, `Day +${day - c.members[0].day}`);
    el('text', { x: CX, y: CY + 16, 'text-anchor': 'middle', class: 'nc-center-sub' }, gNote, new Date(day * 86400000).toISOString().slice(0, 10));
  }

  return { draw, replay };
}

