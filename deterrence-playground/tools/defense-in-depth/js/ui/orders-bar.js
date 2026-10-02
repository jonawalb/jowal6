// The order bar (SPEC §1.3, §4, §8.2): clock and "Hour h of N", the comms line (orders start now or next hour;
// runner or radio; jammed), ammunition, the objective tracker, Undo / End hour, and Play again after the game.
// The attacker's barrage controls (a change after H-hour is a runner or radio message, SPEC §3.8) live here.
import { SCALES } from '../../data/scales.js';
import { ERAS } from '../../data/eras.js';
import { ORDERS, EW } from '../../data/params.js';
import { objectiveStatus } from '../engine.js';
import { orderDelay } from '../orders.js';
import { alive } from '../forces.js';
import { S, $, hhmm, esc } from './store.js';
import { pctTip, infoBtn } from './tips.js';
import { messageTip } from '../tips-text.js';

/** Sectors where the enemy jams your units this hour. */
function jammedCount(g, me) {
  const J = g.jammed[me === 'def' ? 'att' : 'def'];
  let n = 0;
  for (const u of g.units) if (u.side === me && alive(u) && u.sec >= 0 && J[u.sec]) n++;
  return n;
}

export function renderBar() {
  const g = S.g, me = S.me;
  if (!g) return;
  const Sc = SCALES[g.scale], over = !!g.over, planning = g.phase === 'plan';
  $('clock').textContent = planning ? 'Plan' : hhmm(g.t);
  $('hourof').textContent = planning ? `before H-hour (${hhmm(0)})` : over ? 'game over' : `Hour ${g.t + 1} of ${g.turns}`;
  const o = objectiveStatus(g);
  const cells = o.held.map((h, c) => `<i class="${h ? 'held' : ''}" title="Column ${c + 1}${h ? ': held by the attacker' : ''}"></i>`).join('');
  const who = me === 'att' ? `You hold ${o.best} of the ${o.need}<span class="dd-wide"> side-by-side</span> sectors you need` : `The enemy holds ${o.best} of the ${o.need}<span class="dd-wide"> side-by-side</span> sectors he needs`;
  $('objtrack').innerHTML = planning ? `<span class="dd-objt">${me === 'att' ? 'Take' : 'Hold'} ${esc(o.name)}: ${o.need} side-by-side sectors decide it at ${hhmm(g.turns)}</span>`
    : `<span class="dd-objcells" aria-hidden="true">${cells}</span><span class="dd-objt">${who} on ${esc(o.name)}.</span>`;
  const d = !planning && !over ? orderDelay(g, me) : 0;
  const era = ERAS[g.era], jam = !planning && era.ew ? jammedCount(g, me) : 0;
  const line = era.comms === 'runner' ? 'runner and telephone' : jam ? `radio; jammed in ${jam} sector${jam === 1 ? '' : 's'}` : 'radio';
  $('comms').innerHTML = planning || over ? '' : `${d ? `Orders start ${d === 1 ? 'next hour' : `in ${d} hours`}` : 'Orders start now'}<span class="dd-wide"> (${line})</span>`;
  $('comms').classList.toggle('late', !!d);
  const total = ((g.ui && g.ui.ammo0) || g.ammo)[me];
  $('ammo').innerHTML = planning || over ? '' : `Ammo ${pctTip(`${g.ammo[me]}`, 'ammo', { left: g.ammo[me], total })}`;
  $('undo').disabled = over || planning || !g.log.some(a => a.t === g.t);
  $('end').disabled = over || planning;
  $('late').hidden = !d || over;
  if (d && !over) $('late').innerHTML = `<span class="dd-clk" aria-hidden="true">◷</span><span><b>Orders are running late.</b> Moves you order this hour start at ${hhmm(g.t + d)}. Fire missions from batteries${me === 'def' ? ' (buried cable)' : ' in direct support'} and ripostes with authority still go at once.</span>`;
  document.body.classList.toggle('dd-over', over);
  $('barrage-ctl').innerHTML = !over && !planning && me === 'att' && g.barrage ? barrageCtl(g) : '';
}

function barrageCtl(g) {
  const b = g.barrage, w = g.era === 'w';
  const tip = messageTip(w ? { pLoss: ORDERS.runner.loss, delay: ORDERS.runner.delay, era: 'w' } : { pLoss: EW.msgLoss, delay: 1, era: 'm' });
  const pend = g.orders.some(o => o.a.kind === 'barrage' && !o.done && !o.lost);
  return `<span class="dd-barl">Barrage: ${b.rate} row${b.rate === 1 ? '' : 's'}/h${b.stop != null ? `, stops at row ${b.stop + 1}` : ''}${pend ? ' (change on its way)' : ''}</span>
    <span class="dd-seg" role="group" aria-label="Change the lift rate">${[0.5, 1, 1.5, 2].map(r => `<button type="button" class="btn" data-rate="${r}" aria-pressed="${b.rate === r}">${r}</button>`).join('')}</span>
    <button type="button" class="btn" data-bstop="1">Hold it here</button>${infoBtn(tip, 'Barrage changes are messages')}`;
}
