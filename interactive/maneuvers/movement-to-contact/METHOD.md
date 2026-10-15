# Movement to Contact: method

Figure 48 of the Maneuvers section. An isometric bench model plus a company-scale Battlefield view, drawn with the shared Anatomy kit (`../kit/iso-kit.mjs`, MIT) and the terrain kit (`../kit/terrain.mjs`). Built 2026-10-14 to the v2 builder brief, from the Raid figure's structure.

## Build

```sh
node interactive/maneuvers/movement-to-contact/scripts/build.mjs      # writes index.html
node interactive/maneuvers/movement-to-contact/scripts/model.test.mjs # checks every model number the page quotes
```

`window.__movementToContact` exposes `stop`, `reset`, `seek(gap, lead, t)`, `change`, `goNow`, `setView`, `snapshot` and `load`. Keys: arrows set the gap, L toggles the lead element, Space starts, V switches view.

## The object (Machine view)

| Part | Stands for |
|---|---|
| Small lit feeler on a long coil spring, ahead of the carriage | The lead element (a squad), which meets the enemy first |
| Heavy carriage with a cab and two hinged wings (folded along the sides, then swung across the rail) | The main body shaking out from column to line |
| Spring compressing as the carriage closes on the stopped feeler | The gap closing after contact |
| Fire band across the rail at the right | The enemy's direct-fire reach (200 notional units) |
| Block with six posts at the end | The six defenders; each lies down as one goes out of action |
| Dial with a hand from contact and two pins (4.0 s shake-out, and the time the gap buys) | Time since contact; the carriage must be open before the second pin |
| Peg meter of six | Shake-out progress |
| Rule with a collar and an index | The gap set, and the gap now |
| Rack of 6 + 6 pegs | Men down, friendly and defenders |

## The Battlefield view (company scale)

Soldiers at about 1.5x scale. Lead element: a squad (two fire teams in wedge and the squad leader, lit); it goes ahead along the road, goes to ground when engaged at the edge of the enemy's reach and returns fire. Main body: two platoon groups drawn as a leader and two fire teams each, in two files, plus a company headquarters of three; it shakes out into a line (lateral spread) while still moving and fires once it is both in line and in reach. Enemy: four fighting positions and two machine-gun nests (six defenders) on a rise at the right. One dashed chalk line marks the edge of the enemy's reach. World x = 0.17 x model s.

## The model (all notional; no manual gives a distance or a time)

| Quantity | Value | Why |
|---|---|---|
| Speed of every element | 60 u/s | one speed |
| Lead engaged at | s = 330 (5.5 s) | 30 u inside the edge of the enemy's reach (s = 300; the enemy is at s = 500) |
| Main body shake-out | 4.0 s from contact | pin on the dial |
| Time the gap buys | (gap + 300) / 60 s into the run, i.e. (gap - 30) / 60 s after contact | head of the main body reaches s = 300 |
| Window | gap 270 to 360 (270 is `gapMin`; 280 to 360 on the slider) | shake-out done before reach; fewer than four lead men down |
| Hit in column (gap < 270, or no lead) | main body men down 0.6, 1.3, 1.9, 2.5, 3.2, 3.9 s after reach, while shaking out; shake-out 1.5 s longer (lead ahead) or 2.5 s longer (no lead); total friendly down capped at 6 | |
| Lead men down | 1.0, 2.5, 4.0, 5.5 s after contact while the main body is not yet in reach | |
| Defenders down | 0.8, 1.6, 2.2, 3.0, 3.6, 4.2 s after the main body fires | |

Outcomes (`finalState`): gap 280 or 300, complete, 3 vs 6; 360, complete, 3 vs 6; 260, main body hit in column, 4 vs 6; 0, hit in column, 6 vs 6; 380, lead unsupported, 4 vs 6; no lead, 6 vs 6. Readout "Phase · N vs M down", under 45 characters; phases use FM 3-90's headings Find, Fix and Finish the enemy.

## Checks run

- `node scripts/model.test.mjs`: passes.
- Line check: `line ends: 0` in both views in three poses each (march, shaken out, hit in column, no lead).
- Console clean; no sideways scroll at 390 px (390/390); Reset returns the load-state snapshot (checked in field and machine views); `.ex-field` shown only in Battlefield view and `.ex-machine` only in Machine view.
- Frame timing at 390 px, field view, idle tour: 60 fps (p50 and p95 16.7 ms frame interval).
