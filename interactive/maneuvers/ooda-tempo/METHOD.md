# OODA Loop and Tempo: method

An isometric bench model of Boyd's observe–orient–decide–act loop and of tempo, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT). Size: Hero, 145 solids, about 1,210 paths.

## Build

```sh
node interactive/maneuvers/ooda-tempo/scripts/build.mjs      # writes interactive/maneuvers/ooda-tempo/index.html
node interactive/maneuvers/ooda-tempo/scripts/model.test.mjs # checks the model numbers quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (all parts, static and moving), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (plate, card, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Two 48-tooth wheels, Blue left and Red right | Each side's loop; one turn is one cycle |
| Stator disc under each wheel, split into four quarters by engraved lines; the bright line at 0° | The four stages; the start of each cycle (observe begins) |
| Cam block (rider) on each wheel; Blue's is the one lit accent | Where that side is in its cycle |
| Four stations round each wheel, each tripped by the rider through a follower arm and roller: periscope, compass card, slide switch, drop hammer | Observe, orient, decide, act. The hammer rises through the act quarter and drops as the cycle ends: the action landing |
| Motor, 12-tooth pinion, 20-tooth idler | The gear train that drives each loop |
| Tempo lever on a five-detent quadrant | Each side's cycle time (2 to 10 notional hours) |
| Differential housing with a two-hand dial, fed by a shaft from each idler | Laps gained: long hand one turn per lap Blue gains on Red, short hand one turn per eight laps |
| Rack of eight pins in front of each wheel | That side's last eight actions, newest nearest the middle; a raised pin was stale |

The circle is the popular simplified loop; the page says so and describes Boyd's own 1995 sketch.

## The model (notional)

- Cycle time T per side in notional hours, 2 to 10 in steps of 0.5; animation runs at 0.6 s per hour. Defaults Blue 4 h, Red 6 h. Starting phases 0 and 0.37 so the loops never cross in step.
- Four stages of equal length (a quarter turn each). A cycle begins at phase 0 (observe) and its action lands at phase 1.
- Stale rule (this model's own): an action is stale when the other side's loop boundary was crossed at least twice between this cycle's start and its action, i.e. the other side ran one whole loop inside this one.
- Long-run share of the slower side's actions that are stale, at steady tempos: clamp(T_slow / T_fast − 1, 0, 1). 0% at equal tempo, 20% at 6 h vs 5 h, 50% at 6 h vs 4 h, 100% at 6 h vs 3 h or any ratio of 2 or more. The faster side's share is always 0.
- Laps gained per hour: 1/T_blue − 1/T_red; at 4 h vs 6 h Blue gains one lap every 12 hours.
- The live tally is an event simulation (`advance` in `model.mjs`), so it wanders around the long-run share; the tests check it converges to within 2 points on five tempo pairs over 6,000 hours.
- Readout: both cycle times, then the slower side's tally (`Red stale 4 of 8`). Under reduced motion the figure stands still and the readout gives the long-run share instead (`Red stale 50%`).
- Gear tooth counts (48:20:12) are bench details; tempo comes from the motor speed the lever sets.
- Idle tour (15 s, loops): 3 s at equal tempo (6 h each), then Blue at 3 h against Red at 6 h. Any input stops it; it resumes after 9 s idle.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed.
- `scripts/lines.mjs` (Anatomy line-end check): `line ends: 0 of 564` at rest during the tour, and 0 in a second pose (Blue 8 h, Red 3 h, after 9 s, Blue pins raised) via `drive.mjs` `["lines"]`. One floating end (the non-lit rider's centre line, 1.02 px short) was found and fixed by running it edge to edge.
- Captures at 1440 px (desk.png) and 390 px (phone.png), light theme: console clean, no sideways scroll; readout stays inside its corner at 390 px.
- 3× and 4× close-ups of the stations (all four kinds on both wheels), rider and follower rollers, gear meshes, motor and pinion, differential, shafts and pillow blocks, pin racks and levers. Fixes made after them: station posts moved to the plinth's side so the devices are not hidden behind them; the decide switch raised above the wheel rim so the back station reads; quarter lines added across the stator disc; pins enlarged.
- Reduced motion: still frame, levers follow the keys, readout `Blue 5 h · Red 6 h · Red stale 20%` after two ArrowLeft presses.
- Frame rate in headless Chrome: about 60 fps with the per-frame rebuild.
- No geometry audit (`kit/audit.mjs`): the figure has no tube or lathe parts.

## Battlefield view (added 2026-10-13, terrain style)

Scale: platoon (an abstract idea shown as a concrete small-unit vignette). Reading: two platoons in broken farmland each run the bench's loop; the faster one relocates and acts before the slower one's actions land, so the slower side fires on positions already vacated. Files: `scripts/field-scene.mjs` (layout `FG`, `fieldStatic`, `fieldPose`, `fieldMarks`, `fieldNear`), wired into `build.mjs` and `page.html` as in Fig 1 (toggle buttons, V key, `localStorage["maneuvers.view"]`). The bench, its text and its readout are unchanged.

| On the ground | Stands for |
|---|---|
| Blue platoon (lit), left; red platoon, right: three rifle squads plus PL and RTO each (29 figures) | the two sides' loops (the bench's two gear trains) |
| Three positions per side behind hedgerows and on a low rise, visited 0 → 1 → 2 → 0 | relocation: in loop n a side halts at position n for the observe quarter (squads in line, PL standing), then moves to n+1 in squad column with teams in wedges, arriving as its action lands |
| A burst from every automatic rifleman when an action lands (`advance()` events) | the action; fresh → on the enemy platoon (which goes prone if halted); stale → on the position where this side last saw the enemy (never the one it now holds), plus the lead fire team rushing 18 units toward it and back |
| Fans on the ground, one per side | fire sector laid on where that side last saw the other (updated at each of its landings); a stale picture shows as a fan on empty ground |
| Greyed prone figures at each side's casualty collection point, a medic kneeling | `casualties()` counts |

Model additions in `model.mjs` (notional; the bench functions are untouched):
- `FIELD.rate = 0.5`: the battlefield runs the same simulation at half the bench's speed (0.6 s per hour becomes 1.2 s) so moves can be followed. Stale shares depend only on the tempo ratio, so the tally is unchanged.
- `casualties(T)`: men down in a notional 24-hour day = round(0.5 × the other side's fresh actions + 0.15 × own moves), fresh actions = 24/T_other × (1 − staleShare(T_other, T_own)), moves = 24/T_own. Blue 4 h vs Red 6 h → 2 vs 4; 6/6 → 3 vs 3; 3/6 → 1 vs 5; 2/2 → 8 vs 8; 2/10 → 2 vs 6. Every lever setting gives each side between 1 and 8 (tested).
- `fieldReadoutOf` / `fieldStillReadoutOf`: in the Battlefield view the readout is the slower side's tally plus "N vs M down" (Blue vs Red), e.g. `Red stale 4 of 8 · 2 vs 4 down`; the tempos stay on the slider outputs, so the line fits under 45 characters.
- Notional, not claims: positions, the halt-and-move schedule, distances (front positions 92 units apart), the rush, fire rates, figure scale (about 1.5×).

### Checks run (Battlefield view, 2026-10-13)
- `node scripts/model.test.mjs`: all passed (casualty values above, 1–8 bounds and readout length at every setting).
- `lines.mjs` via `drive.mjs`: Battlefield at rest during the tour 0 of 132 ends; second pose (Blue 8 h, Red 3 h, settled) 0; then V to the Machine view: 0 of 564 in both poses (Blue 8/Red 3 and Blue 4/Red 6). Reduced-motion Battlefield still: 0.
- Console clean in every session; no sideways scroll at 390 px (scrollWidth 390); phone shots of both views.
- Frame timing (rAF wrapper, 6 s of the tour in the Battlefield view): desktop 60 fps, JS p50 0.80 ms / p95 2.10 ms; 390 px with 4× CPU throttle 59 fps, p50 2.20 / p95 5.40 ms, worst gap 33 ms.
- Field budget: 60 soldiers, about 2,400 static paths.
