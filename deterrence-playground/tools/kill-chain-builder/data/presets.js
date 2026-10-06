// Preset boards. All are notional teaching configurations built from the catalog in catalog.js.
// They illustrate chain structure (who reports to whom) and do not depict real force laydowns.
// Board coordinates are in a 960 x 540 layout space: sensors left, command middle, shooters right.

export const PRESETS = {
  pla: {
    name: 'PLA long-range ASBM chain',
    blurb: 'Satellites and over-the-horizon radar feed a theater headquarters that releases anti-ship ballistic missiles.',
    sc: { target: 'cv', D: 1200, kt: 30, emcon: false },
    nodes: [
      { type: 'sat', x: 30, y: 110 },
      { type: 'oth', x: 30, y: 270 },
      { type: 'aew', x: 30, y: 430, dist: 900 },
      { type: 'hq', x: 482, y: 190 },
      { type: 'dl', x: 300, y: 380 },
      { type: 'asbm', x: 770, y: 150, v: 'df21' },
      { type: 'asbm', x: 770, y: 310, v: 'df26' },
    ],
    links: [[0, 3], [1, 3], [2, 4], [4, 3], [3, 5], [3, 6]],
  },
  twn: {
    name: 'Taiwan coastal defense chain',
    blurb: 'Coastal radar and a drone report to a local command that fires coastal anti-ship missiles.',
    sc: { target: 'amph', D: 100, kt: 12, emcon: false },
    nodes: [
      { type: 'crd', x: 30, y: 140 },
      { type: 'uav', x: 30, y: 330, dist: 30 },
      { type: 'lc', x: 400, y: 235 },
      { type: 'cm', x: 770, y: 140, v: 'short' },
      { type: 'cm', x: 770, y: 330, v: 'short' },
    ],
    links: [[0, 2], [1, 2], [2, 3], [2, 4]],
  },
  mesh: {
    name: 'U.S. JADC2-style mesh',
    blurb: 'Many sensors on shared datalinks, several deciders and several shooters, hunting a mobile launcher.',
    sc: { target: 'tel', D: 400, kt: 22, emcon: false },
    nodes: [
      { type: 'sat', x: 30, y: 50 },
      { type: 'aew', x: 30, y: 180, dist: 220 },
      { type: 'uav', x: 30, y: 310, dist: 25 },
      { type: 'uav', x: 30, y: 440, dist: 35 },
      { type: 'hq', x: 300, y: 50 },
      { type: 'dl', x: 482, y: 200 },
      { type: 'dl', x: 482, y: 380 },
      { type: 'cm', x: 770, y: 70, v: 'long' },
      { type: 'air', x: 770, y: 230, dist: 110 },
      { type: 'air', x: 770, y: 390, dist: 140 },
    ],
    links: [[0, 4], [1, 4], [1, 5], [2, 5], [3, 6], [2, 6], [4, 7], [4, 5], [5, 8], [6, 9], [5, 9]],
  },
};
