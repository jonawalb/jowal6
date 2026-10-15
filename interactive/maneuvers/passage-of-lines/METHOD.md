# Passage of Lines and Relief in Place: method

Figure 51 of the Maneuvers section. An isometric two-comb bench plus a company-scale Battlefield view, drawn with the shared Anatomy kit (`../kit/iso-kit.mjs`, MIT) and the terrain kit (`../kit/terrain.mjs`, recipe in `../kit/TERRAIN.md`). Built 2026-10-14 to the v2 builder brief.

## Build

```sh
node interactive/maneuvers/passage-of-lines/scripts/build.mjs      # writes index.html
node interactive/maneuvers/passage-of-lines/scripts/model.test.mjs # checks every model number the page quotes
```

`index.html` is generated: edit `page.html` (text and chrome), `model.mjs` (the run), `scene.mjs` (machine parts, rebuilt per frame), `field-scene.mjs` (Battlefield) or `build.mjs` (plate, live code). The page follows the v2 conventions: IBM Plex plus `/interactive/maneuvers/maneuvers.css`; Battlefield default (`localStorage["maneuvers.view.v2"]`, a stored "machine" overrides); daylight terrain palette; the `.ex-switch`, `.ex-machine` and `.ex-field` blocks; a Reset button. `window.__pl` exposes `stop`, `reset`, `seek(mode, k, t)`, `change`, `goNow`, `setView`, `snapshot` and `load`. Keys: arrows set how many platoons move together, M the operation, Space starts, V the view.

## The idea

Both operations put two units on one piece of ground. The bench has two combs: a stationary comb (three blocks, the stationary unit's platoon positions; the outgoing unit in a relief) and a passing comb (three lit carriages, the passing company's platoons; the incoming unit in a relief). One setting, k = platoons moving together (1, 2 or 3), drives both operations.

| Part | Stands for |
|---|---|
| Three blocks with a roof post and a slit | Stationary unit's platoon positions (outgoing platoons in a relief); they back out to the rack in a relief |
| Three numbered carriages (lit) | Passing company's platoons (incoming platoons in a relief) |
| Rack at the left | Assembly area |
| Two rails through the gaps between the blocks | The two lanes (notional), through "gaps in stationary unit positions" (FM 3-90 16-20) |
| Gate bar on each lane at x = contact point | Contact point; closed while a platoon waits for the lane, open while one uses it |
| Two posts with pennants on each lane at the blocks | Passage point |
| Bar across the plate forward of the blocks, posts and pennants at the ends | Battle handover line (BHL) |
| Pad with six pegs | Enemy outpost; pegs drop as defenders are put out |
| Dial with a pin beside it | The moment enemy fires land (notional); the pin pops while they do |
| Three-peg meter | Platoons through their passage points (relief: in place) |
| Slide, small carriage moves left to right | Who holds the ground: stationary unit until two of three platoons are through, then the passing unit |
| Rack of 6 + 6 pegs | Men down, passing company and outpost |
| Rule with a collar | k |

## The Battlefield view (company scale, platoons drawn as squads and fire teams)

Soldiers drawn at about 1.5x scale. Passing or incoming company: three squads of nine (lit), waiting at the left. Stationary or outgoing company: three platoon positions of two fighting holes each, a fire team in each, one machine gun nest in the middle position. Two lanes between them, marked by dashed chalk on pegs. A contact-point flag at the left end of each lane, a passage-point flag at the positions, a guide soldier at each flag (four). A dashed chalk BHL across the front. Enemy outpost: six defenders in holes on the rise, with an objective flag. 49 soldiers in all (27 + 12 + 4 + 6).

Passage: each squad is one file along its lane; a squad that must wait for a lane halts at a holding point short of the contact point (the third squad when k = 3, since lane 0 is in use by the first). The stationary fire team fires on the outpost until T2 + 2 s (the passing force masks them); the passing squads hold fire until past the BHL (ATP 3-21.8 6-41), then fire from the assault position; the outpost fires on whoever is in the area, in a short heavy burst in the salvo window. Relief: incoming squads go to the holes (four soldiers) and a reserve line behind them (five); outgoing teams leave by a different route to the rear (FM 3-90 15-29 on one-way routes). Men down are greyed and prone where they were hit.

## The model (all notional; no source gives a time, a lane count for a company, a detection threshold or a casualty count)

| Quantity | Value | Why |
|---|---|---|
| Platoons | 3 | a company |
| Lanes | 2 | bench choice; FM 3-90 table 16-1 gives BCT minimums only |
| Assembly area to contact point | 3.0 s | |
| Lane held per platoon | 4.0 s (passage point at half) | |
| BHL to assault position | 3.0 s | |
| Platoons start | k = 1: 0, 4, 8 s; k = 2: 0, 0, 4 s; k = 3: 0, 0, 0 s | wave j leaves when the lane ahead clears |
| Lane use | platoons 1 and 3 in lane 0, platoon 2 in lane 1 | |
| Enemy fires land | 5.0 s | |
| Platoons down | platoons in the area at 5.0 s, plus one if a platoon is halted at the contact point | concentration |
| Outpost defenders put out | round(8 - 0.6 x T2), 1 to 6, one each 1.2 s from T2 + 2 s | later handover, fewer |
| T2 | second platoon through its passage point | FM 3-90 16-29 "two-thirds" (2 of 3) |
| Relief: move in / exchange / withdraw | 4.0 / 2.0 / 4.0 s | |
| Relief starts | k = 1: 0, 6, 12 s; k = 2: 0, 0, 6 s; k = 3: 0, 0, 0 s | next pair moves when the previous incoming platoon is in position (ATP 3-21.8 6-25) |
| Enemy notices | three pairs moving at once | threshold chosen; FM 3-90 15-3 says only that a simultaneous relief is "more easily detected" |
| Relief men down | detected: 2 x (pairs mixed at 5.0 s) - 1 vs 2; otherwise 1 vs 1 | |

Outcomes (`finalState`): pass k=1: 18 s, control at 9 s, 1 vs 3 down; k=2: 14 s, control at 5 s, 2 vs 5; k=3: 14 s, control at 5 s, a platoon halted 4 s, 4 vs 5. Relief k=1: 22 s, control at 12 s, 1 vs 1; k=2: 16 s, 6 s, 1 vs 1; k=3: 10 s, 6 s, detected, 5 vs 2. The readout is "Phase · N of 3 through (or in) · F vs E down", at most 45 characters.

## Choices made (owner can reverse)

- One setting for both operations: k is "platoons moving together" in a passage and "platoons relieved at once" in a relief (1 = sequential, 3 = simultaneous, 2 = the model's own in-between, labelled as not a named variation). Staggered relief is not modelled: the manual defines it as a sequence set by the tactical situation, not geography.
- The responsibility slide and BHL colour use "two of three platoons" (FM 3-90 16-29 for a passage, ATP 3-21.10 5-52 "a majority" for a relief). The page states that FM 3-90 15-25, ATP 3-21.10 5-81 and ATP 3-21.8 6-32 give other triggers.
- Rearward passage is described in the text but not modelled.

## Checks run

- `node scripts/model.test.mjs`: passes (plan times for every k in both modes, lane never held by two platoons, outcomes, monotone men down, readouts under 45 characters, control passes at T2).
- Line check (`["lines"]`): `line ends: 0` in the Battlefield (two poses: passage k=3 t=4, relief k=3 t=6) and in the Machine view (three poses).
- Console clean; no sideways scroll at 390 px (scrollWidth 390); Reset returns the load-state snapshot in both views; `.ex-field` shows only in Battlefield view and `.ex-machine` only in Machine view.
- Frame timing, field view, 6.5 s of the idle tour: 60 fps at 1200 px (JS p50 0.4 ms, p95 0.8 ms) and at 390 px (p50 0.4 ms, p95 0.7 ms).
