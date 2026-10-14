# Final Protective Fires: method

Figure 38 of the Maneuvers section. It is an isometric bench model plus a platoon-scale Battlefield view, drawn with the shared Anatomy kit (`../kit/iso-kit.mjs`, MIT) and the terrain kit (`../kit/terrain.mjs`, recipe in `../kit/TERRAIN.md`). Built 2026-10-14 to the v2 builder brief.

## Build

```sh
node interactive/maneuvers/final-protective-fires/scripts/build.mjs      # writes index.html
node interactive/maneuvers/final-protective-fires/scripts/model.test.mjs # checks every model number the page quotes
```

`index.html` is generated, so edit the scripts instead: `page.html` (text and chrome), `model.mjs` (the run), `scene.mjs` (machine parts above the plate, rebuilt per frame with a memo cache for parts that change only with a few values), `field-scene.mjs` (Battlefield view) or `build.mjs` (plate, rail, live code). The page follows the v2 conventions: IBM Plex fonts plus `/interactive/maneuvers/maneuvers.css`; Battlefield is the default view (`localStorage["maneuvers.view.v2"]`, where a stored "machine" overrides it); the daylight terrain palette; two "How to read it" blocks (`.ex-machine`, `.ex-field`); and a Reset button. `window.__fpf` exposes `stop`, `reset`, `seek(trigger, t)`, `pause`, `setView`, `snapshot` and `load` for testing.

## The object (Machine view)

| Part | Stands for |
|---|---|
| Carriage on the rail, ram nose forward | The enemy assault |
| Ruler between the rails, 0 at the engraved line | Distance in front of the FPL (notional metres, 0.72 bench units per metre) |
| Parapet with sandbag courses at the near end | The defended position |
| Wire belt: pickets, two concertina coils, a gate over the rail that the carriage pushes open | The protective wire (its outer edge is the FPL) |
| Gantry with a lit header bar and ten drop pins over an inlaid 2:1 rectangle and strike plate | The mortars' FPF and its beaten zone |
| Two grazing bars on posts at the ends of the engraved FPL groove; in the sector at rest (12° out), laid along the FPL when called | The machine guns: the FPL is one limit of each gun's sector, and initiating the FPF shifts them onto it |
| Trip tab clamped on the ruler, pawl on the right gantry post | The trigger: the FPF is called when the assault reaches the set distance |
| Magazine of discs (3 rounds each) | The rounds held for the FPF |
| Dial gauge, engraved CHECK | How far the FPF has checked the assault (it breaks at full scale) |

Parts: about 135 solids (22 sleepers, 12 pickets and 10 pins among them), about 780 paths in the live layer. No pipes, cables or turned parts, so the geometry audit (`kit/audit.mjs`) does not apply.

## The Battlefield view (platoon scale)

Scale: a platoon defense with individual soldiers (TERRAIN.md: "fire and movement, fixing … a squad or platoon battle drill"). It is seen from behind at azimuth 80° and elevation 42°, and the enemy attacks from the far treeline toward the viewer. One world unit is about a metre (notional), and soldiers are drawn about 1.5× scale.

| On the ground | Stands for | Driven by |
|---|---|---|
| 16 blue riflemen in 8 two-man holes on the line, the PL and RTO behind, a medic at a casualty collection point | Two rifle squads of the defending platoon | Fire at the assault once it is inside 150 m |
| Two blue MG teams in nests at the ends of the wire, each with a blue sector fan whose inner edge is its FPL (chalk on pegs); the two FPLs cross in front of the wire | The weapons squad's machine guns (grazing bars) | They face and fire into the sector until the FPF is called, then turn onto the FPL and fire grazing tracer along it (target points 0.7 above the ground) while the rounds last |
| Concertina wire along the front | The wire belt | static |
| Chalk box 60 × 30 just in front of the wire | The FPF (portcullis); Table B-1 size for two 60-mm mortars | Mortar bursts (dark core, dust, drifting smoke) scattered over the box at the model's rate while rounds remain |
| Red assault: two rifle squads in squad line plus a leader; men slightly ragged | The carriage | Advance with `x`; prone when checked; turn and run back when the assault breaks; among the holes when it comes through |
| Red support team (MG and 3 riflemen) prone behind a wall on the right | Enemy support by fire | Fire on the holes while the assault is more than 40 m out |
| Greyed, still figures | Men down (notional) | Enemy: left where each fell (`downE` positions); friendly: carried to the CCP |

## The model (notional; `model.mjs`)

- The assault starts 150 m out and advances at 30 m per figure-second (time compressed). It keeps 25% of its speed in the wire, which runs from 0 to −8 m. The forward holes are at −34 m.
- The FPF is called when the assault reaches the trigger distance (slider 0 to 150 m, default 10), or by hand. It then fires 30 rounds at 7.5 per second (4 s), "at the maximum rate until … ammunition is depleted" (ATP 3-21.8, para B-18). The rounds and the rate are notional.
- An assault caught in the beaten zone (2 to 32 m out: 30 m deep, as in Table B-1) or in the wire while rounds fall keeps 8% of its speed and accumulates "check" at 0.45/s; at 1 (about 2.2 s) it breaks and falls back at 20 m/s. If it reaches the holes, it is through.
- Losses (notional rates, men per figure-second): enemy 2.2 under the FPF, 0.16 to direct fire inside 150 m, 0.45 in the wire, 0.22 while breaking, 0.4 in the position; friendly 0.05 while the assault is inside 150 m and 2 once it is through. They are capped at 15 enemy and 10 friendly, the readout shows at least 1 friendly down, and each enemy casualty stays where he fell.
- Results (tested): called anywhere from 0 to 80 m out, the assault breaks. At the default (10 m) the run ends 1 friendly vs 6 enemy down. Called 90 m or more out, the rounds are spent before arrival and it comes through (150 m: 5 vs 2). Never called, it comes through. Doctrine gives no such window; it is the model's, and the page says so.
- Readouts: Machine "Checked · 7 m out · FPF 20 rds"; Battlefield "Checked · FPF 20 rds · 1 vs 3 down". Both stay under 45 characters (tested on every frame of eight runs).

## Checks run (2026-10-14)

- `node scripts/build.mjs` OK; index.html contains `maneuvers.view.v2`, `maneuvers.css`, `IBM+Plex`, `ex-machine`, `ex-field`, `fd-reset`. `node scripts/model.test.mjs`: all passed.
- `lines.mjs` via drive scripts: line ends 0 in the Battlefield view checked (trigger 10, t 6.2 s), advancing (t 1.6 s) and through (trigger 150, t 9.5 s); 0 in the Machine view advancing (t 1 s), checked (t 6 s) and called too early (trigger 150, t 3.5 s), switched with the V key.
- Console clean. At 390 px there is no sideways scroll; the phone crops the field's sides as designed. Reduced motion shows a still frame at the checked moment.
- Reset: from changed trigger, called FPF and seeked runs, `reset()` returns `snapshot()` identical to the load-state snapshot in both views, with the view kept and aria-pressed matching. `.ex-field` displays only in Battlefield view and `.ex-machine` only in Machine view (computed style, headless Chrome).
- Frame timing (rAF hook, 1440 px): Battlefield 60 fps, JS 0.4 ms p50 / 0.9 ms p95, one late frame in 6 s; Machine 60 fps, JS 3.1 / 4.3 ms, none late. No CPU-throttled phone run (drive.mjs has no throttle option).
- Close-ups at 3–4×: gantry, pins and header (raised and dropped, pins on the carriage), the MG nest and FPL pegs, the assault prone in the bursts.
- thumb.png: Battlefield view at the checked moment, 800 × 500, cropped 16:10 clear of the corner labels.
