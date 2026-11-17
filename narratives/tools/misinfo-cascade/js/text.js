// Plain-English text for the result sentence, kept-run labels and the "Present this" one-click states.
// Pure functions (no DOM) so scripts/misinfo-cascade.test.mjs can check them against the engine.

const pct = x => `${Math.round(x * 100)}%`;

/** One-click demo states. Each starts from DEFAULTS; look is what to scroll into view (the chart for the correction steps). */
export const PRESETS = {
  'spread':    { set: { cor: 0, t: 0 }, play: true, look: '.layout' },
  'round8':    { set: { cor: 0, t: 8 }, nokeep: true, look: '.layout' },
  'late-out':  { set: { cor: 1, t: 40 }, look: '.grid2' },
  'late-in':   { set: { cor: 1, src: 'i', t: 40 }, look: '.grid2' },
  'early-out': { set: { cor: 1, tc: 3, t: 40 }, look: '.grid2' },
};

/** Short description of a run's settings, naming the correction and any core setting that differs from the defaults. */
export function runLabel(p, d) {
  const parts = [p.cor ? `${p.src === 'i' ? 'in-group voice' : 'outside fact-check'} at round ${p.tc}, ${pct(p.rc)} reach` : 'no correction'];
  if (p.md !== d.md) parts.push(`median conviction ${(+p.md).toFixed(2)}`);
  if (p.lam !== d.lam) parts.push(`fear gain λ ${(+p.lam).toFixed(2)}`);
  if (p.amp !== d.amp) parts.push(`amplification ${(+p.amp).toFixed(2)}`);
  if (p.seed !== d.seed) parts.push(`seed ${p.seed}`);
  return parts.join(', ');
}

/** The live plain-English reading of the current settings. s and g are summarize() of the run and the no-correction run. */
export function resultSentence(p, f, s, g, kept, n, T) {
  const now = `Round ${p.t}: ${pct(f.sharing / n)} of people are sharing.`;
  const end = p.cor
    ? ` By round ${T}, ${pct(s.final)} share with an ${p.src === 'i' ? 'in-group' : 'out-group'} correction at round ${p.tc}, against ${pct(g.final)} with none.`
    : ` With no correction, ${pct(s.final)} share by round ${T}.`;
  const tip = s.half < 0 ? ' It never reaches half the network.' : ` Tipping point: half the network shares by round ${s.half}.`;
  const k = kept ? ` Kept run (${kept.label}): ${pct(kept.final)}.` : '';
  return `Model result. ${now}${end}${tip}${k}`;
}
