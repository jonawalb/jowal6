// Shareable state: #seed=1234&beh=any&n=3&log=0l-750_6512r4.0h-880_6410.1x-800_6420
// Each log entry is turn + code + lon_lat (× 100), and an axis for buoy lines: r0–r7 is the axis index
// (× 22.5°, so r4 is east–west). Older links wrote a whole-degree heading as _90; they still load, and a
// line with no heading at all loads east–west. Codes: l buoy line,
// c buoy circle, a aircraft box, h helicopter dip, m move ship, d ship sprint, x attack. n is the number
// of turns ended. Loading the link replays the hunt exactly, so a finished hunt reopens on its review
// and an unfinished one resumes. Links from the older one-tool-per-hour version do not carry over.
import { GAME } from '../data/params.js';
import { BEHS } from './sub.js';
import { AXIS_STEP } from './sensors.js';

function lineTag(a) {
  const k = a / AXIS_STEP;
  return Number.isInteger(k) ? `r${k}` : `_${Math.round(a)}`;
}

export function encodeLog(log) {
  return log.map(e => `${e.t}${e.k}${Math.round(e.p[0] * 100)}_${Math.round(e.p[1] * 100)}${e.k === 'l' ? lineTag(e.a ?? 90) : ''}`).join('.');
}

export function decodeLog(s) {
  if (!s) return [];
  return s.split('.').map(x => x.match(/^(\d+)([lcahmdx])(-?\d+)_(-?\d+)(?:_(\d+)|r([0-7]))?$/)).filter(Boolean)
    .map(m => {
      const e = { t: +m[1], k: m[2], p: [+m[3] / 100, +m[4] / 100] };
      if (m[2] === 'l') e.a = m[5] ? +m[5] % 180 : m[6] ? +m[6] * AXIS_STEP : 90;
      return e;
    });
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
