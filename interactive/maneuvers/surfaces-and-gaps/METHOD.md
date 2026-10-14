# Surfaces and Gaps: method

An isometric bench model of surfaces and gaps (MCDP 1), drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT).

## Build

```sh
node interactive/maneuvers/surfaces-and-gaps/scripts/build.mjs      # writes interactive/maneuvers/surfaces-and-gaps/index.html
node interactive/maneuvers/surfaces-and-gaps/scripts/model.test.mjs # checks the model numbers quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Wall face: back plate, six dividers, five keys | The enemy's front, in five lanes |
| Key flush with the face (set back under 6 mm) | A surface: a hard spot, an enemy strength |
| Key set back into the wall (6 mm or more) | A gap: a soft spot, an enemy weakness |
| Five feeler blades on spring-loaded carriages, pushed together by one bar | Reconnaissance along the whole front: each probe stops on a surface or slips into a gap |
| Lit ram (wedge head on a two-stage rod) on a saddle that slides along the bar | The main effort |
| Ram strikes its planned lane, withdraws, slides to the deepest blade's lane and drives in | "if our main effort has struck a surface but another unit has located a gap, we designate the second unit as the main effort" (MCDP 1, p. 93) |
| Keys reset after each probe in the tour ("Shift the face") | Gaps "rarely permanent" and "usually fleeting" (p. 93) |
| Guide ribs, ruler strip (zero at the face, ticks every 2 mm), lane tags with 1–5 pips, side rails with end stops, label plate | Bench furniture |

The spec asked for "a fan of feeler gauges"; the blades here are a parallel comb, one per lane, so each lane gets its own probe and its own depth. Exactly one lit part: the ram head.

80 solids at load: plate and 4 feet (9), label plate, ruler, 2 rails, 4 stops, 5 lane tags, back plate, 6 dividers, 6 guide ribs, 5 keys (plus a back stub behind the plate for any key set back far enough), 5 blades, 5 carriages, 5 thumb screws, 10 spring washers, 5 guide rods (with coils), push bar, 2 shoes, 2 bar knobs, saddle and knob, ram rod stages, collar and head.

## The model (notional)

All numbers are teaching values in bench millimetres, not data.

- Five lanes, 18 units apart; lane 1 is the near-left lane.
- A key set back `d` is a gap if `d ≥ 6`, otherwise a surface.
- Blades: the push bar travels from +6 to −30; the free blade tip is 76 behind the bar's face, so a blade can reach 16 past the face. A blade's tip is `max(bar − 76, −90 − d)`: it stops on its key or at full stroke. Probe depth = `min(d, 16)`.
- Deepest lane = the largest probe depth; ties go to the lane nearest the planned lane, then the lower index.
- Ram: retracted tip 15 ahead of the bar; it can drive 24 past the face. Ram depth in a gap = `min(d, 24)`; on a surface it stops at the key face.
- Faces the tour steps through (set-back of keys 1–5): `[0, 2, 0, 26, 1]`, `[1, 0, 20, 0, 0]`, `[22, 0, 1, 0, 9]`, `[0, 1, 0, 2, 24]`. Each has one deep gap; face 3 also has a shallow 9 mm gap that loses to the 22 mm one. The tour starts planned on lane 2 and carries the main effort over: 2→4, 4→3, 3→1, 1→5, 5→4. Every planned lane in the tour is a surface, so every cycle shows a strike and a shift.
- Cycle (13 s): rest 0.8, probe 3.0, strike 1.2, back 0.8, shift 1.4, lunge 1.2, hold 1.6, home 1.6, shuffle 1.4. If the planned lane is already the deepest, the strike goes straight in and the ram stays there.
- "The ram goes to the deepest blade" stands in for "the unit that located a gap". In this model a deeper probe means a better gap; real gaps need not follow that, and the page says so. The bench does not create gaps or model a disguised surface; the page says that too.

Readouts (all under 45 characters, asserted in the test; changed 2026-10-13 to end with the casualty count): "Main effort set on lane 2", "Probing the face", "Lane 4 deepest, blade in 16 mm · 2 vs 2 down", "Lane 2 struck a surface · 4 vs 2 down", "Main effort shifts to lane 4 · 4 vs 2 down", "Through lane 4, 24 mm deep · 4 vs 3 down", "Withdrawing to probe again · 4 vs 3 down", "The face shifts, gaps move · 4 vs 3 down".

Casualties (notional, `casualties()` in model.mjs, added 2026-10-13): none at rest or before the probe reports (probe phase under 75%). Then `contacts` = lanes whose key is within the blade's reach (≤ 16, so the blade stops on it: a surface, or a shallow gap held in depth); blue loses `ceil(contacts / 2)`, red `floor(contacts / 2)`. If the main effort strikes a surface first (planned ≠ deepest), blue loses 2 more from the "back" phase on. When the main effort goes through (lunge, or strike if the planned lane is the deepest, at 60% or later), red loses 1 more. Every tour face has 4 contacts, so a cycle ends 4 vs 3 when the planned lane is a surface and 2 vs 3 when it is the gap. Counts reset with each probe. Teaching values, not loss rates.

## Battlefield view (added 2026-10-13, new terrain style)

`scripts/field-scene.mjs`, drawn with `../kit/terrain.mjs` (after `field.mjs`), toggled by the Machine | Battlefield buttons, the V key and `localStorage["maneuvers.view"]` as in Fig 1. Scale: a rifle platoon with individual soldiers (TERRAIN.md: small-unit fire and movement). The same state drives both views: the page's eased `shown` (bar, blade tips, ram, key depths) plus the model pose `p` (phase, planned and deepest lane, contacts).

| Bench | Battlefield |
|---|---|
| Five lanes | Five lanes across the enemy front, 30 ground units apart (lane 1 on the left); wire between the lanes in front of the enemy line |
| Key set back `d` | That lane's enemy element (a rifle pair; a machine-gun team in lane 3) sits `2.4 × max(0, d − 2)` units behind its forward fighting position. Flush = in the forward hole (a surface); deep = back in a position in depth, the lane in front unwatched (a gap). Holes are drawn at every set-back the tour uses |
| Feeler blade tip (depth `p` past the face) | A fire team in wedge riding it at `u = −24 + 2.4 p`: on the line of departure at rest (`p = −20`, `u = −72`), 24 units short of whatever its blade touches (stopped there it goes prone and trades fire), up to `u = 14.4` in a gap at full stroke |
| Ram (depth past the face, lateral `ramY`) | The follow-on element (a fire team in file, its squad leader, the platoon leader and his RTO), lit: same mapping once level with the line of departure, `0.25` units per mm behind it; it moves across behind the line during "shift" and through the gap to `u = 33.6` |
| Lit ram | Lit = the main effort: the planned lane's team plus the follow-on element; after the shift, the deepest lane's team |
| Keys shuffle | Enemy elements stand and run to their new positions |

Casualties use the model's counts: blue riflemen of the teams stopped on keys and two of the follow-on element (they lie where their element was stopped, then are carried to the casualty collection point over "home" and "shuffle"); red by the positions in contact, then one beside the main effort's gap. The platoon medic walks to the first blue casualty; the platoon sergeant kneels at the CCP. Fire: each enemy element fires on blue troops stopped in its lane (and, once the main effort is through, on it from beside the gap); teams in contact return fire (AR and TL); the main effort fires into the flanks of the positions beside its gap. Teams slipping into a gap draw no fire. The machine-gun team's sector is the red fan.

40 soldiers (29 blue, 11 red). Notional throughout: sizes, ranges, timings, figure scale (about 1.5×), enemy strength and positions, casualty counts. Formation and role claims come from ATP 3-21.8 (2024, C1), paras 1-11, 1-22, 3-46, 4-67 (FACTCHECK rows 11–15, pending).

Decisions made overnight (owner asleep): the ram maps to a follow-on element rather than to a sixth probing team, so the bench's separate ram has a separate unit; the teams held on surfaces stay down and keep firing rather than following through (the bench's blades stay on their keys, and MCDP 1's "redirect our combat power in support of it" reads as fire support as well as movement); gaps are made by the enemy pulling an element back into depth (the key's set-back), so the enemy's repositioning is visible as running men; wire channels the lanes but never closes one, since the bench has no fixed obstacles; casualties reset each probe, as the bench's cycle does.

## Controls

Pointer hover over the lanes picks the planned lane; click (or Enter / Space / P, or the "Probe the face" button) runs one probe; S or "Shift the face" resets the keys to the next face; arrow keys and the slider pick the lane. The idle tour resumes 9 s after the last input. Reduced motion shows the hold pose (ram through the gap) as one still frame and jumps on input. The loop stops offscreen. `window.__surfacesAndGaps.stop()` stops the tour for testing.

## Painter's order

No depth sort: every moving part sits in one of five lanes (y bands), so the scene paints the key back stubs, the wall plate, then lane by lane from far to near (far divider and rib, key, blade, carriage, thumb screw, spring), the ram right after the nearest lane its footprint touches, then the near divider, the shoes, the push bar and the saddle. Each pair that can overlap on screen is ordered by a separating plane (x, y or z); the shift pose was checked at 4×.

## Checks run for the Battlefield view (2026-10-13, late)

- `node scripts/model.test.mjs`: all passed (new readouts, casualty counts, both sides ≥ 1 once in contact, every readout under 45 characters over all faces × lanes × 0.05 s).
- `lines.mjs` via `drive.mjs` (V key / `setView`): Battlefield at rest `line ends: 0 of 194`, mid-cycle (main effort through the lane 4 gap) `0 of 190`, during the shuffle `0 of 190`; Machine at rest `0 of 340`, at hold `0 of 340`. Phone (390 px) Battlefield rest and hold: 0. Console clean in every run; no sideways scroll at 390 px (scrollWidth 390).
- Frame timing (rAF wrapper, 6 s of tour in the Battlefield view): desktop 60.0 fps, JS p50 0.60 ms / p95 1.50 ms; 390 px with 4× CPU throttle 59.8 fps, JS p50 1.70 / p95 3.30 ms.
- 4× close-ups of the machine-gun nest with casualties, fighting positions, wire and soldiers. Captures kept: scratch `desk.png` (Battlefield, mid-cycle) and `phone.png`. The machine thumbnail is unchanged.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed (thresholds, the tour's lane route, tie-breaking, eight readout strings, readout length under 45, and over every face × planned lane × 0.05 s step: no blade or ram passes through a key, no blade passes its stroke, the ram is only between lanes while retracted).
- `scripts/lines.mjs` at load (tour probing): `line ends: 0 of 340`. In the second resting pose via `drive.mjs` (probe run, ram through the lane 4 gap, hold): 0. Mid-shift: 0.
- Captures at 1440 px (load, strike, hold) and 390 px; hover and ArrowRight change the planned lane ("Main effort set on lane 1" → "lane 2"); reduced motion shows the hold pose. Console clean, no sideways scroll at 390 px.
- 4× close-ups: wall face with keys, dividers and the ram head in the gap pocket; carriages, thumb screws and compressed springs at the bar; push bar, shoe, knob and saddle; the ram passing over a carriage mid-shift.
- No geometry audit (`kit/audit.mjs`): the figure has no pipes, cables or lathe/tube parts.
- Not done: dark theme (the site is light only).
