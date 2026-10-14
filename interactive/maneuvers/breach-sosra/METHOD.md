# Breaching (SOSRA) (Fig 44): method

## Object to concept
| Part | Concept |
|---|---|
| Five stations with pins, one to five dots | The breaching fundamentals in order: suppress, obscure, secure, reduce, assault |
| Interlock bar growing along the stations | A fundamental is set only after the one before it |
| Belt of tines across the rails; lane tines retract | The obstacle; the lane being reduced |
| Sled on its own rail with a reaching arm | The breach force (secure, then reduce, proof, mark) |
| Press over a pop-up target block | The support force's suppressive fire holding the enemy down |
| Screen that rises beyond the belt | Obscuration between the obstacle and the enemy |
| Lit carriage on the main rail | The assault force; it jams at the belt unless the chain is complete |
| Dial; rack of 8 + 6 pegs | Lane reduced; breach force and enemy down |

Battlefield: a company breach. Support force = 2 MGs with assistants + 2 riflemen on a rise, in a chalk box. Breach force = 8 (4 reduce and mark, 4 security, two of them going round the belt ends to the far side). Assault force = 12 in a column. Obstacle = two rows of concertina wire with mines between. Enemy = 2 MG nests + 4 fighting positions on a rise. Smoke = 13 drifting puffs between obstacle and enemy. Lit chalk = the reduction area; markers appear when the lane is complete.

## Doctrine (the only sourced content)
Names and order of the fundamentals: FM 3-90 (1 May 2023) para 18-23, p. 18-4; ATP 3-21.10 (1 June 2026) para F-23, p. 231. Three forces: FM 3-90 para 18-32, p. 18-7; ATP 3-21.10 para F-29, p. 232. Ordering constraints (secure before reduce; reduce only after suppression and obscuration): FM 3-90 paras 18-27, 18-30; ATP 3-21.10 paras F-26, F-27. Nothing else is doctrinal; see FACTCHECK.md. ATP 3-90.4 (10 June 2022) was not opened (not public).

## The model (all NOTIONAL, labelled so on the page)
`scripts/model.mjs`, a closed-form function of figure time t and which fundamentals are applied. Set times with all five: 1.5, 3.5, 5.5, 9.0, 12.5 s. A fundamental is set only if it and all before it are applied. Breach force leaves at 3.0 s and is at the point of breach by 5.5 s. Lane reduces 5.5 to 9.0 s, assault 9.0 to 12.5 s. Enemy 6, breach force 8.
Losses when the first missing fundamental is m: friendly down per second 0.9 (suppress), 0.45 (obscure), 0.5 (secure) from 3.0 s; 0.3 (reduce) from 5.5 s; 0.5 (assault) from 9.0 s; capped at 8 (3 for reduce, assault). The run is stopped at 10.5 s (12.5 s for assault). All five: 3 friendly down (7.0, 10.8, 11.8 s), 2 enemy down to the support fires (2.0, 3.0 s) and 4 to the assault (10.6 to 12.4 s). Without suppression the model kills no enemy.

| Applied | Result (friendly vs enemy down) |
|---|---|
| all five | far side seized, 3 vs 6 |
| without suppress | jam, 6 vs 0 |
| without obscure | jam, 3 vs 2 |
| without secure | jam, 3 vs 2 |
| without reduce | jam, 1 vs 2 |
| without assault | jam, 1 vs 2 |

## Choices made
- Company scale (FM 3-90 para 18-20: platoons cannot form support, breach and assault forces from squads).
- Strict chain in the machine: a station engages only after the one before it. The page says real breaches run suppression and obscuration while the breach force moves.
- Casualties shown as prone greyed figures and a medic going to the latest man down; nothing graphic.

## Checks run (2026-10-14)
- `node scripts/model.test.mjs`: passes.
- `node scripts/build.mjs`: succeeds; index.html contains maneuvers.view.v2, maneuvers.css, IBM+Plex, ex-machine, ex-field, fd-reset.
- lines.mjs: line ends 0 in machine view (rest pose and a jam pose) and field view (two poses).
- Console clean; 390 px: no sideways scroll; field view 60 fps, JS p50 0.3 ms / p95 0.5 ms (desktop).
- Reset restores the load-state snapshot (checked in field view); .ex-field shown only in Battlefield, .ex-machine only in Machine.
