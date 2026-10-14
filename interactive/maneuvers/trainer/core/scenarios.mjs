// Maneuver Trainer core: the 12 scenarios as data (fictional places, generic OPFOR, notional numbers).
// Each scenario: id, n, level ("fireteam"|"platoon"|"company"), title, timeLimit (s), briefing
// (mission / enemy / terrain / troops / time), concepts (figure links), terrain (kit-drawable spec,
// see terrain.mjs), forces (friendly / enemy element specs, see units.mjs makeElement), routes
// (named polylines), triggers (named), plans (3–4 schemes of maneuver; exactly one doctrinal; one
// flagged naive), choices (per element: tasks / routes / triggers the planning board offers),
// evaluate(S, api) → null | { reason, tier }, onTimeout(S, api) → { reason, tier }, aarNotes().
// World units are notional metres: fire team ≈ 600×400, platoon ≈ 900×600, company ≈ 1400×900.
// +y is "north" (up the map); facing in degrees, 90 = north, 270 = south (kit fdFrame convention).

import { blobRing } from "./terrain.mjs";
import { NOTIONAL as N } from "./units.mjs";

const FIGS = {
  "flank-attack": [1, "Fix and Flank"], "double-envelopment": [2, "Double Envelopment"], "turning-movement": [3, "Turning Movement"],
  penetration: [4, "Penetration and Exploitation"], infiltration: [5, "Infiltration"], "frontal-attack": [6, "Frontal Attack"],
  "decisive-points": [8, "Decisive Points"], "culminating-point": [9, "Culminating Point"], "main-effort": [17, "Main Effort and Economy of Force"],
  "recon-pull": [19, "Reconnaissance Pull"], "surfaces-and-gaps": [20, "Surfaces and Gaps"], bypass: [21, "Bypassing Strongpoints"],
  "combined-arms-dilemma": [22, "Combined Arms Dilemma"], omg: [26, "Operational Maneuver Group"], "elastic-defense": [27, "Elastic Defense in Depth"],
  "mobile-defense": [28, "Mobile Defense"], retrograde: [29, "Retrograde and Delay"],
};
const tag = (slug) => ({ slug, fig: FIGS[slug][0], title: FIGS[slug][1], href: `/interactive/maneuvers/${slug}/` });
const R = (label, pts) => ({ label, pts });
const TG = (label, trig) => ({ label, trig });
const holes = (pts, face) => pts.map(([x, y]) => [x, y, face]);
const okIn = (S, side, x, y, r) => S.soldiers.filter((s) => s.side === side && s.status === "ok" && Math.hypot(s.x - x, s.y - y) <= r).length;
const allOut = (S, ids) => ids.every((id) => S.flags[`cleared:${id}`]);

// ======================================================================================
// 1. HEDGEROW GUN (fire team)
// ======================================================================================
const hedgerow = {
  id: "hedgerow-gun", n: 1, level: "fireteam", title: "Hedgerow Gun", timeLimit: 720,
  briefing: {
    mission: "Your squad is pinned behind the stone wall at Carrow Farm. Your fire team knocks out the enemy machine gun at the hedge corner so the squad can move.",
    enemy: "A machine gun team (gunner and assistant) dug in at the corner of the hedgerow 170 m north, firing south across the field. No other enemy seen.",
    terrain: "Open pasture between the wall and the hedgerow. A dry ditch runs north along the field's west edge, past the hedge's west end. The hedgerow screens the ground behind it.",
    troops: "One fire team (team leader, automatic rifleman, grenadier, rifleman) in two buddy teams. Two smoke grenades (one per buddy team).",
    time: "12 minutes before the squad must move.",
  },
  concepts: [tag("flank-attack"), tag("frontal-attack"), tag("combined-arms-dilemma")],
  terrain: {
    world: { w: 600, h: 400 }, light: "day",
    rises: [{ cx: 520, cy: 80, r: 60, steps: 2, h: 2, top: 0.5, seed: 4 }],
    woods: [{ ring: blobRing(90, 360, 60, 3, 0.15, 40, 0.7) }, { ring: blobRing(540, 360, 55, 8, 0.15, 40, 0.8) }],
    hedges: [[[244, 290], [300, 290], [380, 290]], [[380, 290], [382, 340], [385, 400]]],
    walls: [[[140, 118], [300, 118], [470, 118]]],
    ditches: [{ pts: [[238, 60], [238, 118], [235, 200], [232, 290], [236, 330], [240, 400]], w: 4 }],
    roads: [{ pts: [[-20, 60], [300, 64], [620, 70]], w: 4 }],
    fields: [{ cx: 290, cy: 205, w: 330, d: 150, ang: 0, tint: "a" }, { cx: 290, cy: 345, w: 160, d: 90, ang: 0, tint: "b" }],
  },
  forces: {
    friendly: [
      { id: "sup", kind: "buddy", name: "AR buddy team", short: "AR team", roles: ["ar", "gr"], at: [330, 115], face: 90, formation: "line", smoke: 1 },
      { id: "man", kind: "buddy", name: "TL buddy team", short: "TL team", roles: ["tl", "r"], at: [255, 115], face: 90, formation: "file", smoke: 1 },
    ],
    enemy: [
      { id: "mg", kind: "mg", name: "Enemy machine gun", roles: ["mg", "ag"], at: [372, 284], face: 270, pose: "hole", slots: holes([[370, 284], [375, 286]], 270), dug: 0.5, ai: { type: "defend" } },
    ],
  },
  objective: { x: 372, y: 284, r: 25, label: "MG position" }, objectiveEls: ["mg"], ccp: [300, 100],
  routes: {
    wall: R("Along the wall to a firing point", [[330, 115], [345, 115]]),
    ditch: R("West ditch, then behind the hedge", [[255, 115], [238, 117], [235, 200], [232, 288], [240, 330], [335, 330], [372, 290]]),
    frontal: R("Straight across the field", [[255, 115], [320, 200], [370, 284]]),
    frontal2: R("Straight across the field (right)", [[330, 112], [350, 200], [374, 284]]),
    east: R("Wide right across the open", [[255, 115], [470, 140], [470, 260], [430, 300], [374, 288]]),
  },
  triggers: {
    liftNear: TG("Lift when the TL team is 35 m from the gun", { when: "near", el: "man", target: "mg", dist: 35 }),
    sbfSet: TG("When the AR team has set support by fire", { when: "sbfSet", el: "sup" }),
    now: TG("At once", { when: "start" }),
    atAP: TG("When the TL team is behind the hedge", { when: "near", el: "man", target: [335, 330], dist: 12 }),
  },
  plans: [
    {
      id: "fix-flank", name: "Fix and flank", form: "Envelopment (fix and flank)", doctrinal: true, concepts: ["flank-attack", "combined-arms-dilemma"],
      summary: "The AR buddy team sets support by fire from the wall and keeps the gun suppressed; the TL buddy team uses the west ditch and the hedge to close on the gun's flank, then the AR team lifts (stops firing and stays) as the TL team goes in.",
      assign: { sup: { task: "sbf", route: "wall", target: "mg", trigger: "liftNear" }, man: { task: "assault", route: "ditch", target: "mg", trigger: "sbfSet", technique: "travelling" } },
    },
    {
      id: "frontal-rush", name: "Everyone rush the gun", form: "Frontal attack", naive: true, concepts: ["frontal-attack"],
      summary: "Both buddy teams rush straight across the open field at the gun.",
      assign: { sup: { task: "assault", route: "frontal2", target: "mg", trigger: "now" }, man: { task: "assault", route: "frontal", target: "mg", trigger: "now" } },
    },
    {
      id: "fix-frontal", name: "Suppress, then go straight in", form: "Frontal attack with a base of fire", concepts: ["frontal-attack"],
      summary: "The AR team suppresses from the wall; the TL team assaults straight across the field.",
      assign: { sup: { task: "sbf", route: "wall", target: "mg", trigger: "liftNear" }, man: { task: "assault", route: "frontal", target: "mg", trigger: "sbfSet" } },
    },
    {
      id: "wide-right", name: "Wide right across the pasture", form: "Envelopment by a wide route across the pasture", concepts: ["flank-attack"],
      summary: "The AR team suppresses; the TL team swings wide right across open pasture to the gun's east side.",
      assign: { sup: { task: "sbf", route: "wall", target: "mg", trigger: "liftNear" }, man: { task: "assault", route: "east", target: "mg", trigger: "sbfSet" } },
    },
  ],
  choices: {
    sup: { tasks: ["sbf", "assault"], routes: ["wall", "frontal2"], triggers: ["liftNear", "now"] },
    man: { tasks: ["assault", "sbf"], routes: ["ditch", "frontal", "east"], triggers: ["sbfSet", "now", "atAP"] },
  },
  evaluate(S) {
    if (S.flags["cleared:mg"]) return { reason: "the machine gun is out of action; the squad can move", tier: 1 };
    return null;
  },
  onTimeout() { return { reason: "the gun is still firing when the squad must move", tier: 3 }; },
};

// ======================================================================================
// 2. DEAD GROUND (fire team, move undetected)
// ======================================================================================
const deadGround = {
  id: "dead-ground", n: 2, level: "fireteam", title: "Dead Ground", timeLimit: 960, stealth: true,
  briefing: {
    mission: "Reach the Ashby farmhouse, 450 m north-east, and set up there unseen so the platoon can use it as an observation post.",
    enemy: "An enemy observation post (two soldiers) on the low rise east of the fields, watching west. If it sees you it will call for mortar fire.",
    terrain: "Open fields between you and the farm. A stream bed runs in a shallow cut from your position almost to the farmyard; a hedgerow follows part of it. A farm track crosses the fields.",
    troops: "One fire team (team leader, automatic rifleman, grenadier, rifleman).",
    time: "16 minutes.",
  },
  concepts: [tag("infiltration"), tag("bypass")],
  terrain: {
    world: { w: 600, h: 400 }, light: "day",
    rises: [{ cx: 530, cy: 165, r: 55, steps: 2, h: 2.5, top: 0.5, seed: 6 }],
    woods: [{ ring: blobRing(60, 360, 55, 4, 0.15, 40, 0.8) }, { ring: blobRing(560, 360, 40, 9, 0.15, 40, 0.8) }],
    streams: [{ pts: [[40, -20], [80, 40], [110, 120], [170, 200], [260, 255], [350, 300], [430, 330], [462, 345], [520, 420]], w: 5 }],
    hedges: [[[130, 150], [180, 215], [260, 262], [340, 306]], [[300, 30], [360, 60], [420, 120]]],
    roads: [{ pts: [[-20, 20], [200, 40], [380, 90], [470, 180], [480, 300], [470, 420]], w: 4 }],
    houses: [{ x: 478, y: 362, ang: 10, len: 16, wid: 10 }, { x: 500, y: 338, ang: 100, len: 10, wid: 7 }],
    fields: [{ cx: 290, cy: 150, w: 260, d: 150, ang: 15, tint: "a" }, { cx: 330, cy: 340, w: 160, d: 80, ang: 20, tint: "b" }],
  },
  forces: {
    friendly: [{ id: "team", kind: "team", name: "Fire team", short: "Team", at: [80, 30], face: 60, formation: "file" }],
    enemy: [{ id: "op", kind: "pos", name: "Enemy observation post", roles: ["tl", "r"], at: [508, 166], face: 180, pose: "hole", slots: holes([[506, 164], [510, 168]], 180), dug: 0.5, ai: { type: "op", sector: 150, holdFire: 260 } }],
  },
  objective: { x: 470, y: 345, r: 26, label: "Ashby farmhouse" }, objectiveEls: [], ccp: [80, 20],
  routes: {
    stream: R("Stream bed (dead ground)", [[80, 30], [82, 42], [110, 120], [170, 200], [260, 255], [350, 300], [430, 330], [462, 346]]),
    open: R("Straight across the fields", [[80, 30], [300, 200], [462, 346]]),
    track: R("Farm track", [[80, 30], [200, 40], [380, 90], [470, 180], [480, 300], [466, 340]]),
    hedge: R("Along the northern hedge", [[80, 30], [300, 30], [360, 60], [420, 120], [440, 250], [462, 346]]),
  },
  triggers: { now: TG("At once", { when: "start" }) },
  plans: [
    { id: "stream", name: "Use the stream bed", form: "Infiltration by a covered route", doctrinal: true, concepts: ["infiltration", "bypass"],
      summary: "Move in file along the stream bed, crouched below the bank, out of the observation post's view the whole way.",
      assign: { team: { task: "move", route: "stream", technique: "overwatch", formation: "file" } } },
    { id: "dash", name: "Dash across the fields", form: "Movement by the shortest route", naive: true, concepts: [],
      summary: "Rush straight across the open fields to the farm.",
      assign: { team: { task: "move", route: "open", technique: "rush", formation: "wedge" } } },
    { id: "track", name: "Follow the farm track", form: "Road movement", concepts: [],
      summary: "Travel along the farm track, which bends past the rise.",
      assign: { team: { task: "move", route: "track", technique: "travelling", formation: "wedge" } } },
    { id: "hedge", name: "Hedge line, then the last field", form: "Movement along the hedge line", concepts: ["infiltration"],
      summary: "Use the northern hedge for most of the way, then cross the last field to the farm.",
      assign: { team: { task: "move", route: "hedge", technique: "overwatch", formation: "file" } } },
  ],
  choices: { team: { tasks: ["move"], routes: ["stream", "open", "track", "hedge"], triggers: ["now"], techniques: ["travelling", "overwatch", "infiltrate", "rush"] } },
  onTick(S, api) {
    if (S.flags.detected && !S.flags.called) {
      S.flags.called = S.t; S.flags.alert = S.t;
      const t = S.byId.team;
      S.missions.push({ side: "h", from: null, at: [t.cx, t.cy], kind: "he", t0: S.t + 40, until: S.t + 85 });
      api.log("alert", "The enemy observation post reports you and calls for mortar fire", { side: "h" });
    }
  },
  evaluate(S, api) {
    const t = S.byId.team;
    if (api.okNear("f", 470, 345, 30) >= Math.max(1, t.soldiers.filter((s) => s.status === "ok").length)) {
      return S.flags.detected ? { reason: "you reached the farmhouse, but the enemy saw you on the way", tier: 2 } : { reason: "you reached the farmhouse unseen", tier: 1 };
    }
    return null;
  },
  onTimeout() { return { reason: "you did not reach the farmhouse in time", tier: 3 }; },
  aarNotes(S) {
    return S.metrics.detectedAt != null
      ? { improve: ["Pick the route the observer cannot see: the stream bed is dead ground from the rise (Fig 5 Infiltration)."] }
      : { sustain: ["The stream bed kept you in dead ground from the observation post."] };
  },
};

// ======================================================================================
// 3. CROSSROADS RECON (fire team, reconnaissance; fighting = failure)
// ======================================================================================
const RECON_ROADS = { W: { pt: [215, 268], el: "posW", name: "west road" }, C: { pt: [300, 262], el: "posC", name: "centre road" }, E: { pt: [388, 270], el: "posE", name: "east road" } };
const crossroads = {
  id: "crossroads-recon", n: 3, level: "fireteam", title: "Crossroads Recon", timeLimit: 1800, stealth: true,
  briefing: {
    mission: "Find out which of the three roads into Tollby is undefended, and report it, without being detected. The company will attack down the road you report.",
    enemy: "An enemy platoon holds Tollby. Two of the three road entrances are believed to be covered by dug-in teams; which two is not known.",
    terrain: "Three roads (west, centre, east) climb gently to the village. Copses on the slopes give concealed viewpoints about 200 m from each entrance. A hedge runs east–west across your side of the valley.",
    troops: "One fire team (team leader, automatic rifleman, grenadier, rifleman) with binoculars.",
    time: "30 minutes. Fighting means failure: report, do not engage.",
  },
  concepts: [tag("surfaces-and-gaps"), tag("recon-pull")],
  terrain: {
    world: { w: 600, h: 400 }, light: "day",
    rises: [{ cx: 300, cy: 345, r: 70, steps: 2, h: 2, top: 0.6, seed: 12 }],
    woods: [{ ring: blobRing(130, 108, 40, 21, 0.1, 40, 0.9) }, { ring: blobRing(300, 95, 32, 22, 0.1, 40, 0.9) }, { ring: blobRing(470, 108, 40, 23, 0.1, 40, 0.9) }, { ring: blobRing(40, 330, 50, 24, 0.15, 40, 0.8) }, { ring: blobRing(570, 330, 45, 25, 0.15, 40, 0.8) }],
    hedges: [[[20, 70], [200, 68], [400, 68], [580, 72]]],
    roads: [{ pts: [[40, -20], [140, 120], [215, 268], [270, 320]], w: 4 }, { pts: [[300, -20], [300, 262], [300, 330]], w: 4 }, { pts: [[560, -20], [460, 120], [388, 270], [330, 320]], w: 4 }],
    houses: [{ x: 270, y: 330, ang: 0, len: 14, wid: 9 }, { x: 330, y: 335, ang: 90, len: 14, wid: 9 }, { x: 300, y: 362, ang: 0, len: 16, wid: 10 }, { x: 250, y: 365, ang: 70, len: 12, wid: 8 }, { x: 352, y: 368, ang: 110, len: 12, wid: 8 }],
    fields: [{ cx: 180, cy: 190, w: 140, d: 100, ang: 30, tint: "a" }, { cx: 420, cy: 190, w: 140, d: 100, ang: -30, tint: "b" }],
  },
  forces: {
    friendly: [{ id: "team", kind: "team", name: "Fire team", short: "Team", at: [300, 30], face: 90, formation: "file" }],
    enemy: [
      { id: "posW", kind: "pos", name: "Enemy team (west road)", roles: ["tl", "ar", "r"], at: [218, 282], face: 245, pose: "hole", slots: holes([[212, 280], [220, 284], [226, 280]], 245), dug: 0.5, ai: { type: "op", sector: 160, holdFire: 140 } },
      { id: "posC", kind: "pos", name: "Enemy team (centre road)", roles: ["tl", "ar", "r"], at: [300, 276], face: 270, pose: "hole", slots: holes([[293, 276], [300, 279], [307, 276]], 270), dug: 0.5, ai: { type: "op", sector: 160, holdFire: 140 } },
      { id: "posE", kind: "pos", name: "Enemy team (east road)", roles: ["tl", "ar", "r"], at: [384, 284], face: 295, pose: "hole", slots: holes([[378, 280], [384, 284], [390, 280]], 295), dug: 0.5, ai: { type: "op", sector: 160, holdFire: 140 } },
    ],
  },
  objective: { x: 300, y: 300, r: 60, label: "Tollby road entrances" }, objectiveEls: [], ccp: [300, 25],
  routes: {
    recon: R("Behind the hedge to each copse, then back", [[300, 30], [300, 64], [140, 64], [146, 100], [150, 130], [146, 100], [140, 64], [300, 64], [300, 114], [300, 65], [460, 66], [454, 100], [450, 130], [454, 100], [460, 66], [300, 64], [300, 40]]),
    centreOnly: R("Centre copse only", [[300, 30], [300, 120], [300, 40]]),
    road: R("Straight up the centre road", [[300, 30], [300, 200], [300, 245], [300, 40]]),
    probe: R("Bound up each road to 120 m", [[300, 30], [180, 160], [120, 62], [300, 140], [300, 62], [420, 160], [300, 40]]),
  },
  triggers: { now: TG("At once", { when: "start" }) },
  plans: [
    { id: "recon-all", name: "Observe all three from cover", form: "Zone reconnaissance (find the gap)", doctrinal: true, concepts: ["surfaces-and-gaps", "recon-pull"],
      summary: "Move behind the hedge to the copse facing each road, observe each entrance for 40 s from concealment, then come back and report the road with no enemy.",
      assign: { team: { task: "screen", route: "recon", stops: [[150, 130], [300, 114], [450, 130]], dwell: 32, technique: "infiltrate" } } },
    { id: "drive-in", name: "Walk up the centre road", form: "Movement to contact", naive: true, concepts: [],
      summary: "Go straight up the centre road until something happens, then come back and report.",
      assign: { team: { task: "screen", route: "road", stops: [[300, 245]], dwell: 15, technique: "travelling" } } },
    { id: "one-look", name: "One look from the centre copse", form: "Reconnaissance from one vantage point", concepts: ["recon-pull"],
      summary: "Look only from the centre copse, then report what you saw.",
      assign: { team: { task: "screen", route: "centreOnly", stops: [[300, 120]], dwell: 40, technique: "overwatch" } } },
    { id: "probe", name: "Probe each road closer", form: "Reconnaissance by probing each road", concepts: ["surfaces-and-gaps"],
      summary: "Bound up each road to about 120 m of the village to get a closer look.",
      assign: { team: { task: "screen", route: "probe", stops: [[180, 160], [300, 140], [420, 160]], dwell: 20, technique: "overwatch" } } },
  ],
  choices: { team: { tasks: ["screen"], routes: ["recon", "centreOnly", "road", "probe"], triggers: ["now"] } },
  onStart(S, api) {
    const keys = ["W", "C", "E"];
    S.reconOpen = keys[Math.floor(S.rng.next() * 3) % 3];
    S.reconObs = { W: 0, C: 0, E: 0 };
    const el = S.byId[RECON_ROADS[S.reconOpen].el];
    for (const s of el.soldiers) s.status = "absent";
    S.totalH -= el.size;
  },
  onTick(S, api) {
    const t = S.byId.team;
    if (t.ok > 0 && t.order?.type === "observe" && t.dwell > 0) {
      for (const k of ["W", "C", "E"]) {
        const p = RECON_ROADS[k].pt;
        const d = Math.hypot(p[0] - t.x, p[1] - t.y);
        if (d < 160 && S.T.los(t.x, t.y, 1.1, p[0], p[1], 1.0, []) > 0.3) S.reconObs[k] += 0.5;
      }
    }
    if (S.flags.detected && !S.flags.alert) { S.flags.alert = S.t; api.log("alert", "The enemy is alerted", { side: "h" }); }
  },
  evaluate(S, api) {
    const fight = S.metrics.firstShotAt != null || S.metrics.enemyFireAt != null || api.down("f") > 0;
    if (fight) return { reason: "the team got into a fight: the reconnaissance is compromised", tier: 3 };
    const t = S.byId.team;
    if (t.order?.type === "observe" && t.complete && t.si >= t.steps.length - 1) {
      const cands = ["W", "C", "E"].filter((k) => S.reconObs[k] >= 20 && !S.know.f[RECON_ROADS[k].el]);
      if (!cands.length) return { reason: "no road could be reported as clear", tier: 3 };
      cands.sort((a, b) => S.reconObs[b] - S.reconObs[a]);
      const rep = cands[0];
      S.flags.report = rep;
      api.log("report", `Report: the ${RECON_ROADS[rep].name} looks undefended${cands.length > 1 ? " (not every road was confirmed)" : ""}`, { side: "f" });
      if (rep !== S.reconOpen) return { reason: `wrong report: the ${RECON_ROADS[rep].name} is defended; the ${RECON_ROADS[S.reconOpen].name} was open`, tier: 3 };
      if (cands.length > 1) return { reason: `correct, but only by luck: other roads were not confirmed`, tier: 2 };
      return S.flags.detected ? { reason: `correct report (${RECON_ROADS[rep].name}), but the enemy is alerted`, tier: 2 } : { reason: `correct report: the ${RECON_ROADS[rep].name} is open, and you were not detected`, tier: 1 };
    }
    return null;
  },
  onTimeout() { return { reason: "no report before the deadline", tier: 3 }; },
  aarNotes(S) {
    const seen = ["W", "C", "E"].filter((k) => S.reconObs[k] >= 20);
    return { why: [`You observed ${seen.length} of 3 entrances long enough to judge (${seen.map((k) => RECON_ROADS[k].name).join(", ") || "none"}).`],
      improve: seen.length < 3 ? ["Find the gap by checking every surface: observe each entrance before reporting (Fig 20 Surfaces and Gaps, Fig 19 Reconnaissance Pull)."] : [] };
  },
};

// ======================================================================================
// 4. BREAK CONTACT (fire team)
// ======================================================================================
const breakContact = {
  id: "break-contact", n: 4, level: "fireteam", title: "Break Contact", timeLimit: 480,
  briefing: {
    mission: "Your team has been hit by fire from the treeline while crossing Marl Field. Break contact and get everyone, including any casualties, back to the rally point at the hedge gap.",
    enemy: "An enemy team (about five, with a machine gun) in the treeline 120 m north. It is not pursuing.",
    terrain: "Open stubble field. The rally point is a hedge gap 200 m south-west; once behind the hedge you are out of sight.",
    troops: "One fire team in two buddy teams: team leader with the automatic rifleman, grenadier with the rifleman. Four smoke grenades (one each).",
    time: "8 minutes.",
  },
  concepts: [tag("retrograde")],
  terrain: {
    world: { w: 600, h: 400 }, light: "day",
    woods: [{ ring: blobRing(330, 360, 150, 31, 0.12, 48, 0.42) }, { ring: blobRing(60, 60, 45, 32, 0.15, 40, 0.8) }],
    hedges: [[[10, 92], [100, 88], [138, 86]], [[162, 85], [300, 80], [420, 74]]],
    roads: [{ pts: [[-20, 230], [300, 222], [620, 214]], w: 3 }],
    fields: [{ cx: 300, cy: 200, w: 420, d: 130, ang: 0, tint: "b" }],
  },
  forces: {
    friendly: [
      { id: "a", kind: "buddy", name: "TL buddy team", short: "TL team", roles: ["tl", "ar"], at: [300, 205], face: 0, formation: "line", smoke: 2 },
      { id: "b", kind: "buddy", name: "Grenadier buddy team", short: "GR team", roles: ["gr", "r"], at: [288, 196], face: 0, formation: "line", smoke: 2 },
    ],
    enemy: [{ id: "en", kind: "pos", name: "Enemy team in the treeline", roles: ["tl", "mg", "ag", "ar", "r"], at: [320, 318], face: 270, pose: "prone", slots: holes([[300, 318], [310, 322], [320, 318], [330, 320], [340, 318]], 270), dug: 0.3, ai: { type: "defend" } }],
  },
  objective: { x: 150, y: 70, r: 26, label: "Rally point (hedge gap)" }, objectiveEls: [], ccp: [150, 70], rally: [150, 70],
  routes: {
    backA: R("Back to the hedge gap", [[300, 205], [230, 150], [155, 90], [152, 68]]),
    backB: R("Back to the hedge gap (left)", [[288, 196], [218, 142], [148, 88], [146, 66]]),
    assaultA: R("Into the treeline", [[300, 205], [315, 260], [320, 318]]),
    assaultB: R("Into the treeline (left)", [[288, 196], [300, 260], [312, 318]]),
  },
  triggers: { now: TG("At once", { when: "start" }), t20: TG("After 40 s", { when: "time", t: 40 }), t80: TG("After 80 s", { when: "time", t: 80 }), t120: TG("After 120 s", { when: "time", t: 120 }) },
  plans: [
    { id: "bounds-smoke", name: "Smoke, then alternating bounds", form: "Break contact (fire and movement to the rear)", doctrinal: true, concepts: ["retrograde"],
      summary: "Return fire at once; the grenadier throws smoke between you and the treeline; the buddy teams bound back alternately, one firing while the other moves, carrying any casualty, until behind the hedge.",
      assign: { a: { task: "withdraw", route: "backA", method: "alternating", partner: "b" }, b: { task: "withdraw", route: "backB", method: "alternating", partner: "a", first: true } },
      actions: [{ el: "b", trigger: "now", action: { type: "smoke", at: [300, 240] } }, { el: "a", trigger: "t20", action: { type: "smoke", at: [260, 215] } }, { el: "b", trigger: "t80", action: { type: "smoke", at: [225, 200] } }, { el: "a", trigger: "t120", action: { type: "smoke", at: [190, 160] } }] },
    { id: "run", name: "Everyone run for the hedge", form: "Withdrawal in one move", naive: true, concepts: [],
      summary: "Everybody gets up and runs back to the hedge at once.",
      assign: { a: { task: "withdraw", route: "backA", method: "run" }, b: { task: "withdraw", route: "backB", method: "run" } } },
    { id: "bounds", name: "Alternating bounds, no smoke", form: "Break contact by alternating bounds", concepts: ["retrograde"],
      summary: "Bound back alternately by buddy teams with covering fire, but without smoke.",
      assign: { a: { task: "withdraw", route: "backA", method: "alternating", partner: "b" }, b: { task: "withdraw", route: "backB", method: "alternating", partner: "a", first: true } } },
    { id: "assault", name: "Assault the treeline", form: "Assault through", concepts: [],
      summary: "Both buddy teams assault into the treeline.",
      assign: { a: { task: "assault", route: "assaultA", target: "en", trigger: "now" }, b: { task: "assault", route: "assaultB", target: "en", trigger: "now" } } },
  ],
  choices: {
    a: { tasks: ["withdraw", "assault"], routes: ["backA", "assaultA"], triggers: ["now"], methods: ["alternating", "run"] },
    b: { tasks: ["withdraw", "assault"], routes: ["backB", "assaultB"], triggers: ["now"], methods: ["alternating", "run"] },
  },
  onStart(S, api) {
    // the opening burst: both sides have seen each other; one soldier may already be down
    S.know.f.en = { el: "en", x: 320, y: 318, t: 0, kind: "pos" };
    S.know.h.a = { el: "a", x: 300, y: 205, t: 0, kind: "buddy" }; S.know.h.b = { el: "b", x: 288, y: 196, t: 0, kind: "buddy" };
    S.byId.a.recvT = 0; S.byId.b.recvT = 0; S.byId.a.supp = 0.5; S.byId.b.supp = 0.5;
    S.byId.en.stats.firedAt.a = 0; S.byId.en.stats.firedAt.b = 0; // the team returns fire at once
    if (S.rng.next() < 0.6) {
      const el = S.rng.next() < 0.5 ? S.byId.a : S.byId.b;
      const s = el.soldiers[1]; s.status = "down"; s.pose = "prone"; s.downT = 0;
      el.cohesion -= 0.25;
      api.log("down", `${el.name}: one soldier down in the opening burst`, { el: el.id, side: "f" });
    }
    api.log("contact", "Contact north! Fire from the treeline", { side: "f" });
  },
  evaluate(S) {
    const mine = S.soldiers.filter((s) => s.side === "f");
    const atRally = (s) => Math.hypot(s.x - 150, s.y - 70) < 28;
    if (mine.every((s) => (s.status === "ok" && atRally(s)) || (s.status === "down" && s.evac))) return { reason: "everyone, casualties included, is back at the rally point", tier: 1 };
    if (S.byId.en && S.flags["cleared:en"]) return { reason: "the enemy team is out of action, but you were ordered to break contact", tier: 2 };
    return null;
  },
  onTimeout(S) {
    const mine = S.soldiers.filter((s) => s.side === "f");
    const back = mine.filter((s) => s.status === "ok" && Math.hypot(s.x - 150, s.y - 70) < 28).length;
    return back === mine.filter((s) => s.status === "ok").length ? { reason: "everyone able is back, but a casualty was not recovered in time", tier: 2 } : { reason: "the team did not break contact in time", tier: 3 };
  },
  aarNotes(S) {
    const smoke = S.events.some((e) => e.type === "smoke");
    return { sustain: smoke ? ["Smoke between you and the treeline blinded the enemy while you moved."] : [], improve: smoke ? [] : ["Use smoke to screen the first bound (Fig 29 Retrograde and Delay)."] };
  },
};

// ---- platoon helpers ----
// Player platoon: three rifle squads, a weapons squad (two machine gun teams played; Javelin teams not played), platoon HQ.
const platoon = (pos) => [
  { id: "sq1", kind: "squad", name: "1st Squad", short: "1st Sqd", at: pos.sq1, face: 90, formation: "column" },
  { id: "sq2", kind: "squad", name: "2nd Squad", short: "2nd Sqd", at: pos.sq2, face: 90, formation: "column" },
  { id: "sq3", kind: "squad", name: "3rd Squad", short: "3rd Sqd", at: pos.sq3, face: 90, formation: "column" },
  { id: "mg1", kind: "mg", name: "MG team 1 (with weapons squad leader)", short: "MG 1", roles: ["wsl", "mg", "ag"], at: pos.mg1, face: 90, formation: "file" },
  { id: "mg2", kind: "mg", name: "MG team 2", short: "MG 2", at: pos.mg2, face: 90, formation: "file" },
  { id: "hq", kind: "hq", name: "Platoon HQ (PL, RTO, PSG)", short: "PL HQ", at: pos.hq, face: 90, formation: "file" },
];
const PL_CHOICE_TASKS = ["sbf", "assault", "follow", "reserve", "defend", "move"];
// Enemy fighting positions in a shallow arc: n soldiers, two to a hole.
const arc = (cx, cy, n, width, face, bow = 6) => Array.from({ length: n }, (_, i) => {
  const u = n === 1 ? 0 : i / (n - 1) - 0.5;
  const a = (face + 90) * Math.PI / 180;
  return [+(cx + Math.cos(a) * u * width + Math.cos(face * Math.PI / 180) * bow * (1 - 4 * u * u)).toFixed(1), +(cy + Math.sin(a) * u * width + Math.sin(face * Math.PI / 180) * bow * (1 - 4 * u * u)).toFixed(1), face];
});

// ======================================================================================
// 5. HILL 214 (platoon attack)
// ======================================================================================
const hill214 = {
  id: "hill-214", n: 5, level: "platoon", title: "Hill 214", timeLimit: 1500,
  briefing: {
    mission: "Seize Hill 214, a knoll 370 m north, to give the company observation over the valley.",
    enemy: "An enemy squad dug in on the knoll's top with a machine gun, fields of fire south over open grass. It can withdraw north.",
    terrain: "Open grass rises to the knoll. A low spur 250 m south-west of the top looks onto it. East, a wooded draw with a stream runs north to the knoll's east foot: dead ground from the top.",
    troops: "Your platoon: three rifle squads, weapons squad (two machine gun teams played; Javelin teams not played), platoon HQ.",
    time: "25 minutes.",
  },
  concepts: [tag("flank-attack"), tag("frontal-attack"), tag("main-effort")],
  terrain: {
    world: { w: 900, h: 600 }, light: "day",
    rises: [{ cx: 450, cy: 430, r: 95, steps: 3, h: 3.5, top: 0.45, seed: 41 }, { cx: 225, cy: 280, r: 62, steps: 2, h: 2.5, top: 0.5, seed: 42 }],
    woods: [{ ring: blobRing(700, 300, 70, 43, 0.12, 48, 2.1) }, { ring: blobRing(90, 520, 80, 44, 0.15, 40, 0.8) }, { ring: blobRing(820, 560, 60, 45, 0.15, 40, 0.8) }, { ring: blobRing(460, 25, 170, 46, 0.1, 48, 0.42) }, { ring: blobRing(150, 200, 55, 47, 0.15, 40, 1.4) }, { ring: blobRing(645, 95, 75, 48, 0.12, 40, 0.9) }],
    streams: [{ pts: [[680, -20], [700, 120], [705, 260], [690, 400], [640, 470], [600, 620]], w: 4 }],
    hedges: [[[60, 140], [300, 150], [520, 140]]],
    roads: [{ pts: [[-20, 40], [450, 50], [920, 70]], w: 4 }],
    fields: [{ cx: 300, cy: 90, w: 300, d: 80, ang: 0, tint: "a" }],
  },
  forces: {
    friendly: platoon({ sq1: [500, 18], sq2: [540, 18], sq3: [420, 18], mg1: [380, 20], mg2: [360, 20], hq: [460, 12] }),
    enemy: [
      { id: "esq", kind: "pos", name: "Enemy squad (dug in)", roles: ["tl", "ar", "r", "r", "tl", "ar", "r"], at: [452, 396], face: 270, pose: "hole", slots: arc(452, 396, 7, 64, 270, 4), dug: 0.5, ai: { type: "defend", fallback: "eNorth" } },
      { id: "emg", kind: "mg", name: "Enemy machine gun", roles: ["mg", "ag"], at: [432, 398], face: 250, pose: "hole", slots: holes([[430, 398], [435, 400]], 250), dug: 0.6, ai: { type: "defend", fallback: "eNorth" } },
    ],
  },
  objective: { x: 450, y: 425, r: 45, label: "Hill 214" }, objectiveEls: ["esq", "emg"], ccp: [460, 50],
  routes: {
    sbf1: R("Behind the spur, then onto it (MG 1)", [[380, 20], [230, 90], [170, 170], [190, 235], [246, 278]]), sbf2: R("Behind the spur, then onto it (MG 2)", [[360, 20], [220, 95], [160, 180], [185, 245], [250, 292]]),
    sbf3: R("Behind the spur, then onto it (3rd Squad)", [[420, 20], [240, 85], [180, 160], [196, 228], [238, 264]]),
    eastA: R("East through the wooded draw", [[500, 18], [600, 70], [660, 120], [700, 200], [700, 380], [600, 425], [470, 405]]),
    eastB: R("East through the wooded draw (second)", [[540, 18], [620, 80], [680, 130], [712, 210], [705, 390], [615, 440], [440, 404]]),
    frontA: R("Straight up the slope (right)", [[500, 18], [480, 250], [462, 396]]), frontB: R("Straight up the slope (left)", [[540, 18], [500, 250], [436, 398]]),
    frontC: R("Straight up the slope (centre)", [[420, 18], [430, 250], [446, 396]]),
    frontM1: R("Behind the squads (MG 1)", [[380, 20], [410, 200], [430, 300]]), frontM2: R("Behind the squads (MG 2)", [[360, 20], [400, 200], [420, 300]]),
    westA: R("West around the spur", [[500, 18], [300, 140], [160, 300], [300, 420], [446, 398]]), westB: R("West around the spur (second)", [[540, 18], [320, 140], [170, 320], [310, 430], [432, 400]]),
    hqFollow: R("HQ behind the assault", [[460, 12], [600, 80], [660, 130], [690, 220], [690, 380]]),
    hqFront: R("HQ behind the line", [[460, 12], [455, 200]]),
    stay: R("Stay in the start area", [[460, 12], [460, 14]]),
    eNorth: R("Enemy withdrawal north", [[450, 425], [460, 520], [470, 620]]),
  },
  triggers: {
    sbfSet: TG("When MG 1 has set support by fire", { when: "sbfSet", el: "mg1" }),
    liftNear: TG("Lift when 1st Squad is 60 m from the top", { when: "near", el: "sq1", target: [450, 398], dist: 60 }),
    liftNear3: TG("Lift when 1st Squad is 45 m from the top", { when: "near", el: "sq1", target: [450, 398], dist: 45 }),
    now: TG("At once", { when: "start" }),
  },
  plans: [
    { id: "sbf-envelop", name: "Support by fire from the spur, assault through the draw", form: "Envelopment with a base of fire", doctrinal: true, concepts: ["flank-attack", "main-effort"],
      summary: "Both MG teams and 3rd Squad set support by fire on the spur and suppress the top; 1st and 2nd Squads (main effort) move through the wooded draw unseen and assault from the east flank; the base of fire lifts (stops firing and stays) as they close.",
      assign: {
        mg1: { task: "sbf", route: "sbf1", target: "esq", trigger: "liftNear" }, mg2: { task: "sbf", route: "sbf2", target: "emg", trigger: "liftNear" },
        sq3: { task: "sbf", route: "sbf3", target: "esq", trigger: "liftNear3" },
        sq1: { task: "assault", route: "eastA", target: "esq", trigger: "sbfSet", technique: "overwatch" }, sq2: { task: "assault", route: "eastB", target: "emg", trigger: "sbfSet", technique: "overwatch" },
        hq: { task: "move", route: "hqFollow" },
      } },
    { id: "frontal-line", name: "Everyone straight up the hill", form: "Frontal attack, all squads abreast", naive: true, concepts: ["frontal-attack"],
      summary: "All three squads assault abreast straight up the open slope; the MG teams follow behind them.",
      assign: {
        sq1: { task: "assault", route: "frontA", target: "esq", trigger: "now" }, sq2: { task: "assault", route: "frontB", target: "emg", trigger: "now" }, sq3: { task: "assault", route: "frontC", target: "esq", trigger: "now" },
        mg1: { task: "move", route: "frontM1" }, mg2: { task: "move", route: "frontM2" }, hq: { task: "move", route: "hqFront" },
      } },
    { id: "sbf-frontal", name: "Support by fire, then assault frontally", form: "Frontal attack with a base of fire", concepts: ["frontal-attack"],
      summary: "The MG teams and 3rd Squad set support by fire on the spur; 1st and 2nd Squads assault straight up the open slope.",
      assign: {
        mg1: { task: "sbf", route: "sbf1", target: "esq", trigger: "liftNear" }, mg2: { task: "sbf", route: "sbf2", target: "emg", trigger: "liftNear" },
        sq3: { task: "sbf", route: "sbf3", target: "esq", trigger: "liftNear3" },
        sq1: { task: "assault", route: "frontA", target: "esq", trigger: "sbfSet" }, sq2: { task: "assault", route: "frontB", target: "emg", trigger: "sbfSet" },
        hq: { task: "move", route: "hqFront" },
      } },
    { id: "west", name: "Support by fire, envelop round the spur", form: "Envelopment round the west side", concepts: ["flank-attack"],
      summary: "The base of fire sets on the spur; 1st and 2nd Squads swing west around it and attack the knoll's west side across open ground.",
      assign: {
        mg1: { task: "sbf", route: "sbf1", target: "esq", trigger: "liftNear" }, mg2: { task: "sbf", route: "sbf2", target: "emg", trigger: "liftNear" },
        sq3: { task: "sbf", route: "sbf3", target: "esq", trigger: "liftNear3" },
        sq1: { task: "assault", route: "westA", target: "esq", trigger: "sbfSet" }, sq2: { task: "assault", route: "westB", target: "emg", trigger: "sbfSet" },
        hq: { task: "move", route: "stay" },
      } },
  ],
  choices: {
    sq1: { tasks: PL_CHOICE_TASKS, routes: ["eastA", "frontA", "westA"], triggers: ["sbfSet", "now"] },
    sq2: { tasks: PL_CHOICE_TASKS, routes: ["eastB", "frontB", "westB"], triggers: ["sbfSet", "now"] },
    sq3: { tasks: PL_CHOICE_TASKS, routes: ["sbf3", "frontC"], triggers: ["liftNear3", "now"] },
    mg1: { tasks: ["sbf", "move"], routes: ["sbf1", "frontM1"], triggers: ["liftNear", "now"] },
    mg2: { tasks: ["sbf", "move"], routes: ["sbf2", "frontM2"], triggers: ["liftNear", "now"] },
    hq: { tasks: ["move"], routes: ["hqFollow", "hqFront", "stay"], triggers: ["now"] },
  },
  evaluate(S, api) {
    if (allOut(S, ["esq", "emg"]) && api.okNear("f", 450, 425, 70) >= 3) return { reason: "Hill 214 is seized", tier: 1 };
    return null;
  },
  onTimeout(S) { return S.flags["cleared:esq"] || S.flags["cleared:emg"] ? { reason: "part of the position is taken, but the hill is not secure", tier: 2 } : { reason: "the enemy still holds Hill 214", tier: 3 }; },
};

// ======================================================================================
// 6. TWIN HOUSES (platoon attack, defeat in detail)
// ======================================================================================
const twinHouses = {
  id: "twin-houses", n: 6, level: "platoon", title: "Twin Houses", timeLimit: 1500,
  briefing: {
    mission: "Clear the two houses at the south edge of Brennick so the company can enter the village.",
    enemy: "About a squad split between two stone houses 180 m apart, each with an automatic weapon, and a two-man post in the copse east of the far house. Each house covers the open ground in front of the other.",
    terrain: "A hedge runs across the fields 160 m south of the houses. An orchard and copse reach up to the west wall of the near (west) house; the far (east) house cannot see that wall.",
    troops: "Your platoon: three rifle squads, weapons squad (two machine gun teams played; Javelin teams not played), platoon HQ. One call for smoke through company (notional).",
    time: "25 minutes.",
  },
  concepts: [tag("decisive-points"), tag("main-effort"), tag("flank-attack")],
  terrain: {
    world: { w: 900, h: 600 }, light: "day",
    woods: [{ ring: blobRing(270, 420, 70, 51, 0.15, 40, 1.3) }, { ring: blobRing(800, 520, 70, 52, 0.15, 40, 0.8) }, { ring: blobRing(120, 160, 60, 53, 0.15, 40, 0.8) }],
    hedges: [[[150, 250], [400, 255], [700, 250], [820, 245]]],
    walls: [[[340, 470], [460, 472], [620, 478]]],
    roads: [{ pts: [[470, -20], [470, 300], [470, 600]], w: 4 }, { pts: [[-20, 500], [470, 495], [920, 505]], w: 4 }],
    houses: [{ x: 380, y: 400, ang: 0, len: 16, wid: 11 }, { x: 560, y: 430, ang: 0, len: 16, wid: 11 }, { x: 430, y: 540, ang: 90, len: 14, wid: 9 }, { x: 520, y: 555, ang: 0, len: 16, wid: 10 }, { x: 620, y: 540, ang: 20, len: 12, wid: 9 }],
    fields: [{ cx: 470, cy: 160, w: 500, d: 150, ang: 0, tint: "a" }, { cx: 480, cy: 330, w: 360, d: 120, ang: 0, tint: "b" }],
  },
  forces: {
    friendly: platoon({ sq1: [370, 70], sq2: [440, 55], sq3: [505, 75], mg1: [565, 85], mg2: [605, 80], hq: [455, 25] }),
    enemy: [
      { id: "hA", kind: "pos", name: "Enemy in the west house", roles: ["tl", "ar", "r", "r", "r"], at: [380, 400], face: 270, pose: "building", slots: holes([[374, 396], [380, 396], [386, 396], [376, 404], [384, 404]], 270), dug: 0.6, ai: { type: "defend", fallback: "eNorthA" } },
      { id: "hB", kind: "pos", name: "Enemy in the east house", roles: ["tl", "ar", "r", "r", "r"], at: [560, 430], face: 250, pose: "building", slots: holes([[554, 426], [560, 426], [566, 426], [556, 434], [564, 434]], 250), dug: 0.6, ai: { type: "defend", fallback: "eNorthB" } },
      { id: "hC", kind: "pos", name: "Enemy post in the east copse", roles: ["tl", "r"], at: [740, 470], face: 240, pose: "hole", slots: holes([[736, 468], [744, 472]], 240), dug: 0.5, ai: { type: "defend" } },
    ],
  },
  objective: { x: 470, y: 415, r: 120, label: "The twin houses" }, objectiveEls: ["hA", "hB"], ccp: [460, 50],
  routes: {
    mgB1: R("To the hedge facing the east house", [[565, 85], [560, 180], [570, 246]]), mgB2: R("To the hedge facing the east house (2)", [[605, 80], [590, 180], [600, 244]]),
    mgA1: R("To the hedge facing the west house", [[565, 85], [420, 180], [390, 250]]), mgA2: R("To the hedge facing the west house (2)", [[605, 80], [440, 180], [410, 251]]),
    sq3fixA: R("3rd Squad to the hedge facing the west house", [[505, 75], [380, 180], [360, 249]]),
    sq3fixB: R("3rd Squad to the hedge facing the east house", [[505, 75], [520, 180], [540, 248]]),
    orchard: R("West through the orchard to the blind wall", [[370, 70], [260, 160], [215, 300], [250, 405], [320, 405], [372, 400]]),
    follow: R("Behind 1st Squad, through the near house to the far one", [[440, 55], [270, 160], [225, 300], [262, 412], [380, 412], [470, 432], [554, 432]]),
    frontA: R("Straight at the west house", [[370, 70], [395, 250], [382, 396]]), frontB: R("Straight at the east house", [[440, 55], [520, 250], [558, 426]]),
    frontC: R("Up the middle", [[505, 75], [470, 250], [470, 380]]),
    eastB: R("East round to the far house first", [[440, 55], [700, 200], [700, 430], [566, 432]]),
    eastB2: R("East round behind 2nd Squad", [[370, 70], [690, 190], [690, 400], [570, 436]]),
    hqF: R("HQ to the hedge", [[455, 25], [470, 240]]),
    eNorthA: R("Enemy (west house) withdraws", [[380, 400], [380, 520], [380, 620]]), eNorthB: R("Enemy (east house) withdraws", [[560, 430], [580, 540], [600, 620]]),
  },
  triggers: {
    sbfSet: TG("When MG 1 has set support by fire", { when: "sbfSet", el: "mg1" }),
    clearedA: TG("When the west house is cleared", { when: "cleared", target: "hA" }),
    clearedB: TG("When the east house is cleared", { when: "cleared", target: "hB" }),
    lift1A: TG("Lift when 1st Squad is 50 m from the west house", { when: "near", el: "sq1", target: [380, 400], dist: 50 }),
    lift2B: TG("Lift when 2nd Squad is 50 m from the east house", { when: "near", el: "sq2", target: [560, 430], dist: 50 }),
    sq1AP: TG("When 1st Squad reaches the orchard", { when: "near", el: "sq1", target: [250, 405], dist: 30 }),
    now: TG("At once", { when: "start" }),
  },
  plans: [
    { id: "isolate", name: "Isolate the far house, take the near one from its blind side, then the far one", form: "Sequential attack, near house first", doctrinal: true, concepts: ["decisive-points", "main-effort", "flank-attack"],
      summary: "Both MG teams suppress the east house from the hedge; smoke is called onto it; 3rd Squad fixes the west house from the hedge; 1st Squad (main effort) goes through the orchard and assaults the west house from its blind side; 2nd Squad follows, passes the cleared house and assaults the east house from the flank.",
      assign: {
        mg1: { task: "sbf", route: "mgB1", target: "hB", trigger: "lift2B" }, mg2: { task: "sbf", route: "mgB2", target: "hB", trigger: "lift2B" },
        sq3: { task: "sbf", route: "sq3fixA", target: "hA", trigger: "lift1A" },
        sq1: { task: "assault", route: "orchard", target: "hA", trigger: "sbfSet", technique: "overwatch" },
        sq2: { task: "follow", route: "follow", target: "hB", trigger: "clearedA", technique: "overwatch" },
        hq: { task: "move", route: "hqF" },
      },
      actions: [{ el: "hq", trigger: "sq1AP", action: { type: "callfire", at: [560, 425], kind: "smoke", dur: 120 } }] },
    { id: "both-frontal", name: "Rush both houses at once", form: "Frontal attack on both houses", naive: true, concepts: [],
      summary: "1st Squad rushes the west house and 2nd Squad the east house straight across the open field; 3rd Squad and the MG teams follow up the middle.",
      assign: {
        sq1: { task: "assault", route: "frontA", target: "hA", trigger: "now" }, sq2: { task: "assault", route: "frontB", target: "hB", trigger: "now" },
        sq3: { task: "move", route: "frontC" }, mg1: { task: "move", route: "mgA1" }, mg2: { task: "move", route: "mgB2" }, hq: { task: "move", route: "hqF" },
      } },
    { id: "far-first", name: "Fix the near house, take the far one first", form: "Fix the near house, assault the far house", concepts: ["main-effort"],
      summary: "The MG teams and 3rd Squad suppress the west house; 1st and 2nd Squads swing east and assault the east house.",
      assign: {
        mg1: { task: "sbf", route: "mgA1", target: "hA", trigger: "clearedB" }, mg2: { task: "sbf", route: "mgA2", target: "hA", trigger: "clearedB" },
        sq3: { task: "sbf", route: "sq3fixA", target: "hA", trigger: "clearedB" },
        sq2: { task: "assault", route: "eastB", target: "hB", trigger: "sbfSet" }, sq1: { task: "assault", route: "eastB2", target: "hB", trigger: "sbfSet" },
        hq: { task: "move", route: "hqF" },
      } },
    { id: "split", name: "Support both, assault both at once", form: "Simultaneous attack on both houses", concepts: [],
      summary: "One MG team on each house; 1st Squad goes through the orchard to the west house while 2nd Squad assaults the east house frontally at the same time.",
      assign: {
        mg1: { task: "sbf", route: "mgA1", target: "hA", trigger: "lift1A" }, mg2: { task: "sbf", route: "mgB2", target: "hB", trigger: "lift2B" },
        sq3: { task: "sbf", route: "sq3fixB", target: "hB", trigger: "lift2B" },
        sq1: { task: "assault", route: "orchard", target: "hA", trigger: "sbfSet" }, sq2: { task: "assault", route: "frontB", target: "hB", trigger: "sbfSet" },
        hq: { task: "move", route: "hqF" },
      } },
  ],
  choices: {
    sq1: { tasks: PL_CHOICE_TASKS, routes: ["orchard", "frontA", "eastB2"], triggers: ["sbfSet", "now"] },
    sq2: { tasks: PL_CHOICE_TASKS, routes: ["follow", "frontB", "eastB"], triggers: ["clearedA", "sbfSet", "now"] },
    sq3: { tasks: PL_CHOICE_TASKS, routes: ["sq3fixA", "sq3fixB", "frontC"], triggers: ["lift1A", "lift2B", "now"] },
    mg1: { tasks: ["sbf", "move"], routes: ["mgB1", "mgA1"], triggers: ["lift2B", "lift1A", "clearedB"] },
    mg2: { tasks: ["sbf", "move"], routes: ["mgB2", "mgA2"], triggers: ["lift2B", "lift1A", "clearedB"] },
    hq: { tasks: ["move"], routes: ["hqF"], triggers: ["now", "sq1AP"] },
  },
  fires: { f: { calls: 1 } },
  evaluate(S) { return allOut(S, ["hA", "hB"]) ? { reason: "both houses are cleared", tier: 1 } : null; },
  onTimeout(S) { return S.flags["cleared:hA"] || S.flags["cleared:hB"] ? { reason: "one house is cleared, the other still holds", tier: 2 } : { reason: "both houses still hold", tier: 3 }; },
};

// ======================================================================================
// 7. BRIDGE AT VENN (platoon defense, reserve and counterattack)
// ======================================================================================
// Bridge at Venn: 3rd Squad is on a counterattack order and out on the open east approach to the bridge.
const VENN_CA_SEEN = (t) => ({ when: "all", of: [{ when: "time", t }, { when: "order", el: "sq3", type: "counterattack" }, { when: "near", el: "sq3", target: [560, 360], dist: 110 }] });
const RIVER = [[-20, 196], [200, 204], [450, 200], [700, 194], [920, 200]];
const bridge = {
  id: "bridge-at-venn", n: 7, level: "platoon", title: "Bridge at Venn", timeLimit: 840,
  briefing: {
    mission: "Hold the Venn bridge (north bank) for 14 minutes against an enemy attack, and retake any ground lost on the north bank.",
    enemy: "An enemy platoon reinforced with a machine gun and an extra squad will attack from the south: expect a base of fire on the south bank hedge, mortar fire on the bank, and squads rushing the bridge.",
    terrain: "A river 15 m wide, crossable only at the bridge. The north bank is open for 100 m, then a low rise; woods to the north-east; Venn village behind.",
    troops: "Your platoon: three rifle squads, weapons squad (two machine gun teams played; Javelin teams not played), platoon HQ. Positions are part dug.",
    time: "14 minutes until relieved.",
  },
  concepts: [tag("elastic-defense"), tag("flank-attack")],
  terrain: {
    world: { w: 900, h: 600 }, light: "day",
    rises: [{ cx: 430, cy: 335, r: 75, steps: 2, h: 2.5, top: 0.5, seed: 71 }],
    woods: [{ ring: blobRing(640, 430, 70, 72, 0.15, 40, 0.9) }, { ring: blobRing(120, 80, 70, 73, 0.15, 40, 0.7) }, { ring: blobRing(780, 70, 60, 74, 0.15, 40, 0.7) }],
    streams: [{ pts: RIVER, w: 15 }],
    barriers: [RIVER], crossings: [{ x: 450, y: 200, r: 14 }],
    hedges: [[[260, 112], [450, 108], [640, 112]]],
    roads: [{ pts: [[450, -20], [450, 200], [450, 520], [450, 620]], w: 5 }],
    houses: [{ x: 410, y: 530, ang: 0, len: 16, wid: 10 }, { x: 495, y: 540, ang: 90, len: 14, wid: 9 }, { x: 560, y: 520, ang: 10, len: 12, wid: 8 }],
    fields: [{ cx: 450, cy: 60, w: 400, d: 80, ang: 0, tint: "b" }],
  },
  forces: {
    friendly: platoon({ sq1: [372, 252], sq2: [440, 335], sq3: [610, 420], mg1: [320, 250], mg2: [585, 252], hq: [455, 350] }).map((e) => ({ ...e, dug: 0.55 })),
    enemy: [
      { id: "eMG", kind: "pos", name: "Enemy machine gun (base of fire)", roles: ["mg", "ag", "r"], at: [430, 104], face: 90, formation: "line", ai: { type: "attack", fallback: "eBack" } },
      { id: "eSbf", kind: "pos", name: "Enemy squad (base of fire)", roles: ["tl", "ar", "r", "r", "tl", "ar", "r", "r"], at: [480, 102], face: 90, formation: "line", ai: { type: "attack", fallback: "eBack" } },
      { id: "eA", kind: "pos", name: "Enemy assault squad A", roles: ["tl", "ar", "r", "r", "tl", "ar", "r", "r"], at: [440, 40], face: 90, formation: "line", ai: { type: "attack", fallback: "eBack" } },
      { id: "eB", kind: "pos", name: "Enemy assault squad B", roles: ["tl", "ar", "r", "r", "tl", "ar", "r", "r"], at: [470, 30], face: 90, formation: "line", ai: { type: "attack", fallback: "eBack" } },
      { id: "eD", kind: "pos", name: "Enemy assault squad C", roles: ["tl", "ar", "r", "r", "tl", "ar", "r", "r"], at: [430, 20], face: 90, formation: "line", ai: { type: "attack", fallback: "eBack" } },
      { id: "eC", kind: "pos", name: "Enemy follow-on squad", roles: ["tl", "ar", "r", "r", "tl", "ar", "r", "r"], at: [455, 0], face: 90, formation: "line", ai: { type: "attack", fallback: "eBack" } },
    ],
  },
  objective: { x: 450, y: 240, r: 90, label: "Venn bridge (north end)" }, objectiveEls: [], ccp: [450, 470], rally: [450, 480],
  routes: {
    fwdW: R("Forward position west of the bridge", [[400, 300], [372, 252]]), fwdE: R("Forward position east of the bridge", [[610, 420], [560, 320], [520, 234]]),
    depth: R("Depth position on the rise", [[450, 330], [440, 335]]),
    mgW: R("MG west, flanking the bridge", [[380, 320], [320, 250]]), mgE: R("MG east, flanking the bridge", [[520, 320], [585, 252]]),
    resWood: R("Reserve in the north-east woods", [[610, 420], [612, 422]]),
    caFlank: R("Counterattack from the woods into the flank", [[610, 420], [570, 345], [515, 285]]),
    caBridge: R("Counterattack straight down to the bridge", [[610, 420], [460, 230]]),
    lineW: R("Bank line west", [[400, 300], [395, 222]]), lineC: R("Bank line centre", [[450, 330], [430, 220]]), lineE: R("Bank line east", [[610, 420], [540, 320], [480, 220]]),
    lineMW: R("Bank line far west", [[380, 320], [355, 225]]), lineME: R("Bank line far east", [[520, 320], [525, 223]]),
    hqRise: R("HQ on the rise", [[450, 380], [455, 350]]),
    eSbfMG: R("Enemy MG to the hedge", [[430, 104], [430, 112]]), eSbfSq: R("Enemy squad to the hedge", [[480, 102], [480, 112]]),
    eAroute: R("Enemy squad A over the bridge", [[440, 40], [450, 150], [450, 200], [440, 240], [420, 280]]),
    eBroute: R("Enemy squad B over the bridge", [[470, 30], [452, 150], [450, 200], [470, 240], [490, 280]]),
    eDroute: R("Enemy squad C over the bridge", [[430, 20], [448, 150], [450, 200], [455, 245], [400, 300]]),
    eCroute: R("Enemy follow-on squad over the bridge", [[455, 0], [450, 150], [450, 200], [450, 250], [450, 330]]),
    eBack: R("Enemy falls back south", [[450, 200], [450, 60], [450, -20]]),
  },
  triggers: {
    penetration: TG("When the enemy is across the bridge", { when: "enemyNear", at: [450, 245], dist: 75 }),
    contact: TG("When the enemy reaches the south end of the bridge", { when: "enemyNear", at: [450, 160], dist: 45 }),
    now: TG("At once", { when: "start" }),
  },
  enemyPlan: {
    assign: {
      eMG: { task: "sbf", route: "eSbfMG", target: "sq1", technique: "travelling" }, eSbf: { task: "sbf", route: "eSbfSq", target: "sq3", technique: "travelling" },
      eA: { task: "counterattack", route: "eAroute", zone: { x: 450, y: 290, r: 190 }, wait: { when: "time", t: 75 }, technique: "rush" },
      eB: { task: "counterattack", route: "eBroute", zone: { x: 450, y: 290, r: 190 }, wait: { when: "time", t: 90 }, technique: "rush" },
      eD: { task: "counterattack", route: "eDroute", zone: { x: 450, y: 290, r: 190 }, wait: { when: "time", t: 120 }, technique: "rush" },
      eC: { task: "counterattack", route: "eCroute", zone: { x: 450, y: 290, r: 190 }, wait: { when: "time", t: 180 }, technique: "overwatch" },
    },
    actions: [
      { el: "eMG", trigger: { when: "time", t: 45 }, action: { type: "callfire", at: [450, 228], kind: "he", dur: 110 } },
      // a reserve that counterattacks across the open east approach while the enemy's base of fire is
      // still in place is seen and shelled (notional): the reason to wait until the attack is committed
      { el: "eSbf", trigger: VENN_CA_SEEN(0), action: { type: "callfire", at: "sq3", kind: "he", dur: 90 } },
      { el: "eSbf", trigger: VENN_CA_SEEN(180), action: { type: "callfire", at: "sq3", kind: "he", dur: 90 } },
    ],
  },
  fires: { h: { calls: 3 } },
  plans: [
    { id: "depth-reserve", name: "Defend in depth with a reserve", form: "Defense in depth, counterattack", doctrinal: true, concepts: ["elastic-defense", "flank-attack"],
      summary: "1st Squad holds forward west of the bridge; the MG teams sit on both flanks so their fire crosses the bridge exit at an angle; 2nd Squad holds the rise in depth; 3rd Squad waits in the woods as the reserve and counterattacks into the flank of any penetration.",
      assign: {
        sq1: { task: "defend", route: "fwdW", face: 270 }, mg1: { task: "defend", route: "mgW", face: 315 }, mg2: { task: "defend", route: "mgE", face: 225 },
        sq2: { task: "defend", route: "depth", face: 270 }, hq: { task: "defend", route: "hqRise", face: 270 },
        sq3: { task: "reserve", route: "resWood", trigger: "penetration", commit: { route: "caFlank", zone: { x: 450, y: 260, r: 140 } } },
      } },
    { id: "linear", name: "Everyone on the bank", form: "Linear defense on the bank", naive: true, concepts: [],
      summary: "All three squads and both MG teams in one line along the north bank; no reserve.",
      assign: {
        sq1: { task: "defend", route: "lineW", face: 270 }, sq2: { task: "defend", route: "lineC", face: 270 }, sq3: { task: "defend", route: "lineE", face: 270 },
        mg1: { task: "defend", route: "lineMW", face: 270 }, mg2: { task: "defend", route: "lineME", face: 270 }, hq: { task: "defend", route: "hqRise", face: 270 },
      } },
    { id: "depth-no-reserve", name: "Depth, but no reserve", form: "Defense in depth, all squads forward", concepts: ["elastic-defense"],
      summary: "Forward and depth positions as in the recommended plan, but 3rd Squad also goes forward east of the bridge.",
      assign: {
        sq1: { task: "defend", route: "fwdW", face: 270 }, sq3: { task: "defend", route: "fwdE", face: 270 }, mg1: { task: "defend", route: "mgW", face: 315 }, mg2: { task: "defend", route: "mgE", face: 225 },
        sq2: { task: "defend", route: "depth", face: 270 }, hq: { task: "defend", route: "hqRise", face: 270 },
      } },
    { id: "early-counter", name: "Counterattack at first contact", form: "Defense in depth, counterattack at first contact", concepts: ["elastic-defense"],
      summary: "As the recommended plan, but the reserve counterattacks straight at the bridge as soon as the enemy reaches it.",
      assign: {
        sq1: { task: "defend", route: "fwdW", face: 270 }, mg1: { task: "defend", route: "mgW", face: 315 }, mg2: { task: "defend", route: "mgE", face: 225 },
        sq2: { task: "defend", route: "depth", face: 270 }, hq: { task: "defend", route: "hqRise", face: 270 },
        sq3: { task: "reserve", route: "resWood", trigger: "contact", commit: { route: "caBridge", zone: { x: 450, y: 220, r: 120 } } },
      } },
  ],
  choices: {
    sq1: { tasks: ["defend", "reserve"], routes: ["fwdW", "lineW"], triggers: ["penetration", "contact"] },
    sq2: { tasks: ["defend", "reserve"], routes: ["depth", "lineC"], triggers: ["penetration", "contact"] },
    sq3: { tasks: ["reserve", "defend"], routes: ["resWood", "fwdE", "lineE"], triggers: ["penetration", "contact"], commits: ["caFlank", "caBridge"] },
    mg1: { tasks: ["defend"], routes: ["mgW", "lineMW"], triggers: [] }, mg2: { tasks: ["defend"], routes: ["mgE", "lineME"], triggers: [] },
    hq: { tasks: ["defend"], routes: ["hqRise"], triggers: [] },
  },
  aarNotes(S) {
    if (!S.events.some((e) => e.type === "fire" && e.el === "eSbf")) return {};
    return { why: ["3rd Squad counterattacked across the open east approach while the enemy's base of fire was still in place: it was seen and shelled (notional)."],
      improve: ["Hold the reserve in cover until the enemy has committed across the bridge, then strike the flank of the penetration (Fig 1 Fix and Flank, Fig 27 Elastic Defense in Depth)."] };
  },
  evaluate(S) {
    const att = ["eA", "eB", "eC", "eD"];
    if (S.t > 240 && att.every((id) => S.flags[`cleared:${id}`] || S.byId[id].withdrawing)) return { reason: "the enemy attack is broken; the north bank is yours", tier: 1 };
    return null;
  },
  onTimeout(S, api) {
    const enemyNorth = S.soldiers.filter((s) => s.side === "h" && s.status === "ok" && s.y > 212 && Math.hypot(s.x - 450, s.y - 260) < 220).length;
    const mineNear = api.okNear("f", 450, 280, 220);
    if (enemyNorth === 0) return { reason: "you held the bridge until relieved", tier: 1 };
    if (enemyNorth < mineNear) return { reason: "you still hold most of the bridgehead, but enemy are on the north bank", tier: 2 };
    return { reason: "the enemy holds the north end of the bridge", tier: 3 };
  },
};

// ======================================================================================
// 8. LOW LIGHT (platoon infiltration under limited visibility)
// ======================================================================================
const lowLight = {
  id: "low-light", n: 8, level: "platoon", title: "Low Light", timeLimit: 1500, stealth: true,
  briefing: {
    mission: "Under limited visibility, pass between the two enemy observation posts on the Garra ridge and destroy the enemy mortar position behind them.",
    enemy: "Two observation posts 300 m apart, each of three soldiers, watching south-west and south-east. A two-tube mortar section with a security team (one automatic weapon) 220 m behind them. If the posts report you, the mortars will pack up and move north.",
    terrain: "Rolling grass with a hedge line and a shallow fold running north between the posts. Limited visibility: you see and are seen at short range only; muzzle flashes carry.",
    troops: "Your platoon: three rifle squads, weapons squad (two machine gun teams played; Javelin teams not played), platoon HQ.",
    time: "25 minutes before light improves.",
  },
  concepts: [tag("infiltration"), tag("bypass"), tag("surfaces-and-gaps")],
  terrain: {
    world: { w: 900, h: 600 }, light: "limited",
    rises: [{ cx: 290, cy: 310, r: 60, steps: 2, h: 2.5, top: 0.5, seed: 81 }, { cx: 610, cy: 310, r: 60, steps: 2, h: 2.5, top: 0.5, seed: 82 }],
    woods: [{ ring: blobRing(450, 470, 40, 83, 0.15, 40, 0.8) }, { ring: blobRing(100, 470, 70, 84, 0.15, 40, 0.9) }, { ring: blobRing(800, 470, 70, 85, 0.15, 40, 0.9) }],
    ditches: [{ pts: [[452, -20], [450, 120], [455, 250], [450, 380], [446, 440]], w: 5 }],
    hedges: [[[430, 60], [432, 200], [436, 330], [430, 420]]],
    roads: [{ pts: [[-20, 560], [450, 548], [920, 560]], w: 4 }],
    fields: [{ cx: 450, cy: 160, w: 400, d: 160, ang: 0, tint: "b" }],
  },
  forces: {
    friendly: platoon({ sq1: [440, 40], sq2: [470, 40], sq3: [410, 40], mg1: [390, 45], mg2: [500, 45], hq: [455, 30] }),
    enemy: [
      { id: "op1", kind: "pos", name: "Enemy observation post (west)", roles: ["tl", "r", "r"], at: [276, 292], face: 245, pose: "hole", slots: holes([[272, 290], [278, 294], [282, 289]], 245), dug: 0.5, ai: { type: "op", sector: 120, holdFire: 90 } },
      { id: "op2", kind: "pos", name: "Enemy observation post (east)", roles: ["tl", "r", "r"], at: [624, 292], face: 295, pose: "hole", slots: holes([[620, 289], [626, 294], [630, 290]], 295), dug: 0.5, ai: { type: "op", sector: 120, holdFire: 90 } },
      { id: "mortar", kind: "pos", name: "Enemy mortar section", roles: ["mtr", "mtr", "mtr", "mtr", "ar", "r", "r", "tl"], at: [450, 520], face: 270, pose: "hole", slots: holes([[440, 516], [444, 520], [458, 516], [462, 520], [430, 506], [470, 506], [450, 502], [450, 528]], 270), dug: 0.4, ai: { type: "defend" } },
    ],
  },
  objective: { x: 450, y: 520, r: 30, label: "Enemy mortar position" }, objectiveEls: ["mortar"], ccp: [455, 30],
  routes: {
    gap1: R("Through the gap (1st Squad)", [[440, 40], [448, 140], [452, 300], [448, 430], [450, 518]]),
    gap2: R("Through the gap (2nd Squad)", [[470, 40], [462, 140], [462, 300], [470, 440], [458, 516]]),
    gapSbf3: R("Through the gap to a firing point (3rd Squad)", [[410, 40], [440, 140], [442, 300], [410, 440]]),
    gapM1: R("Through the gap (MG 1)", [[390, 45], [436, 140], [438, 300], [420, 438]]), gapM2: R("Through the gap (MG 2)", [[500, 45], [458, 140], [458, 300], [485, 440]]),
    gapHQ: R("Through the gap (HQ)", [[455, 30], [450, 140], [450, 300], [452, 400]]),
    toOp1: R("Attack the west post", [[440, 40], [380, 200], [292, 310]]), toOp2: R("Attack the east post", [[470, 40], [540, 200], [608, 310]]),
    afterOp1: R("From the west post to the mortars", [[290, 312], [380, 420], [446, 516]]), afterOp2: R("From the east post to the mortars", [[610, 312], [520, 420], [456, 516]]),
    column: R("Platoon column straight up the middle", [[440, 40], [450, 300], [450, 518]]), columnB: R("Column (2nd Squad)", [[470, 40], [455, 300], [458, 516]]),
    columnC: R("Column (3rd Squad)", [[410, 40], [445, 300], [440, 440]]),
    west1: R("Wide west around the west post", [[440, 40], [150, 200], [130, 420], [440, 516]]), west2: R("Wide west (2nd Squad)", [[470, 40], [170, 210], [150, 440], [452, 520]]),
    mortarDisplace: R("Mortar displaces", [[450, 520], [456, 580], [462, 680]]),
  },
  triggers: {
    sbfSet: TG("When MG 1 has set support by fire", { when: "sbfSet", el: "mg1" }),
    lift: TG("Lift when 1st Squad is 40 m from the mortars", { when: "near", el: "sq1", target: [450, 520], dist: 40 }),
    op1Clear: TG("When the west post is cleared", { when: "cleared", target: "op1" }),
    op2Clear: TG("When the east post is cleared", { when: "cleared", target: "op2" }),
    now: TG("At once", { when: "start" }),
  },
  plans: [
    { id: "infiltrate", name: "Slip through the gap and bypass the posts", form: "Infiltration and bypass", doctrinal: true, concepts: ["infiltration", "bypass", "surfaces-and-gaps"],
      summary: "The whole platoon moves slow and low up the fold between the two posts' sectors, out of both fans; the MG teams and 3rd Squad set support by fire close to the mortars; 1st and 2nd Squads assault; the posts are bypassed.",
      assign: {
        mg1: { task: "sbf", route: "gapM1", target: "mortar", trigger: "lift", technique: "infiltrate", formation: "file" }, mg2: { task: "sbf", route: "gapM2", target: "mortar", trigger: "lift", technique: "infiltrate", formation: "file" },
        sq3: { task: "sbf", route: "gapSbf3", target: "mortar", trigger: "lift", technique: "infiltrate", formation: "file" },
        sq1: { task: "assault", route: "gap1", target: "mortar", trigger: "sbfSet", technique: "infiltrate", formation: "file" },
        sq2: { task: "assault", route: "gap2", target: "mortar", trigger: "sbfSet", technique: "infiltrate", formation: "file" },
        hq: { task: "move", route: "gapHQ", technique: "infiltrate", formation: "file" },
      } },
    { id: "clear-posts", name: "Destroy both posts, then the mortars", form: "Attack each position in turn", naive: true, concepts: [],
      summary: "1st Squad attacks the west post and 2nd Squad the east post; once they are cleared, everyone moves on to the mortars.",
      assign: {
        sq1: { task: "assault", route: "toOp1", target: "op1", trigger: "now", then: [{ task: "assault", route: "afterOp1", target: "mortar" }] },
        sq2: { task: "assault", route: "toOp2", target: "op2", trigger: "now", then: [{ task: "assault", route: "afterOp2", target: "mortar" }] },
        sq3: { task: "follow", route: "columnC", trigger: "op1Clear" }, mg1: { task: "follow", route: "gapM1", trigger: "op1Clear" }, mg2: { task: "follow", route: "gapM2", trigger: "op2Clear" },
        hq: { task: "move", route: "gapHQ" },
      } },
    { id: "column", name: "Platoon column at a walk", form: "Movement in column", concepts: ["bypass"],
      summary: "The platoon walks straight up the middle in column (traveling), then assaults the mortars.",
      assign: {
        sq1: { task: "assault", route: "column", target: "mortar", trigger: "now", technique: "travelling" }, sq2: { task: "assault", route: "columnB", target: "mortar", trigger: "now", technique: "travelling" },
        sq3: { task: "move", route: "columnC", technique: "travelling" }, mg1: { task: "move", route: "gapM1", technique: "travelling" }, mg2: { task: "move", route: "gapM2", technique: "travelling" },
        hq: { task: "move", route: "gapHQ", technique: "travelling" },
      } },
    { id: "wide-west", name: "Wide west around the posts", form: "Bypass to the west", concepts: ["bypass"],
      summary: "Swing far west around the west post (slow and low), then attack the mortars from the west.",
      assign: {
        sq1: { task: "assault", route: "west1", target: "mortar", trigger: "now", technique: "infiltrate" }, sq2: { task: "assault", route: "west2", target: "mortar", trigger: "now", technique: "infiltrate" },
        sq3: { task: "move", route: "columnC", technique: "infiltrate" }, mg1: { task: "move", route: "gapM1", technique: "infiltrate" }, mg2: { task: "move", route: "gapM2", technique: "infiltrate" },
        hq: { task: "move", route: "gapHQ", technique: "infiltrate" },
      } },
  ],
  choices: {
    sq1: { tasks: PL_CHOICE_TASKS, routes: ["gap1", "toOp1", "column", "west1"], triggers: ["sbfSet", "now"] },
    sq2: { tasks: PL_CHOICE_TASKS, routes: ["gap2", "toOp2", "columnB", "west2"], triggers: ["sbfSet", "now"] },
    sq3: { tasks: PL_CHOICE_TASKS, routes: ["gapSbf3", "columnC"], triggers: ["lift", "op1Clear", "now"] },
    mg1: { tasks: ["sbf", "move", "follow"], routes: ["gapM1"], triggers: ["lift", "op1Clear"] },
    mg2: { tasks: ["sbf", "move", "follow"], routes: ["gapM2"], triggers: ["lift", "op2Clear"] },
    hq: { tasks: ["move"], routes: ["gapHQ"], triggers: ["now"] },
  },
  onTick(S, api) {
    const shots = S.metrics.firstShotAt != null || S.metrics.enemyFireAt != null || S.metrics.assaults.length > 0;
    if ((S.flags.detected || shots) && !S.flags.alert) { S.flags.alert = S.t; S.flags.alertEarly = !S.metrics.assaults.some((x) => x.target === "mortar") && !S.byId.mortar.fireTarget && !(S.byId.mortar.supp > 0.2); api.log("alert", "The enemy posts report contact; the mortar crews start to pack up", { side: "h" }); }
    // once the fight starts at the mortars, the bypassed posts turn and fire into the platoon's rear
    if (S.flags.alert && !S.flags.opsTurned) {
      S.flags.opsTurned = S.t;
      for (const id of ["op1", "op2"]) { const o = S.byId[id]; o.ai = { ...o.ai, holdFire: 500, sector: 360 }; o.alert = true; }
    }
    const m = S.byId.mortar;
    if (S.flags.alert && !S.flags.displacing && S.t - S.flags.alert > 50 && m.ok > 0 && !m.surrendered && !S.flags["cleared:mortar"]) {
      S.flags.displacing = S.t; m.slots = null; m.pose0 = null; m.withdrawing = true;
      api.startOrder(m, { type: "move", route: S.scen.routes.mortarDisplace.pts, technique: "rush", label: "Displacing" }); m.steps = []; m.si = 0;
      api.log("displace", "The enemy mortar section displaces", { side: "h" });
    }
  },
  evaluate(S) {
    const m = S.byId.mortar;
    if (S.flags.displacing && m.ok > 0 && m.cy > 610) return { reason: "the mortars got away", tier: 3 };
    if (S.flags.displacing && m.ok > 0 && !S.flags["cleared:mortar"]) return null;
    if (m.ok === 0 || m.surrendered) return S.flags.displacing ? { reason: "the mortars were caught while displacing", tier: 2 } : { reason: "the enemy mortar position is destroyed", tier: 1 };
    return null;
  },
  onTimeout(S) { return { reason: "the mortars are still in action when light improves", tier: 3 }; },
  aarNotes(S) { return S.flags.alert && S.flags.alertEarly ? { why: [`The enemy was alerted at ${Math.floor(S.flags.alert / 60)}:${String(Math.floor(S.flags.alert % 60)).padStart(2, "0")}.`], improve: ["Bypass the observation posts: attacking them alerts the real target (Fig 21 Bypassing Strongpoints)."] } : { sustain: ["You stayed between the posts' sectors and were not reported."] }; },
};

// ---- company helpers ----
// Player company: three rifle platoons (each three squads + PL, RTO, PSG), a mortar section, and
// an attached tank section where the scenario says so.
const company = (pos, tanks = true) => [
  { id: "p1", kind: "platoon", name: "1st Platoon", short: "1st Plt", at: pos.p1, face: 90, formation: "column" },
  { id: "p2", kind: "platoon", name: "2nd Platoon", short: "2nd Plt", at: pos.p2, face: 90, formation: "column" },
  { id: "p3", kind: "platoon", name: "3rd Platoon", short: "3rd Plt", at: pos.p3, face: 90, formation: "column" },
  { id: "mtr", kind: "mortar", name: "Mortar section", short: "Mortars", at: pos.mtr, face: 90, formation: "line" },
  ...(tanks ? [{ id: "tk", kind: "tank", name: "Tank section (attached)", short: "Tanks", at: pos.tk, face: 90, formation: "line" }] : []),
];
const CO_TASKS = ["sbf", "assault", "breach", "follow", "reserve", "defend", "delay", "move"];
const ePlt = (id, name, x, y, face, n, w, ai, pose = "hole", dug = 0.5) => ({ id, kind: "pos", name, roles: Array.from({ length: n }, (_, i) => ["tl", "ar", "r", "r", "r", "ar", "r", "sl"][i % 8]), at: [x, y], face, pose, slots: arc(x, y, n, w, face), dug, ai });

// ======================================================================================
// 9. RIDGELINE (company attack: breach and penetration)
// ======================================================================================
const MINES = [{ ring: [[300, 470], [880, 470], [880, 520], [300, 520]] }, { ring: [[960, 470], [1100, 470], [1100, 520], [960, 520]] }];
const ridgeline = {
  id: "ridgeline", n: 9, level: "company", title: "Ridgeline", timeLimit: 1800,
  briefing: {
    mission: "Seize the Kestrel ridge to open the route north for the battalion.",
    enemy: "An enemy platoon (three squads and a machine gun) dug in along the crest, behind a wire obstacle and a minefield. The belt narrows to wire only at a gap 900 m from the left.",
    terrain: "Open slope up to the ridge. A low rise 320 m south of the crest gives a support-by-fire position with a view of the whole crest; a copse on the right reaches to within 170 m of the obstacle belt, which runs across the slope 130 m below the crest. Your assembly area is in the woods at the foot.",
    troops: "Your company: three rifle platoons, the mortar section, and an attached tank section (two tanks).",
    time: "30 minutes.",
  },
  concepts: [tag("combined-arms-dilemma"), tag("penetration"), tag("frontal-attack")],
  terrain: {
    world: { w: 1400, h: 900 }, light: "day",
    rises: [{ cx: 700, cy: 690, r: 330, steps: 3, h: 4, top: 0.65, seed: 91, squash: 0.32 }, { cx: 640, cy: 300, r: 80, steps: 2, h: 2.5, top: 0.5, seed: 92 }],
    woods: [{ ring: blobRing(140, 330, 110, 93, 0.15, 40, 0.8) }, { ring: blobRing(1270, 330, 100, 94, 0.15, 40, 0.8) }, { ring: blobRing(700, 860, 260, 95, 0.1, 48, 0.2) }, { ring: blobRing(740, 160, 330, 96, 0.08, 48, 0.14) }, { ring: blobRing(1010, 360, 60, 97, 0.12, 40, 1.1) }],
    wire: [[[300, 522], [600, 524], [900, 520], [1100, 522]]], mines: MINES,
    roads: [{ pts: [[700, -20], [690, 300], [920, 520], [900, 700], [880, 920]], w: 5 }],
    fields: [{ cx: 700, cy: 160, w: 700, d: 200, ang: 0, tint: "a" }],
  },
  forces: {
    friendly: company({ p1: [620, 170], p2: [840, 170], p3: [960, 165], mtr: [700, 120], tk: [720, 180] }),
    enemy: [
      ePlt("eW", "Enemy squad (west)", 520, 646, 270, 8, 80, { type: "defend", fallback: "eBackW" }),
      ePlt("eC", "Enemy squad (centre)", 700, 634, 270, 8, 80, { type: "defend", fallback: "eBackC" }),
      ePlt("eE", "Enemy squad (east)", 880, 662, 270, 8, 80, { type: "defend", fallback: "eBackE" }),
      { id: "eMG", kind: "mg", name: "Enemy machine gun", roles: ["mg", "ag", "r"], at: [790, 646], face: 270, pose: "hole", slots: holes([[786, 646], [791, 649], [796, 646]], 270), dug: 0.6, ai: { type: "defend", fallback: "eBackC" } },
    ],
  },
  objective: { x: 700, y: 685, r: 220, label: "Kestrel ridge" }, objectiveEls: ["eW", "eC", "eE", "eMG"], ccp: [700, 60],
  routes: {
    sbf1: R("To the support-by-fire rise", [[620, 170], [625, 240], [632, 330]]), sbfTk: R("Tanks to the rise", [[720, 180], [690, 250], [690, 340]]),
    stay: R("Stay", [[700, 120], [700, 122]]),
    breach2: R("Through the copse to the narrow gap in the belt", [[840, 170], [990, 300], [1000, 400], [920, 512]]),
    follow3: R("Wait in the copse, then through the lane to the east squad", [[1010, 360], [960, 450], [920, 530], [900, 610], [880, 660]]),
    then3: R("Roll up the crest westward", [[880, 660], [810, 655], [790, 648]]),
    then3b: R("On to the centre squad", [[790, 648], [720, 640], [700, 636]]),
    frontW: R("Straight at the west squad", [[620, 170], [560, 400], [520, 644]]), frontC: R("Straight at the centre squad", [[840, 170], [740, 400], [700, 632]]),
    frontE: R("Straight at the east squad", [[960, 165], [880, 400], [880, 660]]), frontTk: R("Tanks straight up", [[720, 180], [700, 400], [700, 500]]),
    breachC: R("To the belt in the centre (mined)", [[840, 170], [720, 300], [700, 512]]),
    followC: R("Through the centre to the centre squad", [[960, 165], [760, 300], [700, 420], [700, 530], [700, 632]]),
    eBackW: R("Enemy west squad withdraws", [[520, 680], [540, 800], [560, 920]]), eBackC: R("Enemy centre withdraws", [[700, 690], [700, 800], [700, 920]]), eBackE: R("Enemy east squad withdraws", [[880, 682], [870, 800], [860, 920]]),
  },
  triggers: {
    sbfSet: TG("When 1st Platoon has set support by fire", { when: "sbfSet", el: "p1" }),
    lane: TG("When a lane is open", { when: "lane" }),
    near2: TG("When 2nd Platoon is 100 m from the gap", { when: "near", el: "p2", target: [920, 512], dist: 100 }),
    lift3: TG("Lift when 3rd Platoon is 70 m from the east squad", { when: "near", el: "p3", target: [880, 662], dist: 70 }),
    clearedE: TG("When the east squad is cleared", { when: "cleared", target: "eE" }),
    now: TG("At once", { when: "start" }),
  },
  fires: { f: { calls: 0 } },
  plans: [
    { id: "breach", name: "Suppress, obscure, breach at the gap, pass through", form: "Penetration (breach under suppression)", doctrinal: true, concepts: ["combined-arms-dilemma", "penetration"],
      summary: "1st Platoon and the tanks set support by fire on the rise and suppress the crest; the mortars put smoke on the gap and high explosive on the east squad; 2nd Platoon breaches at the narrow, unmined gap; 3rd Platoon passes through the lane and rolls up the crest from the east.",
      assign: {
        p1: { task: "sbf", route: "sbf1", target: "eC", trigger: "lift3" }, tk: { task: "sbf", route: "sbfTk", target: "eMG" },
        p2: { task: "breach", route: "breach2", wait: "sbfSet" },
        p3: { task: "follow", route: "follow3", target: "eE", trigger: "lane", technique: "overwatch", then: [{ task: "assault", route: "then3", target: "eMG" }, { task: "assault", route: "then3b", target: "eC" }] },
        mtr: { task: "move", route: "stay" },
      },
      actions: [
        { el: "mtr", trigger: "near2", action: { type: "callfire", at: [905, 560], kind: "smoke", dur: 150 } },
        { el: "mtr", trigger: "lane", action: { type: "callfire", at: [880, 662], kind: "he", dur: 70 } },
        { el: "tk", trigger: "clearedE", action: { type: "shift", target: "eW" } },
      ] },
    { id: "frontal", name: "Three platoons abreast up the slope", form: "Frontal attack across the whole front", naive: true, concepts: ["frontal-attack"],
      summary: "All three platoons assault abreast straight up the slope at the three squads; the tanks advance with them.",
      assign: {
        p1: { task: "assault", route: "frontW", target: "eW", trigger: "now" }, p2: { task: "assault", route: "frontC", target: "eC", trigger: "now" }, p3: { task: "assault", route: "frontE", target: "eE", trigger: "now" },
        tk: { task: "move", route: "frontTk" }, mtr: { task: "move", route: "stay" },
      } },
    { id: "no-suppress", name: "Breach at the gap straight away", form: "Penetration at the gap (immediate breach)", concepts: ["penetration"],
      summary: "2nd Platoon breaches at the gap at once and 3rd Platoon passes through; 1st Platoon and the tanks stay back in reserve.",
      assign: {
        p2: { task: "breach", route: "breach2" }, p3: { task: "follow", route: "follow3", target: "eE", trigger: "lane", technique: "overwatch", then: [{ task: "assault", route: "then3", target: "eMG" }] },
        p1: { task: "move", route: "sbf1" }, tk: { task: "move", route: "stay" }, mtr: { task: "move", route: "stay" },
      } },
    { id: "centre-breach", name: "Suppress, breach in the centre", form: "Penetration in the centre", concepts: ["combined-arms-dilemma"],
      summary: "Support by fire as in the recommended plan, but 2nd Platoon breaches the mined belt in the centre and 3rd Platoon goes straight at the centre squad.",
      assign: {
        p1: { task: "sbf", route: "sbf1", target: "eC", trigger: { when: "near", el: "p3", target: [700, 634], dist: 70 } }, tk: { task: "sbf", route: "sbfTk", target: "eMG" },
        p2: { task: "breach", route: "breachC", wait: "sbfSet" }, p3: { task: "follow", route: "followC", target: "eC", trigger: "lane", technique: "overwatch" },
        mtr: { task: "move", route: "stay" },
      },
      actions: [{ el: "mtr", trigger: { when: "near", el: "p2", target: [700, 512], dist: 100 }, action: { type: "callfire", at: [700, 560], kind: "smoke", dur: 150 } }] },
  ],
  choices: {
    p1: { tasks: CO_TASKS, routes: ["sbf1", "frontW"], triggers: ["lift3", "now"] }, p2: { tasks: CO_TASKS, routes: ["breach2", "breachC", "frontC"], triggers: ["sbfSet", "now"] },
    p3: { tasks: CO_TASKS, routes: ["follow3", "followC", "frontE"], triggers: ["lane", "now"] }, tk: { tasks: ["sbf", "move"], routes: ["sbfTk", "frontTk", "stay"], triggers: ["now"] },
    mtr: { tasks: ["move"], routes: ["stay"], triggers: ["near2", "lane"], fires: ["smoke at the gap", "HE on the east squad"] },
  },
  evaluate(S) {
    const out = ["eW", "eC", "eE", "eMG"].filter((id) => S.flags[`cleared:${id}`]).length;
    if (out >= 4 || (out >= 3 && S.flags["cleared:eE"] && S.flags["cleared:eC"])) return { reason: "the ridge is taken", tier: 1 };
    return null;
  },
  onTimeout(S) {
    const out = ["eW", "eC", "eE", "eMG"].filter((id) => S.flags[`cleared:${id}`]).length;
    return out >= 2 ? { reason: "a foothold on the ridge, but the enemy still holds part of it", tier: 2 } : { reason: "the enemy still holds the ridge", tier: 3 };
  },
};

// ======================================================================================
// 10. KESSEL CROSSROADS (company attack: envelopment to the rear; a true turning movement is a division-and-above form, FM 3-90 2-71)
// ======================================================================================
const TOWN = [[640, 430], [700, 425], [760, 432], [660, 470], [740, 475], [700, 505], [620, 500], [780, 505]];
const kessel = {
  id: "kessel-crossroads", n: 10, level: "company", title: "Kessel Crossroads", timeLimit: 1800,
  briefing: {
    mission: "Open Kessel crossroads for the battalion: the town must be clear of enemy.",
    enemy: "A reinforced enemy platoon holds the town in stone houses facing south, with a machine gun and a reserve squad. Its supply and withdrawal route runs north through the road junction 300 m behind the town.",
    terrain: "Open fields south of Kessel with a hedge 200 m short of it. A covered route runs east behind the Lammer woods and round to the junction. Roads cross in the town and at the junction.",
    troops: "Your company: three rifle platoons, the mortar section, and an attached tank section (two tanks).",
    time: "30 minutes.",
  },
  concepts: [tag("double-envelopment"), tag("turning-movement"), tag("frontal-attack")],
  terrain: {
    world: { w: 1400, h: 900 }, light: "day",
    woods: [{ ring: blobRing(1120, 420, 110, 101, 0.12, 48, 2.0) }, { ring: blobRing(250, 420, 100, 102, 0.12, 48, 1.8) }, { ring: blobRing(700, 860, 120, 103, 0.15, 40, 0.5) }],
    hedges: [[[400, 250], [700, 255], [1000, 250]]],
    roads: [{ pts: [[700, -20], [700, 450], [700, 760], [700, 920]], w: 6 }, { pts: [[-20, 460], [700, 455], [1420, 465]], w: 5 }, { pts: [[-20, 760], [700, 760], [1420, 770]], w: 5 }],
    houses: TOWN.map(([x, y], i) => ({ x, y, ang: (i * 37) % 90, len: 18, wid: 12 })).concat([{ x: 735, y: 745, ang: 0, len: 14, wid: 9 }]),
    fields: [{ cx: 700, cy: 140, w: 600, d: 180, ang: 0, tint: "a" }, { cx: 700, cy: 620, w: 400, d: 140, ang: 0, tint: "b" }],
  },
  forces: {
    friendly: company({ p1: [700, 80], p2: [880, 70], p3: [560, 70], mtr: [700, 40], tk: [940, 90] }),
    enemy: [
      { id: "eS", kind: "pos", name: "Enemy squad (south edge)", roles: ["tl", "ar", "r", "r", "tl", "ar", "r", "r"], at: [700, 428], face: 270, pose: "building", slots: arc(700, 428, 8, 110, 270), dug: 0.6, ai: { type: "defend", fallback: "eOut", cutFlag: "junction" } },
      { id: "eW", kind: "pos", name: "Enemy squad (west houses)", roles: ["tl", "ar", "r", "r", "tl", "ar", "r", "r"], at: [640, 470], face: 230, pose: "building", slots: arc(640, 470, 8, 60, 230), dug: 0.6, ai: { type: "defend", fallback: "eOut", cutFlag: "junction" } },
      { id: "eE", kind: "pos", name: "Enemy squad (east houses)", roles: ["tl", "ar", "r", "r", "tl", "ar", "r", "r"], at: [760, 472], face: 310, pose: "building", slots: arc(760, 472, 8, 60, 310), dug: 0.6, ai: { type: "defend", fallback: "eOut", cutFlag: "junction" } },
      { id: "eMG", kind: "mg", name: "Enemy machine gun", roles: ["mg", "ag", "r"], at: [700, 450], face: 270, pose: "building", slots: holes([[696, 450], [700, 452], [704, 450]], 270), dug: 0.6, ai: { type: "defend", fallback: "eOut", cutFlag: "junction" } },
      { id: "eR", kind: "pos", name: "Enemy reserve squad", roles: ["tl", "ar", "r", "r", "tl", "ar", "r", "r"], at: [700, 520], face: 270, pose: "building", slots: arc(700, 520, 8, 50, 270), dug: 0.3, ai: { type: "reserve", zone: { x: 700, y: 470, r: 120 }, route: "eRc" } },
    ],
  },
  objective: { x: 700, y: 465, r: 130, label: "Kessel crossroads (town)" }, objectiveEls: ["eS", "eW", "eE", "eMG", "eR"], ccp: [700, 50],
  routes: {
    fix1: R("To the hedge facing the town", [[700, 80], [700, 200], [700, 248]]),
    turn2: R("East behind the woods, round to the junction", [[880, 70], [1000, 150], [1240, 300], [1250, 650], [1000, 770], [740, 768]]),
    turnTk: R("Tanks with 2nd Platoon", [[940, 90], [1050, 160], [1270, 320], [1270, 660], [1020, 785], [780, 780]]),
    res3: R("Reserve behind the hedge", [[560, 70], [600, 200]]),
    clear3: R("Into the town from the east after the junction is held", [[600, 200], [900, 300], [860, 470], [760, 472]]),
    envW: R("West round the town", [[560, 70], [400, 300], [500, 480], [640, 470]]), envE: R("East round the town", [[880, 70], [1000, 300], [900, 480], [760, 472]]),
    envTk: R("Tanks east", [[940, 90], [1020, 300], [940, 420]]),
    frontS: R("Straight at the south edge", [[700, 80], [700, 300], [700, 428]]), frontW: R("Straight at the west houses", [[560, 70], [600, 300], [640, 470]]),
    frontE: R("Straight at the east houses", [[880, 70], [800, 300], [760, 472]]), frontTk: R("Tanks up the road", [[940, 90], [740, 260], [720, 330]]),
    stay: R("Stay", [[700, 40], [700, 42]]),
    eOut: R("Enemy withdrawal north", [[700, 470], [700, 760], [700, 930]]), eRc: R("Enemy reserve counterattack", [[700, 520], [700, 470]]),
  },
  triggers: {
    sbfSet: TG("When 1st Platoon has set support by fire", { when: "sbfSet", el: "p1" }),
    junction: TG("When the junction is held", { when: "flag", name: "junction" }),
    lift: TG("Lift when a platoon enters the town", { when: "any", of: [{ when: "near", el: "p3", target: [700, 465], dist: 90 }, { when: "near", el: "p2", target: [700, 465], dist: 90 }] }),
    now: TG("At once", { when: "start" }),
  },
  plans: [
    { id: "turn", name: "Fix the town, seize the junction behind it", form: "Envelopment to the enemy's rear, with a fixing force", doctrinal: true, concepts: ["double-envelopment", "turning-movement"],
      summary: "1st Platoon and the mortars fix the town from the hedge; 2nd Platoon and the tanks go round behind the Lammer woods and seize the junction behind the town, cutting its withdrawal and supply route; once the junction is held, 3rd Platoon clears the town from the east.",
      assign: {
        p1: { task: "sbf", route: "fix1", target: "eS", trigger: "lift" },
        p2: { task: "defend", route: "turn2", face: 270, technique: "travelling" }, tk: { task: "defend", route: "turnTk", face: 270, technique: "travelling" },
        p3: { task: "follow", route: "clear3", target: "eE", trigger: "junction", technique: "overwatch", then: [{ task: "assault", route: [[760, 472], [700, 450]], target: "eMG" }, { task: "assault", route: [[700, 450], [640, 470]], target: "eW" }] },
        mtr: { task: "move", route: "stay" },
      },
      actions: [{ el: "mtr", trigger: "sbfSet", action: { type: "callfire", at: [700, 435], kind: "he", dur: 90 } }] },
    { id: "frontal", name: "Three platoons at the town", form: "Frontal attack", naive: true, concepts: ["frontal-attack"],
      summary: "All three platoons assault the town straight from the south; the tanks drive up the road behind them.",
      assign: {
        p1: { task: "assault", route: "frontS", target: "eS", trigger: "now" }, p2: { task: "assault", route: "frontE", target: "eE", trigger: "now" }, p3: { task: "assault", route: "frontW", target: "eW", trigger: "now" },
        tk: { task: "move", route: "frontTk" }, mtr: { task: "move", route: "stay" },
      } },
    { id: "double", name: "Fix, and envelop both sides of the town", form: "Double envelopment", concepts: ["double-envelopment"],
      summary: "1st Platoon fixes from the hedge; 2nd Platoon with the tanks attacks the east houses and 3rd Platoon the west houses from the flanks at the same time.",
      assign: {
        p1: { task: "sbf", route: "fix1", target: "eS", trigger: "lift" },
        p2: { task: "assault", route: "envE", target: "eE", trigger: "sbfSet" }, p3: { task: "assault", route: "envW", target: "eW", trigger: "sbfSet" },
        tk: { task: "sbf", route: "envTk", target: "eE" }, mtr: { task: "move", route: "stay" },
      },
      actions: [{ el: "mtr", trigger: "sbfSet", action: { type: "callfire", at: [700, 435], kind: "he", dur: 90 } }] },
    { id: "single", name: "Fix, and hit the east flank", form: "Single envelopment", concepts: ["double-envelopment"],
      summary: "1st Platoon fixes; 2nd Platoon with the tanks attacks the east houses; 3rd Platoon stays in reserve.",
      assign: {
        p1: { task: "sbf", route: "fix1", target: "eS", trigger: "lift" }, p2: { task: "assault", route: "envE", target: "eE", trigger: "sbfSet" },
        tk: { task: "sbf", route: "envTk", target: "eE" }, p3: { task: "reserve", route: "res3" }, mtr: { task: "move", route: "stay" },
      } },
  ],
  choices: {
    p1: { tasks: CO_TASKS, routes: ["fix1", "frontS"], triggers: ["lift", "now"] }, p2: { tasks: CO_TASKS, routes: ["turn2", "envE", "frontE"], triggers: ["sbfSet", "now"] },
    p3: { tasks: CO_TASKS, routes: ["clear3", "envW", "frontW", "res3"], triggers: ["junction", "sbfSet", "now"] }, tk: { tasks: ["defend", "sbf", "move"], routes: ["turnTk", "envTk", "frontTk"], triggers: ["now"] },
    mtr: { tasks: ["move"], routes: ["stay"], triggers: ["sbfSet"], fires: ["HE on the town's south edge"] },
  },
  onTick(S, api) {
    if (!S.flags.junction) {
      const n = S.soldiers.filter((s) => s.side === "f" && s.status === "ok" && Math.hypot(s.x - 720, s.y - 765) < 60).length;
      if (n >= 6) { S.flags.junction = S.t; api.log("objective", "The road junction behind the town is held: the enemy's withdrawal and supply route is cut", { side: "f" }); }
    } else {
      // cut off: the town's defenders lose heart over time (in this model)
      for (const e of S.els) if (e.side === "h" && e.ok > 0 && !e.surrendered && Math.hypot(e.cx - 700, e.cy - 465) < 150) e.cohesion = Math.max(0, e.cohesion - 0.0028 * N.combatDt);
    }
  },
  evaluate(S) {
    const town = ["eS", "eW", "eE", "eMG", "eR"];
    if (town.every((id) => S.flags[`cleared:${id}`] || S.byId[id].ok === 0 || S.byId[id].surrendered || Math.hypot(S.byId[id].cx - 700, S.byId[id].cy - 465) > 170)) return { reason: "Kessel crossroads is open", tier: 1 };
    return null;
  },
  onTimeout(S) {
    const out = ["eS", "eW", "eE", "eMG", "eR"].filter((id) => S.flags[`cleared:${id}`]).length;
    return out >= 2 ? { reason: "part of the town is clear, but the crossroads is still covered by fire", tier: 2 } : { reason: "the enemy still holds Kessel", tier: 3 };
  },
};

// ======================================================================================
// 11. VALLEY DELAY (company delay)
// ======================================================================================
const eBn = (id, name, x, y, start, route, n = 16) => ({ id, kind: "pos", name, roles: Array.from({ length: n }, (_, i) => ["tl", "ar", "r", "r", "r", "r", "ar", "r"][i % 8]), at: [x, y], face: 270, formation: "line", ai: { type: "advance", route, engage: 420, deploy: 75, start, fallback: "eBack", technique: "rush" } });
const valley = {
  id: "valley-delay", n: 11, level: "company", title: "Valley Delay", timeLimit: 1500, scoreTime: "held",
  briefing: {
    mission: "Delay the enemy advance down the Orlen valley for 25 minutes without becoming decisively engaged, so the battalion can finish its defense behind you.",
    enemy: "An enemy battalion advancing south down the valley, entering from the north edge: dismounted companies in front, a pair of armored vehicles. It will deploy and attack whatever fires on it.",
    terrain: "A valley 800 m wide between wooded ridges. Three lines cross it: a hedge (Line Ash, 680 m), a belt of copses (Line Birch, 450 m) and a hedge and ditch (Line Cedar, 230 m). The battalion is behind Line Dale, at the south edge.",
    troops: "Your company: three rifle platoons and the mortar section. No tanks.",
    time: "Hold the enemy north of Line Dale for 25 minutes.",
  },
  concepts: [tag("retrograde"), tag("culminating-point"), tag("elastic-defense")],
  terrain: {
    world: { w: 1400, h: 900 }, light: "day",
    rises: [{ cx: 140, cy: 450, r: 130, steps: 3, h: 4, top: 0.55, seed: 111, squash: 3.2 }, { cx: 1260, cy: 450, r: 130, steps: 3, h: 4, top: 0.55, seed: 112, squash: 3.2 }],
    woods: [{ ring: blobRing(130, 450, 100, 113, 0.1, 48, 3.8), density: 0.55 }, { ring: blobRing(1270, 450, 100, 114, 0.1, 48, 3.8), density: 0.55 }, { ring: blobRing(450, 445, 60, 115, 0.15, 40, 0.6) }, { ring: blobRing(700, 440, 60, 116, 0.15, 40, 0.6) }, { ring: blobRing(950, 445, 60, 117, 0.15, 40, 0.6) }],
    hedges: [[[300, 680], [700, 684], [1100, 680]], [[300, 230], [700, 226], [1100, 230]]],
    ditches: [{ pts: [[300, 220], [700, 216], [1100, 220]], w: 3 }],
    roads: [{ pts: [[700, 920], [690, 600], [710, 300], [700, -20]], w: 6 }],
    fields: [{ cx: 700, cy: 790, w: 600, d: 150, ang: 0, tint: "a" }, { cx: 700, cy: 330, w: 600, d: 120, ang: 0, tint: "b" }],
  },
  forces: {
    friendly: company({ p1: [550, 668], p2: [850, 668], p3: [700, 436], mtr: [700, 120] }, false).map((e) => (e.kind === "platoon" ? { ...e, dug: 0.45 } : e)),
    enemy: [
      eBn("e1", "Enemy company A (west)", 560, 1060, 0, "eW"), eBn("e2", "Enemy company A (east)", 840, 1060, 0, "eE"),
      eBn("e3", "Enemy company B (west)", 520, 1080, 150, "eW2"), eBn("e4", "Enemy company B (east)", 880, 1080, 150, "eE2"),
      eBn("e5", "Enemy company C (centre)", 700, 1080, 330, "eC"),
      { id: "ev", kind: "tank", name: "Enemy armored vehicles", roles: ["ifv", "ifv"], at: [700, 1080], face: 270, formation: "file", ai: { type: "advance", route: "eC", engage: 350, deploy: 60, start: 200, assault: false, fallback: "eBack" } },
    ],
  },
  objective: { x: 700, y: 60, r: 0, label: "Line Dale (battalion's defense)" }, objectiveEls: [], ccp: [700, 40], rally: [700, 40],
  routes: {
    eW: R("Enemy west axis", [[560, 1060], [560, 600], [560, 300], [570, 0]]), eE: R("Enemy east axis", [[840, 1060], [840, 600], [840, 300], [830, 0]]),
    eW2: R("Enemy west axis (2)", [[520, 1080], [480, 600], [480, 300], [520, 0]]), eE2: R("Enemy east axis (2)", [[880, 1080], [920, 600], [920, 300], [880, 0]]),
    eC: R("Enemy centre axis", [[700, 1080], [690, 600], [710, 300], [700, 0]]), eBack: R("Enemy falls back", [[700, 600], [700, 1100]]),
    a1c: R("1st Plt: Line Ash to Line Cedar", [[550, 668], [540, 450], [560, 236]]), a2c: R("2nd Plt: Line Ash to Line Cedar", [[850, 668], [860, 450], [840, 236]]),
    b3d: R("3rd Plt: Line Birch to Line Dale", [[700, 436], [700, 250], [700, 60]]),
    c1d: R("1st Plt: Line Cedar to Line Dale", [[560, 236], [600, 140], [620, 50]]), c2d: R("2nd Plt: Line Cedar to Line Dale", [[840, 236], [800, 140], [780, 50]]),
    s1ab: R("1st Plt: Ash to Birch", [[450, 668], [450, 446]]), s2ab: R("2nd Plt: Ash to Birch", [[700, 668], [700, 446]]), s3ab: R("3rd Plt: Ash to Birch", [[950, 668], [950, 446]]),
    s1bc: R("1st Plt: Birch to Cedar", [[450, 446], [450, 236]]), s2bc: R("2nd Plt: Birch to Cedar", [[700, 446], [700, 236]]), s3bc: R("3rd Plt: Birch to Cedar", [[950, 446], [950, 236]]),
    s1cd: R("1st Plt: Cedar to Dale", [[450, 236], [560, 50]]), s2cd: R("2nd Plt: Cedar to Dale", [[700, 236], [700, 50]]), s3cd: R("3rd Plt: Cedar to Dale", [[950, 236], [840, 50]]),
    ash1: R("1st Plt to Line Ash (west)", [[550, 668], [450, 668]]), ash2: R("2nd Plt to Line Ash (centre)", [[850, 668], [700, 668]]), ash3: R("3rd Plt to Line Ash (east)", [[700, 436], [950, 668]]),
    stay: R("Stay", [[700, 120], [700, 122]]),
  },
  triggers: {
    near1: TG("When the enemy is 330 m from 1st Platoon", { when: "enemyNear", at: [550, 670], dist: 330 }),
    near2: TG("When the enemy is 330 m from 2nd Platoon", { when: "enemyNear", at: [850, 670], dist: 330 }),
    near3: TG("When the enemy is 330 m from Line Birch", { when: "enemyNear", at: [700, 440], dist: 330 }),
    nearC1: TG("When the enemy is 330 m from Line Cedar (west)", { when: "enemyNear", at: [560, 236], dist: 330 }),
    nearC2: TG("When the enemy is 330 m from Line Cedar (east)", { when: "enemyNear", at: [840, 236], dist: 330 }),
    nearAsh: TG("When the enemy is 330 m from Line Ash", { when: "enemyNear", at: [700, 670], dist: 330 }),
    nearBirch: TG("When the enemy is 330 m from Line Birch", { when: "enemyNear", at: [700, 446], dist: 330 }),
    nearCedar: TG("When the enemy is 330 m from Line Cedar", { when: "enemyNear", at: [700, 236], dist: 330 }),
    firstSight: TG("As soon as the enemy is within 600 m", { when: "enemyNear", at: [700, 670], dist: 600 }),
    firstSightB: TG("As soon as the enemy is within 600 m of Birch", { when: "enemyNear", at: [700, 446], dist: 600 }),
    firstSightC: TG("As soon as the enemy is within 600 m of Cedar", { when: "enemyNear", at: [700, 236], dist: 600 }),
    mFire1: TG("When the enemy is 520 m from Line Ash", { when: "enemyNear", at: [700, 670], dist: 520 }),
    mFire2: TG("When the enemy is 450 m from Line Birch", { when: "enemyNear", at: [700, 446], dist: 450 }),
    mFire3: TG("When the enemy is 450 m from Line Cedar", { when: "enemyNear", at: [700, 236], dist: 450 }),
    never: TG("Never", { when: "flag", name: "never" }),
  },
  plans: [
    { id: "alternating", name: "Delay from alternating positions", form: "Delay (alternating positions)", doctrinal: true, concepts: ["retrograde", "culminating-point"],
      summary: "1st and 2nd Platoons engage from Line Ash while 3rd Platoon waits on Line Birch. When the enemy closes, Ash falls back through Birch to Line Cedar while Birch covers them; then Birch falls back to Line Dale while Cedar covers, and so on: one line always in position, each enemy attack hits empty ground. Mortars fire on the enemy as it deploys.",
      assign: {
        p1: { task: "delay", route: "a1c", trigger: "near1", face: 90, then: [{ task: "delay", route: "c1d", trigger: "nearC1", face: 90 }] },
        p2: { task: "delay", route: "a2c", trigger: "near2", face: 90, then: [{ task: "delay", route: "c2d", trigger: "nearC2", face: 90 }] },
        p3: { task: "delay", route: "b3d", trigger: "near3", face: 90 },
        mtr: { task: "move", route: "stay" },
      },
      actions: [
        { el: "mtr", trigger: "mFire1", action: { type: "callfire", at: [700, 900], kind: "he", dur: 90 } },
        { el: "mtr", trigger: "near1", action: { type: "callfire", at: [700, 740], kind: "smoke", dur: 120 } },
        { el: "mtr", trigger: "mFire2", action: { type: "callfire", at: [700, 690], kind: "he", dur: 90 } },
        { el: "mtr", trigger: "nearC1", action: { type: "callfire", at: [700, 300], kind: "smoke", dur: 120 } },
      ] },
    { id: "stand", name: "Stand and fight on Line Ash", form: "Defend in place", naive: true, concepts: [],
      summary: "All three platoons dig in on Line Ash and hold there.",
      assign: { p1: { task: "defend", route: "ash1", face: 90 }, p2: { task: "defend", route: "ash2", face: 90 }, p3: { task: "defend", route: "ash3", face: 90 }, mtr: { task: "move", route: "stay" } },
      actions: [{ el: "mtr", trigger: "mFire1", action: { type: "callfire", at: [700, 830], kind: "he", dur: 90 } }] },
    { id: "subsequent", name: "Delay from subsequent positions", form: "Delay (subsequent positions)", concepts: ["retrograde"],
      summary: "All three platoons on one line; they fall back together from Ash to Birch to Cedar to Dale. No second line is in position to cover the move (the game's simplification; FM 3-90 has units stagger their displacement).",
      assign: {
        p1: { task: "delay", route: "s1ab", trigger: "nearAsh", face: 90, then: [{ task: "delay", route: "s1bc", trigger: "nearBirch", face: 90 }, { task: "delay", route: "s1cd", trigger: "nearCedar", face: 90 }] },
        p2: { task: "delay", route: "s2ab", trigger: "nearAsh", face: 90, then: [{ task: "delay", route: "s2bc", trigger: "nearBirch", face: 90 }, { task: "delay", route: "s2cd", trigger: "nearCedar", face: 90 }] },
        p3: { task: "delay", route: "s3ab", trigger: "nearAsh", face: 90, then: [{ task: "delay", route: "s3bc", trigger: "nearBirch", face: 90 }, { task: "delay", route: "s3cd", trigger: "nearCedar", face: 90 }] },
        mtr: { task: "move", route: "stay" },
      },
      actions: [{ el: "mtr", trigger: "mFire1", action: { type: "callfire", at: [700, 830], kind: "he", dur: 90 } }, { el: "mtr", trigger: "mFire2", action: { type: "callfire", at: [700, 640], kind: "he", dur: 90 } }] },
    { id: "early", name: "Fall back as soon as the enemy appears", form: "Withdrawal by lines", concepts: [],
      summary: "Each line falls back as soon as the enemy comes into view, before it has to deploy.",
      assign: {
        p1: { task: "delay", route: "a1c", trigger: "firstSight", face: 90, then: [{ task: "delay", route: "c1d", trigger: "firstSightC", face: 90 }] },
        p2: { task: "delay", route: "a2c", trigger: "firstSight", face: 90, then: [{ task: "delay", route: "c2d", trigger: "firstSightC", face: 90 }] },
        p3: { task: "delay", route: "b3d", trigger: "firstSightB", face: 90 }, mtr: { task: "move", route: "stay" },
      } },
  ],
  choices: {
    p1: { tasks: ["delay", "defend"], routes: ["a1c", "s1ab", "ash1"], triggers: ["near1", "nearAsh", "firstSight", "never"] },
    p2: { tasks: ["delay", "defend"], routes: ["a2c", "s2ab", "ash2"], triggers: ["near2", "nearAsh", "firstSight", "never"] },
    p3: { tasks: ["delay", "defend"], routes: ["b3d", "s3ab", "ash3"], triggers: ["near3", "nearAsh", "firstSightB", "never"] },
    mtr: { tasks: ["move"], routes: ["stay"], triggers: ["mFire1", "mFire2", "mFire3"] },
  },
  onTick(S, api) {
    // decisively engaged (in this model): enemy in close combat with an element, or enemy within
    // 150 m of it for 45 s running, so it can no longer break contact
    for (const a of S.els) if (a.side === "h" && a.inAssault && a.curTarget && S.byId[a.curTarget].side === "f" && !S.flags.decisive) { S.flags.decisive = S.t; S.flags.decisiveEl = a.curTarget; api.log("decisive", `${S.byId[a.curTarget].name} is decisively engaged`, { side: "f" }); }
    for (const f of S.els) {
      if (f.side !== "f" || f.kind !== "platoon" || !(f.ok > 0) || S.flags.decisive) continue;
      const close = api.okNear("h", f.cx, f.cy, 150) > 0;
      f.closeT = close ? (f.closeT || 0) + N.combatDt : 0;
      if (f.closeT >= 45) { S.flags.decisive = S.t; S.flags.decisiveEl = f.id; api.log("decisive", `${f.name} is decisively engaged`, { side: "f" }); }
    }
  },
  evaluate(S) {
    if (S.flags.decisive) return { reason: `${S.byId[S.flags.decisiveEl].name} was decisively engaged`, tier: 3 };
    const past = S.soldiers.some((s) => s.side === "h" && s.status === "ok" && s.y < 70);
    if (past) return S.t >= 900 ? { reason: `the enemy reached Line Dale after ${Math.floor(S.t / 60)} minutes`, tier: 2 } : { reason: `the enemy reached Line Dale after only ${Math.floor(S.t / 60)} minutes`, tier: 3 };
    return null;
  },
  onTimeout() { return { reason: "the enemy was held north of Line Dale for 25 minutes", tier: 1 }; },
  aarNotes(S) { return { why: [`Time held: ${Math.floor((S.done?.t ?? S.t) / 60)} of 25 minutes.`] }; },
};

// ======================================================================================
// 12. COUNTERSTROKE (company as the striking force of a mobile defense)
// ======================================================================================
const eCol = (id, name, x, y, start, n = 20) => ({ id, kind: "pos", name, roles: Array.from({ length: n }, (_, i) => ["tl", "ar", "r", "r", "r", "ar", "r", "sl"][i % 8]), at: [x, y], face: 270, formation: "line", ai: { type: "advance", route: "eRoad", engage: 380, deploy: 45, start, fallback: "eBack" } });
const counterstroke = {
  id: "counterstroke", n: 12, level: "company", title: "Counterstroke", timeLimit: 1200,
  briefing: {
    mission: "The enemy has broken through the neighbouring company. Your company is the striking force: destroy the penetration before it reaches the Hollin bridge.",
    enemy: "A reinforced enemy company (three platoons and two armored vehicles) is pushing south down the Hollin road. A platoon of B Company is dug in across the road at Holt farm to stop it.",
    terrain: "The Hollin road runs south through open fields. The Lammer woods screen your assembly area east of the road. The bridge is at the south edge.",
    troops: "Your company: three rifle platoons, the mortar section, and an attached tank section (two tanks). B Company's platoon at Holt farm is not under your command.",
    time: "20 minutes.",
  },
  concepts: [tag("mobile-defense"), tag("flank-attack"), tag("culminating-point")],
  terrain: {
    world: { w: 1400, h: 900 }, light: "day",
    woods: [{ ring: blobRing(1020, 470, 70, 121, 0.12, 48, 2.6) }, { ring: blobRing(300, 500, 120, 122, 0.15, 40, 1.2) }],
    hedges: [[[560, 420], [700, 418], [840, 420]]],
    roads: [{ pts: [[700, 920], [700, 400], [700, 100], [700, -20]], w: 6 }],
    streams: [{ pts: [[-20, 100], [700, 96], [1420, 104]], w: 12 }],
    houses: [{ x: 650, y: 380, ang: 0, len: 16, wid: 11 }, { x: 760, y: 375, ang: 90, len: 14, wid: 9 }, { x: 720, y: 140, ang: 0, len: 14, wid: 9 }],
    fields: [{ cx: 700, cy: 650, w: 500, d: 220, ang: 0, tint: "a" }],
  },
  forces: {
    friendly: [
      ...company({ p1: [1160, 430], p2: [1160, 520], p3: [1220, 470], mtr: [1250, 300], tk: [1180, 380] }),
      { id: "block", kind: "pos", ally: true, name: "B Company platoon (blocking, not yours)", roles: ["pl", "rto", "tl", "ar", "r", "r", "tl", "ar", "r", "r", "sl", "tl", "ar", "r", "r", "tl", "ar", "r", "r", "sl"], at: [700, 410], face: 90, pose: "hole", slots: arc(700, 410, 20, 150, 90), dug: 0.6, ai: { type: "defend" } },
    ],
    enemy: [
      eCol("e1", "Enemy lead platoon", 700, 860, 0), eCol("e2", "Enemy second platoon", 690, 880, 30), eCol("e3", "Enemy third platoon", 710, 895, 60),
      { id: "ev", kind: "tank", name: "Enemy armored vehicles", roles: ["ifv", "ifv"], at: [700, 890], face: 270, formation: "file", ai: { type: "advance", route: "eRoad", engage: 500, deploy: 30, start: 45, assault: false, fallback: "eBack" } },
    ],
  },
  objective: { x: 700, y: 120, r: 100, label: "Hollin bridge" }, objectiveEls: ["e1", "e2", "e3", "ev"], ccp: [1200, 450], rally: [700, 130],
  routes: {
    eRoad: R("Enemy axis down the road", [[700, 880], [700, 600], [700, 400], [700, 110]]), eBack: R("Enemy falls back north", [[700, 600], [700, 950]]),
    flank1: R("Round the woods into the flank (1st Plt)", [[1160, 430], [1120, 600], [960, 660], [820, 600]]),
    flank2: R("Round the woods into the flank (2nd Plt)", [[1160, 520], [1140, 650], [980, 700], [830, 650]]),
    flankTk: R("Tanks round the woods", [[1180, 380], [1160, 620], [1000, 640], [900, 610]]),
    flank3: R("3rd Plt behind the striking force", [[1220, 470], [1180, 640], [1000, 680], [880, 640]]),
    direct1: R("Straight at the column (1st Plt)", [[1160, 430], [950, 560], [780, 700]]), direct2: R("Straight at the column (2nd Plt)", [[1160, 520], [960, 620], [790, 760]]),
    directTk: R("Tanks straight at the column", [[1180, 380], [950, 520], [820, 640]]),
    blockW: R("Reinforce Holt farm (west)", [[1160, 430], [900, 300], [620, 400]]), blockE: R("Reinforce Holt farm (east)", [[1160, 520], [950, 350], [790, 400]]),
    blockC: R("Reinforce Holt farm (centre)", [[1220, 470], [950, 330], [700, 380]]), blockTk: R("Tanks to Holt farm", [[1180, 380], [900, 330], [740, 360]]),
    stay: R("Stay", [[1250, 300], [1250, 302]]),
  },
  triggers: {
    fixed: TG("When the enemy is fixed at Holt farm", { when: "flag", name: "enemyFixed" }),
    fixed60: TG("A minute after the enemy is fixed", { when: "flag", name: "enemyFixed60" }),
    now: TG("At once", { when: "start" }),
    late: TG("When Holt farm falls, or at 12:00", { when: "any", of: [{ when: "flag", name: "blockBroken" }, { when: "time", t: 720 }] }),
  },
  plans: [
    { id: "strike-fixed", name: "Wait until it is fixed, then strike its flank", form: "Mobile defense: striking force", doctrinal: true, concepts: ["mobile-defense", "flank-attack", "culminating-point"],
      summary: "Stay hidden behind the Lammer woods until the enemy is fixed against B Company at Holt farm; then 1st and 2nd Platoons and the tanks strike into its east flank and rear, the mortars fire on it, and 3rd Platoon follows to finish it.",
      assign: {
        p1: { task: "counterattack", route: "flank1", zone: { x: 700, y: 560, r: 240 }, wait: "fixed" }, p2: { task: "counterattack", route: "flank2", zone: { x: 700, y: 580, r: 240 }, wait: "fixed" },
        tk: { task: "counterattack", route: "flankTk", zone: { x: 700, y: 560, r: 240 }, wait: "fixed", technique: "travelling" },
        p3: { task: "counterattack", route: "flank3", zone: { x: 700, y: 560, r: 260 }, wait: "fixed60" }, mtr: { task: "move", route: "stay" },
      },
      actions: [{ el: "mtr", trigger: "fixed", action: { type: "callfire", at: [700, 540], kind: "he", dur: 120 } }] },
    { id: "go-now", name: "Attack at once", form: "Immediate counterattack (meeting engagement)", naive: true, concepts: [],
      summary: "Move out immediately and attack the enemy column head-on while it is still moving.",
      assign: {
        p1: { task: "counterattack", route: "direct1", zone: { x: 700, y: 700, r: 260 }, wait: "now" }, p2: { task: "counterattack", route: "direct2", zone: { x: 700, y: 720, r: 260 }, wait: "now" },
        tk: { task: "counterattack", route: "directTk", zone: { x: 700, y: 700, r: 260 }, wait: "now", technique: "travelling" },
        p3: { task: "counterattack", route: "flank3", zone: { x: 700, y: 700, r: 280 }, wait: "now" }, mtr: { task: "move", route: "stay" },
      },
      actions: [{ el: "mtr", trigger: "now", action: { type: "callfire", at: [700, 760], kind: "he", dur: 90 } }] },
    { id: "late", name: "Wait for Holt farm to fall", form: "Counterattack after the block falls", concepts: ["mobile-defense"],
      summary: "Hold back until B Company's platoon breaks or 12 minutes pass, then strike the flank.",
      assign: {
        p1: { task: "counterattack", route: "flank1", zone: { x: 700, y: 380, r: 300 }, wait: "late" }, p2: { task: "counterattack", route: "flank2", zone: { x: 700, y: 380, r: 300 }, wait: "late" },
        tk: { task: "counterattack", route: "flankTk", zone: { x: 700, y: 380, r: 300 }, wait: "late", technique: "travelling" },
        p3: { task: "counterattack", route: "flank3", zone: { x: 700, y: 380, r: 300 }, wait: "late" }, mtr: { task: "move", route: "stay" },
      } },
    { id: "reinforce", name: "Reinforce the block at Holt farm", form: "Defense alongside the block", concepts: [],
      summary: "Move the whole company up beside B Company at Holt farm and defend there, facing the enemy head-on.",
      assign: {
        p1: { task: "defend", route: "blockW", face: 90 }, p2: { task: "defend", route: "blockE", face: 90 }, p3: { task: "defend", route: "blockC", face: 90 },
        tk: { task: "defend", route: "blockTk", face: 90 }, mtr: { task: "move", route: "stay" },
      } },
  ],
  choices: {
    p1: { tasks: ["counterattack", "defend", "reserve"], routes: ["flank1", "direct1", "blockW"], triggers: ["fixed", "now", "late"] },
    p2: { tasks: ["counterattack", "defend", "reserve"], routes: ["flank2", "direct2", "blockE"], triggers: ["fixed", "now", "late"] },
    p3: { tasks: ["counterattack", "defend", "reserve"], routes: ["flank3", "blockC"], triggers: ["fixed60", "fixed", "now", "late"] },
    tk: { tasks: ["counterattack", "defend"], routes: ["flankTk", "directTk", "blockTk"], triggers: ["fixed", "now", "late"] },
    mtr: { tasks: ["move"], routes: ["stay"], triggers: ["fixed", "now"] },
  },
  onTick(S, api) {
    const b = S.byId.block;
    const atBlock = S.els.filter((e) => e.side === "h" && e.ok > 0 && e.adv && (e.adv.state === "deploy" || e.adv.state === "assault") && e.adv.foe === "block").length;
    if (!S.flags.enemyFixed) {
      S.fixT = atBlock >= 2 ? (S.fixT ?? S.t) : null;
      if (S.fixT != null && S.t - S.fixT >= 40) { S.flags.enemyFixed = S.t; api.log("fixed", "The enemy penetration is fixed at Holt farm", { side: "f" }); }
    } else if (!S.flags.enemyFixed60 && S.t - S.flags.enemyFixed >= 60) S.flags.enemyFixed60 = S.t;
    if (!S.flags.blockBroken && (b.broken || b.ok < 6)) { S.flags.blockBroken = S.t; api.log("break", "Holt farm has fallen", { side: "f" }); }
    // the armored vehicles pull back once the infantry they support is beaten
    const ev = S.byId.ev;
    if (!ev.withdrawing && ev.ok > 0 && ["e1", "e2", "e3"].every((id) => S.flags[`cleared:${id}`] || S.byId[id].withdrawing || !(S.byId[id].ok > 0))) {
      ev.withdrawing = true; api.startOrder(ev, { type: "move", route: S.scen.routes.eBack.pts, technique: "rush", label: "Falling back" }); ev.steps = []; ev.si = 0;
      api.log("culminate", "The enemy armored vehicles pull back", { side: "h" });
    }
  },
  evaluate(S) {
    if (S.soldiers.some((s) => s.side === "h" && s.status === "ok" && Math.hypot(s.x - 700, s.y - 120) < 110)) return { reason: "the enemy reached the Hollin bridge", tier: 3 };
    const ids = ["e1", "e2", "e3", "ev"];
    if (ids.every((id) => S.flags[`cleared:${id}`] || S.byId[id].withdrawing || S.byId[id].ok === 0)) return { reason: "the penetration is defeated: destroyed or driven back", tier: 1 };
    return null;
  },
  onTimeout() { return { reason: "the enemy was stopped short of the bridge, but not destroyed", tier: 2 }; },
};

export const SCENARIOS = [hedgerow, deadGround, crossroads, breakContact, hill214, twinHouses, bridge, lowLight, ridgeline, kessel, valley, counterstroke];
export const byId = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
export const LEVELS = { fireteam: "Fire team", platoon: "Platoon", company: "Company" };
