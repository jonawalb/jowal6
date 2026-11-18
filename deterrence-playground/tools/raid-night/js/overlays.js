// Overlay cards drawn over the game field: mode chooser, resupply break, pause and end of night.
import { WEAPONS, WEAPON_ORDER, RESUPPLY, MODE_NAME } from '../data/params.js';
import { orderCost, canAdd } from './resupply.js';
import { count } from './fmt.js';

const N = '<span class="notional">notional</span>';
const price = w => w === 'gun'
  ? `${RESUPPLY.gun.pts} pt per ${RESUPPLY.gun.per} bursts`
  : `${RESUPPLY[w].pts} pt${RESUPPLY[w].pts > 1 ? 's' : ''} each`;

export function readyHTML(seed, mode, mix, fromLink) {
  const opt = (m, title, body) => `<button type="button" class="mode${m === mode ? ' on' : ''}" data-act="start" data-mode="${m}"
      aria-describedby="mode-${m}"><b>${title}</b><span id="mode-${m}">${body}</span></button>`;
  return `<div class="ov-card wide"><p class="eyebrow">Notional model · seed ${seed}</p><h2>Raid Night</h2>
    <p>You command the air defense of four coastal cities. Pick a weapon, then click or tap an incoming track to fire at it. Three waves, about a minute each: stop what you can, spend as little as you can.</p>
    <p class="fine"><b>Choose a mode to start.</b></p>
    <div class="modes" role="group" aria-label="Choose a mode">
      ${opt('easy', 'Easy', `Normal, with a bigger resupply (${RESUPPLY.budget.easy} points between waves).`)}
      ${opt('normal', 'Normal <small>first game</small>', `One defense. Click a track to fire (or arrows + Space); 1 2 3 switch weapons. ${RESUPPLY.budget.normal} resupply points between waves.`)}
      ${opt('hard', 'Hard', 'Two batteries, one per hand: W fires the left, Space the right. Designed for a keyboard; full keys under Night settings.')}
    </div>
    ${fromLink ? `<p class="fine">This link was shared in ${MODE_NAME[mode]} mode (highlighted).</p>` : ''}
    <p class="fine">Wave 1. ${mix}</p></div>`;
}

export function breakHTML(S, order, m, w, mix) {
  const spent = orderCost(order), left = S.budget - spent;
  const row = k => {
    const W = WEAPONS[k], add = Math.min((order[k] || 0) * RESUPPLY[k].per, W.mag - S.ammo[k]);
    return `<tr><th scope="row">${W.short}<small>${price(k)}</small></th>
      <td class="step"><button type="button" class="sb" data-act="sub" data-w="${k}" aria-label="One fewer ${W.lc} reload" ${order[k] ? '' : 'disabled'}>−</button>
      <span class="num" aria-live="polite" aria-label="${order[k] || 0} ${W.lc} reloads">${order[k] || 0}</span>
      <button type="button" class="sb" data-act="add" data-w="${k}" aria-label="One more ${W.lc} reload" ${canAdd(S, order, k) ? '' : 'disabled'}>+</button></td>
      <td class="num">${S.ammo[k]}${add ? ` → <b>${S.ammo[k] + add}</b>` : ''}<small>of ${W.mag}</small></td></tr>`;
  };
  return `<div class="ov-card wide"><p class="eyebrow">Wave ${w + 1} of 3 over</p>
    <p>${count(m.leakTotal, 'leaker')} so far · ${count(m.dmgTotal, 'damage point')}</p>
    <div class="rs"><p class="rs-h"><b>Resupply before wave ${w + 2}</b> ${N}
      <span class="num" id="rs-total"><b>${spent}</b> of ${S.budget} points spent · ${left} left</span></p>
      <table class="rs-t"><thead><tr><th scope="col">Reload</th><th scope="col">Buy</th><th scope="col">Magazine</th></tr></thead>
      <tbody>${WEAPON_ORDER.map(row).join('')}</tbody></table>
      <p class="fine">Interceptor prices scale to the midpoint cost estimates (1 point per $100,000); the gun price and the budget are ${N}. Unspent points are lost.</p>
      <div class="rs-act"><button type="button" class="btn" data-act="fill">Split like the rules do</button><button type="button" class="btn" data-act="clear">Clear</button></div></div>
    <p class="fine">Next: wave ${w + 2}. ${mix}</p>
    <button type="button" class="btn solid" data-act="next" aria-keyshortcuts="N">Load and start wave ${w + 2} (N)</button></div>`;
}

export const pausedHTML = () => `<div class="ov-card"><h2>Paused</h2><p class="fine">Press P or the button to resume.</p>
  <button type="button" class="btn solid" data-act="resume">Resume</button></div>`;

export const overHTML = (you, mode) => `<div class="ov-card"><p class="eyebrow">Night over · ${MODE_NAME[mode]} mode</p>
  <p>${count(you.leakTotal, 'leaker')} · ${count(you.dmgTotal, 'damage point')}</p>
  <button type="button" class="btn solid" data-act="aar">See the after-action review</button></div>`;
