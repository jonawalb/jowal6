// Rhetoric Search: controls, URL hash, progressive search over shards, results and month chart.
import { Engine, parseQuery, fold } from './engine.js';
import { sourceName as srcName, STOPPED } from './sources.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => n.toLocaleString('en-US');
const COUNTRY = { RU: 'Russia', IR: 'Iran', CN: 'China', KP: 'North Korea', BY: 'Belarus', US: 'United States', PK: 'Pakistan', IN: 'India', TR: 'Türkiye', SY: 'Syria', VE: 'Venezuela', CU: 'Cuba', TW: 'Taiwan' };
const LANG = { en: 'English', ru: 'Russian', zh: 'Chinese', fa: 'Persian', ko: 'Korean', be: 'Belarusian', ur: 'Urdu', hi: 'Hindi', tr: 'Turkish', ar: 'Arabic', es: 'Spanish' };
const PAGE = 50;
const CONCURRENCY = 4;

const E = new Engine();
const S = { q: '', country: '', source: '', lang: '', from: '', to: '' };
let run = 0;            // id of the current search; stale shard results are dropped
let hits = [];          // {sh, doc, sent, spans, date}
let shown = 0;
let gen = 0;            // repaint generation: a list render from an older paint is dropped
let alts = [];          // parsed query of the current search (the reader highlights it)

// ---- URL hash -------------------------------------------------------------------------------------------
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  for (const k of Object.keys(S)) S[k] = p.get(k === 'country' ? 'c' : k === 'source' ? 's' : k === 'lang' ? 'l' : k) || '';
}
function writeHash() {
  const p = new URLSearchParams();
  const key = { country: 'c', source: 's', lang: 'l' };
  for (const [k, v] of Object.entries(S)) if (v) p.set(key[k] || k, v);
  history.replaceState(null, '', p.toString() ? '#' + p.toString() : location.pathname);
}

// ---- Controls -------------------------------------------------------------------------------------------
function mountControls(meta) {
  const countries = [...new Set(meta.shards.map((s) => s[1]))].sort();
  $('country').innerHTML = [['', 'All'], ...countries.map((c) => [c, COUNTRY[c] || c])]
    .map(([c, n]) => `<button type="button" data-c="${c}" aria-pressed="false">${esc(n)}</button>`).join('');
  $('country').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) { S.country = b.dataset.c; S.source = ''; sync(); go(); } });
  $('source').addEventListener('change', () => { S.source = $('source').value; go(); });
  $('lang').addEventListener('change', () => { S.lang = $('lang').value; go(); });
  $('from').addEventListener('change', () => { S.from = $('from').value; go(); });
  $('to').addEventListener('change', () => { S.to = $('to').value; go(); });
  $('clear-dates').addEventListener('click', () => { S.from = S.to = ''; go(); });
  $('qform').addEventListener('submit', (e) => { e.preventDefault(); S.q = $('q').value.trim(); go(); });
  $('more').addEventListener('click', () => renderList());
  $('lang').innerHTML = '<option value="">All</option>' + meta.langs.map((l) => `<option value="${l}">${esc(LANG[l] || l)}</option>`).join('');
}

function sync() {
  const meta = E.meta;
  $('q').value = S.q;
  for (const b of $('country').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.c === S.country));
  const srcs = meta.sources.filter((s) => !S.country || s.country === S.country);
  $('source').innerHTML = '<option value="">All sources</option>' + srcs.map((s) => `<option value="${esc(s.id)}">${esc(srcName(s.id))}${S.country ? '' : ' (' + esc(s.country) + ')'}</option>`).join('');
  $('source').value = S.source;
  $('lang').value = S.lang;
  $('from').value = S.from;
  $('to').value = S.to;
  $('clear-dates').hidden = !(S.from || S.to);
}

// Idle prompt: how many documents the search covers.
function idleText() {
  const t = E.meta && E.meta.totals;
  if (!t) return 'Type a word or phrase.';
  const media = t.media_docs || 0;
  return `Search ${fmt(t.docs + media)} documents: ${fmt(t.docs)} official statements and ${fmt(media)} media articles. Type a word or phrase.`;
}

function corpusCard(meta) {
  const cn = (s) => COUNTRY[s.country] || s.country;
  const rows = meta.sources.filter((s) => s.docs).map((s) => [s, s])
    .sort(([a], [b]) => cn(a).localeCompare(cn(b)) || srcName(a.id).localeCompare(srcName(b.id)));
  $('corpus').innerHTML = `<p class="fine">${fmt(meta.totals.sentences)} sentences from ${fmt(meta.totals.docs)} official documents, and ${fmt(meta.totals.media_docs || 0)} media articles (headline and link only). Built ${esc(meta.built.slice(0, 10))}.</p>
    <table><tbody>${rows.map(([s, p]) => `<tr><td>${esc(COUNTRY[s.country] || s.country)}</td><td>${esc(srcName(s.id))}${STOPPED[s.id] ? `<br><span class="stopped">${esc(STOPPED[s.id])}</span>` : ''}</td><td class="num">${esc(p.from.slice(0, 7))} to ${esc(p.to.slice(0, 7))}<br>${fmt(p.docs)} docs</td></tr>`).join('')}</tbody></table>
    ${rows.some(([s]) => s.id === 'ir_mfa_en') ? '<p class="fine">The two Iran Foreign Ministry streams do not overlap. The Statements feed is the ministry\'s English “Statements” list, read from the live site or archived copies. “Other pages” are further en.mfa.ir items (spokesman press conferences, news, articles) read from Wayback Machine copies; any item already in the Statements feed is skipped.</p>' : ''}`;
}

// ---- Search ---------------------------------------------------------------------------------------------
async function go() {
  writeHash();
  sync();
  const my = ++run;
  document.body.dataset.state = 'busy';
  hits = []; shown = 0; gen++;
  $('results').innerHTML = '';
  $('more').hidden = true;
  $('chart').hidden = true;
  alts = parseQuery(S.q);
  if (!alts.length) { document.body.dataset.state = 'done'; $('count').textContent = idleText(); $('status').textContent = ''; $('progress').hidden = true; return; }
  const f = { country: S.country, source: S.source, lang: S.lang, from: S.from, to: S.to };
  const t0 = performance.now();
  $('count').textContent = 'Searching…';
  const [ids, med] = await Promise.all([E.candidates(alts, f), E.mediaSearch(alts, f)]);
  if (my !== run) return;
  for (const m of med.docs) hits.push({ media: true, doc: m.doc, n: m.n, date: m.date });
  const multi = alts.some((a) => a.length > 1 || a.some((t) => t.need.length > 1));
  const total = ids.length;
  let done = 0, firstPaint = 0;
  $('progress').hidden = total === 0;
  const tick = () => {
    $('bar').style.width = `${total ? (100 * done / total) : 100}%`;
    const off = hits.filter((h) => !h.media);
    const docs = new Set(off.map((h) => h.sh + ':' + h.doc)).size;
    const mn = med.docs.reduce((a, m) => a + m.n, 0);
    $('count').innerHTML = `<span class="num">${fmt(off.length)}</span> sentence${off.length === 1 ? '' : 's'} in <span class="num">${fmt(docs)}</span> official document${docs === 1 ? '' : 's'}`
      + ` <span class="sep">·</span> <span class="num">${fmt(med.docs.length)}</span> media article${med.docs.length === 1 ? '' : 's'} (<span class="num">${fmt(mn)}</span> mention${mn === 1 ? '' : 's'})`;
    $('status').textContent = (done < total ? `Searching ${fmt(done)} of ${fmt(total)} parts of the official texts…`
      : `${total ? `Searched ${fmt(total)} of ${fmt(E.meta.shards.length)} parts of the official texts` : 'No official text holds every word'} in ${((performance.now() - t0) / 1000).toFixed(1)} s.`)
      + (multi ? ' Media articles match when every word appears anywhere in the article.' : '')
      + (med.unsupported ? ' Single Chinese characters are not indexed for media articles.' : '');
  };
  tick();
  let next = 0;
  const worker = async () => {
    while (next < ids.length) {
      const id = ids[next++];
      let sh;
      try { sh = await E.shard(id); } catch (e) { console.warn('shard', id, e); done++; continue; }
      if (my !== run) return;
      for (const h of E.scan(sh, alts, f)) hits.push({ sh: id, doc: h.doc, sent: h.sent, spans: h.spans, date: sh.docs[h.doc][0] });
      done++;
      tick();
      if (!firstPaint || done === total || done % 6 === 0) { firstPaint = 1; paint(); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));
  if (my !== run) return;
  done = total;
  tick();
  $('progress').hidden = true;
  paint();
  document.body.dataset.state = 'done';
}

function paint() {
  hits.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.media ? 1 : 0) - (b.media ? 1 : 0) || (a.media ? a.doc - b.doc : a.sh - b.sh || a.sent - b.sent)));
  shown = 0;
  gen++;
  $('results').innerHTML = '';
  renderList();
  renderChart();
}

function highlight(text, spans) {
  const sp = [...spans].sort((a, b) => a[0] - b[0]);
  let out = '', at = 0;
  for (const [s, e] of sp) { if (s < at) continue; out += esc(text.slice(at, s)) + '<mark>' + esc(text.slice(s, e)) + '</mark>'; at = e; }
  return out + esc(text.slice(at));
}

function officialItem(h, sh) {
  const meta = E.meta;
  const d = sh.docs[h.doc];
  const src = meta.sources[d[1]];
  const title = d[2] || '';
  return `<li class="hit" data-cc="${esc(src.country)}">
    <div class="m"><b>${esc(d[0])}</b><span>${esc(COUNTRY[src.country] || src.country)} · ${esc(srcName(src.id))}${d[7] ? ` · ${esc(d[7])}` : ''}</span>${d[4] ? `<span>${esc(d[4])}</span>` : ''}<span>${esc(LANG[meta.langs[d[6]]] || meta.langs[d[6]])}</span></div>
    <p class="s">${highlight(sh.sents[h.sent], h.spans)}</p>
    <div class="t">${title ? esc(title) + ' · ' : ''}<a href="${esc(safeUrl(d[3]))}" target="_blank" rel="noopener">Source</a>${E.hasDocs && d[8] != null ? ` · <button type="button" class="linkbtn" data-read="${d[8]}">Read document</button>` : ''}</div></li>`;
}

// Only http(s) links are rendered; anything else becomes an inert '#'.
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '#');
const waybackOf = (u) => (/^https?:\/\//i.test(u || '') ? `https://web.archive.org/web/${u}` : '#');

function mediaItem(h, row) {
  const meta = E.meta;
  const src = meta.sources[E.mlite.src[h.doc]];
  const lang = meta.langs[E.mlite.lang[h.doc]];
  const [title, url, outlet, speaker, headline] = row;
  const what = headline ? 'in this headline' : 'in this article';
  return `<li class="hit media" data-cc="${esc(src.country)}">
    <div class="m"><b>${esc(h.date)}</b><span>${esc(COUNTRY[src.country] || src.country)} · ${esc(srcName(src.id))}${outlet ? ` · ${esc(outlet)}` : ''}</span>${speaker ? `<span>${esc(speaker)}</span>` : ''}<span>${esc(LANG[lang] || lang)}</span><span class="tag">media: text not shown</span></div>
    <p class="mt"><a href="${esc(safeUrl(url))}" target="_blank" rel="noopener">${esc(title || url)}</a></p>
    <div class="t">Matched ${fmt(h.n)} time${h.n === 1 ? '' : 's'} ${what}. <a href="${esc(waybackOf(url))}" target="_blank" rel="noopener">Wayback</a></div></li>`;
}

function renderList() {
  const slice = hits.slice(shown, shown + PAGE);
  const my = gen;
  Promise.all(slice.map((h) => (h.media ? E.mediaDoc(h.doc) : E.shard(h.sh)))).then((got) => {
    if (my !== gen) return;
    const items = slice.map((h, i) => (h.media ? mediaItem(h, got[i]) : officialItem(h, got[i])));
    $('results').insertAdjacentHTML('beforeend', items.join(''));
    shown += slice.length;
    $('more').hidden = shown >= hits.length;
    $('more').textContent = `Show more (${fmt(hits.length - shown)} left)`;
  });
}

// ---- Reader: the full text of an official document (media articles have no text here) --------------------
function termSpans(text) {
  const f = fold(text);
  const out = [];
  for (const alt of alts) for (const term of alt) {
    term.re.lastIndex = 0;
    let m;
    while ((m = term.re.exec(f))) { if (!m[0].length) { term.re.lastIndex++; continue; } out.push([m.index, m.index + m[0].length]); }
  }
  return out;
}

async function openReader(rowid) {
  const dlg = $('reader');
  const body = $('reader-body');
  $('reader-title').textContent = 'Loading…';
  $('reader-meta').innerHTML = '';
  $('reader-links').innerHTML = '';
  body.innerHTML = '';
  if (!dlg.open) dlg.showModal();
  let doc;
  try { doc = await E.doc(rowid); } catch (e) { doc = null; console.warn('doc', rowid, e); }
  if (!doc) { $('reader-title').textContent = 'This document could not be loaded.'; return; }
  const meta = E.meta;
  const src = meta.sources.find((s) => s.id === doc.source) || { id: doc.source, country: '' };
  $('reader-title').textContent = doc.title || '(untitled)';
  $('reader-meta').innerHTML = [doc.date, `${COUNTRY[src.country] || src.country} · ${srcName(src.id)}${doc.org ? ' · ' + doc.org : ''}`,
    doc.speaker, LANG[doc.lang] || doc.lang].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join('');
  $('reader-links').innerHTML = `<a href="${esc(safeUrl(doc.url))}" target="_blank" rel="noopener">Original source</a>`
    + ` · <a href="${esc(safeUrl(doc.wayback) !== '#' ? doc.wayback : waybackOf(doc.url))}" target="_blank" rel="noopener">Wayback Machine copy</a>`;
  let n = 0;
  body.innerHTML = doc.text.split('\n').filter((x) => x.trim()).map((para) => {
    const sp = termSpans(para);
    n += sp.length;
    return `<p>${highlight(para, sp)}</p>`;
  }).join('');
  $('reader-hits').textContent = alts.length ? `${fmt(n)} match${n === 1 ? '' : 'es'} highlighted.` : '';
  body.scrollTop = 0;
  const first = body.querySelector('mark');
  if (first) first.scrollIntoView({ block: 'center' });
}

function mountReader() {
  $('results').addEventListener('click', (e) => {
    const b = e.target.closest('[data-read]');
    if (b) openReader(Number(b.dataset.read));
  });
  $('reader-close').addEventListener('click', () => $('reader').close());
  $('reader').addEventListener('click', (e) => { if (e.target === $('reader')) $('reader').close(); });
}

// ---- Chart ----------------------------------------------------------------------------------------------
function renderChart() {
  if (!hits.length) { $('chart').hidden = true; return; }
  const by = new Map();
  // [official sentences, media articles] per month
  for (const h of hits) { const m = h.date.slice(0, 7); const v = by.get(m) || [0, 0]; v[h.media ? 1 : 0]++; by.set(m, v); }
  const keys = [...by.keys()].sort();
  const months = [];
  let [y, mo] = keys[0].split('-').map(Number);
  const [y1, m1] = keys[keys.length - 1].split('-').map(Number);
  while (y < y1 || (y === y1 && mo <= m1)) { months.push(`${y}-${String(mo).padStart(2, '0')}`); mo++; if (mo > 12) { mo = 1; y++; } }
  const svg = $('hist');
  const W = svg.clientWidth || 800, H = 150, L = 34, R = 6, T = 8, Bm = 22;
  const max = Math.max(...[...by.values()].map((v) => v[0] + v[1]));
  const bw = Math.min(48, (W - L - R) / months.length);
  const yv = (v) => T + (H - T - Bm) * (1 - v / max);
  let s = '';
  const ticks = max <= 4 ? Array.from({ length: max + 1 }, (_, i) => i) : [0, Math.round(max / 2), max];
  for (const t of ticks) s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${yv(t)}" y2="${yv(t)}"/><text class="tsm-axis" x="${L - 4}" y="${yv(t) + 3.5}" text-anchor="end">${t}</text>`;
  months.forEach((m, i) => {
    const [o, md] = by.get(m) || [0, 0];
    if (!(o + md)) return;
    const x = L + i * bw + (bw > 3 ? 0.5 : 0), w = Math.max(1, bw - (bw > 3 ? 1 : 0));
    const on = S.from.startsWith(m) && S.to.startsWith(m) ? ' on' : '';
    const label = `${m}: ${fmt(o)} official sentences, ${fmt(md)} media articles`;
    s += `<g class="col${on}" data-m="${m}" tabindex="0" role="button" aria-label="${label}"><title>${label}</title>`
      + (o ? `<rect class="bar" x="${x}" y="${yv(o)}" width="${w}" height="${H - Bm - yv(o)}"/>` : '')
      + (md ? `<rect class="bar med" x="${x}" y="${yv(o + md)}" width="${w}" height="${yv(o) - yv(o + md)}"/>` : '') + '</g>';
  });
  const every = Math.max(1, Math.ceil(months.length / Math.max(2, Math.floor((W - L) / 64))));
  months.forEach((m, i) => { if (i % every === 0) s += `<text class="tsm-axis" x="${L + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${m}</text>`; });
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = s;
  $('chart').hidden = false;
  const pick = (el) => {
    const m = el.dataset.m;
    const [yy, mm] = m.split('-').map(Number);
    S.from = `${m}-01`;
    S.to = `${m}-${String(new Date(Date.UTC(yy, mm, 0)).getUTCDate()).padStart(2, '0')}`;
    go();
  };
  svg.querySelectorAll('.col').forEach((r) => {
    r.addEventListener('click', () => pick(r));
    r.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(r); } });
  });
}

// ---- Boot -----------------------------------------------------------------------------------------------
async function boot() {
  try {
    const meta = await E.init();
    await E.initMedia();
    mountControls(meta);
    mountReader();
    corpusCard(meta);
    $('count').textContent = idleText();
    readHash();
    sync();
    document.body.classList.remove('loading');
    window.addEventListener('hashchange', () => { readHash(); go(); });
    let resize;
    window.addEventListener('resize', () => { clearTimeout(resize); resize = setTimeout(renderChart, 150); });
    if (S.q) go();
  } catch (e) {
    document.body.classList.remove('loading');
    $('count').textContent = 'The search index could not be loaded.';
    $('status').textContent = String(e.message || e);
  }
}
boot();
