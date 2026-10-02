// Which orders do something for which unit (UI streamline #8, greyed-out form) and what each choice does (#7
// tooltips). Pure: reads data/units.js only. The mapping was read off the engine (orders.js, move.js, fire.js,
// vision.js, assault.js, counter.js, engine.js); it never changes what the engine accepts. An order is greyed
// only when the engine rejects it (`rejects`) or provably never reads it for that unit (`ignored`); anything
// doubtful stays active. scripts/order-effects.test.mjs cross-checks the rejections against issue().
import { TYPES } from '../../data/units.js';

/** One-line effect of each choice, for the button's tooltip (#7). Plain words, doctrinal term in brackets. */
export const EFFECT = {
  posture: {
    rush: 'Rush: fastest and most exposed to fire',
    infil: 'Infiltrate: slips past enemy posts on covered routes; hard to spot until seen (storm companies best)',
    hold: 'Hold: stay and fight where it is',
    consolidate: 'Consolidate: dig in on the ground taken; recovers cohesion and secures a lodgment',
    withdraw: 'Withdraw: may break contact and fall back to its destination',
  },
  stance: {
    hold: 'Hold: fights for the sector; overrun if the assault is strong enough',
    elastic: 'Give ground (elastic): yields a row instead of being overrun',
    delay: 'Delay: fights one hour in contact, then falls back a row',
    riposte: 'Local counterattack (riposte): strikes a fresh lodgment next to it while the window is open',
    reserve: 'Reserve: waits for your orders (fights like Hold if attacked)',
  },
  form: {
    waves: 'Waves: easier to control, but flanking fire along the line hits three times as many',
    groups: 'Small groups: harder to spot and to enfilade',
  },
  mode: {
    normal: 'Normal: the direct route',
    covered: 'Covered: slower, by communication trenches and covered ground; safer under observation',
    road: 'Road: fast behind your own lines, but a column on the move is easy to enfilade',
  },
  tool: {
    move: 'Move: tap the sector it should go to', lane: 'Fire lane: tap a sector up to three away; across the front it enfilades',
    riposte: 'Local counterattack: tap a fresh lodgment next to it', breach: 'Breach: clear a lane through wire or mines (2 hours there)',
    displace: 'Displace: move the guns; no fire while they move, and the enemy loses their location',
  },
};

const on = () => ({ active: true, reason: '' });
const off = (reason, rejects = false) => ({ active: false, reason, rejects });
const each = (keys, f) => Object.fromEntries(keys.map(k => [k, f(k)]));

/** Unit category: 'bat' battery, 'team' drone or EW team, 'veh' tank, 'inf' company on foot. */
export const catOf = type => (TYPES[type] ? TYPES[type].cat : 'inf');

/**
 * Orders for a unit of `type` on `side` in a situation: { lodgNext: a fresh lodgment is next to it, era, rocket }.
 * Returns { posture, stance, form, mode, tool, mission } → { [value]: { active, reason, rejects } }.
 * `rejects` = the engine refuses it (the button is disabled); otherwise a greyed order is only ignored.
 */
export function orderEffects(type, side, sit = {}) {
  const T = TYPES[type] || {}, cat = catOf(type), bat = cat === 'bat', team = cat === 'team', co = cat === 'inf' || cat === 'veh';
  const what = bat ? 'artillery' : team ? 'drone and EW teams' : '';
  const posture = each(Object.keys(EFFECT.posture), () => (bat ? off('No effect for artillery: batteries have no posture', true) : on()));
  const stance = each(Object.keys(EFFECT.stance), () => (co && side === 'def' ? on()
    : side === 'att' ? off('No effect for attacking units: stance is a defender’s order') : off(`No effect for ${what}: stance only matters for companies in an assault`)));
  const form = each(Object.keys(EFFECT.form), () => on());
  const mode = each(Object.keys(EFFECT.mode), () => (bat ? off('No effect for artillery: batteries don’t move by route') : on()));
  const tool = {
    move: bat ? off('Batteries don’t move: use Displace', true) : on(),
    lane: type === 'mg' ? on() : off('Only MG companies lay fire lanes', true),
    riposte: side !== 'def' ? off('A defender’s order', true) : !co ? off(`No effect for ${what}: only companies counterattack`, true)
      : sit.lodgNext ? on() : off('Available when a fresh enemy lodgment is next to it', true),
    breach: bat ? off('Batteries don’t move', true) : T.engineer ? on() : off('No effect: only pioneer companies clear wire and mines'),
    displace: bat ? on() : off('Batteries only', true),
  };
  const mission = bat ? {
    suppress: on(), destroy: on(), smoke: on(), cb: on(),
    gas: sit.era === 'm' ? off('No gas in the modern era', true) : on(),
    precision: T.precision ? on() : off('Rocket batteries only', true),
  } : {};
  return { posture, stance, form, mode, tool, mission };
}
