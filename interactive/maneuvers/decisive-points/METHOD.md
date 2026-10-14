# Decisive Points: method

An isometric bench model of decisive points, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT). It pairs with Figure 7 (Center of Gravity): the same nine-stone arch on the same piers, but held up by pinned props instead of a screw puller.

## Build

```sh
node interactive/maneuvers/decisive-points/scripts/build.mjs      # writes interactive/maneuvers/decisive-points/index.html
node interactive/maneuvers/decisive-points/scripts/model.test.mjs # checks the model numbers quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Lit keystone at the crown | The center of gravity |
| Eight voussoirs on two piers | The rest of the enemy's structure |
| Four steel props (base plate, outer tube, collar, inner tube, head plate, wedge) under stones ±1 and ±2 | Decisive points: things that, acted on, change what the center of gravity has to bear |
| Pin through each collar, with a knob | Acting on a decisive point; pulled, it slides out and drops into the tray |
| Dial indicator on a stand, plunger resting on the keystone | The keystone's load as a share of what it can bear (arc marks 100–150%) |
| Catch pad under the crown | Where the keystone lands when it fails |
| Pin tray | Where pulled pins come to rest |

## The model (`scripts/model.mjs`)

All numbers are notional teaching values:

- Keystone load with every prop pinned: 30% of capacity.
- Share each prop carries, in % of keystone capacity: inner props 35 each, outer props 15 each (left to right on screen: 15, 35, 35, 15). Total if all four are pulled: 130%.
- Keystone load = 30 + sum of the shares of the props whose heads have dropped (a prop counts in proportion to how far its head has dropped, so the dial moves smoothly).
- Failure at 100%. Of the 16 combinations of pulled pins, only the 4 that include both inner pins fail. Both outer plus one inner gives 95% and holds; both inner alone gives exactly 100% and fails.
- Prop head drop when its pin is pulled: 8 mm. Dial full scale: 150%.
- Failure choreography (notional): the keystone falls 47.5 mm onto the pad (slowed fall, about 0.5 s); the plunger drops 3 mm to its stop and the needle returns to 0; each half whose outer prop has dropped then sags in by 30% of the angle at which the halves would meet (3.2°). The sag is drawn so no stone touches a dropped prop head or the other half. A real arch without its keystone would fall further; that is not modelled.

Arch geometry (same as Figure 7): 9 stones of 20°, intrados radius 34 mm, extrados 46 mm, 16 mm deep, springing 24 mm up. Prop heads sit on the stone's intrados chord: inner props at |y| = 12.25 under stones ±1, outer at |y| = 21.5 under stones ±2.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed (30, 45, 60, 95 holds, 65, 100 fails, 130 fails, 4 failing sets, all with both inner pins).
- `scripts/lines.mjs` (Anatomy line-end check, light theme): 0 floating ends of 110 at rest; 0 of 110 with three pins pulled (95%, pose 2); 0 of 110 after failure.
- Captures at 1440 px and 390 px (light): console clean, no sideways scroll at 390 px.
- 4× close-ups: dial face, ticks and over-capacity arc; collars, pins and knobs at rest; dropped prop heads under the arch; keystone on the pad between the inner props; pins in the tray; the crown after failure.
- Idle tour sampled: 45% → 95% → failed at 100% → resetting → 30%, looping in 17.5 s. Reduced motion: keys 2 and 3 fail at once, R resets, a click on a prop pulls its pin.
- No geometry audit (`kit/audit.mjs`): the figure uses no lathe or tube parts. Stones, prop heads and pins are prisms drawn by a small local helper (`wedge` in `scene.mjs`) that follows the kit's face-shading rules.
- 76 solids at rest.

## The Battlefield view (terrain, operational scale; added 2026-10-13)

Built with `kit/terrain.mjs` (TERRAIN.md recipe; Fig 1 and Fig 3 as references) in `scripts/field-scene.mjs`. The same model state drives it. Toggle: Machine | Battlefield buttons, V key, `localStorage["maneuvers.view"]`. In the field view the pin buttons read Hill, Bridge, Village, Airfield and the readout adds casualties.

Scale: operational, one vehicle per platoon and three per company (trBattalion's convention), matching Fig 7. The enemy is Fig 7's kind of force: three mechanized battalions dug in on an arc of nine companies (27 vehicle scrapes), with a tank-battalion reserve (9 vehicles, lit) at the crossroads behind them. Blue: four teams of two companies (6 vehicles each) behind a chalk line of departure. About 65 vehicles and trucks at most; all sizes notional.

| Machine part / state | Battlefield element |
|---|---|
| Props, left to right (shares 15, 35, 35, 15) | Decisive points held by four of the arc's companies: hill, bridge, village on the southern road, airfield. Inner pair = the enemy's roads to the front |
| Pin pulled, `S.props[i]` | Blue team advances along its route (`smooth(0, 0.62, p)`), fires while `p` is 0.04–0.58; the red company pulls back along its route to the crossroads (`smooth(0.3, 0.62, p)`), staggered by platoon |
| Prop out (`propState().out`) | Point seized: one red platoon stays at it, stopped and greyed; the team's sixth platoon stops at 80% of its route, greyed; an ambulance shuttles (14 s round trip) from the point to the line of departure |
| Keystone load, `keyLoad` | Reserve companies move from the laager toward blocking spots between the crossroads and each lost point, weighted by the lost points' shares (each company covers two adjacent points); thinner as load grows; it fires on the teams holding those points |
| Supply trucks | Two red trucks shuttle from the depot toward the bridge and the village (16 s cycle); they stop at the depot once that point is lost |
| Keystone fails, `S.failed` (eased over 2.6 s as `M.col`) | Reserve and every company still in place drive off the map to the north; one reserve tank and one platoon of each battalion's centre company are left stopped and greyed; fire stops |

Casualties (`LOSSES`, `losses()` in `model.mjs`, notional soldiers): attacker 14 / 18 / 18 / 10 per point and defender 12 / 16 / 16 / 9, weighted by each prop's out share, plus 30 defender when the keystone fails. Tested: 42 / 37 for the three-point route that holds (1101), 36 / 62 for both inner points (fails), 60 / 83 for all four. Field readout: "3 of 4 seized · load 95% · 42 / 37 lost", "Hub gave at 100% · 60 / 83 lost". Machine readout unchanged.

Not doctrine (labelled on the page as the model's): the bridge and village as decisive points, the reserve as the center of gravity, the load picture, the casualty numbers. Sourced: JP 5-0's examples "a hill" and "an air base" (p. IV-32) and Figure IV-12's "Armored Corps" as a center of gravity (p. IV-34).

## Checks run, Battlefield view (2026-10-13)

- `node scripts/model.test.mjs`: passed (old numbers unchanged; casualty numbers added).
- Line ends (drive.mjs `["lines"]`): field at rest 0 (240 ends), field at 95% 0 (234), field after failure 0 (232); machine after the V key 0 (110), machine at 95% 0 (110); phone field after failure 0, phone machine 0.
- Console clean in every run; no sideways scroll at 390 px (scrollWidth 390).
- Frame timing (rAF wrapper, 6 s in the field view at 95% with fire): desktop 60 fps, JS p50 0.4 ms, p95 1.3 ms; 390 px with 4x CPU throttle 59.7 fps, p50 1.3 ms, p95 4.7 ms, two frames over 25 ms.
- 4x close-ups of the hill and bridge (seized, greyed vehicles, smoke, tracers) and the crossroads reserve. Fixes from them: one vehicle per platoon to match Fig 7; reserve companies offset so they no longer stack or stand in the river; the look cache keyed by side so a stopped vehicle re-renders grey; layout squeezed (0.86) so the hill and airfield stay inside a phone crop.
