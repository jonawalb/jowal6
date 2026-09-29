// The ladder: 44 rungs in Kahn's seven groups, with his six thresholds as dividers. Rungs reached by the
// selected crisis (and a comparison crisis) are marked; the current step's rung is highlighted.
import { RUNGS, GROUPS, BOTTOM, TOP } from '../data/ladder.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function buildLadder(root, onRung) {
  const html = [`<div class="kl-cap">${esc(TOP)}</div>`];
  for (const g of [...GROUPS].reverse()) {
    html.push(`<section class="kl-group" data-g="${g.id}" aria-label="${esc(g.name)}, rungs ${g.from} to ${g.to}"><h3 class="kl-gname">${esc(g.name)}</h3><button type="button" class="kl-more" data-expand="1">Rungs ${g.from}–${g.to} not reached. Show all ${g.to - g.from + 1}</button><ol class="kl-rungs" reversed start="${g.to}">`);
    for (let n = g.to; n >= g.from; n--) {
      html.push(`<li class="kl-rung" data-n="${n}"><button type="button" data-n="${n}" aria-label="Rung ${n}: ${esc(RUNGS[n])}"><span class="kl-n">${n}</span><span class="kl-name">${esc(RUNGS[n])}</span><span class="kl-marks"></span></button></li>`);
    }
    html.push('</ol></section>');
    const below = GROUPS[GROUPS.indexOf(g) - 1];
    if (below) html.push(`<div class="kl-thr" data-after="${below.id}"><span>${esc(below.after)}</span></div>`);
  }
  html.push(`<div class="kl-cap">${esc(BOTTOM)}</div>`);
  root.innerHTML = html.join('');
  root.addEventListener('click', e => {
    if (e.target.closest('[data-expand]')) { root.classList.add('expanded'); root.querySelector('.kl-less').hidden = false; return; }
    if (e.target.closest('.kl-less')) { root.classList.remove('expanded'); e.target.hidden = true; return; }
    const b = e.target.closest('button[data-n]'); if (b) onRung(Number(b.dataset.n));
  });
  root.insertAdjacentHTML('afterbegin', '<button type="button" class="btn kl-less" hidden>Collapse rungs no crisis here reached</button>');
}

/**
 * Mark rungs. a/b: { crisis, step } for the primary and comparison crisis (b may be null).
 * The primary crisis shows every step up to the current one; the comparison shows its whole path.
 */
export function markLadder(root, a, b, focusRung) {
  root.querySelectorAll('.kl-rung').forEach(li => {
    li.classList.remove('hit-a', 'hit-b', 'cur', 'focus');
    li.querySelector('.kl-marks').innerHTML = '';
  });
  const put = (n, cls, label, title) => {
    const li = root.querySelector(`.kl-rung[data-n="${n}"]`);
    if (!li) return;
    li.classList.add(cls);
    li.querySelector('.kl-marks').insertAdjacentHTML('beforeend', `<span class="kl-mark ${cls === 'hit-a' ? 'ma' : 'mb'}" title="${esc(title)}">${label}</span>`);
  };
  if (a) {
    a.crisis.steps.forEach((s, i) => { if (i <= a.step) put(s.rung, 'hit-a', i + 1, `${a.crisis.short} step ${i + 1}: ${s.date}`); });
    const cur = a.crisis.steps[a.step];
    if (cur) root.querySelector(`.kl-rung[data-n="${cur.rung}"]`)?.classList.add('cur');
  }
  if (b) b.crisis.steps.forEach((s, i) => put(s.rung, 'hit-b', i + 1, `${b.crisis.short} step ${i + 1}: ${s.date}`));
  // Groups above the No Nuclear Use threshold stay folded unless something in them is marked or focused.
  root.querySelectorAll('.kl-group').forEach(g => {
    const hot = g.querySelector('.hit-a, .hit-b') || (focusRung && g.querySelector(`[data-n="${focusRung}"]`));
    g.classList.toggle('collapsed', !hot && ['bizarre', 'exemplary', 'military', 'civilian'].includes(g.dataset.g));
  });
  if (focusRung) root.querySelector(`.kl-rung[data-n="${focusRung}"]`)?.classList.add('focus');
}

/** Small step-by-rung path chart for one or two crises: shows climbs, pauses and climb-downs. */
export function pathChart(svg, a, b) {
  const W = Math.max(320, Math.round(svg.parentElement.clientWidth || 640)), H = W < 560 ? 220 : 260, m = { l: 44, r: 12, t: 12, b: 28 };
  const maxSteps = Math.max(a.crisis.steps.length, b ? b.crisis.steps.length : 0);
  const top = Math.max(26, ...a.crisis.steps.map(s => s.rung), ...(b ? b.crisis.steps.map(s => s.rung) : [])) + 1;
  const x = i => m.l + (maxSteps < 2 ? 0 : i / (maxSteps - 1)) * (W - m.l - m.r);
  const y = r => m.t + (1 - r / top) * (H - m.t - m.b);
  const parts = [];
  for (const g of GROUPS) {
    if (g.from > top) break;
    parts.push(`<rect class="pc-band ${GROUPS.indexOf(g) % 2 ? 'odd' : ''}" x="${m.l}" y="${y(Math.min(g.to + 0.5, top))}" width="${W - m.l - m.r}" height="${y(g.from - 0.5) - y(Math.min(g.to + 0.5, top))}"/>`);
    if (g.after && g.to + 0.5 < top) parts.push(`<line class="pc-thr" x1="${m.l}" x2="${W - m.r}" y1="${y(g.to + 0.5)}" y2="${y(g.to + 0.5)}"/>`);
  }
  for (let r = 5; r < top; r += 5) parts.push(`<text class="pc-ax" x="${m.l - 6}" y="${y(r) + 4}" text-anchor="end">${r}</text>`);
  parts.push(`<text class="pc-ax" x="${m.l - 6}" y="${y(1) + 4}" text-anchor="end">1</text>`);
  for (let i = 0; i < maxSteps; i++) parts.push(`<text class="pc-ax" x="${x(i)}" y="${H - 8}" text-anchor="middle">${i + 1}</text>`);
  const series = (c, cls, upto) => {
    const pts = c.steps.map((s, i) => [x(i), y(s.rung)]);
    if (!pts.length) return;
    parts.push(`<path class="pc-line ${cls}" d="M${pts.map(p => p.join(',')).join('L')}"/>`);
    pts.forEach((p, i) => parts.push(`<circle class="pc-dot ${cls}${i === upto ? ' now' : ''}" cx="${p[0]}" cy="${p[1]}" r="${i === upto ? 6 : 4}"><title>${esc(c.short)} step ${i + 1}, rung ${c.steps[i].rung}: ${esc(c.steps[i].date)}</title></circle>`));
  };
  if (b) series(b.crisis, 'b', -1);
  series(a.crisis, 'a', a.step);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = parts.join('');
}
