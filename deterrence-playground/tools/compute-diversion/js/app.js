// Diversion: start screen, the quarterly decision, resolution, and the end-of-game debrief.
import { P, quarterLabel } from '../data/params.js';
import { BY_LEVER } from '../data/levers.js';
import { CASES } from '../data/cases.js';
import { ASOF } from '../data/policies.js';
import { newGame, resolveTurn, project, normalize, encode, decode, baseline, score, attribution, collateral } from './engine.js';
import { STRATEGIES, STRATEGY_LABEL } from './ai.js';
import { drawMap, animateLog } from './map.js';
import { emptyChoice, chosen, paintDecide, wireDecide, tryChange } from './decide.js';
import { metrics, paintTracks, inforceHTML, logHTML, pickCase, caseHTML, WHY, paintScatter, attrHTML } from './view.js';
import { methodHTML } from './method.js';
import { countUp, pulse } from '../../../shared/js/motion.js';

const $ = id => document.getElementById(id);
const newSeed = () => 1 + Math.floor(Math.random() * 999998);
const show = (...ids) => ['start', 'play', 'end'].forEach(id => { $(id).hidden = !ids.includes(id); });
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let g = null;          // { s, c, base, cases: [ids] }
let len = 10;

$('asof').textContent = `Cards current as of ${ASOF}.`;
$('method-body').innerHTML = methodHTML();

/* ---------- Start ---------- */
const LEN_TEXT = { 8: 'Two years. Rules you start late may never bite.', 10: 'Two and a half years. The standard game.', 12: 'Three years. Time for the network to adapt to everything.' };
function paintStart() {
  $('lengths').innerHTML = P.lengths.map(n => `<label class="cd-card${len === n ? ' on' : ''}"><input type="radio" name="len" value="${n}"${len === n ? ' checked' : ''}><b>${n} quarters</b><small>${LEN_TEXT[n]}</small></label>`).join('');
  $('seed-note').textContent = 'Each game gets a random seed. Copy link shares the seed and every move, so someone else can replay your game or play the same network.';
}
$('start').addEventListener('change', e => { if (e.target.name === 'len') { len = +e.target.value; paintStart(); document.querySelector(`input[name="len"][value="${len}"]`).focus(); } });
$('begin').addEventListener('click', () => { begin({ seed: newSeed(), len }); show('play'); paint(); $('h-quarter').focus(); });

function begin(start) {
  const s = newGame(start);
  g = { s, c: emptyChoice(s), base: baseline(start), cases: [], msg: null };
}

/* ---------- Decide ---------- */
const mapHandlers = {
  shell: id => change({ act: 'list', t: id }),
  hub: h => change({ act: 'euc', t: h }),
};
function change({ act, t }) {
  if (!$('resolve').hidden) return;
  g.msg = tryChange(g.s, g.c, c => {
    if (act === 'list') c.list = c.list.includes(t) ? c.list.filter(x => x !== t) : [...c.list, t];
    if (act === 'euc') { const n = ((c.euc[t] || 0) + 1) % 3; if (n) c.euc[t] = n; else delete c.euc[t]; }
  });
  paintChoice();
  const sel = act === 'list' ? `[data-shell="${t}"]` : `[data-hub="${t}"]`;
  $('map').querySelector(sel)?.focus();
}
function paintChoice() {
  const acts = chosen(g.c);
  const n = normalize(g.s, acts);
  const rec = project(g.s, acts);
  $('h-budget').textContent = `${n.budget} / ${P.budget}`;
  $('h-capital').textContent = `${Math.round(n.capital)}`;
  drawMap($('map'), g.s, rec, n.acts, mapHandlers);
  $('map-mode').textContent = 'expected this quarter, before the network adapts';
  paintTracks($('tracks'), metrics(g.s, g.base), rec);
  const base = g.base.history[g.s.turn];
  $('preview').innerHTML = `Expected this quarter: <b class="num">${Math.round(rec.delivered)}</b> compute units reach restricted users (with no enforcement at all: about <b class="num">${Math.round(base.delivered)}</b>). Friction on legitimate trade <b class="num">${rec.friction.toFixed(1)}</b>.`;
  const active = document.activeElement?.closest?.('#levers [data-act]');
  const key = active ? `[data-act="${active.dataset.act}"]${active.dataset.t ? `[data-t="${active.dataset.t}"]` : ''}${active.dataset.v ? `[data-v="${active.dataset.v}"]` : ''}` : null;
  const open = [...$('levers').querySelectorAll('details[open]')].map(d => d.closest('[data-lever]').dataset.lever);
  paintDecide($('levers'), g.s, g.c, g.msg);
  for (const id of open) $('levers').querySelector(`[data-lever="${id}"] details`)?.setAttribute('open', '');
  if (key) $('levers').querySelector(key)?.focus();
  history.replaceState(null, '', '#g=' + encode(g.s));
}
function paint() {
  const s = g.s;
  $('h-quarter').textContent = quarterLabel(s.turn);
  $('turnof').textContent = `of ${s.len}`;
  $('inforce').innerHTML = inforceHTML(s);
  g.msg = null;
  paintChoice();
}
wireDecide($('levers'), () => g, msg => { g.msg = msg; paintChoice(); });
$('clear').addEventListener('click', () => { g.c = emptyChoice(g.s); g.msg = null; paintChoice(); });

/* ---------- Resolve ---------- */
$('end-turn').addEventListener('click', () => {
  if (!g || g.s.over || !$('resolve').hidden) return;
  const q = quarterLabel(g.s.turn);
  const { state, rec } = resolveTurn(g.s, chosen(g.c));
  g.s = state;
  $('res-t').textContent = `${q}: what happened`;
  $('log').innerHTML = logHTML(rec, g.s);
  const tag = ['case', 'shell', 'transship', 'split', 'cloud'].find(t => rec.tags.includes(t));
  const card = pickCase(g.s, rec, g.cases);
  if (card) g.cases.push(card.id);
  $('case-card').innerHTML = caseHTML(card, tag ? WHY[tag] : 'A real case from the public record:');
  $('resolve').hidden = false; $('decide').hidden = true; $('end-turn').disabled = true;
  drawMap($('map'), g.s, rec, [], null);
  $('map-mode').textContent = 'what happened; the network has now adapted';
  paintTracks($('tracks'), metrics(g.s, g.base), null);
  $('inforce').innerHTML = inforceHTML(g.s);
  setTimeout(() => animateLog($('map'), g.s, rec), reducedMotion() ? 0 : 150);
  history.replaceState(null, '', '#g=' + encode(g.s));
  $('resolve').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  $('res-t').focus();
});
$('next').addEventListener('click', () => {
  $('resolve').hidden = true; $('decide').hidden = false; $('end-turn').disabled = false;
  if (g.s.over) return finish();
  g.c = emptyChoice(g.s);
  paint();
  $('h-quarter').focus();
});

/* ---------- End ---------- */
const LESSON = {
  list: 'Listing closes a route at once, but the network usually registers a replacement within a quarter. Listings paid off most when standing agents slowed replacement.',
  euc: 'End-use checks raise seizures and expose shells, but only as far as the host cooperates, and heavy checking pushes the network to split shipments.',
  agents: 'Standing agents work everywhere at once, deter new shells and set up prosecutions. They cost budget, not trade.',
  hub: 'Hub pressure lasts, but it spends allied goodwill, and the network moves volume to cooler hubs.',
  kyc: 'The cloud rule closes a route that physical enforcement pushes the network toward. Its value grows with how hard you squeeze hardware routes.',
  lv: 'Location verification cuts every physical route at once, but it arrives late, costs industry, and erodes as diverters learn to spoof it.',
  relax: 'Relaxation buys capital and goodwill for the rest of your program, at the price of more cover traffic at hubs.',
};
function lessons(s, sc, at) {
  const out = [];
  const top = at.filter(a => a.dDiverted > 1)[0];
  if (top) out.push(`<b>${BY_LEVER[top.k].name} mattered most.</b> Without it the network would have delivered about ${Math.round(top.dDiverted)} more compute units. ${LESSON[top.k]}`);
  const worst = [...at].sort((a, b) => b.dCost - a.dCost)[0];
  if (worst && worst.dCost > 3 && worst !== top) out.push(`<b>${BY_LEVER[worst.k].name} cost the most.</b> It added ${worst.dCost.toFixed(1)} to collateral cost. ${LESSON[worst.k]}`);
  const H = s.history;
  const cloudShare = H.at(-1).routes.cloud.d / Math.max(1, H.at(-1).delivered);
  out.push(cloudShare > 0.3
    ? `<b>The network went to the cloud.</b> By the last quarter ${Math.round(cloudShare * 100)}% of what reached restricted users was rented compute. ${s.pol.kyc == null ? 'You never started a cloud KYC rule.' : 'Your KYC rule slowed this, and part of it moved offshore.'}`
    : `<b>Rented compute stayed small</b> (${Math.round(cloudShare * 100)}% of deliveries in the last quarter).`);
  const listed = s.shells.filter(x => x.listed).length, born = s.shells.filter(x => x.born > 0).length;
  if (listed) out.push(`<b>Whack-a-mole count.</b> You listed ${listed} front compan${listed === 1 ? 'y' : 'ies'}; the network registered ${born} new ones.`);
  out.push(sc.col.total > 60
    ? '<b>The cost side bit.</b> Collateral cost above 60 took most of the 35 points for keeping trade, industry and allies on side.'
    : '<b>You kept collateral cost low,</b> which is worth up to 35 points. The best rules found in testing pair steady agents with an early cloud rule and targeted listings.');
  out.push('<b>A note on balance.</b> In testing, steady enforcement agents alone (level 3, nothing else) scored about 51, better than any named computer strategy, because they cost budget rather than trade. Mixing them with an early cloud rule and targeted listings did best, about 53.');
  return out.map(t => `<li>${t}</li>`).join('');
}

function finish() {
  const s = g.s;
  history.replaceState(null, '', '#g=' + encode(s));
  show('end');
  const sc = score(s, g.base);
  $('end-k').textContent = `${s.len} quarters · seed ${s.seed}`;
  $('end-t').textContent = sc.total >= 55 ? 'A strong program' : sc.total >= 45 ? 'Diversion slowed' : sc.total > 36 ? 'Some effect, at a price' : 'The network kept up';
  countUp($('total'), sc.total, { from: 0 });
  $('cut').textContent = `${Math.round(sc.cut * 100)}%`;
  $('cut-x').textContent = `of diversion prevented: ${Math.round(sc.diverted)} compute units reached restricted users, against ${Math.round(sc.base)} with no enforcement on the same network.`;
  $('cost').textContent = sc.col.total.toFixed(0);
  $('cost-x').textContent = `collateral cost (friction ${sc.col.friction.toFixed(0)}, lost revenue ${sc.col.revenue.toFixed(0)}, lost goodwill ${sc.col.goodwill.toFixed(0)}). Lower is better.`;
  const pts = [{ label: 'You', x: sc.col.total, y: 1 - sc.cut, you: true }];
  for (const [k, f] of Object.entries(STRATEGIES)) {
    if (k === 'none') continue;
    let t = newGame({ seed: s.seed, len: s.len });
    while (!t.over) t = resolveTurn(t, f(t)).state;
    pts.push({ label: STRATEGY_LABEL[k], x: collateral(t).total, y: t.diverted / g.base.diverted });
  }
  pts.push({ label: STRATEGY_LABEL.none, x: 0, y: 1 });
  paintScatter($('scatter'), pts);
  const at = attribution(s);
  $('attr').innerHTML = attrHTML(at);
  $('lessons').innerHTML = lessons(s, sc, at);
  const drawn = g.cases.map(id => CASES.find(c => c.id === id)).filter(Boolean);
  $('casefiles').innerHTML = drawn.length ? drawn.map(c => caseHTML(c)).join('') : '<p class="fine">No case cards drawn.</p>';
  $('end').focus();
  pulse($('total'));
}

function restart() {
  g = null; history.replaceState(null, '', location.pathname + location.search);
  paintStart(); show('start'); $('resolve').hidden = true; $('decide').hidden = false; $('end-turn').disabled = false;
  $('start').scrollIntoView({ block: 'start' }); $('start-t').focus();
}
$('again').addEventListener('click', restart);
$('new-game').addEventListener('click', restart);
$('copy-link').addEventListener('click', async e => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copied'; } catch { b.textContent = 'Copy the address bar'; }
  setTimeout(() => { b.textContent = 'Copy link'; }, 1600);
});

/* ---------- Load: replay a shared link, or start fresh ---------- */
function load() {
  const m = location.hash.match(/#g=([^&]+)/);
  const d = m && decode(decodeURIComponent(m[1]));
  if (!d) { paintStart(); show('start'); return; }
  begin(d);
  for (const mv of d.moves) {
    if (g.s.over) break;
    const { state, rec } = resolveTurn(g.s, mv);
    g.s = state;
    const c = pickCase(g.s, rec, g.cases); if (c) g.cases.push(c.id);
  }
  if (g.s.over) return finish();
  g.c = emptyChoice(g.s);
  show('play'); paint();
}
load();
