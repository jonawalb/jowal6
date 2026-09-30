// "Run 200 hunts": a simple automatic hunter plays the same rules against subs that sprint more or less
// often. It shows the quiet-versus-sprint trade: sprinting is louder but reaches the gap sooner.
import { GAME } from '../data/params.js';
import { newGame, advance, place, orderShip, prosecute, canPlace } from './game.js';
import { activeAt } from './sensors.js';
import { cellCenter, pWithin } from './filter.js';
import { dist } from './geo.js';

export const SHARES = [0, 0.2, 0.4, 0.6];
export const PER = 50;

/** Heat cells in descending order of probability. */
function ranked(heat) { return Array.from(heat.keys()).sort((a, b) => heat[b] - heat[a]); }

function bestFree(g, heat, r) {
  const h = g.t + 1;
  for (const k of ranked(heat).slice(0, 60)) {
    const c = cellCenter(k);
    if (!g.assets.some(a => activeAt(a, h) && dist(a.p, c) < r)) return c;
  }
  return cellCenter(ranked(heat)[0]);
}

/**
 * The automatic hunter's rule of thumb, one hour at a time:
 * send the ship to the most likely cell; lay a buoy field every third hour and an aircraft sweep every
 * sixth hour on the most likely uncovered cell; prosecute when the map puts at least a 50% chance within
 * range of a point (checking the top cells and this hour's contacts), or on the last hour regardless.
 */
export function autoStep(g) {
  const snap = g.snaps[g.snaps.length - 1];
  const top = ranked(snap.heat).slice(0, 8).map(cellCenter);
  const cands = [...top, ...g.contacts.filter(c => c.h === g.t).map(c => c.p)];
  let best = null, bp = -1;
  for (const c of cands) { const p = pWithin(g.filter, c, GAME.prosR); if (p > bp) { bp = p; best = c; } }
  if (bp >= 0.5 || g.t >= GAME.hours - 1) { prosecute(g, best); return; }
  orderShip(g, top[0]);
  if (g.t % 3 === 1 && canPlace(g, 'buoy')) place(g, 'buoy', bestFree(g, snap.heat, 25));
  if (g.t % 6 === 3 && canPlace(g, 'mpa')) place(g, 'mpa', bestFree(g, snap.heat, 35));
}

export function autoHunt(opts) {
  const g = newGame({ ...opts, particles: GAME.batchParticles });
  while (!g.over) { autoStep(g); if (!g.over) advance(g); }
  const first = g.contacts.find(c => c.real);
  return { kind: g.over.kind, h: g.over.h, beh: g.sub.beh, heard: first ? first.h : null };
}

/**
 * Run SHARES.length x PER hunts without freezing the page. onProgress(done, total) after each hunt.
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
