// The words behind every "i" button and the side-specific start tips. Pure (no DOM, no engine imports): each
// builder takes the numbers the caller already has from the player's own picture and returns
// { title, lines, notes }. Tips never reveal hidden truth; the ones that rest on estimates say so.
// Page numbers: Biddle, Military Power (2004); Hunzeker, Dying to Learn (2021). NOTIONAL = a game value.

const pc = x => `${Math.round((+x || 0) * 100)}%`;
const n2 = x => (Math.round((+x || 0) * 100) / 100).toString();
const SEEN = 'Worked out from what your side has seen, not from the true enemy picture.';

/** Unit strength. `str`, `str0` in strength points. */
export function strengthTip({ str = 0, str0 = 1 } = {}) {
  return {
    title: `Strength ${pc(str / (str0 || 1))}`,
    lines: [`${n2(str)} of ${n2(str0)} strength points left`, 'Green = strength left, red = lost (same for both sides)'],
    notes: ['A unit below 50% of its starting strength breaks and stops fighting (NOTIONAL threshold, the same rule as Fog of Command).'],
  };
}

/** Stall gauge: A_s / (H_s × D_s). */
export function stallTip({ ratio = 0, k1 = 2.5, fe = 0, supp = 0, coh = 1, od = 5, step = 1.08, ca = 1, believed = true } = {}) {
  const shown = Math.max(0, Math.min(3, ratio));
  return {
    title: `Assault at ${pc(shown)} of the strength needed to advance`,
    lines: [
      `One fully concealed defender can halt k1 = ${k1} attackers (Biddle, Table A.1, p. 218)`,
      `Defender exposure f_e = ${n2(fe)}: the halt strength is k1 × (1 − f_e) (Biddle eq. A.6, p. 212)`,
      `Suppression on the holders: ${pc(supp)} of their fire is off`,
      `Attacker cohesion: ${pc(coh)}`,
      `Balance slider at ${od}: halt strength × ${n2(Math.pow(step, 5 - od))}`,
      ...(ca !== 1 ? [`Counterattack: halt strength divided by ${n2(ca)}`] : []),
    ],
    notes: [
      'Above 100% the assault takes the sector this hour; below it, the assault stalls and the men may go to ground.',
      'Shown between 0% and 300%.',
      ...(believed ? [SEEN] : []),
    ],
  };
}

/** Suppression on a unit: sources combine as 1 − Π(1 − s), capped. */
export function suppressionTip({ sources = [], cap = 0.9 } = {}) {
  const tot = Math.min(cap, 1 - sources.reduce((p, s) => p * (1 - s.s), 1));
  return {
    title: `Suppression ${pc(tot)}`,
    lines: sources.length ? sources.map(s => `${s.label}: ${pc(s.s)}`) : ['No fire on this unit this hour'],
    notes: [
      `Sources combine as 1 − (1 − a)(1 − b)…, kept at or below ${pc(cap)}.`,
      'A full barrage takes 86% off the target’s fire: suppression can cut firing rates "by a factor of seven or more" (Biddle, p. 67). One battery alone: 60% (NOTIONAL).',
      'Suppression lasts only while the fire falls. When it lifts, the defenders shoot again.',
    ],
  };
}

/** Expected loss this hour for a planned move (§3.2 terms). */
export function expectedLossTip({ loss = 0, exposure = 1, deadGround = 0, enfilade = 1, cover = 0, era = 'w' } = {}) {
  return {
    title: `Expected loss this hour: ${pc(loss)}`,
    lines: [
      `Exposure from your posture: ${n2(exposure)} (Rush 1.0; a leapfrog bound with overwatch about 0.27)`,
      `Usable dead ground: ${pc(deadGround)} of the fire misses`,
      `Cover facing the fire: ${pc(cover)}`,
      ...(enfilade > 1 ? [`Enfilade: × ${n2(enfilade)} from a lane running along your line`] : []),
      ...(era === 'm' ? ['Modern weapons: much deadlier against exposed men, little more against covered ones'] : []),
    ],
    notes: [
      'Loss grows with exposure and with the fire on you; it falls with cover, dead ground and suppression (after Biddle eqs. A.11–A.12, p. 213). Rates are NOTIONAL, calibrated in METHOD.md.',
      SEEN,
    ],
  };
}

/** Detection chance for an infiltrating unit: 1 − Π(1 − d_k). */
export function detectionTip({ watchers = [], fogNight = false } = {}) {
  const raw = 1 - watchers.reduce((p, w) => p * (1 - w.d), 1), p = fogNight ? raw * 0.5 : raw;
  return {
    title: `Chance of being spotted this hour: ${pc(p)}`,
    lines: [...(watchers.length ? watchers.map(w => `${w.label}: ${pc(w.d)}`) : ['No watchers you know of']), ...(fogNight ? ['Fog or night: halved'] : [])],
    notes: [
      'Each watcher gets a chance; they combine as 1 − (1 − a)(1 − b)… . Outposts and MG lanes are what catch infiltrators (Biddle, p. 55). Values NOTIONAL.',
      'Unseen, the unit cannot be shot at. Once spotted it is visible this hour and the next.',
      SEEN,
    ],
  };
}

/** Sighting chance for an adjacent enemy unit. */
export function sightingTip({ p = 0, signature = 1, fogNight = false, concealed = false } = {}) {
  return {
    title: `Chance to see it: ${pc(p)}`,
    lines: [`Base 90% × signature ${n2(signature)} (posture × terrain × formation)`, ...(fogNight ? ['Fog or night: halved'] : []), ...(concealed ? ['Concealed until it fires'] : [])],
    notes: ['Same sector: seen exactly. Next to you with line of sight: type only, not losses. Observers report movement 2–3 sectors out, an hour late. Values NOTIONAL.'],
  };
}

/** Cohesion of an attacking unit. */
export function cohesionTip({ coh = 1, rows = 0, outOfRange = 0, contact = 0, rest = 0 } = {}) {
  return {
    title: `Cohesion ${pc(coh)}`,
    lines: [`Rows advanced: −6% each (${rows})`, `Hours beyond your guns’ range: −10% each (${outOfRange})`, `Hours in contact: −4% each (${contact})`, `Hours consolidating or resting: +10% each (${rest})`],
    notes: [
      'Floor 30%. Cohesion multiplies the unit’s fire and its assault strength.',
      'Depth wears an attack down as it advances: Biddle calls it the "entropic effect of depth" (p. 47). Rates NOTIONAL.',
    ],
  };
}

/** Counterattack window on a lodgment: CA_mult. */
export function windowTip({ ca = 1, coh = 1, outsideArty = false, consolidated = false, hcap = 0 } = {}) {
  const st = consolidated ? 'closed (dug in)' : ca >= 1.6 && hcap <= 3 ? 'open' : 'closing';
  return {
    title: `Counterattack window ${st}: × ${n2(ca)}`,
    lines: [`Lodgment cohesion ${pc(coh)}: + ${n2(1 - coh)}`, `Beyond the attacker’s guns: ${outsideArty ? '+ 0.5' : 'no'}`, `Consolidated: ${consolidated ? '− 0.5' : 'not yet'}`, `Hours since taken: ${hcap} (consolidates after 2 static hours)`],
    notes: [
      'The multiplier divides the strength the lodgment needs to hold; kept between 0.6 and 2.5 (NOTIONAL).',
      'Strike before the attacker consolidates and beyond his artillery (Hunzeker pp. 61–62, 79); counterattacks retake ground cheaply (Biddle pp. 47–48).',
      SEEN,
    ],
  };
}

/** Survival per observed hour on the move: P = T^(−k2' × v). */
export function survivalTip({ p = 1, T = 1.8, k2 = 0.008, v = 1, mode = 'road' } = {}) {
  return {
    title: `Survives each observed hour: ${pc(p)}`,
    lines: [`Technology index T = ${n2(T)} (Biddle eq. A.1, p. 211)`, `Speed ${n2(v)} sectors an hour (${mode})`, `P = T^(−${k2} × speed)`],
    notes: [`Faster moves are exposed more; the deadlier the era, the more a covered, slower route pays (Biddle eq. A.5 and Fig. A.13, pp. 212, 233). The ${k2} is a NOTIONAL rescale of Biddle’s k2.`],
  };
}

export function breakdownTip({ p = 0.12 } = {}) {
  return { title: `Breakdown chance: ${pc(p)} an hour`, lines: ['Early tanks broke down often'], notes: ['NOTIONAL rate, shaped by Hunzeker pp. 110–111 and Biddle p. 35.'] };
}

export function messageTip({ pLoss = 0.2, delay = 2, era = 'w' } = {}) {
  return {
    title: `Message lost: ${pc(pLoss)}`,
    lines: [`Delay ${delay} h`, era === 'w' ? 'Runner; a surviving telephone line cuts it to 1 h' : 'Radio; jamming adds an hour and can lose it'],
    notes: [era === 'w' ? 'In 1917–18 messages took hours and fire plans could not change after zero hour (Hunzeker p. 52). Values NOTIONAL.' : 'Values NOTIONAL.'],
  };
}

export function ammoTip({ left = 0, total = 1 } = {}) {
  return { title: `Ammunition left: ${pc(left / (total || 1))}`, lines: [`${left} of ${total} battery-hours`, 'Suppress 1; Destroy 10 an hour'], notes: ['Destroying a dug-in target takes about ten times the shells of suppressing it (Biddle p. 37). Budgets NOTIONAL.'] };
}

export function masteryTip({ share = 0, card = 'this card' } = {}) {
  return {
    title: `Trained: ${pc(share)}`,
    lines: [`Units able to fight with ${card}`, 'Mastered at 50% or more'],
    notes: ['An army has learned a method when most frontline units can use it (Hunzeker p. 37). Untrained units fall back on the old way.'],
  };
}

export function testTip({ p = 0.6, rigor = false } = {}) {
  return {
    title: `Test reads the cause right: ${pc(p)}`,
    lines: [rigor ? 'Your assessment staff is rigorous' : 'No rigorous assessment staff'],
    notes: ['A test can fail through poor execution rather than a bad idea (Hunzeker p. 71). Values NOTIONAL.'],
  };
}

export function fidelityTip({ p = 0.4 } = {}) {
  return {
    title: `Faithful copy: ${pc(p)}`,
    lines: ['Base 40%, + 30% with a rigorous staff, + 20% with captured documents'],
    notes: ['A poor copy takes the form without the rules (Hunzeker pp. 117–118). Values NOTIONAL.'],
  };
}

/** QA fix: the "i" for a learning card's estimated effect (analysis or experimental-unit test). */
export function effectTip({ est = 0, sd = 0, n = 0, from = 'analysis' } = {}) {
  return {
    title: `Estimated effect: ${est >= 0 ? '+' : ''}${pc(est)} ± ${pc(sd)}`,
    lines: [
      'The measured gain when units use the method against when they do not: relative change in the exchange ratio plus relative change in ground held',
      from === 'test' ? `From ${n} trials by your experimental unit; an execution failure lowers the result` : 'From what your units reported trying in the last battle; your assessment staff sets how noisy the estimate is',
      '± is one standard deviation of the estimate',
    ],
    notes: ['Success in unusual conditions can teach a false lesson (Hunzeker pp. 147–148). Values NOTIONAL.'],
  };
}

export function replayTip({ wins = 0, games = 0, label = 'your orders' } = {}) {
  return {
    title: `Won ${pc(games ? wins / games : 0)} of ${games} replays`,
    lines: [`Replays of ${label} with fresh dice`],
    notes: ['Each replay reruns the same map and plan with new dice, so this is a game-model estimate, not a forecast.'],
  };
}

export function coverageTip({ share = 0 } = {}) {
  return {
    title: `${pc(share)} of battle-zone sectors covered from two or more directions`,
    lines: ['Counts MG lanes and frontal fire from neighbouring sectors'],
    notes: ['Siting weapons to fire across each other’s fronts removes the attacker’s dead ground (Biddle p. 44).'],
  };
}

/** Every builder, by the percentage it explains (tests render each one). */
export const TIP_BUILDERS = {
  strength: strengthTip, stall: stallTip, suppression: suppressionTip, expectedLoss: expectedLossTip,
  detection: detectionTip, sighting: sightingTip, cohesion: cohesionTip, window: windowTip, survival: survivalTip,
  breakdown: breakdownTip, message: messageTip, ammo: ammoTip, mastery: masteryTip, test: testTip,
  fidelity: fidelityTip, replay: replayTip, coverage: coverageTip, effect: effectTip,
};

// ---- Start tips (one line per hidden mechanic; dismissible aside, top of the Map tab on phones) ----

/** Topics each side's tips must cover (tests check every one is present). `learning` shows in a campaign only. */
export const TIP_TOPICS = {
  def: ['fog', 'enfilade', 'deadGround', 'depth', 'suppression', 'counterattack', 'orders', 'learning'],
  att: ['objective', 'fog', 'enfilade', 'leapfrog', 'barrage', 'infiltration', 'cohesion', 'counterstroke', 'orders', 'learning'],
};

const ORDERS = {
  def: {
    w: 'Orders reach units by runner and telephone: most start next hour. Local counterattacks (ripostes) go in the hour you order them (in a campaign, once your army has learned that authority). Gas shells mark a sector for 3 hours: men there are masked and slowed, on both sides. Until you order them, standing orders (see the panel when nothing is selected) launch your counterattack formation into a lodgment inside its window, move idle companies to block, and fire your guns; switch any of them off to do that job yourself.',
    m: 'Orders go by radio and start at once, unless the enemy jams the area (an hour late, sometimes lost). His drones see dead ground and strike men caught moving in the open; mines hold attackers in your fire; precision rockets and counter-battery hunt located batteries and teams. Your EW team jams his drones and radios. Until you order them, standing orders (see the panel when nothing is selected) launch your counterattack formation into a lodgment inside its window, move idle companies to block, and fire your guns; switch any of them off to do that job yourself.',
  },
  att: {
    w: 'Orders reach units by runner and telephone: most start next hour, and once the battle starts a change to the barrage plan is a runner message, two hours late and sometimes lost. Gas shells mark a sector for 3 hours: men there are masked and slowed, on both sides, so gas his batteries and flanks, not your own axis. Until you order them, standing orders (see the panel when nothing is selected) keep your leading companies rushing behind the barrage and leapfrogging against live fire, send follow-on waves in behind success, and let direct-support batteries answer calls; switch any of them off to do that job yourself.',
    m: 'Orders go by radio and start at once, unless the enemy jams the area (an hour late, sometimes lost). Drones find his men and strike any caught moving in the open, so his static, dug-in men are hard to hit and yours on the move are easy; mines must be breached by engineers; precision rockets and counter-battery hunt located batteries; your EW team jams his drones and radios. Until you order them, standing orders (see the panel when nothing is selected) keep your leading companies rushing behind the barrage and leapfrogging against live fire, send follow-on waves in behind success, and let direct-support batteries answer calls; switch any of them off to do that job yourself.',
  },
};

const T = {
  def: {
    fog: ['Fog of war', 'You see attackers only next to your units or under an observer. Small groups and infiltrators are hard to spot. Your trench lines are already on his maps; your garrisons and concealed works are not.'],
    enfilade: ['Enfilade', 'Your MG companies are your enfilade weapon: only they lay fire lanes. Lay each lane across his line of advance from a flank. Flanking fire ignores the cover he faces and hits waves × 3, small groups nearly as hard; fire from the front is stopped by cover.'],
    deadGround: ['Dead ground', 'Every sector has folds where he can shelter. Covering a sector from two or more directions removes most of them (the Coverage layer shows how many).'],
    depth: ['Depth', 'A thin outpost zone warns and delays, the battle zone kills, and the rear zone holds your counterstroke. Dense front lines die to bombardment.'],
    suppression: ['Suppression', 'His barrage keeps your men’s heads down while it falls. If it lifts before his infantry arrive, your men man the parapet and fire.'],
    counterattack: ['Counterattack timing', 'Strike a lodgment before it consolidates (2 hours) and beyond his guns. Local counterattacks (ripostes) by units next to it go in at once; a deliberate counterattack by the counterstroke formation needs its planning time.'],
    learning: ['Learning', 'Between battles you can learn only from what your units tried. What you study, test, codify and train decides what your army can do next time.'],
  },
  att: {
    objective: ['The objective', 'You win only if, at the end of the last hour, you hold enough side-by-side sectors of the objective line with no unbroken defender in them. Losses do not decide the game.'],
    fog: ['Fog of war', 'You know his trench lines from the air, not his garrisons. Strongpoints and dummies look alike. Units out of sight of yours are guesses.'],
    enfilade: ['Enfilade and dead ground', 'His MG companies lay fire lanes. Waves caught by a lane from the flank lose three times as many, small groups nearly as many; only storm infiltrators slip through without it. Leapfrog and infiltration use folds in the ground (dead ground) if you have scouted them.'],
    leapfrog: ['Leapfrog', 'Pair two units. Each hour one fires on the target while the other bounds, then they swap. Without an overwatch partner that can see the target, the bounding unit is badly exposed.'],
    barrage: ['Barrage timing', 'Your creeping barrage suppresses the defenders only while it falls on them. Lift too early and they man the parapet; too late and your infantry walk into their own shells. Match the lift rate to your infantry’s pace.'],
    infiltration: ['Infiltration', 'Storm companies can slip past posts unseen, but each hour near outposts or MG lanes risks detection. Bypassed posts keep firing at your next wave until mopped up.'],
    cohesion: ['Cohesion in depth', 'Every row you advance, and every hour beyond your guns’ range, wears your units down. A deep penetration is weakest when it arrives.'],
    counterstroke: ['The counterstroke', 'His counterattack formation waits in the rear zone. A fresh lodgment that has not consolidated (2 hours) is easy to throw back; consolidate or keep moving under your guns.'],
  },
};

/** Start tips for `side` ('def' | 'att'), era ('w' 1917–18 | 'm' Modern), mode ('s' single | 'c' campaign):
 * [{ key, title, text }]. */
export function startTips(side, era = 'w', mode = 's') {
  const set = side === 'att' ? 'att' : 'def';
  return TIP_TOPICS[set].filter(k => k !== 'learning' || mode === 'c').map(k => {
    if (k === 'orders') return { key: k, title: era === 'm' ? 'Orders, drones, mines and EW' : 'Orders, runners and gas', text: ORDERS[set][era === 'm' ? 'm' : 'w'] };
    if (k === 'learning' && set === 'att') return { key: k, title: T.def.learning[0], text: T.def.learning[1] };
    const [title, text] = T[set][k];
    return { key: k, title, text };
  });
}

/** Every start tip by side and era, campaign mode (for the rules page and the tests). */
export const START_TIPS = { def: { w: startTips('def', 'w', 'c'), m: startTips('def', 'm', 'c') }, att: { w: startTips('att', 'w', 'c'), m: startTips('att', 'm', 'c') } };
