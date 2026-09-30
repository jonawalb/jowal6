// Renders one round: question, the two pieces of evidence, the non-evidence "channel",
// the Part 2 check-in step (feel, name, source) and the belief slider.

import { CHANNELS, CHECKIN, WORDS } from '../data/rounds.js';
import { startDrone, stopDrone, audioAvailable } from './audio.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let timers = [];
export function cleanup() {
  timers.forEach(t => clearInterval(t));
  timers = [];
  stopDrone();
}

function lrText(lr) {
  if (lr >= 1) return `${+lr.toFixed(2)}× as likely if it is real`;
  return `${+(1 / lr).toFixed(2)}× as likely if it is not`;
}

function evidenceHtml(r) {
  const n = Math.round(r.prior * 100);
  return `<div class="evidence" id="ev">
    <div class="ev"><span class="ev-k">Base rate</span><b class="num">${n} in 100</b><p>${esc(r.base)}</p></div>
    <div class="ev"><span class="ev-k">The report</span><b class="num">${lrText(r.lr)}</b><p>${esc(r.report)}</p></div>
  </div>`;
}

function soundHtml(soundOn) {
  const bars = Array.from({ length: 28 }, (_, i) => `<i style="animation-delay:${(i * 0.07).toFixed(2)}s"></i>`).join('');
  const btn = audioAvailable()
    ? `<button type="button" class="btn" id="snd-btn">${soundOn ? 'Stop sound' : 'Play sound'}</button>` : '';
  return `<div class="chan snd" data-ch="sound"><div class="snd-bars" aria-hidden="true">${bars}</div>
    <div class="snd-t"><b>Soundtrack</b><span>Low drone under this report. ${audioAvailable() ? 'Headphones, low volume.' : 'Audio is not available in this browser.'}</span></div>${btn}</div>`;
}

function crowdHtml(r) {
  return `<div class="chan crowd" data-ch="crowd" aria-label="Comment thread">
    <div class="crowd-h"><b>Ardley Community Board</b><span><b class="num" id="shares">1,184</b> shares</span></div>
    <ul>${r.comments.map(([u, t]) => `<li><span class="u">@${esc(u)}</span> ${esc(t)}</li>`).join('')}</ul></div>`;
}

function carryHtml(r) {
  const c = r.carry;
  return `<div class="chan carry" data-ch="carry"><span class="ev-k">${esc(c.when)}</span><b>${esc(c.head)}</b><p>${esc(c.body)}</p></div>`;
}

function angerHtml(r) {
  return `<div class="chan anger" data-ch="anger"><b>They never learn.</b> ${esc(r.anger)}</div>`;
}

function bodyHtml(checkin) {
  const said = CHECKIN.filter(c => checkin.includes(c.k) && c.k !== 'fine').map(c => c.t.toLowerCase());
  const line = said.length
    ? `At the start you said: ${esc(said.join(', '))}.`
    : 'Notice your breathing, your shoulders and your stomach for a moment.';
  return `<div class="chan body" data-ch="body"><span class="heart" aria-hidden="true"></span>
    <div><b>Decide fast.</b> <span>${line}</span></div>
    <span class="clock num" id="clock" aria-live="off">15</span></div>`;
}

function channelHtml(r, st) {
  switch (r.channel) {
    case 'sound': return { top: soundHtml(st.soundOn) };
    case 'crowd': return { after: crowdHtml(r) };
    case 'carry': return { top: carryHtml(r) };
    case 'anger': return { top: angerHtml(r) };
    case 'body': return { top: bodyHtml(st.checkin) };
    default: return {};
  }
}

function gridHtml() {
  const V = ['very unpleasant', 'unpleasant', 'neutral', 'pleasant', 'very pleasant'];
  const A = ['very activated', 'activated', 'medium', 'calm', 'very calm'];
  let cells = '';
  for (let a = 0; a < 5; a++) for (let v = 0; v < 5; v++) {
    cells += `<button type="button" class="gc" data-v="${v}" data-a="${4 - a}" aria-pressed="false" aria-label="${V[v]}, ${A[a]}"></button>`;
  }
  return `<div class="agrid-wrap"><div class="ax-y" aria-hidden="true"><span>activated</span><span>calm</span></div>
    <div class="agrid" role="group" aria-label="Affect grid: valence left to right, arousal bottom to top">${cells}</div>
    <div class="ax-x" aria-hidden="true"><span>unpleasant</span><span>pleasant</span></div></div>`;
}

function checkHtml(r, st) {
  const el = CHANNELS[r.channel].el;
  const opts = [['ev', 'The base rate and the report']];
  if (el) opts.push(['ch', el]);
  opts.push(['body', 'My body today'], ['none', 'Nothing in particular']);
  return `<div class="check" id="check">
    <div class="ck-step"><p class="eyebrow">1 · Feel it</p><p class="fine">Where is your feeling right now? Tap one square.</p>${gridHtml()}</div>
    <div class="ck-step"><p class="eyebrow">2 · Name it</p><div class="words" role="group" aria-label="Feeling word">
      ${WORDS.map(w => `<button type="button" data-w="${w}" aria-pressed="false">${w}</button>`).join('')}</div></div>
    <div class="ck-step"><p class="eyebrow">3 · Place it</p><p class="fine">What on this screen, or in you, is producing that feeling? Pick any.</p>
      <div class="words src-opts" role="group" aria-label="Source of the feeling">
      ${opts.map(([k, t]) => `<button type="button" data-s="${k}" aria-pressed="false">${esc(t)}</button>`).join('')}</div>
      <button type="button" class="btn" id="ck-done" disabled>Done</button></div>
    <p class="ck-fb" id="ck-fb" hidden></p>
  </div>`;
}

function checkFeedback(r, st, picked) {
  const el = CHANNELS[r.channel].el;
  const parts = ['Only the base rate and the report are evidence.'];
  if (el) parts.push(`${el} tells you nothing about the question.${picked.includes('ch') ? ' You caught it.' : ' You did not pick it, which is worth a second look.'}`);
  const said = CHECKIN.filter(c => st.checkin.includes(c.k) && c.k !== 'fine');
  if (picked.includes('body') || said.length) parts.push('Your body state is real, and it is about you, not about this question.');
  parts.push('Set the rest aside, then answer.');
  return parts.join(' ');
}

/**
 * Render a round. st: { part, idx, total, soundOn, checkin, practice }
 * onSubmit(answer 0..100, check|null)
 */
export function renderRound(root, r, st, onSubmit) {
  cleanup();
  const ch = channelHtml(r, st);
  const needCheck = st.part === 2;
  const label = st.practice ? 'Practice round' : `Part ${st.part} · Round ${st.idx + 1} of ${st.total}`;
  root.innerHTML = `<article class="card rcard" id="rcard">
    <div class="rhead"><p class="eyebrow">${label}</p><span class="fine">${st.practice ? 'The answer is shown after you submit.' : 'Answers are shown after each part.'}</span></div>
    ${ch.top || ''}
    <h2 class="q" id="q">${esc(r.q)}</h2>
    ${evidenceHtml(r)}
    ${ch.after || ''}
    ${needCheck ? checkHtml(r, st) : ''}
    <div class="answer" id="answer">
      <div class="sl-h"><label for="belief">How likely is it, now that you have seen the report?</label><output id="bel-out" class="num">move the slider</output></div>
      <input type="range" id="belief" min="0" max="100" step="1" value="50" ${needCheck ? 'disabled' : ''}>
      <div class="ticks" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
      <div class="ans-row"><button type="button" class="btn solid" id="submit" disabled>Lock in</button>
      ${needCheck ? '<span class="fine" id="ans-hint">Finish the three steps above first.</span>' : ''}</div>
    </div>
  </article>`;

  const slider = root.querySelector('#belief'), out = root.querySelector('#bel-out'), submit = root.querySelector('#submit');
  let touched = false;
  slider.addEventListener('input', () => { touched = true; out.textContent = `${slider.value}%`; submit.disabled = slider.disabled; });

  // Channel behaviour
  if (r.channel === 'sound') {
    const b = root.querySelector('#snd-btn');
    if (st.soundOn) startDrone();
    if (b) b.addEventListener('click', () => {
      st.soundOn = !st.soundOn;
      st.onSoundToggle?.(st.soundOn);
      if (st.soundOn) startDrone(); else stopDrone();
      b.textContent = st.soundOn ? 'Stop sound' : 'Play sound';
    });
  }
  if (r.channel === 'crowd') {
    const s = root.querySelector('#shares');
    let n = 1184;
    timers.push(setInterval(() => { n += 3 + Math.floor(Math.random() * 9); s.textContent = n.toLocaleString('en-US'); }, reduced() ? 4000 : 700));
  }
  const startClock = () => {
    const c = root.querySelector('#clock');
    if (!c) return;
    let t = 15;
    timers.push(setInterval(() => {
      t = Math.max(0, t - 1);
      c.textContent = t;
      if (t === 0) { c.classList.add('zero'); c.textContent = '0'; }
    }, 1000));
  };

  // Part 2 check step
  const check = { grid: null, word: null, src: [] };
  if (needCheck) {
    const done = root.querySelector('#ck-done');
    const ready = () => { done.disabled = !(check.grid && check.word && check.src.length); };
    root.querySelectorAll('.gc').forEach(b => b.addEventListener('click', () => {
      root.querySelectorAll('.gc').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      check.grid = { v: +b.dataset.v, a: +b.dataset.a };
      ready();
    }));
    root.querySelectorAll('[data-w]').forEach(b => b.addEventListener('click', () => {
      root.querySelectorAll('[data-w]').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      check.word = b.dataset.w;
      ready();
    }));
    root.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      check.src = [...root.querySelectorAll('[data-s][aria-pressed="true"]')].map(x => x.dataset.s);
      ready();
    }));
    done.addEventListener('click', () => {
      const fb = root.querySelector('#ck-fb');
      fb.textContent = checkFeedback(r, st, check.src);
      fb.hidden = false;
      root.querySelectorAll('#check button').forEach(b => { b.disabled = true; });
      root.querySelectorAll('.chan').forEach(c => c.classList.add('flagged'));
      slider.disabled = false;
      submit.disabled = !touched;
      const h = root.querySelector('#ans-hint'); if (h) h.textContent = '';
      startClock();
      slider.focus({ preventScroll: true });
    });
  } else {
    startClock();
  }

  submit.addEventListener('click', () => {
    if (!touched || slider.disabled) return;
    cleanup();
    onSubmit(+slider.value, needCheck ? check : null);
  });
}
