// Side panel: year readout, state checklist, environment switches, yield classes, stack-by choice,
// and the milestone card.
import { STATES, ENVS, YIELDS, TESTS } from '../data/tests.js';
import { MILESTONES } from '../data/milestones.js';
import { STATE_COLOR, ENV_COLOR, yearOf, fmt, esc } from './common.js';

export function panelHTML() {
  return `
  <div class="sec">
    <p class="eyebrow">Selected year</p>
    <p class="nt-year num" id="p-year">1962</p>
    <div class="nt-kpis">
      <div class="nt-kpi"><b id="p-now">0</b><span>tests that year (filters applied)</span></div>
      <div class="nt-kpi"><b id="p-cum">0</b><span>tests from 1945 through that year</span></div>
    </div>
    <p class="fine" id="p-note"></p>
  </div>
  <div class="sec">
    <p class="eyebrow">Stack bars by</p>
    <div class="choices nt-two" role="group" aria-label="Stack bars by">
      <button type="button" data-by="state" aria-pressed="true">State</button>
      <button type="button" data-by="env" aria-pressed="false">Environment</button>
    </div>
  </div>
  <div class="sec">
    <p class="eyebrow">Environment</p>
    <div id="p-env"></div>
  </div>
  <div class="sec">
    <p class="eyebrow">States</p>
    <div class="nt-quick"><button type="button" class="btn" data-q="all">All</button><button type="button" class="btn" data-q="big2">U.S. and USSR</button><button type="button" class="btn" data-q="late">After 1963 entrants</button></div>
    <p class="fine">Numbers: tests that year · through that year / all years.</p>
    <ul class="nt-clist" id="p-states"></ul>
  </div>
  <div class="sec">
    <p class="eyebrow">Yield class <span class="fine">(upper bound of the published range)</span></p>
    <div class="nt-ylist" id="p-yield"></div>
  </div>
  <div class="sec" id="p-ms"></div>`;
}

const TOTAL_BY_STATE = STATES.map((_, i) => TESTS.filter(t => t[1] === i).length);
const TOTAL_BY_ENV = ENVS.map((_, i) => TESTS.filter(t => t[2] === i).length);
const TOTAL_BY_Y = YIELDS.map((_, i) => TESTS.filter(t => t[3] === i).length);

export function wirePanel(root, act) {
  root.querySelectorAll('[data-by]').forEach(b => b.onclick = () => act.set({ by: b.dataset.by }));
  root.querySelectorAll('[data-q]').forEach(b => b.onclick = () => act.quick(b.dataset.q));
  root.querySelector('#p-env').innerHTML = ENVS.map((e, i) => `<label class="tg"><input type="checkbox" data-env="${i}" checked><span class="sw"></span><span class="t"><span class="sw-dot" style="background:${ENV_COLOR[i]}"></span> ${e} <span class="num fine">${fmt(TOTAL_BY_ENV[i])}</span></span></label>`).join('');
  root.querySelectorAll('[data-env]').forEach(i => i.onchange = () => act.toggle('env', Number(i.dataset.env), i.checked));
  root.querySelector('#p-yield').innerHTML = YIELDS.map((y, i) => `<label><input type="checkbox" data-yc="${i}" checked> ${y} <span class="num fine">${fmt(TOTAL_BY_Y[i])}</span></label>`).join('');
  root.querySelectorAll('[data-yc]').forEach(i => i.onchange = () => act.toggle('yc', Number(i.dataset.yc), i.checked));
}

export function renderPanel(root, state, rows) {
  const y = state.year;
  const now = rows.filter(t => yearOf(t) === y), cum = rows.filter(t => yearOf(t) <= y);
  root.querySelector('#p-year').textContent = y;
  root.querySelector('#p-now').textContent = fmt(now.length);
  root.querySelector('#p-cum').textContent = fmt(cum.length);
  const allCum = TESTS.filter(t => yearOf(t) <= y).length;
  root.querySelector('#p-note').textContent = rows.length === TESTS.length
    ? `${fmt(allCum)} of the ${fmt(TESTS.length)} tests in the record had happened by the end of ${y}.`
    : `Filters show ${fmt(rows.length)} of ${fmt(TESTS.length)} tests. Without filters, ${fmt(allCum)} had happened by the end of ${y}.`;
  root.querySelectorAll('[data-by]').forEach(b => b.setAttribute('aria-pressed', b.dataset.by === state.by));
  root.querySelectorAll('[data-env]').forEach(i => { i.checked = state.env.has(Number(i.dataset.env)); });
  root.querySelectorAll('[data-yc]').forEach(i => { i.checked = state.yc.has(Number(i.dataset.yc)); });

  const nowBy = STATES.map((_, i) => now.filter(t => t[1] === i).length);
  const cumBy = STATES.map((_, i) => cum.filter(t => t[1] === i).length);
  const list = root.querySelector('#p-states');
  list.innerHTML = STATES.map((s, i) => {
    const on = state.st.has(i);
    return `<li class="${on ? '' : 'off'}"><input type="checkbox" id="cb-${s.id}" data-st="${i}" ${on ? 'checked' : ''}>
      <label for="cb-${s.id}"><span class="sw-dot" style="background:${STATE_COLOR[i]}"></span>${esc(s.name)}</label>
      <span class="v num" title="${y}: ${nowBy[i]}; through ${y}: ${cumBy[i]}; all years: ${TOTAL_BY_STATE[i]}">${nowBy[i] ? `<b>${nowBy[i]}</b> · ` : ''}${fmt(cumBy[i])}<span class="fine"> / ${fmt(TOTAL_BY_STATE[i])}</span></span></li>`;
  }).join('');
  list.querySelectorAll('[data-st]').forEach(i => i.onchange = () => root.dispatchEvent(new CustomEvent('st', { detail: [Number(i.dataset.st), i.checked] })));

  const ms = MILESTONES.find(m => m.id === state.ms) || nearestMilestone(y);
  root.querySelector('#p-ms').innerHTML = ms ? `<p class="eyebrow">${state.ms ? 'Milestone' : 'Nearest milestone'}</p>${milestoneCard(ms)}` : '';
}

export function nearestMilestone(y) {
  let best = null;
  for (const m of MILESTONES) if (m.year <= y && (!best || m.year >= best.year)) best = m;
  return best;
}

export function milestoneCard(m) {
  return `<div class="nt-ms-card"><h3>${esc(m.label)}</h3><p class="d">${esc(m.when)}</p><p>${m.text}</p>
    <p class="fine">${m.src.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.t)}</a>`).join(' · ')}</p></div>`;
}
