// The oblique-order model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the machine, the battlefield view, the readout and the tests all run this one file.
//
// Notional teaching rules, stated as such on the page:
// - The defender's line is 12 equal blocks in 4 sectors of 3. The attacker has 8 equal weights
//   on 4 pegs, one peg per sector.
// - The attacker's line pivots about its refused (right-hand) end and is advanced until its
//   leading sector touches the enemy line. A sector is in contact only if the gap at its pad,
//   SPACING x sin(angle), is within the pads' REACH.
// - A sector in contact goes to whichever side has more weight there. Out of contact it is refused.

export const MODEL = {
  sectors: 4,
  perSector: 3,          // defender blocks per sector
  weights: 8,            // attacker weights in all
  spacing: 48,           // distance between sector pads along the beam
  reach: 4,              // how far a pad can reach out to touch
  maxAngle: 16,          // degrees
  spread: [2, 2, 2, 2],  // weights per peg, leading (strong) sector first
  massed: [6, 0, 0, 2],
};

const RAD = Math.PI / 180;

// Gap between sector j's pad and the enemy line at a given angle.
export const gapOf = (j, angle, m = MODEL) => j * m.spacing * Math.sin(angle * RAD);
export const inContact = (j, angle, m = MODEL) => gapOf(j, angle, m) <= m.reach + 1e-9;
// Largest angle at which sector j still touches.
export const contactLimit = (j, m = MODEL) => (j === 0 ? 90 : Math.asin(m.reach / (j * m.spacing)) / RAD);

// Per-sector result for an angle and a weight layout (weights per peg).
export function sectors(angle, load, m = MODEL) {
  const out = [];
  for (let j = 0; j < m.sectors; j++) {
    const a = load[j], d = m.perSector;
    const contact = inContact(j, angle, m);
    const ratio = a / d;
    const result = !contact ? "refused" : a > d ? "win" : a < d ? "lose" : "even";
    out.push({ j, a, d, contact, ratio, result });
  }
  return out;
}

export function summary(angle, load, m = MODEL) {
  const s = sectors(angle, load, m);
  const count = (r) => s.filter((x) => x.result === r).length;
  const engaged = s.filter((x) => x.contact);
  const best = engaged.length ? Math.max(...engaged.map((x) => x.ratio)) : 0;
  return { s, win: count("win"), lose: count("lose"), even: count("even"), refused: count("refused"), best };
}

export const ratioText = (r) => r.toFixed(1) + ":1";

// Notional casualties (added with the Battlefield view, owner rule 2026-10-13: success is not free).
// Figures down, [friendly, enemy], for a setting. Only sectors in contact with battalions on both
// sides fight. In such a sector the side that wins loses LOSS.win figures for each opposing
// battalion, the side that loses LOSS.lose for each, and an even fight costs each side LOSS.even
// per opposing battalion. Refused sectors lose nobody. A teaching rule, not Leuthen's losses.
export const LOSS = { win: 1, even: 2, lose: 3 };
export function casualties(angle, load, m = MODEL) {
  const by = sectors(angle, load, m).map((s) => {
    if (!s.contact || s.a === 0) return [0, 0];
    const fr = s.result === "win" ? LOSS.win : s.result === "lose" ? LOSS.lose : LOSS.even;
    const er = s.result === "win" ? LOSS.lose : s.result === "lose" ? LOSS.win : LOSS.even;
    return [fr * s.d, er * s.a];
  });
  return { f: by.reduce((t, x) => t + x[0], 0), e: by.reduce((t, x) => t + x[1], 0), by };
}

// The live readout, under 45 characters: the sector results (zero counts left out), the best ratio
// where the lines touch, then figures down, friendly vs enemy. If a transient mix of results would
// run past 44 characters, the ratio is left out (the machine's dial still shows it).
export function readout(angle, load, m = MODEL) {
  const t = summary(angle, load, m);
  const c = casualties(angle, load, m);
  const parts = [];
  if (t.win) parts.push(`${t.win} win`);
  if (t.even) parts.push(`${t.even} even`);
  if (t.lose) parts.push(`${t.lose} lose`);
  if (t.refused) parts.push(`${t.refused} refused`);
  const down = `${c.f} vs ${c.e} down`;
  const text = [...parts, ratioText(t.best), down].join(" · ");
  return text.length < 45 ? text : [...parts, down].join(" · ");
}
