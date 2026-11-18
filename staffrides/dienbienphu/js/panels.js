// Side-panel renderers for each mode.
import { esc, fmtDate, fmtNum, srcInline, sourcesBlock, confBadge, sideName, addDays, srcText } from './util.js';
import { barChart, stepChart, stepAt } from './charts.js';
import { RANGE } from './timeline.js';

export const AIR_CATS = [
  // categorical slots 1-4, validated (validate_palette.js) on #fbf8f1 light and #1a1714 dark
  { key: 'artillery_ammo', label: 'Artillery ammo', color: 'var(--c1)' },
  { key: 'infantry_ammo', label: 'Infantry ammo', color: 'var(--c2)' },
  { key: 'food', label: 'Rations', color: 'var(--c3)' },
  { key: 'other', label: 'Other', color: 'var(--c4)' },
];

const phaseAt = (D, d) => D.meta.phases.find((p) => p.start <= d && d <= p.end);

// ---------------------------------------------------------------- staff ride
export function renderStand(el, D, i, ctx) {
  const s = D.stands[i];
  const quotes = (s.quotes || []).map((id) => D.quoteIndex[id]).filter(Boolean);
  const obs = (s.observers || []).map((id) => D.viewsheds?.observers?.find((o) => o.id === id)).filter(Boolean);
  el.innerHTML = `
    <div class="stand-nav">
      <button data-go="${i - 1}" ${i === 0 ? 'disabled' : ''} aria-label="Previous stand">←</button>
      <div class="stand-dots">${D.stands.map((x, j) => `<button class="${x.side}" data-go="${j}" aria-current="${j === i}" title="${esc(x.title)}">${j + 1}</button>`).join('')}</div>
      <button data-go="${i + 1}" ${i === D.stands.length - 1 ? 'disabled' : ''} aria-label="Next stand">→</button>
    </div>
    <p class="eyebrow">Stand ${i + 1} of ${D.stands.length} · ${s.dateLabel ? esc(s.dateLabel) : fmtDate(s.date)} <span class="badge ${s.side}">${esc(sideName[s.side] || s.side)}</span></p>
    <h2>${esc(s.title)}</h2>
    <p class="eyebrow" style="text-transform:none;letter-spacing:0">Decision-maker: <b style="color:var(--ink)">${esc(s.maker)}</b>${s.placeName ? ` · ${esc(s.placeName)}` : ''}</p>
    <div class="situation"><p style="margin:0">${esc(s.situation)}</p></div>
    ${obs.length ? `<div class="btn-row">${obs.map((o) => `<button class="btn ghost" data-vs="${o.id}">Line of sight from ${esc(o.label)}</button>`).join('')}<button class="btn ghost" data-3d>View in 3D</button></div>` : `<div class="btn-row"><button class="btn ghost" data-3d>View in 3D</button></div>`}
    <h3>Your call: what would you do?</h3>
    <div class="options">${s.options.map((o, k) => `<button class="option" data-opt="${k}" aria-pressed="false">${esc(o.text)}${o.src?.length ? srcInline(o.src) : ''}</button>`).join('')}</div>
    <div class="btn-row"><button class="btn" data-reveal>Show what happened</button></div>
    <div class="reveal" hidden>
      <h3 style="margin-top:4px">What was decided</h3><p>${esc(s.decided)}</p>
      ${s.why ? `<h3>Why</h3><p>${esc(s.why)}</p>` : ''}
      ${s.outcome ? `<h3>Outcome</h3><p>${esc(s.outcome)}</p>` : ''}
      ${quotes.length ? `<h3>In their words</h3>${quotes.map(quoteHtml).join('')}` : ''}
      ${obs.length ? `<h3>What the ground shows</h3>${obs.map((o) => `<p>${esc(o.finding || '')}</p>`).join('')}` : ''}
    </div>
    ${s.questions?.length ? `<h3>Discussion</h3><ol class="qs">${s.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>` : ''}
    ${sourcesBlock(s.src)}`;
  el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => ctx.goStand(Number(b.dataset.go))));
  el.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => {
    el.querySelectorAll('[data-opt]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  }));
  el.querySelector('[data-reveal]').addEventListener('click', (e) => {
    el.querySelector('.reveal').hidden = false; e.target.remove();
  });
  el.querySelectorAll('[data-vs]').forEach((b) => b.addEventListener('click', () => ctx.viewshed(b.dataset.vs, s)));
  el.querySelector('[data-3d]')?.addEventListener('click', () => ctx.to3d(s));
  el.scrollTop = 0;
}

function quoteHtml(q) {
  return `<blockquote class="quote">“${esc(q.text)}”<footer>${esc(q.who)}${q.role ? `, ${esc(q.role)}` : ''}, ${q.dateLabel ? esc(q.dateLabel) : fmtDate(q.d)}${q.note ? ` · ${esc(q.note)}` : ''}<br>${(q.src || []).map(srcText).join('; ')}</footer></blockquote>`;
}

// ---------------------------------------------------------------- explore
export function renderExplore(el, D, d, ctx) {
  const ph = phaseAt(D, d);
  const fr = D.places.filter((p) => p.kind === 'strongpoint');
  const lostP = fr.filter((p) => p.lost && p.lost <= d);
  const g = stepAt((D.series.garrison || []).filter((x) => x.whole), d);
  const guns = stepAt(D.series.frGuns || [], d);
  const air = D.series.airdrop?.rows || [];
  const cum = air.filter((r) => r.d <= d).reduce((a, r) => a + r.total, 0);
  const near = D.events.filter((e) => Math.abs(daysDiff(e.d, d)) <= 3).sort((a, b) => (a.d + (a.t || '')).localeCompare(b.d + (b.t || '')));
  const dip = D.diplomacy.filter((e) => Math.abs(daysDiff(e.d, d)) <= 6);
  const wx = D.weather.filter((e) => e.d && Math.abs(daysDiff(e.d, d)) <= 3);
  const qs = D.quotes.filter((q) => !q.dateLabel && Math.abs(daysDiff(q.d, d)) <= 2);
  el.innerHTML = `
    <p class="eyebrow">${ph ? esc(ph.long || ph.name) : ''}</p>
    <h2>${fmtDate(d)}</h2>
    <div class="stats">
      <div class="stat"><div class="v">${fr.length - lostP.length}/${fr.length}</div><div class="l">strongpoints still held</div></div>
      <div class="stat"><div class="v">${g ? (g.approx ? '~' : '') + fmtNum(g.v) : '–'}</div><div class="l">French Union${g ? `, ${esc(g.label)}, ${fmtDate(g.d, { short: true })}` : ''}</div></div>
      <div class="stat"><div class="v">${guns ? fmtNum(guns.v) : '–'}</div><div class="l">French guns, heavy mortars and tanks in action${guns ? `, ${fmtDate(guns.d, { short: true })}` : ''}</div></div>
      <div class="stat"><div class="v">${d >= RANGE.SIEGE ? fmtNum(Math.round(cum)) + ' t' : '–'}</div><div class="l">airdropped since 14 Mar${D.series.airdrop?.printedTotal ? ` (siege total ${fmtNum(D.series.airdrop.printedTotal)} t)` : ''}</div></div>
    </div>
    ${lostP.length ? `<p class="src">Lost by this date: ${lostP.map((p) => esc(p.label || p.name)).join(', ')}</p>` : ''}
    <h3>Around this date</h3>
    <ul class="feed">${near.length ? near.map((e) => `<li data-d="${e.d}" class="${e.d === d ? 'now' : ''}"><span class="when">${fmtDate(e.d, { short: true })}${e.t ? `<br>${esc(e.t)}` : ''}</span>
      <span><span class="badge ${e.side}">${esc(e.side)}</span> ${e.unit ? `<span class="unit">${esc(e.unit)}</span> ` : ''}${esc(e.text)} ${confBadge(e.conf)}<br>${srcInline(e.src)}</span></li>`).join('') : '<li><span></span><span class="src">No dated events within three days.</span></li>'}</ul>
    ${wx.length ? `<h3>Weather</h3><ul class="feed">${wx.map((e) => `<li data-d="${e.d}"><span class="when">${fmtDate(e.d, { short: true })}</span><span>${esc(e.text)}${e.effect ? ` <i>(${esc(e.effect)})</i>` : ''}<br>${srcInline(e.src)}</span></li>`).join('')}</ul>` : ''}
    ${dip.length ? `<h3>Diplomatic clock</h3><ul class="feed">${dip.map((e) => `<li data-d="${e.d}"><span class="when">${fmtDate(e.d, { short: true })}</span><span>${esc(e.text)}${e.why ? `<br><i>${esc(e.why)}</i>` : ''}<br>${srcInline(e.src)}</span></li>`).join('')}</ul>` : ''}
    ${qs.length ? `<h3>Voices</h3>${qs.map(quoteHtml).join('')}` : ''}
    <h3>The numbers</h3>
    <div id="c-air"></div><div id="c-guns"></div><div id="c-garr"></div>`;
  el.querySelectorAll('.feed li[data-d]').forEach((li) => li.addEventListener('click', () => ctx.setDate(li.dataset.d)));
  const dom = [RANGE.SIEGE, RANGE.END];
  if (air.length) barChart(el.querySelector('#c-air'), {
    title: 'Supplies parachuted per day', sub: `metric tons · ${legendHtml(AIR_CATS)}`, rows: air, cats: AIR_CATS, cursor: d, domain: dom, unit: 't', onPick: ctx.setDate,
  });
  if (D.series.frGuns?.length) stepChart(el.querySelector('#c-guns'), { title: 'French heavy weapons in action', sub: '105 mm and 155 mm guns, 120 mm mortars, M24 tanks', points: D.series.frGuns, cursor: d, domain: dom, color: 'var(--fr)' });
  if (D.series.garrison?.length) el.querySelector('#c-garr').innerHTML = `<div class="ttl" style="font-size:.82rem;font-weight:600">French Union strength counts</div>
    <p class="src">The sources count different things on different days, so these are listed, not joined into a line.</p>
    <dl class="kv">${D.series.garrison.map((x) => `<dt>${fmtDate(x.d)}</dt><dd>${x.approx ? '~' : ''}${fmtNum(x.v)} <span class="src">${esc(x.label)}</span></dd>`).join('')}</dl>`;
  el.insertAdjacentHTML('beforeend', sourcesBlock(D.series.sources, 'Sources for the numbers'));
}

function legendHtml(cats) {
  return cats.map((c) => `<span style="white-space:nowrap"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${c.color};margin:0 3px 0 6px;vertical-align:-1px"></span>${esc(c.label)}</span>`).join('');
}
const daysDiff = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);

// ---------------------------------------------------------------- logistics
export function renderLogistics(el, D, d, ctx) {
  const L = D.logistics;
  el.innerHTML = `
    <p class="eyebrow">Logistics</p>
    <h2>Two supply lines</h2>
    <p>The Viet Minh moved food and shells to the valley mainly by truck, at night, with boats, rafts, bicycles and porters as secondary means. The French supplied the camp by air from Hanoi, about ${L.flightKm ? fmtNum(L.flightKm) : '300'} km away. The red lines on the map are the Viet Minh routes and the blue dashed line is the airlift.</p>
    <div class="stats">${(L.headline || []).map((f) => `<div class="stat"><div class="v">${esc(f.value)}</div><div class="l">${esc(f.label)}</div></div>`).join('')}</div>
    <h3>Viet Minh routes</h3>
    ${(L.routes || []).filter((r) => r.side !== 'FR').map((r) => `<div class="card"><h4>${esc(r.name)}</h4><p style="font-size:.85rem">${esc(r.desc || '')}</p>${srcInline(r.src)}</div>`).join('')}
    <h3>How it moved</h3>
    <dl class="kv">${(L.means || []).map((m) => `<dt>${esc(m.means)}</dt><dd>${esc(m.count ?? '')}${m.note ? ` <span class="src">${esc(m.note)}</span>` : ''}</dd>`).join('')}</dl>
    <h3>Chinese aid</h3>
    <dl class="kv">${(L.aid || []).map((m) => `<dt>${esc(m.item)}</dt><dd>${esc(m.value)} ${confBadge(m.conf)}</dd>`).join('')}</dl>
    <h3>The French airlift</h3>
    <div id="c-air2"></div>
    <dl class="kv">${(L.air || []).map((m) => `<dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd>`).join('')}</dl>
    ${sourcesBlock(L.sources)}`;
  const air = D.series.airdrop?.rows || [];
  if (air.length) barChart(el.querySelector('#c-air2'), {
    title: 'Tonnage parachuted per day, 14 Mar – 7 May', sub: legendHtml(AIR_CATS), rows: air, cats: AIR_CATS, cursor: d, domain: [RANGE.SIEGE, RANGE.END], unit: 't', onPick: ctx.setDate,
  });
}

// ---------------------------------------------------------------- what if
export function renderWhatIf(el, D, state, ctx) {
  el.innerHTML = `
    <p class="eyebrow">Counterfactuals</p>
    <h2>What if?</h2>
    <p>Each switch is a lever that historians and participants have argued about. Turning one on shows the range of recorded judgments and highlights the window on the timeline where it would have mattered. There is no model here and no predicted outcome: only what people who studied it, or were there, said.</p>
    ${D.cf.map((c) => `<div class="card">
      <label class="switch"><input type="checkbox" data-cf="${c.id}" ${state.cf.has(c.id) ? 'checked' : ''}> ${esc(c.lever)}</label>
      <div ${state.cf.has(c.id) ? '' : 'hidden'} data-body="${c.id}">
        <p style="font-size:.86rem;margin-top:8px">${esc(c.change)}</p>
        ${c.window ? `<p class="src">Window: ${fmtDate(c.window[0])} – ${fmtDate(c.window[1])}</p>` : ''}
        <h3 style="margin-top:10px">Recorded judgments (${c.judgments.length})</h3>
        <ul class="judg">${c.judgments.map((j) => `<li><b>${esc(j.who)}</b>: ${esc(j.j)}<br>${srcInline(j.src ? [j.src] : [])}</li>`).join('')}</ul>
        ${c.conf ? `<p class="src">Confidence: ${esc(c.conf)}</p>` : ''}
      </div></div>`).join('')}`;
  el.querySelectorAll('[data-cf]').forEach((cb) => cb.addEventListener('change', () => {
    const id = cb.dataset.cf;
    if (cb.checked) state.cf.add(id); else state.cf.delete(id);
    el.querySelector(`[data-body="${id}"]`).hidden = !cb.checked;
    ctx.cfChanged();
  }));
}

// ---------------------------------------------------------------- analysis
export function renderAnalysis(el, D, ctx) {
  const V = D.viewsheds || {};
  el.innerHTML = `
    <p class="eyebrow">Analysis</p>
    <h2>Hidden guns, open ground</h2>
    ${(V.findings || []).map((f) => `<div class="callout">${esc(f)}</div>`).join('')}
    <div class="btn-row">${(V.observers || []).map((o) => `<button class="btn ghost" data-vs="${o.id}">${esc(o.label)}</button>`).join('')}<button class="btn ghost" data-vs="">Hide</button></div>
    ${V.method ? `<p class="src">${esc(V.method)}</p>` : ''}
    <h3>A lens from the literature</h3>
    <p>These works frame why a side might hide its strength, and why an opponent might misread it. They are a lens on the battle, not a claim that the commanders thought in these terms.</p>
    ${D.theory.map((t) => `<div class="card"><h4>${esc(t.claim)}</h4><p style="font-size:.86rem"><b>At Dien Bien Phu:</b> ${esc(t.app)}</p><p class="src">${esc(t.cite)} ${t.url ? `<a href="${esc(t.url)}" target="_blank" rel="noopener">link</a>` : ''}</p></div>`).join('')}
    <h3>Where the sources disagree</h3>
    ${D.disagreements.map((x) => `<div class="card"><h4>${esc(x.topic)}</h4><ul class="judg">${x.positions.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`).join('')}
    ${D.contested.length ? `<h3>Famous lines we could not verify</h3>${D.contested.map((c) => `<div class="card"><h4>${esc(c.who)}: ${esc(c.claim)}</h4><p class="src">${esc(c.why)}</p></div>`).join('')}` : ''}`;
  el.querySelectorAll('[data-vs]').forEach((b) => b.addEventListener('click', () => ctx.viewshed(b.dataset.vs || null)));
}
