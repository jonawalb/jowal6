# Crossing the T: fact check

VERIFIED 2026-10-13 by an independent fact-checker (Andidora, NWC Review 44:2, 1991, pp. 52, 60–61; Yoji Koda, NWC Review 58:2, 2005, p. 34). All quotes verbatim. No reliable source disputing the crossing was found, so the page claims no debate and keeps its hedge. Fixed: "the same masking" became "a similar masking effect"..

Sources opened this session (2026-10-13):

- Ronald Andidora, "Admiral Togo: An Adaptable Strategist," *Naval War College Review* 44, no. 2 (Spring 1991), article 5, pp. 52–61. https://digital-commons.usnwc.edu/nwc-review/vol44/iss2/5 . The live site serves a Cloudflare challenge to scripts; read from the archived PDF https://web.archive.org/web/2024id_/https://digital-commons.usnwc.edu/cgi/viewcontent.cgi?article=3663&context=nwc-review (scanned images; text read by OCR, so check punctuation against the page image).
- Yoji Koda, "The Russo-Japanese War: Primary Causes of Japanese Success," *Naval War College Review* 58, no. 2 (Spring 2005), pp. 10–44. https://digital-commons.usnwc.edu/nwc-review/vol58/iss2/3 . Read from the archived full-issue PDF https://web.archive.org/web/2024id_/https://digital-commons.usnwc.edu/cgi/viewcontent.cgi?article=2201&context=nwc-review (text layer).

| Claim on the page | Source | Where |
|---|---|---|
| Japan's fleet under Admiral Togo Heihachiro destroyed the Russian Baltic Fleet "in the Tsushima Strait on 27-28 May 1905" | Andidora | p. 52, first paragraph ("naval victory, orchestrated by Admiral Togo Heihachiro"; "a two-day battle of annihilation which destroyed the transplanted Russian Baltic Fleet in the Tsushima Strait on 27-28 May 1905") |
| Combined Fleet doctrine held that the battleship force "was to concentrate its fire on the leading ship, presumably the flagship, of the enemy's main force at the very outset of an engagement" | Koda | p. 34, paragraph headed "The Competence of Gunners and Spotters" ("A core tenet of the operational doctrine of the Combined Fleet had been gun engagement between main forces… Specifically, the battleship force (the 1st Squadron) was to concentrate its fire on the leading ship…"). |
| Togo's opening turn was made in succession toward the Russians, and "each Japanese ship would have her own guns masked by the preceding ships until she completed her turn" | Andidora | p. 60, paragraph beginning "Togo's battle fleet appeared out of the mist" |
| The Japanese battle line was "twice able to cross the Russian 'T,' delivering the full weight of its broadside to enemy ships which could only respond with guns facing forward" | Andidora | pp. 60–61, paragraph beginning "Every ship in the Japanese battle line made the turn successfully" (sentence runs across the page break) |
| Caption: same quote, attributed to Andidora (Naval War College Review, 1991) | Andidora | pp. 60–61 |

Framing on the page, not a sourced claim: "The phrase 'cross the Russian T' is Andidora's … this page does not claim that the Russian column was ever caught as cleanly across its head as the bench holds it."

Not factual claims: every number on the bench and in the readout (ships per side, turrets, arcs, masking distance, pivot distance, gun counts, swing rates) is notional and labeled so on the page and in METHOD.md.

## Battlefield view (added 2026-10-13): UNVERIFIED: pending independent check

The Battlefield view paragraph (fifth item of "How to read it"), the field caption and the field legend add no new sourced facts. They describe the drawing and the model, and they reuse the Koda claim already verified above. Rows for the checker:

| Claim on the page | Source | Where | Status |
|---|---|---|---|
| "The ships are generic turret-era battleships, not models of any real ship" | none needed: a description of the drawing, not a historical claim | n/a | UNVERIFIED: pending independent check (confirm no ship type, class or nation is named) |
| "In this model, square across, each blue turret's nearest reachable target is the column's leader, so all eight hits fall on it, the pattern of the Combined Fleet tenet Koda describes below" | model.mjs `hitsAt` (asserted in model.test.mjs); Koda, p. 34 (already verified above) | p. 34 | UNVERIFIED: pending independent check (check the wording links to Koda without claiming the model reproduces the doctrine) |
| Readout "N vs M hits" and every hit, range, timing and size in the view | notional, model.mjs | n/a | not a factual claim; labeled notional on the page |


VERIFIED 2026-10-13 (independent checker, Battlefield view rows): no ship type/class/nation named, PASS; hitsAt claims match model.mjs and model.test.mjs (column [8,0,0,0], line 1; end-on 1 and 1), PASS; Koda link reworded so it no longer reads as the model reproducing doctrine (the concentration falls out of the geometry), FIXED.
