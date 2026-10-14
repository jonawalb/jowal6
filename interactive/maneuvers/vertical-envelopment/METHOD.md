# Vertical Envelopment: method

An isometric bench model of a vertical envelopment, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT). Two views from one model: the Machine (the bench) and, since 2026-10-13, a Battlefield view (`scripts/field-scene.mjs` on `kit/terrain.mjs`). `model.mjs` returns normalized state (progress values from 0 to 1 and flags) and no geometry, and both views draw from it.

## Build

```sh
node interactive/maneuvers/vertical-envelopment/scripts/build.mjs      # writes index.html
node interactive/maneuvers/vertical-envelopment/scripts/model.test.mjs # checks every number the page quotes
```

`index.html` is generated. Edit `scripts/page.html` (text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Wall of panels between posts across the plate, with a two-leaf gate | The enemy's defense line |
| Gantry crane (two leg frames on floor rails, beam, trolley and hoist) | The air move (airborne or air assault lift) |
| Lit block on a spreader and two cables | The air-landed force (the one lit accent) |
| Pad on the friendly side | Pickup zone |
| Narrow-gauge track behind the wall, with a supply cart and buffer stops | The enemy's rail line of supply; the block sets down on it (the objective) |
| Carriage on the ground rail through the gate | The linkup force |
| Dial gauge, engraved SUPPLY | The landed force's remaining supply |
| Ruler strip, label plate, feet, screws, end stops | Bench furniture |

The crane's legs pass beyond the ends of the wall only to carry the beam; the page tells readers to read the beam, not the legs.

## The model (all notional)

`model.mjs`, pure functions, no DOM:

- Air move: lift clear by H+0.5 h, over the objective by H+1.5 h, set down at H+2 h (smoothstep easing).
- Supply after landing falls linearly over 72 h, so it runs out at H+74 h.
- Linkup force: 60 km at a slider speed of 0.5–1.5 km/h (default 1.2); arrival = 60 / v hours. It arrives in time only above 60/74 ≈ 0.81 km/h.
- Linked up: supply refills at 10% of full load per hour.
- Supply out before linkup: in this model the force is lifted back out over 2 h (H+74 to H+76) and the enemy cart runs again.
- Examples (asserted in `model.test.mjs`): 1.2 km/h links up at H+50 h with 33% left; 1.0 km/h at H+60 h; 0.7 km/h would arrive at about H+86 h, 12 h after supply runs out.
- The time slider gives its first 15% to the two-hour air move so the lift can be seen; `hoursAt` and `sliderAt` convert.
- Left out, and said so on the page: resupply by air (which doctrine expects) and enemy action against the landed force.

The enemy cart's shuttle is scenery driven by the clock; it stops short of the block whenever the block sits on the track (`cut`).

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed.
- `lines.mjs` (Anatomy line-end check): `line ends: 0 of 302` at load (tour running), and via `drive.mjs` `["lines"]` in four resting poses: H+1 h in the air over the line, H+30 h holding, H+52/56 h linked up (1.2 km/h), H+80 h withdrawn (0.7 km/h). All 0.
- Captures: desktop 1440 px (card), phone 390 px (no sideways scroll), 4× close-ups of the gate and linkup carriage, the block, spreader, cables and cart, and the gauge; 3× of the block in the air with its floor halo. Console clean throughout.
- No geometry audit (`kit/audit.mjs`): the figure has no tube or lathe parts.
- Size: 132 solids (about 70 distinct parts; 37 of the solids are rail sleepers), about 1,090 paths; page about 0.35 MB.

## Battlefield view (added 2026-10-13, new terrain style)

Scale: a concrete small-unit vignette. FM 3-90 says divisions and larger normally conduct vertical envelopments; the view shows one air assault inside such an operation, so the soldiers can be drawn individually. Doctrinal picture: a lift of helicopters carries a rifle platoon over the enemy's defense line to seize a bridge and road junction behind it, cutting the enemy's supply road; a mechanized company fights through the line to link up; if it is late, the platoon is lifted out.

| Machine part / state | Battlefield |
|---|---|
| Crane carrying the lit block (`air`, `lift`) | Three utility helicopters (local `veHeli`: skids, cabin, nose, engine deck, boom, fin, tail rotor, four-blade rotor with a blur disc while turning, ground shadow) lifting the lit platoon from a chalk-outlined pickup zone, across the line, to a landing zone east of the bridge road. Horizontal position follows `air`, height `ALT × smooth(0.25, 1, lift)`. The empty legs (back to the pickup zone after landing, H+2.05 to H+2.75; in again before an extraction, H+72.5 to H+73.75 at 0.7 km/h) are this view's choreography inside the model's phases |
| Block on the enemy rail line (`cut`) | Platoon holding the bridge and junction: squad A across the bridge, squad B south down the road, squad C west toward the line, PL, RTO, medic; three fire sectors. Enemy supply trucks (red) halt short of the cut and shuttle again when it is lifted |
| Gauge (`supply`) | A pile of six supply crates by the platoon leader, `ceil(supply × 6)` left |
| Carriage (`linkup`) | Mechanized company column (five tracked vehicles and an ambulance) on the road; head at x = −406 + 492 × linkup, so it crosses the defense line at 0.744 as the carriage passes the gate and halts at the junction at 1. One vehicle is hit and pulls off the road smoking at the midpoint of the fight window |
| Withdrawal | Helicopters fly in, the platoon boards (casualties carried), lift out per the model, and unload at the pickup zone, wounded laid beside the aircraft |

Composition: platoon 30 soldiers (3 squads of two fire teams and a squad leader, PL, RTO, medic), enemy 19 (defense line: five two-man positions and a machine-gun team; bridge guard 4; five riflemen round the bridge), plus 3 helicopters, 5 tracked vehicles, an ambulance and 2 trucks. Static paths stay inside the kit budget; page 1.04 MB raw.

Fire (trShots): the line fires on the lift as it crosses and a door gunner answers; the bridge guard and squad A trade fire at the landing; the riflemen round the bridge keep the platoon under fire while it holds (less after linkup); the lead vehicles and the line trade fire during the fight-through; riflemen fire on the lift during an extraction.

### Casualties (all notional, `casualties()` in model.mjs)

- Landing fight: 1 friendly at H+2.1; 4 enemy (the bridge guard) over H+2 to H+2.6.
- Holding: 1 friendly per 24 h held and 1 enemy per 18 h held, until linkup or until the supply runs out.
- Fight-through: 2 friendly (the hit vehicle's crew) once the column is halfway through the fight window (linkup 0.66 to 0.80); 6 enemy, rounded in proportion through the window, nearest the road first.
- Extraction: 1 friendly at H+74.25 if the force is lifted out.
- Results (asserted in model.test.mjs): 1.2 km/h, 5 vs 12 at linkup and no more after it; 0.7 km/h, 7 vs 14 after the withdrawal. Readout: `H+56 h · linked up at H+50 h · 5 vs 12 down`.
- The casualty tally does not change the supply or the timings. The readout now ends with "N vs M down"; to keep it under 45 characters the holding readout drops the hours-to-linkup figure ("H+30 h · supply 61% · 2 vs 5 down"), and the withdrawn one reads "withdrawn 12 h late".

Machine view unchanged except the readout's casualty figure and a slower tour round the landing (H+0 to H+2.8) and the extraction (H+72.2 to H+76.4), so the field's boarding and flights can be seen. Tour now 15.2 s.

### Checks run (2026-10-13, Battlefield retrofit)

- `node scripts/model.test.mjs`: all passed (adds the casualty totals, monotonic casualties, readout lengths with the casualty figure).
- `lines.mjs` via drive (view switched with `setView` and the V key): Battlefield H+1 (air), H+30 (holding), H+66 (linked), H+75 (lifting out), H+90 (withdrawn): all `line ends: 0`; Machine H+30 and H+80 (0.7 km/h), and at 390 px H+56: all 0.
- Console clean on every run, including `--reduced`. No sideways scroll at 390 px in either view (scrollWidth 390).
- Frame timing (Battlefield, tour running, 6 s): desktop 60.0 fps, JS p50 0.5 ms / p95 1.6 ms; 390 px with 4× CPU throttle 58.9 fps, p50 1.3 / p95 5.4 ms, 6 gaps over 25 ms in 359 frames.
- 4× close-ups of the helicopters on the landing zone with the platoon dismounting, the boarding at the pickup zone and the withdrawn platoon with its wounded.
