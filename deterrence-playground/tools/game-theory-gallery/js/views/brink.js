// Brinkmanship view: Chicken, Powell's complete-information escalation ladder, and the crisis equilibrium.
import { BR_DEFAULTS, solveChicken, solveLadder, solveCrisis, pdCurve } from '../models/brink.js';
import { el, frame, axes, line, dragPlot, legend, figCard, f2, pct, clamp, stext } from '../ui.js';
import { mark } from './common.js';

const R = (key, label, math, min, max, step, help) => ({ type: 'range', key, label, math, min, max, step, help });
const r2 = x => Math.round(x * 100) / 100;

export default {
  id: 'brink',
  defaults: BR_DEFAULTS,
  views: [
    { v: 'chicken', t: 'Chicken' },
    { v: 'ladder', t: 'Escalation, full information' },
    { v: 'crisis', t: 'Escalation, hidden resolve' },
  ],
  enums: { v: ['chicken', 'ladder', 'crisis'] },
  scaleNote: 'Each state’s payoffs are scaled so prevailing = 1 and disaster = 0. That rescaling changes no equilibrium. Values are abstract, not estimates.',

  controls(P) {
    if (P.v === 'chicken') return [
      R('c1', 'I: payoff if both back off (compromise)', 'c<sub>I</sub>', 0.02, 0.98, 0.01),
      R('s1', 'I: payoff if I alone backs down', 's<sub>I</sub>', 0.01, p => p.c1 - 0.01, 0.01),
      R('c2', 'II: payoff from compromise', 'c<sub>II</sub>', 0.02, 0.98, 0.01),
      R('s2', 'II: payoff if II alone backs down', 's<sub>II</sub>', 0.01, p => p.c2 - 0.01, 0.01),
    ];
    if (P.v === 'ladder') return [
      R('R1', 'I’s resolve: largest risk of disaster it will run', 'R<sub>I</sub>', 0.01, 0.99, 0.01, 'R = (w − s)/(w − d) (p. 725).'),
      R('R2', 'II’s resolve', 'R<sub>II</sub>', 0.01, 0.99, 0.01),
      R('f', 'Risk added by each escalation', 'f', 0.02, 0.2, 0.01, 'Bids climb f, 2f, 3f, …; II bids odd multiples, I even.'),
    ];
    return [
      R('ff', 'Risk added by each escalation', 'f', 0.02, 0.15, 0.005),
      R('p', 'I’s belief that II is irresolute', 'p', 0.01, 0.99, 0.01),
      R('RI', 'I’s resolve (between 2f and 4f)', 'R<sub>I</sub>', p => r2(2 * p.ff), p => r2(4 * p.ff - 0.005), 0.005),
      R('RII', 'Irresolute II’s resolve (f to 3f)', 'R<sub>II</sub>', p => r2(p.ff), p => r2(3 * p.ff - 0.005), 0.005),
      R('RIIp', 'Resolute II’s resolve (3f to 5f)', 'R<sub>II′</sub>', p => r2(3 * p.ff), p => r2(5 * p.ff - 0.005), 0.005),
      R('q', 'I’s payoff from leaving the status quo alone', 'q<sub>I</sub>', p => r2(1 - p.RI + 0.01), 0.99, 0.01, 'Between submitting (1 − R<sub>I</sub>) and prevailing (1).'),
    ];
  },

  fix(P) {
    if (P.v === 'chicken') { if (P.s1 >= P.c1) P.s1 = r2(P.c1 - 0.01); if (P.s2 >= P.c2) P.s2 = r2(P.c2 - 0.01); }
    if (P.v === 'crisis') {
      const f = P.ff;
      P.RI = r2(clamp(P.RI, 2 * f, 4 * f - 0.005)); P.RII = r2(clamp(P.RII, f, 3 * f - 0.005)); P.RIIp = r2(clamp(P.RIIp, 3 * f, 5 * f - 0.005));
      P.q = r2(clamp(P.q, 1 - P.RI + 0.01, 0.99));
    }
  },

  solve(P) { return P.v === 'chicken' ? solveChicken(P) : P.v === 'ladder' ? solveLadder(P) : solveCrisis(P); },

  status(P, e) {
    if (P.v === 'chicken') return { s: 'warn', b: 'Two pure equilibria and a mixed one', t: `Either side can stand firm while the other submits. In the mixed equilibrium disaster comes with probability ${pct(e.pDisaster)}.` };
    if (P.v === 'ladder') return { s: 'good', b: `${e.winner} prevails without a crisis`, t: `${e.winner === 'I' ? 'II submits at its first chance' : 'I does not exploit the situation'}. No risk is ever run.` };
    if (!e.crisis) return { s: 'good', b: 'No crisis', t: e.why === 'belief' ? 'I thinks a resolute II too likely to start one.' : 'The status quo beats I’s expected gain from exploiting.' };
    return { s: 'bad', b: `Crisis: disaster risk ${pct(e.pd)}`, t: 'I exploits, types reveal themselves by escalating, and the autonomous risk may end in disaster.' };
  },

  why(P, e) {
    if (P.v === 'chicken') return `Chicken has two pure equilibria, one for each side prevailing, and they do not move when payoffs change (pp. 720-721). That is Powell’s complaint: resolve plays no role. In the mixed equilibrium, I stands firm with probability ${pct(e.firmI)}, which equals II’s critical risk (w − c)/[(w − c) + (s − d)] = ${f2(e.rII)}, and II with ${pct(e.firmII)} (n. 4, p. 734).`;
    if (P.v === 'ladder') {
      const lose = e.winner === 'I' ? 'II' : 'I', k = e.steps[e.steps.length - 1];
      return `Each escalation hands the next move to the other side with a higher autonomous risk of disaster. A state will not bid past its resolve. The first bid anyone refuses is ${lose}’s at ${f2(k.risk)} (> R<sub>${lose}</sub>). Foreseeing this, ${lose} gives way at once (Proposition 1, p. 726): with complete information there is no crisis and no risk is run.`;
    }
    if (!e.crisis) return e.why === 'belief'
      ? `I would escalate only if it believed II irresolute with probability above b* = ${f2(e.bStar)}. With p = ${f2(P.p)} it cannot, so a challenge would end with I backing down; I leaves the status quo alone.`
      : `A crisis is possible (p > b*), but I’s expected payoff from exploiting, ${f2(e.vExploit)}, is below its status quo value ${f2(P.q)}, so I does not start one (p. 733).`;
    return `I exploits. A resolute II escalates for sure; an irresolute II escalates with probability ${pct(e.eII1)}, bluffing just enough that I, now believing b* = ${f2(e.bStar)}, is indifferent. I escalates with probability ${pct(e.eI1)}. The irresolute II ends up prevailing with probability ${pct(e.weakWins)}: sometimes the side with less resolve wins (p. 730).`;
  },

  effect(k, P, e, pP, pe) {
    if (!k) return '';
    const up = P[k] > pP[k];
    if (P.v === 'chicken') return 'A state’s own payoffs set how often the other must stand firm in the mixed equilibrium, not how often it does.';
    if (P.v === 'ladder') return k === 'f' ? 'Bigger steps change which bid first crosses a state’s resolve; with coarse steps the more resolved state can lose (p. 726).' : 'Raising a state’s resolve lets it make higher bids.';
    const T = {
      RII: `A more resolved irresolute type is harder to tell from the resolute one, so I must escalate ${up ? 'more' : 'less'} often to test it: e<sub>I</sub>(1) ${up ? 'rises' : 'falls'} (p. 730). ${pe && pe.crisis && e.crisis ? `Disaster risk ${pct(pe.pd)} → ${pct(e.pd)}.` : ''}`,
      RI: `I’s resolve sets b*, the belief at which I is willing to escalate. ${up ? 'More' : 'Less'} resolve makes the irresolute II bluff ${up ? 'less' : 'more'} (p. 730).`,
      p: 'I’s prior sets whether it starts a crisis. Disaster is most likely when p is just high enough for I to exploit (p. 729).',
      q: 'A better status quo makes I less willing to start a crisis.',
      ff: 'The size of each step changes every threshold, so Powell’s bands move with it.',
      RIIp: 'The resolute type’s exact resolve does not enter the equilibrium, as long as it stays between 3f and 5f.',
    };
    return T[k] || '';
  },

  metrics(P, e) {
    if (P.v === 'chicken') return [
      { k: 'I’s critical risk r<sub>I</sub>', n: e.rI, track: true },
      { k: 'II’s critical risk r<sub>II</sub>', n: e.rII, track: true },
      { k: 'Snyder-Diesing risk, I', n: e.sdI },
      { k: 'Snyder-Diesing risk, II', n: e.sdII },
      { k: 'Mixed: I stands firm', f: 'pct', n: e.firmI, track: true },
      { k: 'Mixed: II stands firm', f: 'pct', n: e.firmII, track: true },
      { k: 'Mixed: disaster', f: 'pct', n: e.pDisaster, track: true },
    ];
    if (P.v === 'ladder') return [
      { k: 'N<sub>I</sub> (bids I would make)', n: e.NI, f: 'raw', s: String(e.NI) },
      { k: 'N<sub>II</sub> (bids II would make)', n: e.NII, f: 'raw', s: String(e.NII) },
      { k: 'Winner', f: 'raw', s: e.winner, n: e.winner === 'I' ? 1 : 0, track: true },
    ];
    return [
      { k: 'b* (I’s indifference belief)', n: e.bStar, track: true },
      { k: 'I escalates, e<sub>I</sub>(1)', f: 'pct', n: e.eI1, track: true },
      { k: 'Irresolute II escalates', f: 'pct', n: e.crisis ? e.eII1 : null, track: true },
      { k: 'Disaster', f: 'pct', n: e.crisis ? e.pd : 0, track: true },
      { k: 'Irresolute II prevails', f: 'pct', n: e.crisis ? e.weakWins : 0, track: true },
      { k: 'I prevails', f: 'pct', n: e.crisis ? e.iWins : 0 },
      { k: 'Powell’s bands hold', f: 'raw', s: e.valid ? 'yes' : 'no', n: e.valid ? 1 : 0 },
    ];
  },

  figures(host, P, set) {
    if (P.v === 'chicken') {
      const card = document.createElement('div');
      card.className = 'card fig';
      card.innerHTML = `<div class="fig-h"><p class="eyebrow">Chicken (Powell’s Figure 1, p. 720)</p><p class="fine">Payoffs (I, II). Outlined cells are pure equilibria; the percentages show the mixed equilibrium.</p></div><div class="mxwrap"></div>`;
      host.appendChild(card);
      return {
        draw(P, e) {
          const cell = (a, b, lab, pr, ne) => `<td class="${ne ? 'ne' : ''}"><span class="pay">(${a}, ${b})</span><span class="lab">${lab}</span><span class="pr">${pct(pr)}</span></td>`;
          card.querySelector('.mxwrap').innerHTML = `<table class="matrix" aria-label="Chicken payoff matrix">
            <thead><tr><th></th><th scope="col">II stands firm <small>${pct(e.firmII)}</small></th><th scope="col">II submits <small>${pct(1 - e.firmII)}</small></th></tr></thead>
            <tbody><tr><th scope="row">I stands firm <small>${pct(e.firmI)}</small></th>${cell('0', '0', 'Disaster', e.firmI * e.firmII, false)}${cell('1', f2(P.s2), 'I prevails', e.firmI * (1 - e.firmII), true)}</tr>
            <tr><th scope="row">I submits <small>${pct(1 - e.firmI)}</small></th>${cell(f2(P.s1), '1', 'II prevails', (1 - e.firmI) * e.firmII, true)}${cell(f2(P.c1), f2(P.c2), 'Compromise', (1 - e.firmI) * (1 - e.firmII), false)}</tr></tbody></table>`;
        },
      };
    }
    if (P.v === 'ladder') {
      const a = figCard(host, 'br-lad', 'The escalation ladder: autonomous risk of disaster at each bid', 'Ladder of bids with rising risk. Bars for II’s bids on the left and I’s on the right; lines mark each state’s resolve.');
      return {
        draw(P, e) {
          const n = e.steps.length, H = 60 + n * 30;
          const F = frame(a.svg, { W: 760, H, m: { l: 70, r: 70, t: 16, b: 34 }, x: [0, 1], y: [0, n] });
          const mid = F.sx(0.5);
          e.steps.forEach((s, i) => {
            const y = F.m.t + (n - 1 - i) * 30 + 4, w = (F.iw / 2 - 20) * s.risk;
            const x = s.mover === 'II' ? mid - 10 - w : mid + 10;
            el('rect', { x, y, width: Math.max(2, w), height: 22, class: 'vbar ' + (s.ok ? (s.mover === 'I' ? 'c1' : 'c4') : 'bad') }, F.g);
            el('text', { x: s.mover === 'II' ? x - 6 : x + w + 6, y: y + 15, 'text-anchor': s.mover === 'II' ? 'end' : 'start', class: 'barv' }, F.g, `${s.k}f = ${f2(s.risk)}${s.ok ? '' : ' refused'}`);
          });
          el('line', { x1: mid, x2: mid, y1: F.m.t, y2: H - F.m.b, class: 'axisl' }, F.g);
          el('text', { x: mid - 12, y: H - 12, 'text-anchor': 'end', class: 'ax-t' }, F.g, 'II’s bids (odd)');
          el('text', { x: mid + 12, y: H - 12, class: 'ax-t' }, F.g, 'I’s bids (even)');
          legend(a.legend, [['--c1', 'I bids'], ['--c4', 'II bids'], ['--c2', 'first refused bid']]);
        },
      };
    }
    const a = figCard(host, 'br-tree', 'Equilibrium path (Powell’s Figure 3, simplified)', 'Game tree of the crisis with equilibrium probabilities on each move.', 'Nature picks II’s type; I cannot see it. Each escalation risks disaster with the probability shown.');
    const b = figCard(host, 'br-pd', 'Chance of disaster by I’s prior belief that II is irresolute', 'Line chart of disaster probability against p, zero where no crisis starts. Click to set p.', 'Click or drag to set p. Zero where I does not start a crisis.');
    b.svg.classList.add('drag');
    let F = null;
    dragPlot(b.svg, () => F, x => set({ p: +clamp(x, 0.01, 0.99).toFixed(2) }));
    return {
      draw(P, e) {
        a.svg.classList.add('wide'); drawTree(a.svg, P, e);
        const pts = pdCurve(P);
        const top = Math.max(0.05, ...pts.map(q => q[1])) * 1.15;
        F = frame(b.svg, { W: 760, H: 240, m: { l: 52, r: 16, t: 12, b: 42 }, x: [0, 1], y: [0, top] });
        el('path', { d: line(F, pts.map(q => [q[0], q[1]])), class: 'ln c2' }, F.g);
        el('line', { x1: F.sx(e.bStar), x2: F.sx(e.bStar), y1: F.sy(0), y2: F.sy(top), class: 'bound' }, F.g);
        stext(F.g, { x: F.sx(e.bStar) + 4, y: F.sy(top * 0.92), class: 'bl' }, 'b*');
        mark(F, P.p, e.crisis ? e.pd : 0);
        axes(F, { xt: [0, 0.25, 0.5, 0.75, 1], yt: [0, top / 2, top], xl: 'I’s prior that II is irresolute, p', yl: 'Pr(disaster)', yf: pct });
        legend(b.legend, [['--c2', 'probability of disaster']]);
      },
    };
  },
};

/** Compact tree: Nature -> II type -> II escalates? -> I escalates? -> outcome, with equilibrium probabilities. */
function drawTree(svg, P, e) {
  svg.innerHTML = '';
  svg.setAttribute('viewBox', '0 0 760 300');
  const f = P.ff, g = el('g', {}, svg);
  if (!e.crisis) {
    el('text', { x: 380, y: 140, 'text-anchor': 'middle', class: 'treeq' }, g, 'I does not exploit: the status quo holds.');
    el('text', { x: 380, y: 166, 'text-anchor': 'middle', class: 'lf-n' }, g, `Crisis needs p > b* = ${f2(e.bStar)} and an expected gain above q.`);
    return;
  }
  const rows = [
    { y: 70, name: `Irresolute II (p = ${f2(P.p)})`, esc: e.eII1, then: [`I escalates ${pct(e.eI1)} (risk ${f2(2 * f)})`, 'II submits: I prevails', 'I submits: II prevails'] },
    { y: 210, name: `Resolute II′ (1 − p = ${f2(1 - P.p)})`, esc: 1, then: [`I escalates ${pct(e.eI1)} (risk ${f2(2 * f)})`, `II′ escalates (risk ${f2(3 * f)}), then I submits`, 'I submits: II′ prevails'] },
  ];
  const node = (x, y, t, cls = '') => { el('circle', { cx: x, cy: y, r: 12, class: 'nd ' + cls }, g); el('text', { x, y: y + 4, 'text-anchor': 'middle', class: 'nl' }, g, t); };
  const W = pr => 1.2 + 4 * pr;
  rows.forEach(r => {
    el('line', { x1: 40, y1: 140, x2: 140, y2: r.y, class: 'edge on' }, g);
    el('text', { x: 40, y: r.y < 140 ? r.y - 22 : r.y + 34, class: 'el' }, g, r.name);
    el('line', { x1: 150, y1: r.y, x2: 370, y2: r.y, class: 'edge on', 'stroke-width': W(r.esc) }, g);
    el('text', { x: 170, y: r.y - 8, class: 'ep on' }, g, `escalates ${pct(r.esc)} (risk ${f2(f)})`);
    if (r.esc < 1) {
      el('line', { x1: 150, y1: r.y, x2: 210, y2: r.y + 40, class: 'edge on', 'stroke-width': W(1 - r.esc) }, g);
      el('text', { x: 216, y: r.y + 45, class: 'lf-n on' }, g, `submits ${pct(1 - r.esc)}: I prevails`);
    }
    el('line', { x1: 390, y1: r.y, x2: 500, y2: r.y - 26, class: 'edge on', 'stroke-width': W(e.eI1) }, g);
    el('line', { x1: 390, y1: r.y, x2: 500, y2: r.y + 26, class: 'edge on', 'stroke-width': W(1 - e.eI1) }, g);
    el('text', { x: 508, y: r.y - 28, class: 'lf-n on' }, g, r.then[0]);
    el('text', { x: 508, y: r.y - 12, class: 'lf-n' }, g, `→ ${r.then[1]}`);
    el('text', { x: 508, y: r.y + 32, class: 'lf-n on' }, g, r.then[2]);
    node(150, r.y, r.esc < 1 ? 'II' : 'II′', 'r');
    node(380, r.y, 'I');
  });
  node(30, 140, 'N', 'nat');
  el('path', { d: 'M380 82 C 404 115, 404 165, 380 198', class: 'infoset' }, g);
  el('text', { x: 406, y: 144, class: 'el' }, g, 'I cannot tell which');
}
