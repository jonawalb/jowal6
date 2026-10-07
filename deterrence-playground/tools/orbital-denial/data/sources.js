// Sources for Orbital Denial. Every link was opened and the claim checked on 30 September 2026.
// NASA ODQN issues were read as PDFs from orbitaldebris.jsc.nasa.gov; Kessler & Cour-Palais (1978) was checked
// through its Crossref record and abstract (OpenAlex); Acton (2018) through Crossref and the Nuclear Entanglement
// tool's page-checked claims; the U.S. Space Command release through the Internet Archive because the live page
// blocks scripts.
export const SOURCES = {
  kessler1978: {
    t: 'Donald J. Kessler and Burton G. Cour-Palais, "Collision Frequency of Artificial Satellites: The Creation of a Debris Belt," Journal of Geophysical Research 83, no. A6 (1978): 2637–2646',
    url: 'https://doi.org/10.1029/JA083iA06p02637',
    used: 'the idea behind the model: collisions make fragments that make more collisions, so a debris belt can grow even with no new launches' },
  kessler2010: {
    t: 'Donald J. Kessler, Nicholas L. Johnson, J.-C. Liou and Mark Matney, "The Kessler Syndrome: Implications to Future Space Operations," AAS 10-016 (2010)',
    url: 'https://aquarid.physics.uwo.ca/kessler/Kessler%20Syndrome-AAS%20Paper.pdf',
    used: 'collision rate grows with the square of the population; 45% of collisions between cataloged objects catastrophic; 40 J/g threshold; 10 km/s example impact speed; source-sink "critical density" framing; cascading is slow' },
  krisko2011: {
    t: 'P. Krisko, "Proper Implementation of the 1998 NASA Breakup Model," Orbital Debris Quarterly News 15, no. 4 (October 2011): 4–5, summarizing Johnson et al., Advances in Space Research 28, no. 9 (2001): 1377–1384',
    url: 'https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv15i4.pdf',
    used: 'collision fragments N(Lc) = 0.1 · M^0.75 · Lc^−1.71, with M the sum of target and projectile mass' },
  odqn11_2: {
    t: 'NASA ODPO, "Chinese Anti-satellite Test Creates Most Severe Orbital Debris Cloud in History," Orbital Debris Quarterly News 11, no. 2 (April 2007): 2–3',
    url: 'https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv11i2.pdf',
    used: 'Fengyun-1C: 11 January 2007, 960 kg, 845 × 865 km at 98.6°; more than 1,200 debris cataloged two months later; debris from 200 to more than 4,000 km; cloud starts as a disk and disperses' },
  odqn12_1: {
    t: 'NASA ODPO, "Fengyun-1C Debris: One Year Later," Orbital Debris Quarterly News 12, no. 1 (January 2008): 2',
    url: 'https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv12i1.pdf',
    used: '2,317 debris cataloged by the end of 2007, fewer than 1% reentered; nearly 2,600 large debris (most larger than 10 cm) with those tracked; at least 150,000 debris of 1 cm and larger; both exceed model predictions' },
  odqn14_4: {
    t: 'NASA ODPO, "Chinese Debris Reaches New Milestone," Orbital Debris Quarterly News 14, no. 4 (October 2010): 3',
    url: 'https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv14i4.pdf',
    used: '3,037 Fengyun-1C debris cataloged by mid-September 2010, 97% still in orbit' },
  odqn26_1: {
    t: 'NASA ODPO, "The Intentional Destruction of Cosmos 1408," Orbital Debris Quarterly News 26, no. 1 (March 2022): 1–5',
    url: 'https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv26i1.pdf',
    used: 'Cosmos 1408: 15 November 2021, 1,750 kg, 490 × 465 km before the test; more than 1,500 trackable fragments; 1,604 cataloged by 7 March 2022' },
  odqn26_4: {
    t: 'P. Anz-Meador, "The Influence of Fragmentations and Mission-related Objects on the Space Environment," Orbital Debris Quarterly News 26, no. 4 (December 2022): 5–6',
    url: 'https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv26i4.pdf',
    used: 'as of 1 May 2022: Fengyun-1C 3,532 cataloged, 2,837 on orbit; Cosmos 1408 1,760 cataloged, 990 on orbit (same issue: the ISS maneuvered to avoid a Cosmos 1408 fragment in October 2022)' },
  odqn28_2: {
    t: 'A. Manis, M. Matney and P. Anz-Meador, "Evolution of the Cosmos 1408 Breakup Cloud: A Two-Year Status," Orbital Debris Quarterly News 28, no. 2 (April 2024): 1–4',
    url: 'https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv28i2.pdf',
    used: 'about 9% of modeled Cosmos 1408 fragments ≥1 cm left after two years; 1,805 cataloged by 3 February 2024; the NASA breakup model matched early radar data very well' },
  usspacecom2021: {
    t: 'U.S. Space Command, "Russian direct-ascent anti-satellite missile test creates significant, long-lasting space debris," 15 November 2021 (archived copy)',
    url: 'https://web.archive.org/web/20260926165944/https://www.spacecom.mil/Newsroom/News/Article-Display/Article/2842957/russian-direct-ascent-anti-satellite-missile-test-creates-significant-long-last/',
    used: '"more than 1,500 pieces of trackable orbital debris" and likely "hundreds of thousands of pieces of smaller orbital debris"' },
  swf2026: {
    t: 'Victoria Samson and Kathleen Brett, eds., Global Counterspace Capabilities: An Open Source Assessment (Secure World Foundation, April 2026)',
    url: 'https://swfound.org/counterspace/',
    used: 'five categories (co-orbital, direct-ascent, electronic warfare, directed energy, cyber); only non-destructive capabilities used in current conflicts; 6,904 cataloged debris from ASAT tests by four countries, 2,773 still on orbit' },
  csis2025: {
    t: 'Clayton Swope, Kari A. Bingen, Makena Young and Kendra LaFave, Space Threat Assessment 2025 (CSIS Aerospace Security Project, April 2025)',
    url: 'https://aerospace.csis.org/wp-content/uploads/2025/10/250425_Swope_Space_Threat.pdf',
    used: 'kinetic, non-kinetic, electronic and cyber categories; kinetic effects permanent, jamming and spoofing not; dazzlers meant to blind temporarily but may damage; cyber can be temporary or permanent' },
  esa2025: {
    t: 'European Space Agency, "ESA Space Environment Report 2025," 1 April 2025',
    url: 'https://www.esa.int/Space_Safety/Space_Debris/ESA_Space_Environment_Report_2025',
    used: '"Even without any additional launches, the number of space debris would keep growing, because fragmentation events add new debris objects faster than debris can naturally re-enter the atmosphere" (the reason the model keeps a background source of fragments)' },
  acton2018: {
    t: 'James M. Acton, "Escalation through Entanglement: How the Vulnerability of Command-and-Control Systems Raises the Risks of an Inadvertent Nuclear War," International Security 43, no. 1 (2018): 56–99',
    url: 'https://doi.org/10.1162/isec_a_00320',
    used: 'entanglement: satellites that serve both nuclear and non-nuclear forces; attacks on them can be read as a prelude to nuclear attack' },
  acton2019: {
    t: 'James M. Acton, "Why Is Nuclear Entanglement So Dangerous?" Carnegie Endowment for International Peace, 23 January 2019',
    url: 'https://carnegieendowment.org/posts/2019/01/why-is-nuclear-entanglement-so-dangerous',
    used: 'the early-warning satellite example; disentangling would mean buying more satellites' },
};
