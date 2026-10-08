/*
 * Layers of Space: per-layer facts (altitude, period, missions, active satellites, debris, military relevance).
 *
 * Sources (all fetched 2026-10-08, HTTP 200):
 *  - ESA Space Debris Office, "ESA's Annual Space Environment Report", issue 9.1, 21 Oct 2025
 *    https://www.sdo.esoc.esa.int/publications/Space_Environment_Report_I9R1_20251021.pdf
 *    https://www.esa.int/Space_Safety/Space_Debris/ESA_Space_Environment_Report_2025
 *  - CelesTrak GP data, active satellites group (pulled 2026-10-08)
 *    https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=csv
 *  - NASA Orbital Debris Program Office FAQ: https://orbitaldebris.jsc.nasa.gov/faq/
 *  - NASA Earth Observatory, "Catalog of Earth Satellite Orbits": https://earthobservatory.nasa.gov/features/OrbitsCatalog
 *  - ESA, "Types of orbits": https://www.esa.int/Enabling_Support/Space_Transportation/Types_of_orbits
 *  - ESA, "Satellite frequency bands": https://www.esa.int/Applications/Connectivity_and_Secure_Communications/Satellite_frequency_bands
 *  - GPS.gov space segment and civil signals pages; U.S. Space Force GPS and SBIRS fact sheets (Wayback copies);
 *    NASA Moon facts; AFRL Oracle-M page; ESA Estrack page; Lockheed Martin Space Fence and MUOS pages.
 *
 * Method for active_sats (computed): for each object in the CelesTrak active GP file, semi-major axis a comes from
 * mean motion via Kepler's third law (mu = 398600.4418 km^3/s^2), then perigee = a(1-e) - 6378.137 km and
 * apogee = a(1+e) - 6378.137 km. Bins: vleo = apogee <= 2,000 km and mean altitude < 450 km; leo = apogee <= 2,000 km
 * and mean altitude >= 450 km; heo = eccentricity >= 0.25 and apogee > 2,000 km; geo = perigee and apogee both in
 * 35,586-35,986 km (ESA GEO band); meo = perigee >= 2,000 km and apogee < 35,586 km. Mean elements, so altitudes are
 * approximate. Periods marked "computed" use the same two-body formula, T = 2*pi*sqrt(a^3/mu).
 */

const S = {
  esaRep: { t: 'ESA Space Debris Office, ESA\'s Annual Space Environment Report, issue 9.1, 21 Oct 2025', u: 'https://www.sdo.esoc.esa.int/publications/Space_Environment_Report_I9R1_20251021.pdf' },
  esaRepLanding: { t: 'ESA, ESA Space Environment Report 2025 (landing page)', u: 'https://www.esa.int/Space_Safety/Space_Debris/ESA_Space_Environment_Report_2025' },
  celestrak: { t: 'CelesTrak GP data, active satellites, pulled 2026-10-08 (counts computed)', u: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=csv' },
  nasaFaq: { t: 'NASA Orbital Debris Program Office, Frequently Asked Questions', u: 'https://orbitaldebris.jsc.nasa.gov/faq/' },
  nasaCat: { t: 'NASA Earth Observatory, Catalog of Earth Satellite Orbits', u: 'https://earthobservatory.nasa.gov/features/OrbitsCatalog' },
  esaOrbits: { t: 'ESA, Types of orbits', u: 'https://www.esa.int/Enabling_Support/Space_Transportation/Types_of_orbits' },
  esaBands: { t: 'ESA, Satellite frequency bands', u: 'https://www.esa.int/Applications/Connectivity_and_Secure_Communications/Satellite_frequency_bands' },
  gpsSpace: { t: 'GPS.gov, Space Segment', u: 'https://www.gps.gov/space-segment' },
  gpsCivil: { t: 'GPS.gov, New Civil Signals', u: 'https://www.gps.gov/new-civil-signals' },
  sfGps: { t: 'U.S. Space Force fact sheet, Global Positioning System (Wayback copy, 29 Aug 2026)', u: 'https://web.archive.org/web/20260829040328/https://www.spaceforce.mil/About-Us/Fact-Sheets/Article/2197765/global-positioning-system/' },
  sfSbirs: { t: 'U.S. Space Force fact sheet, Space Based Infrared System (Wayback copy, 28 Sep 2026)', u: 'https://web.archive.org/web/20260928005637/https://www.spaceforce.mil/about-us/fact-sheets/article/2197746/space-based-infrared-system/' },
  nasaMoon: { t: 'NASA Science, Moon Facts', u: 'https://science.nasa.gov/moon/facts/' },
  afrlOracle: { t: 'AFRL, Oracle-M Hot Fire Test: a major milestone in cislunar space situational awareness', u: 'https://afresearchlab.com/technology/oracle/' },
  esaEstrack: { t: 'ESA, Estrack: ESA\'s global ground station network', u: 'https://www.esa.int/Enabling_Support/Operations/ESA_Ground_Stations/Estrack_ESA_s_global_ground_station_network' },
  lmFence: { t: 'Lockheed Martin, Space Fence', u: 'https://www.lockheedmartin.com/en-us/products/space-fence.html' },
  lmMuos: { t: 'Lockheed Martin, Mobile User Objective System (MUOS)', u: 'https://www.lockheedmartin.com/en-us/products/muos.html' },
};

export const LAYERS_FACTS = {
  ground: {
    alt_km: null,
    period: null,
    missions: [
      'Ground stations command spacecraft and receive their data; ESA\'s core Estrack network has six stations in six countries',
      'Launch sites: ESA launches to GEO from French Guiana, about 500 km north of the equator; Baikonur (49 deg N) often launches to polar and Molniya orbits',
      'Space surveillance radar: the U.S. Space Force accepted the Space Fence radar on Kwajalein Atoll in March 2020; it tracks objects mainly in LEO',
      'Missile-warning ground segment: SBIRS consolidated its DSP, HEO and GEO ground systems into one primary and one backup ground station',
    ],
    active_sats: { n: null, asof: null, note: 'Not applicable. Count of ground stations and sensors not compiled here.' },
    debris: 'Over the past 50 years an average of one catalogued piece of debris fell back to Earth each day; NASA reports no confirmed serious injury or significant property damage from reentering debris.',
    why: 'Every satellite is launched, commanded and read out from the ground, and ground radars track what is in orbit, so the ground segment underpins every other layer.',
    sources: [S.esaEstrack, S.esaOrbits, S.nasaCat, S.lmFence, S.sfSbirs, S.nasaFaq],
  },

  vleo: {
    alt_km: [180, 450],
    period: '88-94 min (computed for 180-450 km circular orbits)',
    missions: [
      'Crewed stations: the ISS (about 416-425 km) and China\'s Tiangong core module Tianhe (about 386 km) fall in this band (altitudes computed from CelesTrak elements, 2026-10-08)',
      'Lower shells of Starlink: 1,093 of the active payloads in this band carry Starlink names (computed)',
      'Earth imaging: closeness allows higher-resolution images',
    ],
    active_sats: { n: 1487, asof: '2026-10-08', note: 'Computed from CelesTrak active GP data: apogee at or below 2,000 km and mean altitude below 450 km. Lower bound of 180 km is ESA\'s statement that satellites generally do not fly below 180 km because of atmospheric drag.' },
    debris: 'Drag clears this band fast: NASA says debris left below 600 km normally falls back to Earth within several years.',
    why: 'Lower orbits give sharper imagery, and debris from a strike or accident here reenters within years rather than centuries.',
    sources: [S.esaOrbits, S.celestrak, S.nasaFaq],
  },

  leo: {
    alt_km: [450, 2000],
    period: '94-127 min (computed for 450-2,000 km); ESA cites about 90 minutes for LEO in general',
    missions: [
      'Earth observation, often in Sun-synchronous orbits at 600-800 km',
      'Communications constellations that give continuous coverage; ESA\'s MASTER model shows active payloads peaking at 500-600 km',
      'Starlink: 11,132 of the 14,381 active payloads computed for this band carry Starlink names (CelesTrak, 2026-10-08)',
    ],
    active_sats: { n: 14381, asof: '2026-10-08', note: 'Computed from CelesTrak active GP data: apogee at or below 2,000 km and mean altitude at or above 450 km. ESA\'s report counts 22,497 catalogued objects of all kinds in LEO at end of 2024 (Table 3.1).' },
    debris: 'Most orbital debris sits within 2,000 km of Earth, densest near 750-1,000 km. Debris at 800 km often takes centuries to decay; above 1,000 km it stays for a thousand years or more. The IADC limits post-mission orbital lifetime in the LEO protected region to 25 years.',
    why: 'Imaging and proliferated communications constellations work from here, and debris from a destructive strike at 800 km or above can stay for centuries in the band most satellites use.',
    sources: [S.esaOrbits, S.esaRep, S.celestrak, S.nasaFaq],
  },

  meo: {
    alt_km: [2000, 35586],
    period: '2.1-23.8 h (computed for 2,000-35,586 km); GPS orbits in 12 h',
    missions: [
      'Satellite navigation: GPS flies at about 20,200 km, each satellite circling Earth twice a day; the U.S. Space Force has flown 31 operational GPS satellites for over a decade',
      'Europe\'s Galileo navigation constellation also flies in MEO',
    ],
    active_sats: { n: 185, asof: '2026-10-08', note: 'Computed from CelesTrak active GP data: perigee at or above 2,000 km, apogee below 35,586 km, eccentricity below 0.25. Of all active payloads, 137 have perigee and apogee in 18,100-24,300 km, the altitude band of ESA\'s Navigation Satellites Orbit class (computed).' },
    debris: 'No drag at these heights: NASA says debris above 1,000 km normally stays in orbit for a thousand years or more. ESA counted 849 catalogued objects in its MEO class and 439 in its navigation-orbit class at end of 2024 (Table 3.1).',
    why: 'GPS gives position, navigation and timing to military users, and its receivers sit in aircraft, ships, land vehicles and precision-guided munitions.',
    sources: [S.gpsSpace, S.sfGps, S.esaOrbits, S.celestrak, S.nasaFaq, S.esaRep],
  },

  geo: {
    alt_km: [35586, 35986],
    period: '23 h 56 min 4 s (one sidereal day)',
    missions: [
      'Telecommunications: antennas on Earth stay pointed at one fixed spot; three evenly spaced satellites give near-global coverage',
      'Weather monitoring over fixed regions',
      'Data relay to lower satellites, such as ESA\'s European Data Relay System',
      'Missile warning: the U.S. SBIRS constellation includes GEO satellites with infrared sensors for strategic missile warning',
    ],
    active_sats: { n: 542, asof: '2026-10-08', note: 'Computed from CelesTrak active GP data: perigee and apogee both within 35,586-35,986 km (ESA GEO altitude band, nominal altitude 35,786 km). A wider geosynchronous band (semi-major axis 37,948-46,380 km, eccentricity below 0.25) holds 588 (computed).' },
    debris: 'GEO has no natural sink: objects never decay out, so operators boost old satellites into higher disposal (graveyard) orbits. ESA counted 945 catalogued objects in its GEO class at end of 2024 (Table 3.1).',
    why: 'A fixed, wide view of the Earth makes GEO the home of U.S. missile-warning satellites and of communications satellites that ground antennas can stay pointed at.',
    sources: [S.esaOrbits, S.nasaCat, S.sfSbirs, S.celestrak, S.esaRep, S.nasaFaq],
  },

  heo: {
    alt_km: [1000, 39400],
    period: '12 h (Molniya)',
    missions: [
      'Molniya orbit: inclination 63.4 deg, eccentricity 0.722, a 12-hour orbit that spends about two-thirds of its time over one hemisphere; used by Russian communications satellites and Sirius radio',
      'Missile warning: SBIRS includes HEO sensors riding on host satellites',
      'Science missions that observe Earth or space from high altitude for long periods, such as ESA\'s SMILE',
    ],
    active_sats: { n: 45, asof: '2026-10-08', note: 'Computed from CelesTrak active GP data: eccentricity at or above 0.25 and apogee above 2,000 km. This bin mixes Molniya-type orbits with science missions on very elongated orbits. alt_km is a Molniya example computed from NASA\'s e = 0.722 and 12 h period (perigee about 1,000 km, apogee about 39,400 km). Tundra orbits are not separately sourced here.' },
    debris: 'ESA counted 2,043 catalogued objects in its Highly Eccentric Earth Orbit class (perigee below 31,570 km, apogee above 40,002 km) at end of 2024, mostly unidentified objects (Table 3.1). ESA\'s class boundaries differ from the Molniya example.',
    why: 'Geostationary satellites see high latitudes only at the edge of view, so elongated orbits give long dwell over the far north; the U.S. flies missile-warning sensors in HEO.',
    sources: [S.nasaCat, S.sfSbirs, S.esaOrbits, S.celestrak, S.esaRep],
  },

  cislunar: {
    alt_km: [35986, 384400],
    period: 'Varies by trajectory; a circular Earth orbit at the Moon\'s distance would take about 27 days (computed, two-body)',
    missions: [
      'The Moon orbits at an average distance of 384,400 km',
      'Cislunar space situational awareness: AFRL and Space Systems Command\'s Oracle-M pathfinder is built to track objects beyond geosynchronous orbit',
      'Sun-Earth Lagrange points L1 and L2 lie about 1.5 million km away, roughly four times the distance to the Moon (beyond this layer\'s outer edge)',
    ],
    active_sats: { n: 7, asof: '2026-10-08', note: 'Computed from CelesTrak active GP data: Earth-orbiting payloads with apogee above 100,000 km (an arbitrary cut chosen here). CelesTrak GP data covers Earth orbits only, so spacecraft orbiting the Moon or at Lagrange points are not counted.' },
    debris: null,
    why: 'The U.S. Space Force and AFRL are fielding pathfinder satellites such as Oracle-M to track objects moving between Earth and the Moon.',
    sources: [S.nasaMoon, S.afrlOracle, S.esaOrbits, S.celestrak],
  },

  spectrum: {
    alt_km: null,
    period: null,
    bands: [
      { band: 'UHF', use: 'Secure beyond-line-of-sight military voice and data, e.g. the U.S. MUOS system' },
      { band: 'L (1-2 GHz)', use: 'GPS navigation, satellite phones, aviation and maritime links. GPS civil signals: L1 1575 MHz, L2 1227 MHz, L5 1176 MHz; two military signals at L1 and two at L2' },
      { band: 'S (2-4 GHz)', use: 'Telemetry, tracking and control; mobile satellite services' },
      { band: 'C (4-8 GHz)', use: 'Satellite TV, enterprise networks; low rain fade' },
      { band: 'X (8-12 GHz)', use: 'Protected band used mainly by military and government users: military satcom, radar imaging (SAR), battlefield data relay' },
      { band: 'Ku (12-18 GHz)', use: 'Satellite TV, in-flight and maritime broadband' },
      { band: 'Ka (26-40 GHz)', use: 'High-throughput internet and military communications; sensitive to rain' },
    ],
    missions: [
      'Uplinks command satellites; downlinks return data and navigation signals; relay satellites pass data between spacecraft and the ground',
    ],
    active_sats: { n: null, asof: null, note: 'Not applicable.' },
    debris: null,
    note: 'ESA says congestion has become a serious issue in the lower frequency bands; higher bands offer more bandwidth but suffer rain fade.',
    why: 'Every space service reaches its users by radio, and GPS military signals and military satcom run on specific bands (L, X, Ka, UHF).',
    sources: [S.esaBands, S.gpsCivil, S.lmMuos, S.sfGps, S.esaOrbits],
  },
};
