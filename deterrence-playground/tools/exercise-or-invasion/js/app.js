// Exercise or Invasion?: start screen, the weekly turn for either side, and the debrief.
import { P, LABEL } from '../data/params.js';
import { newGame, redStep, collectStep, decideStep, encode, decode, emptyRed, emptyCollect } from './engine.js';
import { inWindow } from './model.js';
import { redAI, blueCollectAI, blueDecideAI } from './ai.js';
import { score, outcome, benchmark, percentile } from './score.js';
import { paintRed, paintCollect, paintDecide, paintStatus, readingsHistory } from './panels.js';
import { paintCalendar, paintTimeline, legendHTML, pct } from './view.js';
import { pulse, flash, countUp } from '../../../shared/js/motion.js';

const $ = id => document.getElementById(id);
const newSeed = () => 1 + Math.floor(Math.random() * 999998);
const show = (...ids) => ['start', 'play', 'end'].forEach(id => { $(id).hidden = !ids.includes(id); });
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);

let g = null;          // { s, side, phase: 'red'|'collect'|'decide', draft, feed: [], showModel }
let pick = null, intent = 'attack';

/* ---------- Start ---------- */
$('sides').addEventListener('click', e => {
  const b = e.target.closest('[data-side]'); if (!b) return;
  pick = b.dataset.side;
  $('sides').querySelectorAll('[data-side]').forEach(x => x.setAttribute('aria-checked', x === b));
  $('setup-red').hidden = pick !== 'red';
  $('begin').disabled = false;
  $('side-x').textContent = pick === 'red' ? 'The computer plays Blue: a Bayesian analyst with your exercise calendar on its desk.' : 'The computer plays Red. It has already decided, in secret, whether this is only an exercise.';
});
$('intents').addEventListener('click', e => {
  const b = e.target.closest('[data-intent]'); if (!b) return;
  intent = b.dataset.intent;
  $('intents').querySelectorAll('[data-intent]').forEach(x => x.setAttribute('aria-checked', x === b));
});
for (const id of ['sides', 'intents']) $(id).addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  const bs = [...$(id).querySelectorAll('[role="radio"]')], i = bs.indexOf(document.activeElement);
  if (i < 0) return;
  e.preventDefault();
  const n = bs[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? bs.length - 1 : 1)) % bs.length];
  n.focus(); n.click();
});
$('begin').addEventListener('click', () => {
  begin({ seed: newSeed(), side: pick, intent: pick === 'red' ? intent : null });
  show('play'); startWeek(); paint(); $('dec-t').focus();
});

function begin(start) {
  g = { s: newGame(start), side: start.side, phase: null, draft: null, feed: [], showModel: false };
  document.body.style.setProperty('--c', g.side === 'red' ? 'var(--red)' : 'var(--blue)');
}

/* ---------- Week flow ---------- */
/** Begin a week: a Blue player faces a Red move made in secret (which may be an attack). */
function startWeek() {
  const s = g.s;
  if (g.side === 'red') {
    g.phase = 'red';
    const last = s.history[s.history.length - 1]?.red;
    g.draft = { a: last ? { ...last.a } : { ...emptyRed().a, tempo: inWindow(s) ? 4 : 1, deception: inWindow(s) ? 1 : 0 }, cover: 'open', armed: false };
    return;
  }
  g.s = redStep(s, redAI(s));
  if (g.s.over) return;
  g.phase = 'collect';
  const last = s.history[s.history.length - 1];
  g.draft = { collect: last?.collect ? { ...last.collect } : { ...emptyCollect(), imagery: 2, signals: 2, human: 1, osint: 1 }, act: 'hold', belief: last?.belief ?? 50 };
  if (g.s.cur.snap) note(`Week ${s.week + 1}: Red has announced a snap exercise.`);
}
const note = t => g.feed.unshift(t);

function endRedWeek() {
  const before = g.s;
  const mv = { ...g.draft, attack: !!g.draft.armed };
  let s = redStep(before, mv);
  if (s.over) { g.s = s; return finish(); }
  s = collectStep(s, blueCollectAI(s));
  const d = blueDecideAI(s);
  s = decideStep(s, d);
  g.s = s;
  const h = s.history[s.history.length - 1];
  note(`Week ${h.week + 1}: ` + (h.act === 'warn' ? `<b>Blue warned and is mobilizing</b> (${Math.round(s.M)}).` : h.act === 'stand' ? '<b>Blue stood its warning down.</b> Its credibility fell, and you learned which sources it relied on.' : s.mobilized ? `Blue stayed mobilized (${Math.round(s.M)}).` : 'Blue held. No warning.') + ` Readiness ${Math.round(h.R)}.`);
  afterWeek();
}
function endBlueWeek() {
  const s = decideStep(g.s, { act: g.draft.act, belief: g.draft.belief });
  g.s = s;
  const h = s.history[s.history.length - 1];
  note(`Week ${h.week + 1}: ` + (h.act === 'warn' ? '<b>You warned.</b> Mobilization is under way.' : h.act === 'stand' ? '<b>You stood down.</b> Credibility fell and Red has seen which sources you used.' : 'You held.') + ` Your belief: ${h.belief}%.`);
  afterWeek();
}
function afterWeek() {
  history.replaceState(null, '', '#g=' + encode(g.s));
  if (g.s.over) return finish();
  startWeek();
  if (g.s.over) return finish();
  paint();
  flash($('status'));
  $('dec-t').focus();
}

/* ---------- Paint ---------- */
function paint() {
  const s = g.s;
  $('week').textContent = `Week ${Math.min(s.week, P.weeks - 1) + 1}`;
  $('weekof').textContent = `of ${P.weeks}`;
  paintCalendar($('cal'), s);
  $('pub').innerHTML = `<span><i class="eo-sw red"></i>${g.side === 'red' ? 'You are Red' : 'Red: computer'}</span><span><i class="eo-sw blue"></i>${g.side === 'blue' ? 'You are Blue' : 'Blue: computer'}</span><span>${s.mobilized ? `<b>Blue mobilized ${Math.round(s.M)}</b>` : 'Blue not warned'}</span>`;
  if (g.phase === 'red') paintRed($('decide'), s, g.draft);
  else if (g.phase === 'collect') paintCollect($('decide'), s, g.draft);
  else paintDecide($('decide'), s, g.draft);
  paintStatus($('status'), s, g.side, g.showModel);
  $('feed').innerHTML = `<h3>Log</h3>${g.feed.length ? `<ul>${g.feed.slice(0, 6).map(t => `<li>${t}</li>`).join('')}</ul>` : '<p class="fine">Nothing yet.</p>'}${g.side === 'blue' ? readingsHistory(s) : ''}`;
}

$('decide').addEventListener('click', e => {
  if (!g) return;
  const t = e.target.closest('button'); if (!t || t.disabled) return;
  const d = g.draft, pool = g.phase === 'red' ? d.a : d.collect;
  if (t.dataset.step) {
    const k = t.dataset.step, cap = g.phase === 'red' ? P.maxPerActivity : P.maxPerSource, tot = g.phase === 'red' ? P.redPoints : P.bluePoints;
    const v = pool[k] + +t.dataset.d;
    if (v >= 0 && v <= cap && sum(pool) - pool[k] + v <= tot) pool[k] = v;
    return repaint(`[data-step="${k}"][data-d="${t.dataset.d}"]`);
  }
  if (t.dataset.cover) { d.cover = t.dataset.cover; return repaint(`[data-cover="${d.cover}"]`); }
  if (t.dataset.act) { d.act = t.dataset.act; return repaint(`[data-act="${d.act}"]`); }
  if (t.id === 'attack') { if (d.armed) return endRedWeek(); d.armed = true; return repaint('#attack'); }
  if (t.id === 'disarm') { d.armed = false; return repaint('#end-week'); }
  if (t.id === 'collect') {
    g.s = collectStep(g.s, d.collect); g.phase = 'decide'; paint(); pulse($('decide')); return $('dec-t').focus();
  }
  if (t.id === 'end-week') { if (g.phase === 'red') { d.armed = false; return endRedWeek(); } return endBlueWeek(); }
});
$('decide').addEventListener('input', e => {
  if (e.target.id !== 'belief') return;
  g.draft.belief = +e.target.value; $('belief-o').textContent = `${g.draft.belief}%`;
});
$('decide').addEventListener('keydown', e => {
  const grp = e.target.closest('[role="radiogroup"]');
  if (!grp || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  const bs = [...grp.querySelectorAll('[role="radio"]:not(:disabled)')], i = bs.indexOf(e.target);
  if (i < 0) return;
  e.preventDefault();
  bs[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? bs.length - 1 : 1)) % bs.length].click();
});
$('status').addEventListener('change', e => { if (e.target.id === 'show-model') { g.showModel = e.target.checked; paintStatus($('status'), g.s, g.side, g.showModel); $('show-model').focus(); } });
/** Repaint and keep keyboard focus on the equivalent control. */
function repaint(sel) {
  paint();
  const n = $('decide').querySelector(sel);
  if (n && !n.disabled) n.focus(); else $('dec-t').focus();
}

/* ---------- End ---------- */
const STRAT = { cycle: 'hide preparation inside the scheduled exercises', quiet: 'go slow and quiet, with heavy deception and radio discipline', rush: 'move fast and accept the risk of being seen' };
function finish() {
  const s = g.s, me = g.side, o = outcome(s), sc = score(s, me), won = o.winner === me;
  history.replaceState(null, '', '#g=' + encode(s));
  show('end');
  $('end').style.setProperty('--c', me === 'red' ? 'var(--red)' : 'var(--blue)');
  $('end-k').textContent = `${won ? 'You won' : 'You lost'} · playing ${me === 'red' ? 'Red' : 'Blue'} · ${s.history.length} week${s.history.length === 1 ? '' : 's'}`;
  $('end-t').textContent = o.title;
  $('end-x').textContent = o.text + (s.over.reason === 'attack' ? ` The odds were ${pct(s.over.p)}.` : '');
  $('total').textContent = sc.total;
  countUp($('total'), sc.total, { from: 0 });
  $('parts').innerHTML = sc.parts.map(p => `<tr><td>${p.label}</td><td class="num">${Math.round(p.value)}</td><td class="muted">of ${p.max}</td></tr>`).join('');
  const blue = s.history.filter(h => h.p != null);
  const warned = s.history.find(h => h.act === 'warn');
  $('reveal').innerHTML = (me === 'blue'
    ? `Red ${s.intent === 'attack' ? `<b>intended to attack</b>, planning to ${STRAT[s.strategy]}` : `<b>only meant to exercise</b>${s.feint ? ', and ran feints to draw a false warning' : ''}`}. `
    : `Blue’s analyst model ${warned ? `warned in week ${warned.week + 1}, when it put the odds of an attack at ${pct(warned.p)}` : 'never warned'}. `)
    + `Red’s readiness peaked at ${Math.round(Math.max(0, ...s.history.map(h => h.R)))}. By the end Blue’s model gave ${pct(blue.length ? blue[blue.length - 1].p : P.model.prior)} for an attack, and Red estimated Blue’s suspicion at ${pct(blue.length ? blue[blue.length - 1].redEst : P.model.prior)}.`;
  const rows = s.history.map(h => ({ week: h.week, R: h.R, M: h.M, p: h.p * 100, red: h.redEst * 100, you: h.belief }));
  paintTimeline($('timeline'), s, rows);
  $('legend').innerHTML = legendHTML(me === 'blue' ? ['R', 'M', 'p', 'red', 'you'] : ['R', 'M', 'p', 'red']);
  $('log').innerHTML = `<thead><tr><th scope="col">Wk</th><th scope="col">Red did</th><th scope="col">Blue collected</th><th scope="col">Blue did</th><th scope="col">Ready</th><th scope="col">Mob.</th></tr></thead><tbody>`
    + s.history.map(h => `<tr><th scope="row">${h.week + 1}</th><td>${h.attack ? '<b>Attacked</b>' : redText(h.red)}</td><td>${h.collect ? P.sources.filter(k => h.collect[k]).map(k => `${LABEL[k].split(' ')[0]} ${h.collect[k]}`).join(', ') : '—'}</td><td>${h.attack ? '—' : { hold: 'Held', warn: '<b>Warned</b>', stand: 'Stood down' }[h.act]}</td><td class="num">${Math.round(h.R)}</td><td class="num">${Math.round(h.M)}</td></tr>`).join('') + '</tbody>';
  $('end').focus();
  runBench(sc.total);
}
const redText = m => P.activities.filter(a => m.a[a]).map(a => `${LABEL[a].split(' ').slice(-1)[0].replace('announcements', 'deception').replace('discipline', 'comms')} ${m.a[a]}`).join(', ') + (m.cover !== 'open' ? ` (${m.cover === 'cycle' ? 'in exercise' : 'snap'})` : '');
function runBench(total) {
  $('pct').textContent = '…'; $('pct-x').textContent = 'comparing with the computer in your seat…';
  setTimeout(() => {
    const runs = benchmark({ seed: g.s.seed, side: g.side, intent: g.s.intent }, P.benchRuns);
    $('pct').textContent = `${percentile(total, runs)}%`;
    $('pct-x').textContent = `of ${runs.length} games with the computer in your seat (same side, same Red intent) scored below you`;
    pulse($('pct'));
  }, 30);
}

$('again').addEventListener('click', restart);
$('new-game').addEventListener('click', restart);
function restart() {
  g = null; history.replaceState(null, '', location.pathname + location.search);
  show('start'); $('start').scrollIntoView({ block: 'start' });
}
$('copy-link').addEventListener('click', async e => {
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; } catch { e.target.textContent = 'Copy the address bar'; }
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1600);
});

/* ---------- Load: replay a shared link, or start fresh ---------- */
function load() {
  const m = location.hash.match(/#g=([^&]+)/);
  const d = m && decode(decodeURIComponent(m[1]));
  if (!d) { show('start'); return; }
  begin(d);
  for (const mv of d.moves) {
    if (g.s.over) break;
    if (d.side === 'red') {
      g.s = redStep(g.s, mv);
      if (g.s.over) break;
      g.s = collectStep(g.s, blueCollectAI(g.s));
      g.s = decideStep(g.s, blueDecideAI(g.s));
    } else {
      g.s = redStep(g.s, redAI(g.s));
      if (g.s.over) break;
      g.s = decideStep(collectStep(g.s, mv.collect), mv);
    }
  }
  if (g.s.over) return finish();
  startWeek();
  if (g.s.over) return finish();
  show('play'); paint();
}
load();
