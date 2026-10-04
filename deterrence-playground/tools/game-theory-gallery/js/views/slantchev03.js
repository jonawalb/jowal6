// Slantchev (2003) view: bargaining while fighting, complete information and the three-type screening path.
import { S03_DEFAULTS, solveComplete, solveIncomplete, path } from '../models/slantchev03.js';
import { el, frame, axes, line, legend, figCard, f2, pct, clamp } from '../ui.js';

const R = (key, label, math, min, max, step, help) => ({ type: 'range', key, label, math, min, max, step, help });
const r2 = x => Math.round(x * 100) / 100;

export default {
  id: 'slantchev03',
  defaults: S03_DEFAULTS,
  views: [{ v: 'complete', t: 'Complete information' }, { v: 'incomplete', t: 'Learning while fighting' }],
  enums: { v: ['complete', 'incomplete'], t2: ['w', 'm', 's'] },
  scaleNote: 'The flow of benefits is worth 1 per period. War payoffs b<sub>i</sub> and battle odds are abstract, not estimates.',

  controls(P) {
    const common = [
      R('N', 'Military objectives between total defeat and victory', 'N', P.v === 'incomplete' ? 4 : 2, 10, 1),
      R('k0', 'Starting military position', 'k<sub>0</sub>', P.v === 'incomplete' ? 2 : 1, p => p.v === 'incomplete' ? p.N - 2 : p.N - 1, 1, 'k counts player 1’s net battle wins; k = N means player 2 is defeated.'),
      R('b1', 'Player 1’s per-period payoff while fighting', 'b<sub>1</sub>', 0, 0.45, 0.01),
      R('b2', 'Player 2’s per-period payoff while fighting', 'b<sub>2</sub>', 0, 0.45, 0.01),
    ];
    if (P.v === 'complete') return [
      R('p', 'Player 1 wins each battle with probability', 'p', 0.05, 0.95, 0.01),
      R('dl', 'Discount factor', 'δ', 0.5, 0.99, 0.01), ...common];
    return [
      { type: 'seg', key: 't2', label: 'Player 2’s true type (hidden from player 1)', opts: [{ v: 'w', t: 'Weak' }, { v: 'm', t: 'Moderate' }, { v: 's', t: 'Strong' }] },
      { type: 'seg', key: 'I0', label: 'First battle', opts: [{ v: 1, t: 'Player 1 wins' }, { v: 0, t: 'Player 1 loses' }] },
      { type: 'seg', key: 'I1', label: 'Second battle', opts: [{ v: 1, t: 'Player 1 wins' }, { v: 0, t: 'Player 1 loses' }] },
      R('pL', 'Battle odds vs. a strong player 2', 'p<sub>L</sub>', 0.05, 0.9, 0.01),
      R('pM', '… vs. a moderate player 2', 'p<sub>M</sub>', 0.06, 0.94, 0.01),
      R('pH', '… vs. a weak player 2', 'p<sub>H</sub>', 0.07, 0.95, 0.01),
      R('qw', 'Player 1’s prior: player 2 is weak', 'q<sub>w</sub>', 0.05, 0.9, 0.01),
      R('qs', 'Player 1’s prior: player 2 is strong', 'q<sub>s</sub>', 0.05, 0.9, 0.01, 'The moderate type gets the rest.'),
      R('dl2', 'Discount factor', 'δ', 0.8, 0.999, 0.001, 'Proposition 2 needs sufficiently patient players.'),
      ...common];
  },

  fix(P, k) {
    P.N = Math.round(P.N); P.k0 = Math.round(P.k0);
    const lo = P.v === 'incomplete' ? 2 : 1, hi = P.v === 'incomplete' ? P.N - 2 : P.N - 1;
    if (P.v === 'incomplete' && P.N < 4) P.N = 4;
    P.k0 = clamp(P.k0, lo, Math.max(lo, hi));
    if (k === 'pL' && P.pM <= P.pL) P.pM = r2(P.pL + 0.01);
    if (k === 'pH' && P.pM >= P.pH) P.pM = r2(P.pH - 0.01);
    if (P.pM <= P.pL) P.pL = r2(P.pM - 0.01);
    if (P.pH <= P.pM) P.pH = r2(P.pM + 0.01);
    if (P.qw + P.qs > 0.95) { if (k === 'qw') P.qs = r2(0.95 - P.qw); else P.qw = r2(0.95 - P.qs); }
  },

  solve(P) {
    if (P.v === 'complete') return solveComplete(P);
    const e = solveIncomplete(P);
    return { ...e, steps: e.valid ? path(P, e) : [] };
  },

  status(P, e) {
    if (P.v === 'complete') return { s: 'good', b: `Immediate settlement at ${f2(e.deal)}`, t: 'With complete information there is no fighting at all (Proposition 1, p. 624).' };
    if (!e.valid) return { s: 'warn', b: 'Outside the model’s assumptions', t: 'Needs p_L < p_M < p_H, all three types possible, and room for two battles.' };
    if (!e.holds) return { s: 'warn', b: 'Separating equilibrium fails here', t: 'Slantchev’s Proposition 2 needs more patience or more distinct types.' };
    const n = P.t2 === 'w' ? 0 : P.t2 === 'm' ? 1 : 2;
    return { s: n ? 'bad' : 'good', b: n ? `War lasts ${n} battle${n > 1 ? 's' : ''}, then a deal` : 'Weak type settles at once', t: 'Each type of player 2 reveals itself by when it settles.' };
  },

  why(P, e) {
    if (P.v === 'complete') return `Each offer leaves the other side indifferent between accepting and fighting one more battle, then making its own offer (appendix eq. 1). Player 1 offers ${f2(e.deal)} at position k<sub>0</sub> = ${P.k0} and player 2 accepts at once. The deal sits inside the range of settlements both prefer to fighting to the finish, ${f2(e.rangeLo)} to ${f2(e.rangeHi)}, and it tracks the military position: war is a stochastic process, but with complete information no one fights (p. 624).`;
    if (!e.valid) return 'Adjust the battle odds so that p<sub>L</sub> < p<sub>M</sub> < p<sub>H</sub>, and give each type positive prior probability.';
    if (!e.holds) {
      const bad = e.checks.filter(c => !c.ok).map(c => c.text.toLowerCase()).join('; ');
      const split = !e.checks[0].ok !== !e.checks[1].ok;
      return `The appendix’s conditions for the separating equilibrium fail: ${bad}. ${split ? 'The strong type would signal after one battle outcome but pool after the other, the case Slantchev mentions on p. 626. ' : ''}The paper says semi-separating and pooling equilibria appear when δ is lower (p. 626) but does not characterize them, so the tool does not compute them. Try raising δ or spreading the types apart.`;
    }
    return `Player 1 screens. At t = 0 it offers ${f2(e.x0)}, which only a weak player 2 accepts. A rejection signals strength, but the battle also carries information: after a player-1 victory, player 1 thinks a strong type is ${pct(e.q1)} likely; after a defeat, ${pct(e.q0)} (eq. 4). At t = 1 a moderate type offers terms player 1 accepts; a strong type makes a non-serious offer to prove its strength and settles after one more battle. War ends once it has no information left to reveal: the Principle of Convergence (p. 628).`;
  },

  effect(k, P, e, pP) {
    if (!k) return '';
    const up = P[k] > pP[k];
    const T = {
      p: `Better battle odds for player 1 ${up ? 'raise' : 'lower'} its offers at every position (p. 624).`,
      k0: 'Starting nearer victory improves player 1’s terms; the deal follows the military position.',
      dl: 'Patience shapes how much each side can extract by threatening one more battle.',
      dl2: `Players are ${up ? 'more' : 'less'} patient, so costly delay to screen and signal is ${up ? 'more' : 'less'} worthwhile. “The more patient players are, the more incentives they have to delay agreement and fight” (p. 629).`,
      I0: 'The battle outcome is information player 2 cannot manipulate. It shifts player 1’s belief and so the offers.',
      I1: 'The second battle only moves the military position before the final settlement.',
      t2: 'Player 1 does not know the type; only the path of play reveals it.',
      qs: 'A higher prior on the strong type changes what player 1 must offer and whether screening pays.',
      pL: 'Types that are closer together are harder to separate: with little uncertainty, Slantchev expects pooling and shorter wars (p. 626).',
      pM: 'Types that are closer together are harder to separate.',
      pH: 'A weaker weak type gains more from pretending to be strong.',
    };
    return T[k] || '';
  },

  metrics(P, e) {
    if (P.v === 'complete') return [
      { k: 'Deal at k<sub>0</sub> (player 1’s share)', n: e.deal, track: true },
      { k: 'Fight to finish, player 1', n: e.rangeLo, track: true },
      { k: 'Fight to finish, player 2', n: 1 - e.rangeHi },
      { k: 'Battles fought', f: 'raw', s: '0', n: 0 },
    ];
    if (!e.valid) return [];
    return [
      { k: 'Separating MPSE holds', f: 'raw', s: e.holds ? 'yes' : 'no', n: e.holds ? 1 : 0, track: true },
      { k: 'Offer at t = 0 (x<sub>0</sub>*)', n: e.x0, track: true },
      { k: 'Belief in strong type after win', f: 'pct', n: e.q1, track: true },
      { k: 'Belief in strong type after loss', f: 'pct', n: e.q0, track: true },
      { k: 'Player 1’s ex ante payoff x*', n: e.xStar, track: true },
      { k: 'Expected battles', n: e.pBattles },
      { k: 'Player 1’s share if it knew 2 was weak', n: e.knownWeak },
    ];
  },

  figures(host, P) {
    if (P.v === 'complete') {
      const a = figCard(host, 's03-k', 'Offers by military position', 'Lines of each side’s equilibrium offer and the fight-to-the-finish values against military position k.', 'Shaded: settlements both prefer to fighting to the finish.');
      return {
        draw(P, e) {
          const F = frame(a.svg, { W: 760, H: 280, m: { l: 52, r: 16, t: 14, b: 42 }, x: [0, P.N], y: [0, 1] });
          const ks = Array.from({ length: P.N + 1 }, (_, i) => i);
          const top = ks.map(k => [k, 1 - e.W2[k]]), bot = ks.map(k => [k, e.W1[k]]).reverse();
          el('path', { d: line(F, top) + line(F, bot).replace('M', 'L') + 'Z', class: 'bandfill' }, F.g);
          el('path', { d: line(F, ks.map(k => [k, e.x[k]])), class: 'ln c1' }, F.g);
          el('path', { d: line(F, ks.map(k => [k, 1 - e.y[k]])), class: 'ln c4 dash' }, F.g);
          ks.forEach(k => el('circle', { cx: F.sx(k), cy: F.sy(e.x[k]), r: 3.5, class: 'dot c1' }, F.g));
          el('line', { x1: F.sx(P.k0), x2: F.sx(P.k0), y1: F.sy(0), y2: F.sy(1), class: 'refl' }, F.g);
          el('circle', { cx: F.sx(P.k0), cy: F.sy(e.deal), r: 7, class: 'mark' }, F.g);
          axes(F, { xt: ks, yt: [0, 0.5, 1], xl: 'Military position k (0 = player 1 defeated, N = player 2 defeated)', yl: 'Player 1’s share', xf: v => String(v) });
          legend(a.legend, [['--c1', 'player 1’s offer x<sub>k</sub>'], ['--c4', 'player 1’s share when 2 offers, 1 − y<sub>k</sub>'], ['--c3', 'better than fighting to the finish for both']]);
        },
      };
    }
    const card = document.createElement('div');
    card.className = 'card fig';
    card.innerHTML = `<div class="fig-h"><p class="eyebrow">One path of play (Proposition 2)</p><p class="fine">Pick player 2’s type and the battle results in the panel.</p></div><ol class="path"></ol><div class="checks"></div>`;
    host.appendChild(card);
    return {
      draw(P, e) {
        const ol = card.querySelector('.path');
        if (!e.valid) { ol.innerHTML = '<li>Outside the model’s assumptions.</li>'; card.querySelector('.checks').innerHTML = ''; return; }
        ol.innerHTML = e.steps.map(s => {
          if (s.who === 'battle' || s.battle != null) {
            const res = s.battle ? 'player 1 wins the battle' : 'player 1 loses the battle';
            return `<li class="${s.who === 'battle' ? 'battle' : ''}"><b>t = ${s.t}</b> ${s.who === 'battle' ? '' : `Player 2 ${s.act}. `}Battle: ${res}; position k = ${s.k}.</li>`;
          }
          const bel = s.belief != null ? ` <span class="q">Player 1 now puts ${pct(s.belief)} on the strong type.</span>` : '';
          const who = s.who === '1' ? 'Player 1 ' : s.who === '2' ? 'Player 2 ' : '';
          return `<li${s.end != null ? ' class="end"' : ''}><b>t = ${s.t}</b> ${who}${s.act}.${bel}${s.end != null ? ` <b>Settlement: player 1 gets ${f2(s.end)}.</b>` : ''}</li>`;
        }).join('');
        card.querySelector('.checks').innerHTML = `<p class="eyebrow">Conditions for this equilibrium (appendix, pp. 630-631)</p><ul>${e.checks.map(c =>
          `<li class="${c.ok ? 'ok' : 'no'}"><span aria-hidden="true">${c.ok ? '✓' : '✕'}</span> ${c.text}${c.need != null ? ` <span class="q">(needs p<sub>M</sub> − p<sub>L</sub> > ${f2(c.need)}; it is ${f2(P.pM - P.pL)})</span>` : ''}</li>`).join('')}</ul>`;
      },
    };
  },
};
