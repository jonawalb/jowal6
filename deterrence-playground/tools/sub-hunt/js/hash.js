// Shareable state: #seed=1234&beh=transit&sp=25&n=7&log=1b-950_6362.3s-880_6310
// n is the number of hours played; log holds every action with its hour. Loading the link replays the
// hunt exactly, so a finished hunt reopens on its reveal and an unfinished one resumes.
import { SUB } from '../data/params.js';

const BEH = ['transit', 'loiter', 'evade', 'unknown'];

export function encodeLog(log) {
  return log.map(e => `${e.t}${e.k}${Math.round(e.p[0] * 100)}_${Math.round(e.p[1] * 100)}`).join('.');
}

export function decodeLog(s) {
  if (!s) return [];
  return s.split('.').map(x => x.match(/^(\d+)([bmsp])(-?\d+)_(-?\d+)$/)).filter(Boolean)
    .map(m => ({ t: +m[1], k: m[2], p: [+m[3] / 100, +m[4] / 100] }));
}

export function writeHash(g) {
  const q = new URLSearchParams();
  q.set('seed', g.seed); q.set('beh', g.beh); q.set('sp', Math.round(g.share * 100));
  if (g.t || g.log.length) { q.set('n', g.t); q.set('log', encodeLog(g.log)); }
  history.replaceState(null, '', '#' + q.toString());
}

export function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const seed = Math.round(Number(q.get('seed')));
  const sp = Number(q.get('sp'));
  return {
    seed: Number.isFinite(seed) && seed >= 1 && seed <= 999999 ? seed : null,
    beh: BEH.includes(q.get('beh')) ? q.get('beh') : 'transit',
    share: Number.isFinite(sp) && q.has('sp') ? Math.max(0, Math.min(60, Math.round(sp / 5) * 5)) / 100 : SUB.sprintShare,
    n: Math.max(0, Math.min(40, Math.round(Number(q.get('n')) || 0))),
    log: decodeLog(q.get('log')),
  };
}
