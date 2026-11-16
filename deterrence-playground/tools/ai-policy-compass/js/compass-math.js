// Pure scoring for "Where do you stand?". No DOM. Tested by scripts/compass.test.mjs.
// answers: { axisId: 0..100 } for the questions the reader has answered.
// govs: { axisId: { US: {value}, CN: {value}, RU: {value} } }; value null = no official text places it.

/** Mean absolute gap (0-100 points) between the reader and each government, over axes both have answered. */
export function distances(answers, govs, ids = ['US', 'CN', 'RU']) {
  const res = {};
  for (const g of ids) {
    let sum = 0, n = 0;
    for (const [axis, a] of Object.entries(answers)) {
      const v = govs[axis]?.[g]?.value;
      if (typeof a !== 'number' || typeof v !== 'number') continue;
      sum += Math.abs(a - v); n++;
    }
    res[g] = n ? { gap: sum / n, n } : { gap: null, n: 0 };
  }
  return res;
}

/** Governments ordered closest first; those with no shared axes go last. */
export function ranking(dist) {
  return Object.entries(dist).sort((a, b) => {
    if (a[1].gap == null) return 1;
    if (b[1].gap == null) return -1;
    return a[1].gap - b[1].gap;
  }).map(([id, v]) => ({ id, ...v }));
}

/** Encode answers for the URL hash: "binding:30,content:70". Values are clamped to 0..100 and rounded. */
export function encodeAnswers(answers, order) {
  return order.filter(k => typeof answers[k] === 'number')
    .map(k => `${k}:${Math.round(Math.min(100, Math.max(0, answers[k])))}`).join(',');
}
export function decodeAnswers(str, order) {
  const out = {};
  for (const part of String(str || '').split(',')) {
    const [k, v] = part.split(':');
    const n = Number(v);
    if (order.includes(k) && v !== '' && Number.isFinite(n)) out[k] = Math.min(100, Math.max(0, Math.round(n)));
  }
  return out;
}
