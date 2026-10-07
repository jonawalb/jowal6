// Small helpers shared by the move lists.
/** Move a 0–100 track by d. Changes to the nuclear shadow are also written to the game's ledger (s.nukeLog, Batch C's
 * nuclear review), under the cause the engine set in s.why (a move, a posture, an event, the monthly drift...). */
export const T = (s, key, d) => {
  const [a, b] = key.split('.');
  if (b) { s.c[a][b] = Math.max(0, Math.min(100, s.c[a][b] + d)); return; }
  const was = s[a];
  s[a] = Math.max(0, Math.min(100, s[a] + d));
  if (a === 'nuke' && s.nukeLog && s[a] !== was) noteNuke(s, s[a] - was);
};
/** One ledger line per month and cause: { turn, c: cause key, d: change }. */
function noteNuke(s, d) {
  const c = s.why || 'other', e = s.nukeLog.find(x => x.turn === s.turn && x.c === c);
  if (e) e.d += d; else s.nukeLog.push({ turn: s.turn, c, d });
}
/** Did `who` choose move `id` this month? */
export const chose = (mv, who, id) => !!mv[who] && mv[who].actions.includes(id);
/** The follow-up option `who` picked for move `id` (or null). */
export const opt = (mv, who, id, q) => (chose(mv, who, id) && mv[who].follow?.[id]?.[q]) || null;
export const post = (mv, who) => (mv[who] && mv[who].posture) || 'hold';
export const at = (n, why) => s => (s.rung >= n ? null : why);
/** Follow-up question helper: q('route', 'Which route?', [['south', 'South', '...'], ['east', 'East', '...']]) */
export const q = (id, text, opts) => ({ id, text, opts: opts.map(([oid, label, explain]) => ({ id: oid, label, explain })) });
export const ROUTE = q('route', 'Which route?', [['south', 'Southern route', 'Through the Luzon Strait. Shorter, closer to China’s southern forces.'], ['east', 'Eastern route', 'Around through the Philippine Sea. Longer, further from China.']]);
export const SEA_Q = (text, list = ['north', 'strait', 'south', 'east']) => q('area', text, list.map(a => [a, { north: 'North', strait: 'Strait', south: 'South', east: 'East' }[a], { north: 'East China Sea and Japan’s southwest islands', strait: 'The Taiwan Strait', south: 'Luzon Strait', east: 'Philippine Sea' }[a]]));
/** Coalition-side holding check for a route area. */
export const routeOdds = (s, area) => (s.ctrl[area] === 'red' ? ['China holds that route', -20] : s.ctrl[area] === 'blue' ? ['Coalition holds that route', 10] : null);
