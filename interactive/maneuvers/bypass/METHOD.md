# Bypassing Strongpoints: method

An isometric bench model of a bypass, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT). Figure size, 65 solids with the floats live (53 static and rock solids plus 12 floats).

## Build

```sh
node interactive/maneuvers/bypass/scripts/build.mjs      # writes interactive/maneuvers/bypass/index.html
node interactive/maneuvers/bypass/scripts/model.test.mjs # checks the model numbers quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Twelve lit floats leaving the header tank | The attacking force |
| Three rocks (medium, large, small, in flume order) | Enemy strongpoints of three sizes |
| Selector knob with four detents (and the slider) | Bypass criteria: which sizes may be bypassed |
| Lane divider and turning vane at each rock | The bypass route; the vane swings toward the lane the convoy avoids |
| Floats parked in front of a bypassed rock | The part of the force left to fix or watch the bypassed enemy |
| A rock cut down to rubble while the convoy waits | Reducing a strongpoint that may not be bypassed |
| Collecting pool and meter line | Arrival beyond the strongpoints |
| Left dial / right dial | Floats across the meter line / elapsed time, 0–10 s |

## The model (notional)

All numbers are teaching values (`scripts/model.mjs`):

- 12 floats, 80 units/s, 10.5 units apart, launched one gap apart.
- Rocks: medium (reduce 1.0 s, hold with 1 float), large (2.0 s, 2 floats), small (0.5 s, 1 float).
- Criteria 0–3: a rock is bypassed if its size rank (small 1, medium 2, large 3) is at or below the setting.
- A rock not bypassed: the lead float stops at it, the rock is reduced over its hold time, and every float behind waits.
- A rock bypassed: floats from the head of the convoy peel off and park in front of it; they never reach the pool. The rest swing into the open lane.
- Results (finish = last free float across the meter line): reduce all 12/12 in 8.3 s; bypass small 11/12 in 7.8 s; bypass small and medium 10/12 in 6.8 s; bypass all 8/12 in 4.8 s. Bypass all holds back 4 of 12, exactly a third.

The page labels all of this notional and says that a bypassed force can still strike following units, and that doctrine allows bypassing a larger force with approval while the bench always reduces it.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed (parameters, the four outcomes, the one-third figure, fixer assignment and lanes, readout under 45 characters).
- `scripts/lines.mjs` at rest: `line ends: 0` (346 ends). `drive.mjs` in pose 2 (criteria "Bypass all", run finished) `["lines"]`: 0 (344 ends); in "Reduce all" mid-run: 0. The knob pointer tip is marked free like the dial needles.
- Captures at 1440 px and 390 px (light): console clean, no sideways scroll. 4× close-ups of the rocks with divider, vane and pivot (bypass and reduce), the pool and end wall, the dials, the tank valve and the selector knob.
- No geometry audit (`kit/audit.mjs`): the figure has no pipes, cables or lathe parts.

## Battlefield view (added 2026-10-13, new style)

`scripts/field-scene.mjs` with `kit/field.mjs` and `kit/terrain.mjs`, toggled with the Machine | Battlefield buttons or V (`localStorage["maneuvers.view"]`). The same `simulate(criteria, t)` state drives both views; the readout is shared.

**Scale and reading.** Company scale with vehicles (TERRAIN.md: bypass is a company/battalion idea). One float = one vehicle; the column of twelve is drawn as three platoons of four (notional, not a doctrinal establishment). Each rock = an enemy strongpoint astride a valley road: small (two two-man fighting positions, 4 men), medium (three positions and a machine-gun position, 8), large (five positions, two machine guns, wire on its flanks, 14). The machine's open lane = a dirt side track round each strongpoint (the same `laneY` curve for that rock alone). Rocks bypassed: the floats the model holds back halt on the road short of the strongpoint, put out a two-soldier observation post and fire on it (FM 3-90 B-11 observation, B-12 fixing with fires). Rocks reduced: the column halts at the model's stop point, the lead two vehicles fire, a squad of nine (two fire teams and a squad leader, ATP 3-21.8 1-9) dismounts, forms a squad line (3-54) on the near flank and closes by fire and movement (1-9) in four bounds tied to the rock's reduction progress, kneels on the position, then remounts; defenders go down in near-side-first order and the survivors withdraw into the wood behind (enemy leaves rearward, matching the rock being cut down). Pool = an assembly area past a chalk phase line at the meter line.

| Machine | Battlefield |
|---|---|
| Float | Vehicle of the attacking company (lit while in the column; unlit once left to hold a strongpoint) |
| Rock (medium, large, small) | Enemy strongpoint of 8, 14, 4 men in fighting positions |
| Open lane / vane | Side track round each strongpoint |
| Floats parked at a bypassed rock | Vehicles halted short of it, observation post, fixing fire |
| Rock cut to rubble while the convoy waits | Lead vehicles' fire and a squad assault while the column waits |
| Meter line, pool | Chalk phase line, chalk assembly area |
| Dials (count, time) | The readout: vehicles through and elapsed time |

**Casualties (notional, `model.mjs` LOSS / `casualties()`).** Men down, friendly vs enemy. Reducing: small 1 vs 3, medium 2 vs 6, large 3 vs 11, accruing with reduction progress. Bypassing: small 0 vs 1, medium 1 vs 1, large 1 vs 2, taken once the first free float passes the strongpoint. Run totals: reduce all 6 vs 20; bypass small 5 vs 18; bypass small and medium 4 vs 13; bypass all 2 vs 4. Drawn as greyed prone soldiers where they fell (enemy behind their positions; friendly squad members where the model's progress reached them; an observer by the holding vehicle). A white ambulance trails the column (it never counts in the model) and halts by the latest friendly casualty, where a medic kneels. The readout became `<criteria> · <through>/12 · <time> s · N vs M down` (short criteria names keep it under 45 characters; the held count is 12 minus the count through).

**Field layout numbers (notional).** 1.1 field units per flume unit along the valley, 1.15 across (side track 37 units off the road); assembly area set 16 units off the road; camera azimuth 70°, elevation 42°, 640 × 420 viewBox shown with slice. Soldiers and vehicles drawn larger than scale.

**Performance change.** `simulate()` now runs through `runner(criteria)`, an incremental stepper with the same code and results (`model.test.mjs` asserts equality at five times for each criteria); the page keeps one runner per run and caps time at finish + 2 s, so a frame costs a few steps instead of a rerun from zero. The tour's run lengths are computed once.

### Checks run for the Battlefield view (2026-10-13)

- `node scripts/model.test.mjs`: all passed (original assertions unchanged, plus casualties for all four settings, the readout string, runner equality).
- `drive.mjs` line checks, `line ends: 0` in every pose: field "Bypass small" mid-run (100 ends), field "Bypass all" finished (110), machine "Bypass small" and "Reduce all" after V (344 each); reduced motion field (104). Console clean throughout.
- 390 px: scrollWidth 390, no sideways scroll; phone shot read.
- 4× close-ups of the squad assault, fighting positions, casualties, ambulance and medic, tracers.
- Frame timing (rAF wrapper, tour in the field view, 6 s): desktop 60 fps, JS p50 0.4 ms / p95 1.2 ms; 390 px with 4× CPU throttle 59.8 fps, p50 1.1 / p95 4.1 ms, one gap over 25 ms.
