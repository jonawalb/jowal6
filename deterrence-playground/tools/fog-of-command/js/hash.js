// Shareable state: #s=4172&n=9&o=3-d-3.5-a-4&dr=0-1.2-2
// o = orders as hour-unit-node index; dr = drone taskings as hour-node index; n = hours played.
// Loading the link replays the game exactly, so a finished game reopens on its review.
import { NODES } from '../data/map.js';

const UNITS = ['a', 'b', 'e', 'c', 'd'];

export function writeHash(g) {
  const q = new URLSearchParams();
  q.set('s', g.seed);
  if (g.t) q.set('n', g.t);
  const o = g.orders.map(x => `${x.t}-${x.unit}-${NODES.findIndex(n => n.id === x.dest)}`);
  if (o.length) q.set('o', o.join('.'));
  const dr = Object.entries(g.drones).map(([t, n]) => `${t}-${NODES.findIndex(x => x.id === n)}`);
  if (dr.length) q.set('dr', dr.join('.'));
  history.replaceState(null, '', '#' + q.toString());
}

export function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const s = Math.round(Number(q.get('s')));
  const orders = (q.get('o') || '').split('.').map(x => x.match(/^(\d+)-([a-e])-(\d)$/)).filter(m => m && UNITS.includes(m[2]) && NODES[+m[3]])
    .map(m => ({ t: +m[1], unit: m[2], dest: NODES[+m[3]].id }));
  const drones = {};
  for (const x of (q.get('dr') || '').split('.')) { const m = x.match(/^(\d+)-(\d)$/); if (m && NODES[+m[2]]) drones[+m[1]] = NODES[+m[2]].id; }
  return {
    seed: Number.isFinite(s) && s >= 1 && s <= 999999 ? s : null,
    n: Math.max(0, Math.min(16, Math.round(Number(q.get('n')) || 0))),
    orders, drones,
  };
}
