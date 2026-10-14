# Crossing the T: method

An isometric bench model of crossing the T, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT). Machine view only; `model.mjs` returns plain state (positions in ship spacings, angles in degrees, counts) with no drawing geometry, so a Battlefield view can be added later on the same state.

## Build

```sh
node interactive/maneuvers/crossing-the-t/scripts/build.mjs      # writes interactive/maneuvers/crossing-the-t/index.html
node interactive/maneuvers/crossing-the-t/scripts/model.test.mjs # checks every model number quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild. The build asserts that the drawing's pivot and turret offsets equal the model's (`GEO.PX = MODEL.D × GEO.S`, `GEO.TURRET = MODEL.turretAt × GEO.S`).

## The object

| Part | Stands for |
|---|---|
| Four gun carriages on a straight beam with end stops | The column (line ahead), held on its course |
| Lit lead carriage | The column's leader: the ship the crossing line's guns converge on, and the only one that can reply |
| Bar on a turntable carrying four carriages | The crossing line; the bar's angle is its heading off the column's course |
| Two twin turrets per carriage, barrels that swing | Main turrets; a turret that bears turns lighter and trains on the nearest enemy carriage it can reach, otherwise trains fore and aft |
| Two dial gauges (16 = full scale) | Guns bearing: front dial the column, back dial the crossing line |
| Hand crank on the stator, degree ticks 0–90 on the stator | Turning the line; reading its heading |
| Ruler strip by the beam, range strip ahead of it (a major tick per ship spacing) | The spacing unit the model works in |

## The model (all notional)

Plan view in ship spacings (1 spacing = 36 world units). Column ships at x = 0, −1, −2, −3, heading +x. Crossing line pivot at x = D = 2.7, its ships at ±0.5 and ±1.5 spacings along heading φ (0° end-on in line ahead of the column on the same course, 90° square across its head).

- 4 ships a side, 2 twin turrets each: 16 guns maximum. Secondary guns are left out.
- Turrets sit 0.25 spacings fore and aft of each ship's centre.
- Fore turret arc: |relative bearing| ≤ 135°. Aft turret arc: |relative bearing| ≥ 45°.
- Masking: a line of fire from the turret to an enemy ship's centre is blocked if it passes within 0.45 spacings of any other friendly ship's centre.
- A turret bears if at least one enemy ship is in its arc and unmasked; it trains on the nearest such ship. Guns bearing = turrets bearing × 2.

Results (asserted in `model.test.mjs`): end-on (0°) line 2, column 2; 30° line 6; 45° line 12; 60° and above line 16; the column is 2 at every heading from 0° to 90° (only the lead's fore turret), and the line's count never falls as φ rises.

Motion is notional too: the line swings at up to 20° per second (eased), barrels train at up to 120° per second, gauges ease with a 0.25 s time constant.

## Checks run (2026-10-13)

- `model.test.mjs`: passes.
- `scripts/lines.mjs` on the page at rest (tour): `line ends: 0` (364 ends). Drive sessions: 0 at 90° (376 ends), 0 at 0°, 0 at 45° and 0 at 33° after keyboard steps.
- `capture.mjs` desktop (1440) and phone (390): console clean, no sideways scroll at 390 px.
- Controls: pointer near the turntable steers (readouts 0° and 79° from two pointer positions), the End-on / across button jumps (to 0°), arrow keys step 6°, reduced motion renders the still 90° state. Tour contact sheet checked.
- 4× close-ups: the crossing line on the turntable, the column's lead and bow stop, the crank, a dial.
- No geometry audit (`kit/audit.mjs`): the figure has no pipes, cables or lathe/tube parts.

## Battlefield view (added 2026-10-13, new style)

**Scale and reading.** A naval figure, so the "battlefield" is a sea scene, not land troops. Four red battleships in column steam on their course; four blue battleships, the crossing line, lie on the crossing angle φ ahead of the column's head. The machine's turntable angle is the crossing angle. Every ship sits exactly where `stateAt(φ)` puts it (positions × 54 world units per spacing), its turrets train on the eased bearings the machine uses (`S.aims`), and a turret fires only if the model says it bears. The column's lead ship is the one lit element (it is also the lit carriage on the bench). The ships hold the model's geometry and the sea moves past them (wakes, coal smoke trailing astern), so the gun counts never drift from the machine's.

| On the sea | Model / bench part |
|---|---|
| Red column, four battleships in line ahead, lead lit | the column's carriages on the beam, lit lead |
| Blue crossing line, four battleships on heading φ | the bar on the turntable |
| A turret training and firing (flash, cordite puff, then two splashes or a burst on deck) | a turret that bears (lighter drum, barrels on target) |
| Fires and dark smoke on a ship, scorch on its deck, a funnel shot away at 6+ hits | notional hits taken (`hitsAt`) |
| Readout "N vs M hits" | `hitsAt(φ).lineTaken` vs `.columnTaken` (friendly = crossing line, enemy = column) |

**Notional damage (model.mjs, `hitsAt`).** In a notional exchange every turret that bears lands `HITS_PER_TURRET` = 1 hit on the ship it trains on, so hits taken by a side = the enemy's turrets bearing = the enemy's guns bearing ÷ 2. Results (asserted in `model.test.mjs`): 90° → column's lead 8, other column ships 0, line 1 (the lead's fore turret on the nearest blue ship); 0° → 1 vs 1; 30° → 1 vs 3; 45° → 1 vs 6; 60° → 1 vs 8. On the page, fires fade in and out with a 0.6 s time constant as the counts change.

**Drawing (figure-local, `scripts/field-scene.mjs`).** Generic turret-era battleships, not any real ship: hull (36 units long, drawn larger than scale against the 54-unit spacing), deck, midships deckhouse, fore bridge with wings, aft house, two funnels, two masts with fighting tops and a yard, a twin turret on a barbette fore and aft (12 units from midships; the model's 0.25 spacings would be 13.5). Each ship is cached by look (heading to 2°, turret bearings to 3°, fires shown) and moved by translate. No tracers, by choice: shell fire is shown only as flashes and splashes. Splashes are live items sorted just behind or in front of the ship they straddle. Smoke is bucketed into four opacity levels, one path each, to keep paint cheap. Kit use: `kit/terrain.mjs` relief, trees and patches for two islands at the edges, the stage (`trStage`) for live items; the water, swells, ripples, wakes, ships, splashes, flames and smoke are figure-local. The shared kit was not edited.

**Notional timings.** Salvo period 3.3 to 4.4 s per turret; shell flight 1.4 s; splash life 2 s; the animation shows a quarter of salvos as hits (visual only; the readout's hits come from `hitsAt`).

### Checks run (2026-10-13, Battlefield retrofit)

- `model.test.mjs`: passes (original assertions unchanged, plus the hits block).
- `lines.mjs` via drive (V key / `setView`): field at 90° and at 20°: `line ends: 0` (only 7 island contour lines are texture lines); machine at 90° and 30°: `line ends: 0` (376 ends).
- Console clean in both views; no sideways scroll at 390 px; reduced motion renders a still frame.
- Frame timing (rAF wrapper, 6 s of the tour in the field view): desktop 1100 px 60 fps, JS p50 1.4 ms / p95 3.2 ms; 390 px with 4× CPU throttle 57.7 fps, JS p50 3.1 ms / p95 10.4 ms (machine load average was above 250 during the run). An earlier build at 40 fps was traced to 150 gradient-faded ripples repainted under the smoke; they are now one plain path.
- 4× close-ups of the lead ship under fire (splash sorting, fires, funnel stump) and of the crossing line's turrets.
