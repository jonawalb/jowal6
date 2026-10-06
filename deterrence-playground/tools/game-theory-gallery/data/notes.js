// Text for each model: setup, classic insight, "Try this" prompts and the historical illustrations the
// authors themselves use. Every page number refers to the published article, opened for this tool:
//   Fearon 1995, International Organization 49(3): 379-414, doi:10.1017/S0020818300033324
//   Powell 2006, International Organization 60(1): 169-203, doi:10.1017/S0020818306060061
//   Powell 1987, American Political Science Review 81(3): 717-735, doi:10.2307/1962673
//   Schelling 1960, The Strategy of Conflict, ch. 8 (read in a reprint whose pagination differs, so cited by chapter)
//   Schelling 1966, Arms and Influence (Yale University Press), not opened for this tool; pp. 92-125 is the range Powell 1987 (p. 719) cites
//   Fearon 1994, American Political Science Review 88(3): 577-592, doi:10.2307/2944796
//   Jervis 1978, World Politics 30(2): 167-214, doi:10.2307/2009958
//   Kydd 2000, International Organization 54(2): 325-357, doi:10.1162/002081800551190
//   Slantchev 2003, American Political Science Review 97(4): 621-632, doi:10.1017/S0003055403000911
//   Rubinstein 1982, Econometrica 50(1): 97-109, doi:10.2307/1912531
// Illustrations are the authors' own examples, summarized; the tool does not fit the models to them.

export const NOTES_A = {
  fearon95: {
    kicker: 'Fearon 1995 · International Organization',
    title: 'Rationalist explanations for war',
    cite: 'James D. Fearon, “Rationalist Explanations for War,” <i>International Organization</i> 49, no. 3 (1995): 379-414.',
    setup: {
      range: 'Two states, A and B, dispute an issue that runs from 0 (B gets everything) to 1 (A gets everything). They can fight, and war is a costly lottery: A wins everything with probability p, and each side pays a cost. Because fighting burns value, some deals always leave both better off than a war (pp. 386-388). This part shows that range, what shrinks it and when it holds no feasible deal.',
      info: 'Now A cannot see B’s cost of war. A makes a take-it-or-leave-it demand x and B either accepts or fights (pp. 394-395, Claim 2 on pp. 410-411). A higher demand gains more if B gives way but raises the chance B fights. We draw B’s cost from a uniform distribution, a simple stylized choice with the nondecreasing hazard rate Fearon’s Claim 2 assumes.',
      preempt: 'Suppose the side that strikes first fights better: A wins with p<sub>f</sub> if it attacks, p<sub>s</sub> if B does, and p if both move at once (pp. 402-403). A deal holds only if neither side wants to break it by attacking.',
      prevent: 'A’s chance of winning will rise from p<sub>1</sub> to p<sub>2</sub> next period and stay there. A chooses the division each period; B can acquiesce or fight (pp. 405-406). Once stronger, A will demand more, and it cannot promise not to.',
    },
    insight: 'Because war is costly, there is always a deal both sides prefer to fighting (p. 387). So rational states need a reason they fail to find or keep one. Fearon finds two general ones, private information with incentives to misrepresent it and the inability to commit, plus the rarer case of an issue that truly cannot be divided (pp. 381-382, 409).',
    tries: [
      { t: 'Make war nearly free for both (c<sub>A</sub> = c<sub>B</sub> = 0.02).', q: 'The range narrows but never closes.', set: { v: 'range', ca: 0.02, cb: 0.02, opt: 0, div: 'cont' } },
      { t: 'Let both sides be optimistic: p = 0.6 and r = 0.7.', q: 'Can rational states disagree like this? Fearon says only with private information (p. 392).', set: { v: 'range', opt: 1, p: 0.6, r: 0.7, ca: 0.1, cb: 0.1, div: 'cont' } },
      { t: 'Make the issue all or nothing at p = 0.5, then allow a lottery.', set: { v: 'range', opt: 0, div: 'none', lot: 0, p: 0.5, ca: 0.1, cb: 0.1 } },
      { t: 'Widen A’s uncertainty about B’s cost to c̄ = 0.8.', q: 'A gambles on a bigger demand, and the risk of war rises.', set: { v: 'info', p: 0.4, ca: 0.1, cmax: 0.8, cbt: 0.25 } },
      { t: 'Make war expensive for A (c<sub>A</sub> = 0.5 ≥ c̄).', q: 'A stops running any risk.', set: { v: 'info', p: 0.4, ca: 0.5, cmax: 0.4 } },
      { t: 'Open a large first-strike gap: p<sub>f</sub> = 0.75, p<sub>s</sub> = 0.3.', set: { v: 'preempt', p: 0.5, pf: 0.75, ps: 0.3, ca: 0.1, cb: 0.1 } },
      { t: 'A rapid rise: p<sub>1</sub> = 0.3 to p<sub>2</sub> = 0.8 with δ = 0.9.', set: { v: 'prevent', p1: 0.3, p2: 0.8, cb: 0.5, dl: 0.9 } },
    ],
    illus: [
      { t: 'The Spanish throne, 1870', text: 'The immediate issue behind the Franco-Prussian War was which prince would take the Spanish throne. No one proposed that candidates alternate; such a deal would have broken too many norms to be workable at home. Fearon uses it to argue that indivisibility usually comes from politics, not from the issue.', src: 'pp. 389-390' },
      { t: 'July 1914', text: 'German leaders discounted Russian warnings that it would fight, knowing Russia had reason to bluff; Jagow had predicted “some blustering in St. Petersburg.” Bethmann Hollweg in turn hid the extent of German support for Austria to avoid looking like the aggressor.', src: 'pp. 397-398' },
      { t: 'Russia and Japan, 1904', text: 'Russian leaders expected to win easily; Japan’s chief of staff put the odds near even. Japan’s better intelligence was private, and revealing its war plans would have weakened them.', src: 'pp. 398-400' },
      { t: 'Germany and Russia, 1914', text: 'German leaders feared Russia’s rising military power, which would let it press harder in the Balkans. A promise by Russia to hold back later would have been unenforceable.', src: 'p. 407' },
      { t: 'The Winter War, 1939', text: 'Finland refused to cede islands Stalin wanted for the defense of Leningrad, fearing he would use the advantage to demand more.', src: 'pp. 408-409' },
    ],
  },

  powell06: {
    kicker: 'Powell 2006 · International Organization',
    title: 'War as a commitment problem',
    cite: 'Robert Powell, “War as a Commitment Problem,” <i>International Organization</i> 60, no. 1 (2006): 169-203.',
    setup: {
      shift: 'Two states split a flow of benefits worth 1 each period. Each can fight to lock in an expected share, but fighting destroys a fraction d. State 1’s chance of winning will rise from p to p + Δ. To avoid a war now, 1 must promise 2 at least what 2 can get by fighting; but 1 can credibly promise only what it would still accept once stronger (pp. 181-183).',
      first: 'State 1 wins with p + f if it strikes first and p − f if struck. Deciding to bargain rather than attack gives up the first strike, which shifts power toward the other side (pp. 184-185).',
      territory: 'The states bargain over territory that is itself a source of power. State 1’s chance of winning, p(x), jumps just past the current line x̄, as at a ridge or river. Each concession strengthens state 1 for the next round (pp. 185-187).',
      domestic: 'State 1 is run by faction a, which divides the state’s gains with a rival faction. Faction a keeps power with probability r if it settles and r′ if it fights and wins (pp. 189-190).',
    },
    insight: 'Powell argues indivisibility and first-strike advantages are commitment problems too, and that most commitment problems share one mechanism: bargaining breaks down when the per-period shift in power is larger than the surplus that peace creates (pp. 179-183).',
    tries: [
      { t: 'A big, fast shift: Δ = 0.4 with d = 0.2.', set: { v: 'shift', p: 0.3, D: 0.4, d: 0.2, dl: 0.95 } },
      { t: 'Same shift, costlier war: d = 0.4.', q: 'The surplus now covers the shift.', set: { v: 'shift', p: 0.3, D: 0.4, d: 0.4, dl: 0.95 } },
      { t: 'First-strike advantage f = 0.15 with d = 0.2.', q: '2f(1 − d) > d, so the de facto range vanishes.', set: { v: 'first', p: 0.5, f: 0.15, d: 0.2, dl: 0.95 } },
      { t: 'Make p continuous at the border (J = 0).', q: 'Fearon’s result: no war.', set: { v: 'territory', J: 0, dl: 0.95, c2: 0.5 } },
      { t: 'A strategic ridge (J = 0.15) and patient states (δ = 0.97).', set: { v: 'territory', J: 0.15, dl: 0.97, c2: 0.5 } },
      { t: 'A war that rallies support: r = 0.5, r′ = 0.95.', set: { v: 'domestic', p: 0.6, d: 0.1, r: 0.5, rp: 0.95, l: 0.1 } },
    ],
    illus: [
      { t: 'Czechoslovakia and the Golan Heights', text: 'Powell names Czechoslovakia in the Munich crisis and the Golan Heights in 1967 as issues that are themselves sources of military power, where a concession today weakens a state’s position tomorrow.', src: 'p. 185' },
      { t: 'Britain and Germany, 1939-40', text: 'Powell’s appendix grants that doubt about British resolve shaped the timing of the 1939 crisis, but argues Hitler was willing to fight Britain eventually: he attacked Britain in 1940 “because it was standing firm, not because he was uncertain whether it would stand firm.”', src: 'pp. 195-199' },
    ],
  },

  brink: {
    kicker: 'Schelling 1960, 1966 · Powell 1987',
    title: 'Brinkmanship: the threat that leaves something to chance',
    cite: 'Thomas C. Schelling, <i>The Strategy of Conflict</i> (1960), ch. 8, and <i>Arms and Influence</i> (1966), 92-125; Robert Powell, “Crisis Bargaining, Escalation, and MAD,” <i>American Political Science Review</i> 81, no. 3 (1987): 717-735.',
    setup: {
      chicken: 'Two nuclear-armed states each choose to stand firm or submit. Standing firm against a firm opponent means disaster. Chicken is a standard model of such crises, used by Schelling (1966) among others, and Powell starts from the same 2 × 2 game (1987, 720).',
      ladder: 'Schelling’s solution to the incredible threat: take steps that create a risk of disaster neither side fully controls (Schelling 1960, ch. 8). Powell models this as bidding. Each escalation raises the autonomous risk of disaster by f; the states alternate, and either may submit instead (1987, 723). Here both states know each other’s resolve.',
      crisis: 'Now I does not know whether II is irresolute or resolute. I can exploit an opportunity; II then escalates or submits; each escalation risks disaster (Powell 1987, 727-729). Powell assumes each type will bid at most once or twice, which fixes the bands for the resolve sliders.',
    },
    insight: 'A threat to do something you would never rationally choose can still work if it creates a risk you do not fully control (Schelling 1960, ch. 8). Powell’s formal version adds a twist: with incomplete information, the less resolved side sometimes prevails, and a state may escalate more when its adversary is more resolved (1987, 730).',
    tries: [
      { t: 'Make submitting almost as good as compromise for I (s<sub>I</sub> = 0.55).', q: 'In the mixed equilibrium, II stands firm less often; I’s own behavior does not change.', set: { v: 'chicken', c1: 0.6, s1: 0.55, c2: 0.6, s2: 0.3 } },
      { t: 'Give II more resolve than I: R<sub>I</sub> = 0.3, R<sub>II</sub> = 0.45.', set: { v: 'ladder', R1: 0.3, R2: 0.45, f: 0.08 } },
      { t: 'Coarse steps (f = 0.2) with R<sub>I</sub> = 0.45, R<sub>II</sub> = 0.55.', q: 'The more resolved state loses because of where the bids fall (p. 726).', set: { v: 'ladder', R1: 0.45, R2: 0.55, f: 0.2 } },
      { t: 'Crisis with a weakly resolved irresolute II (R<sub>II</sub> = 0.1).', q: 'Now raise R<sub>II</sub>: I escalates more often.', set: { v: 'crisis', ff: 0.08, RI: 0.3, RII: 0.1, RIIp: 0.3, p: 0.85, q: 0.75 } },
      { t: 'The most dangerous crisis: p = 0.75, just enough for I to exploit.', set: { v: 'crisis', ff: 0.08, RI: 0.3, RII: 0.2, RIIp: 0.3, p: 0.75, q: 0.745 } },
    ],
    illus: [
      { t: 'Steps that leave something to chance', text: 'Powell lists imposing a blockade, committing troops and engaging in limited demonstrations as ways a state raises the shared risk of an unlimited exchange.', src: 'Powell 1987, 720' },
      { t: 'Limited war as a generator of risk', text: 'Schelling reads limited war as more than a direct cost: it exposes both sides to a heightened risk of general war that neither can fully control. The threat is that all-out war may occur, not that it certainly will.', src: 'Schelling 1960, ch. 8' },
    ],
  },

  fearon94: {
    kicker: 'Fearon 1994 · American Political Science Review',
    title: 'Domestic political audiences and escalation',
    cite: 'James D. Fearon, “Domestic Political Audiences and the Escalation of International Disputes,” <i>American Political Science Review</i> 88, no. 3 (1994): 577-592.',
    setup: 'Two states dispute a prize v in a public “war of nerves.” At every moment each can attack, back down or keep escalating. Backing down after escalating for time t costs a leader audience costs a<sub>i</sub>t, which grow the longer the crisis runs. Each state privately knows its value for war w<sub>i</sub> (pp. 582-583). This is the article’s own model with linear audience costs; we add uniform priors to compute it.',
    insight: 'Going public lets leaders tie their hands. Rising audience costs turn escalation into an informative signal, and the side with the stronger domestic audience is always less likely to back down once a crisis starts. Observable power and interests shape who concedes before a crisis, not who backs down in one (pp. 585-586).',
    tries: [
      { t: 'Equal audience costs (a<sub>1</sub> = a<sub>2</sub> = 1) but very different priors (W<sub>1</sub> = 1, W<sub>2</sub> = 3).', q: 'Once a crisis starts, each is equally likely to back down (p. 586).', set: { a1: 1, a2: 1, v: 1, W1: 1, W2: 3 } },
      { t: 'A strong audience against a weak one: a<sub>1</sub> = 3, a<sub>2</sub> = 0.5.', set: { a1: 3, a2: 0.5, v: 1, W1: 2, W2: 2 } },
      { t: 'Raise both audience costs together to 3.', q: 'The horizon comes sooner, but the risk of war given a crisis stays put.', set: { a1: 3, a2: 3, v: 1, W1: 2, W2: 2 } },
      { t: 'Make state 2 look irresolute before the crisis (W<sub>2</sub> = 4).', set: { a1: 1, a2: 1, v: 1, W1: 1.5, W2: 4 } },
    ],
    illus: [
      { t: 'Public commitments by democratic leaders', text: 'Lord Salisbury’s speeches at Fashoda (1898), Lloyd George’s Mansion House speech in the Agadir crisis (1911), Kennedy’s televised speech on the missiles in Cuba (1962) and Bush’s declarations on Kuwait (1990), set against the harder-to-read bluster of Saddam Hussein in 1990.', src: 'p. 582' },
      { t: 'Newcastle’s regiments, 1755', text: 'When the Duke of Newcastle sent two regiments to America to impress the French with British resolve, colleagues worried the move engaged the king’s honor and so committed the cabinet to a warlike course.', src: 'p. 581' },
    ],
  },
};
