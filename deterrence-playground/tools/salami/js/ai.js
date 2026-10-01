// The computer's two players. Both read the same public beliefs (s.bR, s.bT); neither reads the other's true threshold.
// The Power also obeys its own hidden threshold T: when provoked past it, it snaps two rungs (with the model's odds).
import { P, LEVELS, METHODS, C_MSGS } from '../data/params.js';
import { makeRng, STREAM } from './rng.js';
import { pIntervene, pSpike, spikeProb } from './belief.js';
import { M, baseE, encounters, provocation, deliveryOdds, tAdj } from './engine.js';

export const AI = {
  power: { denyValue: 14, denyUrgent: 6, intervene: 110, sym: 0.5, esc: 0.25, home: 0.08, onScene: 6, temp: 2.5 },
  coastal: { value: [14, 10, 5, 1.5], spike: 12, intervene: 0, sym: 0.4, esc: 0.15, quietHome: 2, temp: 1.5 },
};
const PRIOR_METHODS = { none: 0.2, civ: 1.5, air: 0.5, cg: 1, press: 0.5, patron: 0.3 };

function softmax(cands, temp, rng) {
  const top = Math.max(...cands.map(x => x.u));
  const w = cands.map(x => Math.exp((x.u - top) / temp));
  return cands[rng.pick(w)];
}

/** What the Power expects the Coastal State to send: past methods plus a prior. */
export function methodForecast(s) {
  const n = { ...PRIOR_METHODS };
  for (const h of s.history) n[h.c.method] += 1;
  if (s.patronLeft <= 0) n.patron = 0;
  const z = Object.values(n).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(n).map(([k, v]) => [k, v / z]));
}

/** The Power's move. rng defaults to the seeded AI stream for this month. */
export function choosePower(s, rng = makeRng(s.seed, STREAM.ai + s.turn * 2)) {
  const A = AI.power, prev = s.history[s.turn - 1], last = s.lastLevel;
  const follow = L => ({ msg: s.sympathy > 56 ? 'narrative' : s.domP > 58 ? 'admin' : 'quiet', hold: s.domP > 55 || L >= 3, detain: s.domP > 65 });
  const snap = rng.u();
  if (prev && prev.p.level <= 3 && snap < spikeProb(prev.P, s.T - prev.tAdj)) {
    const L = Math.min(5, prev.p.level + 2);
    return { level: L, ...follow(L), msg: 'narrative' };
  }
  const q = methodForecast(s);
  const cands = [];
  for (let L = Math.max(0, last - 2); L <= Math.min(5, last + 1); L++) {
    let denied = 0, pI = 0, sym = 0;
    for (const m of METHODS) {
      const w = q[m.id]; if (!w) continue;
      const fake = { ...s, cur: null };
      denied += w * m.cargo * (deliveryOdds(fake, { method: m.id, push: false }, { level: 0 }) - deliveryOdds(fake, { method: m.id, push: false }, { level: L }));
      pI += w * pIntervene(s.bR, baseE(s, L, m.id));
      if (encounters(L, m.id)) sym += w * P.sym.byLevel[L] * (m.id === 'press' ? P.sym.press : 1);
    }
    const v = A.denyValue + (s.supplies < 2.5 ? A.denyUrgent : 0);
    const u = v * denied - A.intervene * pI - A.sym * sym - A.esc * P.esc.byLevel[L] * (1 + s.esc / 50)
      + A.home * (s.domP - P.domP.home) * L - (s.onScene > 0 ? A.onScene * L : 0);
    cands.push({ L, u });
  }
  const L = softmax(cands, A.temp, rng).L;
  return { level: L, ...follow(L) };
}

/** Distribution of the Power's level this month, as the Coastal State sees it. */
export function levelForecast(s) {
  const last = s.lastLevel, prev = s.history[s.turn - 1], d = new Array(LEVELS.length).fill(0);
  const pSnap = prev && prev.p.level <= 3 ? pSpike(s.bT, prev.P, prev.tAdj) : 0;
  const add = (L, w) => { d[Math.max(0, Math.min(5, L))] += w; };
  add(last, 0.5 * (1 - pSnap)); add(last + 1, 0.35 * (1 - pSnap)); add(last - 1, 0.15 * (1 - pSnap));
  if (pSnap) add(prev.p.level + 2, pSnap);
  return d;
}

/** The Coastal State's move. */
export function chooseCoastal(s, rng = makeRng(s.seed, STREAM.ai + s.turn * 2 + 1)) {
  const A = AI.coastal, d = levelForecast(s);
  const v = s.supplies < 1.5 ? A.value[0] : s.supplies < 2.5 ? A.value[1] : s.supplies < 4 ? A.value[2] : A.value[3];
  const cands = [];
  for (const m of METHODS) {
    if (m.id === 'patron' && s.patronLeft <= 0) continue;
    for (const msg of C_MSGS) for (const push of m.sea ? [false, true] : [false]) {
      const c = { method: m.id, msg: msg.id, push };
      let del = 0, pI = 0, sym = 0, prov = 0;
      for (let L = 0; L < 6; L++) {
        if (!d[L]) continue;
        const enc = encounters(L, m.id), o = deliveryOdds(s, c, { level: L, hold: s.domP > 55 || L >= 3 });
        del += d[L] * m.cargo * (o + P.partial / 2);
        pI += d[L] * pIntervene(s.bR, baseE(s, L, m.id));
        let g = enc ? P.sym.byLevel[L] : 0;
        if (enc && m.id === 'press') g *= P.sym.press;
        if (msg.id === 'protest') g *= P.sym.protest;
        sym += d[L] * g;
        prov += d[L] * provocation(c, enc);
      }
      if (msg.id === 'lawfare') sym += s.lawFiled ? P.sym.lawAfter : P.sym.lawFirst;
      const u = v * del - A.spike * pSpike(s.bT, Math.round(prov), tAdj(s)) + A.intervene * pI + A.sym * sym
        - A.esc * prov * (1 + s.esc / 50) - (msg.id === 'quiet' && s.domC > 60 ? A.quietHome : 0);
      cands.push({ c, u });
    }
  }
  return softmax(cands, A.temp, rng).c;
}
