// Method & sources: built from the same records the views use, so every link on the page is listed here.
import { DOCS, META, DEBATES } from '../data/policy.js';
import { COUNTRIES, esc, ext, dateText } from './common.js';

const byC = id => DOCS.filter(d => d.country === id).sort((a, b) => a.date.localeCompare(b.date));

document.getElementById('method-extra').innerHTML = `
  <h3>Method</h3>
  <ul class="src">${META.method.map(m => `<li>${m}</li>`).join('')}</ul>
  <h3>Not covered or not verified</h3>
  <ul class="src">${META.gaps.map(m => `<li>${m}</li>`).join('')}</ul>
  <h3>How to cite</h3>
  <p class="fine">Jonathan Walberg, "Understanding AI Policy," Interactive Deterrence, jwalberg.com, data checked ${esc(META.checkedText)}. Cite the primary documents themselves for any specific claim.</p>`;

document.getElementById('sources').innerHTML = COUNTRIES.map(c => `
  <details${c.id === 'US' ? ' open' : ''}><summary>${esc(c.id === 'INTL' ? 'International and joint texts' : c.name)} (${byC(c.id).length})</summary>
  <ul class="src">${byC(c.id).map(d => `<li><b>${esc(d.title)}</b>, ${esc(dateText(d.date, d.datePrecision))}. ${ext(d.url, 'Official text')}${d.archive ? `, ${ext(d.archive, 'archived copy')}` : ''}${d.translation ? `, ${ext(d.translation, 'translation')}` : ''}${d.quoteUrl && ![d.url, d.translation, d.archive].includes(d.quoteUrl) ? `, ${ext(d.quoteUrl, 'quoted text')}` : ''}.</li>`).join('')}</ul></details>`).join('')
  + `<details><summary>Debate sources (${DEBATES.length} debates)</summary><ul class="src">${DEBATES.map(d => `<li><b>${esc(d.title)}</b>: ${[...new Set([...(d.sources || []), ...d.camps.flatMap(c => c.holders.map(h => h.source))])].filter(Boolean).map(u => ext(u, new URL(u).hostname.replace(/^www\./, ''))).join(', ')}</li>`).join('')}</ul></details>`;
