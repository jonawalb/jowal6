// The theater board: four sea areas plus each side's rear, and Taiwan's coast in four landing sectors plus an
// inland reserve. Region level only (no beaches, no coordinates). Strengths are notional, not orders of battle.
export const SEA = ['north', 'strait', 'south', 'east'];
export const AREAS = [...SEA, 'rear'];
export const COAST = ['nw', 'cw', 'sw', 'ec'];
export const ISLAND = [...COAST, 'res'];
export const AREA_LABEL = {
  north: 'North', strait: 'Strait', south: 'South', east: 'East', rear: 'Rear', transit: 'In transit',
  nw: 'Northwest coast', cw: 'Central-west coast', sw: 'Southwest coast', ec: 'East coast', res: 'Inland reserve',
};
export const AREA_SHORT = { nw: 'NW', cw: 'CW', sw: 'SW', ec: 'E', res: 'Res' };
export const AREA_TEXT = {
  north: 'East China Sea and Japan’s southwest islands',
  strait: 'The Taiwan Strait',
  south: 'The Luzon Strait and the approaches south of Taiwan',
  east: 'The Philippine Sea east of Taiwan',
  rear: 'Home waters, bases and staging areas, out of the fight',
  nw: 'Taoyuan–Hsinchu region, the approach to the capital',
  cw: 'The Taichung region',
  sw: 'The Tainan–Kaohsiung region and the southern ports',
  ec: 'The Hualien–Taitung region on the Pacific side',
  res: 'Inland reserve that can reach any coast',
};
const ADJ = {
  north: ['strait', 'east'], strait: ['north', 'south'], south: ['strait', 'east'], east: ['north', 'south'],
  nw: ['cw', 'ec', 'res'], cw: ['nw', 'sw', 'res'], sw: ['cw', 'ec', 'res'], ec: ['nw', 'sw', 'res'], res: ['nw', 'cw', 'sw', 'ec'],
};
export const adjacent = (a, b) => !!ADJ[a]?.includes(b);

/** Base route cost from a to b (before the formation's type multiplier), or null if not a route. */
export function moveCost(a, b) {
  if (a === b) return null;
  if (ISLAND.includes(a) !== ISLAND.includes(b)) return null;
  if (a === 'rear' || b === 'rear') return 2;
  return adjacent(a, b) ? 1 : null;
}

// Landing sectors: which sea area gives access (China must hold one, with amphibious forces in it), and how
// much a successful landing there costs Taiwan's position (the northwest is tied to the capital).
export const SECTOR_SEA = { nw: ['strait', 'north'], cw: ['strait'], sw: ['strait', 'south'], ec: ['east'] };
export const SECTOR_VALUE = { nw: 38, cw: 30, sw: 30, ec: 22 };

export const STANCES = ['defend', 'contest', 'attack'];
export const STANCE_LABEL = { defend: 'Defend', contest: 'Contest', attack: 'Attack' };
export const STANCE_TEXT = {
  defend: 'Hold what you have: 1.5× defence, but you cannot take the area. No fuel upkeep.',
  contest: 'Deny the area to the other side. ½ fuel per formation a month.',
  attack: 'Try to take the area: heavier losses on both sides, a higher nuclear shadow, 1 fuel per formation a month.',
};
export const START_STANCE = { cn: 'contest', us: 'contest', jp: 'defend', tw: 'defend' };
export const SIDE = { cn: 'red', us: 'blue', jp: 'blue', tw: 'blue' };
export const START_EMPH = { cn: 'nw', tw: 'nw', us: 'nw' };

export const WAR = {
  peaceHold: 2,       // ratio to hold an area below Limited strikes
  warHold: 1.5,       // ratio to hold once fighting
  k: 0.22,            // losses per month = k x enemy strength x multipliers x roll(0.7–1.3)
  defend: { taken: 0.67, dealt: 0.8 },
  attack: { taken: 1.15, dealt: 1.25 },
  twLand: 0.25,       // share of Taiwan's island ground forces that counts in the Strait (coastal defences)
  twAir: 0.5,         // share of Taiwan's air force that counts in the Strait
  support: 0.5,       // air formations add this share to neighbouring sea areas once the shooting starts
  strikeTaken: 0.3,   // strike formations fire from far away and take a fraction of the losses
  noMun: 0.4,         // floor on damage dealt when a capital runs out of munitions
  massing: 3,         // strength moved into one sea area in a month that reads as an escalatory act
};
