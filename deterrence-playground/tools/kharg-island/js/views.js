// Result views: the turn log with every roll, the combat results table, the state readout and the Monte Carlo card.
import { CRT, CRT_COLS, RESULTS, SECTORS, MINE_LEVELS } from '../data/params.js';

const pct = p => p == null ? '' : `${Math.round(p * 1000) / 10}%`;
export const f2 = v => (Math.round(v * 100) / 100).toString();

const OUT = {
  seize: { win: 'U.S. holds Kharg', mixed: 'Island still contested', fail: 'U.S. landing defeated' },
  raid: { win: 'Raid succeeds, clean withdrawal', mixed: 'Raid succeeds, costly withdrawal', fail: 'Raid fails' },
  blockade: { win: 'Kharg loadings cut to 25% or less', mixed: 'Exports partly cut', fail: 'Exports mostly flow' },
};
export const outcomeText = (obj, k) => OUT[obj][k];

function rollsHtml(r) {
  if (!r.rolls.length) return '<span class="muted">none</span>';
  return r.rolls.map(x => {
    const hit = r.p != null && x < r.p;
    return `<span class="roll${hit ? ' hit' : ''}" title="${hit ? 'under the chance: it happens' : 'over the chance: it does not'}">${x.toFixed(2)}</span>`;
  }).join(' ');
}

export function turnLogHtml(game, v, cfg) {
  if (v === 0) {
    return `<p class="fine">Setup. Press <b>Next turn</b> to play turn 1. Each row shows the chance of an event, the dice (random numbers from 0 to 1) and the result. A roll below the chance means the event happens.</p>`;
  }
  const T = game.turns[v - 1];
  const rows = T.rows.map(r => `<tr class="${r.tone || ''}"><td>${r.ph}</td><td>${r.ev}</td><td class="num">${pct(r.p)}</td><td class="num rolls">${rollsHtml(r)}</td><td>${r.res}</td></tr>`).join('');
  let end = '';
  if (v === game.turns.length) {
    end = `<p class="endline ${game.outcome}"><b>${outcomeText(cfg.us.obj, game.outcome)}${game.endAt ? ` on turn ${game.endAt}` : ` after ${game.turns.length} turns`}.</b> ${endWhy(game, cfg)}${game.major ? ' <b class="esc-flag">Major escalation.</b>' : ''}</p>`;
  }
  return `<div class="tablewrap"><table class="log"><thead><tr><th>Phase</th><th>Event</th><th>Chance</th><th>Dice</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table></div>${end}`;
}

function endWhy(game, cfg) {
  const s = game.turns[game.turns.length - 1].state;
  const steps = SECTORS[cfg.us.sector].steps;
  if (cfg.us.obj === 'blockade') {
    const avg = game.turns.reduce((a, T) => a + T.state.share, 0) / game.turns.length;
    return `On average Kharg loaded ${Math.round(avg * 100)}% of its normal volume per turn (the result counts the average: 25% or less is a success, 60% or more a failure); ${f2(s.lostMb)} million barrels went unshipped over the game.`;
  }
  if (cfg.us.obj === 'raid') {
    return game.outcome === 'fail' ? (s.ashore < 0.05 ? 'The raid force was lost or never got ashore.' : 'The raid force never took the airstrip area.')
      : `The force took the airstrip area and pulled out with ${f2(s.ashore)} points.`;
  }
  return game.outcome === 'win' ? `U.S. forces hold the island with ${f2(s.ashore)} points ashore.`
    : game.outcome === 'fail' ? (s.ashore < 0.3 ? 'The landing force was destroyed or never got ashore.' : 'The landing force is pinned and outnumbered more than two to one after the defender\'s terrain bonus.')
      : `U.S. forces hold a lodgment (${f2(s.ashore)} points, objective ${s.progress} of ${steps}) against ${f2(s.garrison)} Iranian points.`;
}

export function crtHtml(crt) {
  const head = CRT_COLS.map((c, i) => `<th class="${crt && crt.col === i ? 'on' : ''}">${c.t}</th>`).join('');
  const body = CRT.map((row, r) => `<tr><th>${r + 1}</th>${row.map((code, c) => {
    const on = crt && crt.col === c && crt.roll === r + 1;
    return `<td class="c-${code}${on ? ' hit' : ''}${crt && crt.col === c ? ' col' : ''}">${code}</td>`;
  }).join('')}</tr>`).join('');
  const key = Object.entries(RESULTS).map(([k, r]) => `<li><b class="c-${k}">${k}</b> ${r.t}: U.S. −${r.us * 100}%, Iran −${r.ir * 100}%${r.adv ? ', U.S. takes one objective' : ''}</li>`).join('');
  return `<table class="crt"><thead><tr><th>Die</th>${head}</tr></thead><tbody>${body}</tbody></table><ul class="crt-key">${key}</ul>`;
}

export function readoutHtml(st, cfg) {
  const land = cfg.us.obj !== 'blockade';
  const steps = SECTORS[cfg.us.sector].steps;
  const rows = [
    ['U.S. ashore', land ? `${f2(st.ashore)} pts` : 'none (blockade)'],
    ['Objective', land ? `${st.progress} of ${steps}` : '–'],
    ['Airstrip', !land ? '–' : st.airstrip === 'us' ? 'U.S., usable' : st.airstrip === 'wrecked' ? 'U.S., wrecked' : 'Iran'],
    ['Iranian garrison', land ? `${f2(st.garrison)} pts` : '–'],
    ['Amphibious ships', `${st.amph} of ${cfg.us.meu * 3}`],
    ['Destroyers', `${st.ddg} of ${cfg.us.ddg}`],
    ['Missile batteries', `${st.ascm} of ${cfg.ir.ascm} · ${st.salvos} salvos left`],
    ['Drone teams', `${st.drones} of ${cfg.ir.drones}`],
    ['FAC squadrons', `${st.fac} of ${cfg.ir.fac}`],
    ['Mine threat', cfg.ir.mines ? `${MINE_LEVELS[cfg.ir.mines]}, ${Math.round(st.mineEff * 100)}% left` : 'none'],
  ];
  return rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
}

/** Monte Carlo card: outcome bar, escalation shares and the lever table. */
export function mcHtml(mc, drv, cfg) {
  const n = mc.n, seg = k => mc[k] / n * 100, obj = cfg.us.obj;
  const bar = ['win', 'mixed', 'fail'].map(k => `<span class="seg ${k}" style="width:${seg(k)}%" title="${outcomeText(obj, k)}: ${mc[k]} of ${n}"></span>`).join('');
  const leg = ['win', 'mixed', 'fail'].map(k => `<li><span class="sw ${k}"></span>${outcomeText(obj, k)} <b class="num">${Math.round(seg(k))}%</b> <span class="muted num">(${mc[k]})</span></li>`).join('');
  const q = f => mc.prices[Math.min(n - 1, Math.floor(f * n))];
  const esc = [
    ['Major escalation', mc.major], ['Hormuz closure attempt', mc.hormuz],
    ['Strike on Gulf energy infrastructure', mc.gulf], ['Missile strikes on U.S. bases', mc.regional],
  ].map(([t, v]) => `<div class="eb"><span class="eb-t">${t}</span><span class="eb-bar"><span style="width:${v / n * 100}%"></span></span><b class="num">${Math.round(v / n * 100)}%</b></div>`).join('');
  const dr = drv.slice(0, 9).map(d => {
    const cell = (v, cls) => {
      const w = Math.min(50, Math.abs(v) * 100 * 1.5);
      return `<td class="dbar"><span class="${v > 0 ? cls : 'down'}" style="width:${w}%;${v > 0 ? 'left:50%' : `left:${50 - w}%`}"></span></td><td class="num">${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(Math.round(v * 1000) / 10)}</td>`;
    };
    return `<tr class="${d.side}"><td>${d.t}</td>${cell(d.d, 'up')}${cell(d.dMajor, 'esc')}</tr>`;
  }).join('');
  return `
    <div class="mc-bar" role="img" aria-label="Outcome shares">${bar}</div>
    <ul class="mc-leg">${leg}</ul>
    <p class="fine">Average per game: ${f2(mc.shipsHit)} U.S. ships put out of action, ${f2(mc.usLost)} U.S. strength points lost, ${f2(mc.lostMb)} million barrels of Iranian crude unshipped. Notional Brent at the end: median $${Math.round(q(0.5))}, 90th percentile $${Math.round(q(0.9))}. Domestic and allied cost index ${Math.round(mc.cost)} of 100.</p>
    <div class="mc-cols">
      <div><p class="lbl"><b>Escalation</b> <small>share of games</small></p>${esc}</div>
      <div><p class="lbl"><b>Key drivers</b> <small>change in percentage points when one lever moves one step, replaying the same 1,000 games. Levers are tested even when the budget would not allow them.</small></p>
        <div class="tablewrap"><table class="drv"><thead><tr><th>Lever</th><th colspan="2">U.S. objective met</th><th colspan="2">Major escalation</th></tr></thead><tbody>${dr || '<tr><td>No levers to test.</td></tr>'}</tbody></table></div></div>
    </div>`;
}
