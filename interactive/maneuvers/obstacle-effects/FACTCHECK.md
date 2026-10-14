# Obstacles and Fires: fact check

VERIFIED: 2026-10-14, independent check against FM 3-90 (1 May 2023). All doctrinal quotes verified verbatim with page numbers. Findings applied: the figure's disrupt-turn-fix-block order is labelled its own device (manual lists block, disrupt, fix, turn, 17-21; 17-23 on placement); "in this model" added to the uncovered-turn outcome with the manual's "the turning effect could be lost" (17-43); doctrine attribution of covered groups narrowed to the effect definitions; "notional" added to the machine aria label and the aria-valuetext.
## Problems found (independent check, 2026-10-14)

1. Effect order: FM 3-90 para 17-21 lists Block, Disrupt, Fix, Turn. The page's table and prose run Disrupt, Turn, Fix, Block without saying this is the figure's order, not the manual's.
2. Single-run layout (disrupt, then turn into the engagement area, then fix, then block) is never labeled as the figure's own device; the page only says "the map, route lengths and positions are the drawing's own". FM 3-90 17-23 says effects are placed by terrain and mission, not in a fixed sequence.
3. Page text "Covered groups are as the doctrine describes them" and "the turn group pushes the column along the branch" attribute the model's outcomes to doctrine. Uncovered turn ("simply breaches it and drives on", also the machine "rolls straight on") is stated as fact, not as the model's outcome. 17-43 only says "the turning effect could be lost".
4. Notional labeling gaps: the machine-view aria label (build.mjs line 62, "column of eight balls") has no "notional"; the live readout and aria-valuetext ("N through, X vs Y down", live.js readoutText) carry no notional marker. On-field tags contain no numbers (fine).

## Independent verification (FM 3-90, 1 May 2023, manual page footers)

All VERIFIED verbatim: 17-20 and 17-21 p.17-4; 17-24 p.17-6 (Table 17-1 p.17-5); 17-29, 17-30 p.17-6; 17-35, 17-36 p.17-7; 17-40, 17-42 p.17-8; 17-64 p.17-11; 1-79 p.1-14. 17-30 "Obstacles must normally attack half of the targeted avenue of approach"; 17-36 "units array obstacles in depth"; 17-42 "normally anchor turn obstacle groups to restricted terrain or to a strong point".

Every claim below was read by the builder in the primary text on 2026-10-14. Nothing here has been independently verified.

## Source opened

- Headquarters, Department of the Army, FM 3-90, *Tactics*, 1 May 2023. Official: https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN38160-FM_3-90-000-WEB-1.pdf (downloaded directly this session; no archived copy made). Page numbers below are the manual's own (chapter 17 page footers).

## Claims on the page

| Claim on the page | Source | Para / page |
|---|---|---|
| Tactical obstacles and fires "manipulate the enemy"; the obstacle effect "describes the effect that the commander wants the obstacles, combined with fires, to have on the enemy" | FM 3-90: "Tactical obstacles and fires—direct and indirect—manipulate the enemy in a way that supports the commander's intent…" / "Obstacle effect describes the effect that the commander wants the obstacles, combined with fires, to have on the enemy." | Para 17-20, p. 17-4 |
| "obstacle effects occur because of the combined effects of fires and obstacles, rather than from obstacles alone" | FM 3-90 (exact) | Para 17-21, p. 17-4 |
| Tactical obstacles produce one of four effects: block, disrupt, fix, turn | FM 3-90 | Para 17-21, p. 17-4 |
| Block: "integrates fire planning and obstacle effort to stop an attacker along a specific avenue of approach or to prevent the attacking force from passing through an engagement area"; must "prevent the enemy from bypassing or breaching the obstacles" | FM 3-90 | Para 17-24, p. 17-6 (also Table 17-1, p. 17-5) |
| Disrupt: "focuses fire planning and obstacle effort to cause the enemy to break up its formation and tempo, interrupt its timetable, commit breaching assets prematurely, and attack in a piecemeal effort"; must "allow part of the enemy force to advance unimpeded" | FM 3-90 | Para 17-29, p. 17-6 |
| Obstacles "must normally attack half of the targeted avenue of approach" to achieve disrupt | FM 3-90 | Para 17-30, p. 17-6 |
| Fix: "focuses fire planning and obstacle effort to slow an attacker's movement within a specified area, normally an engagement area" | FM 3-90 | Para 17-35, p. 17-7 |
| "units array obstacles in depth" for the fix effect | FM 3-90: "To achieve the fix effect, units array obstacles in depth to cause the attacking formation to react and breach repeatedly." | Para 17-36, p. 17-7 |
| Turn: "integrates fire planning and obstacle effort to divert an enemy formation from one avenue of approach to an adjacent avenue of approach or into an engagement area" | FM 3-90 | Para 17-40, p. 17-8 |
| Units "normally anchor turn obstacle groups to restricted terrain or to a strong point" | FM 3-90 | Para 17-42, p. 17-8 |
| An obstacle group is "one or more individual obstacles that provide a specific obstacle effect"; units "integrate obstacle groups with their direct and indirect fire plans" | FM 3-90 | Para 17-64, p. 17-11 |
| "For obstacles covered by fire, the unit can either seek a bypass or conduct breaching operations as part of a hasty attack. For obstacles not covered by fire, the unit can either seek a bypass or create the required number of lanes…" | FM 3-90 (exact) | Para 1-79, p. 1-14 |

## Not claims (notional, labeled on the page)

Column of eight vehicles, speed, dwell times, which vehicles are hit and when, every loss count, the route geometry and lengths, positions of the obstacles and friendly positions, figure scale (about 1.5x), mortar bursts (a sample), tags on the ground.

Drawing choices a checker may question (not stated by FM 3-90 as such): a mortar section off the map firing on the obstacles (FM 3-90 para 17-32 and 17-37 mention indirect fires on obstacles); a covered turn pushing the column "along the branch" (the manual's 17-41 says the obstacles "allow bypasses in the direction that is desired"); an uncovered turn letting the column drive straight on (the manual, 17-43: "If the enemy breaches the obstacle at the anchor point, the turning effect could be lost").
