// Map layers and the one-line legend (UI streamline #11, #6). Pure: no DOM, no engine imports, so the tests can
// check it. Each side has two primary layer chips; the rest sit under "More layers". The legend line shows only
// the symbols of layers that are on (plus the always-drawn ones); the "i" opens the full key.

/** Every layer, in menu order: [key, label]. */
export const LAYERS = [['zones', 'Zones'], ['lanes', 'Lanes'], ['cover', 'Coverage'], ['barrage', 'Barrage'], ['guns', 'Range rings'],
  ['obst', 'Obstacles'], ['enemy', 'Known enemy'], ['race', 'Race clock'], ['windows', 'Windows']];

/** The two chips each side sees on the bar. */
export const PRIMARY = { def: ['zones', 'lanes'], att: ['barrage', 'enemy'] };

/** Layers that only Detailed view draws (Simple hides range rings and the race clock). */
export const DETAIL_ONLY = new Set(['guns', 'race']);

/** Layers on at the start of a game. The primary pair, plus the ones without which the map hides the fight:
 * sighted enemies, works and obstacles, and lodgment windows (a judgment call, logged in the report). */
export function defaultLayers(side) {
  return new Set([...PRIMARY[side === 'att' ? 'att' : 'def'], 'enemy', 'obst', 'windows']);
}

/** Layers under "More layers" for a side (Simple drops the detail-only ones). */
export function moreLayers(side, simple = false) {
  const p = PRIMARY[side === 'att' ? 'att' : 'def'];
  return LAYERS.filter(([k]) => !p.includes(k) && !(simple && DETAIL_ONLY.has(k)));
}

/** Layers to draw: the chosen ones, plus any a planning step forces on, less the detail-only ones in Simple. */
export function effectiveLayers(layers, { simple = false, force = [] } = {}) {
  const out = new Set([...layers, ...force]);
  if (simple) for (const k of DETAIL_ONLY) out.delete(k);
  return out;
}

/** Layers a planning step shows while it is open (so the step's work is visible without hunting for chips). */
export const STEP_LAYERS = { lanes: ['lanes'], works: ['obst'], arty: ['barrage'], zones: ['zones'], fire: ['barrage'], front: ['barrage'] };

/** Legend items: [key, css class of the swatch, label]; `layer` null = always drawn. */
export const LEGEND = [
  [null, 'lg-mine', 'Your unit'], [null, 'lg-hp', 'Health: green left, red lost'], [null, 'lg-route', 'Order'], [null, 'lg-idle', 'Needs orders'],
  ['enemy', 'lg-foe', 'Enemy seen'], ['enemy', 'lg-move', 'Movement seen'],
  ['lanes', 'lg-lane', 'MG lane'], ['lanes', 'lg-lane enf', 'Enfilading lane'],
  ['cover', 'lg-cov', 'Fire directions'], ['barrage', 'lg-bar', 'Barrage now'], ['barrage', 'lg-bar next', 'Next hour'], ['barrage', 'lg-bar sos', 'Defensive fire'],
  ['guns', 'lg-guns', 'Beyond your guns'], ['obst', 'lg-wire', 'Wire or mines'], ['obst', 'lg-trench', 'Trench'], ['obst', 'lg-strong', 'Strongpoint'],
  ['windows', 'lg-win green', 'Lodgment window'], ['zones', 'lg-zone', 'Zones'], ['race', 'lg-race', 'Race clock'],
];

/** Legend items for the layers that are on (and the always-drawn ones). */
export const legendItems = layers => LEGEND.filter(([k]) => k == null || layers.has(k));
