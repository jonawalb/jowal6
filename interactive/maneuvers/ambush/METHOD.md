# Ambush (Fig 46): method

## Object to concept
| Part | Concept |
|---|---|
| Ten coupled cars on a rail | The enemy column (ten soldiers walking a road in the battlefield view) |
| Engraved window with corner brackets on the rail | The kill zone (96 notional units) |
| Dial with a halfway mark | Cars in the kill zone of ten; the halfway mark is "most" |
| Lit assault bar on a slide, four plungers, reach arm | Assault element: fires into the kill zone, then attacks into and clears it |
| Support bar on a hinge, four plungers | Support element: in line with the assault bar (linear) or turned a quarter turn at the end of the window (L-shaped) |
| Two boom gates at either end of the route | Security element: blocks the route into and out of the ambush site |
| Plungers stroke, then stop | Initiation, then the signal to cease or shift fire |
| Cars knocked flat | Men down |

Battlefield: platoon scale, soldiers. Road along x, friendly elements prone on the far side, stream on the near bank. Assault element (lit): a rifle squad of nine on the line, plus platoon leader and RTO. Support element: a rifle squad and two MG teams. Security: a fire team at each end. Enemy: ten in file on the road. Chalk: the kill zone on the road and a limit of advance beyond it. Fire lanes: flanking fire across the road from the line; in L-shaped, the enfilade lane down the road from the short leg.

## Doctrine (the only sourced content)
Definition, three elements, kill zone, linear, L-shaped, initiation "when most of the enemy force is in the kill zone", cease or shift fire as the signal for the assault, bounding fire teams: ATP 3-21.8 (11 January 2024, incorporating Change 1, June 2025), paras 7-124 to 7-164, quoted in FACTCHECK.md with pages. FM 3-90 (1 May 2023) paras 5-102 (definition) and 5-112 (short leg "blocks the enemy's forward movement"). ATP 3-21.10 is not used. Everything else is notional.

## The model (all NOTIONAL, labelled so on the page)
`scripts/model.mjs`. Ten men, 12 units apart, route coordinate x. Kill zone x in [-48, 48] (96 units, so at most nine men fit). The leader's decision is the column's head position, from -60 to 100. "Most" is more than half (the manual gives no number). Of the men inside the kill zone, 70% fall in the linear formation and 85% in the L-shaped one (round), the men nearest the middle first; this difference is the model's assumption (the manual says only that the short leg adds enfilade fire and blocks forward movement). Men outside the zone are isolated by the security element, not destroyed. Friendly men down: 25% of the survivors in the zone plus 10% of the men outside, rounded, at least one when anyone was in the zone, none otherwise. Men fall one by one from 0.45 s after initiation, 0.28 s apart; fire ceases (support) at 2.8 s; the assault crosses in the next 3.2 s.

| Head position | In zone | Linear (enemy vs friendly down; the readout shows friendly vs enemy) | L-shaped |
|---|---|---|---|
| -60 | 0 | 0 vs 0 | 0 vs 0 |
| -30 | 2 | 1 vs 1 | 2 vs 1 |
| 0 | 5 | 4 vs 1 | 4 vs 1 |
| 12 | 6 | 4 vs 1 | 5 vs 1 |
| 60 | 9 | 6 vs 1 | 8 vs 1 |

Readout: "Linear · 6/10 in kill zone · initiate" before, "L-shaped · 6/10 in kill zone · 1 vs 5 down" after (friendly vs enemy; under 45 characters, tested across every state).

## Checks run (2026-10-14)
- `node scripts/model.test.mjs`: passes (counts, criterion, outcomes above, monotonic L >= linear, readout under 45 characters in all states).
- `node scripts/build.mjs`: succeeds; index.html carries maneuvers.view.v2, maneuvers.css, IBM+Plex, ex-machine, ex-field, fd-reset.
- lines.mjs: `line ends: 0` in the machine view (rest, fired L-shaped at 2.5 s, settled at 7 s) and the battlefield view (the same three poses).
- Console clean in every run; 390 px: scrollWidth 390 (no sideways scroll).
- `.ex-field` displays only in Battlefield view and `.ex-machine` only in Machine view (computed style checked in headless Chrome).
- Reset returns the load-state snapshot in both views (state, readout, aria-pressed, button text, slider, soldier transforms or live-layer markup).
- Frame timing, 6 s tour, no CPU throttle: battlefield 60 fps, JS p50 0.3 ms, p95 0.7 ms; machine 60 fps, JS p50 3.1 ms, p95 5.3 ms (desktop and 390 px alike).
