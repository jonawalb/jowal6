# Center of Gravity: method

An isometric bench model of a center of gravity, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT).

## Build

```sh
node interactive/maneuvers/center-of-gravity/scripts/build.mjs      # writes interactive/maneuvers/center-of-gravity/index.html
node interactive/maneuvers/center-of-gravity/scripts/model.test.mjs # checks the model numbers quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Lit keystone at the crown | The center of gravity: the source of strength the rest depends on |
| Eight voussoirs on two piers | The force's other parts, which bear load only through it |
| Screw puller (posts, beam, hand wheel, screw, lug) | The action taken against the center of gravity |
| Nine glass load columns, one per stone, in arch order | How much each part still carries |
| Catch tray between the piers | Where the structure ends up once its center of gravity is gone |

## The model (`scripts/model.mjs`)

Real statics, notional numbers:

- Cut half the arch free at the crown. The force on the joint below stone i is the vector sum of the crown thrust H (horizontal) and the weight above that joint: `N_i = sqrt(H^2 + (w(0.5 + i))^2)`.
- Notional values: every stone weighs w = 1 (unit W), H = 2 W. Loads: keystone 2.06, then 2.50, 3.20, 4.03, 4.92 W at the springing (page rounds to 2.1, 2.5, 3.2, 4.0, 4.9).
- Share the keystone still carries at lift e: `b = max(0, 1 - e/12)` (notional straight line): 100% seated, 67% at 4 mm, 50% at 6 mm, 25% at 9 mm, 0% at 12 mm. Every column shows `b · N_i`, 3 mm of column per W.
- Failure at e = 12 mm: the keystone's foot (34·cos10° + 12 = 45.5 mm) has then cleared the top inner corners of its neighbours (46·cos10° = 45.3 mm), so the halves are free to rotate in. Geometry checked in the test.
- Lean before failure: each half rotates about its springing intrados by 90% of the gap the rising wedge opens (`e·tan10°`) at the first stone's top corner, so it never touches the keystone (0.80° at 4 mm, 2.41° at 12 mm).
- Collapse (notional choreography): halves lean in until 96% of the angle at which they would meet (10.3°) over 0.55 s, accelerating; then the crown stones (±1, ±2) fall into the tray over 0.8 s and lie on their crown-side joint faces, while the haunches (±3, ±4) fall back onto the piers. Rebuild rewinds this, then lowers the keystone.
- Puller: 2 mm lead, 9 turns of the hand wheel for the full 18 mm travel.

Arch geometry: 9 stones of 20° each, intrados radius 34 mm, extrados 46 mm, 16 mm deep; keystone proud to 49 mm with a flat top.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed.
- `scripts/lines.mjs` (Anatomy line-end check, light theme): 0 floating ends of 192 at rest; 0 of 190 at 8 mm lift (pose 2); 0 of 192 collapsed.
- Captures at 1440 px and 390 px (light), tour moments through the collapse and rebuild, 4× close-ups of keystone/lug/screw (seated and lifted), hand wheel and hub, load-column sockets and glass, springer on the impost. Console clean, no sideways scroll at 390 px.
- No geometry audit (`kit/audit.mjs`): the figure uses no lathe or tube parts. The arch stones are prisms drawn by a small local helper (`wedge` in `scene.mjs`) that follows the kit's own face-shading rules.
- 68 solids at rest.

## Battlefield view (added 2026-10-13, new terrain style)

`scripts/field-scene.mjs`, drawn with `../kit/terrain.mjs`, driven by the same state `S` as the arch (no second model). Scale: operational, battalion clusters, one vehicle per platoon (trBattalion's convention).

| Arch | Battlefield |
|---|---|
| Keystone (lit) | The enemy's armored reserve, a tank battalion (9 vehicles), lit, at the crossroads village behind its centre. Chosen because JP 5-0 p. IV-22 says an operational COG "is often associated with ... a powerful element of the armed forces". A bridge or depot would read as a critical requirement or vulnerability rather than the COG itself, so it was not used. |
| Voussoirs | Three mechanized battalions (27 vehicles in scrapes) holding a forward arc of radius 118 about the hub, with tracks from the hub to each wing |
| Puller / lift e | A blue armored battalion strikes the reserve from an attack-by-fire position on a rise past the southern flank, bounding from (-110, 130) to (-116, 94) as e goes 0 to 12; a blue mechanized battalion fixes the front with fire throughout and holds |
| Ring load share `bearing(e)` | The share of the reserve's tanks still fighting; the rest are knocked out nearest-first, greyed and smoking |
| Collapse (e >= 12) | The forward battalions pull out staggered, centre first, to rally areas in the rear and toward the flanks (eased over about 2.2 s, `FM.k`), leaving 3 stopped vehicles; scrapes stay empty |
| Rebuild | Resets the battle (button reads "Reset the battle" in this view) |

Losses (owner's realism rule): `losses(e, collapsed)` in model.mjs, notional, in vehicles: red = round(9 x (1 - b)) reserve + 3 abandoned on collapse; blue = round(3 x (1 - b)) strike + round(1 - b) fixing. 0/0 seated, 5 red / 3 blue at 6 mm, 12 red / 4 blue collapsed (asserted in model.test.mjs). A blue evacuation vehicle shuttles along the road from the strike force to the rear once blue losses start. The field readout shows the reserve's fighting share and the losses; the machine readout is unchanged.

Checks (2026-10-13): model.test passes. Line ends 0 in the field view at rest (234 ends), at 8 mm (236) and collapsed (230), and at 390 px; machine view 0 at rest (192) and at 8 mm (190), as before. Console clean; no sideways scroll at 390 px (scrollWidth 390). Frame timing over 6 s of the tour in the field view (lift, collapse, reset): desktop 60 fps, JS p50 0.4 / p95 1.0 ms; 390 px, DPR 3, 4x CPU throttle 60 fps, JS 1.1 / 2.6 ms, no frame gap over 25 ms. 54 vehicles plus one evacuation vehicle. Thumbnail unchanged (machine).
