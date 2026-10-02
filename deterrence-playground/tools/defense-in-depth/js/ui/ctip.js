// The one-line contextual tip above the map (UI streamline #13), in place of the old tips strip. It READS the
// game to see what you are doing (a selected MG, an open lodgment, a storm company, a barrage that lifted at the
// wrong time, the plan step you are on) and shows the matching tip; otherwise the side's start tips one at a
// time ("Next tip"). Each tip can be dismissed; T brings them back. It is on the Map tab on phones.
import { SCALES } from '../../data/scales.js';
import { COUNTER } from '../../data/params.js';
import { startTips } from '../tips-text.js';
import { alive, isCompany } from '../forces.js';
import { underGuns } from '../arty.js';
import { gridFor } from '../grid.js';
import { S, $, esc, unitOf } from './store.js';
import { pickTip } from './ctip-pick.js';
import { stepsFor } from './plan-steps.js';

let dismissed = new Set(), rot = 0, game = null, hidden = false;

/** What the player is doing, read from the game (never changed here). */
function context(g) {
  const side = S.me;
  if (g.over) return { phase: 'over', side };
  if (g.phase === 'plan') return { phase: 'plan', side, step: stepsFor(side)[(S.planStep || 1) - 1]?.id };
  const one = S.sel.length === 1 ? unitOf(S.sel[0]) : null;
  const lodgOpen = side === 'def' && Object.values(g.lodg).some(L => !L.cons && L.hcap <= COUNTER.windowHours);
  const mine = g.units.filter(u => u.side === side && alive(u) && isCompany(u) && u.sec >= 0);
  const beyondGuns = side === 'att' && mine.some(u => gridRow(g, u) > SCALES[g.scale].bands.nml[1] && !underGuns(g, side, u.sec));
  const barrageMiss = side === 'att' && g.events.some(e => e.kind === 'lift' && e.side === 'att' && e.t === g.t - 1 && ['early', 'gap', 'late'].includes(e.case));
  return { phase: 'battle', side, selType: one && one.type, selPosture: one && one.posture, nSel: S.sel.length, lodgOpen, beyondGuns, barrageMiss };
}
const gridRow = (g, u) => gridFor(g.scale).row[u.sec];

export function renderTip() {
  const g = S.g, box = $('ctip');
  if (!g || g.over || hidden) { box.hidden = true; return; }
  if (game !== g) { game = g; dismissed = new Set(); rot = 0; }
  const tips = startTips(S.me, g.era, g.mode === 'c' ? 'c' : 's'), keys = tips.map(t => t.key);
  const pick = pickTip(context(g), keys, dismissed, rot);
  if (!pick) { box.hidden = true; return; }
  const t = tips.find(x => x.key === pick.key);
  const left = keys.filter(k => !dismissed.has(k)).length;
  box.dataset.key = pick.key;
  box.innerHTML = `<p><span class="dd-ctip-k">${pick.contextual ? 'Tip' : `Tip ${keys.filter(k => !dismissed.has(k)).indexOf(pick.key) + 1} of ${left}`}</span> <b>${esc(t.title)}.</b> ${esc(t.text)}</p>
    <span class="dd-ctip-b">${!pick.contextual && left > 1 ? '<button type="button" class="btn" data-tipnext>Next tip</button>' : ''}<button type="button" class="dd-tips-x" data-tipx aria-label="Dismiss this tip">×</button></span>`;
  box.hidden = false;
}

/** T: bring every tip back (or hide them all). */
export function showTips(on = true) { hidden = !on; if (on) { dismissed = new Set(); rot = 0; } renderTip(); }

export function wireTip() {
  $('ctip').addEventListener('click', e => {
    if (e.target.closest('[data-tipnext]')) { rot++; renderTip(); $('ctip').querySelector('[data-tipnext]')?.focus(); return; }
    if (e.target.closest('[data-tipx]')) { dismissed.add($('ctip').dataset.key); renderTip(); }
  });
}
export const tipsHidden = () => hidden || $('ctip').hidden;
