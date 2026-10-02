// The page below the game: fills the rules text's numbers (docs/rules.html hooks), the parameter table, the
// quotations and the sources, and mounts the Lessons diagrams (SPEC §7.6, §7.7) lazily as they scroll in.
import * as P from '../../data/params.js';
import { SCALES } from '../../data/scales.js';
import { SOURCES, CITES } from '../../data/sources.js';
import { QUOTES } from '../../data/quotes.js';
import { BALANCE } from '../../data/balance.js';
import { OFFDEF_TABLE } from '../../data/offdef.js';
import { LESSONS, mountDiagram } from '../diagrams/index.js';
import { $, esc, reduced } from './store.js';

/** Fill [data-fill] spans for a scale (default Division). */
export function fillText(scale = 'd') {
  const Sc = SCALES[scale];
  const f = { need: String(Sc.obj.need), needkm: `${Sc.obj.need * 0.5} km`, turns: `${Sc.turns} one-hour turns${Object.entries(Sc.turnsByEra || {}).map(([e, v]) => ` (${v} in ${e === 'm' ? 'the modern era' : '1917–18'})`).join('')}`, cstime: `${Sc.csPlan} hours`, odstep: String(P.OFFDEF.step[scale] ?? P.OFFDEF.step.d) };
  document.querySelectorAll('[data-fill]').forEach(n => { if (f[n.dataset.fill] != null) n.textContent = f[n.dataset.fill]; });
}

const flat = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? flat(v, `${pre}${k}.`) : [[pre + k, Array.isArray(v) ? JSON.stringify(v) : v]]));
const SKIP = new Set(['AI', 'RULES', 'CARDS', 'CLOCK']);

export function renderBelow() {
  fillText();
  const rows = Object.entries(P).filter(([k, v]) => v && typeof v === 'object' && !Array.isArray(v) && !SKIP.has(k))
    .flatMap(([k, v]) => flat(v).map(([kk, vv]) => `<tr><td class="num">${esc(k)}.${esc(kk)}</td><td class="num">${esc(vv)}</td></tr>`));
  const t = $('dd-param-table');
  if (t) t.innerHTML = `<caption class="fine">Every value is labelled SOURCED (with its page), CALIBRATED or NOTIONAL in data/params.js; METHOD.md explains each.</caption><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>${rows.join('')}</tbody>`;
  const b = $('dd-balance');
  if (b && !b.childElementCount) b.innerHTML = balanceHTML();
  const o = $('dd-od-table');
  if (o && !o.childElementCount) o.innerHTML = odHTML();
  const short = id => (SOURCES.find(s => s.id === id) || {}).short || id;
  const q = $('dd-quotes');
  if (q) q.innerHTML = QUOTES.map(x => `<li><q>${esc(x.q)}</q> <span class="muted">— ${esc(x.who)}, <a href="#src-${x.src}">${esc(short(x.src))}</a>, p. ${esc(x.page)}</span></li>`).join('');
  const s = $('dd-sources');
  if (s) s.innerHTML = SOURCES.map(x => `<li id="src-${x.id}">${esc(x.text)} <a href="${esc(x.url)}" rel="noopener" target="_blank">Publisher page</a>
    <details><summary>Claims the game uses (${CITES.filter(c => c.src === x.id).length})</summary><ul class="dd-cites">${CITES.filter(c => c.src === x.id).map(c => `<li>${esc(c.claim)} <span class="muted">(p${/[–,;]/.test(c.pages) ? 'p' : ''}. ${esc(c.pages)}; ${esc(c.use)})</span></li>`).join('')}</ul></details></li>`).join('');
}

const CELLS = [['d/w', 'Division 1917–18'], ['d/m', 'Division modern'], ['c/w', 'Corps 1917–18'], ['c/m', 'Corps modern'], ['a/w', 'Army 1917–18'], ['a/m', 'Army modern']];

/** The balance table (data/balance.js, scripts/balance.mjs): one row per check, one column per scale and era. */
function balanceHTML() {
  const cells = CELLS.filter(([k]) => BALANCE.cells[k]);
  if (!cells.length) return '<p class="fine">Run scripts/balance.mjs --write to fill this table.</p>';
  const first = BALANCE.cells[cells[0][0]].rows;
  const rows = first.map((r, i) => `<tr><td>${esc(r[0])}</td><td class="num">${esc(r[2])}</td>${cells.map(([k]) => { const x = BALANCE.cells[k].rows[i]; return `<td class="num${x[3] ? '' : ' warn'}">${esc(x[1])}${x[3] ? '' : ' ✗'}</td>`; }).join('')}</tr>`);
  return `<div class="tablewrap"><table class="dd-bal"><caption class="fine">Paired-seed games, ${BALANCE.games.d} a matchup at Division, ${BALANCE.games.c} at Corps, ${BALANCE.games.a} at Army. Scripted players are the computer's own commanders with one doctrine changed, reacting an hour late as the Standard computer does. ✗ marks a miss; METHOD.md discusses each.</caption>
    <thead><tr><th>Check</th><th>Target</th>${cells.map(([, l]) => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

/** The slider table (data/offdef.js, scripts/offdef.mjs): attacker win % at each setting. */
function odHTML() {
  const T = OFFDEF_TABLE, cells = CELLS.filter(([k]) => T.cells[k]);
  if (!cells.length) return '<p class="fine">Run scripts/offdef.mjs --write to fill this table.</p>';
  const rows = cells.map(([k, l]) => `<tr><td>${esc(l)}</td>${T.cells[k].map(x => `<td class="num">${Math.round(x)}%</td>`).join('')}</tr>`);
  return `<div class="tablewrap"><table class="dd-bal"><caption class="fine">Attacker wins (%), Standard computer against Standard computer, at each slider setting (0 favors the defender, 10 the attacker; 5 is standard).</caption>
    <thead><tr><th>Scale and era</th>${T.ods.map(v => `<th class="num">${v}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

const handles = new Map();
/** Mount each Lessons diagram as it comes into view (all of them: P1 and P2). */
export function mountLessons() {
  const list = $('lessons-list');
  if (!list || list.childElementCount) return;
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
    for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); mountOne(e.target); }
  }, { rootMargin: '400px 0px' }) : null;
  for (const l of LESSONS) {
    const slot = document.createElement('section');
    slot.className = 'dd-lslot'; slot.id = `lesson-${l.id}`; slot.dataset.id = l.id;
    slot.innerHTML = `<p class="fine">${esc(l.id)} · ${esc(l.title)}</p>`;
    list.appendChild(slot);
    if (io) io.observe(slot); else mountOne(slot);
  }
}
function mountOne(slot) {
  if (handles.has(slot.dataset.id)) return;
  handles.set(slot.dataset.id, mountDiagram(slot.dataset.id, slot, { reduced: reduced() }));
}
/** Scroll to a lesson (mounting it first). */
export function showLesson(id) {
  const slot = document.getElementById(`lesson-${id}`);
  if (!slot) return;
  mountOne(slot);
  slot.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
}
