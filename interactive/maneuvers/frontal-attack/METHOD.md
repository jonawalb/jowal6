# Frontal Attack: method

An isometric bench model of a frontal attack, drawn with the shared Anatomy kit (`../kit/iso-kit.mjs`, MIT).

## Build

```sh
node interactive/maneuvers/frontal-attack/scripts/build.mjs      # writes index.html
node interactive/maneuvers/frontal-attack/scripts/model.test.mjs # checks every model number the page quotes
```

`index.html` is generated. Edit `scripts/page.html` (text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Press head with a ratio knob, cylinder on saddles, ram rod | The attacker; the knob sets its force as a ratio of the defender's strength |
| One broad platen (lit accent), riding on two rails | Attacking over a broad front: one push meets the whole front at once |
| Six blocks, each on a preloaded coil spring with a guide pin | The defender's front; the preload is its holding strength |
| Bolted backstop | What the defender's front rests on |
| Ruler beside the wall, pointer on the nearest block | How far the front has been pushed back |
| Pressure gauge on a line from the cylinder, engraved marks at 1:1 and 4.5:1 | The pressure (force) the attacker spends |

## The model (all notional)

- Ratio r runs 0.5 to 6 (slider step 0.1).
- r ≤ 1: the wall does not move; it is held under load ("Wall holds, pinned").
- 1 < r < 4.5: the whole wall is pushed back linearly (Hooke's law), share = (r − 1) / 3.5 of 12 units of travel: 29% at 2:1, 50% at 2.75:1, 57% at 3:1.
- r ≥ 4.5: "Breach": the third block (index 2, fixed by choice) gives way and travels 14 units further; it re-seats when the ratio drops below 4.5.
- Each block takes a sixth (16.7%) of the press force, because the platen is rigid and broad.
- Gauge needle = r on a 0–6 scale.

None of these thresholds comes from doctrine or data; FM 3-90 gives no ratios for a frontal attack. The page says so in "What is notional" and in the caption.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: passed (every quoted number, plus every readout under 45 characters).
- `scripts/capture.mjs` at 1440 px (light): console clean, no sideways scroll.
- `scripts/capture.mjs --width 390`: console clean, no sideways scroll; hint hidden at phone width by the template CSS.
- `scripts/lines.mjs` at rest: `line ends: 0 of 406`.
- `drive.mjs` poses: ratio 6 (breach) `line ends: 0`; ratio 2.0 `line ends: 0`; ratio 0.5 `line ends: 0` (earlier run).
- 4× close-ups of the spring seats and breached block, the cylinder, gland and rod, the ratio knob and press head; fixed a float on the coil starts (seat plates resized to the coil radius), the gauge marks (rooted on the dial ring), the barrel (square section with real tie rods) and the knob ticks (now hang from an engraved ring).
- Tour contact sheet (9 frames, 1.5 s apart): pinned → pushing back → breach → back to pinned in a 14 s loop.
- No geometry audit: no tube or lathe parts.

## Battlefield view (added 2026-10-13, terrain style)

A Machine | Battlefield toggle (buttons, V key, `localStorage["maneuvers.view"]`) shows the same state on full-bleed terrain, drawn with `../kit/terrain.mjs` after the Fig 1 reference. Code: `scripts/field-scene.mjs` (layout `FG`, `fieldStatic`, `fieldPose`, `fieldMarks`, plus `fieldForce` and `fieldChase` for which elements are committed); `build.mjs` builds the field SVG and inlines `field.mjs`, `terrain.mjs` and `field-scene.mjs` for the page. The machine view and its text are unchanged.

**Scale and reading.** Platoon scale with individual soldiers: a frontal attack is a fire-and-movement problem across one front. A red rifle squad and machine-gun team hold six two-man positions (one a machine-gun nest) behind a wire belt across the whole front, with a hedgerow and a second line of positions behind; a stream and a wood close both flanks, so there is no flank to go round. The lit main effort is the blue assault line (rifle squads in squad line, PL and RTO); blue machine-gun teams fire from behind walls on the line of departure.

| Model state | Battlefield |
|---|---|
| `S.r` (ratio) | Which blue elements are committed (notional): squad 1 always; MG team at 1:1; squad 2 at 1.5:1; MG team 2 at 2.5:1; squad 3 at 3:1. Elements walk in from (and back off) the card's lower edge at 0.35 of the way per second. The enemy's fire rate falls as the ratio rises (suppression share (r − 0.5) / 4). |
| `r ≤ 1` (wall holds, pinned) | The assault line lies prone short of the wire (u = −72 at 0.5:1 to −58 at 1:1) and trades fire; the enemy stays in its forward positions; the red fan is the enemy MG's sector. |
| `S.d / push` (push-back share e) | The enemy line falls back e × 30 units toward its second line; the assault line follows from u = −58 to −6. Moving men stand and stride (stride from distance travelled); halted men kneel and fire. |
| `S.g / gap` (breach b) | The enemy pair in position index 2 (`MODEL.weak`) runs 44 units to the rear; the centre squad morphs from squad line into squad column and goes 36 units through the gap, beside the empty position. |

All sizes, ranges, timings and the commitment thresholds are notional and said so on the page; soldiers are drawn about 1.5× too large so they read. About 46 soldiers at most (11 red, up to 35 blue).

**Battlefield checks (2026-10-13).**
- `model.test.mjs`: passed (model unchanged).
- Line ends, field view (driven with `setView('field')`): ratio 0.8 pinned 0 of 208; 2.6 pushing 0 of 204; 6.0 breach 0 of 208; at 390 px, 3.4 and 0.5: 0 and 0; reduced motion: 0 and 0.
- Line ends, machine view after the V key: breach pose 0 of 406; ratio 2.0 0 of 406. V back to field: view and localStorage both "field".
- Console clean in every run; no sideways scroll at 390 px in either view.
- Frame timing (rAF hook, 6 s of the tour in the field view): desktop 1440 px 60.0 fps, JS p50/p95 0.50/1.20 ms, longest gap 16.8 ms; 390 px, DPR 3, 4× CPU throttle 59.8 fps, JS 1.60/3.40 ms, one 33 ms gap.
- 4× close-ups of the prone pinned squad and of the breach column, the gap position and the alternate positions; the breach column was moved 8 units off the empty position so no one stands on its sandbags.
- thumb.png kept (machine view).

## Casualties (added 2026-10-13, owner's overnight realism rule)

`model.mjs` now holds the Battlefield commitment (`FORCE`, `committed(r)`) and notional casualties (`casualties(r)`): blue = round(men committed × (30% − 4 points per unit of ratio above 1, floored at 10% at 6:1)); red = round(11 × (5% + 25% × push share + 10% at the breach)). Examples: 0.8:1 → 3 vs 1; 2.6:1 → 6 vs 2 (of 24 committed); 3:1 → 7 vs 2; 6:1 → 3 vs 4. Both sides always lose at least one (tested). The readout now ends with "N vs M down" (all readouts under 45 characters, tested): "Pinned · 0.8:1 · 3 vs 1 down", "Pushing back 50% · 2.8:1 · 6 vs 2 down", "Breach · 6.0:1 · gap open · 3 vs 4 down". In the field view the casualties are greyed, still, prone figures (`data-side` "fc"/"hc", page CSS): blue ones where the line was hit (never ahead of it), the first at a collection point behind the line of departure with a kneeling medic; red ones just behind their forward positions. Assault line spacing is uneven (deterministic jitter). Re-checked: model.test passes; line ends 0 in field poses 0.8, 2.6, 6.0 and machine poses 6.0 and 1.8; console clean; 390 px no sideways scroll; timing 60.0 fps, JS 0.6/1.2 ms desktop; 59.8 fps, 1.9/3.7 ms at 390 px with 4× throttle.

Edit to previously checked text: "What is notional" said the model leaves out "the attacker’s own losses"; that phrase is removed now that losses are modeled, and a new paragraph gives the notional loss rules.
