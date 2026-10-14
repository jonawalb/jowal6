# Phasing and Transitions: method

An isometric bench model of the six-phase joint operation model, drawn with the Anatomy kit (`../kit/iso-kit.mjs`, shared by all Maneuvers figures, MIT).

## Build

```sh
node interactive/maneuvers/phasing/scripts/build.mjs      # writes interactive/maneuvers/phasing/index.html
node interactive/maneuvers/phasing/scripts/model.test.mjs # checks the model numbers quoted on the page
```

`index.html` is generated. Edit `scripts/page.html` (page text and chrome), `scripts/scene.mjs` (moving parts), `scripts/model.mjs` (numbers) or `scripts/build.mjs` (static parts, live code), then rebuild.

## The object

| Part | Stands for |
|---|---|
| Gate block with a cross channel and six notches, index ticks on its front edge | The six phases, 0 Shape to V Enable civil authority (JP 3-0, 2018, Fig. V-7 labels) |
| Shift lever with the lit knob | The phase the operation is in |
| Clutch (pressure plate, diaphragm, release collar and fork) that lifts for every shift | A transition: a planned, distinct shift between phases |
| Six-gear stack, one gear per phase, radius set by effort; index pointer on its post | Notional level of military effort in each phase |
| Dial gauge | The same notional level of effort |
| Layshaft on pillow blocks | Drive from the gear stack to the clutch (structure only) |

About 69 parts.

## The model (notional)

- Level of effort by phase: 0 Shape 15%, I Deter 30%, II Seize initiative 60%, III Dominate 100%, IV Stabilize 55%, V Enable civil authority 25%. Teaching shape only, copying the general form of JP 3-0 (2018) Figure V-7, in which effort peaks in Dominate. Not data and not numbers from any publication.
- Gear radius = 7 + 12 × effort bench units (8.8, 10.6, 14.2, 19.0, 13.6, 10.0).
- A shift runs clutch out (time constant 0.12 s, lift 4 units), lever out of its notch (0.08 s), slide along the gate (70 units/s), lever in, clutch in. The drive (bolt circle on the pressure plate) turns at 2.4 × effort rad/s while engaged and stops while the clutch is out; the dial follows the new phase once the clutch is back in.
- Tour: 0, I, II, III, IV, V, then back to 0 (as the JP 3-0 2018 figure ends with Phase 0 Shape), holding 1.4 s in each phase. The timer is for display; the page says doctrine makes transitions event-driven and lets phases overlap, compress, expand or be omitted.

## Doctrine status (what each edition says)

- JP 5-0 (11 Aug 2011): presents the six-phase "Phasing Model" (Fig. III-17), with the caveat that it "is not intended to be a universally prescriptive template" (ch. III, para 10.b, p. III-41).
- JP 5-0 (16 June 2017): summary of changes, "Removes the six-phase phasing model, but does not change the definition of phases or the use of phasing as a planning tool" (p. iii).
- JP 3-0 (17 Jan 2017, Change 1 22 Oct 2018): keeps the six groups of activity as "notional phases" (para V-6.a, p. V-12, Fig. V-7); "Actual phases of an operation will vary (e.g., compressed, expanded, or omitted entirely)" (para V-6.b, p. V-13).
- JP 5-0 (1 Dec 2020): "The phases are unique for each operation or campaign" (ch. IV, para 7.a.(2)(a), p. IV-37); "Commanders determine the number and purpose of phases" (same para, sub-para 6, p. IV-38). No six-phase model.
- JP 3-0, Joint Campaigns and Operations (reissue reported as June 2022, unconfirmed): not opened. A 2026-10-10 Wayback capture of the Joint Staff page lists the title but gives no date or PDF (JEL+, CAC required); no 2022 PDF capture exists in the Wayback CDX. The page makes no claim about it. ADP 3-0 (21 Mar 2025) para 4-18 is cited for the phase definition.

## Checks run (2026-10-13)

- `node scripts/model.test.mjs`: all passed.
- `scripts/lines.mjs` at rest (Phase 0 to I tour start): `line ends: 0 of 582`. In pose 2 (Phase III Dominate, via drive.mjs `["lines"]`): `line ends: 0 of 582`.
- Captures at 1440 px and 390 px, light theme: console clean, no sideways scroll at either width.
- 4× close-ups: clutch engaged and disengaged with the release fork and slotted post, gear stack with the index carriage, lever seated in a notch and in mid-shift. Fixed after review: a fork-arm rule line that stopped short of the collar (now edge to edge), bare bearing blocks (now pillow blocks with feet, caps and bolts), clutch lift raised from 3 to 4 units for legibility.
- No geometry audit (`kit/audit.mjs`): no tube or lathe parts are used.

## Battlefield view (added 2026-10-13, terrain style)

A Machine | Battlefield toggle (buttons, V key, `localStorage["maneuvers.view"]`) shows the same phase on full-bleed terrain (`kit/terrain.mjs`), driven by the same state `S` (the gear engaged; during a shift, the target gear). Built in `scripts/field-scene.mjs`; the machine, its readout and all fact-checked text are unchanged.

**Scale.** Operational (TERRAIN.md table: phasing is an operational idea): battalion clusters on a wide map. Each small vehicle stands for a platoon, each pair for a company, each group of six for a battalion (two friendly, one enemy of six and one of four drawn), plus supply trucks, an ambulance, three aid trucks, four local police, five townspeople, four dismounted friendly soldiers and two snipers. 44 figures in all; about 734 KB page.

| On the ground | Stands for |
|---|---|
| The same ground in every phase: friendly base (sheds, crates) left, chalk phase line, enemy-held ridge and a town at a crossroads right | One notional campaign area |
| Lit friendly battalion | Main effort |
| Units turning and moving to a new posture, no fire until in place | The transition (the clutch): units start moving as the clutch goes out; fire needs the clutch in and every combat vehicle in place |
| Shape: one company training at the base, supply trucks shuttling stocks in, enemy in garrison, townspeople in the streets | Phase 0 |
| Deter: lit battalion along the phase line, second battalion arrives at the base, enemy onto the ridge and the town's edge, facing fire sectors | Phase I (JP 3-0 2018 V-5.b(2): mobilization, predeployment, initial deployment) |
| Seize initiative: second battalion takes the ridge, lit battalion crosses the phase line, first losses, ambulance runs | Phase II |
| Dominate: lit battalion assaults the town; ridge battalion supports by fire then stops firing and stays (owner rule); enemy survivors withdraw | Phase III |
| Stabilize: checkpoints, aid trucks and a queue at the aid point, police join the checkpoints, two snipers hit one checkpoint and are hit | Phase IV (JP 3-0 2018 V-5.b(5)) |
| Enable civil authority: police hold the checkpoints alone, battalions pull back to the base, townspeople at the market | Phase V (JP 3-0 2018 V-5.b(6)) |

**Notional numbers (model.mjs, tested).** Men down per phase, friendly vs enemy: 0/0, 0/0, 6/14, 15/38, 3/4, 0/0. Cumulative by phase: 0/0, 0/0, 6/14, 21/52, 24/56, 24/56. Within a phase the count ramps with the action (all in by 80% of it, `lossesAt`). The count is a pure function of the phase shown, so shifting back shows the lower figure and Shape restarts at zero. Drawn: one friendly vehicle knocked out per ~6 friendly casualties in the fighting phases (1 in II, 3 by III), about one enemy vehicle per 8 (1 in II, 6 by III), plus one friendly soldier and both snipers down in IV. Battlefield readout: `Ph III: Dominate · 21 vs 52 down` (all six under 45 characters, tested); transitions keep the machine's `Transition II → III · …` text. Display timings: 1.5 s of in-phase action once units are in place, 0.5 s hold in the tour; vehicles move at up to 120, people 20, supply trucks 46 field units/s. Layout drawn at 0.88× about its centre to fill the card. All positions, ranges, timings and figure scale are notional.

**Decisions (owner asleep).** Losses are a function of the phase shown, not a running worst-so-far. Fighting only in II–IV; IV's sniper exchange shows that stabilization is not free. Civil elements: aid trucks (sand), local police (charcoal, peaked cap, unarmed), townspeople (brown, unarmed), drawn with a local `phPerson` helper (no kit change). Which unit does what in each phase is the figure's illustration, said so on the page. Field-view tour holds each phase until its action has run.

**Checks (2026-10-13).** `model.test.mjs` passes (adds losses and the field readout). Line ends 0 in the field view at Shape, Seize initiative, Dominate, Stabilize and Enable civil authority (1440 and 390 px) and in reduced motion; machine view 0 at Phase IV/V and at Phase III after switching with the V key. Console clean; no sideways scroll at 390 px (scrollWidth 390). Frame timing, 6 s of the field-view tour (rAF hook): desktop 60.0 fps, JS p50 0.60 / p95 1.30 ms, longest gap 16.8 ms; 390 px, DPR 3, 4× CPU throttle 59.7 fps, JS 2.2 / 4.6 ms, two 33 ms gaps. 4× close-ups of the town in Dominate and of the checkpoints in Stabilize (fixed: dismounts now ride until their vehicle is in place; aid trucks, queue and the west checkpoint moved off the wrecks). Machine thumbnail kept.
