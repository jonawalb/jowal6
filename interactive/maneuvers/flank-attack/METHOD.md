# Fix and Flank: method

An isometric bench model of a flank attack, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT, vendored from github.com/wheresryan22/anatomy).

## Build

```sh
node interactive/maneuvers/flank-attack/scripts/build.mjs      # writes interactive/maneuvers/flank-attack/index.html
node interactive/maneuvers/flank-attack/scripts/model.test.mjs # checks the model numbers quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (moving parts), `scripts/field-scene.mjs` (Battlefield view), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild. The Battlefield view uses the shared `../kit/terrain.mjs` (API and recipe in `../kit/TERRAIN.md`), which builds on helpers in `../kit/field.mjs`.

## The object

| Part | Stands for |
|---|---|
| Fort on a turntable: thick gun wall in front, thin side and rear walls | A defending position sited to cover its front |
| Engraved sector on the turntable (±60°) | The arc the guns mainly cover |
| Ram on the straight rail plus the brake jaw on the turntable rim | The fixing force: holds the defender in place, facing it |
| Lit spearhead on the curved rail | The maneuver force |
| Dial gauge | Share of the defender's fire that can reach the spearhead |

## The Battlefield view (terrain, platoon scale; rebuilt 2026-10-13)

A Machine / Battlefield toggle (buttons under the card, key V; choice kept per viewer in `localStorage["maneuvers.view"]`, default Machine). The Battlefield view is drawn with the shared terrain kit `../kit/terrain.mjs` (API and recipe in `../kit/TERRAIN.md`): full-bleed ground with no board, soldiers in fire teams and squads, tracer fire. It replaced the sand-table counters of `../kit/field.mjs`, which the owner rejected as "the anatomical ones but with soldiers on the anatomy layer". Both views read the same state `S` from the same loop, so readout and gauge are identical.

| On the ground | Stands for | Driven by |
|---|---|---|
| Red rifle squad (SL + 8) and MG team (2) in two-man sandbagged holes and an MG nest on the summit of a six-step contour rise, wire on its front slope | The defending position (the fort) | Fixed: in the front holes (bearings −48° to 48°). Released: the position-grid bearing `ps` chases the 24° step nearest `psi` at 34°/s (`fieldShift`), so the men run round the ring to the holes facing the threat and drop in |
| Red fan from the MG (±28°, 62 units) | The MG's sector (the turntable's frontal arc) | Turns with `ps` |
| Blue rifle squad kneeling behind a stone wall, two MG teams prone in its gaps, SL and PSG, inside a chalk outline | Support by fire: the fixing force (ram and brake) | Fires while the carriage is home (`hold`); as the carriage pulls back the fire lifts and the element ceases fire but holds its position (owner's choice, 2026-10-13) |
| Blue fan on the enemy front | The SBF's target sector | Fades with `hold` |
| Lit blue: two rifle squads (squad columns, fire teams in wedges) plus PL and RTO | The assault element, main effort (the spearhead) | Lead squad at bearing `theta` on a track of radius 90 through the wood, trail squad 30 units behind; from 138° to 160° they turn in to radius 47 and morph to squad line facing the enemy |
| Fire and movement (kit: `trBound`) | The spearhead under fire | Weight `under` = smoothstep(0.34, 0.6, `S.f`): the squads alternate 26-unit bounds (`trBound`); the squad not moving fires (drawn prone; the page text does not claim a posture) |
| Tracers, muzzle flashes, strikes, drifting smoke | Who fires at whom | Deterministic streams (`trShots`) of time: SBF MGs and two riflemen on the enemy's front holes (shifting off the holes nearest the assault as it closes); enemy MG and pairs at friendly troops inside their sectors, at a lower rate while suppressed; assault ARs and TLs when assaulting or overwatching |
| Phase line and assault position (chalk on pegs), flag | Control measures, objective | static |

Sizes, ranges, timings and fire rates are notional. Soldiers are drawn about 1.5× the ground scale so they read at 390 px. Woods, fields, hedges, walls, farm, stream and roads are scenery placed to keep the action clear.

## The model (notional)

- Share of fire that bears at relative bearing θ off the defender's front: `0.15 + 0.85 · ((1 + cos θ) / 2)^3`. 100% at 0°, 68% at 45°, 26% at 90°, 15% at 180°.
- The 15% floor stands for all-round defense and local reserves.
- A defender that is not fixed re-faces toward the spearhead at up to 40° per second, eased at the end.
- When fixed, it is turned back to face the ram (0°) at the same rate; the ram advances only once the front is within 2°, and the brake closes when the pad touches. On release, the fort may turn only once the pad is clear (tip beyond 34 units).

The curve is a teaching shape. It is not drawn from any data set, and the page says so.

## Losses (notional, Battlefield view only; realism pass 2026-10-13)

- `losses(f)` in model.mjs, from the share of fire that bears f: the assault element (20 men) loses `max(1, round(20 · (0.05 + 0.30 f)))`, the enemy (11 men) `max(1, round(11 · (0.08 + 0.40 (1 − f))))`. Into the front (f = 100%) 7 vs 1; at 90° (26%) 3 vs 4; from behind (15%) 2 vs 5.
- Drawn as greyed, still, prone figures: the assault's men down at a collection point behind the SBF position with a kneeling medic, the enemy's on the summit's inner ring. The Battlefield readout ends "N vs M down" (friendly vs enemy). Teaching values, not data.

## Checks run, terrain Battlefield view (2026-10-13, rebuild)

- `lines.mjs` via drive scripts: line ends 0 in the Battlefield view fixed (assault at 118°) and released and settled (enemy turned, assault bounding); 0 in the Machine view in two poses (switched with the V key).
- Console clean; no sideways scroll at 390 px; `model.test.mjs` passes; reduced motion shows a still frame.
- 4× close-ups of the assault squads in the wood, the enemy holes, nest and wire, and the SBF line at the wall.
- Frame timing (rAF hook, 6 s of the tour in the field view): desktop 1440 px 60 fps, JS 0.4 ms median, 1.0 ms p95, no frame over 20 ms; phone profile (390 px, DPR 3, 4× CPU throttle) 60 fps, JS 1.5 ms median, 3.3 ms p95, one late frame in 6 s.
- Page weight: 1.15 MB raw, 234 KB gzipped (was 0.76 MB / 141 KB).

## Checks run, sand-table Battlefield view (2026-10-13, superseded)

- `lines.mjs` via drive scripts: line ends 0 in the Battlefield view at rest (fixed, spearhead at 118°) and in a second pose (released, spearhead at 140°, defender turned and shifted); 0 in the Machine view in both poses.
- Console clean; no sideways scroll at 390 px; `model.test.mjs` passes; V key, buttons, slider, pointer and the stored choice tested; the tour runs in both views (contact sheet).
- 4× close-ups of the three counters, the village and bridge, the farm and hedges, and the scale bar.
- Polish pass: counters 1.5× (stand 40 × 28), blue fixing fan, decorative fields/houses/hedges/copses near the action removed; line ends re-run 0 in both views at rest and in second poses (field: spearhead 118° fixed, 162° released, 26° refixed), console clean, 390 px OK, model.test passes.
- Page weight: about 0.76 MB raw.

## Checks run (2026-10-13)

- Moved 2026-10-13 from the Strait Layers repo to jwalberg.com (jowal6) as a standalone page; light theme only, matching the site.
- `scripts/lines.mjs` (Anatomy line-end check): 0 floating ends, in light and dark, fixed and released.
- Captures at 1440 px and 390 px, light and dark, plus tour moments at 3.0, 6.5, 9.5 and 12.8 s. Console clean, no sideways scroll.
- No geometry audit (`kit/audit.mjs`): the figure has no pipes, cables or turned parts, which is the case where the kit requires it.
