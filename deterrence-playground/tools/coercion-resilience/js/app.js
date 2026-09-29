// Coercion Without Concession: state, URL hash, wiring.
import { $, monthLabel } from './util.js';
import { TRADE, TOURISM, PRODUCT_KEYS, YEARS, KR_ROWS, BASE_YEAR } from './series.js';
import { createAuChart } from './au-chart.js';
import { createKrChart } from './kr-chart.js';
import { drawDest } from './dest.js';
import { auPanelHtml, auReadHtml, auClaimHtml, krPanelHtml, krReadHtml, timelineHtml } from './panel.js';
import { createTour } from './tour.js';

const S = { view: 'au', product: 'wine', year: '2021', unit: 'usd', month: '201704', allEvents: false };

function writeHash() {
  const q = S.view === 'au'
    ? new URLSearchParams({ v: 'au', p: S.product, y: S.year, u: S.unit })
    : new URLSearchParams({ v: 'kr', m: S.month });
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (q.get('v') === 'kr') {
    S.view = 'kr';
    if (KR_ROWS.some(r => r.ym === q.get('m'))) S.month = q.get('m');
    return;
  }
  if (PRODUCT_KEYS.includes(q.get('p'))) S.product = q.get('p');
  if (YEARS.includes(q.get('y'))) S.year = q.get('y');
  if (['usd', 't'].includes(q.get('u'))) S.unit = q.get('u');
}

const auChart = createAuChart($('au-chart'), $('au-tip'), $('au-wrap'), {
  onYear: y => { if (YEARS.includes(y)) { S.year = y; render(); } },
});
const krChart = createKrChart($('kr-chart'), $('kr-tip'), $('kr-wrap'), {
  onMonth: m => { S.month = m; render(); },
});

let mountedView = null;
function mountPanel() {
  if (mountedView === S.view) return;
  mountedView = S.view;
  $('panel').innerHTML = S.view === 'au' ? auPanelHtml() : krPanelHtml();
  if (S.view === 'au') {
    document.querySelectorAll('#prods button').forEach(b => b.onclick = () => { S.product = b.dataset.p; render(); });
    document.querySelectorAll('.units button').forEach(b => b.onclick = () => { S.unit = b.dataset.u; render(); });
    $('yr').oninput = e => { S.year = YEARS[+e.target.value]; render(); };
  }
}

function render() {
  mountPanel();
  const au = S.view === 'au';
  document.querySelectorAll('#views button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.view)));
  $('au-card').hidden = !au; $('kr-card').hidden = au;
  if (au) {
    document.querySelectorAll('#prods button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.p === S.product)));
    document.querySelectorAll('.units button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.u === S.unit)));
    $('yr').value = YEARS.indexOf(S.year); $('yr-out').textContent = S.year;
    const lab = TRADE.products[S.product].label;
    $('au-title').textContent = `${lab}: Australia’s exports by month, ${S.unit === 't' ? 'tonnes' : 'US$'}`;
    auChart.render(S);
    $('dest-title').textContent = `${lab}: top destinations, ${BASE_YEAR} and ${S.year}`;
    drawDest($('dest'), $('dest-wrap'), S.product, S.year);
    $('au-read').innerHTML = auReadHtml(S);
    $('au-claim').innerHTML = auClaimHtml(S.product);
  } else {
    krChart.render(S);
    $('kr-read').innerHTML = krReadHtml(S.month);
  }
  $('tl-list').innerHTML = timelineHtml(S.view, S.product, S.allEvents);
  $('tl-all').parentElement.hidden = !au;
  $('tl-title').textContent = au ? `Measures and removals${S.allEvents ? '' : `: ${TRADE.products[S.product].label.toLowerCase()} and general`}` : 'Measures and removals: THAAD dispute';
  document.querySelectorAll('.tl-go').forEach(b => b.onclick = () => {
    const d = b.dataset.date;
    if (S.view === 'au') {
      if (b.dataset.p && !b.dataset.p.split(',').includes(S.product)) S.product = b.dataset.p.split(',')[0];
      const y = d.slice(0, 4);
      S.year = YEARS.includes(y) ? y : YEARS.includes(String(+y + 1)) ? String(+y + 1) : S.year;
    } else S.month = d.slice(0, 7).replace('-', '');
    render();
    $(S.view === 'au' ? 'au-card' : 'kr-card').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  });
  writeHash();
}

document.querySelectorAll('#views button').forEach(b => b.onclick = () => { S.view = b.dataset.v; render(); });
$('tl-all').onchange = e => { S.allEvents = e.target.checked; render(); };

const tour = createTour($('stage'), set => { Object.assign(S, set); render(); });
$('start-tour').onclick = () => tour.start();
$('copy-link').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy-link').textContent = 'Link copied'; }
  catch { $('copy-link').textContent = 'Copy the address bar'; }
  setTimeout(() => { $('copy-link').textContent = 'Copy link'; }, 1800);
};
$('asof').textContent = `Trade: UN Comtrade, ${monthLabel(TRADE.months[0])} to ${monthLabel(TRADE.months[1])}, retrieved ${TRADE.retrieved[1]}. Tourism: KTO Data Lab, ${monthLabel(KR_ROWS[0].ym)} to ${monthLabel(KR_ROWS[KR_ROWS.length - 1].ym)}, retrieved ${TOURISM.retrieved}.`;

readHash();
render();
let rt;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(render, 120); });
window.addEventListener('hashchange', () => { readHash(); render(); });
