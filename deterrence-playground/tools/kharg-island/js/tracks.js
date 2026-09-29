// The "Escalation and politics" track and the oil and exports panel for the turn on screen.
import { ESC_EVENTS, MAJOR_INDEX } from '../data/params.js';
import { NOTIONAL, srcTag } from './panel.js';
import { f2 } from './views.js';

const meter = (v, max, cls, mark) => `<span class="meter ${cls}"><span style="width:${Math.min(100, v / max * 100)}%"></span>${mark != null ? `<i style="left:${mark / max * 100}%"></i>` : ''}</span>`;

/** Per-turn bars for a series, highlighting the turn on screen. */
function series(game, v, get, max, fmt, cls) {
  if (!game.turns.length) return '';
  const cols = game.turns.map((T, i) => {
    const val = get(T.state), h = Math.max(2, Math.min(100, val / max * 100));
    return `<span class="sb${i + 1 === v ? ' on' : ''}${i + 1 > v ? ' future' : ''}" title="Turn ${i + 1}: ${fmt(val)}"><span class="${cls}" style="height:${h}%"></span></span>`;
  }).join('');
  return `<div class="spark" aria-hidden="true">${cols}</div>`;
}

export function escalationHtml(game, v, st, cfg, P) {
  const chips = Object.entries(ESC_EVENTS).map(([k, e]) => {
    const n = st.ev[k];
    return `<li class="${n ? 'on' : ''}">${e.t}${k === 'regional' && n > 1 ? ` ×${n}` : ''}<small>${n ? `+${e.add} each` : 'not yet'}</small></li>`;
  }).join('');
  return `
    <p class="lbl"><b>Escalation index</b> <b class="num">${st.esc}</b> <small>of 100 · major at ${MAJOR_INDEX} ${NOTIONAL}</small></p>
    ${meter(st.esc, 100, 'esc', MAJOR_INDEX)}
    ${series(game, v, s => s.esc, 100, x => `${x}`, 'esc')}
    <ul class="chips">${chips}</ul>
    <p class="lbl"><b>U.S. domestic and allied cost</b> <b class="num">${st.cost}</b> <small>of 100 ${NOTIONAL}</small></p>
    ${meter(st.cost, 100, 'cost')}
    <p class="fine">Each turn Iran rolls to widen the war. The chance grows with Iran's posture (×${cfg.ir.escal}), with what the U.S. is doing that turn (a landing counts most) and with the escalation already reached. The cost index adds ${P.costShip} per ship put out of action, ${P.costPt} per strength point lost, ${P.costOil} per dollar on the oil price${cfg.us.bases ? ` and ${P.costBases} per turn of flying from partner bases` : ''}. Every weight is ${NOTIONAL} and editable under <a href="#assume" class="open-assume">Edit the assumptions</a>.</p>`;
}

export function oilHtml(game, v, st, cfg, P) {
  const base = P.iranExp * P.khargShare;
  const parts = [
    ['Brent baseline', P.brent, srcTag('eiaBrent')],
    ['Kharg barrels off the market', P.elast * st.offline, NOTIONAL],
    ['Hormuz closure attempt', st.ev.hormuz ? P.premHormuz : 0, NOTIONAL],
    ['Gulf infrastructure strike', st.ev.gulf ? P.premGulf : 0, NOTIONAL],
  ];
  return `
    <dl class="readout oil">
      <dt>Iran's crude exports before the fight ${srcTag('kpler')}</dt><dd>${f2(P.iranExp)} mb/d</dd>
      <dt>Loaded at Kharg ${srcTag('kpler')}</dt><dd>${Math.round(P.khargShare * 100)}% · ${f2(base)} mb/d</dd>
      <dt>Kharg loadings this turn</dt><dd>${Math.round(st.share * 100)}% of normal</dd>
      <dt>Off the market now</dt><dd>${f2(st.offline)} mb/d</dd>
      <dt>Unshipped so far</dt><dd>${f2(st.lostMb)} million bbl</dd>
    </dl>
    ${series(game, v, s => s.share, 1, x => `${Math.round(x * 100)}% of normal loadings`, 'exp')}
    <p class="lbl mt"><b>Notional Brent</b> <b class="num">$${Math.round(st.price)}</b> <small>per barrel</small></p>
    <table class="oilparts">${parts.map(([t, val, tag], i) => `<tr><td>${t} ${tag}</td><td class="num">${i ? '+' : ''}$${f2(val)}</td></tr>`).join('')}</table>
    <p class="fine">The baseline and export figures come from sources; how much the price moves is a ${NOTIONAL} sensitivity that you can change. Spare capacity elsewhere, stock releases and the rerouting of Iranian barrels would all soften the effect, and a closed Hormuz would dwarf it.</p>`;
}
