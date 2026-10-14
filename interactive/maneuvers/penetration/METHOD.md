# Penetration and Exploitation: method

An isometric bench model of a penetration, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT). Figure size: Figure, about 80 solids.

## Build

```sh
node interactive/maneuvers/penetration/scripts/build.mjs      # writes interactive/maneuvers/penetration/index.html
node interactive/maneuvers/penetration/scripts/model.test.mjs # checks every number quoted on the page and below
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (moving parts, rebuilt per frame), `scripts/model.mjs` (numbers and timeline) or `scripts/build.mjs` (static parts, live code), then rebuild. `scene.mjs` carries a small `prismY` helper (a convex prism in the x-z plane, extruded along y, shaded with the kit's lathe tone rules) for the swinging hammer arm, head, hub and axle; it uses only kit functions passed in as `K`.

## The object

| Part | Stands for |
|---|---|
| Row of six blocks across the bench, between guide lips | The defended line; its 20 mm depth along the attack axis is the depth of the defense |
| End abutments, coil springs and pressure pads | The defender pushing to close any gap |
| Lit wedge driven into the boundary between the middle blocks | The breach on a narrow front |
| Pendulum drop hammer: braced frame on foot pads, pivot pin with collars, clevis, tapered arm, shaped head with striking face and bolts | The combat power massed at the point of penetration; it swings clear when the breach is done |
| Catch post with latch arm, sear block and trip lever | Holds the hammer parked at the top of its swing |
| Dial gauge on a pedestal | Reads the gap at the line, 0 to 30 mm, from the same eased gap the readout shows |
| Second ruler along the attack axis; rubber buffers on both stops; spare-wedge tray | Bench furniture: distance run, carriage end stops, spares |
| Spreader carriage with two side rollers | The force that follows through the breach and widens it, then runs on to the objective |
| Two shoulder pins rising from flush bushings | Holding the sides (flanks) of the breach open |
| Ruler in front of the line | Reads the gap in millimetres |
| Stop behind the line | The objective beyond the penetration |

## The model (all notional bench geometry)

One progress value p (0..1) drives everything (`stateAt(p, hold)`):

- Breach, p 0–0.42: four hammer blows. Each blow lifts the head to -52°, lets it fall (accelerating) onto the wedge back, and drives the wedge one quarter of 22 mm. The wedge nose goes from the line's front face to 2 mm past its 20 mm back face, so "through" reads 0, 28, 55, 83, 100%.
- The wedge is 10 mm thick at its back over 36 mm. The gap it forces is its thickness at the widest point inside the line: about 6 mm (6.1) after the last blow.
- Park, p 0.42–0.50: the hammer swings up to -90° (horizontal, behind the pivot), clear of the carriage.
- Widen, p 0.50–0.80: the carriage runs from its rear stop; its nose plate pushes the wedge ahead of it. Its rollers (radius 3 mm, centres 12 mm off the axis) force the gap to 30 mm, ramping in over the last 5 mm before the front face. While its 18 mm body is still inside the line, the body alone keeps the gap at least 18 mm.
- Shoulder pins (radius 2.5 mm at ±12.5 mm, so they hold exactly 30 mm) rise once the rollers are 3 mm past them, if "hold" is on.
- Exploit, p 0.80–1.00: the carriage runs on to the stop. With the pins up, the gap stays at 30 mm. With them down, the springs close it to 0 once the carriage has left the line ("gap shut · cut off").
- Live code eases progress (0.6 s), pin height (0.18 s) and the gap's closing (0.16 s); the pins drop before the gap may close. Opening is never eased below what the model forces.

Example readouts (asserted in `model.test.mjs`): "Breach · blow 2 of 4 · 55% through", "Breach complete · gap 6 mm", "Widen · gap 30 mm", "Exploit · gap held at 30 mm", "Exploit · gap shut · cut off". All are under 45 characters at every p.

Nothing here is data about real operations. The spring closure and cut-off are the bench model's picture, not a doctrinal claim; the page says so.

## Checks run (2026-10-13)

- Polish pass: tightened the plate (246 × 188) and refit the projection; rebuilt the hammer as a real pendulum hammer (above); added the gap gauge, axis ruler, catch, buffers and wedge tray; carriage rest and end positions shortened (nose −90 to 56 mm; not quoted on the page). Re-ran every check below after it.

- `node scripts/model.test.mjs`: all passed.
- `scripts/lines.mjs` / drive `["lines"]` (Anatomy line-end check): `line ends: 0` at rest (p = 0), in the widen pose (p = 0.75), with the gap held (p = 1), and cut off (p = 1, pins down). Floating ends found and fixed on the way: the wedge's lit centre line, and the ruler's zero mark once the wedge no longer covered it.
- `capture.mjs` at 1440 px and 390 px, light theme: console clean, no sideways scroll at 390 px.
- 4× close-ups of the wedge in the boundary, the hammer pivot and axle in its bearing blocks, the rollers inside the gap, and the end spring against its abutment, and (polish pass) the clevis and pin, the parked head under the catch, and the gauge. Fixes made after them: the striking face is drawn behind the head when it faces away, both rollers sit under the crosshead, the abutments moved out to keep the springs visible at full gap.
- No geometry audit (`kit/audit.mjs`): the figure has no tube or lathe parts.

## Battlefield view (added 2026-10-13, terrain style)

A Machine | Battlefield toggle (buttons, V key, `localStorage["maneuvers.view"]`) shows the same state on full-bleed isometric terrain, drawn with `../kit/terrain.mjs` in `scripts/field-scene.mjs`. The machine, its model and every fact-checked line of text are unchanged; the readout is the same in both views.

**Scale and reading.** Company. ATP 3-21.8 para 4-22 says penetrations are normally conducted at battalion and above, so the view is one rifle company's part at the point of a larger penetration (a question for the owner). Two enemy platoon positions on two low hills, a saddle between them as the boundary, wire in front, MG sectors crossing in front of the boundary. Each friendly platoon is three four-figure groups (one per squad); the lit platoon adds its leader and radio operator. 58 soldiers in all (38 friendly, 20 enemy).

| Machine | Battlefield |
|---|---|
| Wedge, four hammer blows | Breach platoon, a column of squads, one rush per blow (prone and firing between rushes), then it secures the far side |
| Rollers forcing the gap | Follow-on platoon reaching the line; the enemy pairs at the boundary are driven back to alternate positions as the gap widens |
| Shoulder pins | The follow-on platoon's squads turned out on both shoulders (blue fans) |
| Carriage running to the stop | The lit platoon (main effort) through the gap to the objective flag, ending in a line |
| Pins dropped, springs shut the gap | The follow-on squads go on behind the lit platoon; the enemy walks back into its holes and the boundary pairs turn to fire to their rear |

**Mapping (notional).** Layout coordinates (u along the axis, v across it), origin at the boundary. Ground half-gap = 4 + 1 unit per mm of the machine's gap (34 units at 30 mm); a pair leaves its hole as the half-gap passes it (holes at 12, 26, 40, 54; the first two empty at full gap). The follow-on lead follows the roller position (1.4 units per mm inside the 20 mm line); the lit platoon follows the carriage nose. The page eases the ground gap (0.5 s) and the hold (0.6 s) so troops walk; feet move only while S.p changes. Projection: azimuth 55°, elevation 42°, scale 2.3, viewBox 640 x 420 with `slice`.

**Checks run (2026-10-13).** `model.test.mjs` passes. Line ends 0 in the field view at p = 1 held and p = 1 cut off, and at p = 0.75; 0 in the machine view at p = 0.75 and p = 0.2 (switched with the V key in a drive script). Console clean at 1440 and 390 px; no sideways scroll at 390 px. Frame timing over 6 s of the tour in the field view: desktop 60 fps, JS p50 1.1 ms / p95 2.9 ms; 390 px with 4x CPU throttle 60 fps, JS p50 2.5 ms / p95 6.2 ms, no frame over 20 ms. 4x close-ups of the shoulder squads, the vacated holes and the cut-off group. The machine thumbnail is kept.

## Losses (notional, Battlefield view only; realism pass 2026-10-13)

- `losses(state, gap)` in model.mjs: blue `1 + round(2 · through) + round(widen share) + (2 if cut off)`; red `1 + round(through) + round(2 · min(1, gap / 30 mm))`. Start 1 vs 1; breach complete 3 vs 2; exploit with the gap held 4 vs 4; shoulders let go and cut off 6 vs 2.
- Drawn as greyed, still, prone figures taken out of their squads: the first blue one at a collection point behind the line of departure with a kneeling medic, then along the breach lane, at the seam and (cut off) at the objective; the red ones behind the boundary holes. The Battlefield readout ends "N vs M down" (friendly vs enemy) and drops the breach's "N% through" there to stay under 45 characters. Teaching values, not data.
