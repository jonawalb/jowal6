# Deep Battle and Echelons: method

An isometric bench model of Soviet deep battle and echelonment, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT).

## Build

```sh
node interactive/maneuvers/deep-battle/scripts/build.mjs       # writes interactive/maneuvers/deep-battle/index.html
node interactive/maneuvers/deep-battle/scripts/model.test.mjs  # checks every model number quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Lane with sleepers, inner and outer rails, km ruler (tick every 5 km), two inlaid zone plates | The axis of attack: start line, tactical zone (0–28 km), operational depth (to 70 km) |
| Front gate (1.5 km) and rear gate (29.5 km), lifting leaves | Front and rear of the defender's tactical zone |
| Five pop-down pins between the gates | Obstacles in the tactical zone |
| Gantry on the outer rails with a plough (mid/hi tones) | First echelon (Glantz's "attack echelon") |
| Lit carriage on the inner rails, in a cradle with a latch | Second echelon ("echelon to develop success", the mobile group) |
| Timer drum with a commit peg, index lever and push rod to the latch | The commitment decision: when the second echelon is released |
| Shuttle on a lead screw beside the rear gate, trip arm on the gate post | The defender's reserve; on arrival it drops the rear gate (seals the breach) |
| Buffer at 70 km | Operational depth reached |
| Day clock (0–5 days, reserve day marked) | Time |

107 solids (Hero).

## The model

Sourced ranges (Glantz 1990, pp. 14–15): army attack echelon to 25–30 km; exploitation echelon to 70–100 km; front-operation tempo 10–15 km/day infantry, 40–50 km/day mobile forces. Bench values sit inside them; they are planning norms, not measured results, and the tempos are for front operations.

| Quantity | Value | Status |
|---|---|---|
| Tactical depth broken by the first echelon | 28 km | inside sourced 25–30 |
| Depth the second echelon is carried to | 70 km | sourced low end of 70–100 |
| First-echelon speed | 12 km/day | inside sourced 10–15 |
| Second-echelon speed | 45 km/day | inside sourced 40–50 |
| Second echelon's start | 12 km behind the start line | notional |
| Reserve reaches the rear gate | day 3 | notional |
| Carriage half-lengths | 2.33 km (gantry), 2.63 km (carriage) | drawing |
| Rule: second echelon stays ≥ 1 km behind the gantry until the breach is complete | | notional |
| Gantry rolls clear at 30 km/day after the breach, halts at 52 km | | drawing only (keeps the reserve visible); not quoted on the page |

Derived (asserted in `model.test.mjs`): breach complete day 2.33 (28/12); second echelon's front reaches the rear gate on day 2.49 at the earliest (any commitment up to day 1.63 is held behind the gantry and gets there then); latest commitment that beats the reserve is day 2.14, so on the 0.1-day slider day 2.1 goes deep and day 2.2 is sealed. Committed on day 1: deep (70 km) on day 3.39, reserve 0.5 d late. Committed on day 2.5: sealed, reserve 0.4 d ahead.

Example readouts: "Day 2.0 · 2nd echelon held behind 1st", "Day 3.6 · 70 km deep · reserve 0.5 d late", "Day 3.6 · sealed: reserve 0.4 d ahead". All readouts are under 45 characters (tested over the whole commit × time grid).

The page says what is notional in "What is notional"; the model does not count any cost of crowding the breach, and it leaves out aviation, artillery and air assault forces.

## Interaction

Idle tour (about 13 s a cycle): commit day 1 (goes deep), then commit day 2.5 (sealed), with a rewind between. Pointer hover scrubs the day across the card; click, Replay, Enter or Space replays; arrow keys and the slider change the commitment day (0–4, step 0.1). Reduced motion shows the end state. The loop runs only while the card is on screen. `window.__deepBattle.stop()` stops the tour for testing.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: passes.
- `scripts/lines.mjs` at rest: `line ends: 0` (of 372). In drive.mjs poses: sealed (commit 2.5, day 3.05) 0; second echelon under the gantry in the rear gate (commit 1, day 2.55) 0; day 0.9 and 3.6 poses 0.
- `capture.mjs` desktop (1440) and phone (390), light: console clean, no sideways scroll. Reduced motion: end state, console clean.
- 4× close-ups: timer drum, lever and latch; reserve shuttle at the trip arm; second echelon at the buffer; gantry and plough inside the rear gate. Fixes made after them: thread ends on the lead screw, latch bar swung clear of the lane, reserve moved beyond the rear gate so the tall gate no longer hides it.
- No geometry audit (`kit/audit.mjs`): the figure has no tube or lathe parts.

## Battlefield view (added 2026-10-13, new terrain style)

A Machine | Battlefield toggle (buttons, V key, `localStorage["maneuvers.view"]`) shows the same model state on full-bleed terrain drawn with `kit/terrain.mjs`. Code: `scripts/field-scene.mjs` (layout, vehicles, `fieldPose` from `stateAt(t, commit)`), wired in `scripts/build.mjs`. The machine view, its text and its numbers are unchanged.

**Scale (operational).** One army's slice of a 1930s deep operation, left to right along the axis of attack as on the bench. 3.5 world units per km through the tactical zone, 2.6 beyond 32 km and 1.9 behind the start line (the empty depth and the rear are drawn shorter so the 70 km town and the assembly area fit the card). Figures and vehicles are drawn far larger than scale.

| Field element | Bench part | Model input |
|---|---|---|
| Three rifle divisions abreast (8 riflemen + 1 support tank each), fire and movement | Gantry (first echelon) | `s.f1`, clamped to the 28 km zone; after the breach (`s.blade`) the outer divisions turn to the shoulders and the centre one steps off the road (the field's reading of the gantry rolling clear) |
| First belt (trenches, wire, two MG posts) at 3 km; strongpoints at 5–25 km; second belt at 27.6 km | Front gate, pins, rear gate | defenders go down as `s.f1` passes them (`s.pins` for the strongpoints); some of the first belt fall back to the second; the second belt's outer posts keep fighting the shoulders |
| Crossroads at 30.6 km where the axis road meets the lateral road | Rear gate | closed by the reserve on `clearDay` (the day the bench's gate drops) |
| Lit mobile group: 5 light tanks, 3 lorries, 4 cavalry, 1930s-pattern silhouettes | Second-echelon carriage | parked in the assembly area until committed (`s.latch`), then in column with its head at `s.front2`; deploys round the town at 70 km |
| Red reserve: 3 tanks, 3 lorries on the lateral road | Reserve shuttle | `t / reserveDay` to its holding point by day 3; deploys into the crossroads at `clearDay` |
| Ambulance | — | shuttles from behind the first echelon to the start line after day 0.6 |
| Town rear services (3 soldiers, 2 lorries) | Buffer | overrun when the mobile group arrives |

**Casualties (notional, thousands, `model.mjs` `LOSSES`, `lossesOf`).** Breaking the 28 km zone: attacker 4.0, defender 3.0, in proportion to depth broken. Sealed crossroads fight: +2.5 / +1.0. Run from the crossroads to 70 km: +0.6 / +2.0 in proportion to distance. Late reserve against the shoulders: +0.4 / +0.6. Commit day 1 ends 5.0 vs 5.6 down (town taken); commit day 2.5 ends 6.5 vs 4.0 down (stopped). Field readout, e.g. "Day 3.6 · 70 km deep · 5.0k vs 5.6k down"; all under 45 characters (tested over the commit × time grid, and casualties never fall with time). The drawn casualties are tokens: 7 riflemen and 1 support tank of the first echelon, 1 mobile-group tank passing the second belt and 2 more at a sealed crossroads, 1 reserve tank, and defenders in both belts, the strongpoints and the town.

**Labels.** Cluster and place labels are HTML over the field (legible on a phone; place labels hidden under 520 px), positioned from a cached SVG-to-stage matrix and clamped inside the card.

**Checks (2026-10-13).**
- `node scripts/model.test.mjs`: passes (with the casualty and field-readout assertions).
- `lines.mjs` / drive `["lines"]`: Battlefield 0 floating ends at commit 1 day 1.4 (0 of 266), commit 2.5 day 3.9 sealed (0 of 266), commit 1 day 3.7 deep (0 of 266), phone 390 px (0 of 264), reduced motion (0 of 226); Machine at rest 0 of 372 and after V at two poses 0 of 374.
- Console clean in both views, desktop, phone and reduced motion; no sideways scroll at 390 px.
- 4× close-ups: light tanks, lorries, cavalry (horse redrawn longer and lower after the first close-up), prone casualties, knocked-out vehicles, tracers.
- Frame timing (rAF hook, 6 s of the tour in the field view): desktop 1440 px 60 fps, JS 2.0 ms median, 3.5 ms p95, no frame over 20 ms; phone profile (390 px, DPR 3, 4× CPU throttle) 55–57 fps, JS 2.6 ms median, 5–6 ms p95, 11–25 late frames in 6 s, measured while the host's load average was about 150 (other builders' Chrome sessions), so the late frames are partly host noise. Static field paths: 4,245 (budget 5,000); 79 live units, 55 of them soldiers.
