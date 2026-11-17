// Document search: which documents match a query, ranked so the one a reader most likely means comes first.
// Pure functions (no DOM, no data import) so scripts/compass.test.mjs can check the ranking.

const norm = s => String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
const words = q => norm(q).split(' ').filter(Boolean);
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const atWord = (hay, w) => new RegExp(`(^|[^a-z0-9])${escRe(w)}`).test(hay);

/** Every word of the query must start a word somewhere in the document's title, original title, issuer, kind or summary. */
export function matchesQuery(d, q) {
  const ws = words(q);
  if (!ws.length) return true;
  const hay = norm(`${d.title} ${d.titleOrig || ''} ${d.issuer} ${String(d.kind || '').replace(/-/g, ' ')} ${d.summary}`);
  return ws.every(w => atWord(hay, w));
}

/**
 * Relevance score (higher is better). Order of evidence: the whole query in the title (exact case scores above
 * any case, start of the title above elsewhere), then each query word in the title (more if the title starts
 * with the first word), then the whole query in the summary, original title or issuer. `key` marks a
 * hand-picked key document, which wins near-ties: "CHIPS" means the CHIPS and Science Act before rules about it.
 */
export function score(d, q, key = false) {
  const raw = String(q || '').trim(), phrase = norm(raw), ws = words(raw);
  if (!ws.length) return 0;
  const title = norm(d.title), other = norm(`${d.titleOrig || ''} ${d.issuer}`), sum = norm(d.summary);
  let s = 0;
  if (title === phrase) s += 200;
  if (title.includes(phrase)) {
    s += 100;
    if (title.startsWith(phrase)) s += 30;
    else if (atWord(title, phrase)) s += 15;
    if (/[A-Z]/.test(raw) && String(d.title).includes(raw.replace(/\s+/g, ' '))) s += 40;
  }
  for (const w of ws) if (atWord(title, w)) s += 12;
  if (title.startsWith(ws[0])) s += 20;
  if (other.includes(phrase)) s += 10;
  if (sum.includes(phrase)) s += 15;
  for (const w of ws) if (atWord(sum, w)) s += 2;
  if (key) s += 25;
  return s;
}

/** Matching documents, best first; ties go to the more recent document. */
export function rankDocs(docs, q, isKey = () => false) {
  return docs.filter(d => matchesQuery(d, q))
    .map(d => ({ d, s: score(d, q, isKey(d.id)) }))
    .sort((a, b) => b.s - a.s || b.d.date.localeCompare(a.d.date))
    .map(x => x.d);
}
