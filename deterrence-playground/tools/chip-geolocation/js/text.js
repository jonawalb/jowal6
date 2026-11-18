// Verdict and feedback copy for "Where Is the Chip?".
import { SPEEDS, LINKS } from './geo.js';

const pct = v => (v > 0 && v < 0.01 ? '<1%' : Math.round(v * 100) + '%');

export function verifierVerdict(v, S) {
  const R = S.ruleout, T = S.ruleTag || R, sp = SPEEDS[S.verifier].label.toLowerCase();
  if (!S.lms.length) return { s: 'warn', tag: 'Add a landmark', text: 'With no landmark there is no bound: the chip could be anywhere. Click a city dot or use the panel.' };
  switch (v.key) {
    case 'empty': return { s: 'bad', tag: 'No consistent location', text: `The circles do not overlap, so no place on Earth fits every measurement. Some reply arrived faster than the verifier's speed limit (${sp}) allows: a sign of tampering, or that the assumed speed is too low.` };
    case 'ruledout': return { s: 'good', tag: `${T} ruled out`, text: `No sampled part of the feasible region (grid ≈ ${v.gridKm} km, boundary every ≈ 3 km, borders at ≈ 14 km) lies in ${R}. ${S.verifier === 'vacuum' ? 'Nothing travels faster than light in vacuum, so this holds against any trick short of stealing the chip\'s key or compromising a landmark server.' : `This holds only if no link beats the assumed speed (${sp}).`}` };
    case 'proven': return { s: 'bad', tag: `Chip is in ${T}`, text: `Every point of the feasible region lies in ${R}. ${S.verifier === 'vacuum' ? 'The chip cannot be anywhere else.' : 'Under the assumed speed, the chip cannot be anywhere else.'}` };
    case 'fooled': return { s: 'bad', tag: 'Verifier fooled', text: `The region excludes ${R}, but the chip is in ${R}. A reply beat the verifier's speed limit (${sp}).` };
    default: return { s: 'warn', tag: `Cannot rule out ${T}`, text: `${v.shareR > 0 ? pct(v.shareR) + ' of the feasible region lies' : 'Part of the feasible region\'s edge lies'} in ${R}. ${!v.chipFeasible ? 'The chip itself sits outside at least one circle: its link beat the verifier\'s speed limit.' : S.mode === 'attack' ? '' : (S.simple ? (S.lmAtChip ? 'An honest chip here would fail a strict check. A landmark already sits in the chip\'s city, and network delay alone keeps its circle wide enough to cross the border, so extra landmarks barely shrink it. Move the chip farther from the border with "Put the chip in". Full detail lets you change the network speed.' : 'An honest chip here would fail a strict check. Put a landmark closer to the chip, or move the chip farther from the border. Full detail lets you change the network speed.') : 'An honest chip here would fail a strict check. Put a landmark closer, or lower the network delay.')}` };
  }
}

export function attackVerdict(v, S) {
  const R = S.ruleout, T = S.ruleTag || R, K = S.claim;
  if (!S.lms.length) return { s: 'warn', tag: 'No landmarks', text: 'Nothing to fool yet. Add landmarks in the panel.' };
  if (!v.chipInR) return { s: 'warn', tag: 'Not smuggled', text: `Your chip is outside ${R}. Move it into ${R} to play the smuggler.` };
  if (v.key === 'empty') return { s: 'good', tag: 'Caught: impossible timings', text: 'Your replies beat the verifier\'s speed limit by so much that no location fits. The verifier sees tampering.' };
  if (v.pass && v.key === 'fooled') return { s: 'bad', tag: 'You fooled the verifier', text: `The region excludes ${R} and reaches ${K}. Your ${LINKS[S.link].label.toLowerCase()} beat a verifier that assumed ${SPEEDS[S.verifier].label.toLowerCase()}.` };
  if (v.pass) return { s: 'bad', tag: 'Passed on ambiguity', text: `The verifier cannot prove the chip is in ${R}, and the region reaches ${K}. A lenient policy lets it through.` };
  if (v.key === 'proven') return { s: 'good', tag: `Caught: proven in ${T}`, text: `The whole feasible region lies in ${R}.` };
  if (!v.claimOk) return { s: 'good', tag: `Claim fails`, text: `The feasible region does not reach ${K}, so the claim is false.` };
  return { s: 'warn', tag: 'Flagged, not proven', text: `The verifier cannot rule out ${R}, so a strict policy fails the chip. It has no proof the chip is in ${R}, and an honest chip near the border would look the same.` };
}

/** What each trick did, comparing against the same setup without tricks. */
export function trickNotes(S, cur, base, extraTotal, proxyAdded) {
  const out = [];
  const fmtA = a => a >= 1e6 ? (a / 1e6).toFixed(1) + ' million' : Math.round(a).toLocaleString('en-US');
  if (S.delay > 0 || extraTotal > 0)
    out.push(`Added delay grew the feasible area from ${fmtA(base.area)} to ${fmtA(cur.area)} km². Delay pushes every circle outward; it cannot move the region away from the chip.`);
  if (S.proxy !== '' && proxyAdded != null)
    out.push(`Relaying through the proxy added ${proxyAdded.toFixed(1)} ms to the average round trip. The chip still answers every challenge, so it stays inside every circle${S.verifier === 'vacuum' ? '' : ' unless its own link beats the speed limit'}.`);
  if (S.link !== 'internet') {
    out.push(cur.chipFeasible
      ? `Your ${LINKS[S.link].label.toLowerCase()} shortened the round trips, but not below the verifier's limit (${SPEEDS[S.verifier].label.toLowerCase()}). The chip remains inside every circle.`
      : `Your ${LINKS[S.link].label.toLowerCase()} beat the verifier's speed limit: the chip now sits outside at least one circle. Switch the verifier to light in vacuum and the trick stops working.`);
  }
  if (!out.length) out.push('No tricks yet. Try added delay, a proxy, a faster link, or move the chip toward the border.');
  return out;
}
