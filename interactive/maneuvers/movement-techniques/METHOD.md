# Movement Techniques: method

Figure 45. An isometric bench with two carriages on twin rails (Machine) and a rifle squad crossing open ground toward two hidden enemy outposts (Battlefield), both driven by one state from `scripts/model.mjs`. Drawn with the shared Anatomy kit (`../kit/iso-kit.mjs`) and the terrain kit (`../kit/terrain.mjs`), MIT. Size: Figure.

## Build

```sh
node interactive/maneuvers/movement-techniques/scripts/build.mjs       # writes index.html
node interactive/maneuvers/movement-techniques/scripts/model.test.mjs  # asserts every model number the page quotes
```

`index.html` is generated. Edit `scripts/page.html` (text, chrome, CSS), `scripts/scene.mjs` (machine), `scripts/field-scene.mjs` (battlefield), `scripts/model.mjs` (numbers), `scripts/live.js` (page runtime) or `scripts/build.mjs` (plate, cards, wiring). `window.__movement` exposes `stop()`, `reset()`, `setRisk()`, `setMethod()`, `makeContact()`, `resume()`, `setView()`, `advance(sec)`, `snapshot()` and `initial` (the load-state snapshot).

## The object

| Part | Stands for |
|---|---|
| Two carriages on twin rails (the lead one lit) | The squad's two fire teams |
| Brake plunger on each carriage (knob down = pin in the rail) | A team halted in its overwatch position |
| Mast and sight head, raised when the team is set and scanning | The overwatching team watching its sector |
| Pop-up target on two posts at the far end | The enemy; it rises on contact |
| Selector dial with two engraved cuts and a needle | The leader's likelihood of contact: not likely / possible / expected |
| Three bar gauges | Speed, security, time to first supporting fire (notional shares) |
| Ruler strip with a line and end ticks | Notional reach of the overwatching weapons; the tab is the probable line of deployment |
| Tray with two rows of five pegs | Men down: friendly (front row), enemy (back row) |
| Dashed lines | The enemy's fire on the lead team; the overwatching team's fire on the target |

About 75 parts (plate, feet, screws, label plate, ties, beds, rails, detent holes, end stops, ruler, dial, three gauges, tray, two carriages with shoes and plungers and masts, target). One lit accent: the lead carriage.

## The battlefield (squad scale)

| On the ground | Stands for | Driven by |
|---|---|---|
| Two fire teams in wedge and the squad leader on a farm track (9 men) | The squad | `squad(s, w, method)`: positions of team A, team B and the leader along the route |
| Teams close up, or trail, or leapfrog | Traveling, traveling overwatch, bounding overwatch | Eased weights `w` of the technique the dial picks |
| Halted team kneeling, with a shaded fan on the ground | Overwatch element and its sector | `q.overwatch`; fan alpha follows the bounding weight |
| Two outposts (MG nest + two holes on a rise), empty until contact | Enemy | `contact`, `e` (outpost nearest ahead of the lead team, at least 25 route units away) |
| Chalk line across the track | Probable line of deployment (ATP 3-21.8, para 6-66) | static, s = 128 |
| Greyed figures lying still | Men down | `downCounts(tech, tc)` |
| Tracers | Enemy fire on the hit team; support fire from the other team | Support starts at `supportSeconds(tech)` after contact |

Scale: soldiers about 1.5x true; route 0.45 field units per route unit; ground rect (u, v) = [-152, 20] x [-64, 62] turned 45 degrees.

## The model (every number notional except the order of Table 3-5)

- Dial: below 1/3 not likely (traveling), below 2/3 possible (traveling overwatch), else expected (bounding overwatch). Cuts are a teaching choice.
- Speed share of traveling: traveling 100%, traveling overwatch 80% (set by hand), bounding 1/(2 + 0.5) = 40% (alternating: one bound of 2L plus a halt for each L gained) or 1/(2 x 1.5) = 33% (successive: two bounds of L plus two halts). Halt = half a bound's move time (assumption).
- Time from contact to first supporting fire: 8, 4, 1 s. Security = 1 - t / 10 s: 20%, 60%, 90%.
- Men down: lead team round(1 + 0.3 t) = 3, 2, 1; enemy max(1, round(5.4 - 0.5 t)) = 1, 3, 5. Both sides always lose someone.
- Geometry (route units): traveling teams 34 apart (leader between), traveling overwatch trail 60 +/- 9, bound 44, lanes +/- 18 while bounding.
- Page speed: 24 route units per second at traveling; contact timeline plays at 2.5x model seconds. Tour: traveling contact (1.8 s), resume to bounding (6.8 s), second contact (11.4 s), loop (14.8 s).
- Readout: "Traveling overwatch . speed 80% . safe 60%" before contact; "Contact . fire in 8 s . 3 vs 1 down" after. Never over 45 characters.

## Checks run (2026-10-14)

- `model.test.mjs`: all passed. `build.mjs`: OK; index.html contains maneuvers.view.v2, maneuvers.css, IBM+Plex, ex-machine, ex-field, fd-reset.
- `lines.mjs` via drive: Machine at load 0, Machine bounding pose 0, Machine in contact 0; Battlefield in contact 0, Battlefield traveling overwatch 0.
- Reset in both views: snapshot after reset equals the load snapshot (squad, dial, controls, battlefield clock, tour, buttons); the view is kept.
- `.ex-field` shown only in Battlefield (`block` / `none`), `.ex-machine` only in Machine (`none` / `block`).
- Console clean; no sideways scroll at 390 px.
- Frame timing (rAF hook, 6 s of tour): Battlefield 1440 px and 390 px 60 fps, JS p50 0.2 ms, p95 0.5 ms, 0 late frames; Machine 60 fps, p50 1.6 ms, p95 3.0 ms, 0 late.
- Reduced motion: the squad stands still at a mid-route pose, no tour, a contact resolves at once; the loop stops.
- NaN guard: `grep -c NaN index.html` is 0 (a plan without a corner radius had produced NaN paths twice).
- No geometry audit: no pipes, cables or lathe parts.
