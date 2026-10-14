# Operational Pause: method

An isometric bench model of an operational pause, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT).

## Build

```sh
node interactive/maneuvers/operational-pause/scripts/build.mjs      # writes interactive/maneuvers/operational-pause/index.html
node interactive/maneuvers/operational-pause/scripts/model.test.mjs # checks every model number quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (everything above the plate, static and moving), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (plate, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Two rams on rails (cylinder block, rod, crosshead, ram head). Ram A is the far one, ram B the near one | Two components of one force |
| Tank above each ram, with a lit fuel column in its sight glass | What that component has left to keep operating (sustainment) |
| A ram that halts at home when its tank can't pay for another stroke | That component's operational pause |
| One shared pump, header and valves (lever turns toward the viewer on the tank being filled) | Regeneration and resupply during the pause |
| Anvil beam on springs | The enemy, under pressure |
| Dial gauge | Enemy combat power (notional) |
| "Pause together" / "Alternate pauses" | Whole force halts at once vs. JP 5-0's alternating pauses among components |

## The model (all notional)

- Stroke: 0.9 s out and back; the strike lands at mid-stroke, with the ram on the anvil.
- Tank: a full tank pays for four strokes (0.25 per stroke, paid as each stroke ends). A ram only begins a stroke its tank can pay for, so it halts when the tank is empty, and restarts when the tank is full.
- Pump: 0.45 tank-fulls per second by default (slider 0.10 to 0.60), split evenly between the tanks it is filling.
- Enemy: each strike removes 3.5% of its remaining combat power; while no ram is pushing it recovers toward 100% at 15% of the gap per second; it does not recover while any ram pushes.
- Pause together: both rams run 3.6 s, then both halt about 4.4 s. Over 40 to 60 s the dial swings between about 60% and 80%.
- Alternate pauses: one ram pushes while the other refills (2.2 s at the full pump rate, inside the 3.6 s run), so some ram is always pushing and the dial keeps falling: about 31% at 30 s and 9% at 60 s.
- Alternation needs the pump to refill a tank within one run: 1 / 3.6 s = 0.28 tank/s. At 0.27 gaps open; at 0.28 they don't.
- These numbers are a teaching shape. They are not drawn from any data set, and the page says so. The page attributes the conclusions to "this model", and quotes JP 5-0's other branch (a properly executed pause leaves the enemy unable to regain the initiative).

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed (asserts 4 strokes per tank, 3.6 s push and ~4.4 s halt, 60/80% band, no gap and 9% at 60 s when alternating, the 0.28 tank/s threshold, one strike per stroke per ram, readout lengths under 45 chars).
- `scripts/lines.mjs` at rest (load, both pushing): `line ends: 0 of 298`.
- `drive.mjs` pose 2 (alternate mode, ram A mid-stroke on the anvil, B refilling, valve open, frozen with `window.__operationalPause.stop()`), then `["lines"]`: `line ends: 0 of 298`.
- Captures: desktop 1440 light, phone 390 (no sideways scroll), reduced motion (static frame, readout "Both pushing · enemy 100%"). Console clean on every run.
- 4x close-ups: tank, sight glass and pump; header, tee and valve levers; anvil, springs, seats and ram head at strike. Fixes made after looking: fuel column given a grey fluid tint (it read as an empty white pill), beam lowered so the striking head shows above it, back block lowered so the springs show, spring seats added so the coil ends land on a part, rails shortened so they end clear of the anvil.
- No geometry audit (`kit/audit.mjs`): no tube or lathe parts are used, which is the case where the kit requires it.
- Part count: 86 solids in the rendered SVG (including the 8 foot pieces).

## Battlefield view (added 2026-10-13, terrain kit)

Machine | Battlefield toggle (buttons under the card, V key, `localStorage["maneuvers.view"]`), copied from Fig 1 and Fig 10. `scripts/field-scene.mjs` draws full-bleed terrain with `kit/terrain.mjs`; the same `model.mjs` state `S`, the same controls (pause plan, pump rate) and the same readout drive both views.

Scale: operational (TERRAIN.md table). One small tracked vehicle = a platoon, three = a company, nine = a battalion.

| On the ground | Bench part | Driven by |
|---|---|---|
| Battalion A (north, far) and B (south, near), each nine vehicles | Rams A and B | `S.units[i].running`: attacking at its attack position, lit, firing |
| Battalion pulls back (behind a smoke screen) to its fuel and ammo point (FAP), staked on pegs beside a road, with two tanker trucks and ammunition stacks | A ram halted at home while its tank refills | `!running && fuel < 1`; the tankers close up on the parked rows while it refuels |
| Ready position halfway forward | A full ram waiting for its turn (alternate mode) | `!running && fuel == 1` |
| Three supply trucks on one road from the depot, each trip to whichever FAP is refuelling | The one shared pump | trip rate = pump / 2.4 trips per second (5.3 s round trip at 0.45) |
| Enemy battalion, nine vehicles in scrapes along the village edge, fire fan west | Anvil and dial | `min(8, round(9 x (1 - S.enemy)))` vehicles knocked out (grey, smoking); while no battalion attacks, enemy supply trucks come forward and replacement vehicles drive up the road into empty positions as the dial recovers |
| Friendly wrecks at the attack line, an ambulance (white roof) shuttling to the FAP | none | `losses(mode, pump).blue` |

The page measures between frames (`FM`): each battalion's eased, speed-limited pull-back (0 in contact, 1 at the FAP, 0.5 ready; 0.75 per second max, per-vehicle stagger), its speed (turns vehicles round and fires the smoke screen), the supply trucks' trip targets, replacement progress (1.6 s from the enemy rear) and the enemy resupply easing. Time is compressed like the bench's.

Notional losses (`losses()` in model.mjs, tested): over the first minute of a plan from a fresh start, friendly vehicles = round(0.1 x the integral over time of [battalions attacking x enemy combat power]); enemy vehicles = round(9 x (1 - enemy power at 60 s)). Default pump: together 4 friendly / 4 enemy; alternating 2 / 8; alternating with a 0.2 tank/s pump 3 / 3. Shown in a line under the card in both views.

Decisions made without the owner (overnight authority): mechanized battalions as vehicle clusters; FAPs behind each battalion rather than one shared point, with one shared supply column as the pump; a waiting (full) battalion moves to a ready position; the attacking battalion(s) are lit, so in "pause together" both are lit and then neither (one lit element at a time when alternating); casualties as vehicles, not soldiers, at this scale.

Checks (2026-10-13): `model.test.mjs` passes (adds the loss figures). Line ends 0 in the field view in two poses (tour, alternate mode with B at its FAP, enemy 42%) and at 390 px, and in the machine view at rest and in pose 2 (switched with the V key); 0 in reduced motion in both views. Console clean at 1440 and 390 px; no sideways scroll at 390 (scrollWidth 390). Frame timing, 6 s of the tour in the field view: desktop 60.0 fps, JS p50 0.40 / p95 1.30 ms, no gap over 25 ms; 390 px, DPR 3, 4x CPU throttle 59.5 fps, JS 1.20 / 3.40 ms, three 33 ms gaps. 38 units (18 battalion vehicles, 9 enemy, 4 tankers, 3 supply trucks, 2 enemy trucks, up to 2 ambulances). 4x close-ups of a FAP, battalion A's line with a tracer, and the enemy positions with a wreck. Machine thumbnail kept.
