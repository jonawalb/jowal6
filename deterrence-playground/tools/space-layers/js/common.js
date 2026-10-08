// Shared definitions for Layers of Space: orbital layers, countries, labels, scales and formatting.

export const R_EARTH = 6371;   // km

// Drawing bands (km above the surface). Facts and sources for each layer live in data/layers.js.
export const LAYERS = [
  { id: 'ground', name: 'Ground segment', short: 'Ground', lo: 0, hi: 0,
    line: 'Launch sites, control stations, antennas and the radars and telescopes that track objects in orbit.' },
  { id: 'vleo', name: 'Very low Earth orbit', short: 'VLEO', lo: 160, hi: 450,
    line: 'Below about 450 km. Sharp imagery and short delays, but drag pulls satellites down within months to a few years.' },
  { id: 'leo', name: 'Low Earth orbit', short: 'LEO', lo: 450, hi: 2000,
    line: 'Up to 2,000 km. Megaconstellations, most imaging and the space station. Most debris lives here.' },
  { id: 'meo', name: 'Medium Earth orbit', short: 'MEO', lo: 2000, hi: 35586,
    line: 'Navigation constellations sit near 20,000 km: GPS, GLONASS, Galileo and BeiDou.' },
  { id: 'geo', name: 'Geosynchronous orbit', short: 'GEO', lo: 35586, hi: 35986, mid: 35786,
    line: 'At 35,786 km a satellite circles once a day and hangs over one spot: big communications, warning and relay satellites.' },
  { id: 'heo', name: 'Highly elliptical orbit', short: 'HEO', lo: 600, hi: 39700, ellipse: true,
    line: 'Long loops (Molniya, Tundra) that linger over high latitudes, where GEO satellites sit low on the horizon.' },
  { id: 'cislunar', name: 'Cislunar space', short: 'Cislunar', lo: 35986, hi: 384400, mid: 384400,
    line: 'Beyond GEO out to the Moon at about 384,400 km. Relay satellites, lunar missions and a growing military interest.' },
  { id: 'spectrum', name: 'Links and spectrum', short: 'Links', lo: 0, hi: 0,
    line: 'Not a place: the radio and laser links between the ground and satellites. Jamming and cyber attacks act here.' },
];
export const LAYER = Object.fromEntries(LAYERS.map(l => [l.id, l]));
export const ORBIT_LAYERS = ['vleo', 'leo', 'meo', 'geo', 'heo', 'cislunar'];

export const COUNTRIES = [
  { id: 'us', name: 'United States', lat: 39, lon: -98 },
  { id: 'cn', name: 'China', lat: 35, lon: 104 },
  { id: 'ru', name: 'Russia', lat: 58, lon: 75 },
  { id: 'in', name: 'India', lat: 22, lon: 79 },
  { id: 'jp', name: 'Japan', lat: 36.5, lon: 138.5 },
  { id: 'fr', name: 'France', lat: 46.5, lon: 2.5 },
  { id: 'eu', name: 'European Union', lat: 50.5, lon: 10 },
  { id: 'uk', name: 'United Kingdom', lat: 53.5, lon: -2 },
  { id: 'il', name: 'Israel', lat: 31, lon: 35 },
  { id: 'ir', name: 'Iran', lat: 32.5, lon: 54 },
  { id: 'kp', name: 'North Korea', lat: 40, lon: 127 },
  { id: 'tw', name: 'Taiwan', lat: 23.7, lon: 121 },
  { id: 'kr', name: 'South Korea', lat: 36.3, lon: 127.9 },
  { id: 'au', name: 'Australia', lat: -25, lon: 134 },
  { id: 'com', name: 'Commercial', lat: null, lon: null },
];
export const COUNTRY = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));

export const KINDS = [
  { id: 'offensive', name: 'Offensive', line: 'Weapons that destroy, disable or interfere with satellites or their links.' },
  { id: 'defensive', name: 'Defensive', line: 'Systems that protect satellites or blunt an attack.' },
  { id: 'enabler', name: 'Space services', line: 'Satellites, sensors and launchers that provide navigation, communications, imagery, warning and tracking.' },
];

export const TYPES = {
  'da-asat': 'Direct-ascent ASAT missile', 'co-orbital': 'Co-orbital ASAT', rpo: 'Inspector / proximity satellite',
  'dew-laser': 'Laser or directed energy', jammer: 'Jammer', cyber: 'Cyber', 'nuclear-asat': 'Nuclear ASAT',
  'interceptor-msl': 'Missile-defense interceptor', ssa: 'Space tracking (SOSI)', isr: 'Imaging and surveillance',
  pnt: 'Navigation and timing', satcom: 'Communications', 'missile-warning': 'Missile warning and tracking',
  weather: 'Weather', launch: 'Launch', other: 'Other',
  mil: 'Military, purpose not public', tech: 'Science and technology', unknown: 'Mission not identified',
};

export const EFFECTS = { destructive: 'Destructive (permanent, can make debris)', disruptive: 'Disruptive (temporary, reversible)', degrading: 'Degrading' };

export const STATUS = { operational: 'Operational', tested: 'Tested', developmental: 'In development', reported: 'Reported, unconfirmed', retired: 'Retired', planned: 'Planned' };

export const COST_BANDS = [
  { id: 'k', name: 'Under $1M', lo: 0, hi: 1e6 },
  { id: 'm', name: '$1M–100M', lo: 1e6, hi: 1e8 },
  { id: 'h', name: '$100M–1B', lo: 1e8, hi: 1e9 },
  { id: 'b', name: 'Over $1B', lo: 1e9, hi: Infinity },
];

export const THREATS = [
  { id: 'kinetic', name: 'Kinetic', line: 'Missiles and co-orbital kill vehicles that physically hit a satellite.' },
  { id: 'dew', name: 'Directed energy', line: 'Lasers and high-power microwaves that dazzle or damage sensors and electronics.' },
  { id: 'jamming', name: 'Jamming', line: 'Radio noise that drowns out uplinks, downlinks or navigation signals.' },
  { id: 'cyber', name: 'Cyber', line: 'Attacks on the software, ground networks and command links.' },
];
// Which weapon types act through which threat class.
export const TYPE_THREAT = { 'da-asat': 'kinetic', 'co-orbital': 'kinetic', 'interceptor-msl': 'kinetic', 'nuclear-asat': 'kinetic',
  rpo: 'kinetic', 'dew-laser': 'dew', jammer: 'jamming', cyber: 'cyber' };

// ---- Radius scales. Earth radius = 1 scene unit. ----
// Compressed: logarithmic in altitude so every layer is readable. True: proportional.
export function radius(altKm, scale) {
  if (scale === 'true') return 1 + altKm / R_EARTH;
  return 1 + 0.82 * Math.log10(1 + altKm / 200);
}

export const fmtKm = km => km >= 1000 ? Math.round(km).toLocaleString('en-US') + ' km' : Math.round(km) + ' km';
export function fmtUsd(v) {
  if (v == null || !isFinite(v)) return '—';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(v >= 1e10 ? 0 : 1).replace(/\.0$/, '') + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (v >= 1e3) return '$' + Math.round(v / 1e3) + 'K';
  return '$' + Math.round(v);
}
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const cssVar = (name, el = document.documentElement) => getComputedStyle(el).getPropertyValue(name).trim();

// Cost band of an item: explicit costBand, else derived from cost.usd.
export function bandOf(item) {
  if (item.costBand) return item.costBand;
  const v = item.cost?.usd;
  if (v == null) return null;
  return COST_BANDS.find(b => v >= b.lo && v < b.hi)?.id ?? null;
}

// Worst-case exposure across the four threat classes (0–3), or one class.
export function vulnOf(item, threat) {
  if (!item.vuln) return null;
  if (threat === 'any') return Math.max(...THREATS.map(t => item.vuln[t.id] ?? 0));
  return item.vuln[threat] ?? null;
}

// Where an item is drawn: weapons that sit on the ground (missiles, jammers, lasers) draw in `ground`.
export function homeLayers(item) {
  const ls = (item.layers || []).filter(l => LAYER[l]);
  return ls.length ? ls : ['ground'];
}
