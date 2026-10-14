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
| Light beam across the tray in front of the screen (emitter on the far wall, receiver on the near wall, 5.5 units above the floor) | The enemy's chance of detecting the force: an element taller than the beam breaks it |
| Red lamp on the receiver | The force has been detected (latched once the beam is broken) |
| Turret (tower, gun, hatch) on a turntable, on a carriage in a flush slot track beside the regroup mark, gun facing the screen | An enemy position behind the line, facing the front |
| Turntable turning and brake shoe dropping (only once the lamp is lit) | The enemy alerted: it turns to face the threat and braces |
| The regrouped formation sliding across the tray and striking the carriage from behind; how far the carriage is pushed | The follow-on attack from the rear, and its result |

Part count (before the 2026-10-14 rework): about 66 solids at rest (base plate and 4 feet, label plate, ruler, 4 three-part isolators, control box with knob, switch and gland, gauge, motor assembly of 8 parts, deck and 4 walls, collecting tray and 3 rims, 7 bars, 7 rail segments, 2 rail brackets) plus 1–16 elements.

## The model (all notional)

- The whole force is a 22-unit square block. Split into n = 4, 9 or 16, each element is 22/√n − 1.2 units wide: 9.8, 6.1 and 4.3. (The 1.2 is the space between elements.)
- The gaps are 6, 8, 4.5, 12, 5.6 and 7.6 units wide (far wall to near wall). An element fits a gap when its width + 1 ≤ the gap.
- So the block fits 0 gaps, the 4-split fits 1 (the 12-unit gap), the 9-split fits 3 and the 16-split fits 5. The 4.5-unit gap stops every element.
- Elements are assigned to the gaps they fit in order across the tray, pass one at a time per gap (0.5 s apart), and take the nearest free place on the regroup mark, far column first.
- Timings: 1.0 s to reach the gap, 0.45 s to pass, 0.9 s to regroup, 0.1 s stagger between lanes. Shake stroke ±0.7 units at 2.2 Hz while the elements move.
- Readout (rework): during the crossing, elements, elements regrouped and lamp lit or dark; then surprise kept or lost and "lining up" / "striking"; at the end the strike's yield. The gauge shows regrouped ÷ elements.

### The follow-on attack (added 2026-10-14, all notional)

- `detection(p)`: an element taller than `beamH` = 5.5 breaks the beam at `beamX` = −7 when its leading face reaches it (found by bisection on the element's approach). Heights 12 / 7.06 / 4.42 / 3.5, so 1 and 4 elements are detected (at 0.698 s and 0.746 s), 9 and 16 never are. Doctrine supports only the direction (larger elements are easier to detect, para 2-86).
- `outcome(through, detected)` is a fixed table: stopped (did not get through) 5 vs 2 down, no attack, yield 0; lost (through, detected) 4 vs 2 (1 in the gap, 3 in the attack), "attack stalled", yield 0.3; held (through, undetected) 1 vs 6, "position taken", yield 1.
- `follow(p)`: reorganize 0.5 s, move to the assault place 0.8 s, assault 1.6 s after the last element regroups; a detected run also lasts until its flare burns out (5 s after detection).
- `strikeAt(p, f, t)`: the formation shifts −14.6 across the collecting tray, then strikes; the carriage is pushed yield × 4.5 units. The target turns 180° (through +y) 0.25 s after the lamp lights, over 0.6 s, and drops its brake shoe. The gun is 7.6 units up, above the tallest element that can meet it (7.06).
- `losses(p, t)`: the outcome's totals, reached over the run; in the assault the enemy's losses come early when surprise held, the attackers' when it was lost. `fieldText` and `readoutText` stay ≤ 46 characters.
- `model.test.mjs` checks: who is detected and when; nothing breaks the beam earlier; the outcome is a function of (through, detected) only and deterministic; held favours the attacker, lost the defender; losses never fall and end at the totals; nobody is hit on an unseen crossing; the formation never passes through the target and pushes it exactly yield × travel; no element path touches the carriage, brake or beam housings; readout strings.

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

## Losses (notional, Battlefield view only; realism pass 2026-10-13; SUPERSEDED 2026-10-14, see below)

- `losses(plan, t)` in model.mjs, growing over the run (none at the start): the single group, spotted and stopped, loses up to 5 and the enemy up to 2, both rising over the last 30% of its approach; a split force loses `round(share regrouped · element width / 4.5)` (2 for squads, 1 for teams or pairs) and the enemy `round(share regrouped)` (one sentry, silenced once half are through). End of run: 1 group 5 vs 2; 4 squads 2 vs 1; 9 teams 1 vs 1; 16 pairs 1 vs 1.
- Drawn as greyed, still figures: the group's men down where it went to ground with the man beside the first kneeling; a split force's carried to the rally point with a man of the largest regrouped element kneeling by them; the enemy's beside outpost 3, whose two men are drawn per frame for this. The Battlefield readout reads "N elements · c/N rallied · N vs M down" (or "1 element · stopped at line · …") to stay under 45 characters. Teaching values, not data.

## Surprise and the back end (rework 2026-10-14)

Feedback (a Marine infantry officer, via the owner): infiltration is about surprise more than small elements, and it sets up another action on the back end. The figure now shows both.

**Machine.** A light beam (emitter, receiver, red lamp) in front of the screen detects any element taller than 5.5 units: the block and the four-way split. A turret on a turntable and carriage stands beside the regroup mark facing the screen. After the regroup the formation slides across the collecting tray and strikes the carriage from behind: unseen, the turret still faces the screen and is pushed the full 4.5 units; seen, it has turned to face the tray and dropped its brake shoe, and is pushed 1.35 (yield 30%). New parts: 2 beam housings with bolts and a lens, the beam, the lamp and socket, the slot track with 2 screws, carriage with 4 screws, brake bracket and shoe, turntable with index ring, tower with hatch and 4 rivets, gun and collar.

**Battlefield.** An enemy mortar section (two horseshoe pits open to the rear, mortars on baseplates and bipods laid on the front, crew of six) sits behind the line at line-frame (30, −70), clear of every route. Detection (the same `detection()`): an illumination flare rises from outpost 3, lights a pool of ground for 5 model seconds and the sectors brighten. For the four squads, the sentries of outposts 3 and 4 turn to follow the squad and fire a short burst (one man hit), and the crew turns to face the rear after 0.6 s. The attack: a third of the force moves to a two-rank support-by-fire line on the section's flank (28, −46), the rest to an assault position 18 behind it in two groups that bound in 5-unit rushes (`trBound`), the group not moving lying down and firing. Held: the crew is caught facing the front (it turns only 30% into the assault), the attackers close to 8 behind the pits and kneel. Lost: the crew fires back from the start and the assault stalls 15 behind the pits, fire continuing. Men go down at the times the model's counts rise (scanned once per plan), greyed where they were.

Readout: crossing "c/N rallied · seen|unseen · B vs R down"; then "surprise held|lost · reorganizing|closing in|assaulting · …"; end "surprise held · position taken · 1 vs 6 down", "surprise lost · attack stalled · 4 vs 2 down" or "surprise lost · stopped at line · 5 vs 2 down".

Notional: the beam height and the always/never detection it implies, the outcome table, the mortar section and its place (it no longer maps onto the machine's target by the tray scale), the support/assault split, rush length, flare height and burn time, and every timing.

**Checks (2026-10-14).** `node scripts/model.test.mjs`: all passed. Build succeeds; `index.html` still contains `maneuvers.view.v2`, `maneuvers.css`, `IBM+Plex`, `ex-field` and `fd-reset`. `lines.mjs` via `drive.mjs`: `line ends: 0` in field n = 1 (flare, pinned), n = 4 mid-crossing and at the stalled end, n = 16 mid-assault and at the end; machine n = 1 at rest (beam cut by the block), n = 4 at the end and with the lamp lit mid-crossing, n = 16 mid-strike and at the end. Console clean in every run. Reset mid-run in both views restores split 1, t ≈ 0, the opening readout, lamp off and flare hidden. 390 px: scrollWidth 390, the attack sits inside the phone crop. Reduced motion: finished states. Frame timing, field view n = 16 through the assault, desktop: 60 fps, JS p50 0.4 ms, p95 0.7 ms, no frame over 25 ms. 4× close-ups: beam, housings and lamp (lit and dark), the turret at rest, turned and struck, the attack (support line, rushing and prone groups, crew facing front then turned), the flare and its pool. No geometry audit (`kit/audit.mjs`): still no pipes, tubes or lathe parts. Thumbnail regenerated from the Battlefield view mid-assault (n = 16), cropped without the corner labels, 800 × 500.
