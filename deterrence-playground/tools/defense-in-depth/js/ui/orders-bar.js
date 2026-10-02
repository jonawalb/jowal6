// The order bar (SPEC §1.3, §4, §8.2; UI streamline #12): one slim row. Clock and "Hour h of N" with the game's
// settings behind an "i" (the old status card), the objective tracker once (cells + a short count + its "i"),
// the comms chip (when orders start; the "running late" banner now lives in its "i"), ammunition, the attacker's
// barrage control in a popover, Undo / End hour, and Play again after the game.
import { SCALES } from '../../data/scales.js';
import { ERAS } from '../../data/eras.js';
import { ORDERS, EW } from '../../data/params.js';
import { objectiveStatus } from '../engine.js';
import { orderDelay } from '../orders.js';
import { alive } from '../forces.js';
import { S, $, hhmm, esc } from './store.js';
import { pctTip, infoBtn } from './tips.js';
import { messageTip } from '../tips-text.js';

const DIFF = { e: 'Easy', s: 'Standard', h: 'Hard' };

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
  $('hourof').textContent = planning ? `H-hour ${hhmm(0)}` : over ? 'game over' : `Hour ${g.t + 1} of ${g.turns}`;
  $('bar-meta').innerHTML = infoBtn({ title: `${me === 'def' ? 'Defending' : 'Attacking'}${S.campaign ? `, campaign battle ${S.campaign.battle + 1}` : ''}`,
    lines: [`${Sc.label} · ${ERAS[g.era].label} · ${DIFF[g.diff] || 'Standard'}`, `Balance ${g.od ?? 5} (5 is standard)`, `Objective: ${Sc.obj.name}`], notes: [] }, 'This game');
  const o = objectiveStatus(g);
  const cells = o.held.map((h, c) => `<i class="${h ? 'held' : ''}" title="Column ${c + 1}${h ? ': held by the attacker' : ''}"></i>`).join('');
  const tip = { title: `${o.name}: ${o.need} side-by-side sectors decide it`, lines: [
    me === 'att' ? `You hold ${o.best} of the ${o.need} side-by-side sectors you need` : `The enemy holds ${o.best} of the ${o.need} side-by-side sectors he needs`,
    `Checked at the end of the last hour (${hhmm(g.turns)}): each sector needs at least half an attacking company and no unbroken defender`],
    notes: ['A filled cell is a sector of the line the attacker holds now. Losses and ground gained do not decide the game.'] };
  $('objtrack').innerHTML = `<span class="dd-objcells" aria-hidden="true">${cells}</span><span class="dd-objt"><span class="dd-wide">${planning ? (me === 'att' ? 'Take' : 'Hold') : me === 'att' ? 'You hold' : 'Enemy holds'} </span><b class="num">${planning ? '' : `${o.best}/`}${o.need}</b>${planning ? ` of ${esc(o.name)}` : ''}</span>${infoBtn(tip, 'The objective')}`;
  const d = !planning && !over ? orderDelay(g, me) : 0;
  const era = ERAS[g.era], jam = !planning && era.ew ? jammedCount(g, me) : 0;
  const line = era.comms === 'runner' ? 'Runner and telephone' : jam ? `Radio, jammed in ${jam} sector${jam === 1 ? '' : 's'}` : 'Radio';
  const ctip = { title: d ? 'Orders are running late' : 'Orders start now', lines: [line,
    d ? `Moves you order this hour start at ${hhmm(g.t + d)}` : 'Moves you order this hour start at once'],
    notes: [`Fire missions from batteries${me === 'def' ? ' (buried cable)' : ' in direct support'} and local counterattacks with authority still go at once.`] };
  $('comms').innerHTML = planning || over ? '' : `${d ? '<span class="dd-clk" aria-hidden="true">◷</span> ' : ''}Orders<span class="dd-wide"> start</span> ${d ? hhmm(g.t + d) : 'now'}${infoBtn(ctip, 'When orders start')}`;
  $('comms').classList.toggle('late', !!d);
  const total = ((g.ui && g.ui.ammo0) || g.ammo)[me];
  $('ammo').innerHTML = planning || over ? '' : `Ammo ${pctTip(`${g.ammo[me]}`, 'ammo', { left: g.ammo[me], total })}`;
  $('undo').disabled = over || planning || !g.log.some(a => a.t === g.t);
  $('end').disabled = over || planning;
  document.body.classList.toggle('dd-over', over);
  const bar = !over && !planning && me === 'att' && !!g.barrage;
  $('barrage-wrap').hidden = !bar;
  if (!bar) closeBarrage();
  else { $('barrage-btn').innerHTML = `Barrage<span class="dd-wide"> ${g.barrage.rate}/h</span> <span aria-hidden="true">▾</span>`; if (!$('barrage-ctl').hidden) $('barrage-ctl').innerHTML = barrageCtl(g); }
}

function barrageCtl(g) {
  const b = g.barrage, w = g.era === 'w';
  const tip = messageTip(w ? { pLoss: ORDERS.runner.loss, delay: ORDERS.runner.delay, era: 'w' } : { pLoss: EW.msgLoss, delay: 1, era: 'm' });
  const pend = g.orders.some(o => o.a.kind === 'barrage' && !o.done && !o.lost);
  return `<p class="dd-barl">Creeping barrage: ${b.rate} row${b.rate === 1 ? '' : 's'} an hour${b.stop != null ? `, stops at row ${b.stop + 1}` : ''}${pend ? ' (a change is on its way)' : ''}${infoBtn(tip, 'Barrage changes are messages')}</p>
    <span class="dd-seg" role="group" aria-label="Lift rate, rows an hour">${[0.5, 1, 1.5, 2].map(r => `<button type="button" class="btn" data-rate="${r}" aria-pressed="${b.rate === r}" title="Lift ${r} row${r === 1 ? '' : 's'} an hour">${r}</button>`).join('')}</span>
    <button type="button" class="btn" data-bstop="1" title="Stop the barrage on the rows it is falling on now">Hold it here</button>`;
}

export function openBarrage() {
  const g = S.g;
  if (!g || !g.barrage) return;
  $('barrage-ctl').innerHTML = barrageCtl(g); $('barrage-ctl').hidden = false; $('barrage-btn').setAttribute('aria-expanded', 'true');
  $('barrage-ctl').querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
}
export function closeBarrage(refocus = false) {
  if ($('barrage-ctl').hidden) return;
  $('barrage-ctl').hidden = true; $('barrage-btn').setAttribute('aria-expanded', 'false');
  if (refocus) $('barrage-btn').focus({ preventScroll: true });
}
/** Wire the barrage popover's open / close (its buttons are handled in app.js). */
export function wireBarragePop() {
  $('barrage-btn').addEventListener('click', () => ($('barrage-ctl').hidden ? openBarrage() : closeBarrage()));
  $('barrage-ctl').addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeBarrage(true); } });
  document.addEventListener('pointerdown', e => { if (!$('barrage-ctl').hidden && !e.target.closest('#barrage-wrap') && !e.target.closest('.dd-tip')) closeBarrage(); }, true);
}
