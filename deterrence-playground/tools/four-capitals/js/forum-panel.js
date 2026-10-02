// The peace forum on the page (Batch B): the tooltip behind a forum call's %, the accept/decline dialog when a
// computer capital calls a forum addressed to you, and the results line that explains each decision. The equation
// itself lives in js/forum.js.
import { P } from '../data/params.js';
import { COUNTRIES } from '../data/countries.js';
import { forumFactors, limitedOf } from './forum.js';
import { intelView } from './ai.js';

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const F = P.forum;
const n = x => Math.round(x * 100);
const sgn = x => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}`;

/** The four factors (the fourth has two parts), with what each measures. `est` marks the ones that are estimates. */
export function factorRows(f, est = {}) {
  return [
    ['Resolve', 'type and home support', f.R, f.terms.R, est.R],
    ['Anger', 'at the caller: recent strikes and losses, mainland strikes most; fades each month', f.A, f.terms.A, false],
    ['Opportunity costs', 'economic damage, the shock meter, losses, fuel and munitions used, sanctions or blockade', f.C, f.terms.C, est.C],
    ['Expected gains from fighting on', 'force balance at sea, Taiwan’s position, landings', f.E, f.terms.E, true],
    ['Belief the caller’s aims are limited', 'how cautious the caller seems', f.L, f.terms.L, est.L],
  ];
}
const EQ = `P = 1 / (1 + e^−z), z = ${String(F.k0).replace('-', '−')} − ${F.kR}·Resolve − ${F.kA}·Anger + ${F.kC}·Costs − ${F.kE}·Gains + ${F.kL}·Limited aims (each 0–1), kept between ${n(F.clamp[0])}% and ${n(F.clamp[1])}%.`;

/** Tooltip for a forum call's % on your menu: your estimate that the rival accepts, factor by factor. */
export function forumTip(f, to) {
  return {
    title: `About ${n(f.p)}% that ${COUNTRIES[to].capital} accepts`,
    lines: factorRows(f, { R: true, C: true, L: true }).map(([l, , v, t, e]) => `${l} ${n(v)}${e ? ' (estimate)' : ''}: ${sgn(t)}`),
    notes: [EQ, 'Your estimate: their type from your read of them, their stocks unknown, the force balance as you see it, and how they seem to read you. The true chance uses what they know.'],
  };
}

/** Results-line text for a forum decision. */
export function forumText(l, player) {
  const { to, accepted, why, human } = l.forum, who = COUNTRIES[to].capital;
  const subj = to === player ? 'You' : who;
  const r = why.length ? `: ${why.join(', ')}` : '';
  const odds = human ? '' : ` (acceptance ${n(l.p)}%, rolled ${Math.round(l.roll * 100)})`;   // a person's own choice carries no roll
  return `${subj} ${accepted ? 'accepted' : 'declined'}${to === player ? '' : r}${odds}${accepted ? '. Ceasefire next month.' : '.'}`;
}

/** Ask the player to accept or decline `from`'s forum call. Resolves to 'accept' or 'decline'. */
export function askForum(s, from, me, B) {
  const read = intelView(B, s, me, from);
  const f = forumFactors(s, from, me, { lim: limitedOf(read), obs: me });
  let d = document.getElementById('k4-forum');
  if (!d) { d = document.createElement('dialog'); d.id = 'k4-forum'; d.className = 'k4-dialog'; d.setAttribute('aria-labelledby', 'k4-forum-t'); document.body.appendChild(d); }
  const rows = factorRows(f, { L: true }).map(([l, x, v, t, e]) => `<tr><th scope="row">${esc(l)}<small>${esc(x)}${e ? ' · estimate' : ''}</small></th><td class="num">${n(v)}</td><td class="num ${t < 0 ? 'bad' : 'good'}">${sgn(t)}</td></tr>`).join('');
  d.innerHTML = `<form method="dialog">
    <p class="eyebrow">${COUNTRIES[from].name} · peace forum</p>
    <h2 id="k4-forum-t">${COUNTRIES[from].capital} calls for a peace forum to end the conflict</h2>
    <p>Accept, and a ceasefire holds next month: escalatory moves cost more at home, breaking it costs credibility, the ladder steps down a rung now, and if the ceasefire holds the crisis ends in a settlement. Decline, and the crisis goes on; ${COUNTRIES[from].capital} loses a little credibility.</p>
    <div class="k4-scroll"><table class="k4-forumt"><caption>How a leader in your position weighs it (level 0–100; effect on z)</caption>
      <thead><tr><th scope="col">Factor</th><th scope="col">Level</th><th scope="col">Effect</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="fine">${esc(EQ)} Anger, resolve and costs are your own and known exactly; gains use the force balance as you see it through the fog, and the caller’s aims your read of them (${esc(P.typeLabel[Object.keys(read).reduce((a, k) => (read[k] > read[a] ? k : a))].toLowerCase())} most likely).</p>
    <p class="k4-forump">Leaders in your position would accept about <b>${n(f.p)}%</b> of the time. The choice is yours.</p>
    <div class="k4-row"><button type="submit" class="btn solid" value="accept">Accept the forum</button><button type="submit" class="btn" value="decline">Decline</button></div></form>`;
  return new Promise(res => {
    const keep = e => e.preventDefault();             // Escape does not close it: a choice is required
    const done = () => {
      if (!['accept', 'decline'].includes(d.returnValue)) { d.showModal(); d.querySelector('.solid').focus({ preventScroll: true }); return; }   // closed without a choice (the browser may force Escape): ask again
      d.removeEventListener('close', done); d.removeEventListener('cancel', keep); res(d.returnValue);
    };
    d.addEventListener('cancel', keep);
    d.addEventListener('close', done);
    d.returnValue = '';
    d.showModal();
    d.querySelector('.solid').focus({ preventScroll: true }); d.scrollTop = 0;
  });
}
