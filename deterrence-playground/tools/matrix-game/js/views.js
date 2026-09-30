// Rendering: crisis board, inject card, adjudicator panel and turn log.
import { TRACKS, ACTORS } from '../data/scenario.js';
import { SOURCES } from '../data/sources.js';
import { BANDS } from './engine.js';

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TCOL = { esc: 'var(--red)', coh: 'var(--blue)', loc: 'var(--c3)', att: 'var(--c2)' };
const sign = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v);
export const actorChip = a => `<span class="mg-chip" style="--ac:${ACTORS[a].color}">${esc(ACTORS[a].name)}</span>`;
export const deltaText = d => Object.entries(d).map(([k, v]) => `${TRACKS.find(t => t.k === k).name} ${sign(v)}`).join(', ') || 'no change';

/** Four tracks with 0–10 cells, the latest change, and a sparkline of the track across the game. */
export function renderBoard(el, g, lastDelta = {}) {
  const hist = [g.turns[0].board0];
  for (const r of g.turns) { if (r.player?.res) hist.push(r.player.res.after); if (r.ai?.res) hist.push(r.ai.res.after); }
  el.innerHTML = TRACKS.map(t => {
    const v = g.board[t.k], d = lastDelta[t.k];
    const cells = Array.from({ length: 11 }, (_, i) => `<i class="${i <= v ? 'on' : ''}${i === v ? ' cur' : ''}"></i>`).join('');
    const W = 120, H = 22, n = hist.length;
    const pts = hist.map((b, i) => `${n > 1 ? (i / (n - 1)) * W : W / 2},${H - 2 - (b[t.k] / 10) * (H - 4)}`).join(' ');
    return `<div class="mg-track" style="--tc:${TCOL[t.k]}">
      <div class="mg-th"><b>${t.name}</b><span class="num mg-tv">${v}<small>/10</small></span>${d ? `<span class="mg-delta ${d > 0 ? 'up' : 'dn'}">${sign(d)}</span>` : ''}</div>
      <div class="mg-cells" role="img" aria-label="${t.name} ${v} of 10">${cells}</div>
      <div class="mg-tf"><span>${t.lo}</span><svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline points="${pts}"/></svg><span>${t.hi}</span></div>
      <p class="fine">${t.help}</p></div>`;
  }).join('');
}

export function renderInject(el, rec) {
  const d = Object.keys(rec.injectDelta).length ? `Board: ${deltaText(rec.injectDelta)}.` : 'No board change.';
  el.innerHTML = `<p class="eyebrow">Turn ${rec.t + 1} of 6 · fictional inject</p>
    <h2>${esc(rec.inject.title)}</h2><p>${esc(rec.inject.text)}</p>
    <p class="fine">${rec.inject.tags.map(t => `<span class="pill">${t}</span>`).join('')} ${d}</p>`;
}

/** Bars for the 11 possible 2d6 totals, shaded by the band each lands in after the modifier. */
function diceChart(net, rolled) {
  const ways = t => 6 - Math.abs(t - 7);
  const W = 330, H = 92, bw = W / 11;
  const bars = [];
  for (let t = 2; t <= 12; t++) {
    const band = BANDS.find(b => t + net >= b.min);
    const h = (ways(t) / 6) * (H - 30), x = (t - 2) * bw;
    bars.push(`<g class="mg-bar ${band.k}${rolled === t ? ' hit' : ''}"><rect x="${x + 2}" y="${H - 18 - h}" width="${bw - 4}" height="${h}" rx="2"/>
      <text x="${x + bw / 2}" y="${H - 4}">${t}</text></g>`);
  }
  return `<svg class="mg-dist" viewBox="0 0 ${W} ${H}" role="img" aria-label="Chances of each dice total; shaded by outcome after a modifier of ${sign(net)}">${bars.join('')}</svg>`;
}

const row = (mod, label, text, why, cls = '') => `<li class="${cls}"><span class="num mg-mod ${mod > 0 ? 'up' : mod < 0 ? 'dn' : ''}">${mod === 0 ? '0' : sign(mod)}</span>
  <div><b>${label}</b> ${text}<small>${why}</small></div></li>`;

/** The adjudicator panel for one argument, before or after the roll. */
export function renderAdjudication(el, arg, res, { who, onRoll }) {
  const a = arg.action;
  const src = r => r.src ? ` <a class="mg-src" href="${SOURCES[r.src].url}" target="_blank" rel="noopener" title="${esc(SOURCES[r.src].label)}">[source]</a>` : '';
  const items = [
    row(arg.diff, 'Base', arg.diff ? 'an ambitious action' : 'a reasonable action', arg.diff ? 'The adjudicator judges it a stretch: −1 before any reasons.' : 'No penalty: the action is within what this actor can plausibly do.'),
    ...(arg.reasons.length ? arg.reasons.map(r => row(r.strong ? 1 : 0, 'Reason', `“${esc(r.text)}”${src(r)}`, r.why, r.strong ? 'strong' : 'weak'))
      : [row(0, 'Reason', 'none given', 'An argument with no reasons earns no bonus.', 'weak')]),
    ...(arg.support ? [row(1, 'Support', `${actorChip(arg.support.actor)} “${esc(arg.support.text)}”`, 'A friendly actor adds a strong supporting point: +1 (at most one).', 'strong')] : []),
    ...(arg.counters.length ? arg.counters.map(c => row(c.strong ? -1 : 0, 'Counter', `${actorChip(c.actor)}${c.byPlayer ? ' (you)' : ''} “${esc(c.text)}”`, c.why, c.strong ? 'strong' : 'weak'))
      : [row(0, 'Counter', 'none raised', 'No actor argued against it.', 'weak')]),
  ];
  const need = Math.max(2, Math.min(13, 7 - arg.net));
  el.innerHTML = `<div class="mg-adj-h"><p class="eyebrow">Adjudicator · ${who}</p>
      <h3>${actorChip(arg.actor)} ${esc(a.text)}</h3>
      <p class="fine">Intended result: ${esc(a.result)} · <span class="pill">${a.tags.join('</span><span class="pill">')}</span></p></div>
    <ol class="mg-rows">${items.join('')}</ol>
    <div class="mg-odds">
      <div><p class="mg-net">Net modifier <b class="num">${sign(arg.net)}</b></p>
        <p class="mg-need">${need > 12 ? 'No roll can succeed.' : need <= 2 ? 'Any roll succeeds.' : `Needs <b class="num">${need}+</b> on 2d6`}</p>
        <div class="mg-pbar" role="img" aria-label="Chance of success ${Math.round(arg.p * 100)} percent"><i style="width:${arg.p * 100}%"></i></div>
        <p class="num mg-p">${(arg.p * 100).toFixed(1)}% chance of success</p></div>
      ${diceChart(arg.net, res ? res.dice[0] + res.dice[1] : null)}
    </div>
    <div class="mg-rollrow">${res ? resultHtml(arg, res) : `<button type="button" class="btn solid" data-roll>Roll 2d6</button>
      <span class="fine">7 or more after modifiers succeeds; 10+ is decisive; 4 or less backfires.</span>`}</div>`;
  const b = el.querySelector('[data-roll]');
  if (b) b.onclick = onRoll;
}

const pip = n => `<span class="mg-die" aria-label="${n}">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<i class="${DOTS[n].includes(i) ? 'on' : ''}"></i>`).join('')}</span>`;
const DOTS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
export const diceHtml = d => `<span class="mg-dice">${pip(d[0])}${pip(d[1])}</span>`;

function resultHtml(arg, res) {
  const [a, b] = res.dice;
  return `<div class="status mg-res" data-s="${res.band.s}">${diceHtml(res.dice)}
    <b>${res.band.label}</b>
    <span>Rolled ${a} + ${b} = ${a + b}, ${sign(arg.net)} modifier = <b class="num">${res.total}</b>. ${res.band.note}</span>
    <span>${res.band.k === 'decisive' || res.band.k === 'success' ? esc(arg.action.result) + ' ' : ''}Board: ${deltaText(res.delta)}.</span></div>`;
}

/** Turn log, printable. */
export function renderLog(el, g) {
  const one = (x, label) => {
    if (!x?.res) return '';
    const a = x.arg;
    return `<li><p>${label} ${actorChip(a.actor)} <b>${esc(a.action.text)}</b></p>
      <p class="fine">Reasons: ${a.reasons.map(r => `${esc(r.text)} (${r.strong ? '+1' : '0'})`).join('; ') || 'none'}.
      ${a.support ? `Support: ${ACTORS[a.support.actor].name} (+1). ` : ''}Counters: ${a.counters.map(c => `${ACTORS[c.actor].name}${c.byPlayer ? ' (you)' : ''}: ${esc(c.text)} (${c.strong ? '−1' : '0'})`).join('; ') || 'none'}.
      Base ${sign(a.diff)}, net ${sign(a.net)}, ${(a.p * 100).toFixed(0)}% · rolled ${res2(x.res)} · <b>${x.res.band.label}</b> · ${deltaText(x.res.delta)}.</p></li>`;
  };
  const res2 = r => `${r.dice[0]}+${r.dice[1]}=${r.dice[0] + r.dice[1]} → ${r.total}`;
  const rows = g.turns.filter(r => r.player?.res).map(r => `<li class="mg-lt"><p class="eyebrow">Turn ${r.t + 1}: ${esc(r.inject.title)} (fictional)</p>
    <ol>${one(r.player, 'You:')}${one(r.ai, 'AI:')}</ol></li>`);
  el.innerHTML = rows.length ? `<ol class="mg-log">${rows.join('')}</ol>` : '<p class="fine">No turns played yet. Each resolved argument is added here.</p>';
}

/** Plain-text log for download. */
export function logText(g) {
  const L = [`Baltic Matrix Game — turn log (FICTIONAL EXERCISE SCENARIO)`, `Player: ${ACTORS[g.actor].long} · seed ${g.seed}`, ''];
  for (const r of g.turns) {
    if (!r.player?.res) continue;
    L.push(`TURN ${r.t + 1}: ${r.inject.title} (fictional inject)`);
    for (const [lab, x] of [['Player', r.player], ['AI', r.ai]]) {
      if (!x?.res) continue;
      const a = x.arg;
      L.push(`  ${lab} (${ACTORS[a.actor].name}): ${a.action.text}`);
      a.reasons.forEach(z => L.push(`    reason ${z.strong ? '+1' : ' 0'}: ${z.text}`));
      if (a.support) L.push(`    support +1 (${ACTORS[a.support.actor].name}): ${a.support.text}`);
      a.counters.forEach(c => L.push(`    counter ${c.strong ? '-1' : ' 0'} (${ACTORS[c.actor].name}): ${c.text}`));
      L.push(`    base ${a.diff}, net ${a.net}, p=${(a.p * 100).toFixed(1)}%, dice ${x.res.dice.join('+')} -> ${x.res.total}: ${x.res.band.label}; ${deltaText(x.res.delta)}`);
    }
    L.push('');
  }
  L.push(`Final board: ${TRACKS.map(t => `${t.name} ${g.board[t.k]}`).join(', ')}`);
  return L.join('\n');
}
