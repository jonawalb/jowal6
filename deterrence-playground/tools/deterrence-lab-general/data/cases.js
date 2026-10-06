// Historical illustrations for Deterrence Lab, one set per module.
// Every factual sentence rests on a source listed in SRC and opened on 2026-09-29:
//   U.S. Office of the Historian milestone pages (Cuban Missile Crisis; Berlin Airlift),
//   Obama White House archive (20 Aug 2012 remarks; 31 Aug 2013 statement),
//   State Department archive (14 Sep 2013 framework), JFK Library (25 Jul 1961 address, via Wayback),
//   Encyclopaedia Britannica "Fashoda Incident" (via Wayback), NATO topic page on the eastern flank,
//   TIME, "Hungary: Salami Tactics" (14 Apr 1952),
//   UN press release GA/11493, the EU fact-finding mission report on Georgia (2009),
//   Trachtenberg (2012, author's PDF), Altman (2015, MIT DSpace full text), and the abstracts or metadata of
//   Snyder and Borghard (2011), Blankenship and Lin-Greenberg (2022), Toal and Merabishvili (2019), Altman (2017).
// Fact-checked 2026-09-30: see FACTCHECK.md.
// Each `readings[].set` is a NOTIONAL parameter setting. It places the case in the region of the
// model that the cited reading implies. It is not an estimate of any government's costs or beliefs.

export const SRC = {
  ohCuba: { t: 'Office of the Historian, "The Cuban Missile Crisis, October 1962"', u: 'https://history.state.gov/milestones/1961-1968/cuban-missile-crisis' },
  ohBerlin: { t: 'Office of the Historian, "The Berlin Airlift, 1948–1949"', u: 'https://history.state.gov/milestones/1945-1952/berlin-airlift' },
  wh2012: { t: 'White House, "Remarks by the President to the White House Press Corps," 20 Aug 2012', u: 'https://obamawhitehouse.archives.gov/the-press-office/2012/08/20/remarks-president-white-house-press-corps' },
  wh2013: { t: 'White House, "Statement by the President on Syria," 31 Aug 2013', u: 'https://obamawhitehouse.archives.gov/the-press-office/2013/08/31/statement-president-syria' },
  fw2013: { t: 'U.S. Department of State, "Framework for Elimination of Syrian Chemical Weapons," 14 Sep 2013', u: 'https://2009-2017.state.gov/r/pa/prs/ps/2013/09/214247.htm' },
  jfk1961: { t: 'John F. Kennedy, "Radio and Television Report to the American People on the Berlin Crisis," 25 Jul 1961 (JFK Library, archived)', u: 'https://web.archive.org/web/2024/https://www.jfklibrary.org/archives/other-resources/john-f-kennedy-speeches/berlin-crisis-19610725' },
  fashoda: { t: 'Encyclopaedia Britannica, "Fashoda Incident" (archived)', u: 'https://web.archive.org/web/2024/https://www.britannica.com/event/Fashoda-Incident' },
  nato: { t: 'NATO, "Strengthening NATO’s eastern flank"', u: 'https://www.nato.int/en/what-we-do/deterrence-and-defence/strengthening-natos-eastern-flank' },
  ga68262: { t: 'UN General Assembly, press release GA/11493, 27 Mar 2014 (resolution 68/262)', u: 'https://press.un.org/en/2014/ga11493.doc.htm' },
  iiffmcg: { t: 'Independent International Fact-Finding Mission on the Conflict in Georgia, Report, vol. I (2009)', u: 'https://www.mpil.de/files/pdf4/IIFFMCG_Volume_I2.pdf' },
  trach: { t: 'Trachtenberg (2012), Security Studies 21(1)', u: 'https://www.sscnet.ucla.edu/polisci/faculty/trachtenberg/cv/audcosts.pdf' },
  snyder: { t: 'Snyder and Borghard (2011), APSR 105(3)', u: 'https://doi.org/10.1017/S000305541100027X' },
  altmanDiss: { t: 'Altman (2015), MIT PhD dissertation', u: 'https://dspace.mit.edu/handle/1721.1/99775' },
  altman17: { t: 'Altman (2017), International Studies Quarterly 61(4)', u: 'https://doi.org/10.1093/isq/sqx049' },
  blank: { t: 'Blankenship and Lin-Greenberg (2022), Security Studies 31(1)', u: 'https://doi.org/10.1080/09636412.2022.2038662' },
  toal: { t: 'Toal and Merabishvili (2019), Caucasus Survey 7(2)', u: 'https://doi.org/10.1080/23761199.2019.1565192' },
  time1952: { t: 'TIME, "Hungary: Salami Tactics," 14 Apr 1952', u: 'https://content.time.com/time/subscriber/article/0,33009,857130,00.html' },
};

export const CASES = {
  A: [
    {
      id: 'cuba', title: 'Cuban Missile Crisis', when: '1962', where: 'Caribbean',
      what: 'On September 4, 1962, after U.S. surveillance flights found a Soviet arms build-up in Cuba, President Kennedy issued a public warning against the introduction of offensive weapons. On October 14 a U-2 photographed missile sites under construction. On October 22 Kennedy ordered a naval “quarantine” and wrote to Khrushchev that the United States would not permit offensive weapons to be delivered to Cuba.',
      readings: [{ label: 'Hands tied by the September warning', set: { a: 0.8 },
        text: 'S is the United States and R the Soviet Union. A public warning made before the crisis raises a, the price of backing down. Once a ≥ c<sub>H</sub> − q, even an irresolute S would fight rather than retreat, so every threat is credible and the model says R concedes.' }],
      caveat: 'Trachtenberg (2012, 30–32) finds that U.S. leaders felt bound by their earlier statements and knew a retreat would cost them at home. He also finds that Khrushchev weighed military moves, intelligence and private messages, and that “calculations about audience costs did not rank very high in that list.”',
      src: ['ohCuba', 'trach'],
    },
    {
      id: 'syria', title: 'Syria “red line”', when: '2012–13', where: 'Middle East',
      what: 'On August 20, 2012, President Obama told reporters that “a red line for us is we start seeing a whole bunch of chemical weapons moving around or being utilized.” After a chemical attack near Damascus on August 21, 2013, which the White House said killed well over 1,000 people, he announced on August 31 that he had decided on limited military action and would seek authorization from Congress. On September 14 the United States and Russia agreed a framework for eliminating Syria’s chemical weapons.',
      readings: [{ label: 'A cheap line, sometimes called', set: { p: 0.3, a: 0.1 },
        text: 'A remark at a press briefing carries a small audience cost. With a below c<sub>H</sub> − q and a low prior, the model sits in the semi-separating region: some threats are bluffs, R calls a share of them, and an irresolute S that is called backs down and pays a. The negotiated disarmament deal that followed has no counterpart in the model, which offers S only fight or back down.' }],
      caveat: 'Snyder and Borghard (2011) look for audience costs in post-1945 crises and find hardly any. One reason they give: domestic audiences care more about policy substance than about consistency between a leader’s words and deeds.',
      src: ['wh2012', 'wh2013', 'fw2013', 'snyder'],
    },
    {
      id: 'fashoda', title: 'Fashoda', when: '1898', where: 'Upper Nile',
      what: 'A French expedition under Jean-Baptiste Marchand reached Fashoda on the upper Nile on July 10, 1898. A British force under Kitchener arrived on September 18, and neither commander would give up the fort. On November 4 French foreign minister Delcassé, ignoring an outraged French public, instructed Marchand to withdraw.',
      readings: [
        { label: 'Schultz: Salisbury tied his hands', set: { p: 0.3, a: 0.8 },
          text: 'In the reading Trachtenberg attributes to Schultz (2001), Salisbury used public outrage, including a Blue Book of diplomatic documents, to convince the French he had no room to concede. That is a high a: the model moves to commitment and R concedes.' },
        { label: 'Trachtenberg: resolve was already known', set: { p: 0.85, a: 0.1 },
          text: 'Trachtenberg (2012, 16–17) argues British warnings had been unambiguous since 1890, so the French had the information they needed and gave way once the Royal Navy was put on a war footing. In the model that is a high prior p with a small a. R concedes because it already believes S will fight, and the audience cost does little work.' },
      ],
      caveat: 'Trachtenberg (2012, 15, 17) notes that what historical support audience-cost theory has comes largely from Fashoda, and that historians who have studied the episode see French policy in 1898 as far from rational, which a rationalist model cannot capture.',
      src: ['fashoda', 'trach'],
    },
  ],
  B: [
    {
      id: 'berlin48', title: 'Berlin airlift', when: '1948–49', where: 'Central Europe',
      what: 'On June 24, 1948, Soviet forces blockaded rail, road and water access to the Allied-controlled areas of Berlin. The United States launched an airlift on June 26 and Britain followed two days later. The United States also sent B-29 bombers, a type capable of carrying nuclear weapons, to Britain. The Soviets lifted the blockade on May 12, 1949.',
      readings: [{ label: 'The airlift as a sunk cost', set: { tech: 'sunk', k: 0.45 },
        text: 'An airlift is paid for every day, whether or not the other side backs off: a sunk cost. A sunk signal separates the types when k lies between (1 − P<sub>0</sub>)v<sub>I</sub> and (1 − P<sub>0</sub>)c, so only a sender that values the stake highly keeps paying.' }],
      caveat: 'The model has one signal and one round. An airlift that ran for almost a year is a repeated signal, closer to the reputation logic of module C.',
      src: ['ohBerlin'],
    },
    {
      id: 'berlin61', title: 'Berlin crisis', when: '1961', where: 'Central Europe',
      what: 'On July 25, 1961, President Kennedy told a television audience that he would ask Congress for an additional $3,247,000,000 for the armed forces, that draft calls would be doubled and tripled, and that he would seek authority to call reserve units to active duty. Trachtenberg (2012, 28) records that Khrushchev then authorized the Berlin Wall, that U.S. leaders pressed for negotiations and made clear they would make major concessions, and that the audience at home did not seem to mind the shift.',
      readings: [
        { label: 'The mobilization: sink costs', set: { tech: 'sunk', k: 0.5 },
          text: 'Money appropriated and reservists called up are spent whatever Moscow does. At this size the sunk signal separates the types.' },
        { label: 'The speech: tie hands', set: { tech: 'tied', k: 0.2 },
          text: 'The televised speech is a hands-tying signal. If the home audience would forgive a later shift, as Trachtenberg finds it did, the bond a is small, the irresolute type can bluff, and the signal is only partly informative.' },
      ],
      caveat: 'Trachtenberg (2012, 32) concludes that Kennedy’s July speech mattered, but as one element in a larger picture that included military measures, intelligence and private channels.',
      src: ['jfk1961', 'trach'],
    },
    {
      id: 'efp', title: 'Tripwires and NATO’s forward presence', when: '2016–17', where: 'Baltic and Poland',
      what: 'At the 2016 Warsaw Summit NATO allies decided to establish an enhanced Forward Presence in the northeast of the Alliance. By August 2017 four multinational battlegroups were deployed and fully operational in Estonia, Latvia, Lithuania and Poland.',
      readings: [{ label: 'A multinational tripwire ties hands', set: { tech: 'tied', k: 0.45 },
        text: 'A small force on the border costs little in peacetime. Its value lies in what it does to a retreat: an attack would hit troops from many allies, which makes backing down costly. Once a ≥ c − v<sub>I</sub>, every signaler would fight and only the receivers who want war anyway push.' }],
      caveat: 'Blankenship and Lin-Greenberg (2022) surveyed European foreign-policy experts and found that tripwire forces were viewed as no more reassuring than forces stationed offshore. Their point is that capability matters alongside resolve, and this model has no capability dimension. Altman (2015, 181) argues tripwires have real deterrent value, especially when set on a geographic focal point.',
      src: ['nato', 'blank', 'altmanDiss'],
    },
  ],
  C: [
    {
      id: 'blockade', title: 'The creeping blockade of Berlin', when: '1948', where: 'Central Europe',
      what: 'Schelling (1966, 66, 77, as cited by Altman 2015, 22) used the term “salami tactics” for taking an objective piece by piece. The phrase was older: in 1952 TIME quoted Hungary’s Communist leader Mátyás Rákosi describing his party’s methods for taking power as “salami tactics.” Altman (2015, 99–100) describes the 1948 Berlin blockade as built this way: it began with demands for extra identification checks and inspections on traffic into Berlin, and Army Chief of Staff Omar Bradley asked whether “Russian restrictions be added one by one” until the Western position became untenable.',
      readings: [{ label: 'Each restriction is a slice', set: { N: 10, p0: 0.05, b: 0.6, a: 2 },
        text: 'Each new restriction is a slice. A weak defender resists early slices with some probability to protect the reputation that keeps later ones at bay, and gives way near the end. Even a 5% prior that the defender is tough keeps the challenger out of the early slices.' }],
      caveat: 'Kreps and Wilson’s challengers move once each. A single long-lived challenger, as in Berlin, can also learn from each probe in ways the model leaves out.',
      src: ['altmanDiss', 'ohBerlin', 'time1952'],
    },
    {
      id: 'crimea', title: 'Crimea', when: '2014', where: 'Black Sea',
      what: 'On March 27, 2014, the UN General Assembly adopted resolution 68/262, “Territorial integrity of Ukraine,” by 100 votes to 11 with 58 abstentions, underscoring the invalidity of the March 16 referendum in Crimea. Altman (2015, 67) treats Russia’s annexation as a fait accompli: a limited, unilateral seizure in place of a coerced concession. He finds that states far more often take territory this way than by coercing a cession (2015, 3), an argument his 2017 article carries into print.',
      readings: [{ label: 'A challenger that expects a weak defender', set: { N: 10, p0: 0.001, b: 0.6, a: 2 },
        text: 'Altman defines salami tactics as repeated faits accomplis. In the model a challenger takes a slice when the defender’s reputation for toughness falls below b<sup>k</sup>. If it believes the defender is almost surely weak, it probes from the first slice.' }],
      caveat: 'The model cannot say what any government believed in 2014. It shows only which beliefs would make an early slice attractive.',
      src: ['ga68262', 'altman17', 'altmanDiss'],
    },
    {
      id: 'georgia', title: 'Georgia and “borderization”', when: '2008–', where: 'South Caucasus',
      what: 'The EU fact-finding mission on Georgia (2009) records that fighting began with a Georgian artillery attack on Tskhinvali on the night of 7 to 8 August 2008, that Russian forces then penetrated deep into Georgia, and that a ceasefire was agreed on 12 August. It found recognition of South Ossetia and Abkhazia by a third country contrary to international law. Toal and Merabishvili (2019) define “borderization” as building physical barriers to turn a ceasefire line into an international border, a term first used by EU officials for the South Ossetia boundary line.',
      readings: [{ label: 'Many small, cheap slices', set: { N: 25, p0: 0.05, b: 0.9, a: 2 },
        text: 'A fence moved a short distance is a slice whose resistance costs the challenger little, so b is close to 1. The threshold b<sup>k</sup> then stays high for many slices, and a defender with a modest reputation cannot keep the challenger out even at the start.' }],
      caveat: 'Toal and Merabishvili argue that borderization also became a stage for symbolic politics, and that presenting it as evidence of domestic irresoluteness or foreign aggression is a rhetorical gambit that may or may not work.',
      src: ['iiffmcg', 'toal'],
    },
  ],
};
