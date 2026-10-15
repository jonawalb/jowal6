# Movement Techniques: fact check

VERIFIED: 2026-10-14, independent check against the official ATP 3-21.8 (C1), FM 3-90 and ATP 3-21.10 (1 June 2026) PDFs. Doctrine rows 1-21 verified verbatim. Findings applied: "notional" added to the machine and field aria labels and the aria-valuetext; the walking-column-goes-to-ground statement marked "in this model"; the "alternating"/"alternate" wording difference between FM 3-90 and ATP 3-21.8 left as the manuals have it.

## Independent check, 2026-10-14 (fresh PDFs from armypubs.army.mil, read against running footers)

Doctrine rows 1-21: all VERIFIED (quotes, paragraph numbers and pages match; ATP 3-21.8 C1 is 23 June 2025; ATP 3-21.10 supersedes 14 May 2018). Middle band is quoted three ways without blending: 3-75/Table 3-5 "possible", 3-88 "possible but not expected", 6-66 "likely but not imminent". Spelling "traveling" matches the manual. Open problems (header stays pending):

[resolved] 1. Machine-view aria-label (LABELS.machine in build.mjs, and the figure label at build.mjs:144) describes the dial, gauges and pegs with no "notional" qualifier; only the field label says it.
2. aria-valuetext (live.js:113) and the readout (readoutText) give "speed 80% · safe 60%", "fire in 8 s", "3 vs 1 down" with no notional marker. The figure's own numbers read as data to a screen-reader user.
3. The field label states "a column that was walking has to go to ground first" as fact; it is the model's own (row 21 note), covered only by a closing "notional" sentence.
4. Minor: page prose says "alternating bounds"; ATP 3-21.8 3-82/3-83 says "alternate" (FM 3-90 2-20 says "alternating"). Acceptable, but the quoted ATP term is "alternate".

Every claim below was read by the builder in the primary text on 2026-10-14 (PDFs downloaded fresh from armypubs.army.mil; the Army Publishing Directorate listing shows ATP 3-21.8 ACTIVE 01/11/2024 and FM 3-90 ACTIVE 05/01/2023; ATP 3-21.10 is the 1 June 2026 edition, which supersedes the 14 May 2018 edition). Nothing here has been independently verified. Page numbers are the manual's own footers.

Editions stated on the page: ATP 3-21.8, 11 January 2024 incorporating Change 1, June 2025; FM 3-90, 1 May 2023; ATP 3-21.10, 1 June 2026.

URLs:
- ATP 3-21.8: https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN44065-ATP_3-21.8-001-WEB-3.pdf (archived: https://web.archive.org/web/20250807233618id_/https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN44065-ATP_3-21.8-001-WEB-3.pdf)
- FM 3-90: https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN38160-FM_3-90-000-WEB-1.pdf
- ATP 3-21.10: https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN46667-ATP_3-21.10-000-WEB-1.pdf

## Doctrine claims

| # | Claim on the page | Source | Para, page | Quote or note |
|---|---|---|---|---|
| 1 | Three techniques, which "refer to the distances between Soldiers, teams, and squads" and "are not fixed formations" | ATP 3-21.8 (2024, C1) | 3-75, p. 3-26 | "Movement techniques are not fixed formations. They refer to the distances between Soldiers, teams, and squads, and vary based on mission, enemy, terrain, visibility, and other factors affecting control. There are three movement techniques: traveling, traveling overwatch, and bounding overwatch." |
| 2 | Traveling "used when speed is necessary and contact with enemy forces is not likely" | ATP 3-21.8 | 3-75 bullet, p. 3-26 | cites FM 3-90 |
| 3 | Traveling overwatch "used when contact with enemy forces is possible"; bounding overwatch "used when contact with enemy forces is expected" | ATP 3-21.8 | 3-75 bullets, pp. 3-26 and 3-27 | the two bullets break across the page |
| 4 | "The selection of a movement technique is based on the likelihood of enemy contact and need for speed" | ATP 3-21.8 | 3-76, p. 3-27 | also: "Factors to consider for each technique are control, dispersion, speed, and security." |
| 5 | Table: traveling more control, less dispersion, fastest, least security; traveling overwatch less control, more dispersion, slower, more security; bounding overwatch most, most, slowest, most | ATP 3-21.8 | Table 3-5, p. 3-27 | columns "When normally used": contact not likely / possible / expected |
| 6 | Squad traveling overwatch: lead team "at least 50 meters in front of the rest of the element" | ATP 3-21.8 | 3-79, p. 3-28 | "Ideally, the lead team moves at least 50 meters in front of the rest of the element." |
| 7 | Squad bounding overwatch: the lead fire team "overwatches first", the squad leader "usually stays with the overwatch team", the trail team bounds | ATP 3-21.8 | 3-80, p. 3-29 | |
| 8 | Overwatching elements "can immediately support the bounding elements with fires if the bounding elements make contact"; bound length "based on the terrain and the range of overwatching weapons" | ATP 3-21.8 | 3-82, p. 3-30 | |
| 9 | Alternate bounds: rear element passes the halted one; "This method is usually more rapid than successive bounds" | ATP 3-21.8 | 3-83, p. 3-31 | |
| 10 | Successive bounds: rear comes up level with lead; "is easier to control and more secure than the alternate bounding method, but it is slower" | ATP 3-21.8 | 3-84, p. 3-31 | |
| 11 | Platoon traveling overwatch "used when enemy contact is possible but not expected. Caution is justified but speed is desirable" | ATP 3-21.8 | 3-88, p. 3-32 | |
| 12 | Trail units placed so that if the lead comes into contact "the trail units will be out of contact but have the ability to maneuver on the enemy" | ATP 3-21.8 | 3-89, pp. 3-32 to 3-33 | the sentence is on p. 3-33 |
| 13 | Bounding overwatch "is used when the leader expects contact", "like fire and movement", "there is no actual enemy contact" | ATP 3-21.8 | 3-91, p. 3-34 | |
| 14 | Traveling overwatch "used when contact is likely but not imminent"; leader sets a probable line of deployment "to indicate where the transition from traveling overwatch to bounding overwatch should occur" | ATP 3-21.8 | 6-66, p. 6-23 | the page says "the manual words the middle band several ways" (3-75 possible; 3-88 possible but not expected; 6-66 likely but not imminent) |
| 15 | Large open area: "The traveling overwatch technique is used to save time"; bounding overwatch "at any point in the open area where enemy contact may be expected" | ATP 3-21.8 | 7-71, p. 7-22 | about a patrol (platoon or squad) |
| 16 | Squad is two fire teams and a squad leader; team members; wedge is the fire team's basic formation | ATP 3-21.8 | 1-9, 1-11, 3-46 (pp. 1-4, 1-4, 3-12 per earlier figures' checks) | used only for the drawn squad |
| 17 | Units "select the appropriate movement technique based on the chance of enemy contact"; same three definitions | FM 3-90 (1 May 2023) | 2-17, p. 2-9; 2-18 to 2-20, pp. 2-10 and 2-11 | |
| 18 | Company commander chooses on "the likelihood of enemy contact" and four other factors (type of contact expected, availability of an overwatch element, level of security required, timeline of the higher HQ) | ATP 3-21.10 (1 June 2026) | 2-17, p. 26 | |
| 19 | Bounding overwatch "is the most secure, but slowest, movement technique"; purpose "to deploy prior to contact, giving the unit the ability to protect a bounding element by immediately suppressing an enemy force" | ATP 3-21.10 | 2-20, p. 28 | |
| 20 | Contact "is made with the smallest force possible to allow the majority of the company freedom to maneuver against the enemy" | ATP 3-21.10 | 2-16, p. 26 | |
| 21 | Traveling: all elements move simultaneously (used in the battlefield text for "nobody is set") | FM 3-90; ATP 3-21.10 | 2-18, p. 2-10; 2-18, p. 26 | the "has to go to ground first" consequence is the model's, not the manual's |

## Model and drawing claims (not doctrine; the page marks them notional)

| # | Claim | Basis |
|---|---|---|
| 22 | Dial cuts at 1/3 and 2/3 of likelihood | teaching choice |
| 23 | Speed 100%, 80% (traveling overwatch), 40% alternating and 33% successive bounding | traveling and overwatch values set by hand; bounding derived from one assumption (a halt costs half a bound's move time); only the order is doctrine (Table 3-5, and paras 3-83, 3-84 for alternating vs successive) |
| 24 | First supporting fire 8, 4, 1 s; security 20%, 60%, 90% | notional; only the order is doctrine (para 3-82 "immediately" for the overwatching element; para 3-89 for trail units) |
| 25 | Men down 3, 2, 1 (lead team) and 1, 3, 5 (enemy outpost) | notional formulas in METHOD.md |
| 26 | Battlefield seconds play at 2.5x | page choice, stated |
| 27 | Squad leader stays with the halted team in bounding; between the teams otherwise | para 3-80 ("usually stays with the overwatch team") for bounding; the between-the-teams placement in traveling and traveling overwatch is the drawing's own (FM 3-90 para 2-18: leaders "are located where they can best control the situation") |
| 28 | Distances (traveling 34, trail 60, bound 44 route units), outposts, fan reach | notional; the 50 m of para 3-79 is quoted but not drawn to scale |
| 29 | Soldiers drawn about 1.5x scale | stated on the page |
| 30 | Chalk line at s = 128 is the probable line of deployment | para 6-66 defines the term; its position here is notional |
