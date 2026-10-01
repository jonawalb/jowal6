// Brinkmanship engine: a best-of-five series of crises. Pure and deterministic given (seed, your choices); no DOM.
import { P, TYPES, CRISES, value } from '../data/params.js';
import { makeRng, STREAM } from './rng.js';
import { think, updateBelief, draw, nextRisk } from './ai.js';

const clone = x => JSON.parse(JSON.stringify(x));

/** Hidden resolves for all five crises, drawn from each crisis's known prior. */
export function drawTypes(seed) {
  const r = makeRng(seed, STREAM.setup);
  return CRISES.map(c => ({ you: TYPES[r.pick(TYPES.map(t => c.prior[t]))], rival: TYPES[r.pick(TYPES.map(t => c.prior[t]))] }));
}

function startCrisis(i, types) {
  const c = CRISES[i];
  return {
    i, id: c.id, types,
    val: { you: value(c, types.you), rival: value(c, types.rival) },
    risk: P.risk0, round: 1, log: [],
    bel: { you: { ...c.prior }, rival: { ...c.prior } }, // bel.you: your belief about the Rival; bel.rival: the Rival's about you
    over: null,
  };
}

/** A new series. dice: seed for disaster rolls and the Rival's noise (defaults to seed; the benchmark varies it). */
export function newSeries(seed, { types, dice } = {}) {
  const ts = types || drawTypes(seed);
  return { seed, dice: dice ?? seed, types: ts, done: [], cur: startCrisis(0, ts[0]), over: false };
}

export const viewOf = c => ({ crisis: CRISES[c.i], risk: c.risk, round: c.round });

/** A seat's view of the crisis: mine = its belief about the other side, theirs = the other side's belief about it. */
export const atOf = (c, seat) => ({ ...viewOf(c), mine: c.bel[seat], theirs: c.bel[seat === 'you' ? 'rival' : 'you'] });
/** What the computer would do in a seat this round: for 'you' (the overlay and benchmark) or 'rival'. Seeded. */
export const seatPolicy = (c, seat, seed = 1) => think(atOf(c, seat), c.types[seat], () => makeRng(seed, 500 + (seat === 'you' ? 0 : 1), c.i * 16 + c.round));

const u = (s, stream, c) => makeRng(s.dice, stream + c.i * 16 + c.round).u();
/** The Rival's choice this round (seeded, so a replay gives the same Rival). */
export function rivalChoice(s) {
  const c = s.cur;
  return draw(seatPolicy(c, 'rival', s.dice).p, u(s, STREAM.ai, c));
}

const OUT = {
  win: 'You won the stake: the Rival backed down.',
  lose: 'You backed down. The Rival takes the stake.',
  split: 'Both sides backed down at once. The stake is split.',
  disaster: 'Disaster. The risk you were both running came due.',
  exhausted: 'Six rounds and nobody blinked. Both sides step back exhausted; the stake is split.',
};

/** Play one round: your action, the Rival's (chosen here unless given). Returns a new series state. */
export function playRound(s0, you, rival = rivalChoice(s0)) {
  const s = clone(s0), c = s.cur;
  const view = viewOf(c);
  const entry = {
    round: c.round, risk: c.risk, you, rival,
    belBefore: clone(c.bel),
  };
  // Each side reads the other's move by Bayes' rule, before anything is rolled.
  c.bel = {
    you: updateBelief(c.bel.you, view, rival, entry.belBefore.rival),
    rival: updateBelief(c.bel.rival, view, you, entry.belBefore.you),
  };
  let pay = null, kind = null;
  if (you === 'back' && rival === 'back') { kind = 'split'; pay = { you: c.val.you / 2, rival: c.val.rival / 2 }; }
  else if (you === 'back') { kind = 'lose'; pay = { you: 0, rival: c.val.rival }; }
  else if (rival === 'back') { kind = 'win'; pay = { you: c.val.you, rival: 0 }; }
  else {
    const r2 = nextRisk(c.risk, (you === 'raise') + (rival === 'raise'));
    const roll = u(s, STREAM.dice, c);
    entry.after = r2; entry.roll = roll;
    c.risk = r2;
    if (roll < r2) { kind = 'disaster'; pay = { you: -P.disaster, rival: -P.disaster }; }
    else if (c.round >= P.rounds) { kind = 'exhausted'; pay = { you: c.val.you / 2, rival: c.val.rival / 2 }; }
  }
  c.log.push(entry);
  if (kind) {
    c.over = { kind, pay, text: OUT[kind] };
    s.done.push(c);
    s.cur = null;
    if (s.done.length >= CRISES.length) s.over = true;
  } else c.round++;
  return s;
}

/** Move to the next crisis once the current one is over. */
export function nextCrisis(s0) {
  const s = clone(s0);
  if (s.cur || s.over) return s;
  const i = s.done.length;
  s.cur = startCrisis(i, s.types[i]);
  return s;
}

/** Series tally: points and crises won (the Rival's points too). */
export function tally(s) {
  const t = { you: 0, rival: 0, wins: 0, losses: 0, splits: 0, disasters: 0 };
  for (const c of s.done) {
    t.you += c.over.pay.you; t.rival += c.over.pay.rival;
    if (c.over.kind === 'win') t.wins++;
    else if (c.over.kind === 'lose') t.losses++;
    else if (c.over.kind === 'disaster') t.disasters++;
    else t.splits++;
  }
  t.you = Math.round(t.you * 10) / 10; t.rival = Math.round(t.rival * 10) / 10;
  return t;
}

/** Play a whole series with a chooser(seriesState) → your action for each round. */
export function playOut(s, chooser) {
  while (!s.over) {
    if (!s.cur) s = nextCrisis(s);
    s = playRound(s, chooser(s));
  }
  return s;
}

/* ---------- Copy link: seed plus your choices, replayed from scratch ---------- */
const CODE = { raise: 'r', hold: 'h', back: 'b' };
const UNCODE = { r: 'raise', h: 'hold', b: 'back' };
export function encode(s) {
  const crises = [...s.done, ...(s.cur ? [s.cur] : [])].map(c => c.log.map(l => CODE[l.you]).join(''));
  return `v1.${s.seed}.${crises.join('-')}`;
}
export function decode(str) {
  const m = String(str).match(/^v1\.(\d{1,9})\.([rhb-]*)$/);
  if (!m) return null;
  const moves = m[2] ? m[2].split('-').map(x => [...x].map(ch => UNCODE[ch])) : [];
  return { seed: +m[1], moves };
}
/** Rebuild a series from a decoded link. Stops early if the link holds more moves than the game allows. */
export function replay({ seed, moves }) {
  let s = newSeries(seed);
  for (let k = 0; k < moves.length && !s.over; k++) {
    if (k > 0) s = nextCrisis(s);
    if (!s.cur) break;
    for (const a of moves[k]) { if (!s.cur) break; s = playRound(s, a); }
  }
  return s;
}
