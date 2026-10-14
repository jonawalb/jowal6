# Shaping, Decisive and Sustaining: method

An isometric bench model of the decisive, shaping and sustaining operations framework of ADP 3-0 (2019) (terms no longer defined in ADP 3-0, 21 March 2025; the page marks the three stages as the figure's own framing), drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT).

## Build

```sh
node interactive/maneuvers/shaping-decisive-sustaining/scripts/build.mjs      # writes index.html
node interactive/maneuvers/shaping-decisive-sustaining/scripts/model.test.mjs # checks every number the page quotes
```

`index.html` is generated. Edit `scripts/page.html` (text and chrome), `scripts/scene.mjs` (moving parts and the y/x prism helper), `scripts/model.mjs` (numbers and the line simulation) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Feeder: magazine of flat sheets, pneumatic pusher on mounts, roller conveyor | Sustaining operation: generates and maintains what the other stages work with |
| Small press with a shallow V die | Shaping operation: sets conditions (a 45° pre-bend) for the final stage |
| Large press with the lit punch and a deep V die | Decisive operation: the stage that produces the result (the 90° bend) |
| Bin, back compartment / front compartment | Good parts / scrap |
| Dial gauge | Good parts per minute |
| Three stop knobs with cables to their stages | Stopping one stage |

About 100 solids on the page (static and live), including some 20 conveyor rollers.

## The model (all notional)

`scripts/model.mjs`, the same file the page runs:

- The feeder releases a sheet every 1.8 s (when the conveyor ahead is clear): 60 / 1.8 = 33.3, shown as "about 33" good parts per minute.
- Conveyor speed 90 units/s; minimum spacing 36 units; each press stroke takes 0.6 s; the pusher stroke 0.45 s.
- Each die adds at most 45° of bend per stroke. A part is good only within 1° of 90°.
- Hence, in this model: all three running → 90° → good; shaping stopped → the sheet reaches the final die flat and leaves at 45° → scrap; decisive stopped → 45° → scrap; feeder stopped → nothing arrives. Good-part rate is 0 in all three failure cases.
- The meter is a leaky integrator with a 10 s time constant (each good part adds 60/10, the value decays at 1/10 per second), so it averages to 33.3/min while running and falls gradually after a stage stops. The needle eases toward it (0.6 s).
- The readout counts good and scrap parts since the last change of the stage switches; sheets already in the line when a stage stops finish with the work they already had, so a few good parts can still arrive after a stop.

None of these values is drawn from data or from doctrine. The 45°-per-stroke limit is the model's own device to make the shaping stage necessary, and the page says so.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: passes (closed-form outcomes, 33/min, 60 s simulation gives 30–33 good and 0 scrap, shaping or decisive stopped gives 0 good, feeder stopped gives 0 parts, spacing never below 36).
- `scripts/lines.mjs` at rest (all running): `line ends: 0 of 326`. `drive.mjs` in pose 2 (shaping stopped, 6 s later) with `["lines"]`: `line ends: 0 of 326`; also 0 at a decisive press bottom stroke.
- `capture.mjs` desktop 1440 light and phone 390: console clean, no sideways scroll; readout fits beside the hint (hint hidden under 520 px, per the shared CSS).
- 4× close-ups of the shaping press, the decisive press at the bottom of its stroke, the feeder/magazine and the bin and dial. Fixed after review: the near wing of a sheet in the die is now drawn in front of the punch (far wing behind it); the shaping punch edge toned down so only the decisive punch reads as the accent.
- Reduced motion: no animation; each switch jumps the line to its settled state (checked: key 3 → "Decisive stopped · 0 good · 3 scrap").
- No geometry audit: the figure has no `tube.mjs` or `lathe.mjs` parts (its tilted plates and rollers use a small prism helper in `scene.mjs`, built on `iso-kit` only).

## Battlefield view (added 2026-10-13, new terrain style)

Scale: operational / brigade picture, drawn with `kit/terrain.mjs` as vehicle clusters (one small vehicle per platoon, gun section or supply section; three per company), per kit/TERRAIN.md. Files: `scripts/field-scene.mjs` (layout, pose, marks, smoke), wired into `build.mjs` and `page.html` like Fig 1 (toggle buttons, V key, `localStorage["maneuvers.view"]`). The same `on` switches drive both views.

| Machine | Battlefield |
|---|---|
| Feeder (sustaining) | Supply trucks from the brigade support area along the main road to the rear of the attack, and along a track to the guns; stopped, they halt on the road and ammunition/fuel (eased `sup`) runs down |
| Shaping press | A battery of four self-propelled guns shelling the enemy positions (shifting to its rear once the attack is on the hill) and two scout vehicles on a rise watching the objective; stopped, the guns fall silent and the scouts pull back |
| Decisive press (lit) | The lit mechanized battalion attacking from its attack position, across the line of departure, onto the hill |
| Good part / scrap | Objective seized / attack stalls or never goes in |

This mapping is the model's own picture, not a doctrinal example; the page says so.

Model additions (`model.mjs`, all notional): `attackReach` — 1 with all three running, 0.42 unshaped, 0.55 unsustained, 0 without the decisive stage. `losses` (vehicles per replay, friendly vs enemy): all running 3 vs 6 (1 scout + 2 attack); shaping stopped 5 vs 1; decisive stopped 1 vs 3; sustaining stopped 4 vs 3. `lossesAt(on, b)` spreads them over the replay. Each change of the switches replays the attack (3.2 s), after the battalion drives back to its attack position ("regrouping"); wrecks stay greyed and smoking and an ambulance shuttles back when friendly losses exist. Field readout: `fieldStatus · N vs M down` (friendly vs enemy). The field view has its own idle tour (22 s: all, feeder off, shaping off, decisive off) so each replay finishes.

### Checks run (Battlefield, 2026-10-13)
- `model.test.mjs`: passes, including reach, losses per configuration, monotone `lossesAt`, readouts under 45 characters.
- `lines.mjs` via drive (V/setView): field all running 0 of 586; shaping stopped 0 of 588; sustaining stopped 0 of 616; decisive stopped 0 of 616. Machine after switching back: 0 of 326 at rest and 0 of 326 with shaping stopped.
- Console clean; 390 px: scrollWidth 390, no sideways scroll; phone shot read.
- Frame timing (field view, tour running, 6 s): desktop 60 fps, JS p50 0.50 / p95 0.80 ms; 390 px 60 fps, p50 0.50 / p95 0.70 ms (drive.mjs has no CPU-throttle option, so the 4x throttled run was not done).
- Reduced motion: field view jumps to each replay's end (all running → "Objective seized · 3 vs 6 down"; key 2 → "Shaping stopped · 5 vs 1 down").
- 4x close-ups of the hill (attack among the enemy positions, wrecks) and the gun line.
