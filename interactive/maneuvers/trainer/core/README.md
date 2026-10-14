# Maneuver Trainer core

Pure ES modules, no dependencies, no DOM. A page inlines them in this order: `rng.mjs`, `terrain.mjs`, `units.mjs`, `orders.mjs`, `enemy.mjs`, `scoring.mjs`, `aar.mjs`, `sim.mjs`, `scenarios.mjs` (strip `import`/`export`). Tests: `node sim.test.mjs` (`SEEDS=10` for a quick pass, `ONLY=<scenario id>` for one).

All numbers are notional teaching values and sit in one block: `NOTIONAL` in `units.mjs`. Scenarios are fictional. World units are notional metres (+y = north; facing in degrees, 90 = north, the kit's `fdFrame` convention). Worlds: fire team 600×400, platoon 900×600, company 1400×900.

## Scenarios (`scenarios.mjs`)

`SCENARIOS` (12, in order), `byId`, `LEVELS`. Each scenario:

- `id, n, level ("fireteam"|"platoon"|"company"), title, timeLimit (s), stealth?`
- `briefing: { mission, enemy, terrain, troops, time }`
- `concepts: [{ slug, fig, title, href }]`: figure links (`/interactive/maneuvers/<slug>/`)
- `terrain`: drawable with `kit/terrain.mjs`
  - `world {w,h}`, `light: "day"|"limited"`
  - `rises: [{cx,cy,r,steps,h,top,seed,wobble,squash,lean}]` → `trTerrain({ rises })` (the core's `height()` uses the same rings)
  - `woods: [{ring, density?}]` → `trWood(K,P,T,ring, trScatter(ring,n,…))`; `density` (default 1) thins a framing wood
  - `hedges`, `walls`: polylines → `trHedge` / `trWall`
  - `streams`, `ditches`, `roads`: `{pts,w}` → `trStream` / `trRoad` (draw a ditch as a narrow dry stream or skip it)
  - `houses: [{x,y,ang,len,wid}]` → `trHouse(K,P,x,y,ang,len,wid)`
  - `fields: [{cx,cy,w,d,ang,tint}]` → `trField`
  - `wire: [pts]` → `trWire`; `mines: [{ring}]` minefield outline (chalk it); `barriers` (river banks, not drawn) and `crossings` (bridges) only matter to movement
- `forces: { friendly: [spec], enemy: [spec] }`; spec `{ id, kind, name, short, roles?, at, face, formation, pose?, slots?, dug?, smoke?, ally?, ai? }`. Enemy fighting positions are `slots: [[x,y,face]]` with `pose: "hole"|"building"`: draw `trHole`/`trNest` at each slot facing its face.
- `routes: { key: { label, pts } }`: chalk polylines for the planning board
- `triggers: { key: { label, trig } }`
- `plans: [{ id, name, form, doctrinal?, naive?, concepts, summary, assign: { elId: { task, route, trigger, target, technique, formation, wait, commit, then } }, actions: [{ el, trigger, action }] }]`: 3–4 per scenario, exactly one `doctrinal`, one `naive`.
- `choices: { elId: { tasks, routes, triggers, … } }`: what the Easy planning board offers per element. Build a custom plan as `{ id: "custom", assign: {...}, actions: [...] }` and pass it as `plan`.
- `objective {x,y,r,label}`, `objectiveEls`, `ccp` (casualty collection point), `rally`.

## Simulation (`sim.mjs`)

```js
import { createSim, fmtClock } from "./sim.mjs";
const sim = createSim(scenario, { seed: 1, plan: "fix-flank" /* or a plan object; omit for Medium/Hard */, mode: "easy" | "medium" | "hard" });
sim.step(dt);            // advance dt seconds of game time (whole 0.1 s ticks); call per frame × speed
sim.runTurn(seconds);    // Medium (WEGO): run one turn (fire team 20, platoon 45, company 120) and return state()
sim.run(maxSeconds?);    // to the end (tests, fast-forward); returns done()
sim.issue(unitId, order) // Medium/Hard orders; Hard + company: takes effect after a notional 10–20 s ({ delay })
sim.done();              // null | { reason, tier: 1|2|3, t }
sim.score();             // { tier, tierText, reason, score, grade, friendlyDown, enemyDown, enemyCaptured, clock, line: "Objective secured · 2 vs 6 down · 4:35" }
sim.aar();               // { score, planned, happened: [{t,clock,text,type,side}], why[], sustain[], improve[], concepts: [{slug,fig,title,href,used}], recommended }
```

Same scenario + plan + seed = identical run.

### `state()`

- `t, clock, timeLimit, light, seed, plan, done, flags, losses: { friendly, enemy, captured }`
- `soldiers: [{ id, el, side "f"|"h", role (kit role: tl ar gr r sl pl rto mg ag veh), roleFull, x, y, z, face, pose ("stand"|"kneel"|"prone"|"hole"|"building"|"veh"), status ("ok"|"down"|"captured"|"absent"), moving, stride (0/1/2 walk cycle), carrying, carried, evac }]`. Draw `down` as prone and greyed (never graphic); skip `absent`. Every soldier is reported; the page decides what it can see (fog of war: draw enemy only via `contacts`).
- `elements: [{ id, side, ally, kind, name, short, x, y, face, strength, size, down, suppression 0..1, cohesion 0..1, task (text for the roster), order, pinned, inContact, firing (target id), lifted, route, smoke, pending: [{type, at}] }]`
- `contacts`: what the player knows: `[{ el, kind, name, x, y, spotted (seen in the last 3.5 s), lastSeen, out }]`; draw stale ones as last-known marks.
- `streams`: fire in the shape `kit/terrain.mjs trShots` expects: `{ side, from:[x,y,z], to:[[x,y,z]…], period, burst, gap, flight, phase, on, heavy, smoke, scatter }` (+ `el`, `target`, `indirect` for mortar rounds). Pass straight to `trShots(state.streams, t)`.
- `smoke: [{ x, y, r, age 0..1 }]`, `lanes: [{ x, y, r }]` (breach lanes), `events` (the log; `type` + plain text).

### Orders (`orders.mjs`)

`move`, `bypass`, `sbf` (support by fire; on `lift` it stops firing and stays), `assault`, `hold`, `reserve`, `counterattack`, `breach`, `withdraw` (`method: "alternating"|"run"`), `observe`, `follow`; actions `lift`, `shift`, `smoke`, `callfire`. Give `route: [[x,y]…]` or `to: [x,y]`. Movement techniques: `travelling`, `overwatch` (traveling overwatch), `bounding` (bounding overwatch), `infiltrate`, `rush`. The sim labels a unit in contact "Fire and movement"; bounding overwatch is a movement technique for when not in contact. `callfire` takes `at: [x, y]` or an element id (fires where that element is when the call goes in). Instant actions (`lift`, `shift`, `smoke`, `callfire`) never replace an element's current order, also when Hard's company-level delay holds them. Triggers include `{ when: "order", el, type }` (that element is on an order of that type). Plans compile with `compilePlan(scenario, plan)` into per-element steps with triggers (`describeTrigger` gives the text).

### Modules

`rng.mjs` mulberry32 · `terrain.mjs` `buildTerrain(spec)` → `height, cover, los, crossesObstacle` · `units.mjs` roles, formations (offsets match the kit), `NOTIONAL` · `enemy.mjs` OPFOR behaviours (defend, op, reserve, attack, advance) · `scoring.mjs` objective → losses → time · `aar.mjs` four-part AAR, plus `closestPlan(scen, used)`, `matchRoute(scen, elId, pts, tol)` and `routeKeysFor(scen, elId)` so Medium and Hard can judge concepts against the plan the player's own orders came closest to.

Roles follow ATP 3-21.8 (2024, C1 2025): fire team = team leader, automatic rifleman, grenadier, rifleman; squad = two fire teams and a squad leader; platoon HQ = PL, RTO, PSG; machine gun team = gunner + assistant gunner.
