// Shock presets and notional model assumptions. Shares come from data/chain.js. Every value in NOTIONAL is
// an assumption, not data: no public source gives buffer inventories or substitution times for these
// stages. Each carries its rationale and is exposed as a slider for the stages a shock hits.
// `hits`: whose output is lost at which stage, and how much of it (coverage, %).
// `status`: 'announced' (mirrors a published measure) or 'stress' (a hypothetical extension).

export const SCENARIOS = [
  { id: 'nl-euv', label: 'Netherlands stops EUV shipments and service', status: 'stress',
    hits: [{ st: 'euv', a: 'Netherlands', c: 100 }],
    basis: 'ASML is the only EUV supplier (ETO, 2025). Dutch national rules since September 2023 require licences for advanced DUV immersion tools and other chipmaking equipment (Stcrt. 2023, 18212), aimed at China. A stop on EUV shipments and service to every buyer is hypothetical. The buffer is how long installed tools keep running without ASML service and parts.' },
  { id: 'tw', label: 'Taiwan disruption (open-ended)', status: 'stress',
    hits: [{ st: 'foundry', a: 'Taiwan', c: 100 }, { st: 'atp', a: 'Taiwan', c: 100 }],
    basis: 'Removes Taiwan-located output at the two stages with location data: 69% of logic capacity below 10 nm and 28% of ATP capacity (SIA/BCG, 2022). Taiwan-located packaging (CoWoS) is not modelled for lack of a public share, so this understates the shock.' },
  { id: 'tw-6', label: 'Taiwan disruption lasting six months', status: 'stress',
    hits: [{ st: 'foundry', a: 'Taiwan', c: 100 }, { st: 'atp', a: 'Taiwan', c: 100 }], months: 6,
    basis: 'The same loss, ending after six months. The model returns output to normal at once when the shock ends, which flatters recovery after real damage.' },
  { id: 'kr-hbm', label: 'Korea HBM disruption (SK hynix and Samsung)', status: 'stress',
    hits: [{ st: 'hbm', a: 'South Korea', c: 100 }],
    basis: 'SK hynix and Samsung held 83% of HBM revenue in 2Q 2026 (Counterpoint). Shares are by company headquarters; the tool treats their output as Korean. Hypothetical.' },
  { id: 'jp-resist', label: 'Japanese photoresist halt', status: 'stress',
    hits: [{ st: 'resist', a: 'Japan', c: 100 }],
    basis: 'Japanese producers hold about 91% of the photoresist market (Nikkei via TrendForce). No such halt has been announced.' },
  { id: 'cn-min', label: 'China halts gallium, germanium and rare earths', status: 'stress',
    hits: [{ st: 'ga', a: 'China', c: 100 }, { st: 'ge', a: 'China', c: 100 }, { st: 'ree', a: 'China', c: 100 }],
    basis: 'Builds on China’s licensing of gallium and germanium (2023) and rare earths (2025) and its suspended bans. A worldwide halt is hypothetical. How much accelerator output depends on these inputs is unknown: the pass-through slider sets it.' },
  { id: 'us-tools', label: 'U.S. fab-tool suppliers withdraw service', status: 'stress',
    hits: [{ st: 'dep', a: 'United States', c: 100 }, { st: 'etch', a: 'United States', c: 100 }, { st: 'clean', a: 'United States', c: 100 }, { st: 'cmp', a: 'United States', c: 100 }, { st: 'metro', a: 'United States', c: 100 }],
    basis: 'A thought experiment on how far the world chain, not just China, depends on U.S. tool makers: deposition, etch, clean, CMP and metrology. U.S. controls restrict service to listed Chinese fabs; a worldwide withdrawal is hypothetical.' },
];

// Slider ranges (months; dep is a 0-1 fraction).
export const LIMITS = {
  buffer: { min: 0, max: 24, step: 1 },
  lo: { min: 0, max: 120, step: 3 },
  hi: { min: 0, max: 120, step: 3 },
  dep: { min: 0, max: 1, step: 0.05 },
};

const TOOL = 'Installed tools keep running without the supplier';
// buffer = months before output falls; lo/hi = months until substitutes fully replace the lost share.
export const NOTIONAL = {
  eda: { buffer: 12, lo: 24, hi: 60, bufferLabel: 'Installed licences keep working',
    why: 'Installed EDA seats keep running until licences lapse or tools need updates. A substitute must be certified against each foundry’s process design kit.' },
  ip: { buffer: 12, lo: 24, hi: 60, bufferLabel: 'Licensed IP stays usable',
    why: 'Licensed IP already in designs stays usable; new designs need replacement cores, which take years to build and verify.' },
  wafers: { buffer: 3, lo: 12, hi: 36,
    why: 'Wafer makers elsewhere must add crystal-growing capacity and qualify with each fab.' },
  resist: { buffer: 3, lo: 12, hi: 48,
    why: 'Resists have a limited shelf life and are qualified layer by layer, which takes months to years for a new supplier.' },
  ga: { buffer: 6, lo: 12, hi: 36, dep: 10,
    why: 'Gallium goes mostly into GaAs and GaN devices, not silicon logic (USGS). Pass-through default 10% is notional: no public source estimates how much accelerator output depends on it.' },
  ge: { buffer: 6, lo: 12, hi: 36, dep: 10,
    why: 'Germanium refining outside China exists but is small. Pass-through default 10% is notional: no public source estimates the dependence.' },
  ree: { buffer: 6, lo: 24, hi: 60, dep: 10,
    why: 'Rare earths reach the chain mainly through magnets in tools. Pass-through default 10% is notional: no public source estimates the dependence.' },
  euv: { buffer: 9, lo: 60, hi: 120, bufferLabel: TOOL,
    why: 'ASML is the sole EUV supplier and no other firm has a commercial tool (ETO, 2025: China 0%). Replacing it means building a new tool ecosystem.' },
  duv: { buffer: 9, lo: 48, hi: 96, bufferLabel: TOOL,
    why: 'Japanese suppliers hold under 1% of ArF immersion tools (ETO, 2025); scaling them or a new entrant takes years.' },
  track: { buffer: 9, lo: 24, hi: 60, bufferLabel: TOOL,
    why: 'Tokyo Electron holds 92.6% of tracks; tracks are paired with scanners, so a substitute must be qualified with the lithography line.' },
  dep: { buffer: 9, lo: 18, hi: 48, bufferLabel: TOOL,
    why: 'Several suppliers exist in the U.S., Japan, the Netherlands and China, but qualifying a new tool at a leading-edge fab takes months to years.' },
  etch: { buffer: 9, lo: 18, hi: 48, bufferLabel: TOOL, why: 'As for deposition: alternative suppliers exist, qualification is slow.' },
  clean: { buffer: 9, lo: 12, hi: 36, bufferLabel: TOOL, why: 'Less concentrated than etch; qualification still takes months.' },
  cmp: { buffer: 9, lo: 12, hi: 36, bufferLabel: TOOL, why: 'Two main suppliers in the U.S. and Japan, plus Hwatsing in China.' },
  metro: { buffer: 9, lo: 18, hi: 48, bufferLabel: TOOL, why: 'KLA dominates defect inspection; fabs can run with less inspection at a cost in yield.' },
  foundry: { buffer: 3, lo: 36, hi: 84, bufferLabel: 'Chips and wafers in the pipeline',
    why: 'A new leading-edge fab takes years to build and qualify. SIA/BCG projects Taiwan’s share of capacity below 10 nm falling from 69% to 47% only by 2032.' },
  hbm: { buffer: 2, lo: 18, hi: 48, bufferLabel: 'HBM in inventory',
    why: 'Micron is the only other supplier in the data; more HBM needs DRAM wafer capacity and stacking lines.' },
  atp: { buffer: 2, lo: 6, hi: 24, bufferLabel: 'Parts in inventory',
    why: 'ATP capacity is spread across many countries; shifting work is faster than in front-end stages.' },
  test: { buffer: 9, lo: 12, hi: 36, bufferLabel: TOOL, why: 'Advantest and Teradyne hold 85%; installed testers keep running.' },
};

export const NOTIONAL_NOTE = 'Every buffer, substitution time and pass-through value here is a notional assumption chosen to be plausible in order of magnitude, not an estimate. No public source gives them. Move them to test how much a result depends on them.';
