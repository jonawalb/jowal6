// The after-action replay (Batch C), at the end of the game: month by month, each capital's posture and moves with
// their results, how the others read its hidden type (the mean of their posteriors after that month), its hidden
// trait if traits were on, and the computer's main reason for its choice (js/ai-reason.js). Everything hidden is
// revealed here, since the game is over. `series`: the beliefs after each month (series[0] = the priors).
import { P } from '../data/params.js';
import { COUNTRIES, IDS } from '../data/countries.js';
import { POSTURES, BY_ID } from '../data/actions.js';
import { TRAITS } from './traits.js';

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** The replay's data: { types, traits, months: [{ turn, event, from, to, sides: { [w]: { posture, moves, why, read } } }] }. */
export function replayRows(s, series = []) {
  let rung = s.rung0 ?? 0;
  const months = s.history.map((h, i) => {
    const from = rung; rung = h.after.rung;
    const sides = Object.fromEntries(IDS.map(w => {
      const m = h.moves[w] || { posture: 'hold', actions: [] };
      const moves = m.actions.map(id => { const l = h.log.find(x => x.kind === 'action' && x.who === w && x.id === id); return { id, label: BY_ID[id].label, status: l ? l.status : 'blocked', accepted: l?.forum ? l.forum.accepted : undefined }; });
      const B = series[i + 1], obs = IDS.filter(o => o !== w);
      const read = B ? Object.fromEntries(P.types.map(t => [t, obs.reduce((a, o) => a + B[o][w][t], 0) / obs.length])) : null;
      return [w, { posture: m.posture, moves, why: m.why || null, read }];
    }));
    return { turn: h.turn, event: h.event, from, to: rung, sides };
  });
  return { types: { ...s.types }, traits: s.traits ? { ...s.traits } : null, months };
}

const VERB = { success: 'success', partial: 'partial', failure: 'failed', blocked: 'not carried out' };
const best = v => P.types.reduce((a, t) => (v[t] > v[a] ? t : a));
const stack = v => P.types.map(t => `<span class="${t}" style="width:${(v[t] * 100).toFixed(1)}%"></span>`).join('');

/** Each leader's type, and trait if traits were on, for the end screen's "Who they really were". */
export function leadersHTML(rp, me, col) {
  return IDS.map(w => `<div style="--c:${col[w]}"><b>${COUNTRIES[w].short}</b>: ${P.typeLabel[rp.types[w]]}${rp.traits ? (rp.traits[w] ? `, <span class="k4-trait">${TRAITS[rp.traits[w]].label.toLowerCase()}</span>` : ', no trait') : ''}${w === me ? ' (you)' : ''}</div>`).join('');
}

/** HTML for the end screen's replay. `me`: the player's seat (its reason reads "your choice"). */
export function replayHTML(rp, me, col) {
  const key = rp.traits ? `<p class="fine">Hidden traits were on: each computer leader had one (you had none: you made your own choices).</p><dl class="k4-traitkey">${Object.values(TRAITS).map(t => `<dt>${t.label}</dt><dd>${esc(t.text)}</dd>`).join('')}</dl>` : '';
  const months = rp.months.map((m, i) => `<details class="k4-rp"${i === 0 ? ' open' : ''}><summary><b>${P.months[m.turn]} ${P.year}</b> <span class="muted">${m.from === m.to ? P.ladder[m.to] : `${P.ladder[m.from]} → ${P.ladder[m.to]}`}</span>${m.event ? `<small>${esc(m.event.title)}</small>` : ''}</summary>
    <div class="k4-rpgrid">${IDS.map(w => { const x = m.sides[w];
      const reason = w === me ? 'Your choice.' : x.why ? `${esc(x.why.text[0].toUpperCase() + x.why.text.slice(1))}${x.why.v ? ` (+${x.why.v})` : ''}.` : '';
      return `<div class="k4-rps" style="--c:${col[w]}"><p><b>${COUNTRIES[w].short}</b> ${POSTURES.find(p => p.id === x.posture).label}${rp.traits?.[w] ? ` <span class="k4-trait">${TRAITS[rp.traits[w]].label.toLowerCase()}</span>` : ''}</p>
      <ul>${x.moves.map(mv => `<li>${esc(mv.label)} <span class="st ${mv.status}">${mv.accepted != null ? (mv.accepted ? 'accepted' : 'declined') : VERB[mv.status]}</span></li>`).join('') || '<li class="muted">No moves</li>'}</ul>
      ${x.read ? `<div class="k4-tb"><span class="muted">Others read it as ${P.typeLabel[best(x.read)].toLowerCase()} (${Math.round(x.read[best(x.read)] * 100)}%); it was ${P.typeLabel[rp.types[w]].toLowerCase()}</span><div class="stack">${stack(x.read)}</div></div>` : ''}
      ${reason ? `<p class="k4-why"><span class="muted">Main reason:</span> ${reason}</p>` : ''}</div>`; }).join('')}</div></details>`).join('');
  return `${key}<p class="fine">Tap a month to open it. “Others read it as” is the mean of the other three capitals’ beliefs after that month (bar: <span class="k4-sw resolute"></span>resolute, <span class="k4-sw cautious"></span>cautious, <span class="k4-sw opportunist"></span>opportunist). A computer capital’s main reason is the part of its one-month lookahead that gained most against holding with no moves.</p>${months}`;
}
