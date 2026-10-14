# Fig 42 Reverse Slope Defense: method

## Object to concept
| Part | Concept |
|---|---|
| Profile comb of 28 slats | the hill's height profile (the model's 5 contour steps, 2.4 high, 150 across at the foot, flat top 30 across) |
| Lamp carriage riding the comb | the attack: the enemy's eye and weapons |
| Lit block (moves between slopes) | the platoon's line, on the forward slope (x = -30) or behind the crest (x = +30) |
| Sight line | line of sight over the ground; ends on the slat that blocks it; dark when the enemy fires |
| Front lamp | enemy has line of sight to the platoon |
| Two level gauges | platoon men down / attack men down |
| Mast at the crest | observation post (rises when manned) |
| Two peg rows with wire | forward-slope belt (x = -45) and protective belt just down from the crest (x = +18) |

## Model (model.mjs; every number notional, labeled on the page)
1D profile along the approach, x from -150 (enemy start) over the crest (0). Line of sight is a real sampled test over the stepped ground (eye heights 1.6 enemy, 1.0 defender). Enemy walks 5 u/s, 7 u/s downhill past the crest, 4 s to breach a belt. Weapon reach: enemy 110, platoon 70. Rates: 0.55 men/s direct fire on a visible platoon (scaled by attack strength), 0.30 men/s indirect on a position it sees; platoon 1.2 men/s (x2.2 massed on the reverse slope), FPF 1.0 men/s in its box (reverse slope needs the OP); 3 s lag if not warned by the OP; attack stops at 40% strength. 30 v 30.
Results: F+OP reached at 28.0 s, 17 vs 16 down; R+OP stopped at 39.3 s, 3 vs 18; R, no OP reached at 42.3 s, 6 vs 13. First sight of the reverse position: x about -2.5 (on the flat top).

## Checks run
- model.test.mjs passes.
- lines.mjs equivalents (drive "lines"): 0 ends in battlefield (rest and after advance 14), machine (R pose and F pose), battlefield again.
- Console clean; no sideways scroll at 390 px; Reset restores the load snapshot in the battlefield view.
- `.ex-field` displayed in Battlefield view only, `.ex-machine` in Machine view only.
