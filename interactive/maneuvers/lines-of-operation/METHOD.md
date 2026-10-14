# Lines of Operation and Effort: method

An isometric bench model of lines of operation (LOOs) and lines of effort (LOEs), drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT).

## Build

```sh
node interactive/maneuvers/lines-of-operation/scripts/build.mjs      # writes index.html
node interactive/maneuvers/lines-of-operation/scripts/model.test.mjs # checks every number quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (text and chrome), `scripts/scene.mjs` (moving parts and the terminal), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Two railway tracks across the front of the bench, angled toward the terminal | Two lines of operation (parallel operations), tied to ground |
| Gate arches on each track where the carriage pauses | Decisive points / nodes, passed in a fixed sequence |
| Ruler strip along the front edge | Ground distance: only the tracks are measured by it |
| Buffer stop at each track's start | The base the line starts from |
| Three parallel slotted bars on a rack, same length, no ruler | Three lines of effort, ordered by cause and effect, not distance |
| Five detents per bar; the slider steps between them | Tasks along the line |
| Stop block at each bar's end | The condition that line establishes |
| Terminal block with five lock pins | One pin per line; a pin rises when its line arrives |
| Lit block rising from the terminal (the one lit accent) | The end state |

## The model (all notional)

Campaign time `t` runs 0 to 100%. Each line's progress `p` runs 0 to 1.

- LOO A: piecewise-smooth knots (t, p) = (0,0) (12,0.3) (20,0.3) (32,0.6) (40,0.6) (52,0.85) (58,0.85) (66,1); three pauses = three decisive points; home at T+66%.
- LOO B: (5,0) (20,0.35) (30,0.35) (45,0.7) (55,0.7) (72,1); two decisive points; home at T+72%.
- LOE 1/2/3: five tasks each, finished at T+10/25/40/55/78%, 15/30/50/70/88% and 20/40/62/80/97%; each step slides over 4% of campaign time.
- End state: set when all five lines are home, which is T+97% (first time all are home, to the 0.1% grid: 96.9%).
- Stall control: LOE 3 never passes its third task (done at T+62%), so the end state never sets.
- The rule that the end state needs every line is this model's way of showing one unifying purpose; it is not a doctrinal rule, and the page says so.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed (arrival times, end-state time, stall, monotone progress, readouts under 45 characters).
- `scripts/lines.mjs` on the page at rest (T+50% start, mid-tour): `line ends: 0 of 274 ends on 58 lines float`.
- `drive.mjs` second and third poses with `["lines"]`: end state at T+100%: 0; LOE 3 stalled at T+85%: 0; T+83% (thumbnail pose): 0.
- Captures at 1440 px and 390 px (light): console clean, no sideways scroll.
- 4× close-ups of the terminal (pins, collar, end-state block, slider and carriage arrivals), the decisive-point gates with a carriage paused in each, the LOE rack (sliders, detents, start brackets) and the buffer stops; painter's order read correct in each.
- No geometry audit (`kit/audit.mjs`): the figure has no tube or lathe parts.
- 117 solids in the drawing, 42 of them track sleepers.

## Battlefield view (added 2026-10-13, new terrain style)

A Machine | Battlefield toggle (buttons, V key, `localStorage["maneuvers.view"]`) shows the same model state on full-bleed terrain (`kit/terrain.mjs`, reference Fig 1). Files: `scripts/field-scene.mjs` (layout `FG`, `fieldTerrain`, `fieldStatic`, `fieldPose`, `fieldSmoke`, `fieldMarks`, plus small props: truck, villager, crates, barrier, flag); `build.mjs` adds the second SVG, the field legend and the live code; `page.html` the CSS, the toggle and one "Battlefield view" paragraph plus one notional-casualties paragraph. The Machine view, its readout and every fact-checked sentence are unchanged.

**Scale and reading (operational).** One vehicle per company. Layout is written in card-aligned ground coordinates and rotated by the camera azimuth (60°, as the bench), so lines run left to right toward the end state, LOOs in front, LOEs behind.

| Field element | Bench part / model state |
|---|---|
| Two blue columns of six vehicles leaving the walled base by two roads | LOO A and LOO B carriages; lead position = `progress()` mapped piecewise onto the road (gate, a 30-unit stand-off short of each decisive point, road end) |
| Decisive points held by two dug-in red vehicles each, with fire fans: bridge, village, hill (road A); bridge, pass (road B) | The gates; each pause of a carriage = the fight for that point (`fightShare`), lead three vehicles deploy and exchange fire; red vehicles knocked out at 45% and 85% of the fight |
| One blue vehicle lost per road (A at the village, B at the pass), greyed with smoke; an ambulance shuttles back to the base | Realism rule; notional |
| Five villages on the district road; LOE 1 aid convoy (crates + villager), LOE 2 patrol (barrier + guard), LOE 3 trainer + two police (olive) posting police | The three bars; task k = that line's work in village k; teams travel between tasks, the result appears when the slider passes halfway to its detent |
| Town ringed in chalk, where all three roads end; lit flag rises with the end-state block's eased height | Terminal and end-state block (the one lit part) |
| Stall: trainers stop at village 3; insurgent cell (red, prone) at the wood edge fires on the checkpoints in villages 4–5; guard down, medic kneeling | Stall control (LOE 3 holds after task 3) |

**Notional casualties (`model.mjs`, tested).** Per decisive point [blue, red]: A 4/9, 7/12, 5/8; B 4/8, 6/11, accrued linearly over each fight: 26 vs 48 at the end. LOEs cost nothing unless LOE 3 is stalled; then raids at T+72/82/92% add [1,0], [1,1], [1,1]: 29 vs 50 at T+100%. The field readout (`fieldReadoutText`) replaces "not set" with "N vs M down" (end: "T+100% · end state · 26 vs 48 down"); the machine readout is unchanged. Drawn losses are indicative, not one figure per man.

**Checks (2026-10-13).** `model.test.mjs` passes (adds fights, totals, monotone casualties, field readouts < 45 chars). Line ends 0 in the field view at T+36% (mid-fight, 252 ends), T+100% end state (246), T+95% stalled (246), at 390 px (248) and in reduced motion (250); machine view via V key at rest and at T+30%: 0 of 274. Console clean in every run; 390 px scrollWidth 390. Frame timing, 6 s of the tour in the field view (rAF wrapper): desktop 60.0 fps, JS p50 0.7 / p95 1.5 ms, no gap over 17 ms; 390 px DPR 3 with 4× CPU throttle 60.0 fps, 1.8 / 4.2 ms, no gap over 17 ms. 4× close-ups of the village band, the village fight, the town and flag, and the raid. 49 moving items at T+50% (about 30 vehicles and figures plus props). Page 1.0 MB raw. Machine thumbnail kept.
