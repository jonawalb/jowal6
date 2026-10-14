# Retrograde and Delay: method

An isometric bench model of a delay, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT). Two views, Machine and Battlefield, toggled with the buttons or V (`localStorage["maneuvers.view"]`). `scripts/model.mjs` is pure (km and hours, no DOM, no kit) and drives both; `scripts/scene.mjs` holds the bench geometry and the km-to-bench mapping (`GEO`); `scripts/field-scene.mjs` the battlefield (see below).

## Build

```sh
node interactive/maneuvers/retrograde/scripts/build.mjs      # writes interactive/maneuvers/retrograde/index.html
node interactive/maneuvers/retrograde/scripts/model.test.mjs # checks the model numbers quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (text and chrome), `scripts/scene.mjs` (moving parts), `scripts/field-scene.mjs` (battlefield), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Two lit blocks, each on a carriage in its own lane of a three-rail track (A near, B far) | The delaying force in two elements |
| Coupler bar pivoted on block A: across to a pin on block B, or swung back along A | Subsequent positions (locked, one force) or alternating positions (working apart) |
| Rear stop at the back of the track | The rear of its assigned area |
| Pusher carriage with a ram spring and a pad spanning both lanes | The enemy; spring compression = how much of its strength it has brought to bear |
| Two ratchet racks with four teeth each (near rack for A, far rack between track and dashpot for B), a pawl on each block | Four delay positions; a pawl holds its block at each until the squeeze reaches the displacement threshold |
| Long dashpot on the far side, rod to block B's clevis (axis raised to z 15 to clear the far rack) | Ground is given between positions only at a slow, steady rate |
| Bypass lever on the dashpot's gland | Open with alternating positions, in a withdrawal or a retirement: no damping |
| Ground scale (1 km ticks, a major every 6 km) | Ground given, 24 km in all |
| 24-hour clock | Hours since contact |
| Selector knob | Enemy : delaying force combat-power ratio (mirrors the slider) |

## The model (all notional)

- Positions at 0, 6, 12 and 18 km; rear of the area at 24 km.
- Hold at each position: 6 h ÷ ratio (2 h at 3 : 1). Ratio slider 2 : 1 to 6 : 1.
- Ground given between positions in contact: 4 km/h. The pawl is lifted for the first 0.4 km after leaving a tooth.
- Delay length: 4 × (hold + 1.5 h). 3 : 1 → 14 h (0.58 h/km); 2 : 1 → 18 h (0.75 h/km); 4 : 1 → 12 h (0.50 h/km); 6 : 1 → 10 h (0.42 h/km).
- Withdrawal: the force breaks contact and moves at 12 km/h; the enemy follows at 8 km/h and holds the 24 km after 3 h (0.13 h/km).
- Retirement: no enemy in contact; the force moves at 10 km/h (2.4 h).
- Alternating positions (toggle, FM 3-90 11-19; 11-22 splits the force into two parts of roughly equal combat power): B starts set at 6 km. Each element holds 6 h ÷ (2 × ratio) (1 h at 3 : 1); the element released passes back at 12 km/h, out of contact, to the position after next (or the rear), while the enemy closes on the other at 4 km/h. 3 : 1 → 10 h (0.42 h/km); 2 : 1 → 12 h (0.50); 6 : 1 → 8 h (0.33). The subsequent technique buys more time at every ratio.
- Casualties (notional, vehicles down, `MODEL.loss`, `casualties()`, `lossTimes()`): holding 0.06 × ratio friendly and 0.6 enemy per hour (0.3 with only half firing); subsequent fall-back in contact 0.3 and 0.3; alternating gap 0.03 × ratio friendly and 0.3 enemy, the passing element losing nothing; withdrawal 2.4 and 2.0 per hour for the 0.5 h it takes to break contact (1 vs 1); retirement 0 vs 0. Counts are the expectation rounded. Run ends: subsequent 3 vs 9 (2 : 1), 3 vs 7 (3 : 1), 3 vs 4 (6 : 1); alternating 1 vs 4, 1 vs 3, 2 vs 2.
- Readout: what is happening (Hold n · Displace · Passing · Done · Withdraw · Withdrawn) · hours since contact · hours per km taken · N vs M down; a retirement keeps "Retiring · no contact · km · h". The km figure was dropped to fit the casualty figure under 45 characters (h/km = hours ÷ km still gives it).
- Screen time: 1 s = 1.6 model hours. The idle tour plays the delay from subsequent positions, the delay from alternating positions, a withdrawal and a retirement at 3 : 1 with a 0.9 s rest after each (about 22 s; it was 14.9 s before the alternating run was added).
- "In this model the delay buys more than four times the time of the withdrawal for the same ground": 0.583 / 0.125 = 4.7.

None of these rates comes from doctrine. FM 3-90 says time in a position is "primarily a function of relative combat power and the mission variables" (para. 11-16); the model keeps only the first, as a 1/ratio rule, and the page says so.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: passed (every number on the page; plan continuity; delay always in contact; readout < 45 characters over all modes and ratios).
- `scripts/lines.mjs` (Anatomy line-end check), light theme: `line ends: 0` at rest (tour, delay hold 2). `drive.mjs` sessions with `["lines"]`: 0 in a withdrawal at 1.2 h (pawl up, bypass open, carriage out of contact), 0 in a retirement at 1.0 h, 0 at the start of the delay and 0 at the end (block at the rear stop).
- Captures: desktop 1440 px and phone 390 px, light. Console clean, no sideways scroll. Reduced motion: one still frame at 45% of the delay, no loop.
- 4× close-ups: pawl at a tooth, pawl riding the rack, ram spring at 95% compression, block/clevis/rod at start, gland and bypass lever open, clock and selector, block at the rear stop. Fixed after review: pawl finger drawn under its arm; dashpot arm moved out from behind the block body and drawn before the block and gland so it reads as attached; ruler zero mark ends on the ruler edge.
- No geometry audit (`kit/audit.mjs`): the figure uses no tube or lathe parts. The ratchet teeth are convex prisms along y (`prismY` in `scene.mjs`), shaded by the kit's four-tone rule.

## Technique toggle and Battlefield view (added 2026-10-13, new style)

**Machine rework.** The single block became two half-width blocks on a three-rail, two-lane track, each with its own pawl and rack; a coupler bar on block A locks them for subsequent positions and swings back along A for alternating positions (`couple` eased 1 → 0). The dashpot ties to block B; its bypass opens in the alternating technique (no block gives ground in contact there). The pusher's pad spans both lanes. The plate grew 6 units on the far side for the far rack. Buttons "Subsequent positions | Alternating positions" and the T key; choosing a technique runs a delay.

**Battlefield scale and reading** (`scripts/field-scene.mjs`, kit `field.mjs` + `terrain.mjs`, camera azimuth 70°, elevation 42°, 640 × 420 viewBox shown with slice). Company scale with vehicles (TERRAIN.md lists retrograde under clusters): the delaying company = 8 tracked vehicles, two platoons of four (A = vehicles 0–3, B = 4–7; notional, not an establishment). 9 field units per km, battle positions at x 108, 54, 0, −54 (chalk outlines on pegs), rear phase line at −116. The enemy = 8 vehicles per unit of ratio, coming down the valley road from the right; its front stands 38 units off the friendly element nearest it; its lead platoon is always deployed, the rest come from column into line with the model's pressure (hold) and go back into column while it follows (move/gap). Subsequent: all eight on each position; in a fall-back platoon A moves in the first half of the segment and B in the second (11-20's stagger), the enemy following B, under a smoke screen. Alternating: A and B on interleaved slots so the passing platoon drives between the set platoon's vehicles; the element in contact is lit. Withdrawal: break contact under fire (0.5 h), converge into a column on the road and drive past the rear line, the enemy following in column; retirement: the same column, no enemy. Losses: each loss from `lossTimes()` takes a vehicle of the element in contact (friendly) or of the enemy's deployed front, frozen where that vehicle was at that hour, greyed; the latest three per side smoke. An ambulance waits behind the company and drives to a friendly loss for 1.4 h after it, where a medic kneels (eased at 70 units/s in the page).

| Machine | Battlefield |
|---|---|
| Blocks A and B | Platoons A and B of the delaying company |
| Coupler across / swung clear | Whole company on each position / platoons leapfrogging |
| Teeth | Battle positions (chalk outlines) |
| Pusher carriage, spring compression | Enemy force, how much of it has deployed into line |
| Dashpot (slow ground in contact) | Fall-back in contact behind a smoke screen, platoons staggered |
| Rear stop | Chalk phase line at the rear of the area |
| Clock | The readout's hours and hours per km |

### Checks run for the toggle and the Battlefield view (2026-10-13)

- `node scripts/model.test.mjs`: all passed (original assertions; alternating durations and element sequence; casualties for both techniques at 2, 3 and 6 : 1, withdrawal and retirement; loss times agree with counts; readout < 45 characters over every technique, mode and ratio 2–6).
- `drive.mjs` line checks, `line ends: 0` in every pose: machine subsequent hold 2, alternating passing, withdrawal (332 ends each); after V, field subsequent displacing (84), alternating passing (88), retirement (84); reduced motion machine and field. Console clean throughout.
- 390 px: scrollWidth 390, no sideways scroll; phone shots of both views read.
- 3–4× close-ups: coupled blocks with the bar and pin, alternating blocks passing with the bar swung and pawl up, far pawl and dashpot arm, battlefield wrecks, smoke and vehicles.
- Frame timing (rAF wrapper, tour in the field view, 6 s): desktop 59.8 fps, JS p50 0.5 ms / p95 1.1 ms; 390 px with 4× CPU throttle 59.3 fps, p50 1.2 / p95 2.3 ms, two gaps over 25 ms.
