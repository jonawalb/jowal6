# Ambush (Fig 46): fact check

VERIFIED: 2026-10-14, independent check against the official FM 3-90 and ATP 3-21.8 (C1) PDFs. All 21 claims verified verbatim with page numbers. Findings applied: "notional" added to the slider aria labels (LABELS.machine, LABELS.field) and to the aria-valuetext; claims 8 and 9 noted as stitching two spans of ATP 3-21.8 7-137.

## Independent check 2026-10-14 (fresh context; FM 3-90 and ATP 3-21.8 C1 PDFs from web.archive.org, running footers read)
Claims 1-21: VERIFIED against exact quotes and printed page numbers (5-102/5-103 p. 5-18, 5-112 p. 5-20; 7-127, 7-128 p. 7-41; 7-133, 7-136 p. 7-43; 7-137 pp. 7-43/44, 7-139, 7-140 p. 7-44; 7-141 p. 7-45; 7-145, 7-147 p. 7-47; 7-149 p. 7-48; 7-153 p. 7-49; 7-156 p. 7-50; 7-164 p. 7-51; 1-9, 1-11 p. 1-4). Notes: 7-137 has an omitted sentence between the two quoted halves ("Only a target that can be covered with a full volume of fire can be engaged in the kill zone.") and claims 8/9 should be read as two spans. FM 3-90 5-103 says "two methods" and ATP 7-128 "three common forms"; the page cites 7-128 only for point vs area and does not misstate either. "Most" as more than half is presented as the model's choice (page, "What is notional"). Both editions are dated on the page (1 May 2023; 11 January 2024 incl. C1 June 2025).
[resolved] Problems:
[resolved] 1. PROBLEM: the live readout and aria-valuetext ("Linear · 6/10 in kill zone · 2 vs 7 down", model.mjs readout(), set in build.mjs draw()) carry loss and kill numbers with no "notional" marker; the 70%/85% outcomes are only labeled in the caption, SVG label and page text.
[resolved] 2. PROBLEM: LABELS.machine and LABELS.field (the slider's aria-label) do not say notional; only the SVG labels and captions do.

Written 2026-10-14. Nothing on the page is marked verified.

## Sources opened this session
- Headquarters, Department of the Army, ATP 3-21.8, Infantry Rifle Platoon and Squad, 11 January 2024, incorporating Change 1, 23 June 2025 (cover: "This publication supersedes ATP 3-21.8, dated 12 April 2016"). Official PDF: https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN44065-ATP_3-21.8-001-WEB-3.pdf; archived copy used for text extraction: https://web.archive.org/web/20250807233618id_/https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN44065-ATP_3-21.8-001-WEB-3.pdf. Page numbers are the printed numbers.
- Headquarters, Department of the Army, FM 3-90, Tactics, 1 May 2023: https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN38160-FM_3-90-000-WEB-1.pdf (text extracted from a web.archive.org capture).
- ATP 3-21.10 is NOT used (no claim on the page needs it).

## Claims
| # | Claim on the page | Exact quote | Source, para, page |
|---|---|---|---|
| 1 | FM 3-90 defines the ambush as a variation of attack from concealed positions against a moving or temporarily halted enemy | "An ambush is a variation of attack from concealed positions against a moving or temporarily halted enemy." | FM 3-90 (1 May 2023) 5-102, p. 5-18 |
| 2 | The ambush force does not normally seize and hold ground objectives | "In an ambush, the ambush force does not normally seize and hold ground objectives." | FM 3-90 5-102, p. 5-18 |
| 3 | A typical ambush is organized into three elements: assault, support, security | "A typical ambush is organized into three elements: assault, support, and security" | ATP 3-21.8 (11 Jan 2024, C1 Jun 2025) 7-127, p. 7-41 |
| 4 | The support element provides the ambush's primary killing power | "it provides the ambush's primary killing power" (the support element) | ATP 3-21.8 7-127, p. 7-41 |
| 5 | The security element isolates the kill zone, gives early warning, secures assault and support, and blocks avenues of approach into and out of the ambush site | "The security element isolates the kill zone, provides early warning of arrival of all enemy relief forces, and provides security for the assault and support elements. It secures the ORP and blocks ... enemy avenues of approach into and out of the ambush site" | ATP 3-21.8 7-127, p. 7-41 |
| 6 | The assault element attacks into and clears the kill zone (used for the machine and battlefield text) | "When used, the assault force attacks into and clears the kill zone." | ATP 3-21.8 7-127, p. 7-41 |
| 7 | The kill zone is the part of an ambush site where fire is concentrated to isolate or destroy the enemy | "The kill zone is the part of an ambush site where fire is concentrated to isolate or destroy the enemy." | ATP 3-21.8 7-133, p. 7-43 |
| 8 | Linear: assault and support elements parallel the target's route and subject it to flanking fire | "the assault and support elements parallel the target's route. This positions the assault and support elements on the long axis of the kill zone and subjects the target to flanking fire." | ATP 3-21.8 7-137, pp. 7-43 to 7-44 |
| 9 | Linear disadvantage: a dispersed target might be too large for the kill zone | "A dispersed target might be too large for the kill zone. This is the disadvantage of linear formations." | ATP 3-21.8 7-137, p. 7-44 |
| 10 | Linear advantage: the relative ease of control under all visibility conditions | "An advantage of the linear formation is the relative ease by which it can be controlled under all visibility conditions." | ATP 3-21.8 7-139, p. 7-44 |
| 11 | L-shaped: long leg (assault element) parallel to the kill zone, flanking fire; short leg (support element) at the end of and at a right angle to the kill zone, enfilade fire | "The long leg of the L (assault element) is parallel to the kill zone. This leg provides flanking fire. The short leg (support element) is at the end of and at a right angle to the kill zone. This leg provides enfilade fire working with fire from the other leg." | ATP 3-21.8 7-140, p. 7-44 |
| 12 | FM 3-90: the short leg blocks the enemy's forward movement | "the short leg (the support element) is at the end of the kill zone and at a right angle to it and blocks the enemy's forward movement." | FM 3-90 5-112, p. 5-20 |
| 13 | The manual also lists a V-shaped formation (not shown) | "Paragraphs 7-137 to 7-143 discuss the linear, L-shaped, and V-shaped." / "The V-shaped ambush assault elements ... are placed along both sides of the enemy route so they form a V." | ATP 3-21.8 7-136, p. 7-43; 7-141, p. 7-45 |
| 14 | Initiation: when most of the enemy force is in the kill zone, with the most casualty-producing weapon, medium machine gun fire, or mines or explosives | "When most of the enemy force is in the kill zone, the leader initiates the ambush with the most casualty-producing weapon, medium machine gun fire, or the detonation of mines or explosives." | ATP 3-21.8 7-153, p. 7-49 |
| 15 | If the assault element must cross the kill zone, the leader signals to cease or shift fire, which also starts the assault | "If the assault element must assault the kill zone, the leader signals to cease or shift fire. This also signals the start of the assault." | ATP 3-21.8 7-153, p. 7-49 |
| 16 | Point ambush has a single kill zone; an area ambush is two or more related point ambushes | "In a point ambush, Soldiers deploy to attack a single kill zone. In an area ambush, Soldiers deploy as two or more related point ambushes." | ATP 3-21.8 7-128, p. 7-41 |
| 17 | Control measures of an ambush include the kill zone and the LOA (limit of advance) | "Common control measures include: Kill zone. LOA. Attack by fire and/or support by fire position. Security and assault positions. TRPs." | ATP 3-21.8 7-145, p. 7-47 |
| 18 | The platoon leader is the leader of the assault element | "The patrol leader (or platoon leader) is the leader of the assault element." | ATP 3-21.8 7-156, p. 7-50 |
| 19 | The assault element crosses the kill zone bounding by fire teams, unless there is return fire (then individual movement techniques) | "The assault element must be prepared to move across the kill zone using individual movement techniques if there is return fire once they begin to search. Otherwise, the assault element moves across by bounding fire teams." | ATP 3-21.8 7-164, p. 7-51 |
| 20 | The ambush force occupies positions concealed (elements lie prone and still while the column walks in); security positioned first (not shown as a sequence) | "Security elements are positioned first to prevent surprise while the ambush is being established." / "Each Soldier must be hidden from the target and have line of sight into the kill zone." | ATP 3-21.8 7-147, p. 7-47; 7-149, p. 7-48 |
| 21 | Squad composition: nine on the line (two fire teams of four and a squad leader); fire team = team leader, automatic rifleman, grenadier, rifleman (drawn as a squad line) | per the Fig 1 check: "two fire teams and a squad leader" (1-9); team roles (1-11); squad line used to assault or as a pre-assault formation (3-54). Used here only as the squad drawn; sizes of elements are notional. | ATP 3-21.8 1-9, 1-11, p. 1-4; 3-54 |

## Non-doctrinal content (labelled notional on the page)
- Ten men, 12 units apart, a 96-unit kill zone, 70% / 85% share down, friendly losses 25% of survivors plus 10% of men outside, timings. "Most" taken as more than half (the manual gives no number).
- That the L-shaped formation kills more of the men inside the kill zone than the linear one is the model's assumption; the page says so.
- Who is where on the battlefield (squad and two MG teams in support; a fire team at each end as security; a squad with PL and RTO as assault) is illustrative, not a doctrinal composition.
- Soldiers drawn about 1.5 times larger than scale (stated).

## Points for the checker
- FM 3-90 says "two methods of an ambush" (point, area; 5-103) while ATP 3-21.8 says "three common forms" (point, area, antiarmor; 7-128). The page cites ATP 3-21.8 7-128 only for point vs area.
- Claim 8 spans a page break (7-43 to 7-44); claim 9 and 10 are on 7-44.
- Claim 21: confirm against the Fig 1 FACTCHECK (flank-attack) rows, not re-opened here beyond the squad's line formation.
