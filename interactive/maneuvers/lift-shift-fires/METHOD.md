# Lifting and Shifting Fires: method

Figure #36. An isometric bench model and a platoon battlefield, both driven by one run clock and one model (`scripts/model.mjs`), drawn with the shared Anatomy kit (`../kit/iso-kit.mjs`, MIT) and the terrain kit (`../kit/terrain.mjs`).

## Build

```sh
node interactive/maneuvers/lift-shift-fires/scripts/build.mjs       # writes index.html
node interactive/maneuvers/lift-shift-fires/scripts/model.test.mjs  # checks every number the page quotes
```

`index.html` is generated. Edit `scripts/page.html` (text and chrome), `scripts/model.mjs` (numbers), `scripts/scene.mjs` (machine moving parts), `scripts/field-scene.mjs` (Battlefield view), `scripts/live.js` (page runtime) or `scripts/build.mjs` (static machine parts, assembly), then rebuild. No tube, lathe or audit parts, so no `--audit`.

## The object (Machine view)

| Part | Stands for |
|---|---|
| Hinged pop-up target on a block (plate folds down toward the carriage; barrel comes out as it stands) | The enemy squad's position: down = suppressed, up = firing |
| Hopper on a cantilever dropping shot on the target | Supporting fires (mortars and support-by-fire machine guns) |
| Lit carriage (spearhead) on the rail; ruler 150 m to 0 | The assault element and its distance to the objective |
| Trip dog clamped to the cam bar, with a fold-down flag the carriage's striker trips | The final coordination line: where the fires lift or shift (the slider) |
| Cam disc on the post (turns a quarter when the trip fires) | The signal to lift or shift |
| Gate across the hopper throat / chute that swings toward the rear target | Lift (fires stop) / shift (fires move to depth) |
| Rear pop-up target | Enemy depth team: pinned when shifted onto, rises and joins when fires only lift |
| Stop on the ruler at 50 m; carriage brake shoe | The figure's minimum safe line (notional distance); the assault halting for a cease fire |
| Big dial / small dial | Share of enemy fire on the assault / risk index of the plan |

About 82 solids and 690 paths at rest.

## The Battlefield view (platoon scale, terrain kit)

| On the ground | Stands for | Driven by |
|---|---|---|
| Red rifle squad: 8 men in four two-man holes on a low rise facing the assault, SL behind | The pop-up target | Sunk 1.25 units (heads down) while fires fall; after the lift, men come back up in a fixed order, count = round(8 × `rec`) |
| Red depth team: 4 men in two holes on a rise behind | Rear target | Shift: heads down under the shifted mortars. Lift: after 0.8 s they run to kneeling spots at the rear of the position (`rein`) |
| Blue support by fire behind a stone wall on the far flank: 2 MG teams prone, a rifle squad kneeling, WSL | Part of the hopper | Gun rates follow ATP 3-21.8 C-121 in order: rapid (first 40 m), sustained, increased (last 40 m before the lift), walking fire onto the rear of the objective until arrival, then shift onto the depth holes (Shift) or stop and hold position (Lift). Cease during a halt at the MSL |
| Mortar bursts (flash, dust, drifting smoke), from off the map | Part of the hopper | Rounds fired before the lift fall on the holes; after it on the depth holes (Shift) or none (Lift) |
| Lit blue assault: two rifle squads in squad line, PL and RTO behind | The carriage | Front line at x = −9 − 0.75 × d; stand and stride while moving, prone while halted, kneel on arrival; ARs and TLs fire inside 40 m and on the objective |
| Chalk line on pegs (moves with the slider) | Final coordination line = trip dog | `L` |
| Row of stakes at 50 m | Minimum safe line (notional) = ruler stop | static |
| Greyed prone figures | Men down (notional) | Friendly: the k-th falls at progress √((k+1)/B), lies where he fell. Enemy: beside his hole |

Ground: 0.75 world units per metre; soldiers drawn about 1.5× scale. 46 soldiers, about 170 static items. View: azimuth 55°, elevation 42°, 640 × 420 viewBox, `slice`.

## The model (all notional)

- Assault starts 160 m out and moves 32 m per figure second (time compressed).
- Fires lift when the assault reaches `L` (slider 0–150 m, step 5). If `L` < 50 m (the figure's minimum safe line), they lift at 50 m instead, the assault halts 2.5 s (cease fire), then continues.
- Enemy share of fire: 10% while suppressed; after the lift 10% + 90% × (1 − e^(−t/4)), t in figure seconds since the lift; held at arrival. An unpinned depth team (Lift mode) adds up to 20 points, smoothstep from 0.8 s to 2.4 s after the lift.
- Risk index: 0 if `L` ≥ 50, else (50 − L)/50.
- Losses: assault (20) loses max(1, round(20 × (0.04 + 0.3 × eA))); enemy squad (9) max(1, round(9 × (0.15 + 0.5 × (1 − eA)))). Shown growing during the run, final at arrival.
- Shift results (eA, risk, losses): 140 m → 70%, 0%, 5 vs 3; 100 m → 59%; 50 m → 39%, 0%, 3 vs 4; 10 m → 67%, 80%, 5 vs 3; 0 m → 67%, 100%. Lifting at the line minimizes eA in this model; Shift always ≤ Lift.
- Tour: runs at 140 m, 50 m and 10 m (Shift), about 23 s per cycle; any input stops it, it resumes after 9 s idle.

## Checks run (2026-10-14)

- `node scripts/build.mjs`: OK; index.html contains `maneuvers.view.v2`, `maneuvers.css`, `IBM+Plex`, `ex-machine`, `ex-field`, `fd-reset`.
- `node scripts/model.test.mjs`: all passed (every quoted number, monotonic/optimum checks, readout length < 45 in every phase).
- `lines.mjs` via drive scripts: `line ends: 0` in Battlefield (run at 2.2 s; second pose L=10 Lift, halted) and Machine (L=140 Shift at 4 s; second pose L=10 Lift, halted), switched with the V key. Re-run after the last edit: 0 in both views.
- Console clean in every drive session; 390 px: no sideways scroll (capture.mjs and scrollWidth 390 = innerWidth 390).
- Reset: after changing lift, mode and run time, `reset()` returns the exact load snapshot (run, controls, machine parts, tour, mode and view buttons) in both views; the Reset button restores L, mode, tour and restarts the run; the view is kept.
- `.ex-field` displayed only in Battlefield view and `.ex-machine` only in Machine view (computed style in headless Chrome).
- Frame timing (rAF hook, 6 s of the tour): Battlefield 1440 px 60 fps, JS 0.40 ms p50, 1.1 ms p95, 0 late frames; 390 px DPR 3: 60 fps, 0.40/1.2 ms, 0 late. Machine 1440 px: 59 fps, 2.8/5.2 ms, 4 frames over 25 ms in 6 s (host shared with two other builders). No CPU-throttle profile was run.
- 4× close-ups: target hinge and plate mid-rise, carriage and trip dog, dials, enemy holes with mortar smoke, the SBF line.
- thumb.png: Battlefield view, L = 50 m, 2.15 s into the run (assault approaching the FCL, SBF firing, mortar smoke on the position), cropped 16:10 without corner labels, 800 × 500.
