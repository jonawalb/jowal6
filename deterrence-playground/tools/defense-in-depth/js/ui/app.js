// Defense in Depth: the page. Start screen → (campaign setup / briefing) → planning → hourly play → review →
// (learning phase → next battle) …, with share links (js/hash.js) that rebuild any of these exactly.
import { SCALES } from '../../data/scales.js';
import { ERAS } from '../../data/eras.js';
import { readHash, writeHash } from '../hash.js';
import { issue } from '../engine.js';
import { barrageRows } from '../arty.js';
import { newCampaign, recordBattle, playerAction, endLearning, encodeCampaign, decodeCampaign } from '../campaign.js';
import { S, $, esc, say, hhmm, other } from './store.js';
import { wireTips } from './tips.js';
import { renderStart, wireStart, setChoices, resetStart, openStep2, choices as startChoices } from './start.js';
import { newPractice } from '../practice.js';
import { newTutorial } from '../tutorial.js';
import { tutorialResult, HOWTO } from './tutorial-ui.js';
import { learnButton, showSheet } from '../../../../shared/js/learn.js';
import { practiceBegin, practiceEnd, practiceCheck, practiceAsk, wirePractice } from './practice-ui.js';
import { makeGame, rebuild, beginBattle, linkState, setupFor, campaignChoices } from './game.js';
import { startPlan, checklist, wirePlan } from './plan-ui.js';
import { planReady } from '../plan-def.js';
import { initPlay, newBoard, drawMap, drawPanels, setTab, showTips, endHour, undo, zoom, pan, hot, select } from './play.js';
import { tipsHidden } from './ctip.js';
import { wireView } from './viewmode.js';
import { closeUnitPop } from './unit-pop.js';
import { wireBarragePop } from './orders-bar.js';
import { showAAR, hideAAR } from './aar.js';
import { cancelReplays } from './compare.js';
import { setupScreen, briefing, learningScreen, reviewScreen, resultText, hideCamp } from './learn-ui.js';
import { createTour } from './tour.js';
import { wireKeys, keyHelpHTML } from './keys.js';
import { renderBelow, mountLessons, fillText } from './below.js';

let saveT = 0;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { if (S.choices) writeHash(linkState(S)); }, 120); };

function redraw() {
  const g = S.g;
  if (!g) return;
  drawMap();
  drawPanels();
  status();
  tour.check();
  practiceCheck();
}
S.ui = { redraw, say: html => { $('say').innerHTML = html; }, saved: save, finish, select: (ids, fmn = null) => select(ids, fmn), tab: t => setTab(t) };

function status() {
  const g = S.g, Sc = SCALES[g.scale];
  const st = $('status');
  const who = S.me === 'def' ? 'Defending' : 'Attacking';
  $('st-t').textContent = g.over ? (g.over.winner === S.me ? 'You won' : 'You lost') : g.phase === 'plan' ? 'Planning' : `${who}, ${hhmm(g.t)}`;
  $('st-s').textContent = `${Sc.label} · ${ERAS[g.era].label} · ${['Easy', 'Standard', 'Hard'][['e', 's', 'h'].indexOf(g.diff)] || 'Standard'}${S.campaign ? ` · campaign battle ${S.campaign.battle + 1}` : ''} · objective: ${Sc.obj.name}`;
  st.dataset.s = g.over ? (g.over.winner === S.me ? 'good' : 'bad') : 'warn';
}

/** Show the play area in a phase: 'plan' | 'battle' | 'over'. */
function layout(phase) {
  $('start').hidden = true;
  $('bar').hidden = false; $('board').hidden = false;
  $('plan').hidden = phase !== 'plan';
  // #12: the status card lives in the bar now; the reports feed shows in battle (and folds into the review after).
  $('statsec').hidden = true; $('feedsec').hidden = phase !== 'battle';
  document.body.classList.remove('dd-home');
  $('viewbar').hidden = phase !== 'over';
  document.body.classList.toggle('dd-live', phase !== 'over');
  document.body.classList.toggle('dd-planning', phase === 'plan');
  document.body.dataset.side = S.me;
  document.body.classList.toggle('dd-practice', !!S.practice);
  setTab('map');
}

/** Begin a single battle or a campaign battle in its planning phase (or rebuilt from a link). */
function launch(ch, link = null) {
  if (tour.track === 'learn') tour.stop();
  cancelReplays(); hideAAR(); practiceEnd();
  S.choices = ch; S.me = ch.side; S.view = 'belief'; S.aarHour = null;
  S.setup = S.campaign ? setupFor(S.campaign) : null;
  if (S.campaign) S.preToken = encodeCampaign(S.campaign);
  S.g = link && link.plan ? rebuild(ch, S.setup, link.plan, link.log, link.n) : makeGame(ch, S.setup);
  fillText(ch.scale);
  layout(S.g.over ? 'over' : S.g.phase === 'plan' ? 'plan' : 'battle');
  newBoard();
  if (S.g.phase === 'plan') { startPlan(); say(`Plan your ${S.me === 'def' ? 'defense' : 'attack'}. Select units and tap the map, or press Start the battle when the checklist is green.`); }
  else if (S.g.over) { finish(false); return; }
  else { say(S.g.t ? `Game resumed at ${hhmm(S.g.t)}.` : 'The battle has begun.'); }
  showTips(!S.g.over);
  redraw();
  save();
  $('play').scrollIntoView({ block: 'start', behavior: 'auto' });
}

function startBattle() {
  const g = S.g;
  if (!planReady(checklist())) { say('The checklist has a required item that is not done (marked ✗).'); return; }
  beginBattle(g, JSON.parse(JSON.stringify(S.plan)));
  S.tool = null; S.sel = []; S.selFmn = null; S.filter = 'idle'; closeUnitPop(false);
  layout('battle');
  const warn = g.events.find(e => e.kind === 'warning' && S.me === 'def');
  say(`<b>H-hour, ${hhmm(0)}.</b> ${S.me === 'def' ? 'The attack has begun. Watch your outposts; strike lodgments while their windows are open.' : 'Your barrage is falling. Watch the strip, keep pairs leapfrogging, and keep the guns in range.'}${warn ? ` ${warn.level === 'full' ? 'His long bombardment shows you where he will come.' : 'Registration fire was observed.'}` : ''}`);
  $('tldr').textContent = '';
  redraw(); save();
  $('end').focus({ preventScroll: true });
}

function finish(scroll) {
  const g = S.g;
  if (g.tutorial) { finishTutorial(scroll); return; }
  document.body.classList.remove('dd-live', 'dd-armed');
  $('viewbar').hidden = false; $('feedsec').hidden = true; closeUnitPop(false);
  S.aarHour = g.snaps.length - 1; S.sel = []; S.tool = null;
  let cont = null, onCont = null;
  if (S.campaign && !S.recorded) {
    S.recorded = true;
    S.prof = [...(S.prof || []), profilesNow()];
    S.campaign = recordBattle(S.campaign, { tel: g.telemetry, sides: { me: S.me, ai: other(S.me) } });
    S.campaignToken = JSON.stringify({ t: encodeCampaign(S.campaign), p: S.prof });
  }
  if (S.campaign) { cont = S.campaign.phase === 'done' ? 'Campaign review' : 'Continue: learning phase'; onCont = campaignNext; }
  say(`${g.over.winner === S.me ? 'You won.' : 'You lost.'} The review is below the map.`);
  showTips(false);
  redraw();
  showAAR(g, S.me, { onHour: h => { S.aarHour = h; drawMap(); }, onAgain: again, onNew: showStart, cont, onCont,
    msg: { ch: S.choices, plan: g.plans[S.me], log: g.log, token: S.campaign ? S.preToken : null } });
  if (scroll) $('aar').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  save();
}
const profilesNow = () => { const s = S.setup, m = k => (['elastic', 'modernAssault', 'elasticDepth', 'modernSystem'].includes(k) ? 'M' : 'N');
  return S.me === 'def' ? { d: m(s.profile.me), a: m(s.profile.ai) } : { a: m(s.profile.me), d: m(s.profile.ai) }; };

function again() {
  if (S.campaign) { S.campaign = decodeCampaign(S.preToken); S.recorded = false; S.prof = (S.prof || []).slice(0, S.campaign.battle); }
  launch({ ...S.choices });
}

// ---- Campaign flow ----
function campaignStart(ch) {
  hideAAR(); $('start').hidden = true; $('bar').hidden = true; $('board').hidden = true;
  setupScreen(ch, pick => {
    S.campaign = newCampaign({ seed: ch.seed, role: ch.side, scale: ch.scale, era: ch.era, diff: ch.diff, od: ch.od, arch: pick.arch, custom: pick.custom });
    S.prof = []; S.choices = { ...ch, mode: 'c' };
    S.campaignToken = JSON.stringify({ t: encodeCampaign(S.campaign), p: S.prof });
    campaignBrief();
  }, showStart);
}
function campStatus(text) {
  const C = S.campaign;
  $('st-t').textContent = 'Campaign'; $('status').dataset.s = 'warn';
  $('st-s').textContent = `${text} · won ${C.results.filter(r => r.won).length} of ${C.results.length} so far`;
  $('feedsec').hidden = true; $('statsec').hidden = false;
}
function campaignBrief() {
  const C = S.campaign, ch = campaignChoices(C);
  S.choices = ch; S.me = ch.side; S.recorded = false; S.g = null;
  $('bar').hidden = true; $('board').hidden = true; hideAAR();
  briefing(C, ch, () => { hideCamp(); launch(ch); });
  campStatus(`Battle ${C.battle + 1} of 4`);
  writeHash({ ...linkState(S), plan: null, log: [], n: 0 });
  $('camp').scrollIntoView({ block: 'start' });
}
function campaignNext() {
  const C = S.campaign;
  hideAAR(); $('bar').hidden = true; $('board').hidden = true; S.g = null;
  if (C.phase === 'done') { reviewScreen(C, campaignChoices(C), S.prof || [], showStart); campStatus('Finished'); $('camp').scrollIntoView({ block: 'start' }); return; }
  learn('');
  campStatus(C.phase === 'done' ? 'Finished' : `Learning phase ${C.battle + 1}`);
}
function learn(note) {
  const C = S.campaign;
  learningScreen(C, campaignChoices(C), act => {
    const r = playerAction(S.campaign, act);
    S.campaign = r.campaign;
    S.campaignToken = JSON.stringify({ t: encodeCampaign(S.campaign), p: S.prof });
    writeHash({ ...linkState(S), plan: null, log: [], n: 0 });
    learn(resultText(act, r.result, campaignChoices(C).era));
  }, () => { S.campaign = endLearning(S.campaign); S.campaignToken = JSON.stringify({ t: encodeCampaign(S.campaign), p: S.prof }); campaignBrief(); }, note);
  $('camp').scrollIntoView({ block: 'start' });
}

function showStart() {
  if (tour.track === 'learn') tour.stop();
  cancelReplays(); hideAAR(); hideCamp(); practiceEnd();
  S.g = null; S.campaign = null; S.choices = null; S.sel = []; S.tool = null;
  closeUnitPop(false); resetStart();
  $('start').hidden = false; $('bar').hidden = true; $('board').hidden = true; $('plan').hidden = true;
  $('statsec').hidden = false; $('feedsec').hidden = true;
  document.body.classList.add('dd-home');
  $('st-t').textContent = 'Defense in Depth'; $('st-s').textContent = 'Choose a side to start.'; $('status').dataset.s = 'warn';
  $('feed').innerHTML = '<li class="muted">Reports appear here once the battle starts.</li>'; $('tldr').textContent = '';
  document.body.classList.remove('dd-live', 'dd-over', 'dd-planning', 'dd-armed');
  history.replaceState(null, '', location.pathname + location.search);
  renderStart();
  $('start-next').focus({ preventScroll: true });
}

function go(ch) {
  S.campaign = null; S.prof = [];
  if (ch.mode === 'c') campaignStart(ch); else launch(ch);
}

// ---- The Practice field: a 3 x 4 board, no enemy, a guided drill (js/practice.js, js/ui/practice-ui.js) ----
function practice(ch, step = 0) {
  cancelReplays(); hideAAR(); hideCamp(); tour.stop();
  S.campaign = null; S.choices = null; S.me = ch.side === 'att' ? 'att' : 'def'; S.view = 'belief'; S.aarHour = null;
  S.g = newPractice({ side: S.me, era: ch.era, seed: 1 + Math.floor(Math.random() * 999998) });
  practiceBegin(S.g, { ...ch, side: S.me }, step);
  $('statsec').hidden = true;
  layout('battle');
  newBoard();
  S.filter = 'all'; S.layers = new Set(['lanes', 'barrage']);   // every unit in the list; no zones on this board
  zoom('fit');
  say(step ? 'The field is reset.' : 'The Practice field: your units, no enemy. Follow the card above the map.');
  redraw();
  $('play').scrollIntoView({ block: 'start', behavior: 'auto' });
}
function openPractice() {
  const ch = S.practice ? S.practice.ch : S.choices || startChoices();
  if (S.g && !S.practice && S.g.phase === 'battle' && !S.g.over) practiceAsk(() => practice(ch));
  else practice(ch);
}

// ---- Learn to play: the small tutorial battle (js/tutorial.js), taught by the tour's 'learn' track ----
const LEARN_SLUG = 'defense-in-depth';
function tutorial() {
  cancelReplays(); hideAAR(); hideCamp(); practiceEnd();
  S.campaign = null; S.choices = null; S.me = 'def'; S.view = 'belief'; S.aarHour = null;
  history.replaceState(null, '', location.pathname + location.search);
  S.g = newTutorial();
  layout('battle');
  newBoard();
  S.filter = 'all';
  zoom('fit');
  showTips(false);
  say('<b>Learn to play.</b> A small battle: you defend. Follow the card.');
  $('tldr').textContent = '';
  redraw();
  $('play').scrollIntoView({ block: 'start', behavior: 'auto' });
}
function finishTutorial(scroll) {
  const g = S.g;
  document.body.classList.remove('dd-live', 'dd-armed');
  $('feedsec').hidden = true; closeUnitPop(false);
  S.sel = []; S.tool = null;
  say(`${g.over.winner === S.me ? 'You won.' : 'You lost.'} The result is below the map.`);
  redraw();
  tutorialResult(g, {
    onReal: side => { tour.stop(); showStart(); setChoices({ ...startChoices(), side }); openStep2({ ...startChoices(), side }); $('start').scrollIntoView({ block: 'start' }); },
    onAgain: () => tour.start('learn', false),
    onSheet: () => showSheet(HOWTO, { onStart: () => tour.start('learn', false) }),
  });
  if (scroll) $('aar').scrollIntoView({ block: 'nearest', behavior: 'auto' });
}
const learnedNow = () => { try { localStorage.setItem(`learned:${LEARN_SLUG}`, '1'); } catch { /* storage blocked: the banner just keeps its first words */ } };
const inBattle = () => !!S.g && S.g.phase === 'battle' && !S.g.over && !S.g.tutorial && !S.practice;

// ---- Boot ----
const tour = createTour($('tour'), {
  start: track => {
    if (track === 'learn') { tutorial(); return; }
    S.campaign = null; launch({ side: track, seed: 1 + Math.floor(Math.random() * 999998), scale: 'd', era: 'w', mode: 's', diff: 's', od: 5 });
  },
  tab: t => { const g = S.g; const map = { plan: g && g.phase === 'plan' ? 'plan' : 'units', reports: 'reports', units: 'units', map: 'map' }; setTab(map[t] || 'map'); },
  done: track => { if (track === 'learn') { learnedNow(); banner.refresh(); } },
});
const startLearn = () => tour.start('learn', inBattle());
// The shared "New here? Learn to play" banner (shared/js/learn.js), first thing on the start screen, above the
// side, scale and balance choices; its "Rules on one screen" opens HOWTO. The lesson itself is ours (tour track).
const banner = learnButton($('start'), { slug: LEARN_SLUG, minutes: 5, onStart: startLearn, sheet: HOWTO,
  blurb: 'A short guided battle: you defend a few boxes for five hours. Every term is explained as it comes up.' });

wireTips();
initPlay({ redraw });
wireStart(go, side => tour.start(side, false), ch => practice(ch));
wirePractice({ real: ch => { showStart(); openStep2(ch); $('start').scrollIntoView({ block: 'start' }); }, leave: showStart, reset: (ch, step) => practice(ch, step) });
wirePlan(startBattle);
wireKeys({
  endHour, undo, zoom, pan,
  clear: () => { S.sel = []; S.selFmn = null; S.tool = null; $('sheet').hidden = true; closeUnitPop(false); redraw(); },
  cycleUnit: hot.cycleUnit, cycleFmn: hot.cycleFmn, cycleFilter: hot.cycleFilter,
  posture: () => hot.set('posture', ['rush', 'infil', 'hold', 'consolidate']),
  form: () => hot.set('form', ['waves', 'groups']),
  stance: () => hot.set('stance', ['hold', 'elastic', 'delay', 'riposte', 'reserve']),
  leapfrog: () => hot.tool('leapfrog', () => S.sel.length === 2), riposte: () => hot.tool('riposte', u => u && u.side === 'def'),
  lane: () => hot.tool('lane', u => u && u.type === 'mg'), battery: hot.battery,
  tips: () => showTips(tipsHidden()),
  help: on => { const k = $('keyhelp'); k.innerHTML = keyHelpHTML(); k.hidden = !on; if (on) { k.querySelector('.x').onclick = () => { k.hidden = true; }; k.querySelector('.x').focus(); } },
});
$('end').onclick = endHour;
$('undo').onclick = undo;
$('again').onclick = () => (S.g && S.g.tutorial ? tour.start('learn', false) : S.campaign ? $('aar-cont')?.click() : again());
$('new-game').onclick = showStart;
$('practice-btn').onclick = openPractice;
$('start-tour').onclick = () => tour.start(S.g && !S.g.tutorial ? S.me : 'def', inBattle());
$('learn-btn').onclick = startLearn;
$('howto-btn').onclick = () => showSheet(HOWTO, { onStart: startLearn });
// #1: How to play, the sources, how the model works and the lessons sit behind one Reference disclosure.
const openRef = target => { const d = $('reference'); d.open = true; requestAnimationFrame(() => (target ? $(target) : d).scrollIntoView({ block: 'start' })); };
$('go-lessons').onclick = () => openRef('lessons');
$('key-help').onclick = () => { const k = $('keyhelp'); k.innerHTML = keyHelpHTML(); k.hidden = false; k.querySelector('.x').onclick = () => { k.hidden = true; $('key-help').focus(); }; k.querySelector('.x').focus(); };
$('copy-link').onclick = async () => { if (S.practice) { say('The Practice field has no share link.'); return; } if (S.g && S.g.tutorial) { say('The lesson battle has no share link.'); return; } if (S.choices) writeHash(linkState(S)); await new Promise(r => setTimeout(r, 200)); try { await navigator.clipboard.writeText(location.href); say('Link copied. It replays this game exactly.'); } catch { say('Copy the address bar to share this game.'); } };
document.querySelectorAll('#viewbar [data-view]').forEach(b => b.addEventListener('click', () => {
  S.view = b.dataset.view;
  document.querySelectorAll('#viewbar [data-view]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.view === S.view)));
  drawMap();
}));
$('barrage-ctl').addEventListener('click', e => {
  const g = S.g, r = e.target.closest('[data-rate]'), st = e.target.closest('[data-bstop]');
  if (!g || (!r && !st)) return;
  const now = barrageRows(g), stop = now.length ? Math.max(...now) : g.barrage ? g.barrage.r0 : 0;
  const res = issue(g, r ? { kind: 'barrage', rate: +r.dataset.rate } : { kind: 'barrage', stop });
  say(res.ok ? `Barrage change sent by ${g.era === 'w' ? 'runner' : 'radio'}: it takes effect ${res.d ? `at ${hhmm(g.t + res.d)}` : 'at once'}${g.era === 'w' ? ', unless the runner is lost on the way' : ''}.` : `No change: ${esc(res.reason)}.`);
  save(); redraw();
});
addEventListener('skinchange', () => redraw());
wireBarragePop();
wireView(() => { if (S.g) redraw(); });
renderBelow();
mountLessons();
renderStart();

async function boot() {
  const h = await readHash();
  if (!location.hash || location.hash.length < 3) { showStart(); return; }
  if (!h.ok) {
    showStart();
    if (h.fresh) {
      const o = $('oldlink');
      o.hidden = false;
      o.innerHTML = `${esc(h.message)} <button type="button" class="btn solid" id="oldgo">Start it fresh</button>`;
      $('oldgo').onclick = () => { o.hidden = true; setChoices(h.fresh); go({ ...h.fresh, mode: 's' }); };
    }
    return;
  }
  const ch = { side: h.side, seed: h.seed || 1, scale: h.scale, era: h.era, mode: h.mode, diff: h.diff, od: h.od };
  setChoices(ch);
  if (h.mode === 'c' && h.campaign) {
    let tok;
    try { tok = typeof h.campaign === 'string' ? JSON.parse(h.campaign) : h.campaign; } catch { tok = null; }
    const C = tok && decodeCampaign(tok.t);
    if (!C) { showStart(); return; }
    S.campaign = C; S.prof = tok.p || []; S.campaignToken = JSON.stringify(tok);
    if (C.phase === 'done') { S.choices = campaignChoices(C); campaignNext(); return; }
    if (C.phase === 'learn') { S.choices = campaignChoices(C); S.me = S.choices.side; campaignNext(); return; }
    if (!h.plan) { campaignBrief(); return; }
    launch(campaignChoices(C), h);
    return;
  }
  launch(ch, h.plan ? h : null);
}
addEventListener('hashchange', () => { if (!S.g && location.hash.includes('s=')) boot(); });
boot();

// Keep the sticky unit column below the sticky order bar: publish the bar's height as a CSS variable.
{ const bar = document.querySelector('.dd-obar');
  if (bar && 'ResizeObserver' in window) new ResizeObserver(() => document.documentElement.style.setProperty('--dd-obar-h', `${Math.ceil(bar.getBoundingClientRect().height)}px`)).observe(bar); }
