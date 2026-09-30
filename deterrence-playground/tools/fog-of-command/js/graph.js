// Movement graph: neighbours, hop distances and shortest paths (Dijkstra over the 13-sector map).
import { NODES, EDGES } from '../data/map.js';

const ADJ = Object.fromEntries(NODES.map(n => [n.id, []]));
for (const [a, b, h] of EDGES) { ADJ[a].push([b, h]); ADJ[b].push([a, h]); }

export const neighbours = id => (ADJ[id] || []).map(([b]) => b);
export const edgeHours = (a, b) => ((ADJ[a] || []).find(([n]) => n === b) || [null, Infinity])[1];

/** Shortest path by hours from a to b as a list of node ids (excluding a). */
export function path(a, b) {
  if (a === b || !ADJ[a] || !ADJ[b]) return [];
  const dist = { [a]: 0 }, prev = {}, open = new Set([a]);
  while (open.size) {
    let u = null;
    for (const n of open) if (u === null || dist[n] < dist[u]) u = n;
    open.delete(u);
    if (u === b) break;
    for (const [v, h] of ADJ[u]) {
      const d = dist[u] + h;
      if (dist[v] === undefined || d < dist[v]) { dist[v] = d; prev[v] = u; open.add(v); }
    }
  }
  const out = [];
  for (let n = b; n !== a; n = prev[n]) { if (n === undefined) return []; out.unshift(n); }
  return out;
}

export const travelHours = (a, b) => { let t = 0, cur = a; for (const n of path(a, b)) { t += edgeHours(cur, n); cur = n; } return t; };

/** Hop distance (roads, ignoring hours) between every pair: used for how far units can see. */
const HOPS = {};
for (const a of NODES) {
  const d = { [a.id]: 0 }, q = [a.id];
  while (q.length) { const u = q.shift(); for (const [v] of ADJ[u]) if (d[v] === undefined) { d[v] = d[u] + 1; q.push(v); } }
  HOPS[a.id] = d;
}
export const hops = (a, b) => (HOPS[a] && HOPS[a][b] !== undefined ? HOPS[a][b] : Infinity);
