# Mission Command: method

An isometric bench model of mission command, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT).

## Build

```sh
node interactive/maneuvers/mission-command/scripts/build.mjs      # writes interactive/maneuvers/mission-command/index.html
node interactive/maneuvers/mission-command/scripts/model.test.mjs # checks the model numbers quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (all parts above the base plate: `statics` once, `scene` per frame), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (base plate, card, live code), then rebuild. The page inlines `model.mjs` and `scene.mjs`, so the readout, the motion and the tests run the same code.

## The object

| Part | Stands for |
|---|---|
| Two identical engines with horizontal flywheels | Two subordinate units doing the same task |
| Load bar pressing a brake shoe on each flywheel (slider, arrows, pointer) | The situation, which changes for both |
| Flyball governor on the left engine (lit weights), its sleeve and link bar to the throttle lever | A subordinate acting on its own reading of the situation |
| Set-point spring on the left throttle, fed by a rod from headquarters | The commander's intent: chosen by headquarters, kept when the link fails |
| Handwheel on the headquarters console and the rod to the right throttle | Detailed control from above: the throttle moves only when headquarters cranks it |
| Couplings on both rods (open when jammed) | The command link |
| Speed gauges at each end (set-point mark at 100%) | How well each unit holds the intent |

## The model (all notional)

- Engine speed settles at 100% × throttle ÷ load, with a first-order lag of 1.2 s. Load runs from 0.5 to 1.0 (start 0.7).
- Governor: throttle = 0.7 + 8 × (1 − speed/100%), clipped to 0..1.2. Steady speed = 100% × 8.7 ÷ (load + 8): 100% at load 0.7, 97% at 1.0, 102% at 0.5. A proportional governor settles near its set point, not on it.
- Headquarters: sees the load through reports with a first-order lag of 2 s, wants throttle = seen load (which holds 100%), and cranks at most 0.25 throttle units per second. While linked the right throttle follows; jammed, it freezes.
- Frozen at 0.7: 70% at load 1.0, 140% at load 0.5. (In the idle tour the throttle freezes wherever headquarters had cranked it, so tour readings differ.)
- Picture mapping (not part of the model's claims): governor arm angle 34° + 0.8° per % of speed error (clamped 18°–50°); flywheels turn at 0.9° per second per % speed; rod travel 20 units per throttle unit; handwheel 600° per throttle unit.
- Idle tour (16 s): load step to 1.0 with the link up (the governor recovers at once; headquarters catches up late and overshoots on the way back), link jammed at 7.5 s, load to 1.0 then 0.6 while jammed, link restored at 14.5 s.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed (steady states above, a simulated load step with the link up and cut, and the crank-rate limit).
- `scripts/lines.mjs` at rest: `line ends: 0 of 416`. `drive.mjs` second pose (link jammed, load 0.55, settled): `line ends: 0 of 416`, readout "Link cut · governed 102% · cranked 127%".
- `capture.mjs` at 1440 px and 390 px, light: console clean, no sideways scroll. Tour readouts at +6 s and +9 s changed as expected. Reduced motion: console clean, figure rests at "Link up · governed 100% · cranked 100%".
- 4× close-ups: governor (arms, weights, sleeve, link bar to the lever), left set-point spring and coupling, left stanchion, right coupling and gap, right throttle body with its rod, headquarters handwheel, load-bar pointer over its ruler block, speed gauge. Fixed after the close-ups: the cranked gauge needle was missing (speed not passed to the scene), the right rod's end showed in front of its throttle body, the left stanchion post was drawn over its rod, and the load pointer floated; all four now read correctly.
- Count: 82 solids, 777 paths.
- No geometry audit (`kit/audit.mjs`): the figure uses no lathe or tube parts. The governor weights are kit cylinders and its arms are kit segments.

## Battlefield view (added 2026-10-13, new terrain style)

A Machine | Battlefield toggle (buttons under the card, the V key, `localStorage["maneuvers.view"]`), built on `kit/terrain.mjs` after Fig 1. `scripts/field-scene.mjs` lays out the ground and places every soldier from the same state the engines run on; the machine view, its text and its readout are unchanged.

**Scale and reading.** Platoon scale with individual soldiers (TERRAIN.md table: a small-unit vignette for an abstract idea). Two rifle platoons of one company each have a stone bridge to seize over a stream. Company headquarters (radio mast, commander, RTO, one more soldier) stands behind the line of departure; faint signal arcs ripple from the mast to each platoon's RTO and vanish when the link is jammed. The lit left platoon is the governed engine: it reads the situation itself and works to the intent (take the bridge). The right platoon is the cranked engine: it moves only on orders, so it halts and waits when its orders no longer fit the situation.

| Battlefield element | Model state |
|---|---|
| Enemy MG team moves from the far-bank hamlet to a nest beside each road, red fan on the ground | load ≥ 0.80 (`FIELD.heavy`), eased by `F.gun` at 0.7 per s |
| Enemy fire team at each bridge pulls back into depth | load ≤ 0.55 (`FIELD.light`), `F.back` |
| Lit platoon's progress and route (road ↔ covered route behind the hedge) | `F.pG` advances at `FIELD.rate × fit(wG)`; `F.rG` turns toward cover while the gun threat holds (its own reading of the load) |
| Waiting platoon's progress and route | `F.pC` at `FIELD.rate × fit(wC)`; `F.rC` follows `threat(uC)`, the situation headquarters' last order answers |
| Halted / kneeling; prone under fire | `fit < ~0.05`; on the open road in the gun's reach while it is in place |
| Radio arcs | `1 − gap/3.2` (the same coupling gap the machine eases) |
| Men down (greyed, still; a medic by the first in each platoon), readout "N vs M down" | `fieldLosses(F)` |

**Battlefield model (all notional, `model.mjs` FIELD).** `fit(w) = max(0, 1 − |w − 100| / 12)`: a platoon advances only within 12% of the set point (97% → 0.75 of full pace). Full pace covers the route (line of departure to the seize line beyond the bridge) in about 11 s (`rate` 0.09 per s). The bridge counts as taken when the lead squad is over it (`seize` 0.9 of the route). Men down: a platoon on the open road in the gun's reach (0.12–0.86 of the route) while the gun is in place loses 0.8 per s halted, 0.25 per s moving, capped at 4 per run; taking a defended bridge costs 1 friendly and 2 enemy; a bridge crossed after the enemy pulled back costs none. Runs restart (troops fade and return to the line of departure) at each 16 s tour lap, or 4 s after the lit platoon holds its bridge when the tour is off. Reduced motion shows a whole run at rest for the current situation.

**Readout (field view only):** `Linked|Jammed · gov N% · crank N% · B vs R down`, at most 44 characters (the % signs drop if a two-digit count would push it past 44). The machine view keeps its original readout.

**Tested numbers (`model.test.mjs`):** linked at load 0.7 → both bridges taken, 2 vs 4 down; jammed from the start at load 1.0 → lit platoon takes its bridge on the covered route, waiting platoon (70%) stays at the start line; both under way 4 s, then jammed at load 1.0 → waiting platoon halts in the open and loses 4, 5 vs 2 down; load 0.5 → enemy pulls back, bridges crossed without a fight, 0 vs 0; readout ≤ 44 characters.

**Layout.** Field SVG 640 × 330 (the card's shape), `preserveAspectRatio="xMidYMid slice"`, projection fitted to the ground rect u ∈ [−98, 96], v ∈ [−126, 126] (azimuth 55°, elevation 42°). Roads at v = ±38, masking hedges 15 outside them, covered routes 25 outside; woods outside the covered routes; enemy positions and MG nests on the far bank; hamlet in depth. 57 soldiers at most (40 platoon, 3 headquarters, 12 enemy, 2 medics). Soldiers drawn 1.5× scale.

**Checks run (2026-10-13).**
- `model.test.mjs`: all passed (original engine tests unchanged, plus the battlefield tests above).
- `lines.mjs` via `drive.mjs`: field view mid-tour `line ends: 0 of 348`; field pose 2 (link up 4.5 s, then jammed at load 1.0, lit platoon on its bridge, readout "Jammed · gov 97% · crank 70% · 5 vs 2 down") `0 of 352`; machine view at rest `0 of 416`; machine pose 2 (jammed, load 0.55, "Link cut · governed 102% · cranked 127%") `0 of 416`; phone 390 px field view `0 of 356`; reduced motion field view `0 of 352`.
- Console clean in every run; no sideways scroll at 390 px (scrollWidth 390).
- Frame timing (rAF wrapper, 6 s of tour in the field view): desktop 60.0 fps, JS p50 0.60 ms / p95 1.70 ms; 390 px with 4× CPU throttle 59.7 fps, JS p50 2.20 ms / p95 4.80 ms, worst gap 33 ms.
- 4× close-ups: headquarters mast, guy lines and signal arcs; lit platoon at the start line; waiting platoon pinned on the road with casualties, medic and the MG fan. Fixed after the shots: platoons were on the wrong sides (governed now left, matching the machine); the lead squad formed its line beyond the bridge before the enemy there had gone (the bridge now counts as taken when the lead squad is over it); fans lengthened to cover the road; layout pulled in so the phone crop keeps both covered routes.
- Thumbnail: the machine thumbnail is kept.
