// "Where do you stand?": sliders, with each government's placement (and the passage behind it) shown per question.
import { AXES, COMPASS } from '../data/policy.js';
import { C, D, esc, ext, host, dateText, quoteHTML } from './common.js';
import { distances, ranking } from './compass-math.js';

const GOVS = ['US', 'CN', 'RU'];

export function createCompass(root, aside, { onChange }) {
  let answers = {}, reveal = false, open = null; // open = 'axis.US'

  root.innerHTML = `<p class="fine ap-hint" id="ap-hint">Move any slider to see where the three governments sit on that question.</p>` + AXES.map((a, i) => `
    <div class="ap-ax" data-ax="${a.id}">
      <p class="ap-axq"><span class="ap-axn num">${i + 1}</span><span>${esc(a.q)}</span></p>
      <div class="ap-scale">
        <div class="ap-poles"><span>${esc(a.lo)}</span><span>${esc(a.hi)}</span></div>
        <input type="range" min="0" max="100" step="5" value="50" class="ap-range unset" id="ax-${a.id}"
          aria-label="${esc(a.q)} 0 means: ${esc(a.lo)}. 100 means: ${esc(a.hi)}." aria-valuetext="Not answered">
        <p class="ap-val" aria-hidden="true">Not answered yet</p>
        <div class="ap-govrows" aria-label="Where each government's texts place it"></div>
      </div>
      <div class="ap-why" aria-live="polite"></div>
    </div>`).join('');

  const rowsHTML = a => {
    const shown = reveal || typeof answers[a.id] === 'number';
    if (!shown) return '';
    return GOVS.map(g => {
      const p = COMPASS[a.id]?.[g];
      const has = p && typeof p.value === 'number';
      return `<div class="ap-govrow"><span class="ap-govlab">${esc(C[g].short)}</span><span class="ap-govtrack">
        ${typeof answers[a.id] === 'number' ? `<span class="ap-you" style="left:${answers[a.id]}%" aria-hidden="true"></span>` : ''}
        ${has ? `<button type="button" class="ap-gov" data-g="${g}" style="left:${p.value}%;--col:${C[g].color}"
          aria-pressed="${open === a.id + '.' + g}" aria-label="${esc(C[g].name)}: ${p.value} of 100. Show the passage behind this placement."></button>`
        : `<button type="button" class="ap-none" data-g="${g}" aria-pressed="${open === a.id + '.' + g}">No official text places it (why)</button>`}
      </span></div>`;
    }).join('');
  };

  const whyHTML = (axId, g) => {
    const p = COMPASS[axId]?.[g];
    if (!p) return '';
    const d = D[p.doc];
    return `<div class="ap-whycard" style="--col:${C[g].color}">
      <p><b>${esc(C[g].name)}: ${p.value ?? 'not placed'}</b>. ${esc(p.why)}</p>
      ${quoteHTML(p.quote, p.quoteEn)}
      <p class="fine">${d ? `<a href="#" class="ap-jump" data-id="${esc(d.id)}">${esc(d.title)}</a>, ${esc(dateText(d.date, d.datePrecision))}. ` : ''}${ext(p.url, host(p.url) || 'Source')}</p>
    </div>`;
  };

  function paint() {
    root.querySelector('#ap-hint').hidden = reveal || Object.keys(answers).length === AXES.length;
    for (const a of AXES) {
      const row = root.querySelector(`[data-ax="${a.id}"]`);
      const inp = row.querySelector('input');
      const has = typeof answers[a.id] === 'number';
      if (has) inp.value = answers[a.id];
      inp.classList.toggle('unset', !has);
      inp.setAttribute('aria-valuetext', has ? `${answers[a.id]} of 100` : 'Not answered');
      row.querySelector('.ap-val').textContent = has ? `Your answer: ${answers[a.id]} of 100` : 'Not answered yet';
      row.querySelector('.ap-val').classList.toggle('on', has);
      row.querySelector('.ap-govrows').innerHTML = rowsHTML(a);
      const [oa, og] = (open || '').split('.');
      row.querySelector('.ap-why').innerHTML = oa === a.id && (reveal || has) ? whyHTML(oa, og) : '';
    }
    paintAside();
  }

  function paintAside() {
    const n = Object.keys(answers).length;
    const rank = ranking(distances(answers, COMPASS, GOVS));
    const bars = rank.map(r => {
      const near = r.gap == null ? '' : nearest(r.id);
      return `<li><div class="ap-barlab"><span><span class="ap-cdot" style="background:${C[r.id].color}"></span>${esc(C[r.id].name)}</span>
        <span class="num">${r.gap == null ? 'no shared questions' : `${Math.round(r.gap)} pts apart`}</span></div>
        <div class="ap-bar"><span style="width:${r.gap == null ? 0 : Math.max(2, Math.round(r.gap))}%;background:${C[r.id].color}"></span></div>
        ${near}</li>`;
    }).join('');
    const mini = document.getElementById('cmp-mini');
    mini.hidden = n === 0;
    if (n) mini.innerHTML = `Closest: <b>${esc(C[rank[0].id].name)}</b> · ${n} answered · see result`;
    aside.querySelector('#cmp-sum').innerHTML = n === 0
      ? '<p class="fine">Answer any question to start. Your result updates as you go; skip any you like.</p>'
      : `<p class="ap-big">Closest to <b>${esc(C[rank[0].id].name)}</b></p>
         <p class="fine simple-only">Points apart, averaged over your answers: a shorter bar is a closer match.</p>
         <p class="fine full-only">Average gap on the ${n} question${n > 1 ? 's' : ''} you answered (0 = same place, 100 = opposite ends). A shorter bar means a closer match. Questions where a government has no placement are left out of its average.</p>
         <ol class="ap-bars">${bars}</ol>`;
  }

  function nearest(g) {
    const gaps = Object.entries(answers).map(([k, v]) => ({ k, v: COMPASS[k]?.[g]?.value })).filter(x => typeof x.v === 'number')
      .map(x => ({ k: x.k, gap: Math.abs(answers[x.k] - x.v) }));
    if (gaps.length < 2) return '';
    gaps.sort((a, b) => a.gap - b.gap);
    const name = k => AXES.find(a => a.id === k).short;
    return `<p class="fine full-only">Nearest on ${esc(name(gaps[0].k))}; furthest on ${esc(name(gaps[gaps.length - 1].k))}.</p>`;
  }

  root.addEventListener('input', e => {
    const row = e.target.closest('[data-ax]'); if (!row) return;
    answers[row.dataset.ax] = Number(e.target.value);
    paint(); onChange(answers);
  });
  root.addEventListener('click', e => {
    const b = e.target.closest('.ap-gov, .ap-none'); if (!b) return;
    const key = b.closest('[data-ax]').dataset.ax + '.' + b.dataset.g;
    open = open === key ? null : key;
    paint();
    root.querySelector(`[data-ax="${key.split('.')[0]}"] [data-g="${b.dataset.g}"]`)?.focus();
  });

  return {
    set(next) { answers = { ...next }; paint(); },
    get: () => answers,
    reset() { answers = {}; open = null; paint(); onChange(answers); },
    reveal(v) { reveal = v; paint(); },
  };
}
