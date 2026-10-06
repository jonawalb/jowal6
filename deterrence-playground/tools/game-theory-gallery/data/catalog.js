// Picker cards and the bibliography. Every link below returned HTTP 200 on 2026-09-29, except the SAGE landing
// page for Fearon 1997, which refuses automated requests (metadata checked on Crossref). Fearon 1997 is not
// reimplemented here: its card links to the Deterrence Lab, whose module B covers tying hands versus sinking costs.

export const CARDS = [
  { id: 'fearon95', title: 'The bargaining range', who: 'Fearon 1995', blurb: 'Why rational states fight: hidden information, commitment problems, indivisible stakes.', icon: 'range' },
  { id: 'powell06', title: 'Commitment problems', who: 'Powell 2006', blurb: 'Large, rapid shifts in power, and when they make war the only way out.', icon: 'shift' },
  { id: 'brink', title: 'Brinkmanship', who: 'Schelling · Powell 1987', blurb: 'Chicken, and the threat that leaves something to chance.', icon: 'ladder' },
  { id: 'fearon94', title: 'Audience costs', who: 'Fearon 1994', blurb: 'A public war of nerves where backing down gets costlier by the hour.', icon: 'curves' },
  { id: 'jervis78', title: 'The security dilemma', who: 'Jervis 1978', blurb: 'Stag Hunt or Prisoner’s Dilemma, offense or defense, and the four worlds.', icon: 'matrix' },
  { id: 'kydd00', title: 'Reassurance', who: 'Kydd 2000', blurb: 'How a costly gesture can build trust between wary states.', icon: 'band' },
  { id: 'slantchev03', title: 'Bargaining while fighting', who: 'Slantchev 2003', blurb: 'Wars end when fighting stops revealing information.', icon: 'steps' },
  { id: 'rubinstein82', title: 'Alternating offers', who: 'Rubinstein 1982', blurb: 'The bargaining protocol underneath many war models: patience is power.', icon: 'pie' },
  { id: 'fearon97', title: 'Tying hands vs sinking costs', who: 'Fearon 1997', blurb: 'Costly signals: sink costs up front, or tie your hands. Built as module B of the Deterrence Lab; opens that tool.', icon: 'link', href: '../deterrence-lab-general/#m=B',
    learnHref: '../deterrence-lab-general/#m=B&tour=B',
    question: 'How can a leader make a threat believable when a bluffer would say the same thing? By paying for it: sinking costs up front, or tying hands so backing down is costly. Which works better, and at what risk?' },
];

export const SOURCES = [
  { k: 'fearon95', t: 'Fearon, James D. 1995. “Rationalist Explanations for War.” International Organization 49 (3): 379-414.', u: 'https://doi.org/10.1017/S0020818300033324' },
  { k: 'powell06', t: 'Powell, Robert. 2006. “War as a Commitment Problem.” International Organization 60 (1): 169-203.', u: 'https://doi.org/10.1017/S0020818306060061' },
  { k: 'powell87', t: 'Powell, Robert. 1987. “Crisis Bargaining, Escalation, and MAD.” American Political Science Review 81 (3): 717-735.', u: 'https://doi.org/10.2307/1962673' },
  { k: 'schelling60', t: 'Schelling, Thomas C. 1960. The Strategy of Conflict. Cambridge, MA: Harvard University Press. Chapter 8, “The Threat That Leaves Something to Chance.” Read in a reprint with different pagination, so cited by chapter.', u: null },
  { k: 'schelling66', t: 'Schelling, Thomas C. 1966. Arms and Influence. New Haven: Yale University Press. Pages 92-125, the range Powell (1987, 719) cites; not opened for this tool.', u: null },
  { k: 'fearon94', t: 'Fearon, James D. 1994. “Domestic Political Audiences and the Escalation of International Disputes.” American Political Science Review 88 (3): 577-592.', u: 'https://doi.org/10.2307/2944796' },
  { k: 'jervis78', t: 'Jervis, Robert. 1978. “Cooperation under the Security Dilemma.” World Politics 30 (2): 167-214.', u: 'https://doi.org/10.2307/2009958' },
  { k: 'kydd00', t: 'Kydd, Andrew. 2000. “Trust, Reassurance, and Cooperation.” International Organization 54 (2): 325-357.', u: 'https://doi.org/10.1162/002081800551190' },
  { k: 'slantchev03', t: 'Slantchev, Branislav L. 2003. “The Principle of Convergence in Wartime Negotiations.” American Political Science Review 97 (4): 621-632. Published version on the author’s site.', u: 'http://slantchev.ucsd.edu/published/pdf/Convergence-O006.pdf' },
  { k: 'rubinstein82', t: 'Rubinstein, Ariel. 1982. “Perfect Equilibrium in a Bargaining Model.” Econometrica 50 (1): 97-109. Copy on the author’s site.', u: 'https://arielrubinstein.tau.ac.il/papers/11.pdf' },
  { k: 'fearon97', t: 'Fearon, James D. 1997. “Signaling Foreign Policy Interests: Tying Hands versus Sinking Costs.” Journal of Conflict Resolution 41 (1): 68-90. Covered by the Deterrence Lab.', u: 'https://doi.org/10.1177/0022002797041001004' },
];
