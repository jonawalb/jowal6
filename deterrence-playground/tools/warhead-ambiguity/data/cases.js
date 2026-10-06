// Case cards for Is It a Nuke? Each fact below was checked against the linked source(s) in September 2026.
// Quotes are verbatim from the sources. preset: model settings that approximate the observer's position, or null for
// pre-launch cases that sit outside this post-launch model. Presets are this tool's reading, not the sources'.
// Sources: PBS NOVA (Forden 2001); BBC; The Guardian; National Security Archive EBB 371; PBS Frontline;
// Government of India PIB; Pakistan Ministry of Foreign Affairs; ThePrint; Acton, "Is It a Nuke?" (Carnegie 2020).

const NOVA = { t: 'Geoffrey Forden, “False Alarms in the Nuclear Age,” PBS NOVA, 6 Nov 2001', u: 'https://www.pbs.org/wgbh/nova/article/nuclear-false-alarms/' };
const ACTON = { t: 'James M. Acton, “Is It a Nuke? Pre-Launch Ambiguity and Inadvertent Escalation,” Carnegie Endowment, 9 April 2020', u: 'https://carnegieendowment.org/research/2020/04/is-it-a-nuke-pre-launch-ambiguity-and-inadvertent-escalation' };

export const CASES = [
  { id: 'norad79', year: '1979', who: 'United States', kind: 'False alarm',
    title: 'NORAD’s training tape',
    text: 'On 9 November 1979 computers at NORAD, the Pentagon’s command center and its alternate all showed a Soviet missile attack. Press reports blamed a staffer for loading a training tape; the National Security Archive notes the cause was software simulating an attack. NOVA recounts that within minutes officers checked the raw early-warning satellite data and the early-warning radars.',
    reading: 'A dramatic display with no confirmation. With a low peacetime prior and no second sensor, the model says wait.',
    preset: { ctx: 'peace', pReal: 0.02, pNuc: 0.7, site: 'nuc', traj: 'city', corr: 0, surv: 0.5, lowCap: 1 },
    sources: [{ t: 'William Burr, ed., “The 3 A.M. Phone Call: False Missile Attack Warning Incidents, 1979–1980,” National Security Archive EBB 371, 2012', u: 'https://nsarchive2.gwu.edu/nukevault/ebb371/' }, NOVA] },
  { id: 'norad80', year: '1980', who: 'United States', kind: 'False alarm',
    title: 'The 46-cent chip',
    text: 'On 3 and 6 June 1980 NORAD computers again warned of Soviet launches, and routine alert actions followed. The failure was attributed to a 46-cent integrated circuit, though Defense Secretary Brown told President Carter that NORAD could not make the suspected chip fail again in tests. The Archive notes that alert actions were suspended because missile attack warning systems showed nothing unusual.',
    reading: 'Same structure as 1979. A second, independent sensor that disagrees is what keeps the posterior low.',
    preset: { ctx: 'peace', pReal: 0.02, pNuc: 0.7, site: 'nuc', traj: 'unclear', corr: 0, surv: 0.5, lowCap: 1 },
    sources: [{ t: 'National Security Archive EBB 371 (as above)', u: 'https://nsarchive2.gwu.edu/nukevault/ebb371/' }, NOVA] },
  { id: 'petrov', year: '1983', who: 'Soviet Union', kind: 'False alarm',
    title: 'Petrov and the five missiles',
    text: 'On 26 September 1983 the new Soviet early-warning satellite system reported launches from U.S. missile fields; NOVA attributes it to reflected sunlight. Lt. Col. Stanislav Petrov, duty officer at Serpukhov-15, dismissed it as a false alarm. He later said “when people start a war, they don’t start it with only five missiles.”',
    reading: 'One new sensor, no radar confirmation and a pattern that did not fit a first strike. Turn on the second sensor to see how close the call becomes.',
    preset: { ctx: 'peace', pReal: 0.02, pNuc: 0.7, site: 'nuc', traj: 'unclear', corr: 0, surv: 0.3, lowCap: 1 },
    sources: [NOVA, { t: 'Pavel Aksenov, “Stanislav Petrov: The man who may have saved the world,” BBC, 26 Sept 2013', u: 'https://www.bbc.com/news/world-europe-24280831' },
      { t: '“Stanislav Petrov obituary,” The Guardian, 11 Oct 2017', u: 'https://www.theguardian.com/world/2017/oct/11/stanislav-petrov-obituary' }] },
  { id: 'norway', year: '1995', who: 'Russia', kind: 'Misidentified object',
    title: 'The Norwegian rocket',
    text: 'On 25 January 1995 a Russian radar crew saw a fast-moving object over the Barents Sea. It was a Norwegian-American Black Brant XII scientific rocket. Frontline reports the crew saw it separate as Trident warheads would, and that a signal went to the nuclear briefcases. Yeltsin said the next day he had activated his “nuclear football.” Eight minutes after the alarm the objects fell into the sea.',
    reading: 'A real object, a real radar track, and an unclear trajectory near a submarine launch area. The prior did the work: nothing else suggested war.',
    preset: { ctx: 'peace', pReal: 0.03, pNuc: 0.7, site: 'unk', traj: 'unclear', corr: 1, surv: 0.4, lowCap: 1 },
    sources: [{ t: 'PBS Frontline, “The Norwegian Rocket Incident”', u: 'https://www.pbs.org/wgbh/pages/frontline/shows/russia/closecall/' }, NOVA] },
  { id: 'brahmos', year: '2022', who: 'India / Pakistan', kind: 'Accidental real launch',
    title: 'The accidental missile into Pakistan',
    text: 'On 9 March 2022, India says, “a technical malfunction led to the accidental firing of a missile” during routine maintenance; it landed in Pakistan. Pakistan’s military said it flew 124 km in Pakistani airspace at Mach 3. Indian defence sources told ThePrint it was a BrahMos cruise missile. Pakistan summoned India’s chargé d’affaires and asked India to share the findings of its inquiry.',
    reading: 'A real, tracked, unannounced launch between nuclear-armed neighbors in peacetime. Pakistan cannot launch before impact, so waiting cost little.',
    preset: { ctx: 'peace', pReal: 0.05, pNuc: 0.3, site: 'unk', traj: 'theater', corr: 1, surv: 0.6, lowCap: 0 },
    sources: [{ t: 'Government of India, PIB, “Statement on accidental firing of missile,” 11 March 2022', u: 'https://pib.gov.in/PressReleasePage.aspx?PRID=1805148' },
      { t: 'Pakistan Ministry of Foreign Affairs, protest over airspace violation by a “super-sonic flying object,” 10 March 2022', u: 'https://mofa.gov.pk/pakistan-registers-strong-protest-over-unprovoked-violation-of-its-airspace-by-a-super-sonic-flying-object-of-indian-origin-2/' },
      { t: 'BBC, “India accidentally fires missile into Pakistan,” 11 March 2022', u: 'https://www.bbc.com/news/world-asia-india-60711653' },
      { t: 'ThePrint, report naming the missile as BrahMos, 11 March 2022', u: 'https://theprint.in/defence/accidentally-fired-missile-into-pakistan-due-to-tech-glitch-says-india-it-was-brahmos/869387/' }] },
  { id: 'cuba', year: '1962', who: 'United States / Soviet Union', kind: 'Pre-launch false negative',
    title: 'Cuba’s cruise missiles',
    text: 'Acton writes that the Soviet Union shipped about eighty coastal defense cruise missiles and their nuclear warheads to Cuba, alongside conventional ones, and that the CIA “failed to identify the difference and assessed them all to be conventionally armed.”',
    reading: 'Pre-launch ambiguity, outside this model’s incoming-missile frame. It shows the other error: a false negative, which Acton argues can make a state take risks it would not take if it knew.',
    preset: null, sources: [ACTON] },
  { id: 'yomkippur', year: '1973', who: 'United States / Soviet Union', kind: 'Pre-launch false positive',
    title: 'Warheads to Egypt?',
    text: 'During the 1973 war, Acton writes, “the United States’ incorrect belief that Soviet nuclear warheads were being transported to Egypt helped spark a U.S. nuclear alert, which may, in turn, have prompted the start of a Soviet alert.”',
    reading: 'A false positive before any launch, and the escalation spiral Acton warns about. Also outside the incoming-missile frame.',
    preset: null, sources: [ACTON] },
];
