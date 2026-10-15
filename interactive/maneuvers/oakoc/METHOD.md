# Terrain Analysis (OAKOC) (Fig 53): method

## Object to concept
| Part | Concept |
|---|---|
| Terrain block with two hills, a knoll, a stream with a ford and a bridge, woods, a village, a wall, a wire belt | One piece of notional ground |
| Five transparent plates on four posts, dropped one at a time | The five military aspects of terrain applied in turn: observation and fields of fire, avenues of approach, key terrain, obstacles, cover and concealment (ATP 3-21.8 2-62; FM 3-90 3-23) |
| Lit bead on the bottom plate | The platoon, walking the route the applied overlays lead to |
| Order buttons | List order of the manuals vs the technique order in ATP 3-21.10 B-47 (not opened this session; see FACTCHECK) |
| Battlefield view | The same ground, overlays drawn on it, a rifle platoon walking the route, an enemy observation post on the north hill and a machine gun at the ford |

## Doctrine (the only sourced content)
Quotes, paragraph and printed page numbers are in FACTCHECK.md. Sources: ATP 3-21.8 (11 Jan 2024, C1), FM 3-90 (1 May 2023), ATP 2-01.3 (Mar 2019, C1 Jan 2021), ATP 3-21.10 (1 Jun 2026, unopened).

## The model (all NOTIONAL)
`scripts/model.mjs`. Ground 240 x 180 units (about a metre each), 4-unit cells; three rises (2.6, 2.6, 3.2 per step). The enemy observer on the north hill (eye 2.1) sees a cell within 85 units if the ground does not block the line. The planner is an 8-neighbour shortest-path search: step length, woods x2.2, climbing 2 per unit, a step in the open in view x6 (only if the observation overlay is applied); stream and wire are no-go unless the obstacles overlay is applied, avenues are the cheapest ways in through the ford and the bridge (corridor 9 units each side). Key terrain is the candidate position that sees the most of the two avenues and the objective. Platoon of 30 loses one man per 10.5 units walked in the open in view. Route results are in `model.test.mjs` and printed by `build.mjs`.

Figure choices that are not doctrine: the overlays are dropped in sequence; the route search stands in for the leader's planning; the loss rate. The page says so.

## Checks run
- `node scripts/model.test.mjs`: passes.
- `node scripts/build.mjs`: writes index.html.
- `lines.mjs`: line ends 0 floating (Battlefield view, 130 ends; Machine view with 3 overlays, 4 ends).
- Console clean in both views at 1200 px.
