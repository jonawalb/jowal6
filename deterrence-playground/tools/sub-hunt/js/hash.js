// Shareable state: #seed=1234&beh=any&n=3&log=0l-750_6512_90.0h-880_6410.1x-800_6420
// Each log entry is turn + code + lon_lat (× 100), and a heading for buoy lines. Codes: l buoy line,
// c buoy circle, a aircraft box, h helicopter dip, m move ship, d ship sprint, x attack. n is the number
// of turns ended. Loading the link replays the hunt exactly, so a finished hunt reopens on its review
// and an unfinished one resumes. Links from the older one-tool-per-hour version do not carry over.
import { GAME } from '../data/params.js';
import { BEHS } from './sub.js';

export function encodeLog(log) {
  return log.map(e => `${e.t}${e.k}${Math.round(e.p[0] * 100)}_${Math.round(e.p[1] * 100)}${e.k === 'l' ? `_${e.a}` : ''}`).join('.');
}

export function decodeLog(s) {
  if (!s) return [];
  return s.split('.').map(x => x.match(/^(\d+)([lcahmdx])(-?\d+)_(-?\d+)(?:_(\d+))?$/)).filter(Boolean)
    .map(m => ({ t: +m[1], k: m[2], p: [+m[3] / 100, +m[4] / 100], a: m[5] ? +m[5] : 0 }));
}

export function writeHash(g) {
  const q = new URLSearchParams();
  q.set('seed', g.seed);
  if (g.beh !== 'any') q.set('beh', g.beh);
  if (g.turn || g.log.length) { q.set('n', g.turn); q.set('log', encodeLog(g.log)); }
  history.replaceState(null, '', '#' + q.toString());
}

export function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const seed = Math.round(Number(q.get('seed')));
  return {
    seed: Number.isFinite(seed) && seed >= 1 && seed <= 999999 ? seed : null,
    beh: BEHS.includes(q.get('beh')) ? q.get('beh') : 'any',
    n: Math.max(0, Math.min(GAME.turns, Math.round(Number(q.get('n')) || 0))),
    log: decodeLog(q.get('log')),
  };
}
