// Text for the log, the prompt, the debris outlook and the verdicts.
import { MISSIONS, TURNS, CRISIS_TURNS, SHELLS } from '../data/params.js';
import { ACTS } from './actions.js';
import { hazard } from './debris.js';

export const pct = (x, d = 0) => `${(100 * x).toFixed(d)}%`;
export const fmt = n => Math.round(n).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function actText(x, side) {
  if (!x || x.a === 'hold') return x && x.was ? `${ACTS[x.was].t}: not possible, held` : 'Hold';
  const A = ACTS[x.a], M = MISSIONS[x.m];
  const whose = A.on === 'enemy' ? (side === 'B' ? 'Red\'s' : 'your') : (side === 'B' ? 'your' : 'its');
  return `${A.t} ${x.a === 'prolif' ? '' : `${whose} ${M.short}`}`.trim();
}

export function logItem(hm) {
  const line = (x, side) => `<li class="${side === 'B' ? 'you' : 'red'}">${esc(actText(x, side))}${x.res ? `: ${esc(x.res)}` : ''}</li>`;
  return `<li><b>Month ${hm.t} · ${hm.phase === 'crisis' ? 'Crisis' : 'War'}</b>
    <ul>${hm.acts.B.map(x => line(x, 'B')).join('')}${hm.acts.R.map(x => line(x, 'R')).join('')}
    ${hm.ev.map(e => `<li class="warnline">${esc(e)}</li>`).join('')}
    <li class="muted">Escalation risk this month ${pct(hm.pTurn, 1)}; space support ${Math.round(hm.S.B * 100)} vs ${Math.round(hm.S.R * 100)}.</li>
    ${hm.escalated ? '<li class="warnline"><b>The crisis crossed the nuclear threshold.</b></li>' : ''}</ul></li>`;
}

export function promptFor(g, pending) {
  if (g.over) return { s: 'good', t: 'Game over', d: 'Read the after-action review below the orbits.' };
  const m = g.turn + 1, left = 2 - pending.length;
  if (m === 1 && !pending.length) return { s: 'warn', t: 'Your first move', d: 'It is month 1 of a crisis. A good start: pick Backups, then your Reconnaissance, so jamming hurts you less. Then pick Jam and Red\'s Navigation, and press End month.' };
  if (m === CRISIS_TURNS + 1 && !pending.length) return { s: 'bad', t: 'War begins', d: 'From now on each month counts fully toward the result. Red may reach for destructive weapons, and so can you.' };
  if (!left) return { s: 'good', t: 'Orders ready', d: 'Press End month. Red moves at the same time.' };
  return { s: 'warn', t: `Month ${m}: ${left} action${left > 1 ? 's' : ''} left`, d: m <= CRISIS_TURNS ? 'Crisis months count for a fifth as much as war months.' : `${TURNS - m + 1} war month${TURNS - m ? 's' : ''} to go.` };
}

/** Debris outlook panel: fragments now, hazard multiple against pre-war, and the projected legacy. */
export function outlookHtml(g, L, P, D0) {
  const row = s => {
    const z = hazard(s, g.debris[s], g.fresh[s], P), z0 = hazard(s, D0[s], 0, P);
    return `<dt>${SHELLS[s].name}</dt><dd>${fmt(g.debris[s])} fragments · risk ×${(z.total / z0.total).toFixed(1)} · ${(z.total * 1000).toFixed(1)} per 1,000 satellites a year</dd>`;
  };
  return `${row('low')}${row('high')}
    <dt>Next 25 years</dt><dd>${L.extra.B >= 0.5 || L.extra.R >= 0.5 || L.extra.O >= 0.5
      ? `about ${fmt(L.extra.B)} of your satellites, ${fmt(L.extra.R)} of Red's and ${fmt(L.extra.O)} of everyone else's lost to this war's debris`
      : 'no extra losses expected from this war\'s debris so far'}</dd>`;
}

export function verdicts(g, alt, L, Lalt) {
  const war = { blue: ['good', 'You held the edge'], red: ['bad', 'Red held the edge'], draw: ['warn', 'Stalemate'],
    escalation: ['bad', `Nuclear threshold crossed in month ${g.turn}`] }[g.outcome];
  const cp = 1 - Math.exp(-g.cumH), ca = 1 - Math.exp(-alt.cumH);
  const hi = g.debris.high, hiAlt = alt.debris.high;
  return {
    status: war,
    sub: g.outcome === 'escalation'
      ? `Red's posture was ${g.posture}. The crisis went nuclear, so everyone loses, whatever the advantage (${g.adv >= 0 ? '+' : ''}${g.adv.toFixed(2)}).`
      : `Red's posture was ${g.posture}. Advantage ${g.adv >= 0 ? '+' : ''}${g.adv.toFixed(2)}: +0.50 or more is your edge, −0.50 or less is Red's, in between a stalemate.`,
    cards: [
      ['The war', war[1], `Same months with reversible means only: ${({ blue: 'you held the edge', red: 'Red held the edge', draw: 'stalemate', escalation: `threshold crossed in month ${alt.turn}` })[alt.outcome]}.`],
      ['Escalation', `${pct(cp)} cumulative risk`, `Reversible only on the same dice: ${pct(ca)}.`],
      ['The orbit', `${fmt(hi)} fragments in high LEO`, `Reversible only: ${fmt(hiAlt)}. Extra satellites lost over 25 years: ${fmt(L.extra.B + L.extra.R + L.extra.O)} vs ${fmt(Lalt.extra.B + Lalt.extra.R + Lalt.extra.O)}.`],
    ],
  };
}
