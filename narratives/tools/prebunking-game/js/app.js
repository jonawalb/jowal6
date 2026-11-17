// Borrowed Feelings: game flow, panel and shareable state.
// Flow: intro -> practice -> practice answer -> Part 1 (6 rounds) -> mirror -> Part 2 (6 rounds) -> results.
// The URL hash stores answers (#a=..) and whether the soundtrack actually played (&s=1), so a results
// screen can be shared. #example opens the example result, #sample a sample round. Nothing is sent anywhere.

import { PRACTICE, ROUNDS, CHANNELS } from '../data/rounds.js';
import { scoreAll } from './score.js';
import { renderRound, cleanup } from './round.js';
import { renderIntro, renderPractice, renderMirror, renderResults } from './screens.js';
import { initDetail, getDetail, setDetail } from './detail.js';
import { createTour } from './lesson.js';
import { stopDrone, audioAvailable } from './audio.js';

const screen = document.getElementById('screen');
const P1 = ROUNDS.filter(r => r.part === 1), P2 = ROUNDS.filter(r => r.part === 2);

const fresh = () => ({ stage: 'intro', i: 0, answers: {}, checks: {}, checkin: [], soundOn: false, heard: false, r1Played: false });
let S = fresh();
// view: null = the player's own game; 'example' = example result; 'sample' = a sample round (not scored).
let view = null;

// Example answers (invented). Loaded rounds lean toward alarm; twins sit near Bayes. Assumes sound was on.
export const EXAMPLE = { r1: 40, r2: 25, r3: 46, r4: 70, r5: 40, r6: 25, r7: 20, r8: 8, r9: 50, r10: 70, r11: 60, r12: 41 };
const EXAMPLE_P1 = Object.fromEntries(Object.entries(EXAMPLE).filter(([k]) => P1.some(r => r.id === k)));

// The soundtrack round has a pull only if the drone played; otherwise its pair is shown but not scored.
const skipFor = (answers, heard) => (answers.r1 != null && !heard ? ['r1'] : []);

// ---------- hash ----------
function writeHash() {
  const vals = ROUNDS.map(r => S.answers[r.id] ?? '').join(',');
  const any = ROUNDS.some(r => S.answers[r.id] != null);
  const h = view === 'example' ? '#example' : view === 'sample' ? '#sample' : any ? `#a=${vals}${S.heard ? '&s=1' : ''}` : '';
  history.replaceState(null, '', h || location.pathname + location.search);
}
function readHash() {
  if (/^#example\b/.test(location.hash)) { view = 'example'; return; }
  if (/^#sample\b/.test(location.hash)) { view = 'sample'; return; }
  S.heard = /[#&]s=1\b/.test(location.hash);
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
  const [b, s] = view === 'example' ? ['Example', 'Invented answers, not yours. Your own game is kept.']
    : view === 'sample' ? ['Sample round', 'A preview, not scored. Your own game is kept.']
      : tour?.active() ? ['Walkthrough: example', 'The walkthrough shows example screens. Your game is kept.'] : labels[S.stage];
  st.querySelector('b').textContent = b;
  st.querySelector('span').textContent = s;
  const cur = S.stage === 'round' ? ROUNDS[S.i]?.id : null;
  const li = r => `<li class="${done(r.id) ? 'done' : ''}${r.id === cur ? ' cur' : ''}" title="${r.kind === 'loaded' && S.stage !== 'round' ? CHANNELS[r.channel].name : ''}"><span class="num">${r.id.slice(1)}</span></li>`;
  prog.innerHTML = `<p class="fine">Part 1</p><ol>${P1.map(li).join('')}</ol><p class="fine">Part 2</p><ol>${P2.map(li).join('')}</ol>`;
}

// ---------- render ----------
function resultLine() {
  const el = document.getElementById('result-line');
  const list = S.stage === 'round' ? (ROUNDS[S.i].part === 1 ? P1 : P2) : [];
  const t = view === 'example' ? '' // the example card carries its own result sentence
    : view === 'sample' ? 'Sample round: a preview of a round with an outside pull. Nothing you do here is scored.'
      : S.stage === 'intro' ? '' // the intro card itself says what to do
        : S.stage === 'practice' || S.stage === 'practice-fb' ? 'Practice round: the worked answer comes straight after. It is not scored.'
          : S.stage === 'round' ? `Part ${ROUNDS[S.i].part}, round ${list.indexOf(ROUNDS[S.i]) + 1} of ${list.length}. Your weights are shown after the part.`
            : '';
  el.textContent = t;
  el.hidden = !t;
}

function showExample() { tour.stop(); view = 'example'; writeHash(); render(); document.getElementById('stage').scrollIntoView({ block: 'start' }); }
function showSample() { tour.stop(); view = 'sample'; writeHash(); render(); document.getElementById('stage').scrollIntoView({ block: 'start' }); }
function backToGame() { view = null; writeHash(); render(); document.getElementById('stage').scrollIntoView({ block: 'start' }); }

function render() {
  cleanup();
  panel();
  resultLine();
  const top = () => document.getElementById('stage').scrollIntoView({ block: 'start', behavior: 'auto' });
  if (view === 'example') {
    renderResults(screen, scoreAll(EXAMPLE), {}, () => {}, { example: true, onBack: backToGame });
    return;
  }
  if (view === 'sample') {
    renderRound(screen, ROUNDS.find(r => r.id === 'r4'), { part: 1, idx: 3, total: 6, soundOn: false, checkin: S.checkin, preview: true }, () => backToGame());
    const bar = document.createElement('div');
    bar.className = 'ex-banner';
    bar.setAttribute('role', 'note');
    bar.innerHTML = '<b>Sample round, not scored.</b> <span>Only the base rate and the report are evidence. The comment thread carries none.</span> <button type="button" class="btn" id="ex-back">Back to your game</button>';
    screen.querySelector('.rcard').prepend(bar);
    bar.querySelector('#ex-back').addEventListener('click', backToGame);
    return;
  }
  if (S.stage === 'intro') {
    renderIntro(screen, S, () => { S.stage = 'practice'; render(); top(); }, showExample);
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
    }, (a, check, meta) => {
      S.answers[r.id] = a;
      if (check) S.checks[r.id] = check;
      if (r.channel === 'sound') S.heard = !!meta?.heard || !!S.r1Played;
      S.i += 1;
      if (S.i === P1.length) S.stage = 'mirror';
      else if (S.i >= ROUNDS.length) S.stage = 'results';
      writeHash(); render(); top();
    });
  } else if (S.stage === 'mirror') {
    renderMirror(screen, scoreAll(S.answers), () => { S.stage = 'round'; S.i = P1.length; render(); top(); }, { skip: skipFor(S.answers, S.heard) });
  } else if (S.stage === 'results') {
    const c = renderResults(screen, scoreAll(S.answers), S.checks, restart, { skip: skipFor(S.answers, S.heard) });
    c.addEventListener('click', () => copyLink(c));
  }
}

function restart() {
  stopDrone();
  S = fresh();
  writeHash();
  render();
}

// ---------- tour previews (example screens; the player's own state is untouched) ----------
let tourMode = null;
const tour = createTour(document.getElementById('tour-root'), {
  show: which => {
    panel();
    if (which === null) return;
    cleanup();
    const pv = { idx: 0, total: 6, soundOn: false, checkin: S.checkin, practice: false, preview: true };
    if (which === 'p1') renderRound(screen, ROUNDS.find(r => r.id === 'r4'), { ...pv, part: 1, idx: 3 }, () => {});
    if (which === 'p2') renderRound(screen, ROUNDS.find(r => r.id === 'r10'), { ...pv, part: 2, idx: 3 }, () => {});
    if (which === 'mirror') renderMirror(screen, scoreAll(EXAMPLE_P1), () => {}, { example: true });
  },
  onStart: () => { tourMode = getDetail(); },
  restore: () => { if (tourMode) setDetail(tourMode, false); tourMode = null; render(); },
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
// Restart asks once: the first press arms it, a second press within 4 s wipes the answers.
const rbtn = document.getElementById('restart');
let armed = null;
rbtn.addEventListener('click', () => {
  const any = Object.keys(S.answers).length > 0 || S.stage !== 'intro';
  if (any && !armed) {
    rbtn.textContent = 'Press again to wipe answers';
    armed = setTimeout(() => { armed = null; rbtn.textContent = 'Restart'; }, 4000);
    return;
  }
  clearTimeout(armed); armed = null; rbtn.textContent = 'Restart';
  tour.stop(); view = null; restart();
});
document.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.demo === 'example') showExample();
  else if (b.dataset.demo === 'sample') showSample();
  else backToGame();
}));
document.getElementById('see-example').addEventListener('click', showExample);
// Purpose card: on phones only the question shows until "More" is pressed.
const pmore = document.getElementById('purpose-more');
pmore.addEventListener('click', () => {
  const card = pmore.closest('.purpose');
  const open = card.classList.toggle('open');
  pmore.setAttribute('aria-expanded', String(open));
  pmore.textContent = open ? 'Less' : 'More about this tool';
});
document.getElementById('copy-link').addEventListener('click', e => copyLink(e.currentTarget));
const snd = document.getElementById('snd');
if (!audioAvailable()) { snd.disabled = true; snd.closest('label').classList.add('off'); }
snd.addEventListener('change', () => {
  S.soundOn = snd.checked;
  if (S.stage === 'round' && ROUNDS[S.i]?.channel === 'sound' && !tour.active() && !view) {
    if (S.soundOn && audioAvailable()) S.r1Played = true; // the drone starts on this re-render
    render();
  }
  else syncSound();
});

initDetail();
readHash();
render();
