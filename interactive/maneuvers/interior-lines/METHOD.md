# Interior vs Exterior Lines: method

An isometric bench model of interior and exterior lines, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT).

## Build

```sh
node interactive/maneuvers/interior-lines/scripts/build.mjs      # writes interactive/maneuvers/interior-lines/index.html
node interactive/maneuvers/interior-lines/scripts/model.test.mjs # checks every number quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (standing and moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (base, table, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Lit shuttle on a hub turntable, running out along six straight spokes | A force on interior lines: its operations diverge from a central point |
| Carriages on a circular rim track, clamped to a link belt turned by a motor | A force on exterior lines: its operations converge from outside |
| Carriage buttons (1, 2, 3 carriages, evenly spaced) | A larger force on exterior lines, holding more positions |
| Rim speed knob (×0.5 to ×2) | A more mobile, faster-tempo force on exterior lines |
| Six station posts with lamps; call console with one key per station | The places where force must be massed; the called one rises / is pressed |
| Left counter / right counter | Travel time of the hub shuttle / of the rim to the called station |

## The model

Geometry (real, as drawn): spoke length from hub centre to the shuttle's stop 80 units; rim track centre-line radius 100 units (half a turn 314 units); six stations at 15°, 75°, 135°, 195°, 255°, 315°.

Notional bench settings (labelled notional on the page):
- Both forces travel at 70 units/s at rim speed ×1; the rim speed control scales the rim only (×0.5 to ×2).
- The hub turntable indexes at 360°/s, and its turning time is counted in the hub's time.
- The hub shuttle runs back to the hub after each trip (the model's choice of a central position). If called while out on another spoke, it must run in first; that distance is counted.
- The belt turns the shorter way to bring its nearest carriage to the station.

Times: hub = (in + out distance)/70 + |turn|/360. Rim = 100·|belt turn in radians|/(70·k).

Numbers quoted on the page (all asserted in `model.test.mjs`): hub from rest 1.14 s (same spoke), 1.31 / 1.48 / 1.64 s (60° / 120° / 180° turn); rim with one carriage 1.50 / 2.99 / 4.49 s (60° / 120° / 180°); with two or three carriages starting on stations the longest rim trip is 60°, 1.50 s, and 0.75 s at ×2; a station with a carriage already on it costs the rim 0 s; slowest possible rim trip 8.98 s (×0.5, half a turn).

In this model the hub's advantage is largest for far stations; for a station next to a waiting carriage the rim is always quicker. The counters measure travel time only, not combat, exposure on all sides, terrain or supply.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed.
- `scripts/capture.mjs` at 1440 px (light): console clean, no sideways scroll. At 390 px: console clean, no sideways scroll, figure reads.
- `scripts/lines.mjs`: `line ends: 0` at rest (250 ends) and, via `drive.mjs` `["lines"]`, in a second pose (3 carriages, rim ×2, station 2 called: 278 ends, 0 floating).
- 4× close-ups read: hub turntable and spoke rails, shuttle at its stop beside a rim carriage, left counter window and digits, call console, belt motor and pinion, speed box. Fixed after review: a pointer pip on the speed box that drew over the knob when it pointed away.
- Reduced motion: no tour, figure still responds; readout "Hub and rim at station 1" at rest.
- No geometry audit (`kit/audit.mjs`): the figure has no pipes, cables or lathe/tube parts.

## Battlefield view (new style, added 2026-10-13)

Scale: operational (TERRAIN.md table: interior lines). Each small vehicle is a company, each cluster of three a battalion. `scripts/field-scene.mjs`, drawn with `kit/terrain.mjs`, driven by the same state `S` as the machine; the camera uses the machine's azimuth (45°) so each town sits on its station post's bearing.

| Bench | Battlefield |
|---|---|
| Hub turntable and spokes | Road hub (town, brigade command post, supply trucks) and six radial roads |
| Hub shuttle (`S.r`, `S.psi`) | Lit blue battalion; `r` 0–80 maps onto the road from the hub to the town (stop at 142 of 150 field units) |
| Rim belt and 1–3 carriages (`S.phi`, `S.n`) | 1–3 red battalions on the ring road (radius 150), spaced evenly, moving together the shorter way |
| Station posts, called lamp (`S.call`) | Six towns on the ring; chalk outline round the called town |
| Counters, readout | Unchanged; shared |

The clash (the model's own rule, not doctrine): whoever reaches the called town first holds it and fires on the other side, which halts 34 units short and attacks. The blue battalion then drives back to the hub with the shuttle; a red battalion halted short then moves into the town, so the end state matches the machine.

Notional losses (`model.mjs` `losses()`, asserted in `model.test.mjs`): holder loses 1 company vehicle; the side arriving second loses 2 if the holder had at least 0.5 bench s to deploy, else 1; a level race (under 0.005 s) costs 1 each. Examples: station 4 from the start, 1 carriage: hub 1.64 s vs rim 4.49 s → 1 friendly, 2 enemy; 3 carriages at ×2: hub 1.31 vs rim 0.75 → 2 friendly, 1 enemy. Knocked-out vehicles stop, grey and smoke; a casualty evacuation truck (white roof) runs blue losses back to the hub. All unit sizes, distances, timings, ranges and losses are notional.

Fix to the shared live code: the hub plan used to pin the shuttle at its stop every frame, so it never ran back to the hub as the page text says (S.r stayed about 78.8 and the loop never settled). The plan now stops driving the shuttle once its return starts. Model numbers and tests are unchanged.

Checks (2026-10-13, one headless Chrome at a time): `model.test.mjs` passes. `drive.mjs` `["lines"]`: Battlefield at rest 0 of 192 ends floating, in contact (station 4 called, fire and fan up) 0 of 192, second call (2 carriages) 0 of 196; Machine after the V key 0 of 264 at rest and 0 of 264 in a second pose. Console clean in both views and in reduced motion. 390 px: no sideways scroll (scrollWidth 390), the field crops at the sides. Frame timing over 6 s of the tour in the field view: desktop 60 fps, JS p50 0.30 ms, p95 1.20 ms; 390 px with 4× CPU throttle 60 fps, p50 0.60 ms, p95 1.80 ms; no frame over 25 ms. Field static budget: about 2,700 paths, at most 14 units.
