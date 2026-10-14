# Turning Movement: method

An isometric bench model of a turning movement, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT).

## Build

```sh
node interactive/maneuvers/turning-movement/scripts/build.mjs      # writes interactive/maneuvers/turning-movement/index.html
node interactive/maneuvers/turning-movement/scripts/model.test.mjs # checks the model numbers quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (moving and tall parts), `scripts/model.mjs` (numbers and geometry) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Rim lock with its bolt thrown into a keeper | The enemy's position, holding where it was built to hold |
| Guard block in front of the keeper, on a ring track round the lock | The defender's forces at its principal defensive positions |
| Diversion carriage pressing the guard from the front rail | The diversion force (FM 3-90 para. 2-73) |
| Lit carriage on the long bypass rail (straight, bend, run in behind the lock) | The turning force, which avoids the front entirely |
| Release lever behind the lock, linked by bell crank and rod to the bolt | A vital objective in the enemy's rear |
| Guard braced against the lever handle | The enemy forced to move from its position to meet the threat |
| Lever thrown, bolt drawn out of the keeper | The position no longer holds where it was built |
| Dial gauge | How far the guard has been pulled off its front, 0 to 180 degrees |

## The model

Geometry is the bench's own, in world units: the route is 106 units straight, a 30-unit-radius quarter bend (47.1) and a final run; the roller meets the lever at s = 172.9 and a full throw ends at s = 183.1. The lever angle comes from the roller-on-handle contact in closed form (`phiAt`), the bolt draw from the crank (`sin φ / sin 16°`), and the guard's brace stop from the handle's side line (`guardLimit`, −169.3° at rest).

Notional teaching values, labeled as such on the page:

- The defender reacts when the turning force is 40% of the way to the lever (`trigger`).
- The guard slides at 70°/s; front to brace takes 2.4 s (`guardTime`).
- Idle tour speed 26 units/s: trigger to lever 4.0 s, so the guard wins. Pointer/slider cap 60 units/s: 1.7 s, so a fast reader wins.
- Full throw 16°; bolt travel 10 units, clear of the keeper.
- A braced guard stops the carriage at the lever; a guard that arrives after the lever has moved stops short of the handle (`guardLimit(φ)`).
- Readout: route share (100% at the lever), the guard's angle off its front, "front abandoned" when braced, and bolt % drawn when the lever is thrown.

## The Battlefield view (terrain, operational scale; added 2026-10-13)

Built with `kit/terrain.mjs` (TERRAIN.md recipe, Fig 1 as reference) in `scripts/field-scene.mjs`; the same model state drives it, and the readout is unchanged. Toggle: Machine | Battlefield buttons, V key, `localStorage["maneuvers.view"]`.

Scale: operational. FM 3-90 para 2-71: "Only divisions and above can execute a turning movement." So each vehicle stands for a company and each cluster of three for a battalion; the turning force and the enemy are brigades of three battalions, the diversion force two battalions, the reserve one battalion, the security force two vehicles. All sizes are notional.

| Machine part / state | Battlefield element |
|---|---|
| Lock, guard on the front | Enemy brigade dug in on the ridge (vehicle scrapes with earth berms), facing the friendly side; red fire sector on the ground |
| Diversion carriage pressing the guard; `S.tip` | Diversion force (two battalions) firing at the ridge; rolls onto the vacated positions as `S.tip` goes to `DIV_KEEPER` |
| Turning carriage, `S.s` | Turning force (lit, main effort) in march column from an assembly area along the road round the southern flank to the crossroads; rail distance up to `S_CONTACT` maps linearly onto the road up to the contact point `(-140, 70)`, and `S_CONTACT..S_END` onto the last stretch to the crossroads |
| Guard sliding round its track, `S.g / G_REAR` | The enemy battalions leave their scrapes one after another (stagger 6% of the move), drive back along the MSR and form a blocking line south of the crossroads facing south |
| Braced (front abandoned) | Turning force halts at the contact point, lead battalion deploys in line; fire both ways |
| Lever thrown, `S.phi / phiMax` | Turning force deploys round the crossroads (one battalion facing east along the MSR, one north, one west to the bridge); the MSR is cut and the enemy supply trucks halt west of the bridge (eased over about 0.6 s) |
| Guard arriving after the lever moved | Enemy battalions halt short of the crossroads, east of it on the MSR, and exchange fire with the battalion blocking there |
| Gauge (guard angle) | Not drawn; the readout carries it |

Not in the machine, added for doctrine (para 2-72): the reserve and the security force (static). Control measures (para 2-74): one phase line on pegs across the road, the objective flag at the crossroads. Notional: terrain, routes, distances, the truck shuttle (18 s round trip), vehicle spacing (13 units, plus 9 between battalions), the vehicle scale (far larger than true scale).

## Losses (notional, Battlefield view only; realism pass 2026-10-13)

- `losses(s, g, phi)` in model.mjs, in vehicles (one per company): the diversion's attack on the ridge costs each side 1; if the defender braces the crossroads first, blue loses up to 2 more as its lead closes the last fifth of the route and red 1; if the turning force throws the lever, blue loses 1 more and red `round(a · (1 + 2 · guard share))` more (1 if the enemy stayed on the ridge, 3 if caught on the road). Start 1 vs 1; defender wins the race 3 vs 2; turning force wins 2 vs 4; defender held, crossroads seized 2 vs 2.
- Knocked-out vehicles stop, grey (sides `kf`, `kh`) and smoke; the diversion's hit vehicle stays on its attack position and an evacuation vehicle shuttles from it to the rear. The Battlefield readout ends "N vs M down" (friendly vs enemy); "° off front" shortens to "° off" there to stay under 45 characters. Teaching values, not data.

## Checks run, Battlefield view (2026-10-13)

- `node scripts/model.test.mjs`: passed (model unchanged).
- Line ends (drive.mjs, `["lines"]`): field view at the start 0 (686 ends), lever thrown with the enemy holding 0, braced with the front abandoned 0; machine view after the V key 0 (256 ends), and machine lever thrown 0. Reduced motion, field view after keys: 0.
- Console clean in every run; no sideways scroll at 390 px (scrollWidth 390) in both views.
- Frame timing (rAF wrapper, 6 s of the tour in the field view): desktop 60 fps, JS p50 0.4 ms, p95 0.7 ms; 390 px with 4x CPU throttle 59.7 fps, JS p50 0.9 ms, p95 2.4 ms, one 33 ms frame.
- 4x close-ups of the crossroads deployment, the bridge and halted trucks, the enemy scrapes with the fan and tracers, the assembly area. Fixes from them: battalions spread into clusters (two companies forward, one back) instead of one line; positions kept on the ridge's top terrace; fire sector moved off the terraces so it does not step; enemy halts short of a held crossroads instead of overlapping the turning force; view recentred so the crossroads stays in frame on a phone.
- Budget: 36 vehicles and trucks; page 1.29 MB raw.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: passed (every quoted number, route continuity, nearest-point inverse, the race at both speeds).
- `scripts/lines.mjs` (light): `line ends: 0` at rest. `drive.mjs` `["lines"]`: 0 mid-tour (guard 122° off front), 0 braced (pose 2), 0 lever thrown (pose 3).
- `capture.mjs` at 1440 px and 390 px, light: console clean, no sideways scroll at 390 px.
- 4× close-ups of the lever, roller and guard brace (braced and thrown), the lock, bolt, keeper and diversion pad (both poses), the carriage on its bushings at the start stop, and the dial. Fixes made from them: carriage bushings moved outside the plate onto wider rails (they were painting over the plate), a stop added at the rear end of the guard track, handle thinned, guard made taller so it reads behind the handle.
- Reduced motion: jumps to targets, no tour; arrow keys and H work; policy button toggles.
- Solids: 93 (13 of them rail sleepers and ties); 786 paths.
- No geometry audit: no lathe or tube parts, which is the case where the kit requires it.
