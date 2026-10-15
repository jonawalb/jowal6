# Raid: method

Figure 47 of the Maneuvers section. An isometric bench model plus a platoon-scale Battlefield view, drawn with the shared Anatomy kit (`../kit/iso-kit.mjs`, MIT) and the terrain kit (`../kit/terrain.mjs`, recipe in `../kit/TERRAIN.md`). Built 2026-10-14 to the v2 builder brief.

## Build

```sh
node interactive/maneuvers/raid/scripts/build.mjs      # writes index.html
node interactive/maneuvers/raid/scripts/model.test.mjs # checks every model number the page quotes
```

`index.html` is generated: edit `page.html` (text and chrome), `model.mjs` (the run), `scene.mjs` (machine parts, rebuilt per frame), `field-scene.mjs` (Battlefield) or `build.mjs` (plate, live code). The page follows the v2 conventions: IBM Plex plus `/interactive/maneuvers/maneuvers.css`; Battlefield default (`localStorage["maneuvers.view.v2"]`, a stored "machine" overrides); daylight terrain palette; the `.ex-switch`, `.ex-machine` and `.ex-field` blocks; a Reset button. `window.__rd` exposes `stop`, `reset`, `seek(dwell, security, t)`, `change`, `goNow`, `setView`, `snapshot` and `load`.

## The object (Machine view)

| Part | Stands for |
|---|---|
| Shuttle on the rail (lit), nose pointing its way | The raiding force (assault element) |
| Home stop at the left end | The release point / ORP |
| Target block with a pop-up plate at the right end | The objective; the plate drops when the task is done |
| Task meter of six pegs | Time on the objective accumulating toward the task (3.0 s notional) |
| Gate: two posts, header, drop bar on guide rods | The response force reaching the withdrawal route; the bar falls when the timer runs out and rests on the shuttle if it is under it |
| Timer dial with a sweeping hand | The reaction clock, from the alert (fires open) to the response force arriving |
| Brake lever pressing the dial's drum | The security element holding the response force: the hand runs slower (15 s instead of 9 s) |
| Rule at the front with a collar and an index | The time the shuttle holds on the objective (collar = set by the slider; index = the clock) |
| Rack of 6 + 6 pegs | Men down, raiding force and defenders |

74 solids, about 550 paths in the machine SVG. No pipes, cables or turned parts, so the geometry audit does not apply.

## The Battlefield view (platoon scale)

A platoon raid on an enemy mortar position, soldiers drawn at about 1.5x scale. Assault element: platoon leader, RTO and a squad (11, lit). Support element: two machine guns with assistants and two riflemen on a chalk support position. Security element: two fire teams, one on the road that the response force uses (it halts the force at a block when security is on), one on the far side of the objective. Defenders: six (three mortar pits, three guard holes) plus a command post. Response force: two tracked vehicles and four men in an assembly area up the road. One dashed gate line (open chalk) crosses the road where the withdrawal route meets it; it turns to the enemy colour once the gate has shut. The assault goes in by the near side and returns by a different route; the column straddles the gate line for exactly the stretch of the run during which the bench's shuttle straddles its gate bar (`STAG` is derived from that). The support and security elements withdraw after the assault element has cleared the line, assault then support then security (ATP 3-21.8 para 7-120), unless it is caught.

## The model (all notional; no source gives a time)

| Quantity | Value | Why |
|---|---|---|
| Run in, and the same back | 6.0 s | one speed, 1/6 of the rail per second |
| Fires open, reaction clock starts | 4.5 s | when the assault is near the objective |
| Task needs | 3.0 s on the objective | the plate drops |
| Gate line cleared after leaving | 3.0 s | the shuttle's far end clears the bar at half way back |
| Response force reaches the route | alert + 9.0 s (security off), alert + 15.0 s (on) | security halts it at a block, 5.0 s after the alert, for 6.0 s |
| Hold window | 3.0 to 4.5 s (off); 3.0 to 10.5 s (on) | `maxDwell`; 3.0 s is the task |
| Defenders out of action | 5.2, 6.4, 7.2, 8.0, 8.8, 9.6 s, while the force is on the objective | |
| Raiding force down on the objective | 1.2 s and 2.6 s after arriving, if still there | |
| Raiding force down when caught | 0.8, 1.8, 2.8, 3.8 s after the response force arrives | six down in all |

Outcomes (`finalState`): hold 4.0 s security on, complete, 2 vs 6 down; 3.0 s, complete, 2 vs 5; 4.5 s security off, complete, 2 vs 6; 5.0 s security off, caught, 6 vs 6 (the shuttle is under the bar when it falls); 7.0 s security off, caught, 6 vs 6 (the bar falls in front of it); 1.5 s, task not done, 1 vs 3; 11.0 s security on, caught. The readout is "Phase · N vs M down" (friendly vs enemy), at most 38 characters.

## Checks run

- `node scripts/model.test.mjs`: passes (geometry, windows, outcomes for every hold in 0.5 s steps with and without security, shuttle speed bound, readouts under 45 characters, response force halting).
- Line check (`["lines"]`): `line ends: 0` in both views in nine poses each (waiting, run in, fires open, on objective, withdrawing, caught with security off, caught at the nose, task not done, complete).
- Console clean; no sideways scroll at 390 px; Reset returns the load-state snapshot in both views; `.ex-field` shows only in Battlefield view and `.ex-machine` only in Machine view.
- Frame timing, field view, 6 s of the idle tour, no CPU throttle: 60 fps at 1200 px (JS p50 0.4 ms, p95 0.7 ms) and at 390 px (p50 0.3 ms, p95 0.7 ms).
