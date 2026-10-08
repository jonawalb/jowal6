// Sections below the globe: getting there, who has what, threat by layer, ASAT tests, what it means, method and sources.
import { LAYERS, LAYER, COUNTRY, COUNTRIES, ORBIT_LAYERS, TYPES, STATUS, esc, fmtUsd } from './common.js';
import { mountSustain } from './sustain.js';

const n = v => v == null ? '—' : Number(v).toLocaleString('en-US');
const ADVERSARIES = ['cn', 'ru', 'ir', 'kp'];
const WEAPON_TYPES = ['da-asat', 'co-orbital', 'rpo', 'nuclear-asat', 'interceptor-msl', 'dew-laser', 'jammer', 'cyber'];
const SHORT = { 'da-asat': 'DA-ASAT', 'co-orbital': 'Co-orbital', rpo: 'Inspector', 'nuclear-asat': 'Nuclear', 'interceptor-msl': 'BMD', 'dew-laser': 'Laser', jammer: 'Jammer', cyber: 'Cyber' };
const STATUS_RANK = { operational: 4, tested: 3, developmental: 2, reported: 1, planned: 1, retired: 0 };

function access(data) {
  const A = data.LAUNCH?.LAYER_ACCESS || {}, rows = ORBIT_LAYERS.filter(l => A[l]?.usd_per_kg);
  if (!rows.length) return '';
  const vals = rows.flatMap(l => [].concat(A[l].usd_per_kg)).filter(v => v > 0);
  const lo = Math.floor(Math.log10(Math.min(...vals))), hi = Math.ceil(Math.log10(Math.max(...vals)));
  const W = 640, L = 120, R = 16, rowH = 34, H = rows.length * rowH + 34, x = v => L + (Math.log10(v) - lo) / (hi - lo) * (W - L - R);
  const bars = rows.map((l, i) => {
    const [a, b] = [].concat(A[l].usd_per_kg).length > 1 ? A[l].usd_per_kg : [A[l].usd_per_kg, A[l].usd_per_kg];
    const yy = 10 + i * rowH;
    return `<text class="lbl" x="${L - 10}" y="${yy + 15}" text-anchor="end">${esc(LAYER[l].short)}</text>
      <rect x="${x(a)}" y="${yy + 4}" width="${Math.max(4, x(b) - x(a))}" height="16" rx="3" fill="var(--c1)" opacity=".75"/>
      <text x="${x(b) + 6 > W - 110 ? x(a) - 6 : x(b) + 6}" text-anchor="${x(b) + 6 > W - 110 ? 'end' : 'start'}" y="${yy + 16}">${fmtUsd(a)}${b !== a ? '–' + fmtUsd(b) : ''} /kg</text>`;
  }).join('');
  const ticks = []; for (let e = lo; e <= hi; e++) ticks.push(`<line x1="${x(10 ** e)}" x2="${x(10 ** e)}" y1="6" y2="${H - 24}" stroke="var(--rule)"/><text x="${x(10 ** e)}" y="${H - 8}" text-anchor="middle">${fmtUsd(10 ** e)}</text>`);
  const time = rows.map(l => `<tr><td>${esc(LAYER[l].name)}</td><td>${esc(A[l].transfer_time || '—')}</td><td class="fine">${esc(A[l].note || '')}</td></tr>`).join('');
  return `<div class="sl-access"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Launch cost per kilogram by layer, log scale">${ticks.join('')}${bars}</svg></div>
    <p class="fine">Price per kilogram of payload on current launchers, log scale. Higher orbits cost more because the rocket carries less, or the satellite carries its own fuel to finish the climb.</p>
    <div class="tablewrap" style="margin-top:10px"><table><thead><tr><th>Layer</th><th>Time to get there</th><th>Note</th></tr></thead><tbody>${time}</tbody></table></div>`;
}

function launchers(data) {
  const Ls = data.LAUNCH?.LAUNCHERS || [];
  if (!Ls.length) return '';
  const rows = Ls.slice().sort((a, b) => (a.usd_per_kg_leo ?? 1e12) - (b.usd_per_kg_leo ?? 1e12));
  return `<h3 style="font-size:17px;margin:18px 0 6px">Launchers</h3><div class="tablewrap"><table><thead><tr><th>Rocket</th><th>Country</th><th class="num">To LEO, kg</th><th class="num">To GTO, kg</th><th class="num">Price</th><th class="num">$/kg to LEO</th><th>Reusable</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${r.sources?.[0]?.u ? `<a href="${esc(r.sources[0].u)}" target="_blank" rel="noopener">${esc(r.name)}</a>` : esc(r.name)}</td><td>${esc(r.country === 'com' ? (r.operator || 'Commercial') : COUNTRY[r.country]?.name || r.country)}</td>
      <td class="num">${n(r.payload_leo_kg)}</td><td class="num">${n(r.payload_gto_kg)}</td><td class="num">${r.price_usd ? fmtUsd(r.price_usd) + (r.price_year ? ` <span class="muted">(${r.price_year})</span>` : '') : '—'}</td>
      <td class="num">${r.usd_per_kg_leo ? fmtUsd(r.usd_per_kg_leo) : '—'}</td><td>${r.reusable ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody></table></div>`;
}

function responsive(data) {
  const R = data.LAUNCH?.RESPONSIVE || [];
  if (!R.length) return '';
  return `<h3 style="font-size:17px;margin:18px 0 6px">How fast can a side replace a satellite?</h3><ul class="sl-resp">${R.map(r =>
    `<li><b>${esc(r.name)}</b>${r.date ? ` (${esc(r.date)})` : ''}: ${esc([r.call_to_launch, r.note].filter(Boolean).join('. '))}${r.sources?.length ? ` <a href="${esc(r.sources[0].u)}" target="_blank" rel="noopener">source</a>` : ''}</li>`).join('')}</ul>`;
}

function whoHasWhat(data) {
  const ws = data.ALL.filter(w => w.kind === 'offensive' || w.kind === 'defensive');
  const cs = COUNTRIES.filter(c => ws.some(w => w.country === c.id));
  if (!cs.length) return '';
  const cell = (c, t) => {
    const m = ws.filter(w => w.country === c && w.type === t);
    if (!m.length) return '<td class="c"></td>';
    const best = m.reduce((a, b) => (STATUS_RANK[b.status] ?? 0) > (STATUS_RANK[a.status] ?? 0) ? b : a);
    const shade = { 4: 'var(--bad)', 3: 'var(--warn)', 2: 'var(--blue)', 1: 'var(--faint)', 0: 'var(--rule)' }[STATUS_RANK[best.status] ?? 1];
    return `<td class="c"><a href="#" data-sel="${esc(best.id)}" class="sl-cell" style="border:1px solid ${shade};color:${shade}" title="${esc(m.map(x => x.name).join('; '))}">${m.length}</a></td>`;
  };
  return `<div class="tablewrap"><table class="sl-heat"><thead><tr><th>Country</th>${WEAPON_TYPES.map(t => `<th class="c">${SHORT[t]}</th>`).join('')}</tr></thead><tbody>
    ${cs.map(c => `<tr><td>${esc(c.name)}</td>${WEAPON_TYPES.map(t => cell(c.id, t)).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="fine" style="margin-top:6px">Number of counterspace systems in this data set. Border color = most advanced status: <span style="color:var(--bad)">operational</span>, <span style="color:var(--warn)">tested</span>, <span style="color:var(--blue)">in development</span>, <span style="color:var(--faint)">reported</span>. Click a number to see it on the globe.</p>`;
}

function threatByLayer(data) {
  const ws = data.ALL.filter(w => w.kind === 'offensive');
  const rows = ORBIT_LAYERS.map(l => `<tr><td>${esc(LAYER[l].name)}</td>${ADVERSARIES.map(c => {
    const m = ws.filter(w => w.country === c && (w.reach || []).includes(l));
    const types = [...new Set(m.map(w => SHORT[w.type] || w.type))];
    return `<td>${types.length ? types.map(t => `<span class="pill">${esc(t)}</span>`).join('') : '<span class="muted">none reported</span>'}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="tablewrap"><table><thead><tr><th>Layer</th>${ADVERSARIES.map(c => `<th>${esc(COUNTRY[c].name)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
    <p class="fine" style="margin-top:6px">Weapon types each country has that can reach each layer, at any status from reported to operational. Jammers and cyber tools work against every layer and are not repeated here.</p>`;
}

function testsTimeline(data) {
  const T = (data.TESTS || []).filter(t => t.date).slice().sort((a, b) => a.date.localeCompare(b.date));
  if (!T.length) return '';
  const y0 = +T[0].date.slice(0, 4) - 2, y1 = 2027;
  const W = 640, L = 50, R = 20, H = 330, Tp = 16, B = 60;
  const x = d => L + ((+d.slice(0, 4) + (+(d.slice(5, 7) || 6) - 1) / 12) - y0) / (y1 - y0) * (W - L - R);
  const alts = T.map(t => t.alt_km).filter(Boolean), amax = Math.max(1000, ...alts);
  const y = a => Tp + (1 - Math.log10(a / 100) / Math.log10(amax / 100)) * (H - Tp - B);
  const r = d => d ? Math.max(4, Math.sqrt(d) / 3) : 4;
  const dots = T.map(t => {
    const a = t.alt_km, des = (t.debris_tracked || 0) > 0 || t.destructive;
    return `<g><circle cx="${x(t.date)}" cy="${a ? y(a) : H - 34}" r="${r(t.debris_tracked)}" fill="var(--k-${t.country}, var(--faint))" fill-opacity="${des ? .55 : .12}" stroke="var(--k-${t.country}, var(--faint))" stroke-width="1.5"><title>${esc(t.name)} (${esc(t.date)}): ${t.alt_km ? n(t.alt_km) + ' km' : 'altitude n/a'}${t.debris_tracked ? `, ${n(t.debris_tracked)} tracked debris` : ''}</title></circle></g>`;
  }).join('');
  const big = T.filter(t => (t.debris_tracked || 0) >= 300).map(t => `<text class="lbl" x="${x(t.date) > W * 0.7 ? x(t.date) - r(t.debris_tracked) - 4 : x(t.date) + r(t.debris_tracked) + 4}" text-anchor="${x(t.date) > W * 0.7 ? 'end' : 'start'}" y="${(t.alt_km ? y(t.alt_km) : H - 34) + 4}">${esc(t.name.split(/[(:]/)[0].trim())}</text>`).join('');
  const yt = [100, 300, 1000, 3000, 10000, 36000].filter(a => a <= amax * 1.05).map(a => `<line x1="${L}" x2="${W - R}" y1="${y(a)}" y2="${y(a)}" stroke="var(--rule)"/><text x="${L - 6}" y="${y(a) + 4}" text-anchor="end">${n(a)}</text>`).join('');
  const xt = []; for (let yr = Math.ceil(y0 / 10) * 10; yr <= y1; yr += 10) xt.push(`<text x="${x(yr + '-01')}" y="${H - 8}" text-anchor="middle">${yr}</text>`);
  const list = T.map(t => `<tr><td class="num">${esc(t.date)}</td><td>${esc(COUNTRY[t.country]?.name || t.country)}</td><td>${esc(t.name)}</td><td class="num">${t.alt_km ? n(t.alt_km) : '—'}</td><td class="num">${t.debris_tracked ? n(t.debris_tracked) : '—'}</td><td class="num">${t.debris_still_on_orbit != null ? n(t.debris_still_on_orbit) + (t.asof ? ` <span class="muted">(${esc(t.asof)})</span>` : '') : '—'}</td><td>${(t.sources || []).map((s, i) => `<a href="${esc(s.u)}" target="_blank" rel="noopener">${i + 1}</a>`).join(' ')}</td></tr>`).join('');
  return `<div class="sl-tl"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="ASAT tests by year and altitude; circle area shows tracked debris">${yt}${xt.join('')}<text x="${L}" y="10">altitude, km (log)</text><line x1="${L}" x2="${W - R}" y1="${H - 34}" y2="${H - 34}" stroke="var(--rule)" stroke-dasharray="3 3"/><text x="${L - 6}" y="${H - 30}" text-anchor="end">n/a</text>${dots}${big}</svg></div>
    <p class="fine">Each circle is a test. Filled circles made tracked debris, and their area grows with the debris count. Hollow circles are tests without a destructive intercept. Tests whose sources give no altitude sit on the dashed n/a line. Hover for details.</p>
    <details style="margin-top:8px"><summary>All ${T.length} tests as a table</summary><div class="tablewrap" style="margin-top:8px"><table><thead><tr><th>Date</th><th>Country</th><th>Test</th><th class="num">Altitude, km</th><th class="num">Tracked debris</th><th class="num">Still in orbit</th><th>Sources</th></tr></thead><tbody>${list}</tbody></table></div></details>`;
}

function sosi(data) {
  const ss = data.ALL.filter(it => it.type === 'ssa');
  if (!ss.length) return '';
  const by = {}; ss.forEach(s => (by[s.country] ??= []).push(s));
  return `<ul>${Object.entries(by).map(([c, a]) => `<li><b>${esc(COUNTRY[c]?.name || c)}</b>: ${a.map(s => `<a href="#" data-sel="${esc(s.id)}">${esc(s.name)}</a>`).join('; ')}</li>`).join('')}</ul>`;
}

function implications(data) {
  const W = data.ALL.filter(w => w.kind === 'offensive'), T = data.TESTS || [];
  const advLeo = W.filter(w => ADVERSARIES.includes(w.country) && (w.reach || []).includes('leo')).length;
  const advGeo = W.filter(w => ADVERSARIES.includes(w.country) && (w.reach || []).includes('geo')).length;
  const da = W.filter(w => w.type === 'da-asat' || w.type === 'interceptor-msl');
  const daStates = [...new Set(da.filter(w => ['tested', 'operational'].includes(w.status)).map(w => COUNTRY[w.country]?.name))].filter(Boolean);
  const debris = T.reduce((s, t) => s + (t.debris_tracked || 0), 0);
  const resp = (data.LAUNCH?.RESPONSIVE || []).length;
  const card = (h, body, link) => `<article><h3>${h}</h3>${body}${link ? `<p class="fine">${link}</p>` : ''}</article>`;
  return `<div class="sl-implications">
    ${card('Resilience', '<p>A satellite that cannot be defended has to be replaceable, numerous or hard to find. Spreading a mission across many small satellites, several orbits, allies and commercial providers means no single shot takes it down.</p><p>Color the dots by <b>Vulnerability</b> above and compare a GEO constellation with a proliferated LEO one.</p>')}
    ${card('Sustainable space services', `<p>Destructive tests in this data set made <b>${n(debris)}</b> pieces of tracked debris, and debris does not take sides. Fragments above about 800 km stay up for decades and threaten everyone's satellites in that shell, including the attacker's.</p>`, 'See the test timeline below.')}
    ${card('Anticipate enemy capabilities', `<p>China, Russia, Iran and North Korea field or are reported to be developing <b>${advLeo}</b> systems in this data set that can reach LEO and <b>${advGeo}</b> that can reach GEO. Planning has to assume the tested systems work and track the reported ones.</p>`, 'See the threat-by-layer table below.')}
    ${card('Kill from the ground', `<p>A direct-ascent missile reaches LEO minutes after launch, from a road-mobile launcher, with little warning. States that have tested one against a target or in a hit-to-kill missile-defense role: <b>${esc(daStates.join(', ') || 'see the data')}</b>.</p>`)}
    ${card('Kinetic penetrators and physical attacks', '<p>Hit-to-kill vehicles destroy a satellite by impact alone, without explosives, and so create the most debris. Co-orbital weapons and inspector satellites can close in slowly and strike, grapple or blind a target. Hardening only helps at the margins against impact; distance, numbers and maneuver help more.</p>')}
    ${card('Reconstitute space services', `<p>Reconstitution means replacing lost capability fast enough to matter: spares already on orbit, satellites and rockets on standby, and contracts to buy commercial capacity. This page lists ${resp} demonstrations of fast launch and replacement.</p>`, 'See "How fast can a side replace a satellite?" above.')}
    ${card('Short, medium and long term', '<p>In the first days, what is already on orbit and hardened is all a side has. Over weeks, spares, allies and commercial providers fill gaps. Over months, the side that can build and launch faster wins the attrition. Try it in the model below.</p>')}
    ${card('Replenish and launch new forces', '<p>Launch rate is a war-fighting capability. A side needs rockets, pads, satellites in production and crews to replace losses faster than the enemy can destroy them. Compare cost per kilogram and launchers above.</p>')}
    ${card('Disrupt their attack on your satellites', '<p>An ASAT attack depends on launchers, jammers, command links and a tracking network that tells the shooter where the target is. Each is a target: blind the tracking, cut the command, hit the launcher. Striking them on the enemy\'s territory is an escalation, and some of those sites also serve nuclear forces.</p>', '<a href="../entanglement/">Nuclear Entanglement</a> plays out that risk.')}
    ${card('Hit their tracking network (SOSI)', `<p>Space object surveillance and identification (SOSI) is the radars, telescopes and inspector satellites that find and identify objects in orbit. Without it a co-orbital or ground-launched weapon cannot find a maneuvering target. Their tracking systems in this data set:</p>${sosi(data) || '<p class="muted">none listed yet</p>'}`)}
    ${card('ASAT weapons', `<p>Four countries have destroyed a satellite of their own in a test: the United States, the Soviet Union and Russia, China and India. Many more can jam, dazzle or hack. Filter <b>Category</b> to Offensive and color by <b>Country</b> to see who has what.</p>`)}
  </div>`;
}

function allSources(data) {
  const seen = new Map();
  const add = s => { if (s?.u && !seen.has(s.u)) seen.set(s.u, s.t); };
  data.ALL.forEach(it => (it.sources || []).forEach(add));
  (data.TESTS || []).forEach(t => (t.sources || []).forEach(add));
  const L = data.LAUNCH || {};
  (L.LAUNCHERS || []).forEach(r => (r.sources || []).forEach(add));
  Object.values(L.LAYER_ACCESS || {}).forEach(a => (a.sources || []).forEach(add));
  (L.RESPONSIVE || []).forEach(r => (r.sources || []).forEach(add));
  Object.values(data.LAYERS_FACTS || {}).forEach(f => (f.sources || []).forEach(add));
  if (data.DEBRIS) { add(data.DEBRIS.public.src); add(data.DEBRIS.esa.src); }
  add({ t: 'CelesTrak, satellites by purpose (GP element groups), retrieved 8 Oct 2026', u: 'https://celestrak.org/NORAD/elements/' });
  if (data.COUNTS) add({ t: `CelesTrak SATCAT, retrieved ${data.COUNTS.asof}`, u: 'https://celestrak.org/satcat/search.php' });
  return [...seen].sort((a, b) => a[1].localeCompare(b[1])).map(([u, t]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('');
}

export function renderBelow(host, data, { focus }) {
  host.classList.add('sl-below');
  host.innerHTML = `
    <section><h2>What it costs to get there, and how long it takes</h2><p class="lede">Every kilogram put in orbit is paid for in launch cost, and higher orbits cost more. Reconstitution in a war depends on how fast both rockets and satellites can be replaced.</p>
      ${access(data)}${launchers(data)}${responsive(data)}</section>
    <section><h2>Who has what: counterspace weapons by country</h2><p class="lede">Offensive and defensive counterspace systems in this data set, by type.</p>${whoHasWhat(data)}</section>
    <section><h2>Threat by layer</h2><p class="lede">Which of the main U.S. adversaries can reach which orbit.</p>${threatByLayer(data)}</section>
    <section><h2>ASAT tests and the debris they left</h2><p class="lede">Destructive anti-satellite tests from the Cold War to Russia's 2021 test, against non-destructive tests and fly-bys.</p>${testsTimeline(data)}</section>
    <section><h2>What this means</h2><p class="lede">For resilience, for keeping space services running, and for fighting in a domain where the battlefield is shared.</p>${implications(data)}
      <h3 style="margin:24px 0 4px;font-size:19px">Keep the lights on: space support over a year of war <span class="notional">notional</span></h3>
      <p class="fine">Pick an architecture, the attacks it faces and what you prepared. The curve shows how much space support survives in the short, medium and long term. For a full game with an opponent, play <a href="../orbital-denial/">Orbital Denial</a>.</p>
      <div class="sl-sustain" id="sustain"></div></section>
    <section><h2>How to read this</h2>
      <p>The globe is real; the layers around it are drawn to a <b>readable scale</b> that compresses distance so every layer shows. Switch to <b>True scale</b> to see how thin low Earth orbit is and how far away GEO and the Moon are.</p>
      <p>Each layer is a zone, not a single track: satellites in LEO sit anywhere from 450 to 2,000 km at many tilts, HEO is a family of long, tilted loops, and even GEO is a belt a few hundred kilometres thick with satellites drifting slightly north and south. The small dots are every active satellite in the public catalog (and, if you switch it on, every tracked piece of debris), each at its real height and tilt; the catalog does not say where along its orbit each one is, so that part is random. The large dots are the systems in the list: each is a constellation, weapon or sensor network, not one satellite. Dots on the ground sit at the operating country's center: this page gives no facility locations. Satellites in GEO turn with the Earth; the rest orbit at speeds that keep Kepler's ratios.</p>
      <p>Click a dot or a list entry for its capability, cost, technical specs and sources. Weapons show the layers they can reach; satellite systems show how exposed they are to each kind of attack.</p></section>
    <section><h2>Method and limits</h2>
      <p>Weapons, systems, tests and costs come from the sources listed with each entry, mainly the Secure World Foundation's <i>Global Counterspace Capabilities</i>, CSIS's <i>Space Threat Assessment</i>, government budget documents and operators' own pages. Satellite and debris counts come from CelesTrak's public catalog. Where no public cost exists the system shows "no public cost figure".</p>
      <p>Individual satellites get a mission from CelesTrak's public "satellites by purpose" lists first, then from public programme names (for example Yaogan and Gaofen as imaging, NAVSTAR as navigation, WGS and AEHF as communications). On the build date that covered 83% of active satellites from the lists and 10% from names; the remaining 7% are "Mission not identified". U.S. "USA" payloads, Russian Kosmos satellites, China's TJS series and SDA satellites are grouped as "Military, purpose not public", so the missile-warning count for single satellites is far below the real number. Satellites that are classified and missing from the public catalog do not appear at all. Where each satellite sits along its orbit is drawn at random; height and tilt are real.</p>
      <p>The exposure scores (0 to 3 per threat) are the author's judgment from each system's orbit, numbers and design, and are marked <span class="notional">judgment</span>. The space-support model is notional throughout. Public sources understate classified programs, so absence from this page is not absence from orbit.</p></section>
    <section><h2>Sources</h2><ol class="src">${allSources(data)}</ol></section>`;
  mountSustain(host.querySelector('#sustain'));
  host.addEventListener('click', e => {
    const a = e.target.closest('[data-sel]'); if (!a) return;
    e.preventDefault(); focus(null, a.dataset.sel);
  });
}
