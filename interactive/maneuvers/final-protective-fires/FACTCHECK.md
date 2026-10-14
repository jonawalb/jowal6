# Final Protective Fires: fact check

VERIFIED: 2026-10-14, independent check against the ATP 3-21.8 (C1) PDF. Findings applied: after the mortar rounds are spent the machine guns now stay on the FPL in both views (C-69; C-81); "in this model" added to the assault-breaks outcome; the call window and ammunition counts labelled notional in the captions and machine label. No source names who calls the FPF; the page claims none (C-82 says the signal is stated in the defensive order).

1. WRONG (model behaviour, not text): both views end the machine guns' FPL fire when the mortar rounds run out (field-scene.mjs `firing = S.called && S.rounds > 0` swings guns back to their sectors; the machine view's grazing bars lift with `MS.bar = firing`). No source ties the guns to mortar ammunition. C-69: "the machine gun is sighted along it except when other targets are being engaged"; C-81: "gunners should continue to fire until the target is neutralized or until signaled to do otherwise by their leader". Only the mortars have the "until ordered to stop, or until ammunition is depleted" rule (B-18). Fix: guns stay on the FPL after the rounds are spent.
2. Caller/signal: sources name no caller. C-82: "The signal for calling these fires normally is stated in the defensive order ... hand and arm signals, voice commands, or pyrotechnic devices." The page claims none (OK); keep it that way.
3. Labeling: the 80/90 m window and "FPF breaks the assault" are marked notional only in the closing "What is notional" section. The Battlefield "How it moves" text and the machine-view aria label (build.mjs line 88) state the break outcome without "in this model" and the machine label/caption never mention distances or losses as notional.
4. Minor: C-69 says fire is at the sustained rate unless the situation calls for higher; the page's "maximum rate" is for the mortars only (B-18), which is correct but the guns' rate is not modeled.


Source opened this session (2026-10-14), the archived copy of the official PDF, text extracted with pdftotext:
Headquarters, Department of the Army, ATP 3-21.8, *Infantry Rifle Platoon and Squad*, 11 January 2024, incorporating Change 1 (June 2025).
Official: https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN44065-ATP_3-21.8-001-WEB-3.pdf
Archived copy opened: https://web.archive.org/web/20250807233618id_/https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN44065-ATP_3-21.8-001-WEB-3.pdf

| # | Claim on the page | Source text (as extracted) | Para / page |
|---|---|---|---|
| 1 | FPL is "a line of fire selected where an enemy assault is to be checked by interlocking fire from all available weapons and obstacles" | "Final protective line (FPL) is a line of fire selected where an enemy assault is to be checked by interlocking fire from all available weapons and obstacles." | B-18, p. B-11 (A-51, p. A-17, and the glossary give the FM 3-90 form, "a selected line of fire …") |
| 2 | FPF is "an immediately available, prearranged barrier of fire designed to impede enemy movement across defensive lines or areas" (page and card caption) | "Final protective fire is an immediately available, prearranged barrier of fire designed to impede enemy movement across defensive lines or areas (JP 3-09.3)." | B-9, p. B-3; glossary |
| 3 | The FPF "takes precedence over all other fire targets" | "The FPFs target the highest type of priority targets and takes precedence over all other fire targets." | B-18, p. B-11 |
| 4 | "fire is conducted at the maximum rate until the mortars are ordered to stop, or until ammunition is depleted" (page, caption, model comment) | "The FPFs differ from a standard priority target in that fire is conducted at the maximum rate until the mortars are ordered to stop, or until ammunition is depleted." | B-18, p. B-11 |
| 5 | "Initiation of the FPFs is the signal for elements, crews, and individual Soldiers to shift fires to their assigned portion of the FPL" | Exact sentence | A-51, p. A-18 |
| 6 | "An FPL becomes the machine gun's part of the unit's FPFs. An FPL is fixed in direction and elevation." | Exact sentences | C-69, p. C-21 |
| 7 | "the FPL is always the left or right limit of an assigned primary sector of fire" (and the drawing puts each FPL on its gun's sector edge) | "The FPL is always the left or right limit of an assigned primary sector of fire." | C-69, p. C-21 |
| 8 | Grazing fire: "center of the cone of fire does not rise more than 1 meter above the ground"; it "is only possible when the terrain is level or sloping uniformly" | "Automatic weapons achieve grazing fire when the center of the cone of fire does not rise more than 1 meter above the ground. Grazing fire is employed in the final protective line (FPL) in the defense and is only possible when the terrain is level or sloping uniformly." | C-23, p. C-8 |
| 9 | "the unit plans indirect fires, including M320s, to cover dead space along the FPL" | "The unit plans indirect fires, including M320s, to cover dead space along the FPL." | C-23, p. C-8 |
| 10 | The FPF box is 60 by 30 m, "the size ATP 3-21.8 lists for the FPF of two 60-mm mortars"; the model's beaten zone is 30 m deep | Table B-1, "Normal final protective fires dimensions for each number of mortars": 60 mm, 2 tubes, width 60 m, depth 30 m | Table B-1, p. B-12 |
| 11 | Two machine guns at the ends of the wire whose FPLs cross in front of it (drawing choice, consistent with doctrine) | FPL "checked by interlocking fire" (B-18); C-137: machine guns "provide overlapping and interlocking fires with adjacent units … When FPFs are called for, machine guns (aided by M249 fires) place a barrier of fixed, direct fire across the platoon or squad front." Not quoted on the page. | C-137, pp. C-38 to C-39 |
| 12 | "ATP 3-21.8, 2024" and the title given in the source line | Title page and footer: "ATP 3-21.8 (INCL C1)", "11 January 2024" | Front matter |

Not doctrinal claims (labelled notional on the page and in METHOD.md): the speeds, the 30 rounds and the rate of 7.5 per second, the check rate, the window of 0 to 80 m that works in the model, the losses, the 150 m direct-fire range, the distances of the wire and the holes, the composition drawn (16 riflemen in 8 holes, an enemy assault of two squads, a support team of four), and soldiers drawn at 1.5× scale. The page shows no risk-estimate distances, though Table B-1 gives them.

Corrections made while drafting: none yet.
