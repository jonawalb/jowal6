// The Practice field's drill card (an explainer before the first game). It sits in the page flow between the
// order bar and the board, so it never covers the map, its controls or End hour, and it stays visible on every
// phone tab. One instruction at a time; each step checks what you actually did (js/practice-drill.js), says
// "Done." and moves on; every step can be skipped. Then free practice, with Reset and Start the real game.
// The board, the unit popover and the orders are the real game's (js/ui/play.js), on the 3 x 4 practice board.
import { ERAS } from '../../data/eras.js';
import { practiceHour, delayThisHour } from '../practice.js';
import { DRILL, stepTitle, drillState, goStep, stepDone, stepNudge, hourLine } from '../practice-drill.js';
import { S, $, esc, unitOf, say, hhmm, narrow } from './store.js';
import { closeUnitPop } from './unit-pop.js';

let api = null;

/** Start the drill (or free practice, step = DRILL.length) on a fresh practice game S.g. ch: the start choices. */
export function practiceBegin(g, ch, step = 0) {
  if (S.practice && S.practice.timer) clearTimeout(S.practice.timer);
  S.practice = { ch, st: goStep(drillState(g, ch.side), g, step), timer: 0, hour };
  enter();
  render();
}

/** Leave practice mode (a real game, the start screen, or New game). */
export function practiceEnd() {
  if (!S.practice) { $('drill').hidden = true; return; }
  clearTimeout(S.practice.timer);
  S.practice = null;
  $('drill').hidden = true; $('drill').innerHTML = '';
  document.body.classList.remove('dd-practice');
}

/** Ask before leaving a battle in progress for the practice field. */
export function practiceAsk(onYes) {
  const box = $('drill');
  box.hidden = false;
  box.innerHTML = `<div class="dd-drill-h"><span class="dd-drill-k">Practice field</span></div>
    <h3>Leave this battle for the practice field?</h3><p>This battle stays in the address bar: press <b>Copy link</b> first to come back to it.</p>
    <div class="dd-drill-nav"><button type="button" class="btn" data-pno>Stay in the battle</button><button type="button" class="btn solid" data-pyes>Go to the practice field</button></div>`;
  box.querySelector('[data-pno]').onclick = () => { box.hidden = true; box.innerHTML = ''; };
  box.querySelector('[data-pyes]').onclick = () => onYes();
  box.querySelector('[data-pyes]').focus({ preventScroll: true });
}

/** a: { real(ch), leave(), reset(ch) } from app.js. */
export function wirePractice(a) {
  api = a;
  $('drill').addEventListener('click', e => {
    const P = S.practice, b = e.target.closest('button');
    if (!P || !b) return;
    const d = b.dataset;
    if (d.preal !== undefined) api.real(P.ch);
    else if (d.pleave !== undefined) api.leave();
    else if (d.preset !== undefined) api.reset(P.ch, DRILL.length);
    else if (d.pagain !== undefined) api.reset(P.ch, 0);
    else if (d.pskip !== undefined) to(P.st.i + 1);
    else if (d.pfree !== undefined) to(DRILL.length);
  });
  // A greyed order does nothing (js/ui/play.js ignores it); here it also says why, in words, and counts for the drill.
  document.addEventListener('click', e => {
    if (!S.practice) return;
    const b = e.target.closest('#upop .dd-off, #sel .dd-off');
    if (!b) return;
    const why = b.getAttribute('title') || 'it has no effect for this unit';
    say(`Greyed out: <b>${esc(b.textContent.split(':')[0].trim())}</b>. ${esc(why)}.`);
    S.practice.st = { ...S.practice.st, greyed: true };
    practiceCheck();
  }, true);
}

/** After every redraw: move on when the step is done, or show a hint. */
export function practiceCheck() {
  const P = S.practice;
  if (!P || !S.g || P.timer || P.st.i >= DRILL.length) return;
  const s = DRILL[P.st.i];
  // The formation step on a phone: once a formation is picked in the list, show the map for the tap.
  if (s.id === 'group' && S.selFmn && narrow() && S.tab !== 'map') S.ui.tab('map');
  if (stepDone(P.st, S.g, S.sel, S.selFmn)) {
    const p = $('drill').querySelector('.dd-drill-do');
    if (p) p.insertAdjacentHTML('beforeend', ' <span class="tour-ok">Done.</span>');
    const at = P.st.i;
    P.timer = setTimeout(() => { if (S.practice === P) { P.timer = 0; if (P.st.i === at) to(at + 1); } }, 700);
    return;
  }
  const n = $('drill').querySelector('.dd-drill-nudge'), text = stepNudge(P.st, S.g);
  if (n) { n.innerHTML = esc(text); n.hidden = !text; }
}

function to(k) {
  const P = S.practice;
  if (!P) return;
  clearTimeout(P.timer); P.timer = 0;
  P.st = goStep(P.st, S.g, k);
  // Each step starts with nothing picked (an armed tool, e.g. Lane, would turn the next tap on a unit into an
  // order), except the move step, which uses the unit you just picked.
  if (!DRILL[P.st.i] || DRILL[P.st.i].id !== 'move') { S.sel = []; S.selFmn = null; S.tool = null; closeUnitPop(false); }
  enter();
  render();
  S.ui.redraw();
  $('drill').querySelector('h3')?.focus({ preventScroll: true });
}

/** Side effects of entering a step: the "far" step makes this hour's orders late on purpose (a dashed line). */
function enter() {
  const P = S.practice;
  if (P && DRILL[P.st.i] && DRILL[P.st.i].id === 'far') delayThisHour(S.g);
}

/** Play a practice hour (play.js End hour calls this in place of the real engine). Returns the line to show. */
function hour(g) {
  const h = practiceHour(g), P = S.practice;
  // Still on the "far" step without a far order: keep this hour's orders late too, so the dashed line shows.
  if (P && DRILL[P.st.i] && DRILL[P.st.i].id === 'far' && !g.log.slice(P.st.log0).some(a => a.kind === 'move')) delayThisHour(g);
  return hourLine(h, id => esc((unitOf(id) || {}).short || id), hhmm(g.t));
}

function render() {
  const P = S.practice, box = $('drill');
  if (!P) return;
  const n = DRILL.length, i = P.st.i, side = P.ch.side, era = P.ch.era;
  const real = `<button type="button" class="btn${i >= n ? ' solid dd-drill-real' : ''}" data-preal>Start the real game</button>`;
  const head = `<div class="dd-drill-h"><span class="dd-drill-k">Practice field · ${side === 'def' ? 'defending' : 'attacking'}, ${esc(ERAS[era].label)}${i < n ? ` · step ${i + 1} of ${n}` : ''}</span>
    <span class="dd-drill-dots" aria-hidden="true">${DRILL.map((_, k) => `<i class="${k < i ? 'on' : k === i ? 'now' : ''}"></i>`).join('')}</span>
    <button type="button" class="x" data-pleave aria-label="Leave the practice field">×</button></div>`;
  if (i >= n) {
    box.innerHTML = `${head}<h3 tabindex="-1">Free practice</h3>
      <p class="dd-drill-do">Move anything you like: no enemy, nothing to lose. Try a leapfrog (pick two companies, press <b>L</b>, tap a box)${era === 'm' ? ', a drone sortie' : ''} or a covered route, and press End hour to watch.</p>
      <div class="dd-drill-nav"><button type="button" class="btn" data-preset>Reset the field</button><button type="button" class="btn" data-pagain>Run the drill again</button>${real}</div>`;
  } else {
    const s = DRILL[i];
    box.innerHTML = `${head}<h3 tabindex="-1">${esc(stepTitle(s, side))}</h3>
      <p class="dd-drill-do">${s.do(side, era)}</p>${s.more ? `<p class="dd-drill-more">${esc(s.more(side, era))}</p>` : ''}
      <p class="dd-drill-nudge" hidden></p>
      <div class="dd-drill-nav"><button type="button" class="btn" data-pskip>Skip this step</button><button type="button" class="btn" data-pfree>Skip to free practice</button>${real}</div>`;
  }
  box.hidden = false;
  document.body.classList.add('dd-practice');
}
