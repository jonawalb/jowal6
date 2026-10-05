// The coalition's upper hand: how many of four signs of a strong game by Washington, Taipei and Tokyo hold this
// month. Beijing steps back only when at least two do (data/moves/cn.js, cn_pause; js/engine.js isOver), and the
// fewer hold, the more the computer's Beijing wants to answer coalition pressure in kind (js/ai.js). Illustrative.
export const EDGE_SIGNS = [
  ['Taiwan’s position 70 or more', s => s.tw >= 70],
  ['Coalition cohesion 70 or more', s => s.coal >= 70],
  ['China’s home support below 45', s => s.c.cn.support < 45],
  ['The coalition holds the Strait or the South', s => s.ctrl.strait === 'blue' || s.ctrl.south === 'blue'],
];
export const EDGE_NEED = 2;
/** The signs that hold: [[label, true|false], ...]. */
export const edgeSigns = s => EDGE_SIGNS.map(([label, ok]) => [label, !!ok(s)]);
/** How many hold (0–4). */
export const coalitionEdge = s => EDGE_SIGNS.filter(([, ok]) => ok(s)).length;
