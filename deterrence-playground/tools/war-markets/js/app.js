// War Markets: state, URL hash, wiring.
import { $, dayLabel, esc } from './util.js';
import { BUILT, DATA_LAST, CASES, CASE_BY, MARKETS, caseWindow, caseEvents } from './series.js';
import { createChart } from './chart.js';
import { panelHtml, listHtml, focusHtml, drawScore } from './panel.js';
import { createTour } from './tour.js';

const S = { case: 'strike', focus: '1198479', hidden: new Set() };

function writeHash() {
  const q = new URLSearchParams({ q: S.case, f: S.focus });
  if (S.hidden.size) q.set('h', [...S.hidden].join(','));
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const c = CASE_BY.get(q.get('q'));
  if (!c) return;
  S.case = c.k;
  S.focus = c.ids.includes(q.get('f')) ? q.get('f') : c.ids[0];
  S.hidden = new Set((q.get('h') || '').split(',').filter(id => c.ids.includes(id) && id !== S.focus));
}

function setCase(k, focus) {
  const c = CASE_BY.get(k);
  S.case = k; S.hidden = new Set();
  S.focus = c.ids.includes(focus) ? focus : c.ids[0];
}

$('panel').innerHTML = panelHtml();
const chart = createChart($('chart'), $('tip'), $('chartwrap'), { onFocus: id => { S.focus = id; render(); } });

function render() {
  const c = CASE_BY.get(S.case);
  document.querySelectorAll('#cases button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === S.case)));
  $('mk-list').innerHTML = listHtml(S);
  document.querySelectorAll('#mk-list .mk').forEach(b => b.onclick = () => { S.focus = b.dataset.id; S.hidden.delete(S.focus); render(); });
  document.querySelectorAll('#mk-list .eye').forEach(b => b.onclick = () => {
    const id = b.dataset.eye;
    if (S.hidden.has(id)) S.hidden.delete(id); else if (id !== S.focus) S.hidden.add(id);
    render();
  });
  $('focus').innerHTML = focusHtml(S);
  $('case-title').textContent = c.title;
  chart.render(S, c);
  const sc = drawScore($('score'), $('scorewrap'), S, (k, id) => { setCase(k, id); render(); $('chartcard').scrollIntoView({ block: 'nearest' }); });
  $('score-text').innerHTML = `<b>${sc.n} resolved contracts.</b> ${sc.yes} happened; ${sc.yesLow} of those were priced under 50¢ a week before. ` +
    `${sc.n - sc.yes} did not happen; ${sc.noHigh} of those were priced at 50¢ or more a week before. Mean Brier score a week out: ${sc.mean.toFixed(3)} (0 is perfect; always saying 50¢ scores 0.25).`;
  writeHash();
}

document.querySelectorAll('#cases button').forEach(b => b.onclick = () => { setCase(b.dataset.k); render(); });

const tour = createTour($('stage'), set => {
  setCase(set.case, set.focus);
  render();
  if (set.score) $('scorecard').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});
$('start-tour').onclick = () => tour.start();
$('copy-link').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy-link').textContent = 'Link copied'; }
  catch { $('copy-link').textContent = 'Copy the address bar'; }
  setTimeout(() => { $('copy-link').textContent = 'Copy link'; }, 1800);
};
$('asof').textContent = `Market data through ${dayLabel(DATA_LAST)} (built ${BUILT}). ${Object.keys(MARKETS).length} contracts in ${CASES.length} questions.`;

const shown = new Map();
for (const c of CASES) for (const e of caseEvents(c, caseWindow(c))) shown.set(e.date + e.src, e);
$('ev-src').innerHTML = [...shown.values()].sort((a, b) => a.date.localeCompare(b.date)).map(e =>
  `<li>${dayLabel(e.date)}: ${esc(e.text)} <a href="${esc(e.src)}" target="_blank" rel="noopener">source</a>${e.opened ? '' : ' (not opened by the build)'}</li>`).join('');

readHash();
render();
let rt;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(render, 120); });
window.addEventListener('hashchange', () => { readHash(); render(); });
