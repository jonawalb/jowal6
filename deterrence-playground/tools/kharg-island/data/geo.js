// Places and notional zones for the Kharg Island map.
// Public, base-level places only: towns as a whole and the island's published airport coordinates.
// Coordinates are the ones Wikipedia publishes for each place (checked 29 September 2026); keys match data/sources.js.
// Nothing on this map marks oil-terminal components, and every force position is a notional zone.

export const BOX = { lon0: 50.0, lon1: 51.0, lat0: 28.85, lat1: 29.72, width: 1000 };
/** Island detail inset: Kharg and Kharku at large scale. */
export const INSET_BOX = { lon0: 50.268, lon1: 50.372, lat0: 29.198, lat1: 29.35, width: 250 };

export const PLACES = [
  { k: 'genaveh', t: 'Bandar Ganaveh', ll: [50.5172, 29.5808], src: 'wikiGanaveh', side: 'end' },
  { k: 'rig', t: 'Bandar Rig', ll: [50.6308, 29.4872], src: 'wikiRig', side: 'start' },
  { k: 'bushehr', t: 'Bushehr', ll: [50.8514, 28.9264], src: 'wikiBushehr', side: 'end' },
];
/** Kharg Airport, published coordinates 29°15′34″N 50°19′24″E (Wikipedia). Shown only in the inset. */
export const AIRSTRIP = { t: 'Kharg airstrip', ll: [50.3233, 29.2594], src: 'wikiAirport' };
export const KHARG_CENTER = [50.312, 29.243]; // centroid of the OpenStreetMap outline
export const KHARKU_CENTER = [50.345, 29.321];

/** Measured from the OpenStreetMap coastline (scripts/build_land.py, unsimplified outline). */
export const MEASURED = {
  areaKm2: 21.5, lengthKm: 7.5, widthKm: 5.3, mainlandKm: 30.5, kharkuKm: 3.5,
  genavehKm: 42.5, bushehrKm: 63.2,
  nearestShore: [[50.3345, 29.2155], [50.6435, 29.1678]],
};

/**
 * Notional approach sides for the island inset: a path from open water, across the shore, to the airstrip
 * and on to the island as a whole. They are broad halves of the island, not beach assessments.
 */
export const SECTOR_GEO = {
  W: { from: [50.272, 29.232], path: [[50.272, 29.232], [50.292, 29.236], [50.3233, 29.2594], [50.312, 29.238], [50.316, 29.222]] },
  E: { from: [50.368, 29.268], path: [[50.368, 29.268], [50.338, 29.262], [50.3233, 29.2594], [50.312, 29.235]] },
};

/** Notional areas on the main map. None is a real position. */
export const ZONES = {
  usSea: { center: [50.14, 29.08], label: 'U.S. force at sea' },
  blockadeKm: 18,
  reinforce: [[50.62, 29.26], [50.345, 29.245]],
};
