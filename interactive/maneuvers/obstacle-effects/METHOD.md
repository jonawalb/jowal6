# Obstacles and Fires: method

Figure 39. An isometric flow table with four baffles (Machine) and an enemy company column meeting four obstacle groups (Battlefield), both driven by one run from `scripts/model.mjs`. Drawn with the shared Anatomy kit (`../kit/iso-kit.mjs`) and the terrain kit (`../kit/terrain.mjs`), MIT. Size: Figure.

## Build

```sh
node interactive/maneuvers/obstacle-effects/scripts/build.mjs       # writes index.html
node interactive/maneuvers/obstacle-effects/scripts/model.test.mjs  # asserts every model number the page quotes
```

Edit `scripts/page.html` (text, chrome, CSS), `scripts/scene.mjs` (machine), `scripts/field-scene.mjs` (battlefield), `scripts/model.mjs` (numbers, routes), `scripts/live.js` (page runtime) or `scripts/build.mjs`. `window.__obstacleEffects` exposes `stop()`, `reset()`, `setCov(k, on)`, `setView()`, `at(min)`, `advance(min)`, `restart()`, `snapshot()` and `initial`.

## The object

| Part | Stands for |
|---|---|
| Eight lit balls, two abreast, from a hopper | The enemy company-sized column |
| Avenue A (long channel) and branch B (into a widened pocket), rails and troughs | The avenue of approach, the adjacent avenue / engagement area, and where the column ends up |
| Row of pins across the near half of A | Disrupt group (half the avenue) |
| Hinged vane across A | Turn group, anchored at the north wall |
| Staggered lips in B's pocket | Fix group (obstacles in depth) |
| Gate across B's end, two posts | Block group |
| Nozzle post and valve lever beside each baffle; fine flowing jet lines onto the baffle | The fires covering that group; the baffle stands only while its jet is on |
| Tank and dial | Fire supply; the needle shows how many jets are on |
| Spent grey discs pushed to the side of the lane | Vehicles put out of action |

About 70 parts. One lit accent: the balls.

## The battlefield (company scale)

Map drawn in a local frame (u right, v down the card), laid on Fig 1's ground at bearing -35 degrees. Soldiers and vehicles about 1.5x scale.

| On the ground | Stands for | Driven by |
|---|---|---|
| Eight red vehicles (`trVehicle`), lit, two abreast | The enemy column | `poseAt(plan, i, t)` |
| Wire belts and minefield across the south half of the avenue | Disrupt group | static |
| Ditch with berm, wire and mines in a diagonal line from the hill | Turn group | static |
| Staggered wire belts, craters, minefield in the open area on the branch | Fix group | static |
| Ditch, berm, dragon's teeth, wire across the corridor | Block group | static |
| Blue holes and nests on a hill and three rises (25 men) | Friendly overwatch, one cluster per group | men go down with `tally().blue` |
| Blue fan on the ground | The fire covering a group | fades with the eased cover `c[k]` |
| Tracers, mortar bursts (sample, about 2 a second) | Fires on a covered group while a vehicle is within range | cover and vehicles in zone |
| Grey vehicles with smoke | Vehicles put out of action | `fate` |
| Grey casualties and a medic | Friendly men down | `tally().blue` |
| Ground tags "Disrupt, Turn, Fix, Block - fires on/off" | Which group is which and its state | cover flags (decision: these are the only text on the field; remove in `live.js` TAGAT if the owner objects) |

## The model (notional except the doctrine quoted on the page)

- Same route geometry for both views (`ROUTES`, map units). Station stop lines: D 83, T 159 (on A, 330 long), F 247, B 304 (on B, 383 long).
- Speed 30 map units a minute; vehicles queue in 8-unit slots at a group; the page runs 3.5 model minutes a second.
- Dwell (covered, uncovered) in minutes: D 2.0 / 0.4 (south lane only), T 0.5 / 0.3, F 3.0 / 0.6, B held / 1.5.
- Hits while covered (k-th arrival at the group, 0-based): D south lane 0, T 0, F 1 and 3, B 0 and 1. A hit vehicle stops, is out after 0.35 min and is pushed off the lane.
- Turn covered: survivors take branch B (meet F and B). Turn uncovered: survivors breach and stay on A (never meet F or B).
- Friendly men down = round(0.5 x covered groups that engaged) + round(0.6 x vehicles through). Enemy down = vehicles out of action.
- Tested outcomes (`model.test.mjs`): all four covered, 16.3 min, 6 out, 2 held, 0 through, 2 vs 6; none covered, 13.0 min, 8 through, 5 vs 0; turn uncovered only, 1 out, 7 through; block uncovered only, 4 out, 4 through.
- Tour: all covered, turn off, block off; about 18 s.

## Checks run (2026-10-14)

- `model.test.mjs`: all passed. `build.mjs`: OK; index.html contains maneuvers.view.v2, maneuvers.css, IBM+Plex, ex-machine, ex-field, fd-reset.
- `lines.mjs` via drive: Battlefield at t = 7 and t = 11 (turn off) 0; Machine at t = 9 and t = 11 (turn off) 0.
- Reset in both views after changing fires and time: snapshot equals the load snapshot (cover, clock, eased cover, tour, buttons, readout).
- `.ex-field` shown only in Battlefield (`block`/`none`), `.ex-machine` only in Machine (`none`/`block`).
- Console clean; no sideways scroll at 390 px.
- Frame timing (rAF hook, 6 s of tour): Battlefield 1440 px 60 fps, JS p50 0.4 ms, p95 0.9; 390 px 60 fps, 0.4 / 0.8; Machine 390 px 60 fps, 0.7 / 1.5; 0 late frames (no CPU throttle available in drive.mjs).
- No geometry audit: no pipes, cables or lathe parts.
