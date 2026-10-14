# Infiltration: method

An isometric bench model of an infiltration, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT).

## Build

```sh
node interactive/maneuvers/infiltration/scripts/build.mjs       # writes interactive/maneuvers/infiltration/index.html
node interactive/maneuvers/infiltration/scripts/model.test.mjs  # checks every model number quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (tray, motor, elements, cable), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Vibratory shaker tray on four rubber isolators, driven by a motor with a turning eccentric weight | The movement of the infiltrating force (the shaking carries the elements forward) |
| Screen of seven bars across the tray, with six gaps of different widths | A defended line and the gaps in it |
| Lit blocks or pellets (1, 4, 9 or 16 of them) | The infiltrating force, split into that many equal elements |
| Selector knob on the control box (four detents) | How many elements the force is split into |
| Collecting tray behind the screen, with a square mark the size of the whole block | The assembly area or objective rally point where elements regroup |
| Dial gauge | Share of the force regrouped behind the screen |

Part count: about 66 solids at rest (base plate and 4 feet, label plate, ruler, 4 three-part isolators, control box with knob, switch and gland, gauge, motor assembly of 8 parts, deck and 4 walls, collecting tray and 3 rims, 7 bars, 7 rail segments, 2 rail brackets) plus 1–16 elements.

## The model (all notional)

- The whole force is a 22-unit square block. Split into n = 4, 9 or 16, each element is 22/√n − 1.2 units wide: 9.8, 6.1 and 4.3. (The 1.2 is the space between elements.)
- The gaps are 6, 8, 4.5, 12, 5.6 and 7.6 units wide (far wall to near wall). An element fits a gap when its width + 1 ≤ the gap.
- So the block fits 0 gaps, the 4-split fits 1 (the 12-unit gap), the 9-split fits 3 and the 16-split fits 5. The 4.5-unit gap stops every element.
- Elements are assigned to the gaps they fit in order across the tray, pass one at a time per gap (0.5 s apart), and take the nearest free place on the regroup mark, far column first.
- Timings: 1.0 s to reach the gap, 0.45 s to pass, 0.9 s to regroup, 0.1 s stagger between lanes. Shake stroke ±0.7 units at 2.2 Hz while the elements move.
- Readout: elements, gaps that fit, and elements regrouped so far; the gauge shows regrouped ÷ elements.

None of these numbers is data. FM 3-90 (2023, para 2-86) supports only the direction of the effect (smaller elements can get through smaller gaps); the page says the layout is a teaching device and that the model leaves out the costs the manual lists (time, linkup points, control, detectability).

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed (widths 22/9.8/6.1/4.3; gaps that fit 0/1/3/5; every fitting element regroups, the block regroups none; one gap never passes two elements closer than 0.5 s; distinct regroup places; the block stops at the bars; readouts under 45 characters).
- `scripts/capture.mjs` at 1440 px and 390 px (light): console clean, no sideways scroll.
- `scripts/lines.mjs`: `line ends: 0` during the tour; `drive.mjs` to a second resting pose (16 elements, 16/16 regrouped) then `["lines"]`: 0. A floating knob-pointer tail found in that pose was fixed with a hub dot.
- 4× close-ups: bar screen with elements passing behind the bars, the block stopped against the bars, the motor and eccentric weight, the collecting tray with the regrouped 4×4 formation, the control box (detents turned to face the camera after the first close-up showed them hidden behind the knob), and the gauge.
- Keyboard (arrow keys, including rapid presses), slider, click and the Run again button; reduced motion shows the finished state with no shaking. The idle tour (1 → 4 → 16 elements) takes about 14 s and stops when the figure is offscreen.
- No geometry audit (`kit/audit.mjs`): the figure has no pipes, tubes or lathe parts, which is the case the kit requires it for.

## Battlefield view (added 2026-10-13, new terrain style)

**Scale and reading.** Small-unit, individual soldiers at night (FM 3-90 para 2-96 lists limited visibility among the infiltration plan's considerations). The machine's tray maps onto the ground by a fixed scale in a "line frame" (u = tray x × 1.1, v = tray y × 2.6), turned −15° on the ground so the movement runs left to right. The seven bars become seven enemy two-man outposts with their observed sectors (red fans, r 5–30, ±22°); the six gaps become the ground between them; the collecting tray becomes the objective rally point (chalk outline on pegs, para 2-103). The same `plan(n)` and `positionAt(e, t)` drive the soldiers; the battlefield runs the machine's clock at 0.4× (`FG.SLOW`) so the men walk. The readout is unchanged.

| Machine | Battlefield |
|---|---|
| 1 block | one group of 36 (four squad columns abreast) — fits no gap, is spotted short of the line at 72% of its approach, goes prone and draws tracer fire from the outposts in front of it |
| 4 elements | four squads of 9 (squad column, teams in wedges; ATP 3-21.8 paras 1-9, 3-53) |
| 9 elements | nine fire teams of 4 in wedges (paras 1-11, 3-46) |
| 16 elements | twelve pairs and four threes |
| Element passing a gap | the element closes into file (paras 3-46, 3-53) and passes; one at a time per gap is the model's notional rule |
| Regroup mark | kneeling in a huddle at the element's regroup place inside the ORP outline |
| Gauge | none on the ground; the card's readout carries it |

Notional: force size (36), unit splits for 16, outposts and sector geometry, the 1.1/2.6 ground scale, the 0.4× clock, the spotting point and fire rates; figures drawn about 1.5× too large. Not drawn: the security force (para 2-85), linkup points, time and control costs.

Files: `scripts/field-scene.mjs` (layout, `fieldStatic`, `fieldPose`, `fieldMarks`), wired in `scripts/build.mjs` (second SVG, legend, toggle, V key, `localStorage["maneuvers.view"]`, `drawField`), CSS and the paragraph in `scripts/page.html` (night ground tints override the kit's light tokens on `.inf-field`).

**Covered routes (added at the owner's request).** A hedgerow runs either side of each lane the elements use where it crosses the line (u −34 to +22, cut wherever any route crosses it), and a stream bed runs through the widest (12-unit) gap. The big group crosses open ground and is the one spotted. Cover is notional.

**Checks (2026-10-13).** `node scripts/model.test.mjs`: pass. `lines.mjs` via drive scripts: field view n = 1 (spotted, under fire) 0 floating ends; field view n = 16 finished (all regrouped) 0; field view n = 4 mid-pass 0; machine view n = 1 and n = 16 finished 0. Console clean in every run. 390 px: no sideways scroll (scrollWidth 390), field view crops the sides as designed. Reduced motion: field view shows the finished state as a still frame; the view choice persists across reloads. Frame timing (field view, 16-split run, 6 s, rAF wrapper; rerun after the covered routes): desktop 60 fps, JS p50 0.4 ms / p95 0.9 ms; 390 px with 4× CPU throttle 59 fps, JS p50 1.2 ms / p95 2.2–2.5 ms, 2–3 frames over 25 ms (the field fades men in and out in one step, not per frame, to avoid full repaints). Static field: 50 soldiers (36 friendly, 14 enemy), page 968 KB raw. Thumbnail unchanged (machine).

## Losses (notional, Battlefield view only; realism pass 2026-10-13)

- `losses(plan, t)` in model.mjs, growing over the run (none at the start): the single group, spotted and stopped, loses up to 5 and the enemy up to 2, both rising over the last 30% of its approach; a split force loses `round(share regrouped · element width / 4.5)` (2 for squads, 1 for teams or pairs) and the enemy `round(share regrouped)` (one sentry, silenced once half are through). End of run: 1 group 5 vs 2; 4 squads 2 vs 1; 9 teams 1 vs 1; 16 pairs 1 vs 1.
- Drawn as greyed, still figures: the group's men down where it went to ground with the man beside the first kneeling; a split force's carried to the rally point with a man of the largest regrouped element kneeling by them; the enemy's beside outpost 3, whose two men are drawn per frame for this. The Battlefield readout reads "N elements · c/N rallied · N vs M down" (or "1 element · stopped at line · …") to stay under 45 characters. Teaching values, not data.
