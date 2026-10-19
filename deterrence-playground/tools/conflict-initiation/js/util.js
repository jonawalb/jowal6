// Small helpers shared by the Conflict Initiation views.
export const f2 = x => (Math.abs(x) < 0.005 ? 0 : x).toFixed(2);
export const pct = x => `${Math.round(x * 100)}%`;
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Inline TeX, typeset later by typeset(); display=true for a centered block. */
export const tex = (s, display = false) => display ? `<span class="tx">$$${s}$$</span>` : `<span class="tx">$${s}$</span>`;

/** Render every $...$ / $$...$$ inside `el` once KaTeX has loaded. */
export function typeset(el) {
  const run = () => window.renderMathInElement(el, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
  if (window.renderMathInElement) run();
  else window.addEventListener('load', () => window.renderMathInElement && run(), { once: true });
}

export const WHO = { A: 'A', B: 'B', C: 'Chance' };
