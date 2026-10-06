// Real-world examples of nuclear-conventional entanglement. Each claim below was checked against the linked source(s)
// in September 2026. Quotes are verbatim. Where a live official page blocks automated access, an Internet Archive copy is
// given as well. cats: the model categories each example illustrates (ew, nc3, dcd, colo, isr).
// Sources: U.S. DoD, Military and Security Developments Involving the PRC 2024 (via Internet Archive); CSIS Missile
// Threat; U.S. Space Force fact sheets (via Internet Archive); Acton (IS 2018; Carnegie 2019, 2020); RFE/RL; Reuters
// (via Internet Archive); Washington Post (via Internet Archive, headline and subhead only); Congressional Research
// Service R45861 (via Internet Archive); BBC; NATO; Breaking Defense; Logan (JSS 2020, abstract).

const CMPR24 = { t: 'U.S. Department of Defense, Military and Security Developments Involving the People’s Republic of China 2024, 18 Dec 2024 (archived copy)',
  u: 'https://web.archive.org/web/20260924081034/https://media.defense.gov/2024/dec/18/2003615520/-1/-1/0/military-and-security-developments-involving-the-peoples-republic-of-china-2024.pdf' };

export const EXAMPLES = [
  { id: 'df26', who: 'China', year: '2016–', cats: ['dcd'], kind: 'Dual-capable missile',
    title: 'The DF-26 swaps warheads',
    text: 'The Pentagon’s 2024 China report says “the multi-role DF-26 is designed to rapidly swap conventional and nuclear warheads” and can strike land and naval targets in the Western Pacific and Indian Ocean. CSIS dates its fielding to 2016.',
    reading: 'A launcher hunted as a conventional anti-ship threat may hold a nuclear warhead, and an incoming DF-26 cannot be characterized from its type alone.',
    sources: [CMPR24, { t: 'CSIS Missile Defense Project, “DF-26,” Missile Threat (updated 23 April 2024)', u: 'https://missilethreat.csis.org/missile/dong-feng-26-df-26/' }] },
  { id: 'plarf', who: 'China', year: '2024', cats: ['colo', 'nc3'], kind: 'Shared force, commingling',
    title: 'One rocket force, two missions',
    text: 'The PLA Rocket Force “organizes, mans, trains, and equips” both nuclear and conventional land-based missile forces, with separate chains of command for each. The same DoD report warns that “commingling” means a launch “may not be clear … until it detonates,” and that attacks on conventional missile command centers “could inadvertently degrade the PRC’s nuclear C2 and generate nuclear use-or-lose” pressure.',
    reading: 'The DoD report itself names the mechanism this tool models. Acton (2020) notes China appears to run distinct nuclear and conventional brigades whose deployment areas may overlap; Logan (2020) finds China’s missiles less entangled than often feared, but trending toward more.',
    sources: [CMPR24,
      { t: 'James M. Acton, “Is It a Nuke?” Carnegie Endowment, 2020', u: 'https://carnegieendowment.org/research/2020/04/is-it-a-nuke-pre-launch-ambiguity-and-inadvertent-escalation' },
      { t: 'David C. Logan, “Are They Reading Schelling in Beijing?” Journal of Strategic Studies (2020)', u: 'https://doi.org/10.1080/01402390.2020.1844671' }] },
  { id: 'sbirs', who: 'United States', year: 'current', cats: ['ew'], kind: 'Dual-use early warning',
    title: 'Early-warning satellites that also cue defenses',
    text: 'The U.S. Space Force describes SBIRS as supporting “the missile early warning, missile defense, battlespace awareness and technical intelligence mission areas.” Acton notes that until the mid-1980s U.S. early-warning satellites were used only to detect nuclear missile launches.',
    reading: 'Acton’s example of misinterpreted warning: an adversary attacks these satellites to blunt missile defenses against its conventional missiles, and Washington reads it as the prelude to a nuclear strike.',
    sources: [{ t: 'U.S. Space Force, “Space Based Infrared System” fact sheet (current as of March 2023)', u: 'https://www.spaceforce.mil/About-Us/Fact-Sheets/Article/2197746/space-based-infrared-system/' },
      { t: 'Archived copy of the fact sheet', u: 'https://web.archive.org/web/20260116141819/https://www.spaceforce.mil/About-Us/Fact-Sheets/Article/2197746/space-based-infrared-system/' },
      { t: 'James M. Acton, “Why Is Nuclear Entanglement So Dangerous?” Carnegie Endowment, 23 Jan 2019', u: 'https://carnegieendowment.org/posts/2019/01/why-is-nuclear-entanglement-so-dangerous' },
      { t: 'James M. Acton, “Escalation through Entanglement,” International Security 43:1 (2018), p. 64 (early-warning satellites before the mid-1980s)', u: 'https://doi.org/10.1162/isec_a_00320' }] },
  { id: 'aehf', who: 'United States', year: 'current', cats: ['nc3'], kind: 'Dual-use communications',
    title: 'Protected satellites for nuclear and conventional orders',
    text: 'The Space Force says AEHF lets the Pentagon “control tactical and strategic forces through all levels of conflict,” from land warfare to “strategic nuclear operations.” Acton writes that Milstar and AEHF are the most secure space-based way to reach both nuclear and high-priority conventional users.',
    reading: 'Jamming such satellites is hard, so in a war they could be attacked directly for their conventional role, and the attack would also cut nuclear communications.',
    sources: [{ t: 'U.S. Space Force, “Advanced Extremely High Frequency System” fact sheet (current as of July 2020)', u: 'https://www.spaceforce.mil/About-Us/Fact-Sheets/Article/2197713/advanced-extremely-high-frequency-system/' },
      { t: 'Archived copy of the fact sheet', u: 'https://web.archive.org/web/20260625192040/https://www.spaceforce.mil/About-Us/Fact-Sheets/Article/2197713/advanced-extremely-high-frequency-system/' },
      { t: 'James M. Acton, “Escalation through Entanglement,” International Security 43:1 (2018), pp. 63–64', u: 'https://doi.org/10.1162/isec_a_00320' }] },
  { id: 'voronezh', who: 'Russia / Ukraine', year: '2024', cats: ['ew'], kind: 'Early warning struck in a conventional war',
    title: 'Drone strikes on Russian early-warning radars',
    text: 'In late May 2024 Ukrainian drones struck the Armavir station, which RFE/RL reported has two Voronezh-DM radars; citing The War Zone, it described the station as part of Russia’s nuclear ballistic-missile early-warning system. A Kyiv source told Reuters a second strike targeted a Voronezh-M radar near Orsk, about 1,500 km from Ukrainian-held territory. The Washington Post reported that Washington told Kyiv such attacks “could be destabilizing.”',
    reading: 'The clearest real case of a conventional belligerent striking dual-use nuclear warning assets. Sources differ on the Armavir date (22 or 23 May).',
    sources: [{ t: 'RFE/RL, “Satellite Photos Show Ukrainian Drone Strike Damaged Russian Radar Station,” 25 May 2024', u: 'https://www.rferl.org/a/russia-ukraine-war-radar-drones-satellite/32963318.html' },
      { t: 'Reuters, Kyiv source on strike at Voronezh-M radar near Orsk, 27 May 2024 (archived copy)', u: 'https://web.archive.org/web/20250326013622/https://www.reuters.com/world/europe/ukraine-drone-targets-russian-early-warning-radar-record-distance-kyiv-source-2024-05-27/' },
      { t: 'Washington Post, “U.S. concerned about Ukraine strikes on Russian nuclear radar stations,” 29 May 2024 (archived copy)', u: 'https://web.archive.org/web/20250824152533/https://www.washingtonpost.com/national-security/2024/05/29/us-ukraine-nuclear-warning-strikes/' }] },
  { id: 'iskander', who: 'Russia', year: '2016–', cats: ['dcd', 'colo'], kind: 'Dual-capable missiles',
    title: 'Iskander and Kalibr',
    text: 'The Congressional Research Service writes that Russia’s Kalibr and Iskander missiles “are dual-capable and can carry either nuclear or conventional warheads.” In 2016 Russia deployed Iskanders to Kaliningrad.',
    reading: 'Acton (2020) cites NATO’s difficulty in judging which warheads Russian forces in Kaliningrad hold, and notes Russia appears to group few of its ambiguous systems by function.',
    sources: [{ t: 'Congressional Research Service, R45861, Russia’s Nuclear Weapons: Doctrine, Forces, and Modernization (updated 21 April 2022), p. 21 (archived copy)', u: 'https://web.archive.org/web/20231021075106/https://crsreports.congress.gov/product/pdf/R/R45861' },
      { t: 'BBC, “Russia deploys nuclear-capable missiles in Kaliningrad,” Oct 2016', u: 'https://www.bbc.com/news/world-europe-37597075' }] },
  { id: 'dca', who: 'NATO / United States', year: '2023–', cats: ['dcd', 'colo'], kind: 'Dual-capable aircraft',
    title: 'Dual-capable aircraft in NATO',
    text: 'NATO says several allies contribute dual-capable aircraft that “are central to NATO’s nuclear deterrence posture.” The F-35 program office told Breaking Defense the F-35A was certified to carry the B61-12 bomb in October 2023, making it “dual-capable.”',
    reading: 'Acton (2020) notes that every Chinese, Russian and U.S. aircraft with a nuclear mission is dual-use, and that U.S. dual-use aircraft are not grouped by function.',
    sources: [{ t: 'NATO, “NATO’s nuclear deterrence policy and forces”', u: 'https://www.nato.int/cps/en/natohq/topics_50068.htm' },
      { t: 'Breaking Defense, “F-35A officially certified to carry nuclear bomb,” 8 March 2024', u: 'https://breakingdefense.com/2024/03/exclusive-f-35a-officially-certified-to-carry-nuclear-bomb/' }] },
  { id: 'npr', who: 'United States', year: '2018', cats: ['ew', 'nc3'], kind: 'Declaratory policy',
    title: 'A nuclear threat against attacks on warning systems',
    text: 'Acton opens his 2018 article with the Nuclear Posture Review’s warning that the United States would consider nuclear use after “significant nonnuclear strategic attacks … on U.S. or allied nuclear forces, their command and control, or warning and attack assessment capabilities.”',
    reading: 'Declaratory policy can cut both ways: it is meant to deter attacks on entangled assets, and it raises the stakes if such attacks happen anyway.',
    sources: [{ t: 'James M. Acton, “Escalation through Entanglement,” International Security 43:1 (2018), p. 56, quoting the 2018 Nuclear Posture Review', u: 'https://doi.org/10.1162/isec_a_00320' }] },
];
