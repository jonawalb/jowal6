// The weekly decision panels (Red orders; Blue collection, then Blue's decision) and the situation panel.
import { P, LABEL, BLURB } from '../data/params.js';
import { inWindow, expected, attackOdds, sigmoid, mobRate } from './model.js';
import { redStep, canAttack, legalRed } from './engine.js';
import { meter, readingRow, pct } from './view.js';

const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
const stepper = (key, label, v, max, left) => `
  <div class="eo-step"><button type="button" class="btn" data-step="${key}" data-d="-1" aria-label="One point less on ${label}" ${v <= 0 ? 'disabled' : ''}>−</button>
  <output class="num" aria-live="off">${v}</output>
  <button type="button" class="btn" data-step="${key}" data-d="1" aria-label="One point more on ${label}" ${v >= max || left <= 0 ? 'disabled' : ''}>+</button></div>`;

/** Red's orders for the week. */
export function paintRed(div, s, d) {
  const left = P.redPoints - sum(d.a), win = inWindow(s);
  const m = legalRed(s, d);
  const preview = redStep(s, { ...m, attack: false });
  const odds = attackOdds(s.R, s.M);
  const acts = P.activities.map(a => `<div class="eo-act${d.a[a] ? ' on' : ''}${P.prep.includes(a) ? ' prep' : ''}">
      <div><b>${LABEL[a]}</b><small>${BLURB[a]}</small></div>${stepper(a, LABEL[a], d.a[a], P.maxPerActivity, left)}</div>`).join('');
  const covers = Object.entries(P.cover).map(([id, c]) => {
    const off = (c.needsWindow && !win) || (c.offWindow && win);
    const why = c.needsWindow ? 'Only inside a published window.' : c.offWindow ? 'Only outside the windows. Blue sees the announcement.' : '';
    return `<button type="button" role="radio" aria-checked="${m.cover === id}" data-cover="${id}" ${off ? 'disabled' : ''}>
      <b>${c.label}</b><span>${Math.round(c.sig * 100)}% of the signature shows, ${Math.round(c.gain * 100)}% of the readiness counts.${why ? ' ' + why : ''}</span></button>`;
  }).join('');
  const attackUI = s.intent !== 'attack' ? '<p class="fine">You only intend to exercise: no attack option.</p>'
    : canAttack(s) ? `<div class="eo-attack"><p><b>Attack now:</b> odds of success <b class="num">${pct(odds)}</b> at readiness ${Math.round(s.R)}${s.M ? `, Blue mobilization ${Math.round(s.M)}` : ''}.</p>
        <button type="button" class="btn ${d.armed ? 'eo-danger' : ''}" id="attack">${d.armed ? 'Confirm attack' : 'Attack this week'}</button>${d.armed ? ' <button type="button" class="btn" id="disarm">Cancel</button>' : ''}</div>`
    : `<p class="fine">You can attack once readiness reaches ${P.readiness.attackMin}.</p>`;
  div.innerHTML = `<h2 id="dec-t" tabindex="-1">Week ${s.week + 1}: your orders</h2>
    <p class="eo-left">Activity points left: <b class="num">${left}</b> of ${P.redPoints} ${win ? '<span class="eo-tag">Exercise window</span>' : '<span class="eo-tag off">Outside the windows</span>'}</p>
    <div class="eo-acts" role="group" aria-label="Activities">${acts}</div>
    <p class="eyebrow mt" id="cov-t">Cover for this week’s preparation</p>
    <div class="eo-covers" role="radiogroup" aria-labelledby="cov-t">${covers}</div>
    <p class="eo-prev">This week: readiness <b class="num">${Math.round(s.R)} → ${Math.round(preview.R)}</b>; your estimate of Blue’s suspicion <b class="num">${pct(sigmoid(s.zRed))} → ${pct(sigmoid(preview.zRed))}</b>.</p>
    ${attackUI}
    <div class="eo-row"><span class="fine">Unspent points are lost.</span><button type="button" class="btn solid" id="end-week">End week</button></div>`;
}

/** Blue's collection plan. */
export function paintCollect(div, s, d) {
  const left = P.bluePoints - sum(d.collect);
  const rows = P.sources.map(k => `<div class="eo-act${d.collect[k] ? ' on' : ''}">
      <div><b>${LABEL[k]}</b><small>${BLURB[k]}${s.exposure[k] > 0 ? ` <em>Exposed: reads ${Math.round(P.model.exposureHit * s.exposure[k] * 100)}% less.</em>` : ''}</small></div>
      ${stepper(k, LABEL[k], d.collect[k], P.maxPerSource, left)}</div>`).join('');
  div.innerHTML = `<h2 id="dec-t" tabindex="-1">Week ${s.week + 1}: collection</h2>
    <p class="eo-left">Collection points left: <b class="num">${left}</b> of ${P.bluePoints}. More points on a source mean a less noisy reading.</p>
    <div class="eo-acts" role="group" aria-label="Collection">${rows}</div>
    ${matrixHTML(s)}
    <div class="eo-row"><span class="fine">${inWindow(s) ? 'This is an exercise window: expect activity.' : 'Outside the windows: an exercise would be small.'}${s.cur?.snap ? ' <b>Red has declared a snap exercise this week.</b>' : ''}</span>
      <button type="button" class="btn solid" id="collect">Collect</button></div>`;
}
const matrixHTML = s => `<details class="eo-matrix"><summary>Which source sees what (illustrative)</summary><table><tr><th></th>${[...P.prep, 'tempo'].map(a => `<th scope="col">${LABEL[a]}</th>`).join('')}</tr>
  ${P.sources.map(k => `<tr><th scope="row">${LABEL[k]}</th>${[...P.prep, 'tempo'].map(a => { const v = P.S[k][a] * (1 - P.model.exposureHit * s.exposure[k]); return `<td style="--v:${v}" class="num">${v.toFixed(1)}</td>`; }).join('')}</tr>`).join('')}</table></details>`;

/** Blue's readings and decision. */
export function paintDecide(div, s, d) {
  const c = s.cur.collect;
  const rows = P.sources.map(k => readingRow(k, s.cur.readings[k], expected(s, k, c[k] || 1, s.cur.snap), c[k])).join('');
  const opts = s.mobilized
    ? [['hold', 'Stay mobilized', `Mobilization grows by ${Math.round(mobRate(s.C))} to at most 100.`], ['stand', 'Stand down', `Mobilization drops to 0, credibility −${P.warn.standDownCred}, and Red learns which sources you leaned on this week.`]]
    : [['hold', 'Hold', 'Keep watching.'], ['warn', 'Warn and mobilize', `Mobilization starts at once (+${Math.round(mobRate(s.C))} a week). If Red only exercises, this is a false alarm.`]];
  div.innerHTML = `<h2 id="dec-t" tabindex="-1">Week ${s.week + 1}: what you see</h2>
    <table class="eo-read"><thead><tr><th scope="col">Source</th><th scope="col">Reading</th><th scope="col">Against <span class="eo-dot e"></span> an exercise alone and <span class="eo-dot a"></span> a build-up</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="fine">Markers show what Blue’s working model expects this week from an exercise alone and from an attack build-up; the band is the reading’s noise (±2 sd). Red can hide, so a quiet reading is weaker evidence than a loud one.</p>
    <label class="eo-belief">Your belief that Red intends to attack: <output class="num" id="belief-o">${d.belief}%</output>
      <input type="range" min="0" max="100" step="5" value="${d.belief}" id="belief" aria-describedby="belief-x"></label>
    <p class="fine" id="belief-x">Recorded each week and shown in the debrief against the truth. It does not change the game.</p>
    <div class="eo-opts" role="radiogroup" aria-label="Decision">${opts.map(([id, l, x]) => `<button type="button" role="radio" aria-checked="${d.act === id}" data-act="${id}"><b>${l}</b><span>${x}</span></button>`).join('')}</div>
    <div class="eo-row"><span></span><button type="button" class="btn solid" id="end-week">End week</button></div>`;
}

/** The situation panel. */
export function paintStatus(div, s, side, showModel) {
  if (side === 'red') {
    div.innerHTML = `<p class="eyebrow">Your intent: ${s.intent === 'attack' ? 'attack' : 'only exercise'}</p>
      ${meter('Readiness', s.R, { col: 'var(--red)', mark: P.readiness.attackMin, note: `Attack possible from ${P.readiness.attackMin}.` })}
      ${meter('Blue suspicion (your estimate)', sigmoid(s.zRed) * 100, { col: 'var(--warn)', note: 'What Blue’s model would conclude from your true signature, if Blue collects as a careful analyst would.' })}
      ${meter('Blue mobilization', s.M, { col: 'var(--blue)', note: s.mobilized ? 'Blue has warned and is mobilizing.' : 'Blue has not warned.' })}
      ${meter('Blue credibility', s.C, { col: 'var(--blue)' })}`;
    return;
  }
  const ex = P.sources.filter(k => s.exposure[k] > 0);
  div.innerHTML = `<p class="eyebrow">Blue</p>
    ${meter('Mobilization', s.M, { col: 'var(--blue)', note: s.mobilized ? 'Warned and mobilizing.' : 'Not warned.' })}
    ${meter('Credibility', s.C, { col: 'var(--blue)', note: 'Lower credibility, slower mobilization.' })}
    ${ex.length ? `<p class="fine">Exposed sources: ${ex.map(k => `${LABEL[k]} (${Math.round(s.exposure[k] * 100)}%)`).join(', ')}.</p>` : ''}
    <label class="eo-chk"><input type="checkbox" id="show-model" ${showModel ? 'checked' : ''}> Show the analyst model</label>
    ${showModel ? meter('Analyst model: P(attack)', sigmoid(s.z) * 100, { col: 'var(--ink)', note: 'Bayes’ rule on every reading so far, under the model’s assumptions.' }) : ''}`;
}

/** Past readings, as excess over an exercise-only expectation. */
export function readingsHistory(s) {
  const hs = s.history.filter(h => h.readings);
  if (!hs.length) return '';
  return `<h3>Past readings</h3><p class="fine">Reading minus what an exercise alone would give (positive = louder).</p><div class="eo-tablewrap"><table class="eo-hist"><tr><th scope="col">Wk</th>${P.sources.map(k => `<th scope="col">${LABEL[k].split(' ')[0]}</th>`).join('')}<th scope="col">You</th></tr>
    ${hs.map(h => `<tr><th scope="row">${h.week + 1}</th>${P.sources.map(k => { const x = h.readings[k]; if (x == null) return '<td>—</td>'; const v = x - h.base[k]; return `<td class="num" style="--v:${Math.max(-1, Math.min(1, v / 3))}">${v > 0 ? '+' : ''}${v.toFixed(1)}</td>`; }).join('')}<td>${{ hold: '', warn: '!', stand: '↓' }[h.act]}</td></tr>`).join('')}</table></div>`;
}
