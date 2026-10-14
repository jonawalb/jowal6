# Friction: method

An isometric bench model of Clausewitz's friction, drawn with the Anatomy kit (`../kit/iso-kit.mjs` and `../kit/lathe.mjs`, shared by all Maneuvers figures, MIT).

## Build

```sh
node interactive/maneuvers/friction/scripts/build.mjs      # writes interactive/maneuvers/friction/index.html
node interactive/maneuvers/friction/scripts/model.test.mjs # checks the model numbers quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (tilted boxes, block, grit, cord, spring, spokes), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild. Round parts (drum, flanges, pulley, handwheel, bosses) and the ramp casting come from `lathe.mjs` at build time only; the page moves pre-built groups with translates and rebuilds only the cord, spring, spokes and grit.

## The object

| Part | Stands for |
|---|---|
| Lit block on the 20° slope | A simple task (Clausewitz: "the simplest thing is difficult") |
| Bright mark on the force scale (3.4 N) | War on paper: the pull with no friction at all |
| Friction control and the dot density on the strip | The steady drag of the medium (Clausewitz's "resistant medium") |
| Grit grains at random places each run | Chance: incidents that cannot be calculated in advance |
| Winch, spring-restrained carriage, pointer | The effort it takes; the pointer reads the pull in newtons |
| Run time against the paper run | Falling short of the plan |

## The model

Real physics (cm for distance, N for force):

- Block mass 1 kg, g = 9.81 m/s², incline 20°.
- Steady pull up the slope: mg(sin 20° + μ cos 20°) = 3.36 N at μ = 0, 6.12 N at 0.3, 8.89 N at 0.6 (page rounds to 3.4, 6.1, 8.9).
- Coulomb friction: kinetic μ (control, 0 to 0.6) while moving; static breakaway mg(sin 20° + (μ + 0.08) cos 20°).

Notional (chosen for teaching, labeled on the page):

- Static coefficient = kinetic + 0.08.
- Spring 0.5 N/cm (2 cm of carriage travel per newton; the scale reads 0 to 15 N).
- Dashpot beside the spring, 6 N·s/m on the rate of stretch, so it adds no steady drag. The pointer and readout show the spring force; during a stall the cord's full pull is up to about 1 N higher (6 × 0.16), which is why the block breaks free a little before the pointer reaches the breakaway figure.
- Winch 16 cm/s with no load, slowing in a straight line to a stall at 18 N (a DC motor's torque-speed line).
- Grit: 2 to 4 grains per run, at least 18 cm apart, each adding 2.5 to 5 N of breakaway force; positions from a seeded generator, a new seed each run.
- Travel 112 cm. Paper run (same rig, μ = 0, no static excess, no grit): 9.1 s to the top.
- Idle tour: μ rises from 0.10 to 0.50 as the block climbs, with grit on, then the rig resets with a new seed.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed (quoted pulls, paper time, parameters, grit determinism and spacing, no backward motion, one stall per grain, steady-state pull within 0.3 N of the formula, friction and grit both cost time).
- `scripts/lines.mjs` (light): `line ends: 0` at load (tour running), at rest (block at the bottom stop) and in pose 2 (block at the top, μ 0.45) via `drive.mjs` `["lines"]`.
- Captures: 1440 px desktop and 390 px phone, light; reduced motion (one still frame, stalled on grit). Console clean, no sideways scroll.
- 4× close-ups: winch carriage (drum, wound cord, handwheel spokes, uprights, pointer over the scale), spring and its anchor boss, pulley with cheeks and cord wrap, block with eye bolt at the top of travel, slope foot with the protractor and bottom stop.
- No geometry audit (`kit/audit.mjs`): the figure has no pipes or cables, and its turned parts are isolated (drum, pulley, bosses) with no routes between them.
- 47 solids in the static drawing, plus 2 to 4 grit grains per run.

## Battlefield view (added 2026-10-13, new terrain style)

Scale: an abstract idea, so a concrete small-unit vignette (TERRAIN.md table, third row reading): one mounted platoon, drawn as four tracked vehicles (`trVehicle`), on a farm track, with dismounted soldiers (`trSoldier`) only where an incident puts them on the ground. Files: `scripts/field-scene.mjs` (layout `FG`, `fieldTerrain`, `fieldStatic`, `fieldMarks`, `fieldPose`, `fieldFog`), driven from `build.mjs` by the same run state as the machine.

| Machine | Battlefield |
|---|---|
| Block's travel `run.x` (0 to 112 cm) | Platoon lead's distance along the route, start point to release point (`FG.K` units per cm) |
| Paper run (μ = 0, no grit) | The plan: chalk route on pegs beside the track, a peg every 10 planned min (`paperXAt`), and a pale ghost vehicle on the paper timetable |
| Friction μ | Mud and puddles on the track: 0 to 70 marks in proportion to μ, as the strip's dots |
| Grit grain at a random point | An incident at the same point; `incidentKinds(seed)` shuffles the five kinds and deals one per grain |
| Stall on a grain, pull building to breakaway | The incident playing out, its progress = (pull − steady pull + 0.4) / (breakaway − steady pull + 0.4) |
| Breakaway | The platoon moves on; casualties, the spur track, the mud stay where they were |
| Readout "At the top in N s · paper 9.1 s" | "Arrived N min · plan 45 min · F vs E down" (minutes = seconds × 5); while moving, the incident and the time against the plan's time to that point |

Incidents: bog (lead vehicle tilts in a mud patch, crew dismount and dig, the column closes up), wrong turn (lead and second vehicle go down a side track and come back), radio down (platoon leader and RTO by the lead vehicle, a runner down the column and back), fog (fog drifts over the column, a ground guide walks ahead; lingers 22 cm of travel after), contact (a two-man enemy outpost opens fire; a fire team, `trFireTeam("line")`, dismounts from the second vehicle and returns fire with the lead vehicle's gun; friendly casualties go down greyed, a medic comes up from the third vehicle; one enemy is hit, the other pulls back).

Notional, in `model.mjs` (`FIELD`, `contactLoss`, `casualties`, `fieldReadout`): 5 minutes of march per second of run; contact casualties 1 friendly (2 if the grain's breakaway force exceeds 3.75 N) and 1 enemy; incident kinds. The battlefield plays the run at half speed (`FG.SLOW`); the readout's times are model time, unchanged. Vehicles and soldiers are drawn larger than scale. No doctrinal claim about platoon organization or formations is made.

Checks (2026-10-13):
- `node scripts/model.test.mjs`: all passed, including the battlefield block (5 min/s, 45-minute plan, contact losses, distinct incident kinds per run, readout under 45 characters in every state for 119 seeds × 3 μ × grit on/off, no casualties with grit off).
- `lines.mjs` via `drive.mjs`: field view, contact in progress (seed 10, t 11.5 s), wrong turn (seed 73, t 4.2 s) and fog (seed 10, t 4.9 s): `line ends: 0` each; then V to the machine view at block 40 cm and 100 cm: `line ends: 0` each.
- Console clean in all runs; 390 px: no sideways scroll in either view (scrollWidth 390).
- Frame timing (rAF hook, 6 s of the idle tour in the field view): desktop 1440 px 60.0 fps, JS p50 0.2 ms, p95 0.6 ms, no late frames; 390 px, DPR 3, 4× CPU throttle 59.8 fps, JS p50 0.2 ms, p95 1.3 ms, one late frame.
- Reduced motion: field view holds the still frame (stalled on the first incident), readout "Radio down · 23 min · plan 12 min".
- Close-ups at 3–4×: contact (fire team, casualties greyed, medic, enemy outpost, tracers), radio incident, bog.
