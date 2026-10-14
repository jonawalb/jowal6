# Fig 43: Strongpoint and Perimeter Defense (method)

## Object to concept
| Machine part | Concept |
|---|---|
| Six plate sections on carriages with spring tubes | Six defending positions of a company (one unit of fire each, notional) |
| Layout switch: straight wall across north, or a ring | Line facing the likely avenue vs perimeter (all-round) defense |
| Tie bars between plates | Mutual support, no gaps between positions (FM 3-90 para 9-66, 9-77) |
| Hub and lit arm | Command post and centrally located reserve, committed 2 s into the attack to the threatened bearing (para 9-61, 9-71, 9-82) |
| Rail round the rim, carriage and push rod | The attack, from a bearing set by slider or arrow keys |
| Gauge behind each plate; hub dial | Pressure each position takes; share of the attack no position faces |
| Pickets that double and rise, plate roofs | Obstacles and fortified positions of a strong point (para A-68) |
| Two lamps at the front | Held / penetrated |

Battlefield: a rifle company on a rise; six positions (2 fighting positions of 2 men each) as a line across north or a ring; reserve fire team in the centre; five red elements of three; wire (one belt hasty, two prepared), heavier bags and MG nests when prepared; chalk trace; fans; north arrow. Drawn units stand for squads at reduced numbers (about 4 drawn per position, 3 per enemy element); the readout counts notional men at 9 per squad-equivalent.

## Model (scripts/model.mjs; all numbers notional)
- Position k faces c_k (ring: 60k degrees; line: 0). Fire on bearing a: w_k = max(0, 1 - |a - c_k| / 90). Ring sum 1.33 to 1.67; line 6 at the front, 0 beyond 90 degrees.
- Reinforce likely avenue (bearing 0): +1.5 weight, falling to 0 at 90 degrees.
- Reserve: +1.0 after 2 s. Attacker E0 = 5.
- Lanchester square: dE/dt = -0.24 * f * D, dD/dt = -0.10 * g * E; prepared f = 1.5, g = 0.5. Held when E <= 0.05, penetrated when D <= 0.05 after the reserve is in; 30 s ceiling.
- Men down: friendly 9 * lost, enemy 9 * (5 - E).

Outcome grid (end, friendly/enemy down), tested in model.test.mjs:
| Setup | N | NE/NW | E, SE, S, SW, W |
|---|---|---|---|
| Line, hasty | held 8/45 | held 18/45 | penetrated 9/2 |
| Line, strong point | held 3/45 | held 5/45 | penetrated 9/7 |
| Ring, hasty | penetrated 24/13 | penetrated 22/11 | penetrated 21-24 / 8-13 |
| Ring, strong point | held 9/45 | held 10/45 | held 10-12 / 45 |
| Ring, hasty, reinforced | held 17/45 | penetrated | penetrated |

## Checks run
- node scripts/build.mjs: ok; node scripts/model.test.mjs: ok.
- Lines check: 0 line ends in both views and in a second pose of each (field: ring/prepared SE and line/hasty SE; machine: line/hasty SE and ring/prepared NE). Console clean.
- 390 px: no sideways scroll. Frame timing, battlefield tour 6.5 s: 60 fps, JS p50 0.4 ms, p95 1.0 ms desktop; 59.9 fps, 0.4/0.9 ms at 390 px (unthrottled).
- Reset returns the load snapshot in both views; .ex-field shows only in Battlefield, .ex-machine only in Machine.
- Run on http://127.0.0.1:8769/.
