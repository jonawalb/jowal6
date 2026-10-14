# Suppress, Neutralize, Destroy: method

Figure 37. An isometric bench press (Machine) and a platoon fight under mortar fire (Battlefield), both driven by one mission state from `scripts/model.mjs`. Drawn with the shared Anatomy kit (`../kit/iso-kit.mjs`) and the terrain kit (`../kit/terrain.mjs`), MIT. Size: Figure.

## Build

```sh
node interactive/maneuvers/fire-effects/scripts/build.mjs       # writes index.html
node interactive/maneuvers/fire-effects/scripts/model.test.mjs  # asserts every model number the page quotes
```

`index.html` is generated. Edit `scripts/page.html` (text, chrome, CSS), `scripts/scene.mjs` (machine), `scripts/field-scene.mjs` (battlefield), `scripts/model.mjs` (numbers), `scripts/live.js` (page runtime) or `scripts/build.mjs` (plate, cards, wiring). `window.__fireEffects` exposes `stop()`, `reset()`, `setLevel()`, `toggleFire()`, `setView()`, `advance(min)`, `snapshot()` and `initial` (the load-state snapshot).

## The object

| Part | Stands for |
|---|---|
| Lit block on a spring between four guide posts | The target (the enemy platoon): it pops back up when nothing holds it |
| Press: columns, crown, lead screw, handwheel (turns while firing), ram and pad | Fire on the target; the ram holds the block down while rounds land |
| Rack with three detent teeth (suppress, neutralize, destroy) and a stop pin | The effect asked for; the ram goes deeper as the share hit reaches 3%, 10%, 30% |
| Pawl on the ram that locks into the rack | Neutralization (locked for tN, then released) and destruction (stays locked) |
| Crack down the block's front face | Destroyed |
| Two dials | Rounds fired (0–70) and minutes since the first round (0–8) |

About 60 parts. One lit accent: the block.

## The battlefield (platoon scale)

| On the ground | Stands for | Driven by |
|---|---|---|
| Red rifle platoon, 26 drawn, in two-man holes and an MG nest on a rise, wire on the front slope | The target | Heads down (lowered 1.6 units into the holes) while `E < 0.5`; men down = round(26 × share hit), greyed behind their holes |
| Red MG sector fan | The enemy's fire on the open ground | Fades with `E` |
| Lit blue platoon (two rifle squads in squad column, teams in wedges, PL and RTO) | The force the fires protect | Moves along the route as `t / window`; bounds (`trBound`) when `E` is high, the overwatching squad prone and firing |
| FO and RTO kneeling on a knoll | Company fire support team | static |
| Bursts (flash, dust, smoke; radial gradients) | Mortar rounds from the company section off the map | ~3 bursts/s while firing for effect, 1.2/s sustaining; a sample, not one per round |
| Casualty collection point with a medic at the wood edge | Friendly men down | `losses().blue` |
| Chalk outline on pegs at the farm | The platoon's next position | static |

Frame: Fig 1's ground rect drawn 10% in toward (40, 40). Soldiers about 1.5× scale.

## The model (all notional except the three thresholds)

- Thresholds (FM 3-09, 2024, para 3-66): S 3%, N 10%, D 30% casualties or materiel damage.
- Share hit after n rounds fired for effect: 1 − e^(−n/170). Rounds needed: S 6, N 18, D 61 (0.6, 1.8, 6.1 min at 10 rounds/min).
- Suppress: after 6 rounds, 4 rounds/min sustain it while firing continues; sustaining rounds add no casualties in this model. N and D end the mission themselves at their round count.
- Enemy fire share E: 1 before the first round; 0.15 while rounds land; after the last round S → 1 − share hit; N → 0 for 2 min then 1 − share hit; D → 0. Eased with τ = 0.2 min.
- Mission window 8 min (the crossing); the clock stops there and any fire still going ceases.
- Friendly men down = round(0.6 × ∫E dt over the window). Outcomes (tested): S ceased at 2 min, 11 rds, 4 vs 1; S held to 8 min, 35 rds, 1 vs 1; N, 18 rds, 2 vs 3; D, 61 rds, 1 vs 8.
- Page speed: 2 model minutes per second; tour S (cease at 2 min) → N → D, about 15 s.

## Checks run (2026-10-14)

- `model.test.mjs`: all passed. `build.mjs`: OK; index.html contains maneuvers.view.v2, maneuvers.css, IBM+Plex, ex-machine, ex-field, fd-reset.
- `lines.mjs` via drive: Battlefield at load 0, Battlefield after a destroy mission 0; Machine at load 0, Machine destroyed (pawl locked, block cracked) 0, Machine neutralized and locked 0. (One floating end at the spring's foot fixed with terminal dots.)
- Reset in both views: snapshot after reset equals the load snapshot (mission, press, battlefield clock and bursts, tour, buttons).
- `.ex-field` shown only in Battlefield (`block`/`none`), `.ex-machine` only in Machine (`none`/`block`).
- Console clean; no sideways scroll at 390 px.
- Frame timing (rAF hook, 6 s of tour, Battlefield): 1440 px 60 fps, JS p50 0.4 ms, p95 0.7 ms, 0 late frames; 390 px DPR 3, 60 fps, p50 0.5 ms, p95 1.1 ms, 0 late (drive.mjs has no CPU-throttle option, so no 4× throttle run).
- 4× close-ups: block, crack, rack, pawl and stop pin; enemy holes under fire, heads down, casualties; platoon.
- No geometry audit: no pipes, cables or lathe parts.
- Page weight about 0.85 MB raw.
