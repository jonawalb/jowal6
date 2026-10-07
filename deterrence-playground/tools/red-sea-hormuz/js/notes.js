// Below-the-fold text: Connell and Walberg's published mine-warfare commentary, method notes and the event source list.
// The two numbers in the commentary box are computed from the PortWatch data, not typed in.
import { escapeHtml } from '../../../shared/js/mapkit.js';
import { EVENTS, CATS } from '../data/events.js';
import { EIA } from '../data/eia.js';
import { PORTWATCH } from '../data/transits.js';
import { windowMean, niceDate, LAST, FIRST } from './series.js';

const a = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
const MW = 'https://centerformaritimestrategy.org/publications/its-time-to-bring-back-minewarcom/';
const PW = 'https://portwatch.imf.org/';
const STRIPES = 'https://www.stripes.com/theaters/asia_pacific/2026-04-16/navy-japan-minesweepers-hormuz-strait-21393177.html';

const pre = windowMean('hormuz', 'total', ['2025-03-01', '2026-02-28']);
const post = windowMean('hormuz', 'total', ['2026-08-27', LAST]);

document.getElementById('rs-walberg').innerHTML = `
  <p>In ${a(MW, '"It\'s Time to Bring Back MINEWARCOM"')} (Center for Maritime Strategy, 31 July 2026), Ethan Connell and Jonathan Walberg write that "mines are effective not only by sinking ships but also by deterring underwriters from insuring passage, as seen in the current Strait of Hormuz crisis." They note that the Navy decommissioned its last four Bahrain-based Avenger-class mine countermeasures ships in September 2025 and argue for a reestablished Mine Warfare Command led by a flag officer dedicated to mine warfare. Four more Avengers remain homeported in Sasebo, Japan; two of them, USS Chief and USS Pioneer, left Singapore on 10 April 2026 on a course toward Hormuz, though the Navy did not disclose their destination (${a(STRIPES, 'Stars and Stripes, 16 April 2026')}).</p>
  <p>The PortWatch counts are consistent with that argument about insurers. Hormuz averaged <b>${Math.round(pre)}</b> ships a day in the twelve months before 28 February 2026, and <b>${post.toFixed(1)}</b> a day from 27 August, when CENTCOM said the lanes were clear, to ${niceDate(LAST)}. Some of the gap may be ships sailing with AIS switched off, and the U.S. blockade of Iranian ports was still in force, so the counts alone cannot separate fear of mines from other causes.</p>`;

document.getElementById('rs-method').innerHTML = [
  `Ship transits: ${a(PW, 'IMF PortWatch')}, daily chokepoint transit counts (ArcGIS FeatureServer <code>Daily_Chokepoints_Data</code>, layer 0; chokepoint IDs from <code>PortWatch_chokepoints_database</code>): Suez Canal <code>chokepoint1</code>, Bab el-Mandeb <code>chokepoint4</code>, Strait of Hormuz <code>chokepoint6</code>, Cape of Good Hope <code>chokepoint7</code>. Coverage ${niceDate(FIRST)} to ${niceDate(LAST)} with no missing days, retrieved ${niceDate(PORTWATCH.retrieved)} by <code>scripts/build_portwatch.py</code>, which records the query URL and date in <code>data/transits_meta.json</code>. PortWatch estimates transits from AIS ship positions.`,
  'Ship types: "All ships" is PortWatch\'s <code>n_total</code>; tankers, container ships and capacity (deadweight tonnes, shown in thousands) are its type-specific fields. Averages in the comparison table use raw daily counts; the 7-day and 30-day lines are trailing averages.',
  'The map places each chokepoint at PortWatch\'s own reference point. The dashed sea lanes are schematic, for orientation only. Basemap: Natural Earth 1:50m countries (public domain), built by <code>scripts/build_geo.py</code>.',
  `Oil flows: ${a(EIA.url, 'U.S. EIA, World Oil Transit Chokepoints')}, last updated 3 March 2026, Table 1, and the EIA Today in Energy notes linked in the panel. EIA's annual series ends with the first half of 2025.`,
  'Events: each has one linked source, opened and checked on 29 and 30 September 2026; events after 16 September 2026 were added and checked on 2 October 2026, and the blockade, Perim Island and 4–5 October events on 6 October 2026. Where sources disagree on a date or fact, the event text says so. Events are placed at the chokepoint they concern; the tool does not map attack locations.',
  'Nothing on this page is modeled or notional. Gaps: PortWatch does not count warships or ships without AIS; EIA has not published 2026 flows; figures for the number of mines laid and found in 2026 could not be confirmed from a source that loaded, so they are left out.',
].map(t => `<li>${t}</li>`).join('');

document.getElementById('rs-srcs').innerHTML = EVENTS.map(e =>
  `<li>${niceDate(e.date)}, ${escapeHtml(e.title)} (${escapeHtml(CATS[e.cat])}): ${a(e.src.url, escapeHtml(e.src.name))}</li>`).join('');
