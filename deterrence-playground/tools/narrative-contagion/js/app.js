// Narrative Contagion Network: state, filters, URL hash, playback and wiring between views.
import { loadData, filterClusters, network, sortClusters, TYPE_LABEL } from './model.js';
import { createNetwork } from './network.js';
import { renderMatrix, renderPathways, renderCoverage } from './matrix.js';
import { renderList, renderDossier } from './views.js';

const $ = id => document.getElementById(id);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEF = { view: 'network', level: 'country', type: '', topic: '', country: '', pair: '', min: 2, from: '', to: '', sort: 'countries', metric: 'before', cl: '', minlink: 1 };
const S = { ...DEF, ...readHash() };
let D, net, until = null, playTimer = null, replay = null, limit = 25;

function readHash() {
  const p = new URLSearchParams(location.hash.slice(1)), o = {};
  for (const k of Object.keys(DEF)) if (p.has(k)) o[k] = typeof DEF[k] === 'number' ? Number(p.get(k)) || DEF[k] : p.get(k);
  return o;
}
function writeHash() {
  const p = new URLSearchParams();
  for (const k of Object.keys(DEF)) if (S[k] !== DEF[k] && S[k] !== '') p.set(k, S[k]);
  history.replaceState(null, '', p.toString() ? `#${p}` : location.pathname + location.search);
}
const filters = (extra = {}) => ({ type: S.type, topic: S.topic, country: S.country, pair: S.pair ? S.pair.split('-') : null,
  min: S.min, from: S.from, to: S.to, ...extra });

function setPressed(groupId, attr, value) {
  $(groupId).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset[attr] === String(value))));
}

function render() {
  const list = filterClusters(D, filters());
  const shown = until ? filterClusters(D, filters({ until })) : list;
  // Filters summary
  $('nc-count').textContent = `${list.length.toLocaleString()} of ${D.clusters.length.toLocaleString()} clusters`;
  const chips = [];
  if (S.pair) { const [a, b] = S.pair.split('-'); chips.push([`${D.countries[a]} + ${D.countries[b]}`, 'pair']); }
  if (S.country) chips.push([D.countries[S.country], 'country']);
  $('nc-active').innerHTML = chips.map(([t, k]) => `<button type="button" class="btn nc-chip" data-k="${k}" aria-label="Remove filter ${t}">${t} ×</button>`).join('');
  $('nc-active').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S[b.dataset.k] = ''; update(); }));
  // Views
  ['network', 'matrix', 'paths'].forEach(v => { $(`view-${v}`).hidden = S.view !== v; });
  setPressed('nc-tabs', 'view', S.view);
  if (S.view === 'network') drawNetwork(shown);
  if (S.view === 'matrix') {
    const top = renderMatrix($('nc-matrix'), D, list, S.metric, pickPair) || [];
    $('nc-matrix-top').innerHTML = top.length ? `<b>Largest ordered pairs:</b> ${top.join('; ')}.` : '';
  }
  if (S.view === 'paths') renderPathways($('nc-paths'), list);
  // Framings list
  const sorted = sortClusters(list, S.sort);
  renderList($('nc-list'), D, sorted, { limit, selected: S.cl, onPick: pick });
  $('nc-more').hidden = sorted.length <= limit;
  // Panel summary
  const items = list.reduce((s, c) => s + c.members.length, 0), edges = list.reduce((s, c) => s + c.e.length, 0);
  const types = list.reduce((o, c) => ((o[c.type] = (o[c.type] || 0) + 1), o), {});
  $('nc-summary').innerHTML = `<dt>Clusters</dt><dd>${list.length.toLocaleString()}</dd><dt>Items</dt><dd>${items.toLocaleString()}</dd>
    <dt>Passage matches</dt><dd>${edges.toLocaleString()}</dd>
    ${Object.entries(TYPE_LABEL).map(([k, v]) => `<dt>${v}</dt><dd>${(types[k] || 0).toLocaleString()}</dd>`).join('')}`;
  renderDossier($('nc-dossier'), D, S.cl ? D.byId.get(S.cl) : null, { onReplay: startReplay, onClose: () => { S.cl = ''; stopReplay(); update(); } });
  writeHash();
}

function drawNetwork(shown) {
  if (replay) return net.replay(D, S.level, replay.c, replay.day);
  let fresh = new Set();
  if (until) {
    const nowC = shown.filter(c => c.month === until);
    fresh = new Set(network(D, nowC, S.level).links.map(l => `${l.a}|${l.b}`));
  }
  const focus = S.level === 'country' && S.country ? S.country : null;
  net.draw(D, S.level, network(D, shown, S.level), { fresh, minLink: S.minlink, focus });
  $('nc-when').textContent = until ? `Clusters first seen up to ${until} (${shown.length.toLocaleString()}); orange = new that month` : 'All months';
}

function update() { limit = 25; render(); }
function pick(id) { S.cl = S.cl === id ? '' : id; stopReplay(); render(); if (S.cl && window.innerWidth < 980) $('nc-dossier').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }
function pickPair(a, b) { S.pair = `${a}-${b}`; S.cl = ''; limit = 25; render(); $('nc-list-card').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }
function pickCountry(c) { S.country = S.country === c ? '' : c; update(); }

// ---- Month playback over the aggregate network
function months() { const l = filterClusters(D, filters()); return [...new Set(l.map(c => c.month))].sort(); }
function setUntil(i) {
  const ms = months();
  until = i >= ms.length || i < 0 ? null : ms[i];
  $('nc-month').max = String(ms.length); $('nc-month').value = String(until ? i : ms.length);
  $('nc-month').setAttribute('aria-valuetext', until || 'All months');
  render();
}
function togglePlay() {
  if (playTimer) { clearInterval(playTimer); playTimer = null; $('nc-play').textContent = 'Play'; return; }
  stopReplay(); S.view = 'network';
  const ms = months(); let i = until ? ms.indexOf(until) : -1;
  if (i < 0 || i >= ms.length - 1) i = -1;
  $('nc-play').textContent = 'Pause';
  playTimer = setInterval(() => { i++; if (i >= ms.length) { togglePlay(); setUntil(ms.length); return; } setUntil(i); }, reduced ? 1100 : 650);
}

// ---- Replay of one cluster
function startReplay() {
  const c = D.byId.get(S.cl); if (!c) return;
  if (playTimer) togglePlay();
  until = null; S.view = 'network';
  const days = [...new Set(c.members.map(m => m.day))];
  replay = { c, days, k: 0, day: days[0], timer: null };
  $('nc-replay-bar').hidden = false; document.querySelector('.nc-time').hidden = true;
  stepReplay(0);
  replay.timer = setInterval(() => { if (replay.k >= days.length - 1) { pauseReplay(); return; } stepReplay(replay.k + 1); }, reduced ? 1400 : 900);
  $('nc-rp-pause').textContent = 'Pause';
  $('view-network').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}
function stepReplay(k) {
  replay.k = Math.max(0, Math.min(replay.days.length - 1, k)); replay.day = replay.days[replay.k];
  const n = replay.c.members.filter(m => m.day <= replay.day).length;
  $('nc-rp-status').textContent = `Day +${replay.day - replay.days[0]} · ${n} of ${replay.c.members.length} items · ${new Set(replay.c.members.filter(m => m.day <= replay.day).map(m => m.country)).size} of ${replay.c.countries.length} countries`;
  render();
}
function pauseReplay() { if (replay && replay.timer) { clearInterval(replay.timer); replay.timer = null; } $('nc-rp-pause').textContent = 'Resume'; }
function stopReplay() { if (!replay) return; pauseReplay(); replay = null; $('nc-replay-bar').hidden = true; document.querySelector('.nc-time').hidden = false; }

function bind() {
  $('nc-tabs').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { if (b.dataset.view !== 'network') stopReplay(); S.view = b.dataset.view; render(); }));
  $('nc-level').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S.level = b.dataset.level; setPressed('nc-level', 'level', S.level); render(); }));
  setPressed('nc-level', 'level', S.level);
  $('nc-type').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S.type = b.dataset.type; setPressed('nc-type', 'type', S.type); update(); }));
  setPressed('nc-type', 'type', S.type);
  const bindSel = (id, k, num) => { const e = $(id); e.value = String(S[k]); e.addEventListener('change', () => { S[k] = num ? Number(e.value) : e.value; until = null; update(); }); };
  bindSel('nc-topic', 'topic'); bindSel('nc-country', 'country'); bindSel('nc-min', 'min', true); bindSel('nc-from', 'from'); bindSel('nc-to', 'to');
  bindSel('nc-sort', 'sort'); bindSel('nc-metric', 'metric'); bindSel('nc-minlink', 'minlink', true);
  $('nc-month').addEventListener('input', e => { if (playTimer) togglePlay(); setUntil(Number(e.target.value)); });
  $('nc-play').addEventListener('click', togglePlay);
  $('nc-all').addEventListener('click', () => { if (playTimer) togglePlay(); setUntil(-1); });
  $('nc-more').addEventListener('click', () => { limit += 50; render(); });
  $('nc-reset').addEventListener('click', () => { Object.assign(S, DEF, { view: S.view, level: S.level }); until = null; stopReplay(); syncControls(); update(); });
  $('nc-rp-pause').addEventListener('click', () => { if (replay.timer) pauseReplay(); else { $('nc-rp-pause').textContent = 'Pause'; replay.timer = setInterval(() => { if (replay.k >= replay.days.length - 1) { pauseReplay(); return; } stepReplay(replay.k + 1); }, reduced ? 1400 : 900); } });
  $('nc-rp-back').addEventListener('click', () => { pauseReplay(); stepReplay(replay.k - 1); });
  $('nc-rp-fwd').addEventListener('click', () => { pauseReplay(); stepReplay(replay.k + 1); });
  $('nc-rp-exit').addEventListener('click', () => { stopReplay(); render(); });
  $('nc-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); $('nc-copy').textContent = 'Link copied'; } catch { $('nc-copy').textContent = 'Copy the address bar'; } setTimeout(() => { $('nc-copy').textContent = 'Copy link'; }, 1800); });
  window.addEventListener('hashchange', () => { Object.assign(S, DEF, readHash()); syncControls(); render(); });
}
function syncControls() {
  for (const [id, k] of [['nc-topic', 'topic'], ['nc-country', 'country'], ['nc-min', 'min'], ['nc-from', 'from'], ['nc-to', 'to'], ['nc-sort', 'sort'], ['nc-metric', 'metric'], ['nc-minlink', 'minlink']]) $(id).value = String(S[k]);
  setPressed('nc-type', 'type', S.type); setPressed('nc-level', 'level', S.level);
}

function fillControls() {
  const tc = D.clusters.reduce((o, c) => { if (c.t != null) o[c.t] = (o[c.t] || 0) + 1; return o; }, {});
  $('nc-topic').innerHTML = '<option value="">All topics</option>' + Object.entries(tc).sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `<option value="${t}">${t}: ${D.topics[t]} (${n})</option>`).join('');
  $('nc-country').innerHTML = '<option value="">Any country</option>' + Object.entries(D.countries).sort((a, b) => a[1].localeCompare(b[1]))
    .map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  const years = [...new Set(D.clusters.map(c => c.start.slice(0, 4)))].sort();
  $('nc-from').innerHTML = '<option value="">Earliest</option>' + years.map(y => `<option>${y}</option>`).join('');
  $('nc-to').innerHTML = '<option value="">Latest</option>' + years.map(y => `<option>${y}</option>`).join('');
  const m = D.meta;
  document.querySelectorAll('[data-meta]').forEach(e => {
    const v = { clusters: m.clusters.toLocaleString(), edges: m.edges.toLocaleString(), passages: m.passages_compared.toLocaleString(),
      threshold: m.threshold, window: m.window_days, generated: m.generated.slice(0, 10), topics: m.topics_version }[e.dataset.meta];
    if (v != null) e.textContent = v;
  });
}

async function main() {
  net = createNetwork($('nc-svg'), $('nc-tip'), { onPair: pickPair, onCountry: pickCountry });
  try { D = await loadData(); } catch (e) {
    $('nc-loading').textContent = `Could not load the data (${e.message}).`; return;
  }
  document.body.classList.remove('loading');
  $('nc-loading').hidden = true;
  fillControls(); bind(); syncControls();
  setUntil(-1);
  renderCoverage($('nc-coverage'), D);
}
main();
