// Jervis (1978) view: Stag Hunt versus Prisoner's Dilemma payoffs, expectations, and the four worlds.
import { J78_DEFAULTS, classify, GAME_NAMES, equilibria, bestReply, sequential, repeatedThreshold, WORLDS } from '../models/jervis78.js';
import { el, frame, axes, line, dragPlot, legend, figCard, f2, pct, clamp, stext } from '../ui.js';
import { mark } from './common.js';

const R = (key, label, math, min, max, step, help, notional) => ({ type: 'range', key, label, math, min, max, step, help, notional });
const L = { C: 'Cooperate', D: 'Defect' };

const WORLD_TEXT = {
  1: 'There is no way to get security without menacing others. Status-quo states buy the same arms as aggressors and, because attacking is the best way to protect what you have, behave like aggressors. Arms races are likely and incentives to strike first turn crises into wars.',
  2: 'Postures look alike, so the dilemma operates, but more weakly: an increment in one side’s strength adds more to its security than it takes from the other’s. With reasonable security demands, status-quo states can adopt compatible policies. Jervis says this world comes closest to most periods in history.',
  3: 'States can buy defensive systems that threaten no one, so the dilemma need not operate. But the offense has the advantage, so aggression is possible and perhaps easy. States must watch each other closely, and false suspicions can still spiral.',
  4: 'Defensive systems are distinct and have the advantage. A status-quo state has no reason to buy offensive forces, and an aggressor gives notice by the posture it adopts.',
};

export default {
  id: 'jervis78',
  defaults: J78_DEFAULTS,
  views: [{ v: 'game', t: 'Payoffs and expectations' }, { v: 'worlds', t: 'Four worlds' }],
  enums: { v: ['game', 'worlds'], od: ['off', 'def'] },
  scaleNote: 'Jervis ranks outcomes only (p. 171). The numbers are <span class="notional">notional</span> stand-ins for those ranks; move them to see when the ranking, and so the game, changes.',

  controls(P) {
    if (P.v === 'worlds') return [
      { type: 'seg', key: 'od', label: 'Which has the advantage?', opts: [{ v: 'off', t: 'Offense' }, { v: 'def', t: 'Defense' }] },
      { type: 'toggle', key: 'dist', label: 'Can offensive postures be told apart from defensive ones?', on: 'Distinguishable', off: 'Not distinguishable' },
    ];
    return [
      R('cc', 'Both cooperate (CC)', '', 0, 5, 0.1, 'Mutual cooperation, e.g. both stay disarmed.', true),
      R('dc', 'You defect, the other cooperates (DC)', '', 0, 5, 0.1, 'Gain from exploiting the other.', true),
      R('dd', 'Both defect (DD)', '', 0, 5, 0.1, 'Arms race, high risk of war.', true),
      R('cd', 'You cooperate, the other defects (CD)', '', 0, 5, 0.1, 'Cost of being exploited. Jervis: this “most strongly drives the security dilemma” (p. 172).', true),
      R('q', 'Your estimate that the other cooperates', 'q', 0, 1, 0.01, 'Jervis’s third lever: expectations (pp. 171, 179).'),
      { type: 'toggle', key: 'seq', label: 'Can you wait and see what the other does? (p. 172)', on: 'Yes, move second', off: 'No, choose together' },
      { type: 'toggle', key: 'rep', label: 'Play the game repeatedly (p. 171)', on: 'Repeated', off: 'Once', rebuild: true },
      { ...R('dl', 'Weight on future rounds', 'δ', 0, 0.99, 0.01, 'Standard grim-trigger threshold, not Jervis’s own formula.'), hidden: !P.rep },
    ];
  },

  solve(P) {
    if (P.v === 'worlds') return { key: `${P.od}-${P.dist}`, w: WORLDS[`${P.od}-${P.dist}`] };
    const G = { cc: P.cc, dc: P.dc, dd: P.dd, cd: P.cd };
    return { G, type: classify(G), eqs: equilibria(G), br: bestReply(G, P.q), seq: sequential(G), rep: repeatedThreshold(G) };
  },

  status(P, e) {
    if (P.v === 'worlds') {
      const s = { 1: 'bad', 2: 'warn', 3: 'warn', 4: 'good' }[e.w.n];
      return { s, b: `World ${e.w.n}: ${e.w.title.split(';')[0]}`, t: `Jervis, ${e.w.page.includes('-') ? 'pp.' : 'p.'} ${e.w.page}.` };
    }
    const coop = P.seq ? e.seq.first === 'C' && e.seq.second === 'C' : P.rep ? (e.rep != null && P.dl >= e.rep) : e.br.choice === 'C';
    return coop
      ? { s: 'good', b: `${GAME_NAMES[e.type]}: cooperation`, t: P.seq ? 'Moving second removes the risk of being exploited.' : P.rep ? 'The future outweighs the gain from cheating.' : 'Given your expectation, cooperating pays more.' }
      : { s: e.type === 'harmony' ? 'warn' : 'bad', b: `${GAME_NAMES[e.type]}: defection`, t: P.seq ? 'Even moving second, defection pays.' : P.rep ? 'The future is not worth enough to deter cheating.' : 'Given your expectation, defecting pays more.' };
  },

  why(P, e) {
    if (P.v === 'worlds') return WORLD_TEXT[e.w.n] + ` (${e.w.page.includes('-') ? 'pp.' : 'p.'} ${e.w.page}).`;
    const { br, eqs, seq } = e;
    const eqTxt = eqs.pure.length ? eqs.pure.map(([a, b]) => `(${a ? 'D' : 'C'}, ${b ? 'D' : 'C'})`).join(' and ') : 'none in pure strategies';
    let s = `Pure equilibria: ${eqTxt}. `;
    if (e.type === 'stag') s += `In a Stag Hunt both want mutual cooperation, but cooperating is safe only if the other is expected to cooperate with probability at least q* = ${f2(br.qStar)}. `;
    if (e.type === 'pd') s += `In a one-shot Prisoner’s Dilemma defection is dominant whatever you expect (p. 171). `;
    s += `At q = ${f2(P.q)}, cooperating is worth ${f2(br.evC)} and defecting ${f2(br.evD)} (p. 179). `;
    if (P.seq) s += `Moving second, you would answer cooperation with ${L[seq.replyToC].toLowerCase()} and defection with ${L[seq.replyToD].toLowerCase()}, so the first mover ${seq.first === 'C' ? 'cooperates' : 'defects'}.`;
    if (P.rep) s += e.rep == null ? ' Repetition cannot help: defecting forever is no punishment.' : ` Repeated play sustains cooperation when δ ≥ ${f2(e.rep)}.`;
    return s;
  },

  effect(k, P, e, pP, pe) {
    if (!k) return '';
    if (P.v === 'worlds') return k === 'od' ? 'The offense-defense balance sets how much one side’s gain in security costs the other (pp. 187-188).' : 'Distinguishability lets a status-quo state show its intentions through the weapons it buys (pp. 199-201, 211).';
    const up = P[k] > pP[k];
    const typeChange = pe && pe.type !== e.type ? ` The game changed from ${GAME_NAMES[pe.type]} to ${GAME_NAMES[e.type]}.` : '';
    const T = {
      cd: `Being exploited now costs ${up ? 'less' : 'more'}. Jervis: a low cost of CD lets a state “wait to see what the other will do” (p. 172).`,
      cc: `Mutual cooperation is ${up ? 'more' : 'less'} rewarding, ${up ? 'lowering' : 'raising'} the trust cooperation requires (p. 171).`,
      dc: `Exploiting the other pays ${up ? 'more' : 'less'}, ${up ? 'raising' : 'lowering'} the temptation to defect (p. 171).`,
      dd: `An arms race costs ${up ? 'less' : 'more'}; Jervis wants DD costly to deter defection (p. 171).`,
      q: 'Your expectation of the other’s cooperation moves only your choice between two fixed expected values.',
      dl: 'More weight on the future makes cheating today cost more tomorrow.',
      seq: P.seq ? 'Now you move second: in a Stag Hunt, the first mover can cooperate safely.' : 'Back to a simultaneous choice.',
    };
    return (T[k] || '') + typeChange;
  },

  metrics(P, e) {
    if (P.v === 'worlds') return [{ k: 'World', f: 'raw', s: String(e.w.n), n: e.w.n, track: true }];
    return [
      { k: 'Game', f: 'raw', s: GAME_NAMES[e.type], n: Object.keys(GAME_NAMES).indexOf(e.type) },
      { k: 'Expected value of C', n: e.br.evC, track: true },
      { k: 'Expected value of D', n: e.br.evD, track: true },
      { k: 'Trust needed, q*', n: e.br.qStar != null && e.br.qStar >= 0 && e.br.qStar <= 1 ? e.br.qStar : null, track: true },
      { k: 'Mixed equilibrium', f: 'raw', s: e.eqs.mixed != null ? `each cooperates ${pct(e.eqs.mixed)}` : 'none' },
      { k: 'Repeat-play threshold δ', n: e.rep, hide: !P.rep },
    ];
  },

  figures(host, P, set) {
    if (P.v === 'worlds') {
      const card = document.createElement('div');
      card.className = 'card fig';
      card.innerHTML = `<div class="fig-h"><p class="eyebrow">Jervis’s four worlds (p. 211)</p><p class="fine">Click a cell to move there.</p></div><div class="worlds"></div>`;
      host.appendChild(card);
      const box = card.querySelector('.worlds');
      box.addEventListener('click', ev => { const b = ev.target.closest('[data-w]'); if (b) { const [od, dist] = b.dataset.w.split('-'); set({ od, dist: +dist }); } });
      return {
        draw(P) {
          const c = (od, dist) => { const w = WORLDS[`${od}-${dist}`]; const on = P.od === od && P.dist === dist; return `<button type="button" class="wcell${on ? ' on' : ''}" data-w="${od}-${dist}" aria-pressed="${on}"><b>${w.n}</b><span>${w.title}</span></button>`; };
          box.innerHTML = `<div class="wgrid"><span></span><span class="wh">Offense has the advantage</span><span class="wh">Defense has the advantage</span>
            <span class="wr">Offensive posture not distinguishable from defensive</span>${c('off', 0)}${c('def', 0)}
            <span class="wr">Offensive posture distinguishable</span>${c('off', 1)}${c('def', 1)}</div>`;
        },
      };
    }
    const card = document.createElement('div');
    card.className = 'card fig';
    card.innerHTML = `<div class="fig-h"><p class="eyebrow">The game (payoffs: row, column)</p><p class="fine">Outlined cells are pure equilibria.</p></div><div class="mxwrap"></div>`;
    host.appendChild(card);
    const b = figCard(host, 'j78-ev', 'Cooperate or defect, given how likely you think the other is to cooperate', 'Two lines, expected value of cooperating and of defecting, against your belief q. Click to set q.', 'Click or drag to set q.');
    b.svg.classList.add('drag');
    let F = null;
    dragPlot(b.svg, () => F, x => set({ q: +clamp(x, 0, 1).toFixed(2) }));
    return {
      draw(P, e) {
        const G = e.G, ne = (a, c) => e.eqs.pure.some(([x, y]) => x === a && y === c);
        const cell = (a, c, pr, pc) => `<td class="${ne(a, c) ? 'ne' : ''}"><span class="pay">(${f2(pr)}, ${f2(pc)})</span></td>`;
        card.querySelector('.mxwrap').innerHTML = `<table class="matrix" aria-label="Payoff matrix">
          <thead><tr><th></th><th scope="col">Other cooperates</th><th scope="col">Other defects</th></tr></thead>
          <tbody><tr><th scope="row">You cooperate</th>${cell(0, 0, G.cc, G.cc)}${cell(0, 1, G.cd, G.dc)}</tr>
          <tr><th scope="row">You defect</th>${cell(1, 0, G.dc, G.cd)}${cell(1, 1, G.dd, G.dd)}</tr></tbody></table>
          <p class="gname">${GAME_NAMES[e.type]}${e.type === 'stag' || e.type === 'pd' ? ` · Jervis’s ranking: ${e.type === 'stag' ? 'CC > DC > DD > CD' : 'DC > CC > DD > CD'}` : ''}</p>`;
        const lo = Math.min(G.cc, G.dc, G.dd, G.cd), hi = Math.max(G.cc, G.dc, G.dd, G.cd);
        F = frame(b.svg, { W: 760, H: 250, m: { l: 52, r: 16, t: 14, b: 42 }, x: [0, 1], y: [lo - 0.2, hi + 0.2] });
        el('path', { d: line(F, [[0, G.cd], [1, G.cc]]), class: 'ln c3' }, F.g);
        el('path', { d: line(F, [[0, G.dd], [1, G.dc]]), class: 'ln c2' }, F.g);
        const qs = e.br.qStar;
        if (qs != null && qs > 0 && qs < 1) {
          el('line', { x1: F.sx(qs), x2: F.sx(qs), y1: F.sy(lo - 0.2), y2: F.sy(hi + 0.2), class: 'bound' }, F.g);
          stext(F.g, { x: F.sx(qs) + 4, y: F.sy(hi + 0.05), class: 'bl' }, 'q*');
        }
        mark(F, P.q, Math.max(e.br.evC, e.br.evD));
        axes(F, { xt: [0, 0.25, 0.5, 0.75, 1], yt: [lo, (lo + hi) / 2, hi], xl: 'Your estimate that the other cooperates, q', yl: 'Expected payoff' });
        legend(b.legend, [['--c3', 'cooperate'], ['--c2', 'defect']]);
      },
    };
  },
};
