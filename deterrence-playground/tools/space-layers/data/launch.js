// Layers of Space: launch access, cost and responsiveness.
// Compiled 2026-10-08. Every URL below returned HTTP 200 when checked on that date.
//
// Sources:
//  - CSIS Aerospace Security Project, "Space Launch to Low Earth Orbit: How Much Does It Cost?" (last updated
//    1 Sept 2022) and its chart data sheet (Google Sheets CSV export). FY21 dollars. CSIS cites FAA AST (2018),
//    Xu, Hollingsworth and Smith (2019), GAO (2017) and others row by row.
//  - SpaceX "Capabilities & Services" sheets (Wayback captures, 2022 and Jan 2025) and the SpaceX rideshare
//    pricing API used by rideshare.spacex.com (prices in US cents per kg; the site divides by 100).
//  - ULA Vulcan page; Northrop Grumman Minotaur page; ISRO PSLV and LVM3 pages; JAXA H3 spec page (Japanese).
//  - Wikipedia "2025 in spaceflight" (orbital launch tallies by rocket type; counts include failures) and
//    vehicle pages for payload figures where no maker page could be read (each note says so).
//  - Space Development Agency (sda.mil) award and launch releases; Vandenberg SFB release on VICTUS NOX
//    (Wayback); Rocket Lab VICTUS HAZE mission page (Wayback); Defense News; ExecutiveGov; Spaceflight Now.
//  - NASA (Apollo 11 overview, CAPSTONE), ESA (Meteosat reaching orbit, Galileo on Ariane 6), JAXA (STS-87 log).
//
// Field conventions:
//  - price_usd: a single published price. price_range_usd: [low, high] when the source gives a range.
//  - usd_per_kg_leo: as published by the source unless usd_per_kg_derived:true, in which case it is
//    price / payload computed by us and the note shows the arithmetic.
//  - price_year 2021 with basis 'csis-fy21' means FY21 constant dollars from the CSIS data repository (2022).
//  - launches_2025: orbital launch attempts in calendar 2025 per Wikipedia "2025 in spaceflight".
//  - null means we found no source we could open. notional:true marks a model value, explained in note.

const CSIS = { t: 'CSIS Aerospace Security, "Space Launch to Low Earth Orbit: How Much Does It Cost?" (updated 1 Sept 2022), FY21 dollars, CSIS data repository (2022)', u: 'https://aerospace.csis.org/data/space-launch-to-low-earth-orbit-how-much-does-it-cost/' };
const CSIS_DATA = { t: 'CSIS launch cost chart data (Google Sheet CSV export)', u: 'https://docs.google.com/spreadsheets/d/1vA1nKDX4Wt0tY9ufv8P8wXlOhpyCtoG2NwYNw-s0Uto/export?format=csv' };
const W2025 = { t: 'Wikipedia, "2025 in spaceflight", orbital launch statistics by type and configuration', u: 'https://en.wikipedia.org/wiki/2025_in_spaceflight' };
const SPX2022 = { t: 'SpaceX, Capabilities & Services sheet, standard payment plan through 2022 (Wayback capture 21 Dec 2022)', u: 'https://web.archive.org/web/20221221101331/https://www.spacex.com/media/Capabilities&Services.pdf' };
const SPX2024 = { t: 'SpaceX, Capabilities & Services sheet, standard payment plan through 2024 (Wayback capture 4 Jan 2025)', u: 'https://web.archive.org/web/20250104082224/https://www.spacex.com/media/Capabilities&Services.pdf' };
const SPX_RS = { t: 'SpaceX rideshare pricing API behind rideshare.spacex.com (pricePerKilogramUsd in US cents)', u: 'https://api-rideshare.spacex.com/api/v2/price' };
const SPX_RS_SITE = { t: 'SpaceX Satellite Rideshare', u: 'https://rideshare.spacex.com/' };
const wiki = (page, label) => ({ t: `Wikipedia, "${label}"`, u: `https://en.wikipedia.org/wiki/${page}` });

export const LAUNCHERS = [
  {
    id: 'falcon-9', name: 'Falcon 9', country: 'com', operator: 'SpaceX',
    payload_leo_kg: 22800, payload_gto_kg: 8300,
    price_usd: 69750000, price_year: 2024,
    usd_per_kg_leo: 3059, usd_per_kg_derived: true,
    usd_per_kg_csis_fy21: 2600,
    reusable: true, launches_2025: 165, status: 'operational',
    note: 'List price $69.75M (standard payment plan through 2024). Derived $/kg: $69.75M / 22,800 kg = about $3,059/kg, but 22,800 kg is the fully expendable maximum, so real reusable missions pay more per kg. The 2024 sheet prints "22,000 kg" next to "50,265 lbs"; 50,265 lb equals 22,800 kg, the figure on the 2022 sheet, so we use 22,800. CSIS gives $2,600/kg (FY21). SpaceX rideshare to LEO/SSO is priced at $7,000/kg for 2026 (minimum 50 kg). All 165 launches in 2025 succeeded.',
    sources: [SPX2024, SPX2022, SPX_RS, SPX_RS_SITE, CSIS, CSIS_DATA, W2025],
  },
  {
    id: 'falcon-heavy', name: 'Falcon Heavy', country: 'com', operator: 'SpaceX',
    payload_leo_kg: 63800, payload_gto_kg: 26700,
    price_usd: 97000000, price_year: 2022,
    usd_per_kg_leo: 1520, usd_per_kg_derived: true,
    usd_per_kg_csis_fy21: 1500,
    reusable: true, launches_2025: 0, status: 'operational',
    note: 'List price $97M (2022 sheet, "up to 8 mT to GTO"). Derived $/kg: $97M / 63,800 kg = about $1,520/kg, using the fully expendable LEO maximum. CSIS gives $1,500/kg (FY21). Falcon Heavy did not fly in 2025. The 2025 SpaceX sheet lists only Falcon 9.',
    sources: [SPX2022, CSIS, CSIS_DATA, W2025],
  },
  {
    id: 'starship', name: 'Starship', country: 'com', operator: 'SpaceX',
    payload_leo_kg: null, payload_gto_kg: null,
    price_usd: null, price_year: null, usd_per_kg_leo: null,
    reusable: true, launches_2025: 5, status: 'flight test',
    note: 'Still in flight test. Five flights in 2025: 2 successes and 3 failures. No published price and no demonstrated operational payload, so we leave both blank.',
    sources: [W2025, wiki('SpaceX_Starship', 'SpaceX Starship')],
  },
  {
    id: 'vulcan', name: 'Vulcan Centaur', country: 'us', operator: 'United Launch Alliance',
    payload_leo_kg: 27200, payload_gto_kg: 14500,
    price_usd: null, price_year: null, usd_per_kg_leo: null,
    reusable: false, launches_2025: 1, status: 'operational',
    note: 'Payloads are ULA figures for the six-solid-booster version (LEO reference orbit 27,200 kg; GTO 14,500 kg). ULA does not publish a price. One launch in 2025 (VC4S).',
    sources: [{ t: 'ULA, Vulcan Centaur performance table', u: 'https://www.ulalaunch.com/rockets/vulcan-centaur' }, W2025],
  },
  {
    id: 'electron', name: 'Electron', country: 'com', operator: 'Rocket Lab',
    payload_leo_kg: 300, payload_gto_kg: null,
    price_usd: 5000000, price_year: 2021, price_basis: 'csis-fy21',
    usd_per_kg_leo: 23100,
    reusable: false, launches_2025: 18, status: 'operational',
    note: 'Small launcher. Price and $/kg are CSIS FY21 figures (sourced to FAA AST 2018). Payload 300 kg to LEO is the updated figure on Wikipedia (Rocket Lab page blocked automated access). Wikipedia counts its New Zealand launches under the US. All 18 launches in 2025 succeeded.',
    sources: [CSIS, CSIS_DATA, wiki('Rocket_Lab_Electron', 'Rocket Lab Electron'), W2025],
  },
  {
    id: 'new-glenn', name: 'New Glenn', country: 'com', operator: 'Blue Origin',
    payload_leo_kg: 45000, payload_gto_kg: 13600,
    price_usd: null, price_year: null, usd_per_kg_leo: null,
    reusable: true, launches_2025: 2, status: 'grounded',
    note: 'Payloads are the 7x2 version as listed on Wikipedia (Blue Origin page refused automated access). The first stage first landed on 13 Nov 2025, on the second flight. On 28 May 2026 a vehicle exploded during a static fire test and severely damaged LC-36, Blue Origin\'s only operational launch site. No published price.',
    sources: [wiki('New_Glenn', 'New Glenn'), W2025],
  },
  {
    id: 'ariane-6', name: 'Ariane 6', country: 'eu', operator: 'Arianespace',
    payload_leo_kg: 21650, payload_gto_kg: 11500,
    price_usd: null, price_year: null, usd_per_kg_leo: null,
    reusable: false, launches_2025: 4, status: 'operational',
    note: 'Payloads are for Ariane 64 per the Ariane 6 User\'s Manual as cited on Wikipedia (Ariane 62: 10,350 kg LEO, 4,500 kg GTO). All four 2025 flights used Ariane 62. No published list price. Wikipedia credits Ariane launches to France.',
    sources: [wiki('Ariane_6', 'Ariane 6'), W2025],
  },
  {
    id: 'h3', name: 'H3', country: 'jp', operator: 'JAXA / Mitsubishi Heavy Industries',
    payload_leo_kg: 16000, payload_gto_kg: 6500,
    price_usd: null, price_year: null, usd_per_kg_leo: null,
    reusable: false, launches_2025: 3, status: 'operational',
    note: 'JAXA lists at least 4 t to 500 km SSO and at least 6.5 t to GTO (delta-v 1,500 m/s). The 16,000 kg LEO figure (H3-24, ISS orbit) is from Wikipedia, citing MHI. Three launches in 2025, one failure.',
    sources: [{ t: 'JAXA, H3 諸元・能力 (specifications and capability)', u: 'https://www.rocket.jaxa.jp/rocket/h3/system.html' }, wiki('H3_(rocket)', 'H3 (rocket)'), W2025],
  },
  {
    id: 'long-march-2c', name: 'Long March 2C', country: 'cn', operator: 'CASC',
    payload_leo_kg: 3850, payload_gto_kg: 1250,
    price_usd: 31000000, price_year: 2021, price_basis: 'csis-fy21',
    usd_per_kg_leo: 8300,
    reusable: false, launches_2025: 3, status: 'operational',
    note: 'Price and $/kg are CSIS FY21 figures. Payloads from Wikipedia (GTO with the SM upper stage). 2025 count includes one flight with a YZ-1S upper stage.',
    sources: [CSIS, CSIS_DATA, wiki('Long_March_2C', 'Long March 2C'), W2025],
  },
  {
    id: 'long-march-2d', name: 'Long March 2D', country: 'cn', operator: 'CASC',
    payload_leo_kg: 3500, payload_gto_kg: null,
    price_usd: 31000000, price_year: 2021, price_basis: 'csis-fy21',
    usd_per_kg_leo: 9100,
    reusable: false, launches_2025: 7, status: 'operational',
    note: 'Price and $/kg are CSIS FY21 figures. LEO payload from Wikipedia.',
    sources: [CSIS, CSIS_DATA, wiki('Long_March_2D', 'Long March 2D'), W2025],
  },
  {
    id: 'long-march-3b', name: 'Long March 3B', country: 'cn', operator: 'CASC',
    payload_leo_kg: 11500, payload_gto_kg: 5500,
    price_usd: 74000000, price_year: 2021, price_basis: 'csis-fy21',
    usd_per_kg_leo: 6200,
    reusable: false, launches_2025: 13, status: 'operational',
    note: 'China\'s main GTO launcher. Price and $/kg are CSIS FY21 figures. Payloads from Wikipedia (GTO for 3B/E). 2025 count is the 3B/E configuration.',
    sources: [CSIS, CSIS_DATA, wiki('Long_March_3B', 'Long March 3B'), W2025],
  },
  {
    id: 'long-march-5', name: 'Long March 5', country: 'cn', operator: 'CASC',
    payload_leo_kg: 25000, payload_gto_kg: 14000,
    price_usd: 182000000, price_year: 2021, price_basis: 'csis-fy21',
    usd_per_kg_leo: 7900,
    reusable: false, launches_2025: 4, status: 'operational',
    note: 'Price and $/kg are CSIS FY21 figures. Payloads from Wikipedia (LEO for CZ-5B, GTO for CZ-5). 2025: two CZ-5 and two CZ-5B/YZ-2.',
    sources: [CSIS, CSIS_DATA, wiki('Long_March_5', 'Long March 5'), W2025],
  },
  {
    id: 'long-march-8', name: 'Long March 8 / 8A', country: 'cn', operator: 'CASC',
    payload_leo_kg: 8100, payload_gto_kg: 2800,
    price_usd: null, price_year: null, usd_per_kg_leo: null,
    reusable: false, launches_2025: 7, status: 'operational',
    note: 'Payloads from Wikipedia (8A: 7,000 kg to 700 km SSO). No public price. 2025: one CZ-8 and six CZ-8A (8A maiden flight 11 Feb 2025).',
    sources: [wiki('Long_March_8', 'Long March 8'), W2025],
  },
  {
    id: 'long-march-12', name: 'Long March 12', country: 'cn', operator: 'CASC',
    payload_leo_kg: 10000, payload_gto_kg: null,
    price_usd: null, price_year: null, usd_per_kg_leo: null,
    reusable: false, launches_2025: 3, status: 'operational',
    note: 'Wikipedia lists 10,000 kg to 300 km LEO (12,000 kg to 200 km). All flights so far carried Guowang internet satellites. One further 2025 launch used the separate Long March 12A. No public price.',
    sources: [wiki('Long_March_12', 'Long March 12'), W2025],
  },
  {
    id: 'kuaizhou-1a', name: 'Kuaizhou-1A', country: 'cn', operator: 'ExPace (CASIC)',
    payload_leo_kg: 400, payload_gto_kg: null,
    price_usd: 3000000, price_year: 2021, price_basis: 'csis-fy21',
    usd_per_kg_leo: 10600,
    reusable: false, launches_2025: 3, status: 'operational',
    note: 'Solid-fuel, road-mobile quick-response launcher. CSIS row is "Kuaizhou" (FY21). Payload from Wikipedia. 2025: two Kuaizhou-1A (one failure) and one Kuaizhou-1A Pro.',
    sources: [CSIS, CSIS_DATA, wiki('Kuaizhou', 'Kuaizhou'), W2025],
  },
  {
    id: 'zhuque-2', name: 'Zhuque-2E', country: 'cn', operator: 'LandSpace',
    payload_leo_kg: 6000, payload_gto_kg: null,
    price_usd: null, price_year: null, usd_per_kg_leo: null,
    reusable: false, launches_2025: 2, status: 'operational',
    note: 'Methane-oxygen commercial rocket. Payload is Zhuque-2E to 200 km LEO per Wikipedia. Two 2025 launches, one failure. No public price.',
    sources: [wiki('Zhuque-2', 'Zhuque-2'), W2025],
  },
  {
    id: 'zhuque-3', name: 'Zhuque-3', country: 'cn', operator: 'LandSpace',
    payload_leo_kg: 11800, payload_gto_kg: null,
    price_usd: null, price_year: null, usd_per_kg_leo: null,
    reusable: true, launches_2025: 1, status: 'flight test',
    note: 'Payload 11,800 kg expended or 8,000 kg with booster recovery, to 450 km LEO, per Wikipedia. Maiden flight 3 Dec 2025 reached orbit but the booster landing failed. A booster landed on the second flight, 18 Aug 2026.',
    sources: [wiki('Zhuque-3', 'Zhuque-3'), W2025],
  },
  {
    id: 'soyuz-2', name: 'Soyuz-2', country: 'ru', operator: 'Roscosmos',
    payload_leo_kg: 8670, payload_gto_kg: null,
    price_usd: null, price_range_usd: [53000000, 225000000], price_year: 2021, price_basis: 'csis-fy21',
    usd_per_kg_leo: 17900,
    reusable: false, launches_2025: 13, status: 'operational',
    note: 'CSIS row is "Soyuz" (all R-7 Soyuz variants, FY21 dollars, $53M to $225M per launch). Payload is Soyuz-2.1b from Baikonur to 240 km LEO per Wikipedia. 2025 count includes the last Soyuz-2.1v.',
    sources: [CSIS, CSIS_DATA, wiki('Soyuz-2', 'Soyuz-2'), W2025],
  },
  {
    id: 'angara', name: 'Angara (1.2 / A5)', country: 'ru', operator: 'Roscosmos / Khrunichev',
    payload_leo_kg: 24500, payload_gto_kg: 7500,
    price_usd: null, price_range_usd: [105000000, 116000000], price_year: 2021, price_basis: 'csis-fy21',
    usd_per_kg_leo: 4500,
    reusable: false, launches_2025: 4, status: 'operational',
    note: 'CSIS FY21 price and $/kg. Payloads are the top of the family range on Wikipedia (A5 from Plesetsk: up to 24,500 kg LEO, 5,400 to 7,500 kg GTO). 2025: three Angara-1.2 and one Angara A5.',
    sources: [CSIS, CSIS_DATA, wiki('Angara_(rocket_family)', 'Angara (rocket family)'), W2025],
  },
  {
    id: 'pslv', name: 'PSLV', country: 'in', operator: 'ISRO / NSIL',
    payload_leo_kg: 1750, payload_gto_kg: 1425,
    price_usd: null, price_range_usd: [22000000, 32000000], price_year: 2021, price_basis: 'csis-fy21',
    usd_per_kg_leo: 8500,
    reusable: false, launches_2025: 1, status: 'operational',
    note: 'ISRO lists 1,750 kg to 600 km sun-synchronous polar orbit and 1,425 kg to sub-GTO. CSIS FY21 price and $/kg. The single 2025 PSLV launch failed.',
    sources: [{ t: 'ISRO, PSLV', u: 'https://www.isro.gov.in/PSLV_CON.html' }, CSIS, CSIS_DATA, W2025],
  },
  {
    id: 'lvm3', name: 'LVM3 (GSLV Mk III)', country: 'in', operator: 'ISRO / NSIL',
    payload_leo_kg: 8000, payload_gto_kg: 4000,
    price_usd: 63000000, price_year: 2021, price_basis: 'csis-fy21',
    usd_per_kg_leo: 8000,
    reusable: false, launches_2025: 2, status: 'operational',
    note: 'ISRO lists 8,000 kg to LEO and 4,000 kg to GTO. CSIS FY21 price and $/kg (row "LVM3"). India also flew two GSLV Mk II in 2025, not counted here.',
    sources: [{ t: 'ISRO, LVM3 (GSLV Mk III)', u: 'https://www.isro.gov.in/GSLVmk3_CON.html' }, CSIS, CSIS_DATA, W2025],
  },
  {
    id: 'minotaur-iv', name: 'Minotaur IV', country: 'us', operator: 'Northrop Grumman',
    payload_leo_kg: 1730, payload_gto_kg: null,
    price_usd: 48000000, price_year: 2021, price_basis: 'csis-fy21',
    usd_per_kg_leo: 30500,
    reusable: false, launches_2025: 1, status: 'operational',
    note: 'Built from three government-furnished Peacekeeper ICBM motors plus a commercial upper stage. Payload per Northrop Grumman. CSIS FY21 price and $/kg.',
    sources: [{ t: 'Northrop Grumman, Minotaur', u: 'https://www.northropgrumman.com/space/minotaur-rocket' }, CSIS, CSIS_DATA, W2025],
  },
];

const STS87 = { t: 'JAXA, STS-87 flight result (external tank separation 9 minutes after liftoff; orbit insertion 280 km)', u: 'https://iss.jaxa.jp/shuttle/flight/sts87/sts87flight_e.html' };
const ESA_MSG = { t: 'ESA, Meteosat: Reaching orbit (GTO, then circularise "over a period of weeks")', u: 'https://www.esa.int/Applications/Observing_the_Earth/Meteorological_missions/Meteosat/Reaching_orbit' };
const ESA_GTO = { t: 'ESA, Geostationary transfer orbit (explainer image)', u: 'https://www.esa.int/ESA_Multimedia/Images/2020/03/Geostationary_transfer_orbit' };
const SFN_EP = { t: 'Spaceflight Now, "Innovative satellites begin maneuvers with all-electric thrusters" (17 Mar 2015)', u: 'https://spaceflightnow.com/2015/03/17/innovative-satellites-begin-maneuvers-with-all-electric-thrusters/' };
const NASA_BASICS = { t: 'NASA, Basics of Space Flight, Chapter 5: Planetary Orbits', u: 'https://science.nasa.gov/learn/basics-of-space-flight/chapter5-1/' };
const ESA_GAL = { t: 'ESA, Watch live: Galileo launch on Ariane 6 (programme: liftoff 06:01, satellite separation 09:57 CET)', u: 'https://www.esa.int/Applications/Satellite_navigation/Watch_live_Galileo_launch_on_Ariane_6' };
const AEROTIME_GAL = { t: 'AeroTime, Ariane 6 launches two Galileo satellites (17 Dec 2025)', u: 'https://www.aerotime.aero/articles/ariane-6-galileo-satellites-launch-kourou' };
const NASA_A11 = { t: 'NASA, Apollo 11 mission overview', u: 'https://www.nasa.gov/history/apollo-11-mission-overview/' };
const NASA_CAP = { t: 'NASA, What is CAPSTONE?', u: 'https://www.nasa.gov/smallspacecraft/capstone/' };

export const LAYER_ACCESS = {
  vleo: {
    usd_per_kg: [1500, 23100], notional: true,
    note: 'No source prices VLEO separately. We reuse the LEO range (CSIS FY21: Falcon Heavy $1,500/kg to Electron $23,100/kg). Below about 450 km, drag shortens orbital life, so satellites there need propulsion to stay up.',
    transfer_time: 'about 10 minutes (direct insertion; the Shuttle on STS-87 reached a 280 km orbit, with tank separation 9 minutes after liftoff)',
    sources: [CSIS, CSIS_DATA, STS87],
  },
  leo: {
    usd_per_kg: [1500, 30500],
    note: 'CSIS FY21 figures for active or recent vehicles span $1,500/kg (Falcon Heavy) to $30,500/kg (Minotaur IV); Falcon 9 is $2,600/kg. SpaceX sells rideshare to LEO/SSO at $7,000/kg for 2026 (minimum 50 kg). These are launch prices only. SDA Tranche 1 transport satellites go into an insertion orbit and then raise themselves to about 1,000 km.',
    transfer_time: 'about 10 minutes to a first orbit (direct insertion); satellites that raise their own orbit afterwards take longer',
    sources: [CSIS, CSIS_DATA, SPX_RS, SPX_RS_SITE, STS87, { t: 'SDA, third Tranche 1 launch (16 Jul 2026)', u: 'https://www.sda.mil/space-development-agency-successfully-completes-third-launch-of-tranche-1-satellites/' }],
  },
  meo: {
    usd_per_kg: [3633, 8404], notional: true,
    note: 'No source prices MEO per kg. We use the GTO-class proxy below (same derivation), since MEO missions need similar launch energy. Galileo on Ariane 6 (17 Dec 2025) separated about 3 h 56 min after liftoff, after two upper-stage burns, at about 22,900 km.',
    transfer_time: 'about 4 hours (direct injection by the upper stage; Galileo on Ariane 6, Dec 2025)',
    sources: [ESA_GAL, AEROTIME_GAL, SPX2022, SPX2024],
  },
  geo: {
    usd_per_kg: [3633, 8404], usd_per_kg_derived: true, notional: true,
    note: 'Derived $/kg to GTO, not GEO: Falcon Heavy $97M / 26,700 kg = $3,633/kg (2022 list); Falcon 9 $69.75M / 8,300 kg = $8,404/kg (2024 list). Both use fully expendable maximums. Reaching GEO itself costs more, because the satellite must carry its own propellant or thrusters for the final climb. The launcher leaves it in a transfer orbit with apogee near 35,786 km.',
    transfer_time: 'weeks with an onboard chemical engine (ESA: MSG circularised "over a period of weeks"); at least six months with all-electric propulsion (Boeing 702SP satellites, launched March 2015)',
    sources: [SPX2022, SPX2024, ESA_GTO, ESA_MSG, SFN_EP, NASA_BASICS],
  },
  heo: {
    usd_per_kg: [3633, 8404], notional: true,
    note: 'No source prices Molniya or Tundra orbits per kg. We reuse the GTO-class proxy (Falcon Heavy and Falcon 9 list price divided by expendable GTO capacity). We found no sourced typical transfer time.',
    transfer_time: null,
    sources: [SPX2022, SPX2024],
  },
  cislunar: {
    usd_per_kg: [5774, 17351], usd_per_kg_derived: true, notional: true,
    note: 'Proxy from SpaceX payload-to-Mars figures, which need more energy than a lunar transfer, so these overstate cislunar cost: Falcon Heavy $97M / 16,800 kg = $5,774/kg (2022); Falcon 9 $69.75M / 4,020 kg = $17,351/kg (2024). Apollo 11 fired its translunar burn 2 h 44 min after launch and entered lunar orbit about 75 h 50 min into the flight. CAPSTONE took a low-energy route and needed about four months (launched 28 Jun 2022, orbit insertion 13 Nov 2022).',
    transfer_time: 'about 3 days (direct, Apollo 11) to about 4 months (low-energy, CAPSTONE)',
    sources: [SPX2022, SPX2024, NASA_A11, NASA_CAP],
  },
};

const VNOX = { t: 'Vandenberg SFB / SSC, "Space Systems Command Successfully Launches VICTUS NOX ..." (Wayback capture)', u: 'https://web.archive.org/web/20241211130905/https://www.vandenberg.spaceforce.mil/News/Article-Display/Article/3526687/space-systems-command-successfully-launches-victus-nox-for-us-space-force-sets/' };
const KEYT = { t: 'KEYT, Space Systems Command set launch window record (15 Sep 2023)', u: 'https://keyt.com/news/santa-maria-north-county/2023/09/15/space-systems-command-successfully-set-launch-window-record-thursday-from-vandenberg-sfb/' };
const RL_VH = { t: 'Rocket Lab, VICTUS HAZE mission page (Wayback capture 31 Aug 2026)', u: 'https://web.archive.org/web/20260831043045/https://rocketlabcorp.com/missions/launches/victus-haze/' };
const RL_VH2 = { t: 'Rocket Lab, VICTUS HAZE mission overview (Wayback capture 10 Aug 2026)', u: 'https://web.archive.org/web/20260810234801/https://rocketlabcorp.com/missions/launches/victus-haze-2/' };
const EXGOV_VH = { t: 'ExecutiveGov, USSF reports Victus Haze launch', u: 'https://www.executivegov.com/articles/ussf-rocket-lab-victus-haze-tacrs' };
const DN_VH = { t: 'Defense News, "Space Force picks satellite providers for rapid delivery mission" (11 Apr 2024)', u: 'https://www.defensenews.com/battlefield-tech/space/2024/04/11/space-force-picks-satellite-providers-for-rapid-delivery-mission/' };
const sda = (slug, label) => ({ t: `SDA, ${label}`, u: `https://www.sda.mil/${slug}/` });

export const RESPONSIVE = [
  {
    name: 'TacRL-2', kind: 'responsive-launch', country: 'us', date: '2021-06-13',
    call_to_launch: '21 days',
    cost: null,
    note: 'Space Systems Command\'s first operational tactically responsive launch demonstration and the record before VICTUS NOX.',
    sources: [VNOX],
  },
  {
    name: 'VICTUS NOX', kind: 'responsive-launch', country: 'us', date: '2023-09-14',
    call_to_launch: '27 hours from launch orders to liftoff',
    cost: null,
    note: 'Firefly Alpha carried a Millennium Space Systems satellite from Vandenberg SLC-2W. Less than a year after contract award the teams entered a "hot standby" phase. On activation, the satellite was trucked 165 miles to Vandenberg and tested, fueled and mated to the launch adapter in just under 58 hours. After launch orders, the team encapsulated it, mated it to the rocket and finished final preparations in 24 hours, then launched at the first window, 27 hours after the orders.',
    sources: [VNOX, KEYT],
  },
  {
    name: 'VICTUS HAZE', kind: 'responsive-launch', country: 'us', date: '2026-06-19',
    call_to_launch: '16 hours 42 minutes from Notice to Launch to liftoff',
    cost: { usd: 32000000, per: 'Rocket Lab contract (via DIU)', year: 2024, note: 'True Anomaly separately received $30M for its Jackal vehicle and committed to match it with another $30M.' },
    note: 'Electron launched Rocket Lab\'s own Pioneer spacecraft (PUMA) from Launch Complex 1, New Zealand, at 10:19 p.m. NZST. Rocket Lab says this beat the previous record by more than 10 hours. The mission then moves to rendezvous and proximity operations with True Anomaly\'s Jackal. Defense News reported in April 2024 that the mission was slated for 2025.',
    sources: [RL_VH, RL_VH2, EXGOV_VH, DN_VH],
  },
  {
    name: 'SDA Tranche 1 launch campaign', kind: 'launch-cadence', country: 'us', date: '2025-09-10',
    call_to_launch: null,
    cost: null,
    note: 'First Tranche 1 launch: a Falcon 9 carried 21 York-built transport satellites. SDA then said launches would continue at about one per month for nine months. The third launch came on 16 Jul 2026 and brought the Tranche 1 total on orbit to 63.',
    sources: [sda('space-development-agency-completes-successful-launch-of-first-tranche-1-satellites', 'first Tranche 1 launch (10 Sep 2025)'), sda('space-development-agency-successfully-completes-third-launch-of-tranche-1-satellites', 'third Tranche 1 launch (16 Jul 2026)')],
  },
  {
    name: 'SDA Tranche 1 Transport Layer awards', kind: 'satellite-cost', country: 'us', date: '2022-02-28',
    call_to_launch: null,
    cost: { usd: 1800000000, per: '126 satellites (3 awards)', year: 2022, per_satellite_usd: { 'York Space Systems': 9100000, 'Lockheed Martin': 16700000, 'Northrop Grumman': 16500000, all: 14300000 }, usd_per_satellite_derived: true },
    note: 'Derived per-satellite figures: award value / satellites. York $382M / 42; Lockheed Martin $700M / 42; Northrop Grumman $692M / 42; total about $1.8B / 126. Award values also cover other work, such as operations, so they overstate the cost of the satellite alone.',
    sources: [sda('space-development-agency-makes-awards-for-tranche-1-transport-layer', 'Tranche 1 Transport Layer awards (28 Feb 2022)')],
  },
  {
    name: 'SDA Tranche 1 Tracking Layer awards', kind: 'satellite-cost', country: 'us', date: '2022-07-18',
    call_to_launch: null,
    cost: { usd: 1317000000, per: '28 satellites (2 awards)', year: 2022, per_satellite_usd: { 'L3Harris': 50000000, 'Northrop Grumman': 44100000 }, usd_per_satellite_derived: true },
    note: 'Derived: L3Harris about $700M / 14; Northrop Grumman about $617M / 14. SDA describes the total as over $1.3B. Each award includes launch preparation and a ground segment, so per-satellite figures overstate the satellite alone.',
    sources: [sda('space-development-agency-makes-awards-for-28-satellites-to-build-tranche-1-tracking-layer', 'Tranche 1 Tracking Layer awards (18 Jul 2022)')],
  },
  {
    name: 'SDA Tranche 2 Transport Layer awards (Beta and Alpha)', kind: 'satellite-cost', country: 'us', date: '2023-08-21',
    call_to_launch: null,
    cost: { usd: 3413000000, per: '190 satellites (5 awards)', year: 2023, per_satellite_usd: { 'Lockheed Martin (Beta)': 22700000, 'Northrop Grumman (Beta)': 20400000, 'Rocket Lab (Beta)': 28600000, 'York (Alpha)': 9950000, 'Northrop Grumman (Alpha)': 19300000 }, usd_per_satellite_derived: true },
    note: 'Derived: Beta (21 Aug 2023) Lockheed Martin $816M / 36 and Northrop Grumman $733M / 36; Beta third award (8 Jan 2024) Rocket Lab $515M / 18; Alpha (30 Oct 2023) York $617M / 62 and Northrop Grumman $732M / 38. Total $3,413M is our sum of the five awards. Awards cover building and operating the satellites.',
    sources: [
      sda('space-development-agency-makes-awards-to-build-72-beta-variant-satellites-for-tranche-2-transport-layer', 'Tranche 2 Transport Layer Beta awards (21 Aug 2023)'),
      sda('space-development-agency-makes-third-award-to-build-18-additional-beta-variant-satellites-for-tranche-2-transport-layer', 'third Tranche 2 Beta award (8 Jan 2024)'),
      sda('space-development-agency-makes-awards-to-build-100-alpha-variant-satellites-for-tranche-2-transport-layer', 'Tranche 2 Transport Layer Alpha awards (30 Oct 2023)'),
    ],
  },
  {
    name: 'SDA Tranche 2 Tracking Layer awards', kind: 'satellite-cost', country: 'us', date: '2024-01-16',
    call_to_launch: null,
    cost: { usd: 2549000000, per: '54 satellites (3 awards)', year: 2024, per_satellite_usd: { 'L3Harris': 51100000, 'Lockheed Martin': 49400000, 'Sierra Space': 41100000 }, usd_per_satellite_derived: true },
    note: 'Derived: L3Harris $919M / 18; Lockheed Martin $890M / 18; Sierra Space $740M / 18. Total $2,549M is our sum. Each vendor builds 16 missile warning/tracking satellites and 2 fire-control-quality missile defense satellites, and operates them.',
    sources: [sda('space-development-agency-makes-awards-to-build-54-tranche-2-tracking-layer-satellites', 'Tranche 2 Tracking Layer awards (16 Jan 2024)')],
  },
  {
    name: 'SDA Tranche 3 Tracking Layer awards', kind: 'satellite-cost', country: 'us', date: '2025-12-19',
    call_to_launch: null,
    cost: { usd: 3500000000, per: '72 satellites (4 awards)', year: 2025, per_satellite_usd: { 'Lockheed Martin': 61100000, 'Rocket Lab': 44700000, 'Northrop Grumman': 42400000, 'L3Harris': 46800000 }, usd_per_satellite_derived: true },
    note: 'Derived: Lockheed Martin $1.1B / 18 and Rocket Lab $805M / 18 (missile warning, tracking and defense satellites); Northrop Grumman $764M / 18 and L3Harris $843M / 18 (missile warning/tracking). Launches planned for fiscal 2029.',
    sources: [sda('space-development-agency-makes-awards-to-build-72-tracking-layer-satellites-for-tranche-3', 'Tranche 3 Tracking Layer awards (19 Dec 2025)')],
  },
  {
    name: 'Kuaizhou-1A: two launches in under six hours', kind: 'responsive-launch', country: 'cn', date: '2019-12-07',
    call_to_launch: null,
    cost: null,
    note: 'Two solid-fuel Kuaizhou-1A rockets launched from Taiyuan less than six hours apart, from separate road-mobile transporters, carrying seven small satellites. This shows turnaround between launches, not time from an order to liftoff; China does not publish call-to-launch times.',
    sources: [{ t: 'Spaceflight Now, "China launches two Kuaizhou rockets in six hours" (7 Dec 2019)', u: 'https://spaceflightnow.com/2019/12/07/china-launches-two-kuaizhou-rockets-in-six-hours/' }],
  },
  {
    name: 'Kuaizhou-1A: same pad, four days apart', kind: 'responsive-launch', country: 'cn', date: '2019-11-17',
    call_to_launch: null,
    cost: null,
    note: 'A Kuaizhou-1A flew from the same Jiuquan pad a little more than four days after the previous one (13 Nov 2019).',
    sources: [{ t: 'Spaceflight Now, "China\'s Kuaizhou launcher flies for second time in four days" (19 Nov 2019)', u: 'https://spaceflightnow.com/2019/11/19/chinas-kuaizhou-launcher-flies-for-second-time-in-four-days/' }],
  },
  {
    name: 'Jielong-3 sea launches', kind: 'responsive-launch', country: 'cn', date: '2025',
    call_to_launch: null,
    cost: null,
    note: 'Solid-fuel rocket (up to 1,500 kg to 500 km SSO) launched from converted barges in the Yellow, East China and South China seas, which frees it from fixed pads. Four launches in 2025, all successful. We found no published call-to-launch time.',
    sources: [wiki('Jielong_3', 'Jielong 3'), W2025],
  },
];
