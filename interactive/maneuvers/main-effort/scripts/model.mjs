// The main-effort model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Notional, not doctrine: a fixed set of weights (combat power) is shared among
// four sectors of a wall. A sector's gate breaks once the weight on it reaches
// `breach`; a sector with less than `hold` on it cannot keep its gate down and
// the defender pushes it up. The thresholds are teaching numbers, stated as such.

export const MODEL = {
  discs: 12,       // weights to share out: the force's combat power
  sectors: 4,      // sectors of the wall
  breach: 6,       // discs on one gate that shear its pins
  hold: 1,         // discs a sector needs to keep its gate held down
  carry: 4,        // most discs the loader lifts in one trip
};

export const NAMES = ["A", "B", "C", "D"];

// Supporting sectors get `each` discs; the main effort gets the rest.
// main = -1 means no main effort: the discs are spread as evenly as they go.
export function allocate(main, each, m = MODEL) {
  if (main < 0) {
    const base = Math.floor(m.discs / m.sectors);
    return Array.from({ length: m.sectors }, (_, i) => base + (i < m.discs % m.sectors ? 1 : 0));
  }
  const per = Math.max(0, Math.min(each, Math.floor(m.discs / m.sectors)));
  return Array.from({ length: m.sectors }, (_, i) => (i === main ? m.discs - per * (m.sectors - 1) : per));
}

// What one sector does with n discs on it.
export function stateOf(n, m = MODEL) {
  if (n >= m.breach) return "breach";
  if (n >= m.hold) return "held";
  return "exposed";
}

// Gate travel in world units: positive is down. Held gates press their springs a
// little (up to 2 units just below the breach load); a breached gate drops 15;
// an exposed gate is pushed up 6.
export function gateDrop(n, m = MODEL) {
  const s = stateOf(n, m);
  if (s === "breach") return 15;
  if (s === "exposed") return -6;
  return (2 * n) / m.breach;
}

// The card readout for a set of stacks, naming the designated main effort (or the
// heaviest stack when main is -1).
export function summary(stacks, main = -1, m = MODEL) {
  const states = stacks.map((n) => stateOf(n, m));
  const breaches = states.filter((s) => s === "breach").length;
  const exposed = states.filter((s) => s === "exposed").length;
  const top = main >= 0 ? main : stacks.indexOf(Math.max(...stacks));
  const even = Math.max(...stacks) - Math.min(...stacks) <= 1;
  const head = even ? `Spread: ${stacks[0]} each` : `Main ${NAMES[top]}: ${stacks[top]} of ${m.discs}`;
  const result = breaches ? "breach" : "no breach";
  const rest = exposed ? `${exposed} exposed` : even ? "all held" : "rest held";
  return `${head} · ${result} · ${rest}`;
}

// The next loader trip from `stacks` toward `target`: take up to `carry` discs from the
// stack with the largest surplus and put them on the stack with the largest deficit.
export function nextTrip(stacks, target, m = MODEL) {
  let from = -1, to = -1, surplus = 0, deficit = 0;
  stacks.forEach((n, i) => {
    if (n - target[i] > surplus) { surplus = n - target[i]; from = i; }
    if (target[i] - n > deficit) { deficit = target[i] - n; to = i; }
  });
  if (from < 0 || to < 0) return null;
  return { from, to, count: Math.min(surplus, deficit, m.carry) };
}

// ---- Battlefield view (notional) ----
// What each disc is on the ground: every sector starts with three elements of its own, and a
// sector gives up its last-listed element first, so its rifle squad is the last to go.
// sq = rifle squad, mg = machine-gun team, tk = attached tank.
export const HOME = [["sq", "mg", "tk"], ["sq", "tk", "mg"], ["sq", "mg", "tk"], ["sq", "tk", "mg"]];

// Men down (notional), by sector, for the discs on the gates. Success is not free:
// - a held sector loses ceil(n / 2) men: the more it commits to an attack that stalls, the more it loses;
// - a breaching sector loses 2: the enemy there gives way quickly;
// - each exposed sector costs 2 more men in the nearest occupied sector (fire into its open flank);
// - the enemy loses 3 of its 4 men in a breached sector and 1 in a held sector with 3 or more discs.
export function casualties(stacks, m = MODEL) {
  const st = stacks.map((n) => stateOf(n, m));
  const blueBy = stacks.map((n, i) => (st[i] === "breach" ? 2 : st[i] === "held" ? Math.ceil(n / 2) : 0));
  st.forEach((s, i) => {
    if (s !== "exposed") return;
    let best = -1;
    stacks.forEach((n, j) => { if (n > 0 && (best < 0 || Math.abs(j - i) < Math.abs(best - i))) best = j; });
    if (best >= 0) blueBy[best] += 2;
  });
  const redBy = stacks.map((n, i) => (st[i] === "breach" ? 3 : n >= 3 ? 1 : 0));
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  return { blue: sum(blueBy), red: sum(redBy), blueBy, redBy };
}

// The card readout with men down, kept under 45 characters: friendly vs enemy.
export function readoutOf(stacks, main = -1, m = MODEL) {
  const states = stacks.map((n) => stateOf(n, m));
  const breaches = states.filter((s) => s === "breach").length;
  const exposed = states.filter((s) => s === "exposed").length;
  const top = main >= 0 ? main : stacks.indexOf(Math.max(...stacks));
  const even = Math.max(...stacks) - Math.min(...stacks) <= 1;
  const c = casualties(stacks, m);
  const head = even ? `Spread ${stacks[0]} each` : `Main ${NAMES[top]} ${stacks[top]}`;
  const parts = [head, breaches ? "breach" : "no breach"];
  if (exposed) parts.push(`${exposed} exposed`);
  parts.push(`${c.blue} vs ${c.red} down`);
  let text = parts.join(" · ");
  if (text.length >= 45) text = text.replace(" · no breach", "");
  return text;
}
