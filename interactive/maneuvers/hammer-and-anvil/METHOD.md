# Hammer and Anvil: method

An isometric swing-hammer bench that models the hammer and anvil, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT). Built from the Figure 1 (`flank-attack`) template. Machine view plus a Battlefield view (added 2026-10-13, below). `model.mjs` returns normalized state (fractions, phase) with no geometry; all positions are computed in `scene.mjs`, so a Battlefield view can read the same state later.

## Build

```sh
node interactive/maneuvers/hammer-and-anvil/scripts/build.mjs      # writes index.html
node interactive/maneuvers/hammer-and-anvil/scripts/model.test.mjs # checks every number the page quotes
```

`index.html` is generated. Edit `scripts/page.html` (text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Block on a pallet riding a straight lane (flag on top) | The enemy force |
| Lane past the pit to a far bumper | The enemy's way out |
| Blacksmith's anvil rising from a pit across the lane | The anvil: the stationary blocking force |
| HOLD dial | How long the anvil can still hold on its own (notional endurance) |
| Lit hammer head on a swing arm, pivot post, counterweight | The hammer: the mobile striking force |
| Latch post (rest) and buffer post (end of stroke), engraved arc scale | Release and limit of the hammer's swing |
| Slider / arrow keys | When the hammer lands, relative to the anvil being fully up |

How it differs from Fig 2 (double envelopment): there a ram fixes the front while two jaws close round both flanks at once. Here one part is a fixed stop, one part moves, and the outcome depends on order and timing.

## The model (all notional)

Run clock t = 0 when the anvil starts to rise. User sets delta = hammer landing time minus the moment the anvil is fully up.

- Anvil rises over 1.4 s (smoothstep), holds 3.0 s, then sinks over 0.8 s.
- Hold dial: 100% until set, falls linearly to 0% over the 3.0 s hold.
- Hammer: release at landing minus 1.2 s; swing fraction = (elapsed / 1.2)^2 (accelerating).
- Caught if and only if the anvil is fully up at landing: 0 ≤ delta ≤ 3.0 s. Caught freezes the anvil up and the dial at its landing value (e.g. delta 1.0 s → 67%).
- Otherwise ("early" delta < 0, "late" delta > 3.0) the block slides on to the bumper (time constant 0.25 s).
- Geometry (scene.mjs, computed): arm radius 70, swing −75° to +20°, the head's front face at the end of the stroke puts the block exactly against the anvil face (x = 71); a pallet over the pit holds a rising anvil down at rail height.

Readouts (changed 2026-10-13 to end with the casualty count, "N vs M down", blue vs red): "Lands +1.0 s · caught · 3 vs 7 down", "Lands −1.0 s · escapes · 3 vs 2 down", "Lands +4.0 s · anvil spent · 4 vs 2 down"; idle "Set to land 1.0 s after anvil sets"; mid-run "Anvil 100% set · hold 50% · 2 vs 0 down". The original readouts were "Lands 1.0 s after anvil sets · caught" etc.; the signed form makes room for the count under 45 characters.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: passes. Asserts every constant quoted, the 0–3.0 s window at 0.1 s steps, anvil and dial values at key times, caught/escape behaviour, readout strings and lengths (< 45 chars), that the stroke ends with the block on the anvil face, and that the push is monotone.
- `scripts/lines.mjs` on the page: line ends 0. `drive.mjs` `["lines"]` at rest, mid-swing in contact, caught, early (escaped), late (anvil sinking) and late (escaped): 0 in every pose.
- `capture.mjs` at 1440 px and 390 px, light: console clean, no sideways scroll.
- 4× close-ups: hammer head against block, block caught on anvil, anvil rising through the pit and near rail section, pivot/hub/arm, latch post, gauge, bumper. Fixed after review: arc-strip tick ends (crease), anvil held down by a pallet that merely touched the pit rim, post clearance to the arm, anvil shape (foot, waist, stepped horn).
- Tour contact sheet (16 frames, 1.1 s apart): early → escapes, reset, on time → caught, reset; the late case follows (full loop about 20 s).
- No geometry audit (`kit/audit.mjs`): no tube or lathe parts.
- Part count: 65 solids.

## Battlefield view (added 2026-10-13, terrain style)

A Machine | Battlefield toggle (buttons, V key, `localStorage["maneuvers.view"]`) shows the same state on full-bleed terrain, drawn with `../kit/terrain.mjs` after the Fig 1 reference. Code: `scripts/field-scene.mjs` (layout `FG`, `fieldStatic`, `fieldTargets`, `fieldPose`, `fieldMarks`, `fieldSmoke`); `build.mjs` builds the field SVG and inlines `field.mjs`, `terrain.mjs` and `field-scene.mjs` for the page. The machine view and all fact-checked text are unchanged; the page gains one "Battlefield view" paragraph and one casualty paragraph under "What is notional".

**Scale and reading.** A company-team vignette (TERRAIN.md lists hammer and anvil at company/battalion scale): FM 3-90 C-24's blocking force "on or to the rear of a natural terrain obstacle" becomes a river line with one bridge, the enemy's way out. Anvil: two rifle squads and a machine-gun team (22 figures with the platoon leader and RTO) in two-Soldier fighting positions on the far bank, facing back across the river, MG on the bridge. Hammer (lit, main effort): a platoon of four tracked vehicles from a chalk line of departure. Enemy: a platoon (20 figures) with two vehicles in a hasty perimeter in the pocket. Two blue fire teams on low rises either side stand for the rest of the encircling force (FM 3-90 uses the technique on an encircled enemy; the bench's lane is its simplification).

| Model state | Battlefield |
|---|---|
| `anvil` 0→1 (1.4 s), hold, sink | Anvil moves from cover in the wood edge into its positions; when the hold is spent (and nothing was caught) it climbs out and pulls back to cover, carrying its casualties |
| `hold` | Anvil's fire rate (0.3 + 0.55 × hold) and its MG fan's opacity |
| `swing` (u², release to landing) | Hammer advances linearly in time (√swing) from the LD to the near bank; the enemy falls back ahead of it (smoothstep of √swing from 12%) and reaches the bank exactly at landing, as the bench block reaches the anvil face (tested) |
| `escape` | Uncaught enemy funnels into file over the bridge and runs past the anvil to the far wood edge (exp slide, capped at 70 units per model second) |
| `down` (model `downAt`) | Greyed prone figures, a stopped smoking vehicle (hammer always; one enemy vehicle when caught), medic at the anvil's casualty collection point |

The field view plays runs at 0.6× the bench's speed (`FG.RATE`) so movement reads; every position is a pure function of the state, so the timing relations (who arrives first) are identical. While the bench resets after a run the battlefield holds the last frame, then cuts to the start. Notional: distances (hammer LD to bank 76 units, enemy start to bank 52, anvil move 15), all unit sizes, and figure scale (about 1.5× too large, as on every figure).

**Casualties (notional, `model.mjs` `LOSS`, `downAt`, `casualties`).** Anvil: round(3 × wear) where wear = share of the hold used up while the enemy is still in the pocket (frozen at landing), +1 when caught (the enemy is driven onto it), +2 if early (overrun while moving in). Hammer: 1 at landing. Enemy: 2 at landing, +6 if caught minus round(2 × wear). Examples: −1.0 s → 3 vs 2; 0.0 s → 2 vs 8; +1.0 s → 3 vs 7; +3.0 s → 5 vs 6; +4.0 s → 4 vs 2. Both sides always lose at least one once the hammer lands (tested at 0.1 s steps).

**Battlefield checks (2026-10-13).**
- `node scripts/model.test.mjs`: passes (casualty constants and examples, both-sides rule, readout strings, every readout under 45 characters over a time grid, and the field mapping: bank at landing, hammer never inside its 28-unit gap, escapees past the anvil).
- `lines.mjs` via drive (V key / setView): field at rest 0, field caught (+1.0 s, t 6) 0, field late withdrawing (+4.0 s, t 5.0) 0; machine at rest 0, machine caught 0.
- Console clean; 390 px: no sideways scroll (scrollWidth 390); phone shot read.
- Frame timing (rAF wrapper, tour in field view, 6 s): desktop 60.0 fps, JS p50/p95 0.6/1.2 ms; 390 px with 4× CPU throttle 59.7 fps, 1.9/5.0 ms (2 frames over 25 ms).
- 4× close-ups read: anvil positions with occupants and MG nest, tracer ends, vehicles, greyed casualties.
- Thumbnail kept (machine).
