# Oblique Order: method

Figure 31. An isometric bench model of Frederick the Great's oblique order, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, MIT), with a Battlefield view (`../kit/terrain.mjs`, new style, rebuilt 2026-10-13) loosely after Leuthen, 5 December 1757.

## Build

```sh
node interactive/maneuvers/oblique-order/scripts/build.mjs      # writes index.html
node interactive/maneuvers/oblique-order/scripts/model.test.mjs # checks every number the page quotes
```

`index.html` is generated. Edit `scripts/page.html` (text and chrome), `scripts/scene.mjs` (moving parts), `scripts/field-scene.mjs` (Battlefield view), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code).

## The object

| Part | Stands for |
|---|---|
| Twelve blocks on sprung slides, in four sectors of three (dividers between sectors) | The enemy's line of battle |
| Long beam pivoting on a carriage at its right-hand end | The attacking line; the pivot end is the wing that can be refused |
| Carriage on two rails, with an angle quadrant and lock knob | Keeps the leading pad touching the enemy line at any angle |
| Four contact pads on the beam's far face, one per sector | Where each part of the line can come to grips; the leading pad (lit) is the strong wing |
| Eight weights on four pegs | The attacker's strength and how it is distributed |
| Dial (0 to 3, 1:1 marked) | Best force ratio anywhere the lines touch |
| Frontage ruler, label plate | Bench furniture |

Part count: about 75 (plate, 4 feet, label, ruler; bed, backstop, 3 dividers, 2 end stops, 12 blocks, 12 springs with seats; 2 rails, 2 stops, carriage with 4 shoes, quadrant, beam, 2 casters, 4 pads (sleeve, rod, plate), pivot hub and knob, 4 pegs, 8 weights; dial with pedestal, column, bezel, needle).

## The model (all notional)

- Defender: 12 equal blocks, 3 per sector. Attacker: 8 equal weights. Spread = 2, 2, 2, 2 per peg; massed = 6, 0, 0, 2 (four weights move onto the leading peg, top weight first).
- Pads are 48 units apart along the beam. The carriage keeps the leading pad on the enemy line, so sector j's gap is `48·j·sin(angle)`; a sector is in contact if the gap is at most 4 units (the pads' reach). Sector 2 leaves contact at 4.8°, sector 3 at 2.4°, sector 4 at 1.6°; at 14° the last pad is about 35 units clear.
- In contact, the side with more weight wins the sector (ratio = weights / 3). Winner pushes the loser back: blocks travel 8 units back on a win, 2 forward on a loss (the pad is pushed in).
- Readout: the sector results with zero counts left out (`W win · E even · L lose · R refused`), the best ratio where the lines touch, then figures down, friendly vs enemy (`N vs M down`); if a transient mix of results would pass 44 characters the ratio is dropped (the dial still shows it). Cases: spread parallel `4 lose · 0.7:1 · 36 vs 8 down`; massed parallel `1 win · 3 lose · 2.0:1 · 12 vs 20 down`; massed at 14° `1 win · 3 refused · 2.0:1 · 3 vs 18 down`; spread at 14° `1 lose · 3 refused · 0.7:1 · 9 vs 2 down`. `model.test.mjs` checks every angle from 0 to 16° in quarter degrees against ten load states for length.
- Casualties (notional, `casualties()` in model.mjs, added with the new Battlefield view): only a sector in contact with battalions on both sides fights. There the winner loses 1 figure per opposing battalion, the loser 3, an even fight 2 each; refused sectors and sectors with no attacking battalions lose nobody. So spread parallel costs 9 vs 2 per sector (36 vs 8), massed and swung 3 vs 18.
- The massing now runs at 1/3.6 per second (was 1/2.6), so the battlefield's march reads as a march; the tour's timings still fit (mass at 3 s, done by about 6.6 s; swing at 7.5 s).
- The bench stops at 16°; Carlyle's account gives 45° for Leuthen. The page says so.

## The Battlefield view (new style, 2026-10-13)

Full-bleed isometric terrain (`kit/terrain.mjs`), no board. Scale: the bench's sectors and battalions, so a grand-tactical picture: each weight is a Prussian battalion and each block an Austrian battalion, drawn as period linear infantry (a short line of 14 musketeers in three ranks of five, the colour in the centre of the middle rank, an officer with a spontoon in front; cocked hats, muskets) and horse as squadrons of two ranks of three. Figures are drawn about 1.5x scale, as the kit's soldiers are. Field coordinates are the bench's scaled by 0.8 along the lines (`FG.FS`), so the same sectors line up: Austrian battalion i stands at 0.8 x the bench's block i.

| On the ground | Stands for | Driven by |
|---|---|---|
| 12 red battalions in line, 3 per sector | The Austrian line (the bench's blocks) | `S.push`: pushed back 1.4 x the block travel where the attacker wins, turned up to 22 degrees and loosened, two stragglers each heading for the rear; 2.8 forward where the attacker loses |
| 8 blue battalions on a wheeling line | The Prussian battalions (the weights) | The line frame pivots on its refused end exactly as the beam: the leading front rank stays at musket range (12 units) from the Austrian front, the sector j front is 0.8 x 48 j sin(angle) further off. Two abreast per sector, massed rows 11 deep |
| Lit battalion | The leading battalion of the strong wing (weight 0) | always at the head of sector 1 |
| Four battalions marching in column | The four moving weights (scene.mjs MOVES) | Each mover's progress t: back from its slot, along a road behind two low knolls, up the far flank and into the rows behind the leading battalions; line folds into column in the first and last tenth of the march |
| Two blue squadrons on a knoll off the Austrian right, pacing | Carlyle's Prussian cavalry on the Borne knolls | clock only |
| Three red squadrons behind the Austrian line | The Austrian reserve horse, ridden off to their right | Progress eased toward `S.mass` at 0.2 per second (the timing is the view's) |
| Volley flashes and powder smoke (no tracers) | Musket volleys | Every battalion in a sector in contact with battalions on both sides fires every 3.4 to 4.3 s at its own phase; 3 smoke puffs per volley along its front rank, drifting for 3.4 s |
| Greyed fallen figures | Casualties, both sides | `casualties()`; shown counts ease toward the model's at 7 (Prussian) and 9 (Austrian) per second; each fallen man is taken from a battalion's ranks (front rank first) and lies where the lines met |
| Two bearers with a litter | Carrying the Prussian wounded back | Shuttle on the clock between the latest Prussian casualty and a farm behind the line |
| Hamlet with flag; village with church tower; fir copses, fields, hedges, roads | Sagschutz (objective), Leuthen, the "champaign" of Carlyle p. 274 | static |

Notional: battalion and squadron counts and sizes, frontage, spacing, musket range, the push, the march route, the casualty rule, the horse's timing. Colours are affiliation tints, not uniforms. No map symbols are used, so the MIL-STD-2525D citation was removed from the page with the old board view.

Rendering: each figure is drawn once per look (facing, pose, role, stride) and placed with a translate, battalions re-draw only when their look changes, groups step every 2.6 units of travel, ground shadows use `fill-opacity` (not `opacity`, which costs a compositing layer per figure). About 340 foot figures and 30 riders; field SVG about 4,800 paths.

## Checks run (2026-10-13, first build; its Battlefield lines refer to the old board view)

- `model.test.mjs`: all passed.
- `lines.mjs` via drive scripts: Machine view, line ends 0 at rest (spread, 0°), 0 massed at 0°, 0 massed at 14°. Battlefield view, 0 at rest (spread, 0°) and 0 massed at 14°.
- Console clean in every run; no sideways scroll at 390 px in either view.
- Captures: desktop (tour moments at 0, 5.2, 6.5 s), phone 390 px in both views, 4× close-ups of the leading pad and weight stack, the springs and backstop, the pivot carriage and quadrant, the dial, and the massed counters at the enemy's flank. Fixes from the close-ups: plate tightened and the dial and label moved into the beam's empty sweep; spring seats added on the backstop so coil ends land on a part; centre slot made a closed outline.
- No geometry audit: no tube or lathe parts.

## Checks run for the new Battlefield view (2026-10-13, late)

- `model.test.mjs`: all passed (new readout strings, casualty rule, readout length over every angle and ten load states).
- `lines.mjs` through drive scripts at 1280 px: Battlefield at rest (spread, 0 degrees) 0 floating ends of 122; Battlefield massed at 14 degrees 0; Machine (V key) massed at 14 degrees 0 of 532; Machine spread at 0 degrees 0. At 390 px: Battlefield 0, Machine 0.
- Console clean in every run; no sideways scroll at 390 px (scrollWidth 390).
- Frame timing (rAF hook, 6 s of the tour in the Battlefield view): desktop 1440 px 60 fps, JS 0.9 ms median, 2.6 ms p95, no late frame; phone profile (390 px, DPR 3, 4x CPU throttle) about 49 fps, JS 2.7 to 3.5 ms median, 9 to 10 ms p95. First build ran 17 fps on desktop; the fixes were fill-opacity shadows, cached figures, merged parts and a slower group cadence.
- Close-ups at 5x of the massed wing and the beaten Austrian sector, the cavalry on the knoll, and the refused wing. Fixed from them: stroked battalion shadows (read as bases), overlapping pacing squadrons.
