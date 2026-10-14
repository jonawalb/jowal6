# Main Effort and Economy of Force: method

An isometric bench model of main effort and economy of force, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT).

## Build

```sh
node interactive/maneuvers/main-effort/scripts/build.mjs      # writes interactive/maneuvers/main-effort/index.html
node interactive/maneuvers/main-effort/scripts/model.test.mjs # checks the model numbers quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Wall of four gates (A to D) between five capped piers | A front of four sectors |
| Gate held up by springs and two shear pins | The enemy's resistance in that sector |
| Weight discs on each gate's platen, 12 in all | The force's combat power, fixed in total |
| Lit gate (black edge and inlay) | The designated main effort |
| Gates with the minimum discs | Supporting efforts, economy of force |
| Overhead loader (gantry beam, trolley, arm, hook rod, grab) | Shifting resources between efforts, and shifting the main effort |
| Ruler strip, sector tags with one to four pips, label plate | Bench furniture; the pips name the sectors |

About 61 solids: plate and 4 feet (8), label plate, ruler, 4 sector tags, sole rail, 2 posts (foot, shaft, cap each), beam and 2 stops, trolley (body, cheek, arm, boss), 5 piers with caps (10), 4 gates, 4 platens, 12 discs, grab and rod.

## The model (notional)

- 12 discs shared among 4 sectors. Supporting sectors get `each` discs (0 to 3, the slider); the main effort gets `12 − 3·each`.
- A gate with 6 or more discs breaches (drops 15 units). A gate with 1 to 5 holds and sinks `2n/6` units on its springs. A gate with 0 discs is exposed (pushed up 6).
- Settings: spread (3, 3, 3, 3) gives no breach, all held; (1, 1, 9, 1) gives a breach on the main effort, rest held; (2, 2, 6, 2) just breaches; (12, 0, 0, 0) breaches with three sectors exposed.
- The loader carries at most 4 discs per trip, from the largest surplus to the largest deficit, at 150 units/s along the beam and 70 units/s up and down, with smoothstep easing. The readout counts only discs on gates, so it shows the in-between states honestly while discs are in the air.
- Idle tour (16.5 s loop): main effort C with 3 each (designated but not weighted), then 1 each (C breaks through), then the main effort shifts to B, then back to 3 each.

All thresholds and counts are teaching values, not data, and the page says so. The conclusions (spreading never breaks through, weighting does) hold in this model because the thresholds were set that way.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed (allocations, states, gate travel, readout strings and lengths under 45 characters, the loader reaching a target in trips of at most 4).
- `scripts/lines.mjs` at load (tour running): `line ends: 0 of 168`. In a second resting pose via `drive.mjs` (main A, 0 each: one breach, three exposed): 0. Mid-trip: 0. Thumbnail pose (main C, 1 each): 0.
- Captures at 1440 px (load, +3 s, +7 s of the tour) and at 390 px. Console clean, no sideways scroll at 390 px.
- 4× close-ups of the trolley on the beam with its arm and rod, the grab, an exposed gate between piers with its shear pins, the breached gate under its 12-disc stack, and the right-hand post; plus a mid-trip shot with discs on the hook.
- No geometry audit (`kit/audit.mjs`): the figure has no pipes, cables or lathe/tube parts.
- Not done: dark theme (the site is light only).

## Battlefield view (added 2026-10-13, new terrain style)

A Machine | Battlefield toggle (buttons under the card, V key, `localStorage["maneuvers.view"]`) shows the same state on full-bleed terrain drawn with `kit/terrain.mjs`, copied from Fig 1 and Fig 6. `scripts/field-scene.mjs` holds the layout (`FG`) and every notional number; `build.mjs` inlines `kit/field.mjs`, `kit/terrain.mjs` and `field-scene.mjs` after `model.mjs`. Machine view, machine text and the fact-checked doctrine text are unchanged (the hint reads "Click a sector to weight it" only in the field view).

**Scale and reading.** A rifle company attacks on a front of four platoon sectors (A to D, left to right, matching the gates); an enemy line holds two two-man fighting positions per sector, with a wood behind. Each disc is one blue element: a rifle squad (9 men: two fire teams in squad line plus the squad leader), a machine-gun team (gunner and assistant gunner) or an attached tank. `HOME` in `model.mjs`: each sector starts with a squad, an MG team and a tank (A: squad, MG, tank; B: squad, tank, MG; C as A; D as B), 12 elements in all: 4 squads, 4 MG teams, 4 tanks (44 men, 4 tanks; 16 enemy; plus a medic).

| Bench | Battlefield |
|---|---|
| Discs on a gate | Elements in that platoon sector |
| Lit gate | Lit sector: the main effort (all its elements outlined black) |
| Breach (6+ discs) | Its tanks drive through the enemy line to 26 units past it, its squads follow in squad column; 3 of the 4 enemy there go down, the fourth runs back |
| Held (1 to 5) | Elements hold 42 units short of the enemy line and trade fire: squads prone with 1 to 2 elements (economy of force), kneeling with 3 to 5 |
| Exposed (0) | Sector empty; its four enemy leave their holes, come forward 24 units and go prone; a red fan marks the ground their fire covers |
| Loader carrying discs | Elements in transit on the lateral road behind the line of departure, following the loader's position (beam x → front v) |

`fieldAssign(stacks, prev)` mirrors the loader: a gate losing discs sends elements to the road (attached elements first, last in first out, then its own in reverse home order, so its squad goes last); a gate gaining discs takes them from the road (its own first, then squads). `fieldStep` moves every element and enemy soldier toward its target at 26 units/s (notional), blending squads between line and column; stride comes from distance walked. Fire: enemy positions fire at blue in front of them (forward enemy in an exposed sector at 64 units either side), suppressed by the weight in their sector (share of bursts 0.85 − 0.08 per element, floor 0.25); tanks, MG teams and the automatic riflemen and team leaders of stationary squads fire on the enemy in their sector; with no enemy left in front (after a breach) they stop firing and stay (owner rule).

**Casualties (notional, `casualties(stacks)` in model.mjs).** Held sector: ceil(n/2) blue down; breaching sector: 2; each exposed sector: 2 more in the nearest occupied sector. Enemy: 3 in a breached sector, 1 in a held sector with 3+ elements. Spread (3,3,3,3): 8 vs 4; (1,1,9,1): 5 vs 3; (2,2,6,2): 5 vs 3; (12,0,0,0): 8 vs 3. Greyed prone figures (`data-side` fc/hc); the first blue casualty lies at a collection point by the road with a kneeling medic. The readout (both views) is now `readoutOf()`: e.g. "Spread 3 each · no breach · 8 vs 4 down", "Main C 9 · breach · 5 vs 3 down", "Main A 12 · breach · 3 exposed · 8 vs 3 down"; `summary()` is kept and still tested. Soldiers and tanks drawn about 1.5× scale.

**Checks (2026-10-13).** `model.test.mjs` passes (new: HOME composition, casualties for four allocations, readout strings, every reachable stack state under 45 characters and a loss in every occupied sector). Line ends 0 in the field view at rest (spread, 0 of 86) and in pose 2 (main B, 0 each: breach plus 3 exposed, 0 of 98), and in the machine view after V at rest and in pose 2 (main C, 1 each; 0 of 168 each). Reduced motion: V, arrow keys and a click on the ground (selects sector D) work; line ends 0. Console clean; 390 px: no sideways scroll. Frame timing (rAF hook, 6 s of the tour in the field view): desktop 1440 px 60.0 fps, JS p50/p95 0.40/0.80 ms, no long frames; 390 px, DPR 3, 4× CPU throttle 58.9 fps, JS 1.10/5.80 ms, 7 single-frame (33 ms) gaps. 4× close-ups of the breach (tanks, squad column, enemy casualties at the holes), a held squad prone in line, and the collection point. Machine thumbnail kept.
