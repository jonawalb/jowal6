// Iran–Israel Salvos: state, URL hash and wiring.
import { escapeHtml } from '../../../shared/js/mapkit.js';
import { addExportBar, tableRows } from '../../../shared/js/export.js';
import { EPISODES } from '../data/episodes.js';
import { INTERCEPTORS } from '../data/costs.js';
import { renderComp, renderFunnel, renderMatrix, renderCompare } from './charts.js';
import { buildPanel, renderPanel, reportedCounts } from './cost.js';
import { createMap } from './map.js';
import { createTour } from './tour.js';
import { renderSources, refs } from './refs.js';

const S = { ep: 'apr24', counts: reportedCounts('apr24') };
const q = new URLSearchParams(location.hash.slice(1));
if (EPISODES.some(e => e.id === q.get('ep'))) { S.ep = q.get('ep'); S.counts = reportedCounts(S.ep); }
if (q.has('n')) {
  q.get('n').split(',').forEach(p => {
    const [k, v] = p.split(':');
    if (INTERCEPTORS.some(i => i.k === k) && /^\d+$/.test(v)) S.counts[k] = Math.min(600, +v);
  });
}

buildPanel(document.getElementById('panel'));
const MAXT = Math.max(...EPISODES.map(e => e.launched.bm.v + e.launched.cm.v + e.launched.uav.v));
const map = createMap(document.getElementById('ii-map'), document.getElementById('ii-ext'));

function update() {
  const e = EPISODES.find(x => x.id === S.ep);
  document.getElementById('ii-ep-e').textContent = `${e.dates} · Iran against Israel`;
  document.getElementById('ii-ep-h').textContent = e.name;
  document.getElementById('ii-ep-s').textContent = e.summary;
  document.querySelectorAll('#ii-eps button').forEach(b => b.setAttribute('aria-pressed', b.dataset.ep === S.ep));
  renderComp(document.getElementById('ii-comp'), S);
  renderFunnel(document.getElementById('ii-funnel'), document.getElementById('ii-dis'), S);
  renderMatrix(document.getElementById('ii-mx'), S);
  renderCompare(document.getElementById('ii-cmp'), S);
  map.draw(e, MAXT);
  renderPanel(S);
  const h = new URLSearchParams({ ep: S.ep });
  const rep = reportedCounts(S.ep);
  const diff = INTERCEPTORS.filter(i => S.counts[i.k] !== rep[i.k]).map(i => `${i.k}:${S.counts[i.k]}`);
  if (diff.length) h.set('n', diff.join(','));
  history.replaceState(null, '', '#' + h.toString());
}
function setEp(id) { if (id === S.ep) return; S.ep = id; S.counts = reportedCounts(id); update(); }

document.getElementById('ii-eps').innerHTML = EPISODES.map(e =>
  `<button type="button" data-ep="${e.id}"><b>${e.short}</b>${escapeHtml(e.name)}<br><small>${e.dates}</small></button>`).join('');
document.getElementById('ii-eps').addEventListener('click', ev => { const b = ev.target.closest('[data-ep]'); if (b) setEp(b.dataset.ep); });
document.getElementById('ii-comp').addEventListener('click', ev => { const b = ev.target.closest('[data-ep]'); if (b) setEp(b.dataset.ep); });
const panel = document.getElementById('panel');
panel.addEventListener('input', ev => {
  const k = ev.target.dataset.k; if (!k) return;
  S.counts[k] = +ev.target.value; update();
});
panel.addEventListener('click', ev => {
  const b = ev.target.closest('[data-reset]'); if (!b) return;
  S.counts = b.dataset.reset === 'rep' ? reportedCounts(S.ep) : Object.fromEntries(INTERCEPTORS.map(i => [i.k, 0]));
  update();
});
const tour = createTour(document.getElementById('stage'), set => { S.ep = set.ep; S.counts = reportedCounts(set.ep); update(); });
document.getElementById('ii-tour').addEventListener('click', () => tour.start());
document.getElementById('ii-copy').addEventListener('click', async ev => {
  const b = ev.currentTarget;
  try { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copied'; } catch { b.textContent = 'Copy the address bar'; }
  setTimeout(() => { b.textContent = 'Copy link'; }, 1800);
});
addExportBar(document.getElementById('ii-mapbox'), { where: 'after', target: () => document.getElementById('ii-map'),
  title: () => `${EPISODES.find(e => e.id === S.ep).name}: launching country, target and regional defenders`, note: 'Country level only; Natural Earth basemap' });
addExportBar(document.getElementById('ii-cmpcard'), { csv: () => tableRows(document.getElementById('ii-cmp')), csvLabel: 'Copy comparison as CSV' });

renderSources(document.getElementById('ii-srcs'));
document.getElementById('ii-method').innerHTML = [
  `Every number shows its source as a bracketed reference; the numbered list below links each one. All pages were opened and checked on 29 September 2026. Sites that block automated requests (defense.gov, apnews.com, USNI News and others) are linked through archive.org copies.`,
  `Launch counts use the IDF figure as the headline where it gave one, because most other reports repeat it. The whisker and the "Where sources disagree" box show the other figures. Funnel bars marked "derived" are computed from the sourced numbers in their note, not reported directly.`,
  `The defenders table records a country or system only when a cited source reports it in action. No source found for this tool reports David's Sling or Iron Dome counts, or French or British interceptions in June 2025; Israel does not publish interceptor counts or unit costs.`,
  `The cost panel is <span class="notional">notional</span>. Unit costs are cited estimates: U.S. figures from Missile Defense Agency and Navy budget books, Israeli and Iranian figures from press and think-tank estimates. Counts default to reported figures (JINSA's estimates for June 2025, U.S. Navy counts for 2024) and to zero where none exists. The published cost estimates for each episode appear as ticks for comparison.`,
  `The map is country level only: Natural Earth 1:50m countries (public domain), built by <code>scripts/build_geo.py</code>. Arcs run from country label to country label and show no launch sites, flight paths or impact points.`,
  `The 2026 war is not charted, because counts were still incomplete when this tool was built. The provisional note under the comparison table gives the Times of Israel tally to 10 April 2026 ${refs(['toi26'])}.`,
].map(t => `<li>${t}</li>`).join('');
update();
