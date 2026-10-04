// The hour in one sentence. Built only from events of the last hour that the player could see, addressing the
// player as "you". Pure: tldr(g, me, t) → { text, facts }, where facts are the events used (tests check each one
// happened in hour t and was visible to `me`). Also exports the small text helpers story.js uses.
//
// Event contract (W1-A emits these into g.events; see docs/DECISIONS.md "W1-D: event contract"):
//   every event: { t, kind, side, sec?, unit?, vis? }. `side` is the side the event belongs to (below);
//   `vis` (optional) lists the sides that saw it. Without `vis`, only `side` saw it (the safe default).
//   objective    side = attacker; held, prevHeld, need (contiguous objective sectors held)
//   breakthrough side = attacker; sec
//   lodgment     side = side that took the sector; sec
//   retaken      side = side that took it back; sec; by = 'riposte' | 'counterstroke' | 'assault'
//   overrun      side = side of the unit overrun; unit, sec
//   counter      side = counterattacking side; how = 'riposte' | 'counterstroke'; sec; won; ca; window = [t0, t1] | null
//   lift         side = side whose barrage it was; sec; case = 'early' | 'gap' | 'late'
//   enfilade     side = side of the MG that fired; unit (the MG); sec; loss (strength points inflicted)
//   detect       side = side that spotted the infiltrator; unit (the infiltrator); sec
//   infiltrate   side = infiltrator's side; unit; sec; detected = false (review only)
//   stall        side = assaulting side; sec; gauge
//   located      side = side that located the battery; unit (the battery)
//   contact      side = side that made first contact; sec        break  side = side of the unit; unit, sec
//   laneLost     side = side of the MG; unit (the MG), sec (where it is now); vis = [its side] (it moved off its lane)

const START_HOUR = 5;          // every scale starts at 05:00 (SPEC §2.2)
export const BIG_ENFILADE = 2; // strength points; below this an enfilade hit is not news (NOTIONAL)

export const hhmm = t => `${String((START_HOUR + t) % 24).padStart(2, '0')}:00`;
const COL = i => (i < 26 ? String.fromCharCode(65 + i) : `A${String.fromCharCode(39 + i)}`);

/** A sector's name: its village or wood if it has one, else a grid reference such as "C7". */
export function place(g, sec) {
  if (sec == null) return 'the front';
  const nm = g.sectors?.name?.[sec] ?? g.names?.[sec];
  if (nm) return nm;
  const cols = g.cols || 1;
  return `${COL(sec % cols)}${Math.floor(sec / cols) + 1}`;
}

const TYPE_WORD = { rifle: 'rifle company', storm: 'storm company', mg: 'MG company', mortar: 'mortar company', pioneer: 'pioneer company',
  tank: 'tank unit', field: 'field battery', heavy: 'heavy battery', drone: 'drone team', ew: 'EW team' };
const unitOf = (g, id) => (g.units || []).find(u => u.id === id) || null;

/** Your unit by name; an enemy unit only by type (you never see its name). */
export function unitLabel(g, id, me) {
  const u = unitOf(g, id);
  if (!u) return me ? 'a unit' : 'the unit';
  if (u.side === me) return u.name || u.short || String(u.id);
  const w = u.typeName || TYPE_WORD[u.type] || 'unit';   // era-correct name ("Infantry company" in the modern era)
  return `an enemy ${/^[A-Z]{2}/.test(w) ? w : w[0].toLowerCase() + w.slice(1)}`;
}

/** Could `me` see event e? */
export const visibleTo = (e, me) => (Array.isArray(e.vis) ? e.vis.includes(me) : e.side === me);

const mine = (e, me) => e.side === me;
const cap = s => s[0].toUpperCase() + s.slice(1);

// Clause builders, in priority order (SPEC §7.3). Each returns a clause or null.
const CLAUSE = {
  objective: (g, e, me) => {
    const up = e.held > e.prevHeld, n = `${e.held} of the ${e.need} side-by-side objective sectors`;
    if (mine(e, me)) return up ? `you now hold ${n} you need` : `your hold on the objective line fell to ${n} you need`;
    return up ? `the enemy now holds ${n} he needs to beat you` : `you pushed the enemy back to ${n} he needs`;
  },
  breakthrough: (g, e, me) => (mine(e, me) ? `you broke through at ${place(g, e.sec)}` : `the enemy broke through your line at ${place(g, e.sec)}`),
  lodgment: (g, e, me) => (mine(e, me) ? `you took ${place(g, e.sec)}` : `the enemy took ${place(g, e.sec)} from you`),
  retaken: (g, e, me) => {
    const by = e.by && e.by !== 'assault' ? e.by : 'counterattack';
    return mine(e, me) ? `your ${by} retook ${place(g, e.sec)}` : `an enemy ${by} retook ${place(g, e.sec)} from you`;
  },
  overrun: (g, e, me) => (mine(e, me) ? `your ${unitLabel(g, e.unit, me)} was overrun at ${place(g, e.sec)}` : `you overran ${unitLabel(g, e.unit, me)} at ${place(g, e.sec)}`),
  counter: (g, e, me) => {
    const how = CA_WORD[e.how] || e.how;
    if (mine(e, me)) return e.won ? `your ${how} at ${place(g, e.sec)} went in and succeeded` : `your ${how} at ${place(g, e.sec)} stalled`;
    return e.won ? `an enemy ${how} threw you out of ${place(g, e.sec)}` : `you beat off an enemy ${how} at ${place(g, e.sec)}`;
  },
  lift: (g, e, me) => {
    const p = place(g, e.sec);
    if (e.case === 'late') return mine(e, me) ? `your infantry walked into its own barrage at ${p}` : `his infantry walked into their own barrage in front of your men at ${p}`;
    return mine(e, me) ? `your barrage lifted early at ${p}, so the defenders were firing when your infantry arrived` : `his barrage lifted early at ${p} and your men manned the parapet`;
  },
  enfilade: (g, e, me) => (mine(e, me) ? `your ${unitLabel(g, e.unit, me)} caught attackers along its lane at ${place(g, e.sec)}` : `an enemy MG lane caught your men from the flank at ${place(g, e.sec)}`),
  detect: (g, e, me) => (mine(e, me) ? `you spotted infiltrators at ${place(g, e.sec)}` : `your infiltrators were spotted at ${place(g, e.sec)}`),
  stall: (g, e, me) => (mine(e, me) ? `your ${e.side === 'def' ? 'counterattack' : 'assault'} stalled at ${place(g, e.sec)}` : `you stopped an assault at ${place(g, e.sec)}`),
  located: (g, e, me) => (mine(e, me) ? 'you located an enemy battery' : `the enemy located your ${unitLabel(g, e.unit, me)}`),
  laneLost: (g, e, me) => (mine(e, me) ? `your ${unitLabel(g, e.unit, me)} moved and lost its lane: lay it again` : ''),
};
const ORDER = Object.keys(CLAUSE);
// 2026-10-04: the names on the order buttons, not the jargon (a riposte is the "Local counterattack" button).
const CA_WORD = { riposte: 'local counterattack', counterstroke: 'deliberate counterattack' };

/** Events of hour t that `me` could see and that make news, highest priority first. */
export function newsOf(g, me, t) {
  return (g.events || [])
    .filter(e => e.t === t && CLAUSE[e.kind] && visibleTo(e, me))
    .filter(e => e.kind !== 'lift' || ['early', 'gap', 'late'].includes(e.case))
    .filter(e => e.kind !== 'enfilade' || e.loss == null || e.loss >= BIG_ENFILADE)
    .filter(e => e.kind !== 'objective' || e.held !== e.prevHeld)
    // 2026-10-04 fix: a failed counterattack also logs a stall in the same sector; say it once (it read
    // "your riposte at C3 stalled; your counterstroke stalled at C3").
    .filter(e => !(e.kind === 'stall' && e.side === 'def' && (g.events || []).some(x => x.kind === 'counter' && x.t === e.t && x.sec === e.sec)))
    .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}

/** One sentence (at most two clauses) about hour t for the player on side `me`. */
export function tldr(g, me, t) {
  const news = newsOf(g, me, t), facts = [], parts = [];
  for (const e of news) {
    if (parts.length >= 2) break;
    // Same kind twice: say how many instead of listing them.
    if (facts.some(f => f.kind === e.kind && f.side === e.side)) continue;
    const same = news.filter(x => x.kind === e.kind && x.side === e.side);
    let c = CLAUSE[e.kind](g, e, me);
    if (same.length > 1 && (e.kind === 'lodgment' || e.kind === 'stall' || e.kind === 'overrun')) {
      const more = ` and ${same.length - 1} more sector${same.length > 2 ? 's' : ''}`;
      c = c.endsWith(' from you') ? `${c.slice(0, -9)}${more} from you` : c + more;
    }
    parts.push(c);
    facts.push(e);
  }
  if (!parts.length) return { text: 'A quiet hour: nothing changed that you could see.', facts };
  return { text: `${cap(parts.join('; '))}.`, facts };
}
