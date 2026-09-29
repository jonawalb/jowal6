// Prebunking Game: intro, quiz and training screens. Each view writes into the stage host and wires
// its own buttons to the actions passed in from app.js.
import { TECHNIQUES, PAGE_NAME, METER } from '../data/techniques.js';
import { SOURCES } from '../data/research.js';
import { postHtml, esc } from './post.js';
import { itemsFor, meters } from './score.js';

const SCALE = [1, 2, 3, 4, 5, 6, 7];
const KIND = {
  tech: { t: 'The manipulator’s move', c: 'k-tech' },
  honest: { t: 'Honest post', c: 'k-honest' },
  silly: { t: 'Too blatant', c: 'k-silly' },
};

export function renderIntro(host, act) {
  host.innerHTML = `<div class="card screen intro">
    <p class="eyebrow">A five-minute prebunking game</p>
    <h2 class="scr-h">Learn the moves of a manipulator, then try to spot them</h2>
    <p>Prebunking works like a vaccine: seeing a weakened dose of a manipulation technique, with an explanation, can make the real thing easier to recognise. This game follows the design of <i>Bad News</i>, a game built by researchers at the University of Cambridge, in miniature. Every post, account and town in it is invented.</p>
    <ol class="steps-l">
      <li><b>Pre-test.</b> Rate how much you would trust nine fictional posts.</li>
      <li><b>Training.</b> Run a fictional page, <i>${PAGE_NAME}</i>, and pick the post a manipulator would publish, once for each of six techniques.</li>
      <li><b>Post-test.</b> Rate nine different posts.</li>
      <li><b>Results.</b> See how your ratings changed, next to what published studies of <i>Bad News</i> found.</li>
    </ol>
    <div class="acts-row"><button type="button" class="btn solid" id="go">Start the pre-test</button>
    <button type="button" class="btn" id="skip">Skip to training</button></div>
    <p class="fine">Nothing you enter leaves your browser. Your answers are kept in the page address so you can come back to them or share them.</p>
  </div>`;
  host.querySelector('#go').onclick = () => act.phase('pre');
  host.querySelector('#skip').onclick = () => act.phase('learn');
}

export function renderQuiz(host, S, act) {
  const phase = S.s, items = itemsFor(phase, S.o), R = phase === 'pre' ? S.a : S.b;
  const i = S.qi, it = items[i], r = R[i];
  const last = i === items.length - 1;
  const done = R.every(Boolean);
  host.innerHTML = `<div class="card screen quiz">
    <div class="scr-top">
      <p class="eyebrow">${phase === 'pre' ? 'Pre-test' : 'Post-test'} · post ${i + 1} of ${items.length}</p>
      <ol class="dots" aria-label="Progress">${items.map((_, k) => `<li><button type="button" data-k="${k}" class="${R[k] ? 'on' : ''}${k === i ? ' cur' : ''}" aria-label="Post ${k + 1}${R[k] ? ', rated ' + R[k] : ''}" ${R[k] || k === i ? '' : 'disabled'}></button></li>`).join('')}</ol>
    </div>
    ${postHtml(it, { cls: 'big' })}
    <fieldset class="scale">
      <legend>How much would you trust this post?</legend>
      <div class="scale-b" role="group">${SCALE.map(v => `<button type="button" data-v="${v}" aria-pressed="${r === v}">${v}</button>`).join('')}</div>
      <div class="scale-l"><span>1 Not at all</span><span>4 Unsure</span><span>7 Completely</span></div>
    </fieldset>
    <div class="acts-row">
      <button type="button" class="btn" id="back" ${i === 0 ? 'disabled' : ''}>Back</button>
      <button type="button" class="btn solid" id="next" ${r ? '' : 'disabled'}>${last ? (phase === 'pre' ? 'Start training' : 'See my results') : 'Next post'}</button>
    </div>
    <p class="fine">Judge the post as written. All of them are invented, so the question is whether it tries to manipulate you, not whether you know it to be true.${!last && done ? ' All posts rated: you can finish from the last one.' : ''}</p>
  </div>`;
  host.querySelectorAll('.scale-b button').forEach(b => { b.onclick = () => act.rate(Number(b.dataset.v)); });
  host.querySelectorAll('.dots button').forEach(b => { b.onclick = () => act.goItem(Number(b.dataset.k)); });
  host.querySelector('#back').onclick = () => act.goItem(i - 1);
  host.querySelector('#next').onclick = () => (last ? act.phase(phase === 'pre' ? 'learn' : 'done') : act.goItem(i + 1));
}

function delta(kind) {
  const m = METER[kind];
  const f = m.followers >= 1 ? `+${Math.round((m.followers - 1) * 100)}% followers` : `−${Math.round((1 - m.followers) * 100)}% followers`;
  const c = m.cred ? `${m.cred > 0 ? '+' : '−'}${Math.abs(m.cred)} credibility` : 'credibility unchanged';
  return `${f}, ${c}`;
}

export function renderLearn(host, S, act) {
  const t = TECHNIQUES[S.t], ch = S.c[S.t];
  const chosen = ch != null;
  const right = chosen && t.options[ch].kind === 'tech';
  const src = SOURCES.R19;
  host.innerHTML = `<div class="card screen learn">
    <div class="scr-top">
      <p class="eyebrow">Training · technique ${S.t + 1} of 6</p>
      <ol class="tabs" aria-label="Techniques">${TECHNIQUES.map((x, k) => `<li><button type="button" data-k="${k}" aria-current="${k === S.t ? 'step' : 'false'}" class="${S.c[k] != null ? 'on' : ''}" ${S.c[k] != null || k === S.t || k <= firstOpen(S) ? '' : 'disabled'}>${x.name}</button></li>`).join('')}</ol>
    </div>
    <h2 class="scr-h">${t.name}</h2>
    <p class="setup">${esc(t.setup)} <b>${esc(t.ask)}</b></p>
    <div class="opts" role="group" aria-label="Choose a post">
      ${t.options.map((o, k) => {
        const lab = chosen ? `<span class="kind ${KIND[o.kind].c}">${KIND[o.kind].t}<small>${delta(o.kind)}</small></span>` : '';
        return `<button type="button" class="opt${chosen && ch === k ? ' picked' : ''}${chosen ? ' shown' : ''}" data-k="${k}" aria-pressed="${ch === k}">
          ${lab}${postHtml({ ...o, av: o.kind === 'tech' && t.key === 'imp' ? 7 : 8 }, { reveal: chosen && o.kind === 'tech' })}</button>`;
      }).join('')}
    </div>
    ${chosen ? `<div class="fb" aria-live="polite">
      <div class="status" data-s="${right ? 'good' : 'warn'}"><b>${right ? 'Badge earned: ' + t.badge : 'Not what a manipulator would pick'}</b>
      <span>${right ? 'That is the post built to spread.' : t.options[ch].kind === 'honest' ? 'Honest posts lose followers in this game, as in Bad News, where players are “punished” for journalistic choices.' : 'Too blatant: readers stop believing you.'} The highlighted words are the tells.</span></div>
      <p class="def"><span class="eyebrow">In the research</span> ${t.name} means “${esc(t.quote)}”${t.quote2 ? `, “${esc(t.quote2)}”` : ''} (<a href="${src.url}" target="_blank" rel="noopener">Roozenbeek &amp; van der Linden 2019</a>, ${t.page}).</p>
      <p>${esc(t.why)}</p>
      <p class="eyebrow">Tells to look for</p>
      <ul class="tells">${t.tells.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="acts-row"><button type="button" class="btn solid" id="next">${S.t === 5 ? 'Go to the post-test' : 'Next technique'}</button></div>
    </div>` : '<p class="fine">Pick one. You will see why each post helps or hurts your fictional page.</p>'}
  </div>`;
  host.querySelectorAll('.opt').forEach(b => { b.onclick = () => act.choose(Number(b.dataset.k)); });
  host.querySelectorAll('.tabs button').forEach(b => { b.onclick = () => act.goTech(Number(b.dataset.k)); });
  const nx = host.querySelector('#next');
  if (nx) nx.onclick = () => (S.t === 5 ? act.phase('post') : act.goTech(S.t + 1));
}
const firstOpen = S => { const k = S.c.findIndex(v => v == null); return k < 0 ? 5 : k; };

/** Side panel: phase, meters, badges. */
export function renderPanel(S) {
  const $ = id => document.getElementById(id);
  const PH = {
    intro: ['Ready to play', 'Four short stages, about five minutes.'],
    pre: ['Pre-test', 'Rate each post from 1 to 7. No feedback yet.'],
    learn: ['Training', 'Pick the post a manipulator would write.'],
    post: ['Post-test', 'A new set of posts. Rate each one.'],
    done: ['Results', 'Your ratings before and after training.'],
  };
  $('st-b').textContent = PH[S.s][0];
  $('st-s').textContent = PH[S.s][1];
  document.querySelectorAll('#stages li').forEach(li => {
    const k = li.dataset.k, order = ['pre', 'learn', 'post', 'done'];
    li.className = k === S.s ? 'cur' : order.indexOf(k) < order.indexOf(S.s) ? 'past' : '';
  });
  const m = meters(S.c);
  $('m-f').textContent = m.followers.toLocaleString('en-US');
  $('m-c').textContent = m.cred;
  $('m-cbar').style.width = m.cred + '%';
  $('m-fbar').style.width = Math.min(100, Math.log10(m.followers) / Math.log10(5000) * 100) + '%';
  $('badges').innerHTML = TECHNIQUES.map((t, k) => {
    const got = S.c[k] != null && t.options[S.c[k]].kind === 'tech';
    const seen = S.c[k] != null;
    return `<li class="${got ? 'got' : seen ? 'seen' : ''}" title="${t.name}${got ? ': badge earned' : seen ? ': reviewed' : ''}"><span class="bd" aria-hidden="true">${k + 1}</span><span>${t.badge}<small>${t.name}</small></span></li>`;
  }).join('');
}
