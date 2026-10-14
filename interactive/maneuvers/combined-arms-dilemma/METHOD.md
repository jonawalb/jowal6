# Combined Arms Dilemma: method

An isometric bench model of combined arms, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT). Size: Figure, about 46 solids (26 static, 20 live).

## Build

```sh
node interactive/maneuvers/combined-arms-dilemma/scripts/build.mjs      # writes index.html
node interactive/maneuvers/combined-arms-dilemma/scripts/model.test.mjs # checks the model numbers quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Two T-handle keys in plugs A and B | Two arms (on the page, A can stand for the fire team's automatic weapon and B for its grenade launcher) |
| Guard pawl pivoted between the plugs; its pad can press one plug collar | The defender's shield: the one counter it can apply at a time |
| Engraved sector round the pivot | The guard's track |
| Lit bolt in a U-channel keeper | The outcome: drawn back means the lock is open |
| Either plug's cam can draw the bolt | Either arm alone is enough if it is not countered |
| Holder on the plate | Where key B rests in the one-arm case |
| Dial gauge | How far the bolt is drawn |
| Ruler strip by the keeper | The bolt's throw |

## The model (notional)

- Guard position g runs from -1 (pad on plug A) to +1 (pad on plug B). The pawl angle is 270° + 61.93°·g, so the pad reaches each plug collar at g = ±1.
- Press on a plug: `clamp((g·side − 0.6) / 0.4, 0, 1)`. A plug is held when the press exceeds 0.5, i.e. |g| > 0.8 toward it ("the last fifth of its travel toward it").
- A free key that is in the lock turns to 90°; a held key returns to 0°. Keys turn at up to 180°/s, eased (τ 0.18 s).
- Bolt drawn = max(turn A, turn B) / 90°. The bolt tip runs from 92 (shut, in the keeper) to 64 (drawn).
- The guard swings at up to 1.4 units of g per second, eased (τ 0.3 s): about 1.4 s plug to plug.
- Key B is lifted out (only once it has turned back) and moved to its holder in 1.6 s.
- The dilemma is geometric, not fitted: the pad holds A only for g < −0.8 and B only for g > 0.8, so no g holds both. `model.test.mjs` sweeps g from −1 to 1 in steps of 0.01 and checks that two keys always open the lock, and that one key is held when the guard covers it.

All of this is a teaching device. The page says that real enemies have more than two choices, may find cover that defeats both arms, and suffer partial effects.

Tour (15.5 s loop): one key, guard on A, lock holds → key B inserted (2.4 s), B turns, bolt opens → guard swings to B (6.4 s): A turns, B returns, bolt stays open → guard to the middle (9.6 s): both turn → key B removed, guard back to A (12 s): lock holds.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed.
- `scripts/capture.mjs` at 1440 px (light) and 390 px: console clean, no sideways scroll at 390 px. Readout at rest: "1 key · guard on A · lock holds".
- `scripts/lines.mjs` via `drive.mjs` `["lines"]`: `line ends: 0` at rest (one key, guard on A), in pose 2 (two keys, guard on B, bolt open, readout "2 keys · guard on B · bolt open") and with key B in transit.
- 4× close-ups: pawl, pad and plug A collar; keeper, bolt and ruler; holder. Fixed after them: the pawl arm's square root end now sits under a round hub; the grip knurls end on a seam ring; the ruler no longer runs under the case flange.
- No geometry audit (`kit/audit.mjs`): the figure has no pipes, cables or turned (lathe) parts.

## Battlefield view (added 2026-10-13, terrain style)

A Machine | Battlefield toggle (buttons, V key, `localStorage["maneuvers.view"]`) shows the same state on full-bleed terrain, drawn with `../kit/terrain.mjs` after the Fig 1 reference. Code: `scripts/field-scene.mjs` (layout `FG`, `fieldStatic`, `fieldPose`, `fieldMarks`, plus `fieldShots` for the grenades' arcs and bursts on top of the kit's tracer fire and `fieldArc` for the dotted trajectory); `build.mjs` builds the field SVG and inlines `field.mjs`, `terrain.mjs` and `field-scene.mjs`. The machine view and its text are unchanged.

**Scale and reading.** Fire-team scale with individual soldiers: MCDP 1's own example. The lit blue fire team (TL, AR, GR, R) lies behind a hedgerow; a red rifleman pair holds a two-man hole behind a low stone wall about 46 units away (notional), with open ground and a wood behind it.

| Model state | Battlefield |
|---|---|
| Key A (always in) | The automatic rifleman, prone, fires bursts every 1.5 s: on the wall's top while the pair is down, on the men once they rise or run. The blue fan is his sector over the wall and the escape ground. |
| Key B (`S.kb`) | The grenadier walks from behind the hedge (held back, one arm) to his firing position as the key travels; once in, he lobs one round per 3.1 s (1.45 s flight, apex 15 units) into the hole: a moving dash on a dotted arc, then puffs and smoke. A small blue sector marks the impact area. |
| Guard `S.g` | g ≤ −0.75: the pair stays down, sunk 1.15 units in the hole behind the wall. −0.45 < g < 0.4: it kneels up and fires back over the wall (red tracers). g from 0.4 to 0.95: it runs out of the back of the hole along a 16-unit route across the open, and lies prone at its end. |
| Casualties (`casualties(S.f, keys)`) | Blue: the rifleman, greyed, behind the hedge in every state; the team leader too when the lock holds with one key. Red: one of the pair, greyed, at the hole's rear lip once the bolt is at least half drawn. |

Casualties (notional, `model.mjs`): blue = 2 if one key and the lock holds, else 1; red = 1 once the bolt is half drawn, else 0. Readout ends "N vs M down" (blue vs red): "1 key · guard on A · lock holds · 2 vs 0 down", "2 keys · guard on B · bolt open · 1 vs 1 down". Tested in `model.test.mjs`.

**Battlefield checks (2026-10-13).**
- `model.test.mjs`: passed (original asserts unchanged, casualty asserts added).
- Line ends, field view (driven with `setView('field')`): one key guard A 0 of 54; two keys guard 0.2 0 of 56; 390 px guard B 0 of 56; reduced motion 0 and 0.
- Line ends, machine view after the V key: two keys guard 0.2 0 of 286; one key guard A 0 of 286; 390 px 0 of 286. V toggles view and localStorage both ways.
- Console clean in every run; no sideways scroll at 390 px in either view (scrollWidth 390).
- Frame timing (rAF hook, 6 s of the tour in the field view): desktop 1440 px 60.0 fps, JS p50/p95 0.20/0.50 ms, longest gap 16.8 ms; 390 px, DPR 3, 4× CPU throttle 60.0 fps, JS 0.60/1.80 ms, longest gap 16.8 ms.
- 4× close-ups of the hole (kneeling enemy, casualty at the rear lip, grenade sector), the fire team and the runner at the route's end.
- thumb.png kept (machine view).
