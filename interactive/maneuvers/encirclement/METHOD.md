# Encirclement and Pocket: method

Fig 34. An isometric iris-and-screw bench drawn with the Anatomy kit (`../kit/iso-kit.mjs`, MIT), with a Battlefield view drawn with the terrain kit (`../kit/terrain.mjs`). Built from the Fig 1 (`flank-attack`) template and the Fig 30 (`hammer-and-anvil`) page shell. Size: Figure (64 solids in the machine at rest).

## Build

```sh
node interactive/maneuvers/encirclement/scripts/build.mjs       # writes index.html
node interactive/maneuvers/encirclement/scripts/model.test.mjs  # checks every number the page quotes
```

`index.html` is generated. Edit `scripts/page.html` (text, chrome), `scripts/model.mjs` (numbers), `scripts/scene.mjs` (machine moving parts), `scripts/field-scene.mjs` (battlefield) or `scripts/build.mjs` (static parts, live code).

## The object

| Part | Stands for |
|---|---|
| Block on a round hub (two blocks, a headquarters with a mast) | The encircled enemy force |
| Breakout block on a slide out to a tray with an end stop | The enemy's breakout; the tray is "out of the pocket" |
| Curved leaves on radial slides (iris), arc length S | Companies of the inner encircling arm; arc length = frontage one company covers |
| Front leaf or leaves, in from the start | The direct pressure force (FM 3-90 C-3) |
| Remaining leaves sliding in from the rim, front to back on both sides | The two encircling arms |
| Two lit leaves at the seam | The arms' lead companies: the linkup (one accent, the place to watch) |
| Lead screw, crank and scroll ring (teeth turn) | The squeeze: a controlled contraction of the ring |
| Leaves stacked in tiers when they overlap | The ring thickening as it contracts |
| GAP dial with a mark | Widest gap in the ring against the gap a breakout needs |
| Engraved rings at R0 and RF, km ruler (0.1 km ticks) | Where the ring stands at linkup and after the squeeze |
| Slider / arrow keys | Companies in the ring, 4 to 10 |

Camera azimuth 50°; the seam is drawn at the upper right so the breakout runs across the card.

## The model (all notional; `scripts/model.mjs`)

- Pocket radius 1.8 km at linkup (perimeter 11.3 km), 0.85 km after the squeeze. One company covers S = 0.75 km. A breakout needs a gap of BW = 0.7 km.
- Gap at radius r: 2πr/N − S. Thin ring: gap at linkup ≥ 0.7 km, i.e. N ≤ 7 (gap 0.87 km at N = 7; 0.66 km at N = 8; 1.51 km at N = 5).
- Companies sit at bearings (i + 0.5)·360/N from the seam, so the seam is always midway between companies 0 and N−1. Companies within half a slot of the front are the direct pressure force (1 for odd N, 2 for even). The rest form two arm columns (spacing 0.09 of the half circle); each company arrives at its place in order from front to back; the two lead companies arrive last, at the seam (linkup).
- Clock: linkup at 3.2 s; breakout 0.4 s later (run 1.7 s through a gap; or 0.9 s to the ring, 0.4 s pause, 0.9 s back); squeeze from 2.4 s after linkup for 3.6 s (to 9.2 s); end 10.4 s. The Battlefield view plays at 0.7× speed.
- Casualties (vehicles knocked out, notional): enemy battalion 10 vehicles. Contact during closing: 1 each. Breakout through a gap: blue 2 (the seam companies), red 1, and 2 enemy vehicles escape. Breakout stopped: blue 1, red 2. Squeeze: blue 1; red 1 per enemy company still in the pocket (2 or 3), spread over the squeeze. The rest surrender. Finals: N = 5 → 4 vs 4 down, 2 escaped, 4 surrender; N = 8 → 3 vs 6 down, 4 surrender.
- Readout (< 45 chars): idle "8 companies · gaps 0.66 km at linkup"; "Arms closing · ring 60% · 0 vs 0 down"; "Ring closed · gaps 0.66 km · 1 vs 1 down"; "Breakout gets through · 3 vs 2 down" / "Breakout stopped · 2 vs 3 down"; "Squeeze · ring 8.1 km · 3 vs 5 down"; "Part got out · rest surrender · 4 vs 4 down" / "Pocket surrenders · 3 vs 6 down".

Machine geometry (40 units per km): leaves at R0 = 72, RF = 34, rim 90; leaf arc 30, half-thickness 4, height 7, tiers 8 apart (even 0, odd 1, last of an odd ring 2). Breakout block 28 wide (= BW), seat 17, stops at 60.5 (front corners on the leaves' inner face), clears to 130 on the tray. Painter's order: depth sort, except that overlapping neighbour leaves draw the higher tier last (a small topological sort over screen-overlapping pairs).

## Battlefield view (`scripts/field-scene.mjs`)

Scale: brigade companies round an enemy battalion (FM 3-90 C-22: the squeeze suits battalion-size or smaller pockets). Each blue company = three vehicles (one per platoon, notional); enemy = three companies of three vehicles plus a headquarters, in a village on a low rise at a crossroads. Same state drives it: arm columns travel 18 units outside the ring and step in; the lead companies are lit; a chalk square marks the contact point at the seam (C-9); each company in place shows a fire sector about S wide, so gaps between sectors are the thin places. Breakout = the enemy's lead company driving out along the road behind the village. The squeeze contracts the ring from 72 to 46 ground units (compressed from the model's 0.85 km so the ring does not run over the village; the readout keeps the model's km). Casualties from `downAt`: greyed vehicles (first ones smoking) frozen where they were hit, a greyed crewman prone beside each, a casualty evacuation vehicle driving to the rear. At surrender the blue fire stops and the units stay in place (owner rule), enemy crews stand beside their vehicles and a white flag goes up. Vehicles and soldiers drawn far larger than scale; distances compressed.

## Decisions made without the owner (overnight authority)

1. Control = number of companies in the ring (4–10), since "thin ring" is the breakout condition the spec asks for; the tour runs 5 (breaks out) then 8 (holds).
2. Squeeze is the reduction technique shown; the other three are named and quoted in text. The bench keeps all companies on the ring rather than pulling units to reserve as C-22 describes; the page says so.
3. Breakout always hits the seam where the arms met (C-15 intervals), at a fixed time after linkup; the page says the fixed order is the model's.
4. Ends in surrender (C-2 "Ideally").
5. Battlefield echelon: blue companies (three vehicles) around an enemy battalion; squeeze radius compressed in the field view.

Questions for the owner: (a) Is companies-in-the-ring the right echelon for the brigade picture, or should leaves be battalions round an enemy brigade? (b) Should the machine pull surplus leaves out to a reserve rack as the ring contracts (C-22)?

## Checks run (2026-10-14)

- `node scripts/model.test.mjs`: passes. Asserts every constant and number quoted, the thin threshold for N = 4..10, company order and tiers, no same-tier leaf collision at RF and upright clearance for every N, that the 28-wide block passes between the seam leaves exactly when the model says thin (and meets both leaves at 60.5 otherwise), carriage clearance, the clock, casualty totals (sum to 10, never fall, both sides lose), quoted readouts and all readout lengths < 45.
- `lines.mjs` via `drive.mjs` `["lines"]`: machine at rest (N 8), stopped breakout (N 8, t 4.6), end (N 5): 0, 0, 0. Battlefield at rest, stopped breakout, end (N 5): 0, 0, 0 (switched with the V key).
- Console clean in every run. 390 px: scrollWidth 390 = innerWidth (no sideways scroll); both views read.
- Frame timing, Battlefield tour at 1440 px: 60 fps, JS p50 0.40 ms, p95 1.30 ms (361 frames). Throttled-phone timing not measured.
- 4× close-ups: iris at RF with N = 10 and N = 7 (stacking, uprights, hub), stopped breakout against the seam leaves, block on the tray, lead screw, crank and bearing blocks, dial, battlefield village and vehicles.
- No geometry audit: no tube or lathe parts.
