# Clearing a Trench or Building (Fig 49): method

## Object to concept
| Part | Concept |
|---|---|
| Four pins in a row, one to four dots | The four points to clear, in order (corners and junctions of a trench, or rooms) |
| Interlock bar growing along the row | A point is set only after the one before it |
| Lit key carriage on the front rail | The lead team; it advances to a pin only when the pin before is set |
| Second carriage on the rear rail | The other team, holding the point just cleared (crowds the key when nobody holds) |
| Turntable on the key carriage | The lead swaps between the two teams at each point (only when the teams alternate) |
| Shield at the left end of the rails | The support element's fires isolating the entry point (up when applied) |
| Row of pegs behind the pins | The enemy, one for each point; a fifth appears if a cleared point is not held |
| Dial, wear bar, loss rack | Points set of four; how fresh the lead team is; men down (9 and 5 pegs) |

Battlefield: a rifle squad (squad leader + two fire teams of four, drawn in file) clears four points of a zigzag trench line or of a roofless building (hall with two rooms each side, west door the entry). A support element of two MGs with assistants and riflemen sits in a chalk box outside; a platoon medic goes to the latest friendly casualty. One enemy soldier holds each point. Markers (posts) appear on points the team behind has secured and marked. Trench or Building (M key) is the same four points in another place.

## Doctrine (the only sourced content)
Drill names and dates: ATP 3-21.8 (11 Jan 2024, incl. C1 June 2025) para E-2 (p. E-2), References (p. References-4). The manual does not print the steps. Clear definition: FM 3-90 (1 May 2023) para B-16 (p. B-4). Assault in buildings: ATP 3-21.8 para 4-113 (p. 4-41); column/file inside a building: para 3-48 (p. 3-13); fire and movement: para 1-9 (p. 1-4); squad composition 1-9, medic 1-22. Trenches: ATP 3-21.10 (1 June 2026) para 2-179 (p. 62). Routes: ATP 3-06/MCTP 12-10B (July 2022) para 3-22 (p. 3-7). Older drill step text (2008 compilation): quoted as history only.
The sequence "lead team clears while the other holds, leads swap" is THIS FIGURE'S device, labelled so on the page.

## The model (all NOTIONAL, labelled so on the page)
`scripts/model.mjs`, a closed-form function of figure time t and three options (support fires, teams alternate, secure behind). Entry 1.5 s (+1.0 s without support). A point takes 3.0 s; without alternation 3.0 x (1 + 0.3 i) for point i. Without a team holding behind, the clearing is held up 2.0 s at point 3 and an enemy re-enters point 2 at 0.9 s after it was set and is dealt with 1.8 s later.
Friendly down: one at 1.2 s before point 3 is set (always); +1 at 0.7 s before the entry if no support; +1 at 1.0 s before the last point if the same team keeps the lead; +1 at 1.5 s after point 2 is set if nobody holds behind. Enemy down 0.7 s before each point is set.

| Support | Alternate | Secure | Result (friendly vs enemy down), end time |
|---|---|---|---|
| on | on | on | 1 vs 4, 13.5 s |
| off | on | on | 2 vs 4, 14.5 s |
| on | off | on | 2 vs 4, 18.9 s |
| on | on | off | 2 vs 5, 15.5 s |
| off | off | off | 4 vs 5, 21.9 s |

## Choices made
- The doctrine does not give a clearing "sequence" with stopwatch times; the page says so and calls the sequence this figure's own.
- Alternation in movement needs a team to hold what it cleared, so with "secure behind" off the teams move together in a column whatever the alternate option says.
- Trench drill is a platoon drill in the manual; the figure's element is a squad (named on the page).
- Casualties shown as prone greyed figures and a medic going to the latest man down; nothing graphic.

## Checks run (2026-10-14)
- `node scripts/model.test.mjs`: passes.
- `node scripts/build.mjs`: succeeds; index.html contains maneuvers.view.v2, maneuvers.css, IBM+Plex, ex-machine, ex-field, fd-reset.
- lines.mjs: line ends 0 in machine view (two poses) and field view (trench: two poses; building: two poses).
- Console clean; 390 px: scrollWidth 390, no sideways scroll; per-frame JS (state + draw) p50 0.1 ms, p95 0.2 ms at desktop (loop of seek calls; not a rAF fps trace).
- Reset restores the load-state snapshot; .ex-field shown only in Battlefield, .ex-machine only in Machine.
- Not run: 4x CPU-throttled phone frame trace.
