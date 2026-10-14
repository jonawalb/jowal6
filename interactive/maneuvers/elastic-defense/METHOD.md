# Elastic Defense in Depth: method

An isometric bench model of the German elastic defense in depth (1917), drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT), with a Battlefield view on full-bleed terrain (`../kit/terrain.mjs`). Both views draw from the one state machine in `scripts/model.mjs`; `scene.mjs` (machine) and `field-scene.mjs` (battlefield) only draw.

## Build

```sh
node interactive/maneuvers/elastic-defense/scripts/build.mjs      # writes index.html
node interactive/maneuvers/elastic-defense/scripts/model.test.mjs # checks every number the page quotes
```

`index.html` is generated. Edit `scripts/page.html` (text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers and phases) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Lit ram on a carriage | The attack |
| Long drive spring from the launcher, losing force as it stretches | The attack's push falling as it outruns its artillery (Lupfer p. 12) |
| Light front plate | Outpost zone |
| Second plate | Main line of resistance (forward edge of the battle zone) |
| Third plate | Positions within the battle zone |
| Springs between plates, stiffer with depth | Echelons growing stronger with distance from the front (Lupfer p. 12) |
| Flank carriage on cross rails, with a wedge blade, latch pin and heavy spring, beside the track | The counterattack, held until the attack stalls, then driven into the attack's flank (FM 3-90 para. 9-33); the wedge turns the side blow into a push back along the rails |
| Roller on an outrigger behind the ram's head | Where the counterattack takes the attack |
| Fixed rear stop | The rear of the battle zone, which the last spring bears on |
| Engraved bands and ruler (0.25 km ticks, zone lines at 0, 0.75 and 2.75 km) | Outpost, battle and rear zones on a notional km scale |
| Dial gauge: lit needle = push, short needle = what the defense pushes back with | The balance of forces |
| Rigid mode: the same three plates bolted together at the front line; the flank carriage drawn back 5 units and latched | Forward defense / holding the forward line at all cost, with nothing held back |

## The model (all notional)

- Depth d in notional km from the outpost line, at the ram's nose. Bench scale 40 units per km.
- Push: `a · (3.2 − d) / 3.9`, 100% at the start line (d = −0.7), zero at 3.2 km; 82% at the outpost line. Attack weight a from 60% to 160%.
- Elastic stack: plates rest at 0, 0.75 and 1.75 km; the rear stop face at 3.0 km; plates bottom out 0.1 km apart, so the stages end at d = 0, 0.65, 1.55, 2.7 km. Resistance rises linearly 5% → 25% → 65% → 120% across the stages, and is solid at 2.7 km.
- Stall: the depth where push = resistance (bisection). 0.9 km at 60%, 1.2 km at 100%, 1.6 km at 160%. Every slider weight stalls in the battle zone.
- Motion: overdamped creep, speed = 3.0 km/s × net force. After a stall, 0.8 s pause, then the latch lifts and the flank carriage's stroke c eases from 0 to 1 (time constant 0.45 s). The wedge's contact depth is `faceDepth(c) = 1.75 − 1.1·c` km (1.75 km at c = 0, deeper than any stall, so the carriage first closes on the ram from the side; 0.65 km at c = 1, MLR plate home). The ram sits at min(stall depth, faceDepth). Bench geometry: roller 22 units behind the ram's nose at y = −46; wedge face slope 1 in y per 2 in x, so the 22-unit stroke moves the contact 44 units (1.1 km) along the rails. The gauge's short needle shows push + 25% once the wedge bears.
- Rigid wall: breaking load 70% of push, met at the outpost line where the push is 82% of the attack weight, so it breaks for a weight above 0.70 / 0.82 = 85.3% (85% holds, 90% breaks). The page states both numbers and says which is which. Once broken nothing resists until the ram closes the buffer spring on the fixed rear stop (stops at 2.94 km, read "2.9 km deep"). In rigid mode the flank carriage is stowed 5 units further out and stays latched, so the ram's roller passes clear of the blade.
- Casualties (`casualties(S)`, notional, counted in the Battlefield view's drawn force of 24 attackers and 33 defenders): elastic, attacker 22%/km of the deepest point reached + 15% × the share thrown back by the counterattack; defender 6%/km + 10% × that share (100% weight: 10 vs 6; 60%: 8 vs 5; 160%: 12 vs 6). Rigid, attacker 10% × share of the approach closed + 20% if held + 8% × share of the run after a break; defender 15% × approach share (barrage on the packed trench) + 40% × run share (overrun). Held: 7 vs 5; broken: 4 vs 18. Readout ends "N vs M down" (attacker vs defender).

None of these numbers is data. The page says so in "What is notional".

## Battlefield view (`scripts/field-scene.mjs`)

Scale: a vignette of a German regimental sector in 1917 at small-unit scale (one figure stands for many; TERRAIN.md's company/battalion row would lose the strongpoints and waves the concept needs). The attack runs in world −x like the ram; the counterattack comes from world −y like the flank carriage. 52 units per notional km of depth: jump-off trench −0.8 km, front trench with wire 0.15 km, MLR 0.75 km, strongpoints 1.1–2.0 km, artillery protective line 2.75 km (all notional).

| Element | State that drives it |
|---|---|
| Three waves of eight attackers (lit), 15 units apart, one light MG and one leader per wave | `S.d` (lead wave = ram nose depth); stand and walk while advancing, prone when stalled or held, walk back facing the rear while the counterattack throws the ram back |
| Outposts (3 × 2), MLR posts (3 × MG + rifleman), strongpoints (3 MG horseshoes × 3), each MG's fire sector on the ground | fixed in elastic mode; they fire at attackers in range |
| Counterattack force (12) by a wood at the rear of the battle zone, far flank | `S.c`: moves round to the flank of the stalled lead wave until the wedge's contact depth reaches the stall, then drives in and back with the ram |
| Rigid mode: all 33 defenders in the front trench | `S.bunch` morphs every defender to a trench slot; after a break the men nearest the lane go down in the trench and the rest fall back ahead of the attack |
| Shell bursts (flash, puff, smoke at the impact point) | attackers' barrage 28 units ahead of the lead wave while advancing (on the trench in rigid mode); defenders' fire behind the last wave while stalled or held |
| Greyed prone figures, a stretcher-bearer at the attackers' collection point | `casualties(S)`: per-km losses lie where their wave was when the lead reached that depth; counterattack, wire and overrun losses where they were caught |

Soldiers are the kit's figures at 1.5× scale with a helmet brim (attackers) or flared rim (defenders) added in `fieldHelmet`. No map symbols, no chalk control measures (none in 1917).

## Checks run (2026-10-13, rework and Battlefield view)

- `node scripts/model.test.mjs`: all passed (adds the 70%/82%/85% chain, the wedge's 1.75 km first contact, readouts with casualties, loss rates).
- `scripts/lines.mjs` via drive sessions: field elastic counterattack 0 of 124; field restored 0 of 124; field rigid broken-through 0 of 118; machine rigid broken-through 0 of 376; machine elastic restored 0 of 434; machine stalled and mid-counterattack checked visually at 2× and 4×.
- Console clean in every session; no sideways scroll at 390 px (scrollWidth 390); reduced motion shows a still frame in both views.
- Frame timing, tour running in the field view for 6 s: desktop 60.0 fps, JS p50 0.40 ms / p95 1.30 ms; 390 px with 4× CPU throttle 59.7 fps, JS p50 1.20 ms / p95 3.80 ms (one 50 ms gap, at a mode switch when new soldier looks render).
- Thumbnail re-shot from the reworked machine (mid flank counterattack).

## Checks run (2026-10-13, first build)

- `node scripts/model.test.mjs`: all passed (push, stages, resistance, stall range, breaking weight, full elastic and rigid runs, readouts under 45 chars).
- `scripts/lines.mjs` at rest: `line ends: 0 of 416`. Drive sessions: elastic restored pose 0 of 416; rigid ready (plates bolted) 0 of 364; rigid broken-through 0 of 358.
- Captures: desktop 1440 (desk.png), phone 390 (phone.png), reduced motion; console clean, no sideways scroll at 390.
- 4× close-ups of the plate stack at the stall, the ram carriage and drive spring, the counter carriage with latch and anchor, and the gauge. Fixed after review: the launcher's spring seat drawn over the block, the counter spring's anchor end floating (weld dot added), the buffer spring overlapping the ram in the rigid run (it now closes under the ram), gauge tick count.
- 80 solids, about 670 paths at rest. No tube or lathe parts, so no `--audit` (as in flank-attack).
- Not done: the shards are prisms, so a broken plate slides and turns aside rather than tipping over.
