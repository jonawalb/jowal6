// Maneuver Trainer core: unit types, roles and formations.
// Roles follow ATP 3-21.8 (2024, C1 2025): fire team = team leader (tl), automatic rifleman (ar),
// grenadier (gr), rifleman (r) (para 1-11); squad = two fire teams and a squad leader (sl)
// (para 1-9); platoon headquarters = platoon leader (pl), radiotelephone operator (rto), platoon
// sergeant (psg); weapons squad machine gun teams = gunner (mg) + assistant gunner (ag).
// Formations: fire team wedge / file (line is the game's addition); squad column / line / file (no squad wedge);
// platoon column / line / wedge / vee. Offsets match kit/terrain.mjs (u forward, v left).
// Pure; no dependencies.

// ===================== NOTIONAL =====================
// Every tunable number of the simulation lives here. They are NOTIONAL teaching values chosen so
// the doctrinal lesson of each scenario shows up; they are not data, not weapons effects, and not
// a US Army model. World units are notional metres; time is seconds of game time.
export const NOTIONAL = {
  dt: 0.1, combatDt: 0.5,
  // fire volume per role (rifle = 1; automatic rifle 3; medium machine gun 6; tank 12)
  weapon: { tl: 1, ar: 3, gr: 1.6, r: 1, sl: 0.8, pl: 0.6, rto: 0.4, psg: 0.8, mg: 6, ag: 0.6, wsl: 0.8, mtr: 0, veh: 12, ifv: 7, obs: 0.6 },
  longRole: { mg: 1, veh: 1, ifv: 1, ar: 0.5 },  // share of the weapon that keeps effect at long range
  rangeRifle: 230, rangeLong: 480,       // range factor 1 / (1 + (d / R)^2)
  maxRange: 650,
  speed: { travelling: 1.5, overwatch: 1.25, bounding: 1.0, infiltrate: 0.75, assault: 2.1, rush: 2.6, crawl: 0.3, withdraw: 2.4, vehicle: 3.5 },
  turnF: 40, turnH: 8,   // deg/s a stationary element turns toward its target (player / OPFOR)
  suppFire: 0.85,       // share of fire lost at full suppression
  moveFire: 0.25,       // share of fire an element delivers while moving
  displacePinned: 0.5,  // share of speed a displacing delay element keeps when pinned
  contactSlow: 0.55,     // fire and movement: share of speed kept when in contact
  woodsSlow: 0.75, bedSlow: 0.85,
  pinAt: 0.62, unpinAt: 0.42, pinAssault: 0.88,  // suppression thresholds
  spot: { base: 0.8, range: 320, limited: 0.36, firing: 3.0, firingRange: 1.7, alertBoost: 1.4, sector: 0.12, optics: 1.5, observerHidden: 0.25, unalert: 0.15, confirm: 3, forget: 45 },
  bound: 45, boundCover: 2,             // length of one bound when breaking contact by alternating bounds
  exposure: { infiltrate: 0.5, stand: 1, move: 1.25, kneel: 0.55, crouch: 0.5, prone: 0.3, hole: 0.14, building: 0.17, veh: 1.6 },
  vuln: { move: 1.3, stand: 1, kneel: 0.45, crouch: 0.55, prone: 0.34, hole: 0.12, building: 0.15, veh: 0.04, vehAT: 0.35, flankHole: 0.5, enfilade: 0.9 },
  ks: 0.25, suppCover: 0.4, suppSize: 4,             // suppression: target = 1 - exp(-ks * effective volume)
  kc: 0.0022,            // casualties per second per unit of effective volume x vulnerability
  vehSupp: 0.08,         // armored vehicles shrug off small-arms suppression
  unanswered: 1.6,       // fire from a shooter that is not being fired at
  fpl: { range: 160, mult: 2.6 },  // dug-in positions firing to their front at close range
  sbfBonus: 2.6,         // aimed suppressive fire from a set support-by-fire position
  areaFire: 0.55,        // fire at a last-known or reported position (not currently seen)
  suppDecay: 0.07, suppRise: 0.6,
  assault: { range: 32, lethal: 0.55, cohesionHit: 0.22, posBonus: 1.6, flankBonus: 1.3 },
  cohesion: { perLoss: 1.1, flank: 0.012, recover: 0.004, breakDef: 0.32, breakAtt: 0.3, rally: 0.5 },
  mortar: { r: 38, supp: 1.4, kc: 0.05, smokeR: 46, smokeLife: 75, delay: 25 },
  smokeGrenade: { r: 24, life: 75, delay: 2 },
  dig: { rate: 1 / 240, max: 0.8, sbf: 0.45, sbfRate: 1 / 60 },  // protection: holding digs in; a set support-by-fire position takes hasty cover      // protection gained per second when holding (to max)
  breach: { time: 75, hastyMult: 3, mineKc: 0.03 },
  casevac: { speed: 0.9, maxShare: 0.34, suppMax: 0.35 },
  hardDelay: [10, 20],   // company-level order delay in Hard (s)
  fireShare: { floor: 0.15 },  // Fig 1 curve: 15% + 85% * ((1 + cos th) / 2)^3
};
// =================== end NOTIONAL ===================

export const ROLE_NAMES = {
  tl: "team leader", ar: "automatic rifleman", gr: "grenadier", r: "rifleman", sl: "squad leader",
  pl: "platoon leader", rto: "radiotelephone operator", psg: "platoon sergeant", mg: "machine gunner",
  ag: "assistant gunner", wsl: "weapons squad leader", mtr: "mortar crew", veh: "tank", ifv: "armored vehicle", obs: "observer",
};
// role → weapon factor (fire volume), drawn kit role
export const weapon = (role) => NOTIONAL.weapon[role] ?? 1;
export const kitRole = (role) => ({ wsl: "sl", psg: "r", mtr: "r", obs: "r", ifv: "veh" }[role] || role);

const S = 5; // formation interval in world units (notional metres)

export function fireTeamOffsets(form = "wedge", s = S) {
  return {
    wedge: [[0, 0], [-s, -s], [-s, s], [-2 * s, 2 * s]],
    file: [[0, 0], [-s, 0], [-2 * s, 0], [-3 * s, 0]],
    line: [[0, 0], [0, -s * 1.1], [0, s * 1.1], [0, s * 2.2]],
  }[form] || fireTeamOffsets("wedge", s);
}
// squad of 9: [A tl, ar, gr, r, SL, B tl, ar, gr, r]
export function squadOffsets(form = "column", s = S) {
  const A = fireTeamOffsets(form === "file" ? "file" : form === "line" ? "line" : "wedge", s);
  const add = (L, du, dv) => L.map(([u, v]) => [u + du, v + dv]);
  if (form === "line") return [...add(A, 0, s * 2.6), [-s * 1.4, 0], ...add(A, 0, -s * 1.6)];
  if (form === "file") return [...A, [-s * 4, 0], ...add(A, -s * 5, 0)];
  return [...A, [-s * 3, 0], ...add(A, -s * 4.6, 0)];
}
export function platoonOffsets(form = "column", s = S) {
  const sq = squadOffsets(form === "line" ? "line" : "column", s);
  const D = s * 9, W = s * 6.5;
  const at = { column: [[0, 0], [-D, 0], [-2 * D, 0]], line: [[0, W], [0, 0], [0, -W]], wedge: [[0, 0], [-D * 0.7, W], [-D * 0.7, -W]], vee: [[0, W * 0.7], [0, -W * 0.7], [-D * 0.8, 0]] }[form] || [[0, 0], [-D, 0], [-2 * D, 0]];
  const out = [];
  at.forEach(([du, dv]) => sq.forEach(([u, v]) => out.push([u + du, v + dv])));
  const hq = form === "column" ? [-D * 0.55, 0] : [-D * 0.45, 0];
  out.push(hq, [hq[0] - s * 0.6, hq[1] - s * 0.8], [hq[0] - s * 2.2, hq[1] + s * 0.4]);
  return out;
}
const lineOffsets = (n, s = S) => Array.from({ length: n }, (_, i) => [0, (i - (n - 1) / 2) * s * 1.2]);
const fileOffsets = (n, s = S) => Array.from({ length: n }, (_, i) => [-i * s, 0]);

// Composition per kind (roles in order). Notional counts; sizes are counted from the roles.
export const KINDS = {
  buddy: { label: "buddy team", formations: ["wedge", "file", "line"] },
  team: { label: "fire team", roles: ["tl", "ar", "gr", "r"], formations: ["wedge", "file", "line"] },
  squad: { label: "rifle squad", roles: ["tl", "ar", "gr", "r", "sl", "tl", "ar", "gr", "r"], formations: ["column", "line", "file"] },
  mg: { label: "machine gun team", roles: ["mg", "ag"], formations: ["file", "line"] },
  hq: { label: "platoon headquarters", roles: ["pl", "rto", "psg"], formations: ["file", "line"] },
  platoon: { label: "rifle platoon", formations: ["column", "line", "wedge", "vee"] },
  mortar: { label: "mortar section", roles: ["mtr", "mtr", "mtr", "mtr"], formations: ["line"] },
  tank: { label: "tank section", roles: ["veh", "veh"], formations: ["line", "file"] },
  pos: { label: "position", formations: ["line"] },
};
export function platoonRoles() {
  const sq = KINDS.squad.roles;
  return [...sq, ...sq, ...sq, "pl", "rto", "psg"];
}

// Formation offsets for an element with n members (cached).
const OFF_CACHE = new Map();
export function offsetsFor(kind, form, n) {
  const key = `${kind}|${form}|${n}`;
  let c = OFF_CACHE.get(key);
  if (!c) { c = offsetsRaw(kind, form, n); OFF_CACHE.set(key, c); }
  return c;
}
function offsetsRaw(kind, form, n) {
  let o;
  if (kind === "team" || (kind === "buddy" && n === 4)) o = fireTeamOffsets(form);
  else if (kind === "squad" && n === 9) o = squadOffsets(form);
  else if (kind === "platoon" && n === 30) o = platoonOffsets(form);
  else if (kind === "tank") o = form === "file" ? fileOffsets(n, 18) : lineOffsets(n, 16);
  else if (kind === "mortar") o = lineOffsets(n, 4);
  else if (form === "file") o = fileOffsets(n);
  else if (kind === "buddy") o = form === "line" ? [[0, 0], [0, -S * 1.1]] : [[0, 0], [-S * 0.8, -S * 0.9]];
  else o = lineOffsets(n);
  while (o.length < n) o.push([-(o.length) * S * 0.5, 0]);
  return o.slice(0, n);
}

// Element factory from scenario data.
// spec: { id, side: "f"|"h", kind, name, roles?, at: [x, y], face, formation, pose, slots?, dug, smoke }
//   slots: explicit soldier positions [[x, y, face?]...] for enemy fighting positions (pose "hole"/"building")
export function makeElement(spec) {
  const kind = spec.kind;
  const roles = spec.roles || (kind === "platoon" ? platoonRoles() : KINDS[kind]?.roles) || ["r"];
  const el = {
    id: spec.id, side: spec.side, kind, name: spec.name || spec.id, short: spec.short || spec.name || spec.id,
    x: spec.at[0], y: spec.at[1], face: spec.face ?? 90, formation: spec.formation || (KINDS[kind]?.formations || ["line"])[0],
    supp: 0, cohesion: 1, task: spec.task || "Hold", pose0: spec.pose || null, slots: spec.slots || null,
    dug: spec.dug ?? 0, smoke: spec.smoke ?? 0, vehicle: kind === "tank", ally: !!spec.ally,
    soldiers: [], orders: [], order: null, size: roles.length, ai: spec.ai || null,
    stats: { firedAt: {}, recvFlank: 0, shotsFired: 0 },
    // runtime fields (declared here so every element keeps one fixed shape; the sim fills them)
    home: [spec.at[0], spec.at[1]], steps: [], si: -1, actions: [], recvT: -99, flankT: -99, fireT: -99, holdT: null, prot: spec.dug ?? 0,
    alert: false, path: null, seg: 0, arrived: false, complete: false, lifted: false, sbfT: null, breachT: 0, lookI: 0, dwell: 0,
    blocked: false, hasty: 0, curSpeed: 0, curTarget: null, inAssault: false, stalled: false, pinned: false, inContact: false,
    ok: 0, cx: spec.at[0], cy: spec.at[1], expo: 0, eye: 1.7, protAvg: 0, suppIn: 0, fireTarget: null, fireOn: 0, lossT: -99,
    pinLogT: -99, spotCount: 0, spotT: -99, barrier: false, boundState: null, boundFirst: false, boundLeft: 0, boundT: 0, observing: null, adv: null, settled: false, _form: null, _offs: null, formFace: null, surrendered: false, withdrawing: false, broken: false, committed: false, noFire: false,
  };
  roles.forEach((role, i) => {
    const slot = spec.slots?.[i];
    el.soldiers.push({
      id: `${spec.id}.${i + 1}`, el: spec.id, side: spec.side, role, kitRole: kitRole(role), i,
      x: slot ? slot[0] : spec.at[0], y: slot ? slot[1] : spec.at[1], face: slot?.[2] ?? el.face,
      pose: spec.pose || "stand", status: "ok", carry: null, carriedBy: null, dist: 0, moving: false, downT: -1, evac: false, assigned: false,
    });
  });
  return el;
}
