// Prebunking Game: state, URL hash and screen dispatch.
// Hash keys: s = stage (intro|pre|learn|post|done), o = set order (0: A then B, 1: B then A),
// a / b = pre / post ratings as 9 digits (0 = not rated), c = training choices as 6 chars (- = none, 0-2),
// q = current quiz post, t = current technique.
import { renderIntro, renderQuiz, renderLearn, renderPanel } from './views.js';
import { renderResults } from './results.js';
import { createTour } from './tour.js';

document.title = 'Prebunking Game | Interactive Deterrence';
const $ = id => document.getElementById(id);
const STAGES = ['intro', 'pre', 'learn', 'post', 'done'];
const fresh = () => ({ s: 'intro', o: Math.random() < 0.5 ? 0 : 1, a: Array(9).fill(null), b: Array(9).fill(null), c: Array(6).fill(null), qi: 0, t: 0 });
let S = fresh();
let saved = null;

// ---- Hash ----------------------------------------------------------------------------------------
const digits = (str, n) => Array.from({ length: n }, (_, i) => { const v = Number((str || '')[i]); return v >= 1 && v <= 7 ? v : null; });
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (STAGES.includes(q.get('s'))) S.s = q.get('s');
  if (q.get('o') === '0' || q.get('o') === '1') S.o = Number(q.get('o'));
  S.a = digits(q.get('a'), 9);
  S.b = digits(q.get('b'), 9);
  const cs = q.get('c') || '';
  S.c = Array.from({ length: 6 }, (_, i) => (/[0-2]/.test(cs[i] || '') ? Number(cs[i]) : null));
  const qi = Number(q.get('q')), t = Number(q.get('t'));
  S.qi = Number.isInteger(qi) && qi >= 0 && qi < 9 ? qi : 0;
  S.t = Number.isInteger(t) && t >= 0 && t < 6 ? t : 0;
}
function writeHash() {
  if (tour.active()) return;
  const enc = r => r.map(v => v || 0).join('');
  const q = new URLSearchParams({ s: S.s, o: S.o, a: enc(S.a), b: enc(S.b), c: S.c.map(v => (v == null ? '-' : v)).join('') });
  if (S.s === 'pre' || S.s === 'post') q.set('q', S.qi);
  if (S.s === 'learn') q.set('t', S.t);
  history.replaceState(null, '', '#' + q.toString());
}

// ---- Actions -------------------------------------------------------------------------------------
const act = {
  phase(p) {
    S.s = p;
    if (p === 'pre' || p === 'post') { const R = p === 'pre' ? S.a : S.b; const k = R.findIndex(v => !v); S.qi = k < 0 ? 0 : k; }
    if (p === 'learn') { const k = S.c.findIndex(v => v == null); S.t = k < 0 ? 0 : k; }
    update(true);
  },
  rate(v) {
    const R = S.s === 'pre' ? S.a : S.b;
    R[S.qi] = v;
    if (S.qi < 8) S.qi += 1;
    update(false, true);
  },
  goItem(k) { S.qi = Math.max(0, Math.min(8, k)); update(false, true); },
  choose(k) { if (S.c[S.t] == null) { S.c[S.t] = k; update(false); focusFeedback(); } },
  goTech(k) { S.t = k; update(true); },
  restart() { S = fresh(); update(true); },
};

function focusFeedback() {
  const fb = document.querySelector('.fb');
  if (fb) fb.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

// ---- Render --------------------------------------------------------------------------------------
function update(scrollTop = false, focusScale = false) {
  const host = $('screen');
  if (S.s === 'intro') renderIntro(host, act);
  else if (S.s === 'pre' || S.s === 'post') renderQuiz(host, S, act);
  else if (S.s === 'learn') renderLearn(host, S, act);
  else renderResults(host, S, act);
  renderPanel(S);
  writeHash();
  if (focusScale) host.querySelector('.scale-b button[aria-pressed="true"], .scale-b button')?.focus({ preventScroll: true });
  if (scrollTop && !tour.active()) {
    const top = $('stage').getBoundingClientRect().top;
    if (top < 0) $('stage').scrollIntoView({ block: 'start' });
  }
}

// ---- Boot ----------------------------------------------------------------------------------------
const tour = createTour($('stage'), {
  save: () => { saved = JSON.parse(JSON.stringify(S)); },
  restore: () => { if (saved) S = saved; saved = null; update(); },
  apply: set => {
    S = { ...fresh(), o: 0, ...JSON.parse(JSON.stringify(set)) };
    update();
    if (set.focus === 'research') $('research')?.scrollIntoView({ block: 'nearest' });
  },
});
$('tour-btn').onclick = () => tour.start();
$('restart').onclick = () => { tour.stop(); act.restart(); };
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Copied'; }
  catch { $('copy').textContent = 'Copy failed'; }
  setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1500);
};
document.querySelectorAll('#stages button').forEach(b => {
  b.onclick = () => { tour.stop(); act.phase(b.dataset.k); };
});
addEventListener('hashchange', () => { if (!tour.active()) { readHash(); update(); } });
readHash();
update();
