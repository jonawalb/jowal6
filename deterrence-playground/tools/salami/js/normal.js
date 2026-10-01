// Normalization: what the Power does unanswered becomes the new normal at the shoal. Pure functions on game state.
import { P, LEVELS, NORM } from '../data/params.js';

const clamp = v => Math.max(0, Math.min(100, v));
export const newNorm = () => ({
  norm: Object.fromEntries(NORM.rungs.map(r => [r, false])),
  uses: Object.fromEntries(NORM.rungs.map(r => [r, []])),
  since: Object.fromEntries(NORM.rungs.map(r => [r, 0])),
});

/** Does this Coastal move answer the Power's rung this month? Only when the rung actually met something. */
export const isAnswer = (c, L, enc) => !!enc && (c.msg !== 'quiet' || c.method === 'press' || c.method === 'patron'
  || (c.method === 'cg' && c.push && L >= 1 && L <= 4));
/** Protested or went to court in `after` of the last `months` months: the voice is wearing thin. */
export const voiceTired = s => s.history.slice(-NORM.fatigue.months).filter(h => h.c.msg !== 'quiet').length >= NORM.fatigue.after;
/** Is the rung the Power is using a normal one (status at the start of the month)? */
export const isNormal = (s, L) => !!s.norm?.[L];
/** Highest normal rung (0 if none). */
export const baseline = s => NORM.rungs.reduce((b, r) => (s.norm?.[r] ? r : b), 0);
/** Unanswered uses of rung r counted in the window that ends with month t. */
export const unanswered = (s, r, t = s.turn) => s.uses[r].filter(u => !u.a && u.t > t - NORM.window && u.t >= s.since[r]).length;

/** Per-rung counters for the screen, as of the coming month. */
export function counters(s) {
  return NORM.rungs.map(r => {
    const recent = s.uses[r].filter(u => u.t >= s.since[r]).slice(-NORM.rollback.of);
    return { r, label: LEVELS[r].label, normal: !!s.norm[r], count: unanswered(s, r), answeredOfLast: recent.filter(u => u.a).length, lastUses: recent.length };
  });
}

function setNormal(s, r, on) {
  for (const k of NORM.rungs) if (on ? k <= r : k >= r) { s.norm[k] = on; if (!on) s.since[k] = s.turn + 1; }
}

/** Record this month's use, then normalize or roll back. Mutates s; returns log lines. */
export function updateNorm(s, { c, L, enc, resp, statement }) {
  const log = [], ans = isAnswer(c, L, enc), before = baseline(s);
  if (enc) for (const r of NORM.rungs) if (r <= L) s.uses[r].push({ t: s.turn, a: ans });
  // Normalize: the highest rung with enough unanswered uses (lower rungs come with it).
  const top = NORM.rungs.filter(r => !s.norm[r] && unanswered(s, r) >= NORM.need).pop();
  if (top) {
    setNormal(s, top, true);
    const o = NORM.onNormalize;
    s.sympathy = clamp(s.sympathy + o.sympathy); s.cred = clamp(s.cred + o.cred); s.domC = clamp(s.domC + o.domC);
    log.push({ kind: 'normal', tone: 'bad', text: `${LEVELS[top].label} is now normal at the shoal: used unanswered ${NORM.need} times in ${NORM.window} months. It will draw less sympathy and the Patron will see it as a rung milder (sympathy ${o.sympathy}, Patron credibility ${o.cred}).` });
  }
  // Roll back: a strong answer streak, a Patron warning or intervention at that rung, or an explicit Patron statement.
  for (const r of NORM.rungs.slice().reverse()) {
    if (!s.norm[r] || r === top) continue;
    const recent = s.uses[r].filter(u => u.t >= s.since[r]).slice(-NORM.rollback.of);
    if (recent.length >= NORM.rollback.of - 1 && recent.filter(u => u.a).length >= NORM.rollback.answered) {
      setNormal(s, r, false);
      log.push({ kind: 'contested', tone: 'good', text: `${LEVELS[r].label} is contested again: the Coastal State answered ${NORM.rollback.answered} of its last ${recent.length} uses.` });
    }
  }
  const objected = enc && (resp === 'warning' || resp === 'intervene') && L >= 1;
  const hit = objected ? Math.min(L, 4) : statement === 'explicit' ? baseline(s) : 0;
  if (hit && s.norm[hit]) {
    setNormal(s, hit, false);
    log.push({ kind: 'contested', tone: 'good', text: `${LEVELS[hit].label} is contested again: the Patron ${objected ? 'objected to it this month' : 'spelled out that its treaty covers the shoal'}.` });
  }
  if (baseline(s) !== before && !log.length) log.push({ kind: 'normal', text: `The normal at the shoal is now ${baseline(s) ? LEVELS[baseline(s)].label.toLowerCase() : 'nothing'}.` });
  return { log, answered: ans, base: baseline(s) };
}
