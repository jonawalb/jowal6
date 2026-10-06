// Text for the second group of models (Jervis 1978, Kydd 2000, Slantchev 2003, Rubinstein 1982).
// Sources and page conventions as in notes.js; every page cited was opened for this tool.

export const NOTES_B = {
  jervis78: {
    kicker: 'Jervis 1978 · World Politics',
    title: 'Cooperation under the security dilemma',
    cite: 'Robert Jervis, “Cooperation under the Security Dilemma,” <i>World Politics</i> 30, no. 2 (1978): 167-214.',
    setup: {
      game: 'Two status-quo states each choose to cooperate (for example, stay lightly armed) or defect (arm). In Rousseau’s Stag Hunt both most prefer mutual cooperation; in the Prisoner’s Dilemma each most prefers to exploit the other (pp. 167, 171). Jervis names three levers for cooperation: the payoffs to cooperating, the payoffs to defecting, and each side’s expectation that the other will cooperate (p. 171).',
      worlds: 'Jervis then asks when one state’s security must cost another’s. Two variables decide it: whether the offense or the defense has the advantage, and whether offensive postures can be told apart from defensive ones. Together they make four worlds (pp. 186-187, 211).',
    },
    insight: 'The security dilemma is sharpest when the offense has the advantage and offensive and defensive postures look alike: then status-quo states must behave like aggressors. When the defense dominates and postures differ, states can make themselves secure without threatening anyone (pp. 187, 211-214).',
    tries: [
      { t: 'A Stag Hunt, ranked as Jervis ranks it, with low trust (q = 0.3).', q: 'Both want CC, yet defecting pays.', set: { v: 'game', cc: 4, dc: 3, dd: 2, cd: 1, q: 0.3, seq: 0, rep: 0 } },
      { t: 'Make being exploited cheap: CD = 1.9.', q: 'Jervis: this cost “most strongly drives the security dilemma” (p. 172).', set: { v: 'game', cc: 4, dc: 3, dd: 2, cd: 1.9, q: 0.3, seq: 0, rep: 0 } },
      { t: 'Let the state wait and see what the other does.', set: { v: 'game', cc: 4, dc: 3, dd: 2, cd: 1, q: 0.3, seq: 1, rep: 0 } },
      { t: 'A one-shot Prisoner’s Dilemma, even with high trust (q = 0.9).', set: { v: 'game', cc: 3, dc: 4, dd: 2, cd: 1, q: 0.9, seq: 0, rep: 0 } },
      { t: 'The same Prisoner’s Dilemma, repeated with δ = 0.6.', set: { v: 'game', cc: 3, dc: 4, dd: 2, cd: 1, q: 0.9, seq: 0, rep: 1, dl: 0.6 } },
      { t: 'Offense advantage, postures indistinguishable.', q: 'Jervis sees Europe before 1914 here.', set: { v: 'worlds', od: 'off', dist: 0 } },
      { t: 'Defense advantage, postures distinguishable.', set: { v: 'worlds', od: 'def', dist: 1 } },
    ],
    illus: [
      { t: 'Railways toward Seistan, 1903', text: 'A British army memo ranked building a railway while Russia stayed idle as a defensive gain, and Russia building one while Britain stayed idle as an offensive gain for Russia; it never considered neither side building.', src: 'pp. 167-168, n. 1' },
      { t: 'Britain and Austria after 1815', text: 'Britain’s isolation let it take a relaxed view of disturbances on the Continent; Austria, surrounded by strong powers, had to threaten or harm others to protect itself.', src: 'pp. 173-174' },
      { t: 'Europe before 1914', text: 'Decision makers thought the offense had a big advantage and saw little difference between offensive and defensive postures. Jervis sees the period as resembling the first, doubly dangerous world.', src: 'pp. 211-212' },
    ],
  },

  kydd00: {
    kicker: 'Kydd 2000 · International Organization',
    title: 'Trust, reassurance and cooperation',
    cite: 'Andrew Kydd, “Trust, Reassurance, and Cooperation,” <i>International Organization</i> 54, no. 2 (2000): 325-357.',
    setup: 'Each player is “nice” (Stag Hunt preferences: it reciprocates cooperation) or “mean” (Prisoner’s Dilemma preferences: it exploits it), and each knows only the odds on the other (pp. 331-332). In the one-round trust game, player 1 must cooperate blind. In the reassurance game, player 1 first picks how much of the relationship to stake in a first round, α, and cooperates there; then player 2 moves first in the second round, worth 1 − α (pp. 333-335). A gesture that only a nice type would make can build trust.',
    insight: 'Mistrust need not end in conflict. A trustworthy state can reassure with a costly gesture that an untrustworthy state would not fake and that the trustworthy state itself will risk. The more fearful the state making the gesture is of the other, the smaller that first gesture has to be, which lends support to Osgood’s GRIT (pp. 338-340).',
    tries: [
      { t: 'Kydd’s example payoffs with deep mistrust (p<sub>2</sub> = 0.1) and a matching gesture.', q: 'The one-round game fails; reassurance works.', set: { p2: 0.1, a: 0.73, RN: 2, SN: 1, TM: 2, RM: 1, SM: 1 } },
      { t: 'A gesture too cheap to mean anything (α = 0.3).', set: { p2: 0.25, a: 0.3, RN: 2, SN: 1, TM: 2, RM: 1, SM: 1 } },
      { t: 'Enough trust that even a mean type would make the gesture (p<sub>2</sub> = 0.6).', set: { p2: 0.6, a: 0.9, RN: 2, SN: 1, TM: 2, RM: 1, SM: 1 } },
      { t: 'Let the mean type value cooperation almost as much as exploitation (R<sub>1M</sub> = 1.9).', q: 'The band of reassuring gestures nearly closes (p. 339).', set: { p2: 0.25, a: 0.88, RN: 2, SN: 1, TM: 2, RM: 1.9, SM: 1 } },
      { t: 'Make the nice type fear being the sucker (S<sub>1N</sub> = 3).', q: 'Now p<sub>2</sub>*<sup>N</sup> > p<sub>2</sub>*<sup>M</sup> and Kydd’s condition fails.', set: { p2: 0.25, a: 0.85, RN: 2, SN: 3, TM: 2, RM: 1, SM: 1 } },
    ],
    illus: [
      { t: 'Gorbachev and the INF issue, 1987', text: 'Gorbachev accepted the U.S. position on intermediate-range nuclear forces, a significant concession that left the larger strategic nuclear agenda open: in the model, cooperation in a first round worth α.', src: 'p. 335' },
      { t: 'France and German rearmament', text: 'After being invaded by Germany three times in seventy years, France distrusted Germany in the early postwar years and opposed German rearmament: a low prior level of trust.', src: 'p. 331' },
    ],
  },

  slantchev03: {
    kicker: 'Slantchev 2003 · American Political Science Review',
    title: 'The principle of convergence in wartime negotiations',
    cite: 'Branislav L. Slantchev, “The Principle of Convergence in Wartime Negotiations,” <i>American Political Science Review</i> 97, no. 4 (2003): 621-632.',
    setup: {
      complete: 'Two players alternate offers over a flow of benefits, as in Rubinstein’s protocol. Every rejected offer is followed by a battle that moves the front one step: k counts player 1’s net wins, and reaching 0 or N ends the war in total defeat. Fighting pays each side b<sub>i</sub> per period, less than peace (pp. 622-623). Here player 1 knows its odds p of winning each battle.',
      incomplete: 'Now player 2 is weak, moderate or strong, and only player 2 knows which: player 1 wins battles with probability p<sub>H</sub>, p<sub>M</sub> or p<sub>L</sub> (p. 624). Player 1 learns from two sources: player 2’s offers and refusals, which player 2 can manipulate, and battle results, which it cannot. Proposition 2 describes the equilibrium for patient players (p. 626).',
    },
    insight: 'Wars end when fighting stops revealing information, not when one side is sure it will lose. States need not agree on who would win, only on the odds; and a weak state can profit from fighting a little and then settling if its opponent thinks it may be strong (pp. 627-628).',
    tries: [
      { t: 'Complete information, starting near victory for player 1 (k<sub>0</sub> = 5 of 6).', set: { v: 'complete', N: 6, k0: 5 } },
      { t: 'Strong player 2; player 1 wins the first battle.', set: { v: 'incomplete', t2: 's', I0: 1, I1: 1, dl2: 0.99 } },
      { t: 'Moderate player 2 after a player-1 defeat.', set: { v: 'incomplete', t2: 'm', I0: 0, dl2: 0.99 } },
      { t: 'Less patient players (δ = 0.95).', q: 'The strong type no longer signals after a defeat.', set: { v: 'incomplete', dl2: 0.95 } },
      { t: 'Weak player 2: it settles at once, on terms better than it would get if its type were known.', set: { v: 'incomplete', t2: 'w', dl2: 0.99 } },
    ],
    illus: [
      { t: 'Germany and Czechoslovakia, 1937-38', text: 'Slantchev’s example of a change in the starting military position: the surrender of the Sudetenland and its fortifications made German victory more likely after Munich than in 1937.', src: 'p. 623, n. 5' },
      { t: 'The Second World War', text: 'Fear that anything short of Germany’s unconditional surrender might split the alliance with the Soviets helped prolong the war until Berlin fell: a war fought to the end, which the model treats as rare.', src: 'p. 629, n. 18' },
    ],
  },

  rubinstein82: {
    kicker: 'Rubinstein 1982 · Econometrica',
    title: 'Alternating offers',
    cite: 'Ariel Rubinstein, “Perfect Equilibrium in a Bargaining Model,” <i>Econometrica</i> 50, no. 1 (1982): 97-109.',
    setup: {
      disc: 'Two players divide a pie of size 1. Player 1 proposes; player 2 accepts or rejects and counter-proposes next period; and so on without limit (p. 100). Delay is costly: a player with discount factor δ values a share one period later at δ times its value now (p. 99).',
      cost: 'The same game, but delay costs each player a fixed amount c<sub>i</sub> per period instead of discounting (p. 99).',
    },
    insight: 'Alternating offers with costly delay give a single answer: agreement at once, with the first mover getting (1 − δ<sub>2</sub>)/(1 − δ<sub>1</sub>δ<sub>2</sub>). Patience is bargaining power, and moving first helps less the more patient both sides are (p. 108).',
    tries: [
      { t: 'Equal patience, δ = 0.5.', q: 'Player 1 gets 1/(1 + δ) = 0.67 (p. 108).', set: { v: 'disc', d1: 0.5, d2: 0.5 } },
      { t: 'A very patient responder: δ<sub>1</sub> = 0.5, δ<sub>2</sub> = 0.99.', set: { v: 'disc', d1: 0.5, d2: 0.99 } },
      { t: 'A responder with no future (δ<sub>2</sub> = 0).', q: 'Player 2 has no threat, so player 1 takes the pie (p. 108).', set: { v: 'disc', d1: 0.5, d2: 0 } },
      { t: 'Fixed costs, player 1’s cheaper: c<sub>1</sub> = 0.05, c<sub>2</sub> = 0.1.', set: { v: 'cost', c1: 0.05, c2: 0.1 } },
      { t: 'Fixed costs, player 1’s dearer: c<sub>1</sub> = 0.2, c<sub>2</sub> = 0.1.', set: { v: 'cost', c1: 0.2, c2: 0.1 } },
    ],
    illus: [],
  },
};
