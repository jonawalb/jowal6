# Operational Reach: method

An isometric bench model of operational reach, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT). Figure size, about 60 solids.

## Build

```sh
node interactive/maneuvers/operational-reach/scripts/build.mjs      # writes index.html
node interactive/maneuvers/operational-reach/scripts/model.test.mjs # checks every number the page quotes
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (moving parts, rebuilt per frame), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild. `scene.mjs` carries a `prismY` helper (a convex prism in the x-z plane, extruded along y, with the kit's lathe tone rules; pattern taken from the Penetration figure) so the whole arm can tilt as one rigid body. It uses only kit functions passed in as `K`; no lathe or tube parts.

## The object

| Part | Stands for |
|---|---|
| Pedestal with a V-block, knife edge under the arm | The home base the force reaches out from |
| Counterweight plates on the arm's rear, rear rest pad | What the base can hold the reach against (notional) |
| Two-stage telescoping arm along a ruler | Distance from the base (notional mapping) |
| Lit load head at the tip | The force employed at the end of its reach |
| Arm tipping onto the stop pad | Reach beyond what the base can support |
| Roller stand on a screw jack | A forward base (JP 5-0: locating bases forward extends reach) |
| Dial gauge, 0 to 1.5, raised mark at 1.0 | Tipping moment ÷ holding moment about the support the arm would tip over |

## The model

The statics are real; the numbers and the mapping are notional (bench units).

- A rigid arm resting on supports tips about the front-most support it rests on when the moment of the loads ahead of it exceeds the moment of the loads behind it. Ratio = ahead / behind; tips above 1.
- Loads: counterweight 65 at x = −46; sleeve x −56..44 at 0.30/unit (30); stage 1, 80 long at 0.20/unit (16), moves e/2; stage 2, 80 long at 0.14/unit (11.2), moves e; head 10 at x = 87 + e. Total 132.2. Knife edge at x = 0, roller stand at x = 124.
- Reach (tip, front of head) = 92 + e, e from 0 to 90 (reach 92 to 182).
- Knife edge only: ratio 0.59 retracted, 1.0 at reach ≈ 141 (e = 48.7), 1.35 at full length.
- Roller stand set and under the second stage (it is from e ≈ 40, before the arm would tip): ratio about the roller 0.04 at full length; nothing in the travel tips.
- Motion: extension eases (τ 0.6 s, cap 26 units/s); the jack takes 1.1 s; tilt eases to 7° (where the sleeve lands on the stop pad) or to the angle at which the arm rests on a part-lowered roller.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed (asserts reach 92/182, weights 65/46/30/16/11.2/10, total 132.2, ratios 0.59, 1.35, reach 141 at ratio 1, roller at 124 carries the arm, 0.04 at full length, no tip anywhere with the base set).
- `scripts/lines.mjs` at rest (tour, tipped): `line ends: 0 of 236`. `drive.mjs` at rest after `stop()`: 0 of 266. Pose 2 (base set, reach 182, "Reach 182 · ratio 0.04 · held by forward base"): `["lines"]` → 0.
- Captures: desktop 1440 light, phone 390 (no sideways scroll), reduced motion (still, "Reach 92 · ratio 0.59 · holding"); a 15-frame tour sheet (tips at ~141, forward base raised, full reach held). 4× close-ups of the pedestal and knife edge (level and tipped), the rear rest gap when tipped, the counterweight, the roller stand raised, the head. Console clean in all.
- No geometry audit: no tube or lathe parts are used.

## Battlefield view (added 2026-10-13, terrain style)

`scripts/field-scene.mjs` (kit `field.mjs` + `terrain.mjs`, inlined in that order) draws the same state on full-bleed terrain. Scale: operational. Each vehicle is a company, three make a battalion; vehicles are drawn far larger than scale.

| Field element | Machine part / model value |
|---|---|
| Depot (sheds, supply stacks) on the left, on the supply road | Knife edge on the pedestal: the home base (model x = 0, world x = -130; 1.5 world units per bench unit) |
| Lit lead battalion | Load head; its front sits at reach `tipOf(e)` along the road |
| Second and third battalions in column | Second and first stage centres (44 + e, 24 + e/2) |
| Dashed chalk ring round the depot | Home base's reach: radius `tipOf(safeExtension())` ≈ 141, where the knife-edge ratio reaches 1.0 |
| Staked site beside the road + convoy of 3 trucks that drives up and parks | Roller stand at 124 and its jack (`S.jack`) |
| Second ring from the node, growing with `S.jack` | With the stand carrying the arm nothing tips in the travel, so the ring is drawn out past the objective (notional radius 82.7 bench units) |
| Lead battalion disperses and stops firing; supply trucks turn back at the ring edge | Arm tipped (`S.th / GEO.TIP`) |
| Enemy battalion dug in at the town, fire fan, objective flag | (field only) the objective at the end of the travel |

Fire is exchanged once the lead battalion is within 92 world units of the enemy (notional). The supply trucks shuttle (12 s round trip) from the supporting base (home, or the forward node once set) to the brigade, never past the active ring.

**Notional losses (owner's realism rule, 2026-10-13).** `losses(e, baseSet)` in `model.mjs`: exposure = share of the reach from 141 to 182 covered under fire; knocked-out vehicles = round(exposure × 1.2) friendly and round(exposure × 2.2) enemy when supported, round(exposure × 2.4) and round(exposure × 0.6) when overreached (tipping). At full reach: forward base 1 friendly / 2 enemy, no base 2 / 1. Knocked-out vehicles stop, grey out and smoke; a casualty evacuation truck (white roof) shuttles back to the supporting base while friendly losses exist. The count shows in a line under the card ("Notional losses at the objective: …"), not in the readout, which is already at its 45-character limit and is unchanged. The counts are a function of the current state, so pulling back reduces them (the model has no memory).

Checks (2026-10-13): `model.test.mjs` pass (adds the loss counts). Drive session: field reach 120 holding, line ends 0 of 664; field reach 182 tipped, 0; field reach 182 with forward base, 0; V key to machine, 0 of 266; machine second pose (reach ~103), 0. Console clean in every run. 390 px: no sideways scroll (scrollWidth 390), field crops the sides as designed. Frame timing (rAF wrapper, 6 s of the tour in the field view): desktop 1440 px 59.7 fps, JS p50 0.30 ms / p95 1.00 ms; 390 px DPR 3 with 4× CPU throttle 59.0 fps, JS p50 0.40 / p95 1.90 ms. 18 vehicles and trucks (plus the evacuation truck); page 1.04 MB raw. Thumbnail unchanged (machine).
