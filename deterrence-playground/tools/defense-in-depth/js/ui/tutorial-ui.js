// "Learn to play" on the page (2026-10-04): the result card at the end of the tutorial battle (in place of the
// full review, whose replays and charts are for the real scales), and the one-screen "How to play" sheet shown
// by the shared learn banner (shared/js/learn.js showSheet). The lesson's steps are js/ui/tutorial-steps.js; its
// battle is js/tutorial.js.
import { SCALES } from '../../data/scales.js';
import { moments } from '../story.js';
import { $, esc } from './store.js';

/** The rules on one screen (shared/js/learn.js sheet format). */
export const HOWTO = {
  title: 'Defense in Depth: how to play',
  goal: 'The attacker must <b>hold side-by-side boxes of the objective line</b> (the thick line) when the last hour ends: 2 at Division scale, 3 at Corps, 4 at Army. Anything else is a win for the defender. Losses and ground taken do not decide it.',
  controls: [
    ['Tap a unit', 'Select it; its orders open next to it (at the bottom on a phone).'],
    ['Tap a box', 'Send the selected unit there.'],
    ['Lane', 'A machine-gun company’s fire lane: tap a box to its side so it fires along the enemy’s line.'],
    ['Local counterattack', 'Defending: a company next to a box the enemy has just taken strikes it this hour.'],
    ['Leapfrog (L)', 'Attacking: pick two companies; one covers with fire while the other moves, then they swap.'],
    ['End hour (N)', 'Both sides move and fight for one hour. The line above the map says what you saw happen.'],
  ],
  ideas: [
    '<b>Fire sideways.</b> A machine gun firing along the enemy’s line (enfilade) hits far more men than one firing straight at them.',
    '<b>Keep the front thin.</b> Shells fall on the front first; hold most of your men back, out of the barrage, ready to strike.',
    '<b>Strike while the window is open.</b> For about two hours after he takes a box (a lodgment), his men are disorganized: green clock badge. Counterattack then.',
  ],
  terms: [
    ['Sector', 'One box of the map, 500 m across.'],
    ['Outpost / battle / rear zone', 'Thin warning line in front; the main fight in the middle; reserves and guns at the back.'],
    ['Lodgment', 'A box the enemy has just taken. Its clock badge shows the counterattack window.'],
    ['Consolidated', 'Dug in: after about two hours a lodgment is much harder to retake (grey badge).'],
    ['Barrage', 'Shells fired on a line of boxes; a creeping barrage moves forward ahead of the attackers.'],
  ],
};

/** The tutorial's result card in #aar. opts: { onReal(side), onAgain(), onSheet() }. */
export function tutorialResult(g, opts) {
  const el = $('aar'), Sc = SCALES[g.scale], won = g.over.winner === 'def';
  const loss = s => g.units.filter(u => u.side === s).reduce((a, u) => a + (u.str0 - Math.max(0, u.str)), 0);
  const ms = moments(g, 'def').slice(0, 4);
  const retook = g.events.some(e => e.kind === 'retaken' && e.side === 'def');
  el.hidden = false;
  el.innerHTML = `<div class="status" data-s="${won ? 'good' : 'bad'}"><b id="aar-t">${won ? 'You won the lesson battle' : 'The enemy won this time'}</b>
      <span>${won ? `He did not hold ${Sc.obj.need} side-by-side boxes of ${esc(Sc.obj.name)} at the end.` : `He held ${g.over.best} side-by-side boxes of ${esc(Sc.obj.name)} at the end.`}
      Losses: yours ${loss('def').toFixed(0)}, his ${loss('att').toFixed(0)} strength points (a full company is 10). They do not decide the game.</span></div>
    <p class="eyebrow">What happened</p><ol class="dd-moments">${ms.map(m => `<li class="${m.tone}"><span class="num">${m.when}</span>${esc(m.text)}</li>`).join('') || '<li>A quiet battle.</li>'}</ol>
    <p class="eyebrow">What you practised</p>
    <ul class="dd-learned">
      <li><b>Fire sideways</b> (enfilade): your machine gun’s lane ran along his line.</li>
      <li><b>Keep the front thin</b>: shells fall on the front boxes first.</li>
      <li><b>Strike while the window is open</b>: ${retook ? 'you took a lost box back while his men were still disorganized.' : 'a box he has just taken is easiest to retake in its first two hours.'}</li>
    </ul>
    <p class="fine">The real battles use the same rules on a bigger front: about 26 units against 36, 15 or 16 hours, and you draw up your own plan first. <i>Simple</i> view (top of the page) hides the finer numbers.</p>
    <div class="dd-gobar dd-learn-go"><button type="button" class="btn solid" data-lr="def">Play a real battle: defend</button><button type="button" class="btn" data-lr="att">Attack instead</button>
      <button type="button" class="btn" data-lr="again">Lesson again</button><button type="button" class="btn" data-lr="sheet">How to play (one screen)</button></div>`;
  el.querySelectorAll('[data-lr]').forEach(b => { b.onclick = () => { const k = b.dataset.lr; if (k === 'again') opts.onAgain(); else if (k === 'sheet') opts.onSheet(); else opts.onReal(k); }; });
}
