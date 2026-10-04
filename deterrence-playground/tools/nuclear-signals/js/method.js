// Method & sources view: data inventory, corpus measures, coding rules, gaps, citation and every source.
import { ITEMS, COUNTS, BUILT, ORIGIN, esc } from './common.js';
import { DYAD_RULES, RUNG_RULES, PLACEMENT, DYADS } from './rules.js';
import { RHET } from '../data/rhetoric.js';
import { RUNGS, KAHN_SRC } from '../data/ladder.js';

const WHAT = {
  rns: 'Russian nuclear statements, doctrine, drills, deployments, treaty moves and combat use of dual-capable missiles, Feb. 2022 to Oct. 2026, with Western responses and battlefield moments. Each item was checked against its sources when that tool was built (Sept. 29 to Oct. 2, 2026).',
  dp: 'Doctrine and declaratory-policy documents of all nine states, 1965 to 2026, with quotes verified word for word against saved source texts (Sept. 29, 2026).',
  tt: 'Treaty withdrawals, suspensions, revocations, expiries and extensions from depositary records and official statements. Suspensions of the CFE Treaty by states that are not nuclear-armed are left out.',
  nt: 'Every nuclear test, 1945 to 2017: SIPRI/FOA itemized list (machine-readable copy) and USGS for North Korea. Years with more than three tests by one state are shown as one mark.',
  ntm: 'Test-ban milestones (moratorium, PTBT, TTBT, PNET, CTBT).',
  nam: 'Arms-control treaty milestones (NPT, SALT I, INF, START).',
  k: 'Dated, coded steps of ten nuclear crises, Cuba 1962 to India and Pakistan 2025, each with sources.',
  cur: 'Missile tests, exercises, deployments, doctrine and arms-control events added for this tool. Each source was opened and checked on Oct. 3, 2026 (scripts/curated_events.json keeps the supporting passage).',
  cx: 'Official sentences from the rhetoric corpus with threat probability 0.5 or higher, at most four per state and month.',
};
const GAPS = [
  'The rhetoric corpus holds official statements from Russia, China, the United States, India and Pakistan (and Iran). It has nothing from the United Kingdom, France, Israel or North Korea, so those states have no rhetoric series.',
  'Corpus coverage is uneven: India is the Ministry of External Affairs only (no Ministry of Defence); Pakistan’s ISPR stream stops in July 2024; Chinese Defence Ministry Chinese-language texts start in 2026; state-media streams change sampling over time. Read levels with the denominator strip in mind.',
  'Missile tests and exercises after 2021 are complete only for Russia (Russia’s Nuclear Signals). For other states the tool shows a verified selection, not every launch. Routine U.S., Indian and Pakistani training launches are under-represented. Not included because no source could be verified: North Korean ICBM tests after Oct. 2024, North Korea\u2019s 2023 "tactical nuclear" reveals, China\u2019s Sept. 2025 parade, and most Agni-Prime, Agni-4 and K-4 tests. Several Pakistani tests cite news reports because ISPR\u2019s site blocks automated access.',
  'Nuclear test data end with North Korea’s 2017 test, the last one conducted.',
  'Israel has no dyad: it has no acknowledged nuclear adversary that is nuclear-armed, and no official nuclear signalling is on record in these datasets beyond its declaratory formula.',
  'Kahn’s ladder was built for a U.S.–Soviet confrontation. Its rungs fit regional dyads loosely, and the rules here force every item onto one ordinal scale. See the critiques in Kahn’s Escalation Ladder.',
];

export function renderMethod(root) {
  const hosts = new Map();
  for (const it of ITEMS) for (const [n, u] of it.src) {
    let h = ''; try { h = new URL(u).hostname.replace(/^www\./, ''); } catch { h = 'other'; }
    if (h === 'web.archive.org') { const m = u.match(/web\.archive\.org\/web\/[^/]+\/(?:https?:\/\/)?(?:www\.)?([^/]+)/); h = (m ? m[1] : h) + ' (via Wayback)'; }
    if (!hosts.has(h)) hosts.set(h, new Map());
    hosts.get(h).set(u, n);
  }
  const hostRows = [...hosts.entries()].sort((a, b) => b[1].size - a[1].size);
  const nUrl = hostRows.reduce((s, h) => s + h[1].size, 0);
  const m = RHET.meta, V = m.validation;
  const ctab = Object.entries(RHET.countries).map(([cc, c]) => {
    const docs = c.months.reduce((s, r) => s + r[1], 0), sw = c.months.reduce((s, r) => s + r[3], 0), sc = c.months.reduce((s, r) => s + r[5], 0);
    return `<tr><td>${esc(cc)}</td><td class="num">${docs.toLocaleString('en-US')}</td><td class="num">${sw.toLocaleString('en-US')}</td><td class="num">${sc.toLocaleString('en-US')}</td><td>${c.streams.map(s => `${esc(s.source)} (${esc(s.lang)}, ${esc(s.first.slice(0, 7))} to ${esc(s.last.slice(0, 7))})`).join('; ')}</td></tr>`;
  }).join('');
  root.innerHTML = `
  <div class="card prose">
    <h2>What this is</h2>
    <p>The Observatory puts nuclear signalling by the nine nuclear-armed states on one timeline: what officials say about nuclear weapons, the tests, drills and deployments that show capability, changes to doctrine, and steps in arms control. It reuses the sourced datasets behind eight other tools on this site, adds a set of events verified for this tool, and measures official nuclear rhetoric in a multilingual corpus. A rule-based coding places each pair of adversaries on Herman Kahn’s escalation ladder, with the evidence for each placement one click away.</p>
    <p>${ITEMS.length.toLocaleString('en-US')} items, built ${esc(BUILT)}. Every item cites at least one source; ${nUrl.toLocaleString('en-US')} distinct source links in all.</p>
    <h2 class="mt">Data</h2>
    <div class="tablewrap"><table><thead><tr><th>Origin</th><th class="num">Items</th><th>What it holds and how it was checked</th></tr></thead><tbody>
    ${Object.entries(COUNTS).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<tr><td>${ORIGIN[k].slug ? `<a href="../${ORIGIN[k].slug}/">${esc(ORIGIN[k].n)}</a>` : esc(ORIGIN[k].n)}</td><td class="num">${n}</td><td>${esc(WHAT[k] || '')}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="fine">Where two datasets record the same event (same day, category and acting state), the items are merged and their sources pooled. Arsenal figures in the dossier come from FAS via Our World in Data (Nuclear Arsenals); treaty status from UNODA and UN Treaty Collection depositary records (Treaty Tracker).</p>
    <h2 class="mt">Rhetoric measures</h2>
    <p>The corpus is Jonathan Walberg’s multi-country collection of official statements and state media, with a semantic layer that scores sentences for tone. An exporter (<code>rhetoric-corpus/scripts/export_nuclear_signals.py</code>) selects official documents from ${esc(m.start)} on, finds sentences about nuclear weapons with fixed patterns in English, Russian, Chinese and Persian (nuclear weapons, forces, deterrence, war, strikes, tests, threats, ICBMs and the like; civilian nuclear power and enrichment are counted separately as arms-control or programme sentences), skips reporters’ questions, and averages the tone model’s sentence scores by month. Semantic layer generated ${esc(m.semantic_generated || '')}; export built ${esc(m.built)}.</p>
    <div class="tablewrap"><table><thead><tr><th>Country</th><th class="num">Official docs</th><th class="num">Nuclear-weapons sentences</th><th class="num">Scored</th><th>Streams</th></tr></thead><tbody>${ctab}</tbody></table></div>
    <p><b>Tone.</b> Threat, escalation and hostility are probabilities from logistic classifiers on multilingual-e5 sentence embeddings, trained on a zero-shot NLI teacher. Held-out agreement with the teacher (not with human coders): threat AUC ${V.threat.auc.toFixed(2)}, kappa ${V.threat.kappa.toFixed(2)}; escalation AUC ${V.escalation.auc.toFixed(2)}, kappa ${V.escalation.kappa.toFixed(2)} (n = ${V.threat.n.toLocaleString('en-US')}). The model scores what a sentence talks about, so a U.S. sentence that reports a North Korean threat, or a Chinese no-first-use reassurance, can score high. Read the sentences, not just the line.</p>
    <p><b>Coverage of scoring.</b> The semantic layer scores the first 80 sentences of each document and any later sentence that names a target state, so a nuclear sentence deep in a long transcript may be counted but not scored. The month z-score compares the month’s mean threat with the mean of its previous 12 months that had at least 10 scored sentences: (mean − base) / √(sd<sub>base</sub>² + se²).</p>
    <p><b>Text.</b> Official sentences are shown as quoted, at most 300 characters, with a link to the source; non-English sentences are shown in the original. From state media only headlines and links are shown.</p>
    <h2 class="mt">Coding rules</h2>
    <p>Rung names are Kahn’s (${esc(KAHN_SRC.cite)}). Which item counts for which dyad, and at which rung, follows these rules. They are this tool’s coding: written down so that anyone can check and dispute each placement.</p>
    <h3>Which dyad an item belongs to</h3><ul class="src">${DYAD_RULES.map(r => `<li><b>${r.id}.</b> ${esc(r.text)}</li>`).join('')}</ul>
    <h3>Which rung</h3><div class="tablewrap"><table><thead><tr><th>Rule</th><th>Rung</th><th>Applies to</th></tr></thead><tbody>${RUNG_RULES.map(r => `<tr><td>${r.id}</td><td>${r.rung ? `${r.rung}: ${esc(RUNGS[r.rung])}` : esc(r.label)}</td><td>${esc(r.text)}</td></tr>`).join('')}</tbody></table></div>
    <h3>Placement</h3><ul class="src">${PLACEMENT.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    <h3>Dyads</h3><ul class="src">${DYADS.map(d => `<li><b>${esc(d.name)}.</b> ${esc(d.note || '')}</li>`).join('')}</ul>
    <h2 class="mt">Gaps and limits</h2><ul class="src">${GAPS.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
    <p>The tool does not estimate the probability of nuclear use, and a higher rung is not a forecast. Absence of an item means no dataset here records it, not that nothing happened.</p>
    <h2 class="mt">How to cite</h2>
    <p class="cite">Jonathan Walberg, “Nuclear Signals Observatory,” Interactive Deterrence, jwalberg.com, data built ${esc(BUILT)}. Cite the item’s own source for any fact; cite this tool for the coding and the rhetoric measures.</p>
  </div>
  <div class="card prose"><h2>Sources (${nUrl.toLocaleString('en-US')} links, ${hostRows.length} publishers)</h2>
    ${hostRows.map(([h, urls]) => `<details><summary>${esc(h)} <span class="fine">(${urls.size})</span></summary><ul class="src">${[...urls.entries()].map(([u, n]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(n || u)}</a></li>`).join('')}</ul></details>`).join('')}
  </div>`;
}
