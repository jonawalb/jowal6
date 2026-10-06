// Sources for The Hunt. Each entry was opened and checked on 29 September 2026 unless marked
// "cited, not opened"; content and page numbers re-checked on 30 September 2026 (see FACTCHECK.md).
// history.navy.mil and csp.navy.mil block plain bots; they load in a browser or via the Wayback Machine. Page numbers refer to the printed page of the document.

export const SOURCES = [
  { id: 'koopman', text: 'B. O. Koopman, Search and Screening, OEG Report No. 56 (Washington: Operations Evaluation Group, Office of the Chief of Naval Operations, 1946). Lateral range curve and effective search (sweep) width W, p. 24, eqs. (25) and (27); formula of random search p = 1 − e^(−WL/A), p. 28, eq. (40); distribution of searching effort, ch. 3, from p. 35. Library of Congress scan.',
    url: 'https://archive.org/details/searchscreening56koop' },
  { id: 'washburn', text: 'A. R. Washburn, Expanding Area Search Experiments, NPS55-80-017 (Monterey: Naval Postgraduate School, May 1980). The "flaming datum" problem and the farthest-on circle, pp. 1–2.',
    url: 'https://archive.org/details/expandingareasea00wash' },
  { id: 'stone', text: 'L. D. Stone, C. M. Keller, T. M. Kratzke and J. P. Strumpfer, "Search for the Wreckage of Air France Flight AF 447," Statistical Science 29, no. 1 (2014): 69–80. Bayesian search and its use in the Scorpion search (sec. 2); particle representation and the posterior after unsuccessful search (secs. 3–4); wreckage found on 3 April 2011 after about one week of undersea search (sec. 1). Open version on arXiv.',
    url: 'https://arxiv.org/abs/1405.4720' },
  { id: 'richardson', text: 'H. R. Richardson and L. D. Stone, "Operations Analysis during the Underwater Search for Scorpion," Naval Research Logistics Quarterly 18, no. 2 (1971): 141–157. Cited by Stone et al. (2014); bibliographic record checked in Crossref, full text not opened.',
    url: 'https://doi.org/10.1002/nav.3800180202' },
  { id: 'nhhc-scorpion', text: 'Naval History and Heritage Command, "Scorpion VI (SSN-589)," Dictionary of American Naval Fighting Ships. Reported overdue at Norfolk in late May 1968; declared presumed lost on 5 June; hull located by USNS Mizar at the end of October 1968, about 400 miles southwest of the Azores.',
    url: 'https://www.history.navy.mil/research/histories/ship-histories/danfs/s/scorpion-ssn-589-vi.html' },
  { id: 'cus', text: 'Commander, Undersea Surveillance (U.S. Navy), "Origins of SOSUS." Project Jezebel and the LOFAR analyzer (Bell Laboratories offer, October 1950; first model delivered May 1951); the Caesar contract with Bell Laboratories; CNO raised the planned stations from six to nine in September 1952; target dates of one station a month from the fall of 1954, with Ramey first on the air in November 1954.',
    url: 'https://www.csp.navy.mil/cus/About-IUSS/Origins-of-SOSUS/' },
  { id: 'nhhc-ofp', text: 'Naval History and Heritage Command, U.S. Navy Seabee Museum, "History of the Naval Ocean Facilities Program." Early-1950s concern over Soviet submarines and the start of Project Caesar; the Sound Surveillance System (SOSUS), later the Integrated Undersea Surveillance System (IUSS), a highly classified system, especially where the cables came ashore, with sites across the Atlantic and Pacific.',
    url: 'https://www.history.navy.mil/content/history/museums/seabee/explore/ocean-facilities-program/HistoryofOFP.html' },
  { id: 'crs', text: 'R. O\'Rourke (coordinator), Changes in the Arctic: Background and Issues for Congress, CRS Report R41153 (Congressional Research Service, updated 23 September 2019), p. 48, quoting the Navy\'s January 2019 Strategic Outlook for the Arctic: the Greenland, Iceland, United Kingdom-Norwegian (GIUK-N) Gap "is a strategic corridor for naval operations in the high north."',
    url: 'https://www.congress.gov/crs_external_products/R/PDF/R41153/R41153.150.pdf' },
  { id: 'stevens', text: 'Ted Stevens Center for Arctic Security Studies (U.S. Department of Defense), "The GIUK Gap." German and later Russian forces used the gap to reach the Atlantic; it remains a route for Russia\'s Northern Fleet from the Kola Peninsula; Keflavík as the base for watching the gap.',
    url: 'https://tedstevensarcticcenter.org/the-giuk-gap/' },
  { id: 'ne', text: 'Natural Earth, 1:10m physical land (public domain). Coastlines for the map and the land mask.',
    url: 'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/' },
];

// Short history card: every line rests on a source above.
export const HISTORY = [
  { when: '1946', text: 'Koopman\'s Search and Screening, distilled from the Navy Operations Research Group\'s wartime work, sets out the lateral range curve, sweep width and the random search formula this game uses.', src: 'koopman' },
  { when: '1950–54', text: 'Project Jezebel shows that low-frequency sound from submarines can be heard at long range. Bell Labs builds the Caesar system, later known as SOSUS, and its shore stations begin coming into service in November 1954.', src: 'cus' },
  { when: 'Cold War', text: 'SOSUS, later IUSS, stays highly classified, with sites across the Atlantic and Pacific. The gap between Greenland, Iceland and the UK is a gateway from the Kola Peninsula bases into the Atlantic.', src: 'nhhc-ofp', src2: 'stevens' },
  { when: '1968', text: 'USS Scorpion is lost in the Atlantic. Analysts build a Bayesian map of where she could be, and in late October the search ship Mizar finds the hull about 400 miles southwest of the Azores.', src: 'nhhc-scorpion', src2: 'stone' },
  { when: '2011', text: 'The same Bayesian method, updated for two years of failed searches, points to the Air France 447 wreck, found after about a week of undersea search.', src: 'stone' },
  { when: 'Today', text: 'A CRS report quotes the Navy calling the Greenland, Iceland, UK-Norway gap a strategic corridor for naval operations in the high north.', src: 'crs' },
];
