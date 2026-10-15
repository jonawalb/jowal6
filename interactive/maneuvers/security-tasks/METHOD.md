# Screen, Guard and Cover: method

Figure 50 of the Maneuvers section. An isometric bench model plus a soldier-scale Battlefield view, drawn with the shared Anatomy kit (`../kit/iso-kit.mjs`, MIT) and the terrain kit (`../kit/terrain.mjs`). Built 2026-10-14 to the v2 builder brief, from the Movement to Contact figure's structure.

## Build

```sh
node interactive/maneuvers/security-tasks/scripts/build.mjs      # writes index.html
node interactive/maneuvers/security-tasks/scripts/model.test.mjs # checks every model number the page quotes
```

`window.__securityTasks` exposes `stop`, `reset`, `seek(task, enemy, t)`, `change`, `goNow`, `setView`, `snapshot` and `load`. Keys: left and right choose the task, up and down the enemy, Space starts, V switches view.

## The concept (one sentence)

FM 3-90 ch. 13: security forces give the protected force "time and maneuver space"; screen, guard and cover are three levels of it with increasing combat power, and more combat power forward means less for the main body (13-51). The figure sets the task against the enemy's level and counts, in a notional model, the time each buys.

## The object (Machine view)

| Part | Stands for |
|---|---|
| Heavy block with two lamps | The main body; lamp 1 lights at the report, lamp 2 if the enemy gets inside the observation band |
| Low band on the rail in front of the block | The line inside which, in this model, the enemy can observe and engage the main body (6 notional km) |
| Three buffers on the rail (light single spring; stiffer; heavy twin spring, furthest out), only the chosen one raised and lit | Screen, guard, cover. Stiffness and position are the figure's picture; the manual says nothing about springs |
| Ram carriage with 1, 2 or 3 weights | Enemy reconnaissance elements, lead elements, main body |
| Dial with a hand from the report and a pin | Notional minutes since the report; the pin is the time bought |
| Ten-peg meter (low pegs are committed) | Share of the force's power in the security force: 10, 20, 40 per cent (notional) |
| Rule with a collar and an index | The security line and the enemy's position |
| Rack of 6 + 10 pegs | Men down, friendly and enemy |

## The Battlefield view (soldier scale)

Soldiers about 1.5x scale. Main body (always): four positions of two soldiers and a command post of two (10). Only the chosen task is drawn. Screen (6): three observation posts of two, each with a field of observation (fan), kneeling; fires little at anything but reconnaissance (self-defense, FM 3-90 13-56). Guard (10): three positions on the line (one a machine-gun nest), a forward screening element of two (13-79, 13-89), a reserve of two. Cover (16): a forward line of four positions (one a nest), a second line of two in depth, a reserve of four (13-103, 13-105). Enemy: 4, 9 or 18 soldiers (a fire team in wedge, a squad in column, two squads), moving down the road, deploying on being engaged. Bursts on the enemy are indirect fire from the main body's side (13-31). A dashed line from the security force to the command post marks the report; one chalk line marks the observation line. When the task is not a match for the enemy, the security force gives ground rearward (guard: 13-86) and the enemy comes on. World x = -66 + 4.875 x model s. The main body is stationary: FM 3-90 13-57 and 13-67 say a screen is not employed in front of a moving formation.

## The model (all notional; no manual gives a distance, a rate, a hold time, a share or a casualty count)

| Quantity | Value | Why |
|---|---|---|
| Enemy start, rate | 32 km, 0.5 km/min | |
| Observation line | 6 km | inside this the enemy can observe and engage the main body |
| Security line | screen 12, guard 12, cover 22 km | screen and guard in supporting range (13-25, 13-72), a corps cover beyond it (13-105) |
| Engagement point | line + 2 km; the buffer gives 1.5 km | |
| Report | when the enemy reaches the engagement point: t = 36 min (screen, guard), 16 min (cover) | |
| Hold if a match | 8, 24, 48 min | |
| Match | screen: reconnaissance; guard: up to lead elements; cover: up to the main body | the figure's reading of 13-56, 13-72, 13-100 |
| Hold if one level over / two over | x 0.5 / x 0.25 | |
| Space term | (engagement - 1.5 - 6) / 0.5: 13 min (33 for cover) | |
| Time bought (react) | space term + hold | report to the enemy able to observe |
| Run end | report + react + 3 min; 10 notional minutes per figure second | |
| Men down | FD [[0,1,1],[0,1,3],[1,2,5]], ED [[3,1,1],[4,4,5],[4,7,10]] (task x enemy) | by hand; shown spread over the engagement |

Time bought, minutes ("+" = enemy stopped, so a floor): screen 21+, 17, 15 against reconnaissance, lead, main; guard 37+, 37+, 25; cover 81+, 81+, 81+. Readouts are under 45 characters: "Enemy comes on · 25 min · 3 vs 5 down".

## Checks run

- `node scripts/model.test.mjs`: passes (all nine reaction times, held or passed, men down, readout lengths, speed bound, monotone counts).
- Line check: `line ends: 0` in both views and in a second pose of each (field: screen vs main, cover vs lead; machine: cover vs recon, screen vs recon).
- Console clean; no sideways scroll at 390 px (390/390); Reset returns the load-state snapshot in both views; `.ex-field` shown only in Battlefield view and `.ex-machine` only in Machine view.
- Frame timing, field view, idle tour: desktop 60 fps (JS p50 0.20 ms, p95 0.40 ms); 390 px at 4x CPU throttle 60 fps (JS p50 0.90, p95 1.50).
