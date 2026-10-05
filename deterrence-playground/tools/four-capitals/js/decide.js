// The decision panel: posture and the DIMEFIL move menu with follow-up questions and resource costs. The Forces
// panel (js/forces-panel.js) and the logistics table (js/logi-panel.js) repaint from the same choice.
import { P } from '../data/params.js';
import { POSTURES, BY_ID, LINES, LINE_SHORT, posturesFor, escRoom, isEsc, answers, usedUp, ACTIONS, MAX_MOVES } from '../data/actions.js';
import { IDS } from '../data/countries.js';
import { RES_LABEL } from '../data/formations.js';
import { oddsFor, blockedWhy, USED } from './engine.js';
import { oddsTip, oppTip, ONCE_TIP, USED_TIP, GRAY_TIP } from './tips-text.js';
import { infoBtn } from './tips.js';
import { ledger, costOf, costText, short, grantOf } from './logistics.js';
import { paintForces, wireForces } from './forces-panel.js';
import { paintLogi } from './logi-panel.js';
import { paintSteps } from './steps.js';
import { wireAreaPop } from './area-pop.js';
import { constraints, homeLine } from './politics.js';
import { forumEstimate, forumTo, limitedOf } from './forum.js';
import { forumTip } from './forum-panel.js';
import { intelView, chooseMove } from './ai.js';
import { pulse } from '../../../shared/js/motion.js';

const $ = id => document.getElementById(id);
export const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let G = null, onChange = () => {};

export const emptyChoice = () => ({ posture: 'hold', actions: [], follow: {}, orders: { moves: [], stance: {} } });
/** Everyone's moves for the odds preview: you as chosen, the others repeating last month. */
const preview = () => Object.fromEntries(IDS.map(w => [w, w === G.player ? G.choice : (G.s.last[w] || { posture: 'hold', actions: [] })]));

/** Why `who` cannot add move `id` now (rules, posture, the four-move limit or resources), or null. */
export function addWhy(g, L, id) {
  const a = BY_ID[id], ch = g.choice, o = answers(id, ch.follow[id]);
  const rule = blockedWhy(g.s, id, o, { [g.player]: ch });
  if (rule) return { why: rule, kind: 'rule' };
  if (isEsc(id) && ch.actions.filter(isEsc).length >= escRoom(ch.posture))
    return { why: `your posture (${POSTURES.find(p => p.id === ch.posture).label}) allows ${escRoom(ch.posture) === 0 ? 'no' : 'only one'} escalatory move${escRoom(ch.posture) === 0 ? 's' : ''}`, kind: 'posture' };
  if (ch.actions.length >= MAX_MOVES) return { why: `you already have ${MAX_MOVES} moves`, kind: 'full' };
  const g2 = grantOf([id]), res = { lift: L.free.lift + g2.lift, fuel: L.free.fuel + g2.fuel, mun: L.free.mun + g2.mun };
  const k = short(res, L.free.ready + g2.ready, costOf(id, o));
  return k ? { why: `can’t afford (${RES_LABEL[k].toLowerCase()})`, kind: 'cost', res: k } : null;
}

export function paintDecide(g) {
  G = g;
  G.L = ledger(G.s, G.player, G.choice);
  paintPostures(); paintTabs(); paintActions(); paintForces(G); paintLogi(G); paintSteps(G);
  $('home').innerHTML = homeLine(G.s, G.player).map(esc).join(' ');
  if (!$('moves-how').firstChild) $('moves-how').innerHTML = infoBtn(MOVES_HOW, 'How moves work', 'How this works', 'k4-how');
}

/** Your estimate for a forum call: your read of the rival's type, and how they seem to read you. */
function forumOdds(id) {
  const me = G.player, to = forumTo(me, answers(id, G.choice.follow[id]));
  const f = forumEstimate(G.s, me, to, { [to]: intelView(G.B, G.s, me, to) }, limitedOf(intelView(G.B, G.s, to, me)));
  return { f, to };
}
function repaint() { paintDecide(G); onChange(); }

/**
 * Ask your staff: the computer's plan for your seat, for your goals, from your own reads of the rivals (the noisy
 * views the Situation panel shows, not their true posteriors), on Hard. `part` 'forces' takes only its force orders.
 * It fills the three steps; you can change anything before ending the month.
 */
export function advise(part = 'all') {
  const me = G.player;
  const reads = Object.fromEntries(IDS.filter(w => w !== me).map(w => [w, intelView(G.B, G.s, me, w)]));
  const { posture, actions, follow, orders } = chooseMove(G.s, me, reads, G.weights, 'hard');
  const ord = { moves: orders.moves || [], stance: orders.stance || {}, ...(orders.emph ? { emph: orders.emph } : {}) };
  if (part === 'forces') {
    G.choice.orders = ord;
    $('advice').textContent = `Your staff set ${ord.moves.length ? `${ord.moves.length} formation order${ord.moves.length > 1 ? 's' : ''}` : 'no formation moves'} and a stance in each area. Change any of them below.`;
  } else {
    G.choice = { posture, actions: [...actions], follow: JSON.parse(JSON.stringify(follow)), orders: ord };
    const p = POSTURES.find(x => x.id === posture).label;
    $('advice').innerHTML = `<b>Your staff suggest:</b> ${esc(p)}${actions.length ? '; ' + actions.map(id => esc(BY_ID[id].label[0].toLowerCase() + BY_ID[id].label.slice(1))).join('; ') : '; no moves'}${ord.moves.length ? `; ${ord.moves.length} force order${ord.moves.length > 1 ? 's' : ''}` : ''}. It is filled in on all three steps. Change anything you like, then End month.`;
  }
  $('advice').hidden = false;
  repaint();
}

function paintPostures() {
  const ok = posturesFor(G.player, G.s).map(p => p.id);
  const why = p => p.only && !p.only.includes(G.player) ? 'Only nuclear-armed states can make a nuclear signal' : `Needs the crisis at ${P.ladder[p.minRung]} or above`;
  $('postures').innerHTML = POSTURES.map(p => `<button type="button" role="radio" data-posture="${p.id}" aria-checked="${G.choice.posture === p.id}" ${ok.includes(p.id) ? '' : `disabled title="${why(p)}"`}>${p.label}</button>`).join('');
  $('pexp').textContent = POSTURES.find(p => p.id === G.choice.posture).explain;
}

function paintTabs() {
  const avail = ACTIONS[G.player].filter(a => !a.avail || a.avail(G.s));
  $('tabs').innerHTML = Object.keys(LINES).map(k => {
    const n = G.choice.actions.filter(id => BY_ID[id].line === k).length;
    const opp = avail.some(a => a.line === k && a.opp);
    return `<button type="button" role="tab" data-line="${k}" aria-selected="${G.line === k}" title="${LINES[k]}${opp ? ': an opportunity move is open' : ''}">${LINE_SHORT[k]}${opp ? '<i class="k4-dot" aria-hidden="true"></i><span class="sr-only"> (opportunity open)</span>' : ''}${n ? ` <small>(${n})</small>` : ''}</button>`;
  }).join('');
  $('count').textContent = `${G.choice.actions.length} of ${MAX_MOVES}`;
}

function followHTML(a) {
  const o = answers(a.id, G.choice.follow[a.id]);
  return (a.follow || []).map(q => `<fieldset class="k4-fq"><legend>${esc(q.text)}</legend>${q.opts.map(x =>
    `<label class="${o[q.id] === x.id ? 'on' : ''}"><input type="radio" name="fq-${a.id}-${q.id}" data-fa="${a.id}" data-fq="${q.id}" value="${x.id}" ${o[q.id] === x.id ? 'checked' : ''}><b>${esc(x.label)}</b><span>${esc(x.explain)}</span></label>`).join('')}</fieldset>`).join('');
}

function paintActions() {
  const mv = preview();
  const shown = ACTIONS[G.player].filter(a => a.line === G.line && (!a.avail || a.avail(G.s)));
  $('actions').innerHTML = shown.map(a => {
    const on = G.choice.actions.includes(a.id);
    const w = on ? null : addWhy(G, G.L, a.id);
    const unpaid = on && G.L.refused[a.id];
    const fo = a.forum ? forumOdds(a.id) : null;
    const { p, factors } = fo ? { p: fo.f.p, factors: [] } : oddsFor(G.s, mv, G.player, a.id);
    const tag = a.tags.includes('esc') ? 'tag-esc' : a.tags.includes('soft') ? 'tag-soft' : '';
    const fac = factors.map(([l, d]) => `${l} ${d > 0 ? '+' : ''}${d}`).join(' · ');
    const c = costOf(a.id, answers(a.id, G.choice.follow[a.id])), ct = costText(c);
    const gt = Object.entries(a.grant || {}).map(([k, v]) => `+${v} ${RES_LABEL[k]}`).join(', ');
    const used = usedUp(G.s, a.id);
    const chips = constraints(G.s, G.player, a.id, answers(a.id, G.choice.follow[a.id]))
      .map(c => infoBtn(c.tip, `${c.text}: why`, `${esc(c.text)} <i aria-hidden="true">ⓘ</i>`, `k4-chip${c.block ? ' k4-chip-no' : ''}`));
    const extra = [...chips, a.opp && infoBtn(oppTip(G.s, a.id), `Opportunity: why ${a.label} is on the menu`, a.forum ? 'Peace forum <i aria-hidden="true">ⓘ</i>' : 'Opportunity <i aria-hidden="true">ⓘ</i>', 'k4-opp'),
      a.tags.includes('gray') && infoBtn(GRAY_TIP, 'Gray zone: what it means', 'Gray zone <i aria-hidden="true">ⓘ</i>', 'k4-gray'),
      a.once && !used && infoBtn(ONCE_TIP, 'Once a game: what it means', 'Once a game <i aria-hidden="true">ⓘ</i>', 'k4-once'),
      gt && `<em class="k4-dep">${gt}</em>`, `<em class="k4-cost${ct ? '' : ' free'}">${ct ? `Cost: ${ct}` : 'Free'}</em>`].filter(Boolean).join(' ');
    const off = w && w.kind !== 'full';
    const pct = used ? infoBtn(USED_TIP, `${a.label}: already used`, 'USED', 'k4-used') : w && w.kind === 'rule' ? '—'
      : `${Math.round(p * 100)}%${infoBtn(fo ? forumTip(fo.f, fo.to) : oddsTip(G.s, mv, G.player, a.id), `How the ${Math.round(p * 100)}% for ${a.label} is worked out`)}`;
    return `<div class="k4-act ${on ? 'on' : ''} ${off ? 'off' : ''} ${used ? 'used' : ''} ${tag}"><div class="k4-acth"><label><input type="checkbox" data-act="${a.id}" ${on ? 'checked' : ''} ${w ? 'disabled' : ''}>
      <b>${esc(a.label)}</b></label><span class="p">${pct}</span></div><small>${esc(a.explain)} ${extra}</small>
      ${off ? `<span class="why">${w.why === USED ? 'Already used: you can carry this out once a game.' : `Not now: ${esc(w.why)}.`}</span>` : unpaid ? `<span class="why bad">Can’t afford with your other choices (${RES_LABEL[unpaid].toLowerCase()}): it will not be carried out.</span>` : fac ? `<span class="why">${esc(fac)}</span>` : ''}
      ${on && a.follow ? `<div class="k4-follow">${followHTML(a)}</div>` : ''}</div>`;
  }).join('') || '<p class="fine">No moves on this line this month.</p>';
}

/** The explanation that used to sit under the move list, now behind a "How this works" button. */
const MOVES_HOW = { title: 'How moves work', lines: [
  'Tap or hover the i beside a move’s % to see how it is worked out.',
  'Odds assume the others repeat last month; they are recalculated, with what everyone actually did, when the month resolves.',
  'Choosing a move again next month costs −15.',
  'Opportunity moves appear only while their condition holds; Once a game moves are marked USED after you carry them out.',
  'Each move shows its cost (or Free). A move you cannot pay for with your other choices is greyed out with the reason.',
], notes: [] };

/** Add or remove a move. */
export function toggleMove(id, on) {
  const a = G.choice.actions;
  if (on && !a.includes(id)) {
    if (a.length >= MAX_MOVES) return;
    G.choice.actions = [...a, id];
    if (BY_ID[id].follow) G.choice.follow[id] = answers(id, G.choice.follow[id]);
  } else if (!on) { G.choice.actions = a.filter(x => x !== id); delete G.choice.follow[id]; }
  repaint();
}

export function wireDecide(change) {
  onChange = change;
  $('postures').addEventListener('click', e => {
    const b = e.target.closest('[data-posture]'); if (!b || b.disabled) return;
    G.choice.posture = b.dataset.posture;
    let room = escRoom(G.choice.posture);
    G.choice.actions = G.choice.actions.filter(id => !isEsc(id) || room-- > 0);
    repaint(); pulse(b);
  });
  $('tabs').addEventListener('click', e => { const b = e.target.closest('[data-line]'); if (!b) return; G.line = b.dataset.line; paintTabs(); paintActions(); });
  $('actions').addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.act) return toggleMove(t.dataset.act, t.checked);
    if (t.dataset.fa) { G.choice.follow[t.dataset.fa] = { ...answers(t.dataset.fa, G.choice.follow[t.dataset.fa]), [t.dataset.fq]: t.value }; repaint(); }
  });
  $('advise').addEventListener('click', () => advise());
  $('advise-forces').addEventListener('click', () => advise('forces'));
  wireForces(() => G, repaint);
  wireAreaPop(() => G, repaint);
}
