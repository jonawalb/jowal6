# Double Envelopment: method

An isometric bench vise that models a double envelopment, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT). Built from the Figure 1 (`flank-attack`) template.

## Build

```sh
node interactive/maneuvers/double-envelopment/scripts/build.mjs      # writes index.html
node interactive/maneuvers/double-envelopment/scripts/model.test.mjs # checks every number the page quotes
```

`index.html` is generated. Edit `scripts/page.html` (text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Round block on a sliding pallet, degree ticks round its rim, six pegs and a standard on top (lit) | The enemy force; its rim is its perimeter |
| Concave ram pad on a straight rail, with rod, spring, guide rods and carriage | The fixing force: a frontal attack that holds the enemy in place |
| Two curved, segmented jaws pivoting on the block's flanks; tail rollers on arc slides with scales | The two enveloping forces, closing round both flanks to the rear |
| Escape stop at the rear end of the pallet slot (slot and plate lengthened 2026-10-13) | How far an unheld block slips out the back |
| Dial gauge | Share of the block's rim under attack |

Camera azimuth 218°, so the jaws' tails, where the envelopment closes, face the viewer.

## The model

Geometry (computed, not notional): block radius 22; jaw and pad faces at radius 22.5; jaws 7 thick, spanning 85°–178° off the block's front, pivoting at radius 26 on the 85° line; pad spans ±40°. Jaws open 55° about their pivots at rest. A rim point (sampled every 1°) is "under attack" when a jaw face or the pad face lies within 1 unit of it.

- Held, jaws open: pad only, 24% of the rim.
- Held, jaws shut: 78%.
- Released and slipped out the back: 0%.

Notional (labeled on the page): the mapping of parts to forces, the 1-unit contact tolerance, and the escape rule (changed 2026-10-13 at the owner's request, so both views escape out the back): when the ram is released its pad lifts 3 units off the block but stays on the rail; once the jaws close past 50° open (`MODEL.slip`) the unheld block slides 57 units out the back, through the gap between the jaw tails, which clears the jaws at every opening. Jaws and block stop each other on contact (`blocked`), and a block that has slipped out comes home only while the jaws are open past 50°. The percentages describe the bench model, not any battle.

## Battlefield view (terrain style, 2026-10-13)

`scripts/field-scene.mjs`, drawn with `../kit/terrain.mjs` (full-bleed ground, soldiers at about 1.5x scale, no board). Scale: **platoon** (soldiers), following ATP 3-21.8 para 4-15 on envelopment at platoon and company level. The same state `S` as the vise drives it, through `fieldPose(S, MODEL, T, M)`:

| Model state | On the ground |
|---|---|
| Closure `c = 1 - beta / MODEL.open` | Two rifle squads (squad column, teams in wedges) move from the line of departure (bearing ±30°) round both flanks on woodland tracks (radius 88 near, 74 far) to bearing ±128° by c = 0.74, then turn in and close to radius 47 in squad line by c = 0.97. The near squad, with the platoon leader and RTO, is lit (main effort). |
| Ram stand-off `S.u` | The support-by-fire element (a rifle squad kneeling behind a wall and an MG team prone) fires on the enemy front while `S.u` is near 0; as the pad lifts off it ceases fire and stays in position (owner rule for all figures). |
| Block slide `S.s` | 0: the enemy platoon (-) (9 two-man holes all round the summit, an MG team in a nest on the front, the platoon leader) stays dug in. Toward `-MODEL.escape`: it leaves its holes, rear positions first, by a sunken lane out the back and kneels at a rally point beyond. The page eases this at 0.14 per second (`fieldEscape`) so the men file out; the readout is the model's. |

Fire (`trShots`): the SBF MG and two riflemen on occupied front holes (their sector narrows as the squads close); the enemy MG and one man per hole at friendly troops inside their sector, rate cut by the SBF's suppression; the squads' automatic riflemen and team leaders at occupied holes once they turn in (empty holes draw no fire). Notional: all sizes, ranges, timings, the enemy's strength, the escape lane and the 1.5x figure scale. Both views escape out the back (owner decision 2026-10-13).

Checks after the rear-escape change (2026-10-13): `model.test.mjs` passes (rear path clear at and above the slip angle, escaped block clear at every opening, `blocked` and the new targets); line ends 0 in two or more poses of each view at 1280 and 390 px (machine: held open, held shut, slipped out, re-fixed and reopened; field: held at 50%, held shut, slipped out); console clean; no sideways scroll at 390 px; field-view tour frame timing 60 fps, JS p50/p95 1.1/2.0 ms at desktop, 58.7 fps, 3.6/7.3 ms at 390 px with 4x CPU throttle. About 52 soldiers. thumb.png predates the longer plate.

## Losses (notional, Battlefield view only; realism pass 2026-10-13)

- `losses(state, held)` in model.mjs: the enemy (21 men) loses `max(1, round(21 · (0.04 + 0.30 · rim share)))`; the two enveloping squads with the platoon leader and RTO (20 men) lose `max(1, round(20 · (0.05 + 0.10 c + 0.10 c if the front is not held)))`, c the closure. Held, jaws open 1 vs 2; held and shut 3 vs 6; released and slipped out 5 vs 1.
- Drawn as greyed, still, prone figures: the squads' men down at a collection point behind the SBF position with a kneeling medic, the enemy's by their holes. The Battlefield readout ends "N vs M down" (friendly vs enemy), with shorter words ("Held", "Slipped", "% rim") to stay under 45 characters. Teaching values, not data.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: passes. Asserts 24/78/0%, the constants quoted, that the share never falls while held jaws close, that the pivot stays fixed, that no jaw enters the block at any opening (0–55°) or anywhere on the escape path within the grip angle, and that the withdrawn pad clears the escaped block.
- `scripts/lines.mjs` at rest (jaws open, held): line ends 0. `drive.mjs` `["lines"]` held with jaws shut: 0; released and squeezed out: 0; released with jaws at 40%: 0.
- `capture.mjs` at 1440 px and 390 px, light: console clean, no sideways scroll.
- 4× close-ups: jaw tails meeting at the rear, near and far pivots with hinge pins, arc slide with roller and index tab, ram pad / rod / guide rods / spring, gauge, and the escaped block against the open jaws. Painter's order correct in all.
- Tour (15 s loop) sampled every ~1.1 s: held close to 78%, open, release, close (squeezed out, 0%), open, re-fix.
- No geometry audit (`kit/audit.mjs`): no tube or lathe parts.
- Part count: 81 solids, ~705 paths.
