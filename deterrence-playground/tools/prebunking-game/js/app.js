// Borrowed Feelings: game flow, panel and shareable state.
// Flow: intro -> practice -> practice answer -> Part 1 (6 rounds) -> mirror -> Part 2 (6 rounds) -> results.
// The URL hash stores answers (#a=..) so a results screen can be shared. Nothing is sent anywhere.

import { PRACTICE, ROUNDS, CHANNELS } from '../data/rounds.js';
import { scoreAll } from './score.js';
import { renderRound, cleanup } from './round.js';
import { renderIntro, renderPractice, renderMirror, renderResults } from './screens.js';
import { createTour } from './tour.js';
import { stopDrone, audioAvailable } from './audio.js';

const screen = document.getElementById('screen');
const P1 = ROUNDS.filter(r => r.part === 1), P2 = ROUNDS.filter(r => r.part === 2);

const fresh = () => ({ stage: 'intro', i: 0, answers: {}, checks: {}, checkin: [], soundOn: false });
let S = fresh();

// ---------- hash ----------
function writeHash() {
  const vals = ROUNDS.map(r => S.answers[r.id] ?? '').join(',');
  const any = ROUNDS.some(r => S.answers[r.id] != null);
  history.replaceState(null, '', any ? `#a=${vals}` : location.pathname + location.search);
}
function readHash() {
  const m = location.hash.match(/a=([\d,]*)/);
  if (!m) return;
  const vals = m[1].split(',');
  ROUNDS.forEach((r, k) => {
    const v = parseInt(vals[k], 10);
    if (Number.isFinite(v) && v >= 0 && v <= 100) S.answers[r.id] = v;
  });
  const n1 = P1.filter(r => S.answers[r.id] != null).length, n2 = P2.filter(r => S.answers[r.id] != null).length;
  if (n1 === P1.length && n2 === P2.length) S.stage = 'results';
  else if (n1 === P1.length) S.stage = 'mirror';
  else S.answers = {};
}

// ---------- panel ----------
function panel() {
  const st = document.getElementById('st'), prog = document.getElementById('prog');
  const done = id => S.answers[id] != null;
  const labels = {
    intro: ['Ready', 'Start with the check-in and one practice round.'],
    practice: ['Practice', 'One round with the answer shown afterwards.'],
    'practice-fb': ['Practice', 'The worked answer.'],
    round: [`Part ${S.stage === 'round' && S.i >= P1.length ? 2 : 1}`, S.i >= P1.length ? 'Feel it, name it, place it, then answer.' : 'Judge each report. Answers come after six rounds.'],
    mirror: ['The mirror', 'Your weights in Part 1, loaded rounds against their twins.'],
    results: ['Results', 'Both parts, with what Walberg’s model predicts.'],
  };
  const [b, s] = labels[S.stage];
  st.querySelector('b').textContent = b;
  st.querySelector('span').textContent = s;
  const cur = S.stage === 'round' ? ROUNDS[S.i]?.id : null;
  const li = r => `<li class="${done(r.id) ? 'done' : ''}${r.id === cur ? ' cur' : ''}" title="${r.kind === 'loaded' && S.stage !== 'round' ? CHANNELS[r.channel].name : ''}"><span class="num">${r.id.slice(1)}</span></li>`;
  prog.innerHTML = `<p class="fine">Part 1</p><ol>${P1.map(li).join('')}</ol><p class="fine">Part 2</p><ol>${P2.map(li).join('')}</ol>`;
}

// ---------- render ----------
function render() {
  cleanup();
  panel();
  const top = () => document.getElementById('stage').scrollIntoView({ block: 'start', behavior: 'auto' });
  if (S.stage === 'intro') {
    renderIntro(screen, S, () => { S.stage = 'practice'; render(); top(); });
  } else if (S.stage === 'practice') {
    renderRound(screen, PRACTICE, { part: 1, idx: 0, total: 1, practice: true, soundOn: S.soundOn, checkin: S.checkin },
      a => { S.practice = a; S.stage = 'practice-fb'; render(); top(); });
  } else if (S.stage === 'practice-fb') {
    renderPractice(screen, S.practice ?? 50, () => { S.stage = 'round'; S.i = 0; render(); top(); });
  } else if (S.stage === 'round') {
    const r = ROUNDS[S.i], list = r.part === 1 ? P1 : P2;
    renderRound(screen, r, {
      part: r.part, idx: list.indexOf(r), total: list.length, soundOn: S.soundOn, checkin: S.checkin,
      onSoundToggle: on => { S.soundOn = on; syncSound(); },
    }, (a, check) => {
      S.answers[r.id] = a;
      if (check) S.checks[r.id] = check;
      S.i += 1;
      if (S.i === P1.length) S.stage = 'mirror';
      else if (S.i >= ROUNDS.length) S.stage = 'results';
      writeHash(); render(); top();
    });
  } else if (S.stage === 'mirror') {
    renderMirror(screen, scoreAll(S.answers), () => { S.stage = 'round'; S.i = P1.length; render(); top(); });
  } else if (S.stage === 'results') {
    const c = renderResults(screen, scoreAll(S.answers), S.checks, restart);
    c.addEventListener('click', () => copyLink(c));
  }
}

function restart() {
  stopDrone();
  S = fresh();
  writeHash();
  render();
}

// ---------- tour previews ----------
const EXAMPLE = { r1: 40, r2: 25, r3: 45, r4: 60, r5: 40, r6: 25 };
const tour = createTour(document.getElementById('tour-root'), {
  show: which => {
    if (which === null) return;
    cleanup();
    const pv = { idx: 0, total: 6, soundOn: false, checkin: S.checkin, practice: false };
    if (which === 'p1') renderRound(screen, ROUNDS.find(r => r.id === 'r4'), { ...pv, part: 1, idx: 3 }, () => {});
    if (which === 'p2') renderRound(screen, ROUNDS.find(r => r.id === 'r10'), { ...pv, part: 2, idx: 3 }, () => {});
    if (which === 'mirror') renderMirror(screen, scoreAll(EXAMPLE), () => {});
  },
  restore: render,
});

// ---------- controls ----------
function syncSound() {
  const t = document.getElementById('snd');
  if (t) t.checked = S.soundOn;
  if (!S.soundOn) stopDrone();
}
async function copyLink(btn) {
  writeHash();
  const old = btn.textContent;
  try { await navigator.clipboard.writeText(location.href); btn.textContent = 'Link copied'; }
  catch (e) { btn.textContent = 'Copy the address bar'; }
  setTimeout(() => { btn.textContent = old; }, 1600);
}

document.getElementById('start-tour').addEventListener('click', () => tour.start());
document.getElementById('restart').addEventListener('click', () => { tour.stop(); restart(); });
document.getElementById('copy-link').addEventListener('click', e => copyLink(e.currentTarget));
const snd = document.getElementById('snd');
if (!audioAvailable()) { snd.disabled = true; snd.closest('label').classList.add('off'); }
snd.addEventListener('change', () => {
  S.soundOn = snd.checked;
  if (S.stage === 'round' && ROUNDS[S.i]?.channel === 'sound' && !tour.active()) render();
  else syncSound();
});

readHash();
render();
