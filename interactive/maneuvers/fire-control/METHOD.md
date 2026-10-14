# Fire Control and Distribution: method

Figure 40. An isometric spray bar over a row of target blocks (Machine) and a defending platoon meeting an attack (Battlefield), both driven by one engagement state from `scripts/model.mjs`. Drawn with the shared Anatomy kit (`../kit/iso-kit.mjs`) and terrain kit (`../kit/terrain.mjs`), MIT. Size: Figure.

## Build
```sh
node interactive/maneuvers/fire-control/scripts/build.mjs       # writes index.html
node interactive/maneuvers/fire-control/scripts/model.test.mjs  # asserts every model number the page quotes
```
Edit `scripts/page.html`, `scene.mjs` (machine), `field-scene.mjs` (battlefield), `model.mjs`, `live.js`, `build.mjs`. `window.__fireControl` exposes `stop()`, `pause()`, `reset()`, `setMode()`, `engage()`, `setView()`, `advance(sec)`, `snapshot()`, `initial`.

## The object
| Part | Stands for |
|---|---|
| Six nozzle heads sliding on the bar | The six fire teams |
| Five blocks on plungers, middle one lit | Enemy elements; the lit one is the machine-gun team, the greatest threat |
| Jet pressing a block down | A team's effect; block pressed to the sleeve = out of action |
| Dark jets and overflow into the tray, gauge at right | Overkill: fire beyond what a target can use, and fire on a target already down |
| Lamps behind the blocks | Targets still firing |
| Four-lamp panel at the front (1 to 4 dots) | ATP 3-21.8 A-33 fire control process, lit in order |
| Selector knob | Uncontrolled / Controlled |

## The battlefield (platoon scale)
Platoon on a rise (6 teams x 2 two-man positions, PL, RTO), wire on the slope; 5 enemy elements x 3 men advancing in line abreast from 126 to 47 units; middle one MG team (lit). Controlled only: TRP bullseyes (step 1), engagement-area chalk and six sector fans (step 2); teams turn to TRPs (step 3); shifts (step 4). Casualties greyed at a CCP with a medic. Soldiers about 1.5x scale.

## The model (all notional; doctrine only supplies the concepts)
- 6 teams, 5 elements, weights 1,1,3,1,1, effect needed 6,6,9,6,6 team-seconds, cap 2 teams per target, shift lag 0.6 s (both modes), enemy at the wire at 16 s, 0.06 men down per weight-second, prep 3 s with steps at 0.5/1.5/2.5 s.
- Uncontrolled: all teams on the lowest-index live element; after it falls they fire on it for the lag, then all move to the next.
- Controlled: frontal start [0,1,2,2,3,4] (two on the threat), then each team shifts to the live element with highest weight that has room (< cap), longest time to kill.
- Outcomes (tested): U, 4 of 5 down at 3.0/6.6/11.7/15.3 s, fifth at the wire, 96 team-s fired, 72% wasted, 5 vs 12 down. C, cleared at 6.0 s, 8% wasted, 2 vs 15 down.
- Page speed 2.2 model s per real s; tour U then C, about 16 s.

## Checks run (2026-10-14)
- model.test: passed. build: OK; index.html has maneuvers.view.v2, maneuvers.css, IBM+Plex, ex-machine, ex-field, fd-reset.
- lines.mjs: Battlefield controlled mid-fight 0, Battlefield uncontrolled late 0, Machine at rest-after-U 0, Machine controlled 0.
- Reset snapshot equals load snapshot in both views (only `touring` differs because the test calls stop()).
- `.ex-field` only in Battlefield, `.ex-machine` only in Machine. Console clean. 390 px: no sideways scroll.
- Frame rate, Battlefield, desktop, 5 s: 60.4 fps, longest gap 16.8 ms. No 4x CPU-throttle run, no 390 px timing run.
- No geometry audit (no pipes or lathe parts).
