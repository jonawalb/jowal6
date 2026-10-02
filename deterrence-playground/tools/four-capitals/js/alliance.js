// Alliance friction (Batch B): U.S. operations flown or sailed from a partner's bases need the host's consent each
// time they are used. Japan (Okinawa and the home islands) for strikes in the North, Strait and East and on the
// mainland; the Philippines for strikes in the South and escorts by the southern route. The host weighs its own
// politics, the threat to itself and the coalition's cohesion; Japan's standing basing policy (jp_basing opens the
// bases, jp_limit limits them) sets its starting point. Below a cohesion of 45, partners' aims diverge. The same
// rule decides for a human or a computer Japan (the cabinet's consent, not a per-use dialog). Illustrative.
import { P } from '../data/params.js';

const A = P.alliance;
export const HOST_NAME = { jp: 'Tokyo', ph: 'Manila' };
const pts = x => Math.round(x * 100);

/** Which host must consent to this use of move `id` with answers `o` ('jp', 'ph' or null). */
export function hostFor(id, o = {}) {
  if (id === 'us_mainland') return 'jp';
  if (id === 'us_strike') return (o.area || 'strait') === 'south' ? 'ph' : 'jp';
  if (id === 'us_escort') return (o.route || 'south') === 'south' ? 'ph' : null;
  return null;
}

/** The host's chance of consenting this month: { p, factors: [[label, points]] }, kept within 5–95%. */
export function consent(s, host) {
  const f = [];
  if (host === 'jp') {
    f.push([s.basing === 'open' ? 'Japan has opened its bases' : s.basing === 'limited' ? 'Japan limits its bases to defence' : 'No standing basing decision', pts(A.base[s.basing] ?? A.base.peacetime)]);
    f.push(['Japan’s home support', pts(A.support * (s.c.jp.support - 50))]);
    if (s.struck.jp > 0) f.push(['Japan has been struck: already in the fight', pts(A.struck)]);
    if (s.jpDeclared) f.push(['Survival-threatening situation declared', pts(A.declared)]);
    if (s.jpCabinet) f.push([s.jpCabinet === 'firm' ? 'A firmer cabinet after the election' : 'A warier cabinet after the election', pts(A.cabinet[s.jpCabinet])]);
  } else {
    f.push(['Manila’s starting stance', pts(A.base.ph)]);
    if (s.ctrl?.south === 'red') f.push(['China holds the Luzon Strait', pts(A.chinaSouth)]);
  }
  f.push(['Coalition cohesion', pts(A.coal * (s.coal - 60))]);
  f.push(['Fear of nuclear escalation', pts(-A.nuke * Math.max(0, s.nuke - 30))]);
  if (s.coal < A.diverge.coal) f.push(['Partners’ aims diverge', pts(A.diverge.consent)]);
  const out = f.filter(([, d]) => d !== 0);
  const p = Math.max(0.05, Math.min(0.95, out.reduce((t, [, d]) => t + d, 0) / 100));
  return { p, factors: out };
}

/** Constraint chips from the alliance for a move (see js/politics.js). */
export function allianceConstraints(s, who, id, o = {}) {
  const out = [], host = hostFor(id, o);
  if (who === 'us' && host) {
    const c = consent(s, host), n = Math.round(c.p * 100);
    out.push({ text: `Needs ${HOST_NAME[host]}’s consent (${n}%)`, title: `${HOST_NAME[host]} must agree each time`,
      lines: [`${n}% chance ${HOST_NAME[host]} lets you use its bases this month:`, ...c.factors.map(([l, d]) => `${l}: ${d > 0 ? '+' : '−'}${Math.abs(d)}`)],
      notes: ['If the host refuses, the move is not carried out and its cost is refunded. Kept between 5% and 95%.'], extra: {} });
  }
  if (s.coal < A.diverge.coal && ['us_rally', 'tw_lobby'].includes(id))
    out.push({ text: `Aims diverge ${A.diverge.rally}`, title: 'Partners’ aims diverge', lines: [`Coalition cohesion is below ${A.diverge.coal}: each partner weighs its own exposure first.`], notes: [], extra: { d: ['Partners’ aims diverge', A.diverge.rally] } });
  return out;
}
