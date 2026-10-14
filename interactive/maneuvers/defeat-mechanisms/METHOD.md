# Defeat Mechanisms: method

An isometric bench model of the four Army defeat mechanisms, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT).

## Build

```sh
node interactive/maneuvers/defeat-mechanisms/scripts/build.mjs      # writes index.html
node interactive/maneuvers/defeat-mechanisms/scripts/model.test.mjs # checks every model number quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild. Test hook: `window.__defeatMechanisms` (`stop()`, `set(i, on)`, `toggle(i)`).

## The object

| Part | Stands for |
|---|---|
| Lit block of two halves on a slide table, joined by a link plate on its end face | The target: an enemy force in position; the link is its command and control |
| Engraved footprint on the table and the supply track that ends there | The force's prepared position and its line of support |
| Screw press: posts, crosshead, handwheel, screw, press bar on yokes | Destroy: the bar crushes the block (22 to 13 units high) |
| Lever on a pivot, rod guide, push rod and pad | Dislocate: the rod slides the block 14 units off its seat; the block is whole, but its seat and supply track now point at an empty spot |
| Saw on a carriage: blade in the seam plane, arbor, arm, tower, motor, rails and stops | Disintegrate: the blade cuts the link plate and the halves part (seam 1 to 8 units); neither half is touched |
| Clamp ring of twelve segments in a groove round the seat; supply cart, track and bin with spare crates | Isolate: the ring rises and the cart can no longer reach the block |
| Dial gauge (CAP %) | The target's capability left, from the model |

81 solids, about 700 paths. One lit accent: the target block.

## The model (notional)

- Each mechanism has an effort level aᵢ from 0 to 1. Capability left = Π(1 − 0.3·aᵢ) × (1 − 0.15·max(0, Σaᵢ − 1)).
- With n tools fully applied: 0 → 100%, 1 → 70%, 2 → 42%, 3 → 24%, 4 → 13%. Without the dilemma term (the tools one after another): 49%, 34%, 24% for 2, 3, 4.
- One tool alone scales with effort: half effort on one tool leaves 85%. This is the model's reading of ADP 3-0 para 2-11 ("results relative to how much effort is expended"); the dilemma term is its reading of "Using defeat mechanisms in combination creates enemy dilemmas that magnify their effects significantly" (same paragraph). The 0.3 and 0.15 are teaching values, not data.
- All four mechanisms are weighted equally. That is a simplification, not a doctrinal ranking (FM 3-0, 2022, para 3-109, puts destruction "at the core of all the defeat mechanisms"; the page does not claim otherwise).
- Motion rates (press 0.7/s, rod 0.8/s, saw 0.55/s, ring 1.2/s, cart cycle 6 s) are for legibility only. The ring rises only once the cart is behind it (cart centre ≤ y −42), so the two never pass through each other.
- The readout names the switched-on set and its settled value; the needle eases toward it.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: passed (asserts 100/70/42/24/13, 49/34/24, 85 at half effort, each single tool 70%, readout strings under 45 characters).
- `scripts/lines.mjs` (Anatomy line-end check): `line ends: 0` at rest (284 ends); 0 in pose 2 with all four applied (306 ends), via `drive.mjs` `["lines"]`. Two knurls that started above their cylinder base were fixed first.
- Captures: desktop 1440 (light), phone 390 (light), tour moments at +3.0, +6.5 and +9.5 s. Console clean, no sideways scroll at 390 px.
- 4× close-ups: block, link plate and blade in the seam (rest and all applied), lever, slot and pin, crosshead and handwheel, bin and cart, saw carriage at rest.
- No geometry audit (`kit/audit.mjs`): the figure has no tube or lathe parts, which is the case where the brief requires it. Painter's order is by depth with explicit keys for the blade (between the two halves), the press bar (after the block, before the near post) and the lever (above the guide and ring).

## Battlefield view (added 2026-10-13, new terrain style)

A Machine | Battlefield toggle (buttons under the card, the V key, `localStorage["maneuvers.view"]`) shows the same model state on full-bleed terrain drawn with `../kit/terrain.mjs` (`scripts/field-scene.mjs`). The machine view, its text and its numbers are unchanged. Test hook additions: `window.__defeatMechanisms.setView(v)`, `.view()`.

**Scale:** operational. Each small vehicle is a platoon, each cluster of three a company (trBattalion's convention); trucks and command vehicles stand for themselves. Vehicles are drawn far larger than scale.

| Bench part | Battlefield element | Driven by |
|---|---|---|
| Target block (lit) | Enemy mechanized battalion: three companies of three vehicles dug in facing right, with its fire sector on the ground | all four |
| Link plate | Its command post: two command vehicles and two antenna masts behind the centre | `S.s` |
| Supply cart, track, bin | Three supply trucks shuttling along the road from the left | `S.i` |
| Press (destroy) | An artillery battery (4 guns, lower right) and a company in an attack-by-fire position (chalk outline on a rise) knock out company vehicles, nearest the position first; wrecks stop, grey and smoke | `S.d` |
| Lever (dislocate) | An armored company drives round the far (northern) flank to the enemy's rear and fires into it; the enemy's positions and fan still face right, its vehicles back out and turn toward the threat (far company most) | `S.l` (route progress) |
| Saw (disintegrate) | Battery guns 3-4 strike the command post: command vehicles knocked out, masts topple, surviving company vehicles drift 9-18 units off their positions in random directions and fire raggedly (wider scatter, fewer bursts) | `S.s` |
| Clamp ring (isolate) | A company comes up a farm track to a chalk blocking position astride the supply road; once it is on the road (S.i > 0.55) the trucks stop where they are, or 22 units short of the block, and the one nearest the block is hit | `S.i` |

Losses (notional, `model.mjs` `LOSS`, `losses()`, `fieldText()`): red vehicles by mechanism at full effort destroy 5, dislocate 1, disintegrate 2, isolate 1, each × that mechanism's effort and rounded. Blue: destroy 2, dislocate 1, disintegrate 1 (a gun, counter-battery), isolate 1, each × effort × (0.4 + 0.6 × capability left), total rounded and shared out by largest remainder. Results (blue vs red): none 0 vs 0; destroy alone 2 vs 5; dislocate 1 vs 1; disintegrate 1 vs 2; isolate 1 vs 1; destroy + isolate 2 vs 6; three (no disintegrate) 2 vs 7; all four 2 vs 9 (singles would sum to 5 blue). The readout in this view is `<set> · <capability>% left · <blue> vs <red> down` for the switched-on set (settled values, as the machine's readout); the wrecks on the ground follow the eased state. A casualty-evacuation vehicle shuttles to the rear whenever blue has losses.

Notional, labeled so on the page: unit sizes, positions, routes, timings, the loss counts and the one-element-per-mechanism mapping (the figure's simplification). New doctrinal claims (FM 3-90, 2023, paras B-3 and B-5) are in FACTCHECK.md, pending.

Checks (2026-10-13): `model.test.mjs` passes (adds the loss numbers above, per-element shares summing to the total, field readouts under 45 characters). `drive.mjs` + `["lines"]`: field view at rest 0 floating ends (220 ends), field with all four applied 0 (220); machine after V with all four applied 0 (306), machine at rest 0 (306). Console clean in all runs, including `--reduced`. 390 px: no sideways scroll (scrollWidth 390); the phone crops the sides of the field (battery partly cut). Frame timing in the field view during the tour (rAF wrapper, 6 s): desktop 60.0 fps, JS p50 0.50 ms / p95 1.70 ms, no gap over 25 ms; 390 px with 4× CPU throttle 59.7 fps, p50 1.40 / p95 4.20 ms, 2 gaps over 25 ms. 4× close-ups of the command post, the block and halted trucks, wrecks and scrapes.
