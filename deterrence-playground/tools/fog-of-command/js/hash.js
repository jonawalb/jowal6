// Shareable state: #p=d&s=4172&n=9&l=0-o-b5-9.0-s-b7-g.1-f-b9-5
// p = side played (d defend as Blue, a attack as Red); s = scenario; n = hours played;
// l = your actions: hour-kind-unit-value, kind o order / e entry (value = sector index), s stance (g or h),
// f fire (sector index). Loading the link replays the game exactly, so a finished game reopens on its review.
import { NODES } from '../data/map.js';
import { FORCES } from '../data/params.js';

const IDS = new Set([...FORCES.blue, ...FORCES.red].map(d => d.id));

export function writeHash(g, me) {
  const q = new URLSearchParams();
  q.set('p', me === 'red' ? 'a' : 'd');
  q.set('s', g.seed);
  if (g.t) q.set('n', g.t);
  const l = g.log.map(a => `${a.t}-${a.kind}-${a.unit}-${a.kind === 's' ? (a.v === 'give' ? 'g' : 'h') : NODES.findIndex(n => n.id === a.v)}`);
  if (l.length) q.set('l', l.join('.'));
  history.replaceState(null, '', '#' + q.toString());
}

export function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const s = Math.round(Number(q.get('s')));
  const log = [];
  for (const x of (q.get('l') || '').split('.')) {
    const m = x.match(/^(\d+)-([oesf])-([a-z]\d+)-(\d+|g|h)$/);
    if (!m || !IDS.has(m[3])) continue;
    const t = +m[1], kind = m[2];
    if (kind === 's') { if (m[4] === 'g' || m[4] === 'h') log.push({ t, kind, unit: m[3], v: m[4] === 'g' ? 'give' : 'hold' }); continue; }
    const node = NODES[+m[4]];
    if (node) log.push({ t, kind, unit: m[3], v: node.id });
  }
  const p = q.get('p');
  return {
    me: p === 'a' ? 'red' : p === 'd' ? 'blue' : null,
    seed: Number.isFinite(s) && s >= 1 && s <= 999999 ? s : null,
    n: Math.max(0, Math.min(16, Math.round(Number(q.get('n')) || 0))),
    log,
  };
}
