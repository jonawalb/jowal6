# Casualty Evacuation (Fig 54): method

## Object to concept
| Part | Concept |
|---|---|
| Carriage on the back rail, five posts with pennants | The platoon's line; the line of departure and four phase lines. The carriage moves in four moves and halts after each. Six pegs on it drop as casualties occur |
| Tank at the left end of the rail | The platoon's ammunition (NOTIONAL level: falls to 35 per cent in a move, refilled at the halt) |
| Belt with eight-slot tray and bin | Casualty flow: the tray is the platoon CCP, the bin the company CCP (ATP 3-21.8 para 8-33) |
| Cart on the lane | The carrier: litter bearers (stretcher) or a nonmedical vehicle (small truck) (ATP 3-21.8 para 8-35). It takes casualties to the bin, then runs ammunition up the lane (para 8-34, paired by this figure) |
| Dial; rack; time rule | Progress of the run; men down (eight for the platoon, six for the enemy); moves (light) and halts (dark) |

Battlefield (platoon scale, soldiers): a rifle platoon as three squads in a line (as drawn, a squad leader and two fire teams each) moving across four chalk phase lines to an objective held by three two-man positions (six enemy); a chalk platoon CCP with the platoon sergeant, a combat medic and two pairs of aid and litter bearers; a chalk company CCP with a combat medic; a farm track along which the lit carrier (a nonmedical cargo vehicle, or two litter bearers) runs. Soldiers are drawn about 1.5 times larger than scale.

## Doctrine (the only sourced content; FACTCHECK.md has the table)
Definition and flow: ATP 4-02.13 (30 Jun 2021) para 1-2; ATP 3-21.8 (11 Jan 2024, incl. C1) paras 1-22, 8-33 to 8-36, 8-45; ATP 3-21.10 (1 Jun 2026) paras 4-67, 4-79; ATP 4-02.2 (12 Jul 2019) pp. 1-6, 1-7. Competing requirements: ATP 4-02.13 para 1-5. Sustainment and tempo: ATP 3-21.8 paras 4-6, 4-38, 4-39; ATP 3-21.10 para 2-49. Editions checked against the armypubs.army.mil listings (all ACTIVE; ATP 4-02.2 not superseded).

## The model (all NOTIONAL, labelled "in this model" on the page and in aria labels)
`scripts/model.mjs`, a closed form in figure time t, the casualty count c (0 to 8, start 3) and the means (vehicle or litter bearers). Four moves of 3.0 s. Casualties are spread across the moves (floor(c / 4), the first c mod 4 moves get one more) and occur 0.2 of a move in, or 0.15 and 0.3 for two. The aid and litter pair take 1.6 s to bring a man to the platoon CCP, always before the halt. At each halt the carrier spends k per casualty (1.2 s vehicle, 2.6 s litters) taking each to the company CCP, then 1.6 s taking ammunition forward; the line steps off only when that has arrived (the figure's own rule). Ammunition falls from full to 0.35 in a move. Six enemy go out of action at fixed times (1.4, 1.2, 0.8 and 1.8, 0.9 and 1.8 s into the moves).

| Casualties | Vehicle: run (halted) | Litters: run (halted) |
|---|---|---|
| 0 | 18.4 s (6.4 s) | 18.4 s (6.4 s) |
| 3 | 22.0 s (10.0 s) | 26.2 s (14.2 s) |
| 6 | 25.6 s (13.6 s) | 34.0 s (22.0 s) |
| 8 | 28.0 s (16.0 s) | 39.2 s (27.2 s) |

Readout: "Move 2 of 4 · 2 vs 2 down · 1 at CCP" (friendly vs enemy down; under 45 characters, tested for every state); before a run "Ready · 3 casualties · vehicle". aria-valuetext adds "in this model; seconds, counts and casualties are notional".

## Figure choices that are not doctrine (said so on the page)
One carrier for both jobs and the order (casualties first); the platoon moves together as a line (not bounding overwatch or any named technique); the run ends short of the position; the farm track and cargo truck are drawn for the picture; a platoon CCP that stays where it is while the line moves forward.

## Checks run (2026-10-14)
- `node scripts/model.test.mjs`: passes (every number the page quotes, the monotonic and ordering properties, readouts under 45 characters).
- `node scripts/build.mjs`: writes index.html; contains maneuvers.view.v2, maneuvers.css, IBM+Plex, ex-machine, ex-field, fd-reset.
- `lines.mjs` through drive: line ends 0 in the Battlefield view and in the Machine view, each in two poses.
- Console clean; no sideways scroll at 390 px; Reset returns the load-state snapshot (checked in the Battlefield view).
- thumb.png: Battlefield, 6 casualties by vehicle, 3.7 s (the line halted at the first phase line, one casualty on the carrier, one waiting at the platoon CCP); 800 x 500.
