# Lanchester Square Law: method

Fig 35. An isometric bench balance for Lanchester's square law, with a Battlefield view, drawn with the shared Anatomy kit (`../kit/iso-kit.mjs`, `../kit/field.mjs`, `../kit/terrain.mjs`, MIT). Size: Figure.

## Build

```sh
node interactive/maneuvers/lanchester/scripts/build.mjs      # writes index.html
node interactive/maneuvers/lanchester/scripts/model.test.mjs # checks every model number the page quotes
```

`index.html` is generated. Edit `scripts/page.html` (text and chrome), `scripts/scene.mjs` (the balance's parts), `scripts/field-scene.mjs` (battlefield), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (plate, live code), then rebuild. No tube or lathe parts, so no geometry audit.

## The object

| Part | Stands for |
|---|---|
| Lit beam on a knife-edge fork on a pillar, with a pointer over a scale plate | The comparison of fighting strengths; it tips toward the stronger side |
| Discs (blue, red), one per man, stacked on hanging pans | The men still fighting |
| Riders that slide out one scale mark (4.5 units) per disc on their pan | Square law: N discs at k·N from the pivot give a moment of k·N², i.e. strength ∝ N² |
| The same riders locked at one mark (law knob turned to linear) | Linear law: moment ∝ N |
| Shelf behind the beam holding red group B | A red group that is not in the fight (defeat in detail); it moves onto the pan when blue engages it |
| Trays at the front, discs in columns of five, grey | Men down on each side |
| Step dial (270° sweep over 46 steps, the one engraved label "STEP") | Steps of attrition fought |
| Law knob | Square (aimed fire) or linear (area fire) |
| Base plate on feet, groove, screws, label plate, ruler strip | The bench |

Part count: plate group about 14 (plate, 4 feet × 2, groove, 4 screws, label plate, ruler strip), pillar group 9 (plinth, collar, column, block cap, block, 2 cheeks, pin, index bracket and plate), beam group 5 (beam, 2 end weights, pointer, scale), each side 6 (rider, thumb screw, hook block, 2 rods, pan) × 2, shelf 3, 2 trays, dial group 6, knob group 4, plus the disc stacks: about 60 solids.

## The model (`scripts/model.mjs`)

Equations (Lanchester 1916, ch. V, sec. 21, eqs. 1–2, c = k): square law db/dt = −α·r, dr/dt = −α·b. Linear law, as the unaimed area-fire form (the page labels this choice as the model's): db/dt = dr/dt = −β·b·r, which keeps b − r constant, the same end state as Lanchester's "ancient conditions". Integrated with RK4 at 0.01 step, stored every 0.05 step.

Notional values (all stated on the page):
- Forces: blue 16; red 20 in two groups of 10 (A, B).
- α = 0.06 hits per man per step (square); β = 0.02 (linear).
- Plans: **detail** (concentrate): blue fights A alone; when A is out, blue spends 4 steps shifting (no fire), then fights B. **both**: blue fights A + B together, its fire split in proportion to group size.
- A group under 0.5 men is out (finite men); counts shown are round(N), 0 below 0.5.
- Slider range 0–46 steps; the readout's step counter stops at the battle's end.
- Balance: k = 4.5 units per man, linear rider distance d0 = 45; tilt = 11°·tanh(Δmoment / 60), Δmoment in man² units; riders drawn no closer than 24 units to the pivot (fewer than 6 discs; drawing only, the tilt uses the true moment).

Results (tested):

| Law / plan | End | Blue left | Red left | Down (blue vs red) |
|---|---|---|---|---|
| Square / concentrate | step 33 (A out at 11.6, 3 blue down) | 8 | 0 | 8 vs 20 |
| Square / both at once | step 18 | 0 | 12 (6+6) | 16 vs 8 |
| Linear / concentrate | step 46 (A out at 17.5) | 0 | 4 | 16 vs 16 |
| Linear / both at once | step 25 | 0 | 4 (2+2) | 16 vs 16 |

Square-law check: 20² − 16² = 12². Lanchester's own numbers (1,000 vs 500 + 500: 134 then 293 lost) are reproduced in closed form in the test. Readout examples: "Step 8 · Blue 13, Red 3+10 · 3 vs 7 down", "Step 33 · Blue 8, Red 0+0 · 8 vs 20 down" (all readouts < 45 characters, tested).

## Battlefield view

Scale: an abstract idea shown as a concrete small-unit vignette with individual soldiers (TERRAIN.md table, third row). 16 blue riflemen (lit, the one main element) in one prone line against 20 red riflemen in two prone lines of 10 on open pasture, both in the open "on terms of equality", as Lanchester assumes. A wood between the red groups masks each from fire across to the other. Same state as the machine: `fieldPose({law, plan, t})` calls `stateAt` and `casualties` from `model.mjs`.

| State | Battlefield |
|---|---|
| detail, phase A | Blue line at (u −26, v −52), facing group A; group B (at v +52) lies idle behind the wood's screen |
| detail, shift | Blue stands and walks round behind the wood's tail (via u −52, v 0) to (−26, +52); men down stay at the old line |
| detail, phase B | Blue fights group B |
| both | Blue line at (−40, 0) in front of the wood, both red groups fire on it |
| men down | From `casualties()`: greyed, still, prone (side fc / hc); blue ones where they were hit, the first at a collection point (u −60, v −22) with a kneeling medic (not counted) |
| linear law | Unaimed fire: tracers to points spread 6 units round the enemy, scatter 9, impact smoke |
| fans | One faint blue fan toward each red group being engaged |

All sizes, distances, rates of fire and timings are notional; figures drawn about 1.5× scale. No formation or doctrine claims are made, so no ATP 3-21.8 citations. Map symbols: none.

## Decisions made (overnight authority)

- Linear law implemented as area fire (losses ∝ b·r), not Lanchester's one-on-one "ancient" duels; both give the same end state, and the brief asks for unaimed/area fire. The page says this is the model's form.
- Scenario: 16 vs 10 + 10, chosen so concentration flips the winner under the square law and does not under the linear law.
- Battles fought to the end (as in Lanchester's examples), with a page note that real units break much sooner.
- Blue's 4-step shift without fire between the two fights.
- Changing law or plan restarts the battle at step 0.
- Contested-application source: Lucas & Turkes (2004), quoted from the abstract (Wiley full text is paywalled; the abstract was read via OpenAlex's copy; DOI linked).

## Checks run (2026-10-14)

- `node scripts/model.test.mjs`: passed.
- `capture.mjs` desktop 1440 (light, reduced motion): console clean, no sideways scroll.
- `lines.mjs` machine at rest: `line ends: 0 of 431`.
- drive.mjs: machine square/concentrate step 22: 0 of 423; machine linear/both step 12: 0 of 419; field linear/both step 12: 0 of 128; field square/concentrate step 24: 0 of 124; field during the shift (step 13.6): 0 of 118.
- 390 px: field square/both step 6: 0 of 122; machine: 0 of 425; no sideways scroll; console clean.
- 4× close-ups: pivot, fork, pointer and scale plate; red rider, hanger rods, pan, stacks and shelf. Hanger rods moved from the pan's front and back to its left and right so the front rod no longer crosses the stack.
- Frame timing (rAF hook, 6 s of the tour): field view 60.0 fps, JS p50/p95 0.3/1.4 ms; machine view 60.0 fps, 3.3/5.5 ms (it rebuilds the balance per frame); field at 390 px 60.0 fps, 0.3/0.7 ms. No CPU-throttle run.
- thumb.png from the machine view at step 8 (scale 2, cropped 16:10).
