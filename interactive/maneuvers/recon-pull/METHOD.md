# Reconnaissance Pull: method

An isometric bench model of reconnaissance pull versus reconnaissance push, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT).

## Build

```sh
node interactive/maneuvers/recon-pull/scripts/build.mjs      # writes interactive/maneuvers/recon-pull/index.html
node interactive/maneuvers/recon-pull/scripts/model.test.mjs # checks every model number quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Wall with five gates; raised shutter = held, sunk shutter = gap | The enemy's dispositions: where it is strong and where gaps exist |
| Seven marbles queued behind an escapement pawl | The main body |
| Feeder groove and five lanes | Routes for maneuver |
| Lit scout carriage riding the wall top, with a drop feeler | Reconnaissance assets |
| Diverter carriage whose stop plate turns marbles into one lane | The commander's choice of route |
| Plan peg locking the diverter (push) or parked (pull) | A course of action committed to in advance |
| Collecting tray behind the wall | Positions of tactical advantage beyond the enemy line |
| Stopwatch | Seconds until the first marble of the main body is through a gate |

## The model (all rates notional)

- Pull: the scout leaves its park (x = -72) at 70 units/s and checks lanes 1 to 5 in order. Checking a gate: feeler down 0.25 s, rest 0.1 s on a held gate, up 0.25 s (0.6 s per held gate). At the first gap the feeler goes down and comes back up; when it is down, the diverter leaves its park (x = 68) at 120 units/s, and the main body is released when it arrives.
- Push: the plan peg locks the diverter to the planned lane and the main body is released at 0.4 s; the scout runs to the planned gate only to check it. In this model the push run keeps to its plan even if that gate is held.
- Marbles: radius 4, released 0.26 s apart, rolling 60 units/s along magazine, feeder, lane, gate and into a tray slot. Against a held shutter they queue nose to tail (8.4 units apart).
- Default layouts, planned lane 3:
  - Layout A (lanes 2 and 3 open): push first marble through at 2.5 s; pull finds lane 2 and gets through at 4.0 s.
  - Layout B (lanes 2 and 5 open, lane 3 held): push stalls at the lane 3 shutter (first marble at rest at 2.45 s); pull gets through lane 2 at 4.0 s.
- Idle tour (15.3 s): A push (4.9 s), B push (4.0 s), B pull (6.4 s).

None of these rates is sourced; they are teaching values, and the page says so. Doctrine supplies only the definitions and the trade-off (time available, situational understanding).

## Part count

64 kit solids plus 7 marbles (71 parts).

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: passes. It asserts the quoted rates and times (2.5 s, 4.0 s, stall), the readout strings, readouts under 45 characters for every layout, mode, planned lane and time, a gap in every preset layout, no two marbles closer than one diameter at any time in any preset run (0.02 s steps), and that the feeler is up before the main body is released.
- `lines.mjs` at rest (tour start): `line ends: 0` (168 ends on 63 lines).
- `drive.mjs` second pose (keys N, 5, ArrowLeft: layout B, gate 5 shut, push into planned lane 2) then `["lines"]`: 0 floating ends; third pose after Space (pull): 0.
- `capture.mjs` at 1440 px and 390 px, light theme, and with reduced motion (shows the finished pull run): console clean, no sideways scroll.
- 4x close-ups of the scout carriage on the wall (guide rollers, arm, feeler), the queue and escapement pawl, the diverter stop plate and arm, and the stopwatch; fixed rollers that floated in front of the wall face and a hidden diverter arm.
- No geometry audit (`kit/audit.mjs`): the figure uses no lathe or tube parts.

## Battlefield view (added 2026-10-13, new terrain style)

Toggle: Machine | Battlefield buttons, V key, `localStorage["maneuvers.view"]` (as Fig 1). `scripts/field-scene.mjs` draws it with `kit/terrain.mjs`; the same run, time and eased gate states (`S.run`, `S.t`, `S.shut`) drive both views, and `readoutOf()` is the one readout.

Scale: small-unit vignette. Scouts are individual soldiers; the main body (a rifle company) is drawn as seven groups of five figures, one group per marble (figures stand for the unit, not one per soldier). Mapping:

| Bench | Battlefield |
|---|---|
| Gate held / open | Crossing through a belt of woods: fighting position manned by a red team of three (with its fire fan) / empty position (a gap) |
| Scout carriage (x, dip) | Lit scout team of four: file along the front at u = -22, wedge forward at a crossing; at a held one it goes prone and fires; at a gap it goes through and waits beyond |
| Marbles | Company groups placed by `marbleAt` through `fieldUV()`: queue → approach road, feeder → lateral road, lane → track, tray → ground round the objective flag |
| Diverter / plan peg | Chalked route with arrowhead: from the start under push, from `divertAt` under pull |
| Stalled marbles | Lead two groups prone in line, firing; the rest kneeling in column |

Frame: u forward at world bearing 265° (diagonal, so prone figures read), KU 1.0 up to the gate, 2.0 then 1.0 past it; KV 1.1. View centred at (u -2, v -6), zoom 1.7 of Fig 1's ground rect. Everything notional.

Casualties (notional, `losses()` in model.mjs): at the 1st, 3rd and 5th held gate the scouts check, one scout and one enemy at that gate go down; a body through a gap loses one man per held neighbouring gate and each such gate one man; a body stalled at a held gate loses five more and the gate one more. Planned lane 3: A push 1 vs 1, A pull 2 vs 2, B push 6 vs 2, B pull 3 vs 3. Casualties are greyed prone figures (`data-side` fc/hc); a medic from the headquarters group runs to the first friendly casualty. The readout is the bench status plus " · N vs M down" (≤ 50 characters, tested; the status strings themselves are unchanged).

Checks (2026-10-13): `model.test.mjs` passes (old asserts unchanged, casualty asserts added). `lines` via drive: field pull-finished 0 floating ends (192), field push-stalled 0, machine push-stalled 0 (168), machine pull-finished 0; reduced-motion field 0. Console clean. 390 px: scrollWidth 390, readout on one line. Frame timing (field view, tour, 6 s): desktop 60.0 fps, JS p50/p95 0.8/1.8 ms, max gap 16.8 ms; 390 px DPR 3 with 4× CPU throttle 58.8 fps, JS 3.5/6.4 ms, 5 gaps over 25 ms (max 67 ms, at run restarts when new soldier looks render). Field: 48 soldiers at most in presets (55 with every gate held), 299 static items, page 803 KB raw. Thumbnail unchanged (machine).
