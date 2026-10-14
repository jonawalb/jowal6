# Engagement Area Development (Fig 41): method

## Object to concept
| Part | Concept |
|---|---|
| Sloped chute table, two lanes | The valley and its two avenues of approach |
| Lane rails rising (step 1) | Avenues identified: both lanes are marked out |
| Chevron inlaid on lane A (step 2) | The enemy's most likely course of action |
| Lit kill zone, trigger sill, three stakes (step 3) | The engagement area, the trigger line, the target reference points |
| Six weapon blocks beside the lane (step 4) | Subordinate forces and weapons systems positioned |
| Rows of pegs across the lane (step 5) | Obstacles in the belt; the column slows there |
| Gantry of pins over the lane (step 6) | Indirect fires; the pins hammer while the column is in the area |
| Sync bar linking the blocks (step 7) | The rehearsal; without it the blocks fire ragged |
| Twelve balls | The enemy column (six vehicles and six dismounts in the battlefield view) |
| Dial; rack of twelve pegs | Enemy down; defenders lost |

Battlefield: a company area defense on two avenues; steps 1 to 7 show their marks and units in the manual's order; the engagement area is built on avenue A when steps 1 and 2 are both built, otherwise on avenue B (the wrong one).

## Doctrine (the only sourced content)
The seven steps, their names and their order: ATP 3-21.10, Infantry Rifle Company, 1 June 2026, para 3-61, p. 86 (supersedes the 14 May 2018 edition; no asterisks in the 2026 list). The other quoted definitions are listed in FACTCHECK.md. Nothing else is doctrinal.

## The model (all NOTIONAL, labelled so on the page)
`scripts/model.mjs`. x is the column's lead, notional m in front of the positions. Start 400, trigger line 290, standoff 60, obstacle belt 100 to 150. Speed 30 m per figure second, 8 in the belt when step 5 is built. Twelve elements. In the area (290 to 60) the kill rate is 0.9 per second, times 1.5 with fires (6), times 0.2 without steps 1 and 2, 0.6 without 3, 0.55 without 4, 0.6 without 7. Defenders' losses: 0.035 per second times the share alive (times 2.2 without rehearsal) in the area, 4.5 per second times the share alive once through. Outcome held 2.6 s.

| Built | Result |
|---|---|
| all seven | destroyed in the area, 1 vs 12 down |
| without 1 or 2 | through, 9 vs 3 |
| without 3 | through, 2 vs 10 |
| without 4 | through, 3 vs 9 |
| without 5 | through, 2 vs 11 |
| without 6 | through, 1 vs 11 |
| without 7 | through, 2 vs 10 |

## Checks run (2026-10-14, after the 2026-edition rework)
- `node scripts/model.test.mjs`: passes (step names and order, rates, every outcome above, readouts under 45 characters across all 128 configurations).
- `node scripts/build.mjs`: succeeds; index.html carries maneuvers.view.v2, maneuvers.css, IBM+Plex, ex-machine, ex-field, fd-reset.
- lines.mjs: `line ends: 0` in the battlefield view (all steps at 5.5 s; steps 1 and 5 left out at 7 s) and the machine view (all steps at 6 s; steps 4 and 6 left out at 9 s).
- Console clean; 390 px: no sideways scroll (scrollWidth 390).
- Frame timing, 6 s tour, no CPU throttle: battlefield 60 fps, JS p50 0.30 ms, p95 0.60 ms; machine 60 fps, 1.0 to 1.1 ms p50, 1.5 to 1.6 ms p95 (desktop and 390 px; measured before the 2026 rework, drawing unchanged, not re-run).
- Reset restores the load-state snapshot (battlefield, byte-identical) and, in the machine view, the same state minus the readout text.
- `.ex-field` shown only in Battlefield view and `.ex-machine` only in Machine view.
