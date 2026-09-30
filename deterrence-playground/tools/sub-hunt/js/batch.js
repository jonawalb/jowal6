// "Run 200 hunts": a simple automatic hunter plays the same rules against subs that sprint more or less
// often. It shows the quiet-versus-sprint trade: sprinting is louder but reaches the gap sooner.
import { GAME } from '../data/params.js';
import { newGame, advance, place, prosecute, canPlace } from './game.js';
import { activeAt } from './sensors.js';
import { cellCenter } from './filter.js';
import { dist } from './geo.js';

export const SHARES = [0, 0.2, 0.4, 0.6];
export const PER = 50;

/** The brightest heat cell not already inside a working sensor. */
function bestFree(g, heat, r) {
  const h = g.t + 1;
  const ranked = Array.from(heat.keys()).sort((a, b) => heat[b] - heat[a]);
  for (const k of ranked.slice(0, 60)) {
    const c = cellCenter(k);
    if (!g.assets.some(a => activeAt(a, h) && dist(a.p, c) < r)) return c;
  }
  return cellCenter(ranked[0]);
}

/**
 * The automatic hunter's rule of thumb, one hour at a time: attack when the map's best attack point
 * holds at least 50% (or on the last hour); otherwise drop sonobuoys every fourth hour and send the
 * aircraft every eighth, each on the brightest water not already covered. The ship steers itself.
 */
export function autoStep(g) {
  const snap = g.snaps[g.snaps.length - 1];
  if (snap.best.v >= 0.5 || g.t >= GAME.hours - 1) { prosecute(g, snap.best.p); return; }
  if (g.t % 4 === 0 && canPlace(g, 'buoy')) place(g, 'buoy', bestFree(g, snap.heat, 25));
  else if (g.t % 8 === 2 && canPlace(g, 'mpa')) place(g, 'mpa', bestFree(g, snap.heat, 35));
}

export function autoHunt(opts) {
  const g = newGame({ ...opts, particles: opts.particles || GAME.batchParticles });
  while (!g.over) { autoStep(g); if (!g.over) advance(g); }
  const first = g.contacts.find(c => c.real);
  return { kind: g.over.kind, h: g.over.h, beh: g.sub.beh, heard: first ? first.h : null };
}

/**
 * Run SHARES.length x PER hunts without freezing the page. onProgress(done, total) after each round.
 * Seeds are derived from baseSeed so the batch is reproducible.
 */
export async function runBatch(baseSeed, beh, onProgress, signal) {
  const rows = SHARES.map(share => ({ share, found: 0, missed: 0, escaped: 0, timeout: 0, heard: 0, hours: [] }));
  const total = SHARES.length * PER;
  let done = 0;
  for (let i = 0; i < PER; i++) {
    for (const row of rows) {
      if (signal?.aborted) return null;
      const r = autoHunt({ seed: (baseSeed * 7919 + i * 104729 + Math.round(row.share * 100)) % 999983 + 1, beh, share: row.share });
      row[r.kind] += 1;
      if (r.kind === 'found') row.hours.push(r.h);
      if (r.heard !== null) row.heard += 1;
      done += 1;
    }
    onProgress?.(done, total);
    await new Promise(res => setTimeout(res, 0));
  }
  return rows;
}
