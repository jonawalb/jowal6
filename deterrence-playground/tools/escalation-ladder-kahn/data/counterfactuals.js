// "Retry from the allied side": decision points, the player for each crisis, and the options that were actually
// considered or publicly debated at the time. Every option cites a source in sources.js that was opened on
// 2026-09-29 and says what `note` attributes to it. Nothing here is invented: where the sources opened for a crisis
// record no alternatives, the crisis is left out (see EXCLUDED).
//
// Fields
//   at        index of the crisis step the historical option leads to (steps before it are played before the
//             decision). at === steps.length means the decision comes after the last step in crises.js, so the
//             historical option carries its own `then` text and rung.
//   rung      the Kahn rung the crisis reaches after the option. For the historical option it is the rung of step
//             `at` (checked in code). For the others it is coding by the author of this tool (`why` explains it).
//   lean      'S' = the option is itself a negotiation or agreement, 'F' = it leaves the dispute in place with no
//             agreement, '' = neither. Used by the notional model (model.js), coded by the author of this tool.
//   historical: true marks what actually happened. Exactly one per decision.
export const CF = {
  cuba: {
    player: 'the United States (Kennedy and the ExComm)',
    playerWhy: 'The United States was a direct party. The Office of the Historian and Allison describe the options Kennedy\'s advisers put to him.',
    wMeans: 'U.S.-Soviet fighting over Cuba short of nuclear use.',
    decisions: [
      { at: 0, date: 'Oct. 16–22, 1962', title: 'Missile sites in Cuba: what do you do?',
        context: 'A U-2 has photographed Soviet medium- and intermediate-range missile sites under construction in Cuba. Kennedy has summoned his closest advisers to consider options.',
        options: [
          { label: 'Naval quarantine', rung: 4, lean: '', historical: true,
            note: 'Kennedy "decided upon a middle course" and on October 22 ordered a naval "quarantine" of Cuba (Office of the Historian).', src: ['oh1962'] },
          { label: 'Air strike on the missiles, then invasion', rung: 12, lean: '',
            note: '"Some advisers—including all the Joint Chiefs of Staff—argued for an air strike to destroy the missiles, followed by a U.S. invasion of Cuba" (Office of the Historian). Kennedy said afterward that had he decided in the first 48 hours, "he would have chosen the air strike rather than the naval blockade" (Allison).',
            why: 'Sustained U.S. strikes and a landing on Cuba: "Large conventional war (or actions)."', src: ['oh1962', 'fa2012'] },
          { label: 'Stern warnings only', rung: 3, lean: 'F',
            note: 'Other advisers "favored stern warnings to Cuba and the Soviet Union" (Office of the Historian).',
            why: 'Public statements with no military move: "Solemn and formal declarations." The missiles stay, so the model leans toward a standoff.', src: ['oh1962'] },
        ] },
      { at: 5, date: 'Oct. 27, 1962', title: 'Black Saturday: two letters and a downed U-2',
        context: 'Khrushchev\'s second message demands the removal of U.S. Jupiter missiles from Turkey. A U-2 has been shot down over Cuba. The missile sites are nearing operational readiness.',
        options: [
          { label: 'Answer the first letter: no-invasion pledge, private ultimatum, secret Jupiter promise', rung: 2, lean: 'S', historical: true,
            note: 'Allison: Kennedy rejected both options his advisers gave him and combined "a public deal in which the United States pledged not to invade Cuba," "a private ultimatum threatening to attack Cuba within 24 hours," and "a secret sweetener" on the Turkish missiles. Khrushchev agreed on October 28.', src: ['fa2012', 'oh1962'] },
          { label: 'Attack Cuba', rung: 12, lean: '',
            note: 'One of "the two options Kennedy\'s advisers gave him on the final Saturday: attack or accept Soviet nuclear missiles in Cuba" (Allison). The Office of the Historian: "Kennedy and his advisors prepared for an attack on Cuba within days." Allison notes 100 Soviet tactical nuclear weapons were in Cuba, unknown to Washington at the time.',
            why: 'Air strikes and invasion: "Large conventional war (or actions)."', src: ['fa2012', 'oh1962'] },
          { label: 'Accept the missiles in Cuba', rung: 2, lean: 'F',
            note: 'The other option advisers put to Kennedy that Saturday, in Allison\'s account.',
            why: 'A political climb-down: "Political, economic, and diplomatic gestures." The missiles stay, so the model leans toward a standoff.', src: ['fa2012'] },
        ] },
    ] },

  sino1969: {
    player: 'the United States, the third party Moscow probed',
    playerWhy: 'Neither side was a U.S. ally. The one move the sources show aimed at Washington is the KGB officer\'s question on August 18, so the player is the United States deciding how to answer it.',
    wMeans: 'A wider Sino-Soviet war, including a conventional Soviet strike on Chinese nuclear facilities.',
    decisions: [
      { at: 3, date: 'Late Aug.–Sept. 1969', title: 'Moscow asks how you would react to a strike on China',
        context: 'A KGB officer has asked a State Department official how the United States would react to a Soviet attack on Chinese nuclear weapons facilities. U.S. analysts judge there "is at least some chance" Moscow is preparing to act.',
        options: [
          { label: 'Publicly rule out collusion with Moscow', rung: 2, lean: 'S', historical: true,
            then: { date: 'Sept. 1969', title: 'Richardson\'s speech, then Kosygin meets Zhou', text: 'State Department consultants advised Washington to "avoid any whiff of collusion" with Moscow, a point Under Secretary Elliot Richardson made in a speech to the American Political Science Association. Kosygin and Zhou Enlai then met at Beijing airport, which the National Security Archive reads as a sign both sides wanted to avoid a crisis; by early October Sino-Soviet talks were about to begin.' },
            note: 'The consultants\' recommendation and Richardson\'s speech (National Security Archive, EBB 49).', src: ['nsa49'] },
          { label: 'Stay quiet: a limited war is "by no means a disaster"', rung: 4, lean: '',
            note: 'NSC staffer William Hyland, critiquing the NSSM 63 study, wrote that a limited Sino-Soviet war was "by no means a disaster for the US" and that Soviet strikes might be a "solution" to the China nuclear problem (EBB 49).',
            why: 'The probe goes unanswered and the crisis stays where the probe put it: "Hardening of positions—confrontation of wills."', src: ['nsa49'] },
          { label: 'Deplore a Soviet pre-emptive strike through official channels', rung: 3, lean: '',
            note: 'On September 29 Kissinger asked Nixon to approve State Department guidance "deploring reports of a Soviet plan to make a pre-emptive military strike against Communist China." Nixon initialed it; whether it went out is unclear (EBB 49).',
            why: 'A formal statement of position: "Solemn and formal declarations."', src: ['nsa49'] },
        ] },
    ] },

  lance: {
    player: 'the United States (Nixon and Kissinger)',
    playerWhy: 'Here the United States started the crisis. The decision is how to signal to Moscow and Hanoi in October 1969.',
    wMeans: 'A U.S.-Soviet military confrontation or a major widening of the Vietnam War.',
    decisions: [
      { at: 0, date: 'Early Oct. 1969', title: 'Your ultimatum to Hanoi is not working',
        context: 'Since July you and your intermediaries have warned that unless North Vietnam compromises by November 1, you will "take measures of great consequence and force." The NSC has planned an air and mining campaign, codenamed Duck Hook. Hanoi has not moved.',
        options: [
          { label: 'Secret nuclear readiness test', rung: 5, lean: '', historical: true,
            note: 'Having cancelled Duck Hook, Nixon believed "it was important that the Communists not mistake as weakness the lack of dramatic action," and set the JCS Readiness Test in motion (EBB 195). Bombers flew nuclear-armed "Giant Lance" orbits (EBB 81).', src: ['nsa195', 'nsa81'] },
          { label: 'Launch Duck Hook', rung: 12, lean: '',
            note: 'Planners wanted Duck Hook "brutal and sustainable": heavy air attacks in the far north, including mining of ports. Nixon and Kissinger thought nuclear weapons\' "possible use should be given serious consideration" in its planning. Nixon "pulled the plug" between October 2 and 6 (EBB 195).',
            why: 'A major new air and naval campaign: "Large conventional war (or actions)."', src: ['nsa195'] },
          { label: 'No dramatic action; rely on Vietnamization', rung: 2, lean: 'F',
            note: 'Defense Secretary Laird and Secretary of State Rogers "opposed military escalation," and signs of progress in Vietnamization "offered Nixon an alternative to Duck Hook" (EBB 195).',
            why: 'Only diplomatic signals: "Political, economic, and diplomatic gestures." The war and the talks go on, so the model leans toward a standoff.', src: ['nsa195'] },
        ] },
    ] },

  defcon73: {
    player: 'the United States (Kissinger and the principals who met that night; Nixon is not recorded as present)',
    playerWhy: 'The United States was a direct party. The record of the night meeting of October 24–25 shows the options raised.',
    wMeans: 'U.S. or Soviet forces fighting in the Middle East, or the Arab-Israeli war resuming at full scale.',
    decisions: [
      { at: 2, date: 'Oct. 24, 1973, about 10:30 p.m.', title: 'Brezhnev proposes joint forces, or else',
        context: 'Brezhnev proposes that U.S. and Soviet contingents go to Egypt together to enforce the ceasefire, and warns that otherwise Moscow will consider "taking appropriate steps unilaterally." Soviet airborne divisions are on alert.',
        options: [
          { label: 'Tough reply, DEFCON III, carriers and the 82nd Airborne', rung: 6, lean: '', historical: true,
            note: 'The group agreed "the reply should be a tough one," then set DEFCON III, moved carriers, alerted the 82nd Airborne and recalled 75 B-52s from Guam (FRUS 1969–76, XXV, doc. 269). The reply called joint contingents "not appropriate" (EBB 98).', src: ['frus269', 'nsa98'] },
          { label: 'Accept a joint U.S.-Soviet force', rung: 2, lean: 'S',
            note: 'Brezhnev\'s "concrete proposal": "Let us together … urgently dispatch to Egypt the Soviet and American military contingents" (EBB 98). The U.S. reply rejected it.',
            why: 'Agreement to a joint step: "Political, economic, and diplomatic gestures." The model sees only the rung; it cannot price what worried the principals most, Soviet troops in Egypt that "if they get in, they\'ll never get out."', src: ['nsa98', 'frus269'] },
          { label: 'Let Israel hit the Egyptian Third Army', rung: 12, lean: '',
            note: 'Kissinger, "thinking out loud," said "we should consider telling the Israelis to hit the Third Egyptian Army." Admiral Moorer replied this "might be counter-productive because, then, the Soviets would have all the excuse they needed" (FRUS doc. 269).',
            why: 'Renewed large-scale fighting: "Large conventional war (or actions)."', src: ['frus269'] },
        ] },
    ] },

  able83: {
    player: 'NATO and the United States (the officers running Able Archer 83)',
    playerWhy: 'NATO ran the exercise. The one decision the sources document is how the exercise\'s officers answered the Soviet alert.',
    wMeans: 'NATO-Warsaw Pact fighting short of nuclear use.',
    decisions: [
      { at: 3, date: 'Nov. 1983', title: 'Soviet forces are moving to an unusual alert',
        context: 'During the exercise, Soviet air units in East Germany and Poland go to heightened readiness and nuclear weapons move from storage to delivery units. Your intelligence officers see parts of it.',
        options: [
          { label: 'Do nothing; do not raise Western alert', rung: 6, lean: '', historical: true,
            note: 'The officers "minimized this risk by doing nothing." Lt. Gen. Leonard Perroots made "the decision not to elevate the alert of Western military assets in response," which the PFIAB called "fortuitous, if ill-informed" (EBB 533).', src: ['nsa533'] },
          { label: 'Raise Western alert in response', rung: 9, lean: '',
            note: 'The course the PFIAB report says Perroots declined: elevating "the alert of Western military assets in response" to the Soviet moves (EBB 533).',
            why: 'Both blocs on alert against each other: "Dramatic military confrontations," a direct test of nerves.', src: ['nsa533'] },
        ] },
    ] },

  kargil: {
    player: 'India',
    playerWhy: 'No U.S. ally was a party. India is the U.S. partner and the democracy defending its side of the Line of Control. The United States acted as crisis manager (Riedel), but the sources opened here record no alternatives Washington weighed, while RAND documents India\'s choice about crossing the LOC.',
    wMeans: 'Indian forces crossing the LOC or the international border in strength: a wider India-Pakistan war.',
    decisions: [
      { at: 1, date: 'May–July 1999', title: 'Evicting the intruders: cross the LOC or not?',
        context: 'Pakistani forces hold heights on the Indian side of the Line of Control. India has committed ground forces and, for the first time since 1971, air power.',
        options: [
          { label: 'Fight on your side of the LOC only', rung: 8, lean: '', historical: true,
            note: 'RAND writes that Pakistan "seems to understand that India has received high dividends" from its restraint and its "decision not to cross the LOC during the Kargil conflict" (Tellis, Fair and Medby).', src: ['rand1450'] },
          { label: 'Escalate horizontally across the LOC or border', rung: 12, lean: '',
            note: 'RAND describes "extensive Indian preparations for horizontal escalation," begun "as a mitigatory strategy in case the eviction efforts along the occupied heights were not as successful as they eventually turned out to be."',
            why: 'Opening new fronts: "Large conventional war (or actions)."', src: ['rand1450'] },
        ] },
    ] },

  korea2017: {
    player: 'the United States and South Korea',
    playerWhy: 'Both are parties. CRS set out the options publicly debated at the time; the Arms Control Association chronology records what the allies did.',
    wMeans: 'Fighting on the Korean Peninsula short of nuclear use.',
    decisions: [
      { at: 5, date: 'Sept. 2017', title: 'After the sixth nuclear test',
        context: 'North Korea has tested two ICBMs and what it calls a hydrogen bomb. Trump says "all options are on the table."',
        options: [
          { label: 'Maximum pressure: sanctions and bomber flights', rung: 4, lean: '', historical: true,
            note: 'The UN Security Council passed Resolution 2375 on September 11; on September 23 B-1B bombers flew "the farthest north they have flown in the 21st century" (ACA). CRS calls this the "maximum pressure" approach.', src: ['acadprk', 'crs44994'] },
          { label: 'Enhanced containment, including tactical nuclear weapons in the South', rung: 6, lean: '',
            note: 'CRS option "enhanced containment and deterrence": more forward forces, and "Redeploying U.S. tactical nuclear weapons onto the Korean Peninsula, as has been called for by the Liberty Korea Party."',
            why: 'A large build-up of forces: "Significant mobilization."', src: ['crs44994'] },
          { label: 'Limited strike on ICBM sites', rung: 12, lean: '',
            note: 'CRS options "eliminating ICBM facilities and launch pads" and "eliminating DPRK nuclear facilities"; "Administration officials are openly discussing the possibility of a preventive military strike."',
            why: 'Strikes on North Korean territory: "Large conventional war (or actions)."', src: ['crs44994'] },
          { label: 'Negotiate a freeze', rung: 2, lean: 'F',
            note: 'CRS lists "Negotiating a freeze of North Korea\'s nuclear and/or missile programs" among the alternative strategies under debate.',
            why: 'Diplomacy that caps the programs without ending them: "Political, economic, and diplomatic gestures," leaning toward a standoff.', src: ['crs44994'] },
        ] },
      { at: 7, date: 'Dec. 2017–Jan. 2018', title: 'After the Hwasong-15 launch',
        context: 'North Korea has flown an ICBM for 53 minutes. Kim Jong Un offers to send a delegation to the Winter Olympics in South Korea.',
        options: [
          { label: 'Postpone joint exercises and let inter-Korean talks start', rung: 2, lean: 'S', historical: true,
            then: { date: 'Jan. 2018', title: 'Olympic pause and talks', text: 'Trump and Moon agreed on January 4 to postpone the Foal Eagle exercises until after the Olympics; North and South Korea met at Panmunjom on January 9. The Security Council had tightened sanctions again on December 22 (Resolution 2397).' },
            note: 'Arms Control Association chronology, Dec. 22, 2017 to Jan. 9, 2018.', src: ['acadprk'] },
          { label: 'Accept "freeze-for-freeze"', rung: 2, lean: 'F',
            note: 'The Russian-Chinese proposal to trade a halt in tests for a halt in exercises; Tillerson "reiterates the U.S. rejection" of it on January 16, 2018 (ACA). CRS lists a negotiated freeze among the strategies under debate.',
            why: 'A mutual pause without a settlement: "Political, economic, and diplomatic gestures," leaning toward a standoff.', src: ['acadprk', 'crs44994'] },
          { label: 'Strike nuclear facilities', rung: 12, lean: '',
            note: 'CRS option "eliminating DPRK nuclear facilities," a "more expansive military effort" than striking ICBM sites.',
            why: 'Strikes on North Korean territory: "Large conventional war (or actions)."', src: ['crs44994'] },
        ] },
    ] },

  balakot: {
    player: 'India',
    playerWhy: 'No U.S. ally was a party. India is the U.S. partner and the democracy attacked. Mukherjee sets out India\'s menu of responses; the sources opened here record no U.S. decisions with alternatives.',
    wMeans: 'Ground fighting across the LOC or the international border: a wider India-Pakistan war.',
    decisions: [
      { at: 1, date: 'Feb. 15–25, 2019', title: 'After Pulwama: how does India respond?',
        context: 'A Jaish-e-Mohammad suicide attack has killed 40 CRPF personnel in Kashmir, according to India\'s Foreign Secretary. In 2008 India did not respond militarily to the Mumbai attack; in 2016 it raided launchpads in Pakistani Kashmir.',
        options: [
          { label: 'Air strike on a camp inside Pakistan', rung: 9, lean: '', historical: true,
            note: 'The Balakot strike, "the first to take place on Pakistani soil since the India-Pakistan War of 1971." Mukherjee notes analysts had long "listed precision strikes on terrorist camps as one of the few viable military options."', src: ['mukherjee', 'mea2019'] },
          { label: 'Isolate Pakistan diplomatically and economically', rung: 2, lean: 'F',
            note: 'Mukherjee: "Aside from military options, much of the policy analysis" emphasized "diplomatically isolating Pakistan or economically squeezing it through the international Financial Action Task Force."',
            why: '"Political, economic, and diplomatic gestures." Mukherjee doubts it changes Pakistan\'s incentives, so the model leans toward a standoff.', src: ['mukherjee'] },
          { label: 'Cross-LOC raid on launchpads, as in 2016', rung: 8, lean: '',
            note: 'In 2016, after Uri, "Indian special forces carried out a surgical strike on terrorist launchpads in Pakistani Kashmir" (Mukherjee).',
            why: 'Mukherjee says neither side went beyond "harassing acts of violence" before Balakot, so this tool keeps a 2016-type raid on rung 8.', src: ['mukherjee'] },
          { label: 'Cold Start: seize a strip of Pakistani territory', rung: 12, lean: '',
            note: 'India\'s limited-war doctrine "envisioned rapid mobilization to capture and hold small amounts of Pakistani territory in retaliation for a major terrorist attack" (Mukherjee).',
            why: 'Ground offensive into Pakistan: "Large conventional war (or actions)."', src: ['mukherjee'] },
        ] },
    ] },

  russia2022: {
    player: 'the United States and NATO',
    playerWhy: 'Russia\'s nuclear signals in this tool are aimed at NATO. The player is the alliance deciding how far to go in supporting Ukraine.',
    wMeans: 'Direct fighting between NATO and Russian forces.',
    decisions: [
      { at: 1, date: 'Late Feb.–Mar. 2022', title: 'Calls for a no-fly zone',
        context: 'Russia has invaded Ukraine and Putin has ordered deterrence forces on "special" alert. Ukraine and some allied parliaments call for a no-fly zone.',
        options: [
          { label: 'Arm Ukraine and sanction Russia; no NATO forces in Ukraine', rung: 5, lean: '', historical: true,
            note: 'Stoltenberg, March 4, 2022: "we are not going to move into Ukraine, neither on the ground, or in Ukrainian airspace," while imposing "heavy sanctions" and "stepping up support" (NATO).', src: ['nato0304'] },
          { label: 'Impose a no-fly zone', rung: 12, lean: '',
            note: 'Lithuania\'s parliament unanimously urged "immediate action to secure a no-fly zone over Ukraine" (LRT, March 17, 2022). Stoltenberg explained why NATO refused: "the only way to implement a no-fly zone is to send NATO planes … and then impose that no-fly zone by shooting down Russian planes."',
            why: 'NATO aircraft shooting down Russian aircraft: "Large conventional war (or actions)."', src: ['lrt0317', 'nato0304'] },
        ] },
      { at: 5, date: 'Nov. 2024', title: 'Long-range missiles into Russia?',
        context: 'Ukraine has U.S. ATACMS missiles but not permission to fire them deep into Russia. Putin has previewed a doctrine that would treat such an attack as a joint attack by its nuclear backer.',
        options: [
          { label: 'Ease the restrictions on ATACMS', rung: 5, lean: '', historical: true,
            note: 'Washington "eased restrictions on the ATACMS," and Ukraine fired them into Russia for the first time on November 19, 2024 (AP). Two days later Russia fired Oreshnik at Dnipro.', src: ['ap1119', 'kr75614'] },
          { label: 'Keep the restrictions', rung: 3, lean: 'F',
            note: 'The policy in force until mid-November 2024, which AP describes Washington easing.',
            why: 'The crisis stays at the doctrine step: "Solemn and formal declarations." The war continues, so the model leans toward a standoff.', src: ['ap1119'] },
        ] },
    ] },
};

// Crises the mode leaves out, and why. Shown on the page.
export const EXCLUDED = {
  sindoor: 'Left out. This tool uses only Indian government releases for the May 2025 crisis, and they record no options India considered and rejected. Rather than invent alternatives, the mode is off for this crisis.',
};

// Kennedy's own estimate, shown as a reference band on the Cuba run. It is his estimate, not this model's.
export const KENNEDY = { lo: 1 / 3, hi: 0.5, src: 'fa2012',
  text: 'Kennedy thought the chance of escalation to war was "between 1 in 3 and even" (Allison, Foreign Affairs, 2012).' };
