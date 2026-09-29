// Extended Deterrence: the sourced real-world panel. A timeline of U.S. commitments and the NATO sharing table.
import { COMMITMENTS, SHARING } from '../data/commitments.js';
import { el, escapeHtml as esc } from '../../../shared/js/mapkit.js';

const KIND = { treaty: ['Treaty', '--c1'], law: ['U.S. law', '--c2'], deployment: ['Nuclear deployment', '--c4'], withdrawal: ['Withdrawal', '--c6'], declaration: ['Declaration', '--c5'] };

export function renderWorld(root) {
  root.innerHTML = `<div class="world-h"><h2>The real commitments</h2>
    <p>U.S. security commitments that carry, or once carried, the extended-deterrence problem, at country level. Treaty wording comes from the official texts. Nuclear-sharing hosts are not officially named; the table gives what the Federation of American Scientists reports. Click a year to jump to its entry.</p></div>
    <div class="card fig"><svg id="ed-timeline" role="img" aria-label="Timeline of U.S. extended-deterrence commitments, 1949 to 2023"></svg>
      <div class="legend">${Object.values(KIND).map(([t, c]) => `<span class="lg"><i style="background:var(${c})"></i>${t}</span>`).join('')}</div></div>
    <div class="wgrid">
      <div class="wlist">${COMMITMENTS.map((c, i) => `<article class="wcard" id="cm-${i}">
        <div class="meta"><span class="num">${c.year}</span><span>${esc(c.who)}</span><span class="dtag" style="color:var(${KIND[c.kind][1]})">${KIND[c.kind][0]}</span><span class="ptag">Nuclear: ${esc(c.nuclear)}</span></div>
        <h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>
        <ul class="src">${c.sources.map(s => `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a></li>`).join('')}</ul></article>`).join('')}</div>
      <div class="card wshare"><p class="eyebrow">NATO nuclear sharing, by country</p>
        <p class="fine">${esc(SHARING.official)} <a href="${SHARING.officialSource.u}" target="_blank" rel="noopener">${esc(SHARING.officialSource.t)}</a></p>
        <div class="tablewrap"><table><thead><tr><th>Country</th><th>Status</th></tr></thead><tbody>
        ${SHARING.rows.map(r => `<tr><td>${esc(r.country)}</td><td><span class="pill" data-st="${esc(r.status)}">${esc(r.status)}</span>${r.note ? `<br><small>${esc(r.note)}</small>` : ''}</td></tr>`).join('')}
        </tbody></table></div>
        <p class="fine">“Reported host” means U.S. B61 bombs are stored there according to the FAS Nuclear Notebook. Sources:</p>
        <ul class="src">${SHARING.sources.map(s => `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a></li>`).join('')}</ul>
      </div>
    </div>`;
  drawTimeline(root.querySelector('#ed-timeline'));
}

function drawTimeline(svg) {
  const W = 1100, H = 120, x0 = 30, x1 = 1070, y0 = 1945, y1 = 2027;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const sx = y => x0 + (y - y0) / (y1 - y0) * (x1 - x0), g = el('g', {}, svg);
  el('line', { x1: x0, x2: x1, y1: 70, y2: 70, class: 'tl' }, g);
  for (let y = 1950; y <= 2020; y += 10) {
    el('line', { x1: sx(y), x2: sx(y), y1: 70, y2: 76, class: 'tl' }, g);
    el('text', { x: sx(y), y: 92, 'text-anchor': 'middle', class: 'tk' }, g, String(y));
  }
  // South Korea deployment span
  el('rect', { x: sx(1958), y: 64, width: sx(1991.95) - sx(1958), height: 12, class: 'span' }, g);
  el('text', { x: sx(1975), y: 112, 'text-anchor': 'middle', class: 'tk' }, g, 'U.S. nuclear weapons in South Korea, 1958–1991');
  const seen = {};
  COMMITMENTS.forEach((c, i) => {
    const k = seen[c.year] = (seen[c.year] || 0) + 1;
    const cy = 70 - 16 * k;
    const a = el('a', { href: `#cm-${i}`, class: 'tdot' }, g);
    a.addEventListener('click', e => { e.preventDefault(); const t = document.getElementById(`cm-${i}`); t.scrollIntoView({ block: 'center' }); t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1400); });
    el('line', { x1: sx(c.year), x2: sx(c.year), y1: cy, y2: 70, class: 'tl' }, a);
    el('circle', { cx: sx(c.year), cy, r: 7, fill: `var(${KIND[c.kind][1]})` }, a);
    el('title', {}, a, `${c.year}: ${c.title} (${c.who})`);
  });
}
