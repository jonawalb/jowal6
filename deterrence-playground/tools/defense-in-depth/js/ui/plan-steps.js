// The stepped "Your plan" panel (UI streamline #3). Pure: no DOM, no engine imports. Each side plans in five
// steps, one shown at a time under a summary bar whose chips give each step a short status. The plan object
// and every rule stay where they were (js/plan-def.js, js/plan-att.js); this file only names and sums up.

export const PLAN_STEPS = {
  def: [
    { id: 'zones', name: 'Zones', lead: 'Depth: keep the front thin and hold a share back for the counterattack. Dense front lines die to bombardment.' },
    { id: 'lanes', name: 'MG lanes', lead: 'Enfilade: machine-gun fire along the attackers’ line, from a flank, kills far more than fire from the front.' },
    { id: 'works', name: 'Works', lead: 'Obstacles hold attackers in your fire; strongpoints keep shooting into the flanks of a break-in.' },
    { id: 'cs', name: 'Counterattack', lead: 'Counterattack: a sector he has just taken is easiest to retake in its first two hours.' },
    { id: 'arty', name: 'Artillery', lead: 'Coordinating fires: defensive fire falls the moment attackers enter its sectors, with no delay.' },
  ],
  att: [
    { id: 'front', name: 'Frontage', lead: 'Frontage: concentrate on a few columns and pin the rest, so his reserves cannot shift.' },
    { id: 'bns', name: 'Battalions', lead: 'Leapfrog: one company fires while the other bounds forward; small groups are harder to hit.' },
    { id: 'infil', name: 'Infiltration', lead: 'Infiltration: storm companies slip past strongpoints along routes he does not watch.' },
    { id: 'fire', name: 'Fire plan', lead: 'Barrage timing: the infantry must arrive just as the barrage lifts, not before and not after.' },
    { id: 'res', name: 'Reserves', lead: 'Exploitation: send the follow-on wave where you have broken in, before his counterattack arrives.' },
  ],
};

export const stepsFor = side => PLAN_STEPS[side === 'att' ? 'att' : 'def'];
/** Clamp a step number (1-based) to the side's steps. */
export const clampStep = (side, n) => Math.max(1, Math.min(stepsFor(side).length, Math.round(+n || 1)));

const pc = x => `${Math.round((+x || 0) * 100)}%`;

/**
 * Defender chips. s: { fr, fwd, lanes, mgs, wp, wpMax, cs (name or null), sos, bats }.
 * Returns [{ id, name, val, warn }] in step order.
 */
export function defChips(s) {
  const [z, l, w, c, a] = PLAN_STEPS.def;
  return [
    { ...z, val: `${pc(s.fr)} held back`, warn: s.fwd > 0.5 },
    { ...l, val: `${s.lanes} of ${s.mgs} laid`, warn: s.lanes < s.mgs },
    { ...w, val: `${s.wp} of ${s.wpMax} pts`, warn: false },
    { ...c, val: s.cs ? 'force chosen' : 'none chosen', warn: !s.cs },
    { ...a, val: `${s.sos} of ${s.bats} batteries`, warn: s.sos < s.bats },
  ].map(({ lead, ...x }) => x);
}

/**
 * Attacker chips. s: { main, pin, bns, leapfrog, routes, storm, prep, barrage (rate or null), gaps, follow }.
 */
export function attChips(s) {
  const [f, b, i, fp, r] = PLAN_STEPS.att;
  const PREP = { none: 'No preparation', hurricane: 'Hurricane', methodical: 'Methodical' };
  return [
    { ...f, val: `${s.main} main · ${s.pin} pin`, warn: s.main === 1 },
    { ...b, val: `${s.leapfrog} of ${s.bns} leapfrog`, warn: false },
    { ...i, val: s.storm ? `${s.routes} of ${s.storm} routes` : 'no storm units', warn: false },
    { ...fp, val: `${PREP[s.prep] || 'No preparation'} · ${s.barrage ? `barrage ${s.barrage}/h` : 'no barrage'}`, warn: s.gaps > 0 },
    { ...r, val: s.follow ? `${s.follow} follow${s.follow === 1 ? 's' : ''} success` : 'all wait', warn: false },
  ].map(({ lead, ...x }) => x);
}
