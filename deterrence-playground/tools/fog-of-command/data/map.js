// Fog of Command: the fictional Varn valley. Every place name is invented; the map is not of anywhere.
// Sixteen sectors in four columns (roads) and four rows, plus the objective, Tarn Crossing, behind them.
// Row 0 is the north approach (Red enters here), row 1 the forward zone, row 2 Blue's main line and
// row 3 the rear area. Edges carry movement time in hours (NOTIONAL: one hour per hop on a road, two
// across a ridge or on the long roads from the outer columns to the crossing).

export const COLS = ['West', 'Center-west', 'Center-east', 'East'];
export const ROWS = ['North approach', 'Forward zone', 'Main line', 'Rear area'];

const NAMES = [
  ['West Pass', 'Harrow Gap', 'Cairn Gap', 'East Track'],
  ['Fenwick Marsh', 'Alder Woods', 'Millfield', 'Kestrel Hills'],
  ['Ashby', 'Brook Hill', 'Orchard Rise', 'Hollow Mill'],
  ['Reedbank', 'Wren Cross', 'Tolly Farm', 'Stonegate'],
];
const TERRAIN = [
  ['pass', 'pass', 'pass', 'pass'],
  ['marsh', 'woods', 'fields', 'hills'],
  ['village', 'hills', 'fields', 'village'],
  ['fields', 'village', 'fields', 'woods'],
];
const PREFIX = ['n', 'f', 'm', 's'];

export const NODES = [];
for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) NODES.push({ id: `${PREFIX[r]}${c}`, name: NAMES[r][c], col: c, row: r, terrain: TERRAIN[r][c] });
NODES.push({ id: 'x', name: 'Tarn Crossing', col: 1.5, row: 4, terrain: 'objective' });

export const IDX = Object.fromEntries(NODES.map((n, i) => [n.id, i]));
export const NODE = Object.fromEntries(NODES.map(n => [n.id, n]));
export const NORTH = ['n0', 'n1', 'n2', 'n3'];
export const FORWARD = ['f0', 'f1', 'f2', 'f3'];
export const MAIN = ['m0', 'm1', 'm2', 'm3'];
export const REAR = ['s0', 's1', 's2', 's3'];
export const OBJ = 'x';
/** Column of a sector (null for the crossing). */
export const colOf = id => (id === OBJ || !NODE[id] ? null : NODE[id].col);

export const EDGES = [
  // Down each road.
  ...[0, 1, 2, 3].flatMap(c => [[`n${c}`, `f${c}`, 1], [`f${c}`, `m${c}`, 1], [`m${c}`, `s${c}`, 1]]),
  // Across the north: ridges between the passes.
  ['n0', 'n1', 2], ['n1', 'n2', 2], ['n2', 'n3', 2],
  // Across the forward zone: tracks, with the Spine ridge in the middle.
  ['f0', 'f1', 1], ['f1', 'f2', 2], ['f2', 'f3', 1],
  // Along the main line and the rear road.
  ['m0', 'm1', 1], ['m1', 'm2', 1], ['m2', 'm3', 1],
  ['s0', 's1', 1], ['s1', 's2', 1], ['s2', 's3', 1],
  // To the crossing: short from the center, long from the outer columns.
  ['s1', 'x', 1], ['s2', 'x', 1], ['s0', 'x', 2], ['s3', 'x', 2],
];
