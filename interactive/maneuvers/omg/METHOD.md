# Operational Maneuver Group: method

An isometric bench model of the Soviet operational maneuver group (OMG) of the late 1970s and 1980s, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT).

## Build

```sh
node interactive/maneuvers/omg/scripts/build.mjs       # writes interactive/maneuvers/omg/index.html
node interactive/maneuvers/omg/scripts/model.test.mjs  # checks every model number quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Wall across the plate, with merlons, and a gate leaf that sinks into a slot | The enemy's defended line and the breach |
| Two wedge carriages on short rails that drive into the wall either side of the gate | The first echelon breaking in |
| Lit shuttle, cocked between two guide rods against two coil springs and a push bar, held by a latch pin in a bridge | The OMG, held behind the line until released |
| Trip finger on the shuttle; four drop targets on the far side that sink when it passes | Deep objectives raided en route (in this model: air defense, command post, missile launcher, depot) |
| Block on crossing rails (a diamond crossing) driven by a lead screw and gearbox | The enemy's large operational reserve |
| Carriage parked on a siding with wheel chocks | The second echelon, not committed |
| Ruler (tick every 5 km, major every 25, zero at the line's rear face) and end buffer at 104 km | Distance past the line |
| Dial gauge, 0–4 days | Time |

146 kit solids in all (41 of them sleepers); about 60 distinct parts (Figure).

## The model (all notional unless marked)

Distances in km from the front face of the line; time in days.

| Quantity | Value | Status |
|---|---|---|
| Line depth | 0–6 km | notional |
| First echelon reaches the line | day 0.25 | notional |
| Gate down (breach open) | day 0.2–0.5 | notional |
| Release slider | day 0.5–2.0, step 0.1 (earliest = gate down) | notional |
| Latch pin lifts | 0.03 day before release | drawing |
| OMG speed after the spring kick | 80 km/day, kick time constant 0.08 day | notional |
| OMG start (nose) / length | −11 km / 6 km | drawing |
| Track end | 110 km = 104 km past the line | length chosen to match FM 100-2-1's "100 kilometers or more beyond other army forces" (p. 4-9); not used in any calculation |
| Drop targets | 30, 54, 76, 98 km (24, 48, 70, 92 past the line) | notional |
| Reserve lane | 42–48 km (36 km past the line); moves day 0.8, reaches the lane edge day 1.4, across in 0.1 day | notional |
| Rule: blocked if the nose has not reached 42 km by day 1.4; otherwise the reserve waits until the tail clears and closes behind | | notional |

Derived (asserted in `model.test.mjs`): latest release that beats the reserve is day 0.658, so on the slider 0.5 and 0.6 get through and 0.7–2.0 are stopped at 41.6 km after one target. Without the reserve every release reaches 104 km past the line and trips all four targets; release day 0.5 finishes on day 2.09.

Example readouts: "Day 0.3 · breach opening · OMG held", "Day 1.3 · 41 km past line · 1 of 4 hit", "Day 2.3 · 104 km past line · 4 of 4 hit", "Day 2.0 · blocked by reserve · 1 of 4 hit". Every readout over the release × reserve × time grid is under 45 characters (tested).

The model leaves out air support, airborne and heliborne linkups, resupply and losses, and treats a reserve in the lane as a full stop; the page says so.

## Interaction

Idle tour (13 s a cycle): shallow defense, release day 0.5 (deep raid, 4 of 4), then a large reserve with release day 1.0 (blocked after one target). Pointer hover scrubs the day across the card; click, Replay, Enter or Space replays; arrow keys and the slider change the release day; R and the button toggle the reserve. Reduced motion shows the end state. The loop runs only while the card is on screen. `window.__omg.stop()` stops the tour; `window.__omg.at(t)` freezes the bench at day t for testing.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: passes.
- `scripts/lines.mjs` at rest (page load): `line ends: 0` (of 346). drive.mjs poses, all 0: cocked (day 0), gate half down (day 0.35), shuttle at the breach (day 0.62–0.68), passing the reserve (reserve on, release 0.6, day 1.47 and 1.62), blocked (reserve on, release 1.0, day 1.9).
- `capture.mjs` desktop (1440) and phone (390), light: console clean, no sideways scroll. Reduced motion: end state, console clean. Keyboard (arrow, R), hover scrub and tour checked by drive.mjs readouts.
- 4×–8× close-ups: launcher (springs, collars, push bar, rod posts, latch bridge and pin) at rest and just after release; gate and wedges; drop targets with the finger crossing; reserve at the lane edge, closing behind, and blocking. Fixes made after them: push bar shortened to sit between the rods with collars on the rods (rods had painted over its ends); abutment lowered and shuttle raised so the cocked shuttle shows; drop targets moved under the finger's path; reserve's waiting position moved clear of the finger; second-echelon top line run edge to edge.
- No geometry audit (`kit/audit.mjs`): the figure has no tube or lathe parts.

## Battlefield view (added 2026-10-13, new terrain style)

Scale: operational (TERRAIN.md table), because the OMG is an army- or front-level idea. One vehicle stands for a battalion; Soviet red, NATO blue; the OMG is the one lit element. Files: `scripts/field-scene.mjs` (kit `field.mjs` + `terrain.mjs`), wired into `build.mjs` and `page.html` like Fig 1 and Fig 8 (toggle buttons, V key, `localStorage["maneuvers.view"]`). The same `stateAt(t, r, reserves)` drives both views; no second model.

| Bench part | Battlefield | State used |
|---|---|---|
| Wedges, wall, gate | Two first-echelon divisions (4 battalions each) close on eight NATO battalions dug in on a line of low hills; the two astride the road are knocked out as the gate drops; one attacking battalion per division is stopped short; the rest hold the breach's shoulders. Smoke screen day 0.06–0.58. | `wedge`, `gate` |
| Lit shuttle | The OMG: 12 battalions (9 tanks, 3 BMPs; mix notional) in an assembly area, then a march column (12 units apart, 6 more between groups of three) on the road | `nose` (km → screen X = −105 + 2.45 km, mapped onto the road's arc length) |
| Finger and drop targets | Four rear targets (air-defense site, command post, missile launcher, depot) at the bench's km; the column's head battalion turns off to raid each (FM 100-2-1 p. 4-9, "units detached"); a target greys and smokes when `hit` reaches 1; the command-post detachment is knocked out 12 km later (free run) | `hit[i]`, `nose` |
| Reserve block | Two NATO brigades (6 battalions): laager in the north, lane edge, across the road. Blocked: the OMG head deploys and fights; two OMG battalions and one NATO battalion are knocked out as the fight grows. Not blocked: waits at the edge and closes the road once the field column's tail has cleared it (the field column is longer than the bench's 6 km shuttle, so the close is held until the tail is past; still a pure function of state) | `res`, `blocked`, `lossesAt().fight` |
| Siding | Second echelon, 6 battalions parked behind the line | none (never committed) |

Losses (notional, `LOSSES` and `lossesAt()` in model.mjs, asserted in model.test.mjs): armored vehicles knocked out, Soviet vs NATO. Breach 40 vs 22 (ramped by day 0.5), 3 vs 6 per raided target, blocking fight 34 vs 14 over 0.3 day. Deep raid ends 52 vs 46; blocked 77 vs 42. Field readout (`fieldReadoutOf`, always < 45 chars, tested): "Day 1.3 · 41 km · 1/4 hit · 43 vs 28 down", "Day 2.0 · blocked · 1/4 hit · 76 vs 41 down". An ambulance shuttles from the breach once it is open.

Checks (2026-10-13): `model.test.mjs` passes. `lines.mjs` via drive (V key / setView): field day 1.3 free run 0, field blocked day 2.2 0, field early release past the reserve day 1.75 0; machine day 0.35 0, machine day 1.3 0. Console clean (desktop, 390 px, reduced motion). 390 px: no sideways scroll (scrollWidth 390). Frame timing (rAF wrapper, 6 s of the tour in the field view): desktop 60 fps, JS p50 0.50 ms, p95 1.30 ms; 390 px with 4× CPU throttle 59.5 fps, p50 1.30 ms, p95 4.60 ms, 3 frames over 25 ms. Field view about 2,450 static paths and 52 units. 4× close-ups of the raided air-defense site, the blocking fight and the breach checked.
