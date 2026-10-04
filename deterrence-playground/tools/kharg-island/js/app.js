// Kharg Island: state, controls, turn stepping, Monte Carlo and the below-the-fold content.
import { MENU, TOGGLES, BUDGET, PROB, PROB_DEF, POSTURES, IRAN_FIELDS, MINE_LEVELS, TURN_HOURS } from '../data/params.js';
import { SOURCES, HISTORY } from '../data/sources.js';
import { playGame } from './model.js';
import { monteCarlo, drivers, RUNS } from './montecarlo.js';
import { panelHtml, assumptionsHtml, spent, NOTIONAL, ESCAL } from './panel.js';
import { createMap } from './map.js';
import { turnLogHtml, crtHtml, readoutHtml, mcHtml, outcomeText } from './views.js';
import { escalationHtml, oilHtml } from './tracks.js';
import { writeHash, readHash } from './hash.js';
import { DEFAULT, LESSON_SEED, lessonSteps, SHEET } from './tour.js';
import { learnButton, runLesson } from '../../../shared/js/learn.js';
import { addExportBar } from '../../../shared/js/export.js';
import { turnFx, mcFx, press, dieHtml } from './fx.js';

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const copyCfg = c => ({ us: { ...c.us }, ir: { ...c.ir }, turns: c.turns });

let { cfg, P, seed, view } = readHash(copyCfg(DEFAULT), { ...PROB_DEF }, 1987);
let game, anim = null, mcTimer = null, shownView = null, shownGame = null;

$('panel').innerHTML = panelHtml();
const map = createMap($('map'), $('tip'), { onSector: k => { cfg.us.sector = k; changed(); } });

// ---- Controls --------------------------------------------------------------------------
const syncs = [];
function bindSlider(id, get, set, f = v => v) {
  const i = $(id);
  i.oninput = () => { set(+i.value); changed(); };
  syncs.push(() => { i.value = get(); $(id + '-out').textContent = f(get()); });
}
const choice = (id, get, set) => {
  $(id).querySelectorAll('button').forEach(b => b.onclick = () => { set(b.dataset.k); changed(); });
  syncs.push(() => $(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(get(b.dataset.k)))));
};
function bindStepper(key, get, set, { min, max, step = 1, cost = 0 }) {
  const row = document.querySelector(`.stepper[data-k="${key}"]`);
  row.querySelectorAll('button').forEach(b => b.onclick = () => {
    const d = +b.dataset.d, next = Math.round((get() + d * step) * 100) / 100;
    if (next < min || next > max) return;
    if (d > 0 && cost && spent(cfg.us) + cost > BUDGET) { flashBudget(); return; }
    set(next); changed();
  });
  syncs.push(() => {
    $('n-' + key).textContent = get();
    row.querySelector('[data-d="-1"]').disabled = get() <= min;
    row.querySelector('[data-d="1"]').disabled = get() >= max;
  });
}

choice('obj', k => cfg.us.obj === k, k => { cfg.us.obj = k; });
for (const m of MENU) bindStepper(m.k, () => cfg.us[m.k], v => { cfg.us[m.k] = v; }, { min: 0, max: m.max, cost: m.cost });
for (const t of TOGGLES) {
  $('tg-' + t.k).onchange = e => {
    if (e.target.checked && spent(cfg.us) + t.cost > BUDGET) { e.target.checked = false; flashBudget(); return; }
    cfg.us[t.k] = e.target.checked; changed();
  };
  syncs.push(() => { $('tg-' + t.k).checked = cfg.us[t.k]; });
}
bindSlider('strikes', () => cfg.us.strikes, v => { cfg.us.strikes = v; }, v => `${v} (${v * TURN_HOURS} h)`);
choice('sector', k => cfg.us.sector === k, k => { cfg.us.sector = k; });
choice('posture', k => cfg.ir.posture === k, k => {
  cfg.ir.posture = k;
  if (POSTURES[k]) Object.assign(cfg.ir, POSTURES[k].v);
  else $('iran-d').open = true;
});
const custom = () => { cfg.ir.posture = 'custom'; };
for (const f of IRAN_FIELDS) bindStepper('ir-' + f.k, () => cfg.ir[f.k], v => { cfg.ir[f.k] = v; custom(); }, { min: f.min, max: f.max, step: f.step || 1 });
choice('mines', k => cfg.ir.mines === +k, k => { cfg.ir.mines = +k; custom(); });
choice('escal', k => cfg.ir.escal === +k, k => { cfg.ir.escal = +k; custom(); });
bindSlider('turns', () => cfg.turns, v => { cfg.turns = v; }, v => `${v} × ${TURN_HOURS} h`);
syncs.push(() => {
  $('land-opts').hidden = cfg.us.obj === 'blockade';
  $('turn-note').textContent = `Turns are ${TURN_HOURS} hours, so ${cfg.turns} turns cover ${cfg.turns * TURN_HOURS / 24} days.`;
  $('seed-t').textContent = seed;
  const esc = ESCAL.find(e => e[0] === cfg.ir.escal);
  $('iran-sum').textContent = `${cfg.ir.ascm} batteries, ${cfg.ir.drones} drone teams, ${cfg.ir.fac} FAC squadrons, ${MINE_LEVELS[cfg.ir.mines].toLowerCase()} mines, ${esc ? esc[1].toLowerCase() : cfg.ir.escal} escalation`;
});
$('reseed').onclick = () => { seed = 1 + Math.floor(Math.random() * 999998); changed(); };

function flashBudget() { const b = $('budget-t'); b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); }

function renderAssumptions() {
  $('assume-body').innerHTML = assumptionsHtml(P);
  const nChanged = PROB.filter(p => P[p.k] !== p.v).length, nNot = PROB.filter(p => !p.src).length;
  $('assume-n').textContent = `${PROB.length} values, ${nNot} notional${nChanged ? `, ${nChanged} changed` : ''}`;
  $('assume-body').querySelectorAll('input').forEach(i => i.onchange = () => {
    const p = PROB.find(x => x.k === i.dataset.k), v = parseFloat(i.value);
    P[p.k] = Number.isFinite(v) ? Math.max(p.min, Math.min(p.max, v)) : p.v;
    changed(view);
  });
}
$('assume-reset').onclick = () => { P = { ...PROB_DEF }; changed(); };

// Turn stepping
$('prev').onclick = () => { stop(); setView(view - 1); };
$('next').onclick = () => { stop(); setView(view + 1); press($('next')); };
$('scrub').oninput = e => { stop(); setView(+e.target.value); };
$('playall').onclick = () => { playAll(); press($('playall')); };
document.addEventListener('click', e => {
  if (!e.target.closest('.open-assume')) return;
  e.preventDefault(); showTab('setup'); $('assume').open = true; $('assume').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
});

// Phone tabs (Setup / Play / 1,000 games). On wider screens every section shows and the tabs are hidden.
const phone = matchMedia('(max-width: 760px)');
function showTab(t) {
  const lay = document.querySelector('.layout');
  if (lay.dataset.tab === t) return;
  lay.dataset.tab = t;
  document.querySelectorAll('.kh-tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
  if (phone.matches) document.querySelector('.kh-tabs').scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' });
}
document.querySelectorAll('.kh-tabs [data-tab], [data-go]').forEach(b => b.onclick = () => showTab(b.dataset.tab || b.dataset.go));
$('copy-link').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy-link').textContent = 'Link copied'; }
  catch { $('copy-link').textContent = 'Copy the address bar'; }
  setTimeout(() => { $('copy-link').textContent = 'Copy link'; }, 1800);
};

// ---- Compute and draw -----------------------------------------------------------------------
function changed(v = 0) {
  stop();
  syncs.forEach(f => f());
  const used = spent(cfg.us);
  $('budget-bar').style.width = Math.min(100, used / BUDGET * 100) + '%';
  $('budget-t').innerHTML = `${used} of ${BUDGET} points spent ${NOTIONAL}`;
  renderAssumptions();
  game = playGame(cfg, P, seed);
  $('scrub').max = game.turns.length;
  setView(Math.min(v, game.turns.length));
  scheduleMc();
}

function startState() {
  return { ascm: cfg.ir.ascm, salvos: cfg.ir.ascm * 2, drones: cfg.ir.drones, fac: cfg.ir.fac, srbm: cfg.ir.srbm,
    amph: cfg.us.meu * 3, ddg: cfg.us.ddg, groups: cfg.us.meu * 3, garrison: cfg.ir.garrison, ashore: 0, progress: 0,
    airstrip: 'ir', mineEff: cfg.ir.mines ? 1 : 0, esc: 0, ev: { hormuz: 0, gulf: 0, regional: 0 }, share: 1, offline: 0,
    lostMb: 0, price: P.brent, cost: 0, phase: 'pre', lastReinf: null };
}

function setView(v) {
  view = Math.max(0, Math.min(game.turns.length, v));
  const st = view ? game.turns[view - 1].state : startState();
  const T = view ? game.turns[view - 1] : null;
  map.draw(cfg, st, { turn: view, landT: game.landT, outcome: game.outcome });
  $('scrub').value = view;
  $('prev').disabled = view === 0; $('next').disabled = view >= game.turns.length;
  $('turn-t').textContent = view ? `Turn ${view} of ${game.turns.length} · ${T.label} · ${T.phase}` : `Setup · up to ${cfg.turns} turns to play`;
  const was = [...document.querySelectorAll('#readout dd')].map(d => d.textContent);
  $('readout').innerHTML = readoutHtml(st, cfg);
  $('log').innerHTML = turnLogHtml(game, view, cfg);
  $('crt-wrap').hidden = cfg.us.obj === 'blockade';
  $('crt').innerHTML = crtHtml(T && T.crt);
  $('crt-note').textContent = T && T.crt ? `This turn: ratio ${T.crt.ratio === Infinity ? 'unopposed' : T.crt.ratio.toFixed(2)} (column ${['< 1:2', '1:2', '1:1', '1.5:1', '2:1', '3:1+'][T.crt.col]}), die ${T.crt.roll}.` : 'No ground combat this turn.';
  $('esc').innerHTML = escalationHtml(game, view, st, cfg, P);
  $('oil').innerHTML = oilHtml(game, view, st, cfg, P);
  if (T && T.crt) $('crt-note').insertAdjacentHTML('afterbegin', dieHtml(T.crt.roll));
  if (game === shownGame && view === shownView + 1) {
    turnFx({ svg: $('map'), T, prev: view > 1 ? game.turns[view - 2].state : startState(), st, cfg, was,
      last: view === game.turns.length, outcome: game.outcome });
  }
  shownView = view; shownGame = game;
  writeHash(cfg, P, seed, view);
}

function scheduleMc() {
  clearTimeout(mcTimer);
  $('mc').classList.add('busy');
  mcTimer = setTimeout(() => {
    const mc = monteCarlo(cfg, P, seed);
    const shares = [...document.querySelectorAll('#mc .mc-bar .seg')].map(s => parseFloat(s.style.width));
    $('mc').innerHTML = mcHtml(mc, drivers(cfg, P, seed, mc), cfg);
    $('mc').classList.remove('busy');
    $('mc-h').textContent = `${RUNS.toLocaleString('en-US')} games, dice seed ${seed}`;
    mcFx($('mc'), mc, shares.length === 3 ? shares : null);
    status(mc);
  }, 60);
}

function status(mc) {
  const w = mc.win / mc.n, m = mc.mixed / mc.n, f = mc.fail / mc.n, maj = mc.major / mc.n, obj = cfg.us.obj;
  const S = $('status');
  S.dataset.s = w >= 0.5 ? 'good' : w >= 0.2 ? 'warn' : 'bad';
  S.innerHTML = `<b>${outcomeText(obj, 'win')} in ${Math.round(w * 100)}% of games</b><span>Within ${cfg.turns * TURN_HOURS / 24} days. ${outcomeText(obj, 'mixed')}: ${Math.round(m * 100)}%. ${outcomeText(obj, 'fail')}: ${Math.round(f * 100)}%. Major escalation in ${Math.round(maj * 100)}%.</span>`;
  $('status-mini').dataset.s = S.dataset.s; $('status-mini').innerHTML = S.innerHTML;
  $('status-note').innerHTML = `Notional model, not a prediction. ${RUNS.toLocaleString('en-US')} seeded games; the turn log shows one of them.`;
}

// ---- Animation ---------------------------------------------------------------------------
function stop() { if (anim) clearInterval(anim); anim = null; $('playall').textContent = 'Play all turns'; }
function playAll() {
  if (anim) { stop(); return; }
  if (reduced.matches) { setView(game.turns.length); return; }
  if (view >= game.turns.length) setView(0);
  $('playall').textContent = 'Stop';
  anim = setInterval(() => { if (view >= game.turns.length) stop(); else setView(view + 1); }, 1100);
}

// ---- Below the fold ------------------------------------------------------------------------
$('history').innerHTML = HISTORY.map(h => `<li><p class="h-when">${h.when}</p><h3>${h.title}</h3><p>${h.text}</p>
  <p class="fine">${h.src.map(k => `<a href="${SOURCES[k].url}" target="_blank" rel="noopener">${SOURCES[k].t}</a>`).join('; ')}</p></li>`).join('');
$('sources').innerHTML = Object.entries(SOURCES).map(([k, s]) => `<li id="src-${k}"><a href="${s.url}" target="_blank" rel="noopener">${s.t}</a>. <span>Used for: ${s.used}</span></li>`).join('');
$('param-table').innerHTML = `<thead><tr><th>Parameter</th><th>Default</th><th>Basis</th></tr></thead><tbody>${PROB.map(p => `<tr><td>${p.t}</td><td class="num">${p.v} ${p.u}</td><td>${p.src ? `<a href="#src-${p.src}">source</a>${p.note ? `: ${p.note}` : ''}` : `${NOTIONAL}${p.note ? ` ${p.note}` : ''}`}</td></tr>`).join('')}</tbody>`;
reduced.addEventListener?.('change', stop);

changed(view);

// "New here? Learn to play": the banner sits at the top of the game, above the setup. The lesson resets to the
// default setup and dice so every player sees the same first game.
const banner = learnButton($('learn'), {
  slug: 'kharg-island', minutes: 6, sheet: SHEET,
  onStart: () => {
    cfg = copyCfg(DEFAULT); P = { ...PROB_DEF }; seed = LESSON_SEED;
    $('iran-d').open = false; $('assume').open = false;
    changed(0);
    runLesson(lessonSteps({ showTab }), { slug: 'kharg-island', title: 'Learn to play', onExit: () => banner.refresh() });
  },
});
addExportBar(document.querySelector('.playbar'), {
  target: () => $('map'),
  title: () => `Kharg Island: ${$('turn-t').textContent}`,
  note: 'Notional model, not a prediction (Kharg Island wargame). Forces shown in notional zones, not real positions.',
});
