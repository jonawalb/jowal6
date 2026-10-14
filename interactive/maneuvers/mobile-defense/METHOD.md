# Mobile Defense: method

An isometric bench model of a mobile defense as a sprung trap, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT). A Battlefield view (added 2026-10-13) reads the same `model.mjs` state (`runAt(t, split)` and `lossesAt(t, split)`); see below.

## Build

```sh
node interactive/maneuvers/mobile-defense/scripts/build.mjs       # writes index.html
node interactive/maneuvers/mobile-defense/scripts/model.test.mjs  # checks every model number the page quotes
```

`index.html` is generated. Edit `scripts/page.html` (text and chrome), `scripts/scene.mjs` (moving parts and the fixtures that sort against them), `scripts/model.mjs` (numbers and timeline) or `scripts/build.mjs` (static base, live loop), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Carriage on the track | The attacking enemy force |
| Converging guide walls, obstacle studs | Fixing force canalizing the enemy into the penetration (FM 3-90 para 10-7) |
| Sprung stop rising between the rails, with a preload knob | Fixing force holding the penetration; the knob pointer reads the fixing force's share |
| Lit arm on a torsion-spring pivot, latch, rest pedestal | Striking force, held back until committed; the arm swings across the enemy's rear |
| Split slider on the front strip | How the defender's power is divided between striking and fixing force |
| Dial gauge (top mark = 1) | Striking force over the enemy power it would meet |
| Pocket ruler along the far rail | Depth of the penetration |

## The model (all notional)

- Defender total 100 units; striking force = 100·s, fixing force = 100·(1 − s), s set by the slider (30% to 80%). Reserve, security and sustaining forces are not modeled.
- Enemy enters the pocket with 70; fires strip up to 30% by the stop: E(d) = 70·(1 − 0.3·d), so 49 at the stop.
- Fix holds if fixing force ≥ 0.7 × 49 = 34.3. Strike is committed only if striking force > 49 (strictly greater, after FM 3-90 para 10-34).
- Outcomes: trapped (both hold), held (fix holds, strike not greater: arm stays latched, after para 10-9), overrun (fix fails: stop pushed flush, carriage runs to the end stop, arm stays latched).
- In this model the trapping band is 50% to 65%. The constants were chosen so the band lands near the manual's "typical" one-half to two-thirds (para 10-2); the bench does not derive it. The page says so.
- Timeline per run (4.8 s): advance 1.9 s, contact 0.45 s, strike 0.4 s, hold 0.95 s, reset 1.1 s. The idle tour runs splits 58% (trapped), 40% (held), 74% (overrun): 14.4 s. The order is fixed; the page notes the manual says the strike "may be committed at a different time and area than anticipated" (para 10-34).

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed (enemy 70→49, fix needed 34.3, band 50–65, tour outcomes, edge cases 49% held and 66% overrun, arm only moves when trapped and after contact, ratio 0.83 → 1.18 at 58%).
- `scripts/lines.mjs` (Anatomy line-end check): `line ends: 0` at load, and 0 in nine `drive.mjs` poses (rest, advancing, contact, mid-swing, trapped, overrun contact, overrun end, held, reset).
- Captures at 1440 px and 390 px (light): console clean, no sideways scroll. Reduced motion shows the end state of the run, still.
- 4× close-ups: arm head against the carriage rear, pivot and spring stack, latch and pawl on the cocked head, wall mouth with the carriage, carriage passing over the flush stop, mid-swing at arm 0.44 and 0.57 (depth order across the key switch). Fixed after review: pad on the head's far face showed through (now drawn by facing), beam tail poked past the hub, a collar drawn over the latch knob, the beam end drawn over the head top, studs drawn over the pivot.
- No geometry audit (`kit/audit.mjs`): no pipes, cables or lathe/tube parts.
- 161 solids in the drawing (about 75 distinct parts, plus 26 obstacle studs).

## Battlefield view (added 2026-10-13, new terrain style)

Built with `kit/terrain.mjs` after Fig 1 (flank-attack) and Fig 21 (bypass). `scripts/field-scene.mjs` exports `FG`, `fieldTerrain`, `fieldStatic`, `fieldPose(s, rt, T)`, `fieldMarks`; `build.mjs` inlines `field.mjs`, `terrain.mjs` and it after the model and the machine scene. Toggle buttons, the V key and `localStorage["maneuvers.view"]` as in Fig 1.

**Scale and reading.** Company and battalion clusters (TERRAIN.md table: mobile defense). One vehicle is drawn per 5 units of the model's combat power, so the defender has 20 vehicles split by the slider and the enemy column 14. The doctrinal picture (FM 3-90 paras 10-7, 10-11, 10-14, 10-15): the enemy is let into a pocket; the fixing force holds the shoulders of the gap and a blocking position at the far end; the striking force waits hidden beside the pocket and counterattacks once the penetration is fixed. Striking the column's rear is the owner's choice (2026-10-13), labeled the model's on the page.

| Bench part | Battlefield |
|---|---|
| Carriage | Red armored column, 14 vehicles on the valley road; interval 12, closing to 9.6 when the lead is held |
| Guide walls, studs | Fixing force on both shoulders of the gap: two two-man holes and a machine-gun position on each hilltop, fixing vehicles at the foot of each hill, wire along both sides of the pocket |
| Sprung stop | Blocking position of fixing vehicles across the far end, either side of the road, chalk battle-position outline, wire either side of the road, two holes |
| Striking arm | Lit striking force (tank-heavy battalion, rows of 6/5/5) in a wood beside the pocket behind a chalk line of departure; moves as one formation on a cubic route to astride the road behind the column, facing east |
| Arm swing `arm` | Position along that route |
| Stop give / overrun `p > 1` | Column runs through the open road lane of the blocking position and off the map; the blocking position's survivors cease fire and stay (owner rule) |
| Slider | Vehicles move between the striking force (round(strike / 5)) and the fixing positions (half, rounded up, at the blocking position; the rest alternate between the shoulders) |

**Reset.** The model's reset (1.1 s) slides the carriage back. The field instead fades everything that changes within a run out (end state) and back in (start state), so the column never drives backwards.

**Losses (notional, `model.mjs` `LOSS`, `lossFinal`, `lossesAt`).** Counted in vehicles knocked out; readout "N vs M down" (friendly vs enemy).
- Enemy: fires knock out round((70 − E(d)) / 5), reaching 4 at the stop, one at a time as the column advances; its lead is lost at the stop (1) in every outcome; a strike that goes in knocks out round(6 × strike / 49) more, the rear first.
- Fixing force: round(2 × 34.3 / fix) at the stop, plus 1 if overrun (capped at the vehicles it has); the blocking position's road-side vehicles first.
- Striking force: round(3 × 49 / strike), trapped only, front row first.
- Results: 58% trapped 5 vs 12; 40% held 1 vs 5; 74% overrun 4 vs 5; band edges 50% 4 vs 11, 65% 4 vs 13; 80% 4 vs 5.
- Wrecks stand greyed, slewed, with a rising smoke puff; an ambulance drives up behind the blocking position after its first loss (not in an overrun) and a medic kneels by the wreck.
- The readout now carries the loss figure; the "held" readout reads "Held · strike 40 ≤ enemy 49" (was "Fixed · strike 40 ≤ enemy 49, held") to stay under 45 characters, and the reset now shows the enemy figure at the stop instead of a rising one.

**Checks run (2026-10-13).**
- `model.test.mjs`: all passed (new: vehicle counts, loss constants, the three tour results, losses fit and hold through the reset at every split, readout lengths).
- `lines.mjs` via `drive.mjs`: field view `line ends: 0` at rest (ready), trapped (t 3.2, 58%), overrun (2.9, 74%) and held (3.0, 40%); after the V key, machine view 0 at rest, trapped and overrun; at 390 px 0 in both views.
- Console clean; no sideways scroll at 390 px (scrollWidth 390).
- Frame timing, field view, idle tour, 6 s: desktop 60.0 fps, JS p50 0.5 / p95 1.1 ms, no gap over 25 ms; 390 px with 4× CPU throttle 59.5 fps, JS 1.8 / 4.7 ms, 3 gaps over 25 ms (max 33 ms). The first throttled run (52 fps) set the reset fade as a CSS variable on the whole field SVG; it now sets opacity on the fading nodes only.
- 4× close-ups: striking force's front row and wrecks, blocking position with wrecks, medic and ambulance, the hide and the north shoulder's positions. Fixed after review: strike formation overlapping in flight (now one rigid formation), wrecks under the attack position (fires order changed), medic drawn over a wreck, line-of-departure pegs under the hidden vehicles, column bunched too tight when held.
- Machine thumbnail kept.
