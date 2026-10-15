# Troop Leading Procedures (Fig 52): method

## Object to concept
| Part | Concept |
|---|---|
| Two glass chambers joined by a pipe and valve, twelve hours of sand | The notional twelve hours from receiving the mission to the line of departure; left chamber = hours the leader keeps, right = hours given to the squads (the slider moves sand through the pipe) |
| Bright collar on the left chamber at 4 h | One third of the time (FM 5-0 para 7-7; ATP 3-21.8 paras 2-19, 2-24) |
| Ring on the left chamber at 3 h | NOTIONAL: the hours this model gives the leader to take steps 1 to 7 without abbreviating them |
| Rings on the right chamber at 2, 4, 7 h | NOTIONAL: the squads' three tasks (plan 2 h, check 2 h, rehearse 3 h), done in order |
| Eight lamps on the back rail, numbered by dots | The eight steps in the order ATP 3-21.8 para 2-16 lists them; the lit one is the step being done now |
| Carriage on the front rail, strips under it, gate | The clock; leader's strip and squads' strip; the line of departure (assault drawn for 2 more notional hours) |
| Dial "TASKS" | Share of the squads' seven-hour list covered by the hours they are given |

Battlefield (platoon scale, soldiers): rifle platoon (three squads of nine as drawn: a leader and two fire teams, plus platoon leader, radio operator, platoon sergeant) in an assembly area at the left; lit platoon leader and RTO at a chalk terrain model; chalk line of departure; a rise with three two-man positions (six enemy). Claims drawn from sources are in FACTCHECK.md; all numbers are notional.

## Doctrine (the only sourced content)
Eight steps and wording: ATP 3-21.8 (11 Jan 2024, incl. C1 June 2025) para 2-16, p. 2-9; FM 5-0 (4 Nov 2024, incl. C1 Aug 2025) para 7-3, p. 149. Not rigid: FM 5-0 7-3; ATP 3-21.8 2-2. One-third / two-thirds: ATP 3-21.8 2-24 (p. 2-12) and 2-19 (p. 2-10); FM 5-0 7-7 (p. 150); ADP 5-0 (31 Jul 2019) 2-128. WARNORD and parallel planning: ATP 3-21.8 2-19 note, 2-20. Supervise and refine: 2-114. Abbreviated steps: ATP 3-21.10 (1 June 2026) B-7. Editions checked 2026-10-14 against the armypubs.army.mil listings (ATP 3-21.8 01/11/2024 with C1; ATP 3-21.10 06/01/2026; FM 5-0 11/04/2024 with Change 001; ADP 5-0 07/31/2019, all ACTIVE). The rule appears in current official sources, so it is used as doctrine; the wordings differ slightly (ATP 2-19 "planning" vs "preparation"; ATP 2-24 and FM 5-0 "leader keeps a third, subordinates two thirds") and the page says so.

## The model (all NOTIONAL, labelled so on the page)
`scripts/model.mjs`. Total 12 h; the leader keeps `split` hours (slider 2 to 8, start 4). Squads get 12 - split. Leader needs 3 h for steps 1 to 7 unabbreviated: plan completeness = min(1, split / 3). Squad tasks in order: plan 2 h, check 2 h, rehearse 3 h (seven in all); each task's covered share = clamp((squad hours - hours before it) / its length). Rehearsed share r is the third. Friendly men down = 1 + round(4(1 - r)) + round(2(1 - plan)); enemy down = 6 - round(3(1 - r)) - round(1(1 - plan)). Steps 1 to 7 fill the leader's block in the shares 7, 7, 36, 7, 21, 7, 15 per cent; step 8 runs from the order to the end. Clock pace 2 h/s; casualties fall one at a time during the assault (friendly from 0.50, enemy from 0.40 of the assault).

| Leader keeps | Squads | Rehearsed | Plan | Down (friendly vs enemy) |
|---|---|---|---|---|
| 2 h | 10 h | 1.00 | 0.67 | 2 vs 6 |
| 3 to 5 h | 9 to 7 h | 1.00 | 1.00 | 1 vs 6 |
| 6 h | 6 h | 0.67 | 1.00 | 2 vs 5 |
| 7 h | 5 h | 0.33 | 1.00 | 4 vs 4 |
| 8 h | 4 h | 0.00 | 1.00 | 5 vs 3 |

Readout: "Leader 4 h · squads 8 h · 2/3 done" before the line of departure, "Leader 7 h · squads 5 h · 4 vs 4 down" after (friendly vs enemy; under 45 characters, tested for every state). Aria-valuetext adds "hours, tasks and casualties are notional".

## Figure choices that are not doctrine (said so on the page)
Steps lit in list order (the manual says steps 3 to 7 are sequenced as needed); lamp 8 from the order to the line of departure; the platoon sergeant moving up stands for step 4; the leader's reconnaissance walk is shorter when the leader's block is short; the model ignores parallel planning started on the WARNORD (so it is harsher on a leader who keeps time).

## Checks run (2026-10-14)
- `node scripts/model.test.mjs`: passes (eight step names, one third = 4 h, task coverage, outcomes above, monotonic in hours kept, step order, casualty counts, readout under 45 characters in all states).
- `node scripts/build.mjs`: writes index.html; contains maneuvers.view.v2, maneuvers.css, IBM+Plex, ex-machine, ex-field, fd-reset.
- `lines.mjs` through drive: line ends 0 in the Battlefield view (clock 3.2 split 4; clock 13.4 split 8) and in the Machine view (clock 3.2 split 4; clock 11 split 7).
- Console clean (desktop and 390 px); no sideways scroll at 390 px (scrollWidth 390).
- Reset returns the load-state snapshot (model, slider, button text and aria-pressed, view buttons, readout) in both views; `.ex-field` shown only in Battlefield view and `.ex-machine` only in Machine view (computed display block/none).
- Frame timing in the field view, 6 s of the tour: 60 fps, JS p50 0.2 ms, p95 0.4 to 0.7 ms (desktop and 390 px, no CPU throttle).
- thumb.png: Battlefield, split 4, clock 9.6 (the leader walks the squads' lines while they rehearse); 800 x 500.
