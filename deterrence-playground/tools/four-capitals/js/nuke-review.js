// The nuclear review (Batch C), shown only at the end of the game: which moves and events pushed the nuclear shadow
// and by how much, month by month, and when it crossed 65 (above which, from Limited strikes up, each month carries a
// risk of nuclear use). Built from the ledger the engine keeps (s.nukeLog: every change to the shadow with its cause;
// data/ops.js). There is deliberately no live risk meter during play.
import { P } from '../data/params.js';
import { COUNTRIES } from '../data/countries.js';
import { BY_ID, OWNER } from '../data/actions.js';
import { EVENTS } from '../data/events.js';

const TH = P.nuclear.threshold;
const EV = Object.fromEntries(EVENTS.map(e => [e.id, e.title]));
const POSTURE = { nuke: 'Nuclear signal posture', esc: 'Escalate posture' };
const DRIFT = {
  losses: 'Heavy combat losses (each point lost above 4 in a month)', decay: 'Calm at Blockade or below: the shadow fades',
  war: 'Major war', worn: 'China’s forces worn down in a shooting war', floor: 'A shooting war keeps it at 10 or more', other: 'Other',
};

/** Words for a ledger cause key. */
export function causeLabel(c) {
  const [k, a, b] = c.split(':');
  if (k === 'move') return `${COUNTRIES[OWNER[a]].short}: ${BY_ID[a].label}`;
  if (k === 'forum') return `${COUNTRIES[OWNER[a]].short}: peace forum accepted`;
  if (k === 'posture') return `${COUNTRIES[a].short}: ${POSTURE[b] || 'posture'}`;
  if (k === 'event') return `World event: ${EV[a] || a}`;
  if (k === 'breach') return `${COUNTRIES[a].short} broke the ceasefire`;
  return DRIFT[k] || DRIFT.other;
}

/**
 * { start, end, peak, months: [{ turn, from, to, items: [{ c, label, d }] }], crossed: { turn, c, label } | null,
 *   above: months ending above 65, used: the month of nuclear use or null }.
 */
export function nukeReview(s) {
  const turns = [...new Set([...s.history.map(h => h.turn), ...s.nukeLog.map(e => e.turn)])].sort((a, b) => a - b);
  let v = s.nuke0, crossed = null, peak = v;
  const months = turns.map(turn => {
    const from = v, items = [];
    for (const e of s.nukeLog.filter(x => x.turn === turn)) {
      const was = v; v += e.d; peak = Math.max(peak, v);
      if (!crossed && was <= TH && v > TH) crossed = { turn, c: e.c, label: causeLabel(e.c) };
      if (Math.abs(e.d) >= 0.05) items.push({ c: e.c, label: causeLabel(e.c), d: e.d });
    }
    items.sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
    return { turn, from, to: v, items };
  });
  const used = s.nuclearUsed ? s.history.at(-1).turn : null;
  return { start: s.nuke0, end: v, peak, months, crossed, above: months.filter(m => m.to > TH).map(m => m.turn), used };
}

const r = x => Math.round(x);
const sg = d => `${d > 0 ? '+' : '−'}${Math.abs(d) < 1 ? Math.abs(d).toFixed(1) : r(Math.abs(d))}`;
const mon = t => `${P.months[t]} ${P.year}`;

/** That month's two biggest pushes up, if the last step was not one of them. */
function pushes(rv) {
  const m = rv.months.find(x => x.turn === rv.crossed.turn), top = m.items.filter(it => it.d > 0).slice(0, 2);
  return top.some(it => it.c === rv.crossed.c) || !top.length ? '' : `; that month’s biggest pushes were ${top.map(it => `${it.label} (${sg(it.d)})`).join(' and ')}`;
}

/** HTML for the end screen: a headline, a small chart of the month-end shadow with the 65 line, and month by month. */
export function nukeReviewHTML(rv) {
  const head = rv.crossed
    ? `The shadow went from ${r(rv.start)} to ${r(rv.end)} (peak ${r(rv.peak)}). It crossed ${TH} in ${mon(rv.crossed.turn)}: the last step over the line was <b>${rv.crossed.label}</b>${pushes(rv)}.`
    : `The shadow went from ${r(rv.start)} to ${r(rv.end)} (peak ${r(rv.peak)}) and never crossed ${TH}.`;
  const used = rv.used != null ? ` <b>A nuclear weapon was used in ${mon(rv.used)}.</b>` : '';
  const W = 420, H = 160, L = 30, R = 8, T = 10, B = 24, n = rv.months.length;   // narrow, so the labels stay legible on a phone
  const x = i => L + (n <= 1 ? (W - L - R) / 2 : (i / (n - 1)) * (W - L - R)), y = val => T + (1 - val / 100) * (H - T - B);
  const pts = rv.months.map((m, i) => `${x(i).toFixed(1)},${y(m.to).toFixed(1)}`).join(' ');
  // The line's label sits on whichever side of the line has fewer points under the text (it spans about the left
  // two-thirds), with a halo in the panel colour so a crossing line never hides it.
  const under = rv.months.filter((m, i) => x(i) < L + 0.7 * (W - L - R));
  const near = (lo, hi) => under.filter(m => m.to > lo && m.to <= hi).length;
  const lab = { y: near(TH, TH + 18) <= near(TH - 18, TH) ? y(TH) - 6 : y(TH) + 15 };
  const chart = `<svg class="k4-nukechart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Nuclear shadow at the end of each month, with the ${TH} line">
    ${[0, 50, 100].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--rule)"/><text x="${L - 6}" y="${y(v) + 4}" font-size="12" text-anchor="end" fill="var(--muted)">${v}</text>`).join('')}
    <line x1="${L}" x2="${W - R}" y1="${y(TH)}" y2="${y(TH)}" stroke="var(--bad)" stroke-dasharray="5 4"/><text x="${L + 6}" y="${lab.y}" font-size="12" fill="var(--bad)" stroke="var(--panel)" stroke-width="4" stroke-linejoin="round" paint-order="stroke">${TH}: risk of use from Limited strikes up</text>
    <polyline points="${pts}" fill="none" stroke="var(--bad)" stroke-width="2.5"/>
    ${rv.months.map((m, i) => `<circle cx="${x(i)}" cy="${y(m.to)}" r="4" fill="${m.to > TH ? 'var(--bad)' : 'var(--panel)'}" stroke="var(--bad)" stroke-width="2"/><text x="${x(i)}" y="${H - 6}" font-size="12" text-anchor="middle" fill="var(--muted)">${P.months[m.turn].slice(0, 3)}</text>`).join('')}
  </svg>`;
  const rows = rv.months.map(m => `<li${m.to > TH ? ' class="hot"' : ''}><p><b>${mon(m.turn)}</b> <span class="num">${r(m.from)} → ${r(m.to)}</span>${rv.crossed?.turn === m.turn ? ` <em class="k4-cross">crossed ${TH}</em>` : ''}</p>${m.items.length
    ? `<ul>${m.items.map(it => `<li><span>${it.label}</span><span class="num ${it.d > 0 ? 'bad' : 'good'}">${sg(it.d)}</span></li>`).join('')}</ul>` : '<p class="fine">No change.</p>'}</li>`).join('');
  return `<p>${head}${used}</p>${chart}<ol class="k4-nukerev">${rows}</ol>
    <p class="fine">Every change to the shadow, with its cause, as the game recorded it. Postures and many escalatory moves add to it whatever their result; peace moves and calm months take it down. Above ${TH}, from Limited strikes up, every month carried a chance of nuclear use (${P.nuclear.scale} × ((shadow − ${TH})/${100 - TH})^1.5, ×${P.nuclear.limitedWar} at Limited strikes). Illustrative game design.</p>`;
}
