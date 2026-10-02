// The after-action review (SPEC §7.4; UI streamline #16): the outcome by the territory rule (with losses, exchange
// and ground, the only place they appear), the top three key moments and the lessons your battle triggered
// first, then Play again / New game (or Continue in a campaign), the hour slider with "What you saw / What was
// true", the charts, and folded: the other moments, losses by cause, the hour-by-hour reports and the replays.
import { SCALES } from '../../data/scales.js';
import { lessonCards } from '../lessons.js';
import { moments } from '../story.js';
import { gridFor } from '../grid.js';
import { mountDiagram } from '../diagrams/index.js';
import { S, $, esc, pct, hhmm, reduced } from './store.js';
import { infoBtn, pctTip, momentInfo } from './tips.js';
import { replayTip, TIP_BUILDERS } from '../tips-text.js';
import { chartSeen, chartRace } from './aar-charts.js';
import { runReplays } from './compare.js';
import { feedHTML } from './panel.js';

let timer = null, mounted = [];

function stats(g, me) {
  const foe = me === 'def' ? 'att' : 'def';
  const loss = s => g.units.filter(u => u.side === s).reduce((a, u) => a + (u.str0 - Math.max(0, u.str)), 0);
  const deep = Math.max(0, ...(g.deepHist || [0])), Sc = SCALES[g.scale];
  const rows = Math.max(0, deep - Sc.bands.nml[1]);
  return { lossMe: loss(me), lossFoe: loss(foe), exch: loss(me) > 0 ? loss(foe) / loss(me) : null, km: rows * 0.5, deep };
}

/** Tip for a share of your losses (QA fix: every % has an "i"). */
const share = (title, line) => ({ title, lines: [line], notes: ['Losses are strength points; the shares count every source (frontal and flanking fire, artillery, gas, mines, drones).'] });
function firePanel(g, me) {
  const rows = (g.telemetry.rows || []).filter(r => r.s === me), sum = k => rows.reduce((a, r) => a + (r.inc ? r.inc[k] : 0), 0);
  const fr = sum('fr'), fl = sum('fl'), ar = sum('ar'), dr = sum('dr'), tot = fr + fl + ar + dr || 1;
  const lifts = g.events.filter(e => e.kind === 'lift' && e.side === 'att');
  const early = lifts.filter(e => e.case === 'early' || e.case === 'gap').length, late = lifts.filter(e => e.case === 'late').length;
  const c2 = g.telemetry.summary.cover2 ?? 0, a0 = (g.ui && g.ui.ammo0) || g.ammo;
  return `<dl class="readout dd-fire">
    <dt>Your losses to frontal fire</dt><dd>${pct(fr / tot)}${infoBtn(share(`${pct(fr / tot)} of your losses: frontal fire`, 'Your losses to direct fire from in front (cover counts), divided by all your losses'), 'Frontal-fire share')}</dd>
    <dt>to flanking (enfilade) fire</dt><dd>${pct(fl / tot)}${infoBtn(share(`${pct(fl / tot)} of your losses: flanking fire`, 'Your losses to fire from the side or along your line (enfilade: cover does not count), divided by all your losses'), 'Flank-fire share')}</dd>
    <dt>to artillery, gas and mines</dt><dd>${pct(ar / tot)}${infoBtn(share(`${pct(ar / tot)} of your losses: artillery, gas and mines`, 'Your losses to shells, gas, mines and moves watched by observers, divided by all your losses'), 'Artillery share')}</dd>${g.era === 'm' ? `<dt>to drones</dt><dd>${pct(dr / tot)}${infoBtn(share(`${pct(dr / tot)} of your losses: drones`, 'Your losses to drone strikes, divided by all your losses'), 'Drone share')}</dd>` : ''}
    <dt>Defender’s battle zone covered from 2+ directions</dt><dd>${pctTip(pct(c2), 'coverage', { share: c2 })}</dd>
    <dt>Barrage lifts: early or gap / late</dt><dd>${early} / ${late}${me === 'att' && early + late ? ' (yours)' : ''}</dd>
    <dt>Ammunition used</dt><dd>${a0[me] - g.ammo[me]} of ${a0[me]}</dd></dl>`;
}

/** QA fix: the "i" for every lesson card that shows a percentage (T1, T6, T15). */
function lessonInfo(c) {
  const d = c.data || {};
  if (c.id === 'T1') return infoBtn(share(`${pct(d.y)} of your losses came in the open`, 'Your losses in the hours a unit was exposed in the open (exposure 0.5 or more: rushing, in waves, or bounding with no overwatch), divided by all your losses'), 'Losses in the open');
  if (c.id === 'T6' && d.p != null) return infoBtn(TIP_BUILDERS.coverage({ share: d.p }), 'Coverage');
  if (c.id === 'T6') return infoBtn(share(`${pct(d.f)} of your losses were flank fire`, 'Your losses to fire from the side or along your line (enfilade), divided by all your losses'), 'Flank-fire share');
  if (c.id === 'T15') return infoBtn(share(`Road moves cost ${pct(d.z)} of your losses`, 'Your losses in hours a unit moved by road under enemy drones, divided by all your losses'), 'Road-move losses');
  return '';
}

export function showAAR(g, me, opts) {
  const el = $('aar'), win = g.over.winner === me, st = stats(g, me), Sc = SCALES[g.scale], T = g.snaps.length - 1;
  stop();
  const ms = moments(g, me);
  const cards = lessonCards(g.telemetry, me, {});
  el.hidden = false;
  // #16: the verdict, three key moments and the lessons your battle triggered come first; the rest folds.
  const top = ms.slice(0, 3), rest = ms.slice(3);
  const mli = m => `<li class="${m.tone}"><span class="num">${m.when}</span>${esc(m.text)}${momentInfo(m)}</li>`;
  el.innerHTML = `<div class="status" data-s="${win ? 'good' : 'bad'}"><b id="aar-t">${win ? 'You won' : 'You lost'}: ${me === 'att' ? (win ? `you held ${g.over.best} side-by-side sectors of ${esc(Sc.obj.name)}` : `you held ${g.over.best || 0} of the ${Sc.obj.need} side-by-side sectors you needed`) : win ? `the enemy did not hold ${Sc.obj.need} side-by-side sectors of ${esc(Sc.obj.name)}` : `the enemy held ${g.over.best} side-by-side sectors of ${esc(Sc.obj.name)}`}.</b>
    <span>Territory decides the game. Losses: yours ${st.lossMe.toFixed(0)}, the enemy’s ${st.lossFoe.toFixed(0)} strength points${st.exch != null ? ` (exchange ${st.exch.toFixed(2)} : 1)` : ''}. Deepest attacker advance: ${st.km.toFixed(1)} km past no-man’s land.</span></div>
    <p class="eyebrow">Key moments</p><ol class="dd-moments">${top.map(mli).join('') || '<li>A quiet battle.</li>'}</ol>
    ${rest.length ? `<details class="dd-fold"><summary>All key moments (${ms.length})</summary><ol class="dd-moments">${rest.map(mli).join('')}</ol></details>` : ''}
    <p class="eyebrow">Lessons your battle triggered</p><div class="dd-lcards">${cards.map(c => `<div class="dd-lcard"><p>${esc(c.text)}${lessonInfo(c)}</p><p class="fine">${esc(c.cite)}</p>
        <button type="button" class="btn" data-dg="${c.diagram}">Show diagram ${c.diagram}</button><div class="dd-dgslot" data-slot="${c.diagram}"></div></div>`).join('') || '<p class="fine">No lesson triggers fired: a clean battle by these measures.</p>'}</div>
    <div class="dd-gobar">${opts.cont ? `<button type="button" class="btn solid" id="aar-cont">${esc(opts.cont)}</button>` : ''}<button type="button" class="btn${opts.cont ? '' : ' solid'}" id="aar-again">Same scenario, play again</button><button type="button" class="btn" id="aar-new">New game</button></div>
    <div class="dd-replay"><button type="button" class="btn" id="aar-play">Replay</button>
      <label class="slider"><span class="sl-h"><span>Hour shown on the map</span><output id="aar-h" class="num">${hhmm(T)}</output></span>
      <input type="range" id="aar-range" min="0" max="${T}" step="1" value="${T}"></label></div>
    <p class="fine">Use <b>What you saw / What was true</b> above the map to compare your picture with the truth at each hour.</p>
    <details class="dd-fold dd-det" open><summary>Charts: what you saw against the truth, and the race</summary>
      <p class="eyebrow">Enemy strength: what you saw and what was true</p><div id="aar-seen"></div>
      <p class="eyebrow">The race: penetration against the objective (Biddle A.17, p. 214)</p><div id="aar-race"></div></details>
    <details class="dd-fold"><summary>Losses by cause, fire and enfilade</summary>${firePanel(g, me)}</details>
    <details class="dd-fold"><summary>Hour-by-hour reports</summary><ol class="dd-feed dd-aarfeed">${feedHTML()}</ol></details>
    <details class="dd-fold"><summary>Replays of this battle (fresh dice)</summary><div id="aar-fog" class="dd-fog"><p class="fine" id="aar-prog">Starting the replays…</p></div></details>`;
  const w = () => Math.max(300, Math.round(el.getBoundingClientRect().width) - 40);
  const charts = h => { $('aar-seen').innerHTML = chartSeen(g, me, w(), h); $('aar-race').innerHTML = chartRace(g, me, w()); };
  charts(T);
  $('aar-range').addEventListener('input', e => { const h = +e.target.value; $('aar-h').textContent = hhmm(h); opts.onHour(h); charts(h); });
  $('aar-play').addEventListener('click', () => {
    if (timer) { stop(); return; }
    const r = $('aar-range');
    let h = +r.value >= T ? 0 : +r.value;
    $('aar-play').textContent = 'Pause';
    const step = () => { r.value = h; r.dispatchEvent(new Event('input')); h++; if (h > T) stop(); };
    step(); timer = setInterval(step, reduced() ? 1200 : 700);
  });
  el.querySelectorAll('[data-dg]').forEach(b => b.addEventListener('click', () => {
    const slot = el.querySelector(`[data-slot="${b.dataset.dg}"]`);
    if (slot.childElementCount) { slot.replaceChildren(); b.textContent = `Show diagram ${b.dataset.dg}`; return; }
    const box = document.createElement('div'); box.className = 'dd-dg'; slot.appendChild(box);
    mounted.push(mountDiagram(b.dataset.dg, box, { model: diagramModel(g, me, b.dataset.dg), reduced: reduced() }));
    b.textContent = `Hide diagram ${b.dataset.dg}`;
  }));
  $('aar-again').onclick = opts.onAgain; $('aar-new').onclick = opts.onNew;
  if (opts.cont) $('aar-cont').onclick = opts.onCont;
  replays(g, me, opts.msg);
}

/** Game data some diagrams can show (W1-B mountDiagram models). */
function diagramModel(g, me, id) {
  const G = gridFor(g.scale);
  if (id === 'L5' && g.barrage) return { timetable: { r0: g.barrage.r0, rho: g.barrage.rate, rows: SCALES[g.scale].obj.row - g.barrage.r0 + 1, hours: g.turns,
    arrivals: g.events.filter(e => e.kind === 'lodgment' && e.side === 'att').map(e => ({ row: G.row[e.sec] - g.barrage.r0, hour: e.t })) } };
  if (id === 'L11') return { plan: { fr: g.telemetry.summary.fr ?? 0.3 } };
  if (id === 'L12') {
    const rows = (g.telemetry.rows || []).filter(r => r.s === 'att'), n = rows.length || 1, c = k => rows.filter(r => r.po === k).length / n;
    return { mix: { rush: c('rush'), leapfrog: c('bound') + c('ow'), infiltrate: c('infil'), hold: c('hold') + c('consolidate') } };
  }
  return undefined;
}

async function replays(g, me, msg) {
  const box = $('aar-fog');
  const res = await runReplays(msg, p => { const pr = $('aar-prog'); if (pr) pr.textContent = `Running the replays in the background: ${Math.round(p * 100)}%…`; });
  if (!res || !box.isConnected) return;
  box.innerHTML = res.map(r => `<div class="dd-fogrow${r.key === 'you' ? ' you' : ''}"><div class="dd-fogl"><b>${esc(r.label)}</b><small>${esc(r.note)}</small></div>
    <div class="dd-fogbar" aria-hidden="true"><i style="width:${Math.round(100 * r.p)}%"></i></div>
    <div class="dd-fogn"><b>${pct(r.p)}${infoBtn(replayTip({ wins: r.wins, games: r.n, label: r.label.toLowerCase() }), `Win rate: ${r.label}`)}</b><small>wins of ${r.n}; losses ${r.lossMe.toFixed(0)} v ${r.lossFoe.toFixed(0)}</small></div></div>`).join('');
  const you = res.find(r => r.key === 'you'), seer = res.find(r => r.key === 'seer'), era = res.find(r => r.key === 'era');
  const lines = [];
  if (you && seer) lines.push(`Against an opponent who saw everything you won ${pct(seer.p)} instead of ${pct(you.p)}: ${you.p - seer.p > 0.03 ? 'your concealment and the fog were worth that much' : 'the fog did little for you this time'}.`);
  if (you && era) lines.push(`The same plan in the other era ${era.p > you.p ? 'did better' : 'did worse'}: ${pct(era.p)} against ${pct(you.p)} (Biddle p. 234: technology magnifies force employment).`);
  box.insertAdjacentHTML('beforeend', `<p class="dd-fogsum">${lines.join(' ')}</p>`);
}

export function stop() { if (timer) { clearInterval(timer); timer = null; } const b = $('aar-play'); if (b) b.textContent = 'Replay'; }
export function hideAAR() { stop(); for (const m of mounted) m.destroy(); mounted = []; $('aar').hidden = true; $('aar').innerHTML = ''; }
