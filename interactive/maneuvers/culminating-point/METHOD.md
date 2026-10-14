# Culminating Point: method

An isometric bench model of the culminating point, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT). Structure copied from Figure 1 (`../flank-attack/`).

## Build

```sh
node interactive/maneuvers/culminating-point/scripts/build.mjs      # writes index.html
node interactive/maneuvers/culminating-point/scripts/model.test.mjs # checks every number the page quotes
```

`index.html` is generated. Edit `scripts/page.html` (text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Lit carriage with a prow, on a straight track | The attacking force |
| Blockhouse at the end of the track | The objective |
| Supply sled with a lashed crate, depot cabinet and crates behind it | The base the force draws on |
| Tension spring from the sled's hook plate to the carriage's | The tether of operational reach (ADP 3-0 para 2-54 calls reach "a tether") |
| Dial gauge, raised mark at 1.0, engraved stall zone below it | Combat power as a ratio of what the advance needs; 1.0 is the defender's line |
| Ruler strip, tick every 5 km, major every 25 | Distance along the track from the start line |
| Moving the sled forward | Basing that extends reach (ADP 3-0 para 2-58) |

About 70 solids (plate, feet, 18 sleepers, rails, end stop, depot, crates, sled, carriage, objective, gauge) plus seams, ticks, knurls and screws.

## The model (all notional)

1 world unit = 1 km of the notional advance.

- Power ratio at distance d km from the base: `p(d) = 2.0 − d / 120`. 2.0 : 1 at the base, 1.5 : 1 at 60 km, 1.0 : 1 at 120 km.
- Culmination where p = 1.0 (the defender's line): 120 km from the base.
- Track: start line at rail −59, objective contact at rail 108, so the objective is 167 km from the rear depot. The carriage culminates at rail 61, 47 km short.
- The base moves 69 km forward (sled −129 → −60). The objective is then 98 km from the base, where p = 1.18 : 1, so the carriage reaches it.
- Speed: 34 km/s of figure time at full margin, slowing linearly over the last 0.3 of margin to a crawl of 10% of that; falling back runs at twice full speed. The base can only follow behind the force (tether never shorter than its slack).
- Readout states: Advancing, Holding, Falling back, Culminated (at the limit, ordered further), Objective reached.

None of these numbers come from data. The page says so in "What is notional".

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed (asserts 120 km reach, 2.00/1.50/1.00 ratios, rail 61 stall, 167 km and 98 km distances, 1.18 at the objective, 69 km base move, no overshoot after 30 s of pushing, objective reached with the forward base).
- `scripts/lines.mjs` at rest (tour, culminated): `line ends: 0 of 332`.
- `drive.mjs` pose 2 (base forward, carriage at the objective, "Objective reached · 98 km from base · 1.18 : 1"): `["lines"]` → 0.
- Captures: desktop 1440 light, phone 390 (no sideways scroll), reduced motion; 4× close-ups of the sled and spring eye, carriage and prow, gauge, objective. Console clean in all.
- No geometry audit: no tube or lathe parts are used.

## Battlefield view (added 2026-10-13, new terrain style)

`scripts/field-scene.mjs` draws the same state on full-bleed terrain with `kit/terrain.mjs` (copied from Fig 1 and Fig 3). Toggle: buttons under the card, V key, `localStorage["maneuvers.view"]`.

- **Scale (TERRAIN.md table, operational row):** one attacking battalion drawn as three companies of three vehicles, one vehicle per platoon (most of a real battalion is left out). Vehicles drawn far larger than scale.
- **Mapping:** 1.6 field units per model km along the road. The column's lead sits at road distance `s0 + (x − start) × 1.6`; the base (four parked trucks) at `sDepot + (sled − sledRear) × 1.6`, so the forward base lands in the chalk outline 110 units up the road. Distance, ratio, limit and state all come from `model.mjs`.
- **Supply trucks:** four shuttle between the base and the column's tail at 40 units/s (the column's top speed is 54), so each round trip lengthens as the column pulls away. Lap phase is integrated in the page (`FM.lap`).
- **Culminated** (at the limit and ordered further): the column halts; the lead company deploys forward in a hasty defense (blue fan), the others pull off the road. ADP 3-0 para 2-52 gives defensive posture or operational pause; the view shows the first.
- **Objective reached:** the battalion deploys round the hill and the defenders fall back east (rearward) along the road.
- **Enemy:** a covering force of three vehicles waits 125 units past the start line and then falls back 46 units ahead of the lead; five vehicles dug in on the objective hill (red fan).
- **Casualties (owner rule 2026-10-13, notional):** `losses(x, sled)` in `model.mjs`: attacker 0.12 per km at 2.0 : 1 rising linearly to 0.62 per km at 1.0 : 1, at the power halfway through the advance; defender 0.15 per km plus 18 when the objective falls. Culminated from the rear base 44 / 18; objective with the forward base 54 / 43. The page keeps the worst figure reached (resets at the start line) and uses the ordered base, so a base on the move adds nothing. Each 12 attacker casualties = one greyed knocked-out blue vehicle where it was hit; each 10 defender casualties = one greyed red vehicle (covering force first, then the hill). A white ambulance runs between the latest knocked-out vehicle and the base. The readout gained "· N cas" (attacker), and "km from base" was shortened to "km" to stay under 45 characters.

Checks (2026-10-13): `model.test.mjs` passes (adds the loss figures). Line ends 0 in the field view culminated and at the objective, and in the machine view at the objective and culminated (switched with the V key); 0 in reduced motion. Console clean at 1440 and 390 px; no sideways scroll at 390. Frame timing, 6 s of the tour in the field view: desktop 60 fps, JS p50 0.4 / p95 1.0 ms; 390 px DPR 3 with 4× CPU throttle 59.7 fps, p50 1.1 / p95 3.1 ms, one 50 ms frame. Page 0.90 MB raw. Machine thumbnail kept.

- Final pass 2026-10-13: readout standardized to "state · ratio : 1 · N vs M down" (attacker vs defender); the km figure was dropped to stay under 45 characters (the battlefield view shows the distance).
