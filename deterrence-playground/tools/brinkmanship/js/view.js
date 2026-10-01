// Drawing: the risk meter, belief bars, series dots, round log and the overlay / debrief tables. DOM only, no rules.
import { P, TYPES, TYPE, ACTIONS, ACT, CRISES, value } from '../data/params.js';
import { nextRisk } from './ai.js';

const pct = (x, d = 0) => `${(x * 100).toFixed(d)}%`;
const pts = x => (Math.round(x * 10) / 10).toLocaleString('en-US');
const sgn = x => (x > 0 ? '+' : x < 0 ? '−' : '') + pts(Math.abs(x));
export { pct, pts, sgn };

/** The risk meter: a 0–60% gauge with the current risk, and a marker for next round if both hold. */
export function paintMeter(el, risk) {
  const W = 320, H = 96, x0 = 10, x1 = 310, y = 62, max = P.riskCap;
  const X = r => x0 + (x1 - x0) * Math.min(1, r / max);
  const hold = nextRisk(risk, 0), both = nextRisk(risk, 2);
  let ticks = '';
  for (let r = 0; r <= max + 1e-9; r += 0.1) ticks += `<line x1="${X(r)}" x2="${X(r)}" y1="${y + 12}" y2="${y + 17}" stroke="var(--muted)"/><text x="${X(r)}" y="${y + 30}" font-size="10" text-anchor="middle" fill="var(--muted)" font-family="var(--mono)">${Math.round(r * 100)}</text>`;
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H + 8}" aria-hidden="true">
    <text class="pct" x="${x0}" y="40">${pct(risk)}</text>
    <text x="${x1}" y="40" text-anchor="end" font-size="11.5" fill="var(--muted)">chance of disaster</text>
    <rect x="${x0}" y="${y - 8}" width="${x1 - x0}" height="18" rx="3" fill="var(--chip)"/>
    <rect x="${x0}" y="${y - 8}" width="${X(both) - x0}" height="18" rx="3" fill="color-mix(in srgb, var(--bad) 14%, transparent)"/>
    <rect x="${x0}" y="${y - 8}" width="${X(risk) - x0}" height="18" rx="3" fill="var(--bad)"/>
    <line x1="${X(hold)}" x2="${X(hold)}" y1="${y - 12}" y2="${y + 14}" stroke="var(--ink)" stroke-dasharray="3 2"/>
    ${ticks}</svg>`;
  el.setAttribute('aria-valuenow', Math.round(risk * 100));
  el.setAttribute('aria-valuetext', `${pct(risk)} chance of disaster`);
  return { hold, both };
}

/** Belief bars: a probability for each resolve type. */
export function beliefHTML(b, color) {
  return TYPES.map(t => `<div class="bk-belief" style="--c:${color}"><span>${TYPE[t].short}</span><span class="bar"><span style="width:${(b[t] * 100).toFixed(1)}%"></span></span><span class="num">${pct(b[t])}</span></div>`).join('');
}

export function paintReads(el, c) {
  el.innerHTML = `<div class="bk-read"><h3>Your read of the Rival</h3><p class="fine">How likely each resolve is, from its moves so far (Bayes' rule).</p>${beliefHTML(c.bel.you, 'var(--riv)')}</div>
    <div class="bk-read"><h3>The Rival's read of you</h3><p class="fine">It is reading your moves the same way. Raising makes you look resolved.</p>${beliefHTML(c.bel.rival, 'var(--you)')}</div>`;
}

export function paintStake(el, c) {
  const cr = CRISES[c.i];
  el.innerHTML = `<dl>
      <dt>Stake (medium resolve)</dt><dd>${cr.stake}</dd>
      <dt>Worth to you if you win</dt><dd>${value(cr, c.types.you)}</dd>
      <dt>Disaster costs each side</dt><dd>${P.disaster}</dd>
    </dl>
    <p class="me"><b>Your resolve: ${TYPE[c.types.you].label.toLowerCase()}.</b> ${TYPE[c.types.you].text} Only you know this.</p>`;
}

const KIND_DOT = { win: 'win', lose: 'lose', split: 'split', exhausted: 'split', disaster: 'disaster' };
const KIND_TXT = { win: 'won', lose: 'lost', split: 'split', exhausted: 'split', disaster: 'disaster' };
export function paintDots(el, s) {
  el.innerHTML = CRISES.map((cr, i) => {
    const d = s.done[i];
    const cls = d ? KIND_DOT[d.over.kind] : (s.cur && s.cur.i === i ? 'now' : '');
    const label = `Crisis ${i + 1}: ${d ? KIND_TXT[d.over.kind] : s.cur && s.cur.i === i ? 'in progress' : 'to come'}`;
    return `<li class="${cls}" aria-label="${label}" title="${cr.name}: ${d ? KIND_TXT[d.over.kind] : '…'}">${i + 1}</li>`;
  }).join('');
}

export const verb = { raise: 'raised the risk', hold: 'held', back: 'backed down' };
/** One line of the round log. */
export function logLine(l, over) {
  const head = `Round ${l.round}: <span class="y">you</span> ${verb[l.you]}, <span class="r">the Rival</span> ${verb[l.rival]}.`;
  if (l.after === undefined) return { cls: over?.kind || '', html: `${head} ${over ? over.text : ''}` };
  const roll = `Risk ${pct(l.risk)} → ${pct(l.after)}; the die rolled ${pct(l.roll)}`;
  if (over?.kind === 'disaster') return { cls: 'disaster', html: `${head} ${roll}: under the risk. <b>Disaster.</b>` };
  return { cls: over?.kind || '', html: `${head} ${roll}: safe.${over ? ' ' + over.text : ''}` };
}

const lbl = a => ACT[a].short;
/** The "what equilibrium play would do" table for one finished crisis. rows: [{ l, eq, ev }]. */
export function eqTableHTML(rows) {
  const head = `<thead><tr><th>Round</th><th>Risk</th><th>You</th><th>Rival</th><th>Equilibrium play</th>${ACTIONS.map(a => `<th>${lbl(a)}</th>`).join('')}</tr></thead>`;
  const body = rows.map(({ l, eq, ev }) => {
    const best = ACTIONS.reduce((b, a) => (ev[a] > ev[b] ? a : b), 'hold');
    const agree = eq.best === l.you;
    return `<tr><td>${l.round}</td><td class="num">${pct(l.risk)}</td><td>${lbl(l.you)}</td><td>${lbl(l.rival)}</td>
      <td class="${agree ? 'agree' : 'differ'}">${lbl(eq.best)} <span class="muted">(${pct(eq.p[eq.best])})</span>${agree ? ' ✓' : ''}</td>
      ${ACTIONS.map(a => `<td class="num${a === l.you ? ' mine' : ''}${a === best ? ' best' : ''}">${sgn(ev[a])}</td>`).join('')}</tr>`;
  }).join('');
  return `<caption class="fine" style="text-align:left;caption-side:bottom;padding:6px 8px">Columns ${ACTIONS.map(lbl).join(', ')}: expected points from that round on.</caption>${head}<tbody>${body}</tbody>`;
}

/** Debrief block for one crisis: revealed resolves, outcome, and hindsight values at each decision. */
export function hindHTML(c, rows) {
  const cr = CRISES[c.i];
  const lines = rows.map(({ l, ev }) => {
    const best = ACTIONS.reduce((b, a) => (ev[a] > ev[b] ? a : b), 'hold');
    return `<tr><td>${l.round}</td><td class="num">${pct(l.risk)}</td><td class="num">${pct(l.belBefore.you[c.types.rival])}</td>${ACTIONS.map(a => `<td class="num${a === l.you ? ' mine' : ''}${a === best ? ' best' : ''}">${sgn(ev[a])}</td>`).join('')}</tr>`;
  }).join('');
  return `<div class="bk-hc"><h4>${c.i + 1}. ${cr.name}: ${KIND_TXT[c.over.kind]}, ${sgn(c.over.pay.you)} points</h4>
    <p>You: ${TYPE[c.types.you].label.toLowerCase()} (stake worth ${c.val.you}). The Rival: <b>${TYPE[c.types.rival].label.toLowerCase()}</b> (worth ${c.val.rival} to it).</p>
    <div class="tablewrap"><table class="bk-h"><thead><tr><th>Round</th><th>Risk</th><th>Your read: its true type</th>${ACTIONS.map(a => `<th>${lbl(a)}</th>`).join('')}</tr></thead><tbody>${lines}</tbody></table></div></div>`;
}

/** Plain-language headline for the series. */
export function seriesHeadline(t) {
  if (t.wins > t.losses) return `You took the series, ${t.wins} crises to ${t.losses}.`;
  if (t.wins < t.losses) return `The Rival took the series, ${t.losses} crises to ${t.wins}.`;
  return `The series is level, ${t.wins} crises each.`;
}
