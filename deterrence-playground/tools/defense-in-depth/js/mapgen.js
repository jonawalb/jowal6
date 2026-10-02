// Map generation (SPEC §2.3): deterministic from the seed, scale-parametric, no literal grid sizes.
// Always one ridge crest row in the first battle zone (forward slope before it, reverse slope after; Biddle
// pp. 96-97; Hunzeker pp. 78-79), villages, woods, broken ground in no-man's land and the outpost zone, a
// stream valley in the rear zone at Corps and Army, elevation 0-3, and the inherited (free) works.
import { gridFor } from './grid.js';
import { makeRng, STREAM } from './rng.js';
import { T } from '../data/terrain.js';
import { VILLAGES, WOODS, RIDGES, STREAMS } from '../data/names.js';

const shuffle = (a, r) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = r.int(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** Empty work layers for n sectors. */
export function emptyFeat(n) {
  return {
    trench: new Uint8Array(n),   // 0 none, 1 E-W (across the front), 2 N-S
    comm: new Uint8Array(n),     // communication trench
    obst: new Float32Array(n),   // obstacle integrity 0..1 (wire 1917-18 / mines Modern)
    obstC: new Uint8Array(n),    // 1 = concealed obstacle
    strong: new Uint8Array(n),   // 0 none, 1 strongpoint, 2 concrete strongpoint
    dugout: new Uint8Array(n),
    dummy: new Uint8Array(n),
    churn: new Uint8Array(n),    // shell-churned ground (movement +0.3)
    wear: new Float32Array(n),   // trench / strongpoint cover lost to Destroy fire
    breach: new Uint8Array(n),   // engineer breach hours accumulated
  };
}

/**
 * Generate the sectors for a scale and seed.
 * opts (campaign context, all optional): { broken: extra probability of broken ground forward,
 *   freeTrench: rows overriding the scale's inherited trench rows, corridor: true for two villages
 *   flanking a narrow corridor (battle 3) }
 * @returns {{ terrain: Uint8Array, elev: Uint8Array, name: (string|null)[], feat: object, ridge: string, stream: string|null }}
 */
export function mapgen(scaleId, seed, opts = {}) {
  const G = gridFor(scaleId), S = G.S, r = makeRng(seed, STREAM.mapgen);
  const { n, cols, rows, crest } = G;
  const terrain = new Uint8Array(n), elev = new Uint8Array(n), name = new Array(n).fill(null);
  const b = S.bands, rearStart = b.rear[0];
  // Elevation: forward slope rising to the crest, reverse slope falling behind it, gentle rear ground.
  for (let i = 0; i < n; i++) {
    const row = G.row[i];
    let e;
    if (row <= b.nml[1]) e = r.u() < 0.15 ? 1 : 0;
    else if (row <= crest) e = Math.min(3, Math.floor((row - b.nml[1]) * 3 / (crest - b.nml[1]) + 0.3));
    else if (row <= crest + 2) e = Math.max(0, 3 - (row - crest));
    else e = r.u() < 0.35 ? 2 : r.u() < 0.6 ? 1 : 0;
    if (row !== crest && row > b.nml[1] && r.u() < 0.12) e = Math.max(0, Math.min(3, e + (r.u() < 0.5 ? -1 : 1)));
    elev[i] = e;
  }
  // Base terrain bands.
  const brokenP = row => (row === b.nml[0] ? 0.85 : row <= b.outpost[1] ? 0.6 : 0.08) + (opts.broken || 0) * (row <= b.outpost[1] ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const row = G.row[i];
    if (row === crest) terrain[i] = T.crest;
    else if (row > crest && row <= crest + 2) terrain[i] = T.reverse;
    else if (row >= b.nml[0] && r.u() < brokenP(row)) terrain[i] = T.broken;
    else terrain[i] = T.open;
  }
  // Stream valley across ~30% of the columns in the rear zone (Corps and Army only).
  let stream = null;
  if (S.divs > 1) {
    const vr = rearStart + 2 + r.int(Math.max(1, Math.min(6, rows - rearStart - 4)));
    const w = Math.max(2, Math.round(cols * 0.3)), c0 = r.int(cols - w + 1);
    for (let c = c0; c < c0 + w; c++) { const i = G.idx(vr, c); terrain[i] = T.valley; elev[i] = 0; }
    stream = STREAMS[r.int(STREAMS.length)];
  }
  // Villages (2-3 per 100 sectors) and woods (3-4 per 100), never in no-man's land or the assembly rows.
  const eligible = [];
  for (let i = 0; i < n; i++) if (G.row[i] > b.nml[1] && terrain[i] !== T.valley) eligible.push(i);
  const pool = shuffle(eligible, r);
  const nVil = Math.round(n * (0.02 + 0.01 * r.u())), nWood = Math.round(n * (0.03 + 0.01 * r.u()));
  const vNames = shuffle(VILLAGES, r), wNames = shuffle(WOODS, r);
  let k = 0;
  const spaced = (i, kind) => !G.nbrs[i].some(j => terrain[j] === kind);
  if (opts.corridor) {   // battle 3: two villages flanking a one-column corridor in the battle zone
    const c = 1 + r.int(Math.max(1, cols - 3)), row = b.battle[0] + 1;
    for (const cc of [c - 1, c + 1]) { const i = G.idx(row, cc); if (i >= 0) { terrain[i] = T.village; name[i] = vNames[k++]; } }
  }
  for (const i of pool) {
    if (k >= nVil) break;
    if (terrain[i] === T.village || !spaced(i, T.village)) continue;
    terrain[i] = T.village; name[i] = vNames[k++ % vNames.length];
  }
  let w = 0;
  for (const i of pool) {
    if (w >= nWood) break;
    if (terrain[i] === T.village || terrain[i] === T.woods || G.row[i] === crest) continue;
    terrain[i] = T.woods; name[i] = wNames[w++ % wNames.length];
  }
  // Inherited works: trench rows (outpost line, first battle-zone row, objective line, and deeper positions
  // at Corps/Army) and a communication trench in every second column.
  const feat = emptyFeat(n);
  for (const row of opts.freeTrench || S.freeTrench) for (let c = 0; c < cols; c++) { const i = G.idx(row, c); if (i >= 0) feat.trench[i] = 1; }
  const [cr0, cr1] = S.commRows;
  for (let c = 0; c < cols; c += S.commEvery) for (let row = cr0; row <= Math.min(cr1, rows - 1); row++) feat.comm[G.idx(row, c)] = 1;
  return { terrain, elev, name, feat, ridge: RIDGES[r.int(RIDGES.length)], stream };
}
