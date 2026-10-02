// Campaign screens (SPEC §1.4, §6.3, §6.7): choose your army's learning system, the briefing before each
// battle, the learning phase after battles 1–3 (pipeline board, actions, what you could see of the enemy's
// changes, and the live learning timeline L15), and the campaign review (outcomes, learned vs changed, the 2×2
// of doctrine pairings L14, the full timeline beside Hunzeker's three cases).
import { BATTLES, CARDS, ARCHETYPES, ARCHETYPE_IDS, LATITUDE, TRAINING, ACTIONS, SEASON_LABELS, LEARN, STATES, DOMAINS, STATE_PHASE } from '../../data/campaign.js';
import { assessLevel, mastery } from '../learning.js';
import { campaignScores } from '../campaign.js';
import { mountDiagram } from '../diagrams/index.js';
import { S, $, esc, pct, reduced } from './store.js';
import { infoBtn } from './tips.js';
import { masteryTip, testTip, fidelityTip, effectTip } from '../tips-text.js';

const byId = Object.fromEntries(CARDS.map(c => [c.id, c]));
const cardName = (id, era) => (era === 'm' && byId[id].modernName ? byId[id].modernName : byId[id].name);
const ASSESS_WORD = { none: 'No assessment cell', conduit: 'Conduit (forwards everything)', independent: 'Independent (tests and filters)' };
let diag = [];
const clearDiagrams = () => { for (const d of diag) d.destroy(); diag = []; };

/** L15 model from the learners' season rows: { AT: [[phase, from, to]], … }. */
function spans(tl) {
  const out = {};
  for (const D of DOMAINS) {
    const list = [];
    let cur = null;
    tl.forEach((row, i) => { const p = row[D.id]; if (p && cur && cur[0] === p) cur[2] = i + 1; else if (p) { cur = [p, i, i + 1]; list.push(cur); } else cur = null; });
    out[D.id] = list;
  }
  return out;
}
// During a learning phase the season in progress is not on the timeline yet: show where each domain stands now.
function live(L) {
  if (L.timeline.length >= 8 || !L.actionsLeft && !L.obs.length) return L.timeline;
  const row = {};
  for (const D of DOMAINS) for (const [id, c] of Object.entries(L.cards)) {
    const p = byId[id].domain === D.id && STATE_PHASE[c.st];
    if (p && (!row[D.id] || 'ESAM'.indexOf(p) > 'ESAM'.indexOf(row[D.id]))) row[D.id] = p;
  }
  return [...L.timeline, row];
}
const timelineModel = C => ({ campaign: { seasons: 8, labels: SEASON_LABELS, you: spans(live(C.me)), opp: spans(C.ai.timeline) } });

/** Choose the learning system (SPEC §1.4 step 1). onGo({ arch, custom }). */
export function setupScreen(ch, onGo, onBack) {
  const el = $('camp');
  el.hidden = false;
  const arch = ARCHETYPE_IDS.map(id => `<button type="button" class="dd-arch" data-arch="${id}" aria-pressed="${id === 'staff'}"><b>${ARCHETYPES[id].label}</b><span>${esc(ARCHETYPES[id].sig)}</span><small>${esc(ARCHETYPES[id].note)}.</small></button>`).join('');
  el.innerHTML = `<h2>Campaign: four battles on the Merrow front</h2>
    <p>You ${ch.side === 'def' ? 'defend' : 'attack'} in all four battles (your side is fixed for the campaign). After battles 1, 2 and 3 your army has a learning phase: it can learn only from what its units tried. Choose how it learns. The computer gets one of the other two systems.</p>
    <div class="dd-archs" role="group" aria-label="Learning system">${arch}<button type="button" class="dd-arch" data-arch="custom" aria-pressed="false"><b>Custom</b><span>Set the three dials yourself.</span></button></div>
    <div id="custom" hidden class="dd-custom">
      <label class="dd-lab">Command latitude <select id="c-lat">${[1, 2, 3, 4].map(i => `<option value="${i}" ${i === 3 ? 'selected' : ''}>${LATITUDE[i].label}</option>`).join('')}</select></label>
      <label class="dd-lab">Assessment <select id="c-assess"><option value="none">None</option><option value="conduit">Conduit</option><option value="independent" selected>Independent</option></select></label>
      <label class="dd-lab">Training <select id="c-train">${Object.entries(TRAINING).map(([k, v]) => `<option value="${k}" ${k === 'centralized' ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
      <p class="fine">Hunzeker: moderately decentralized command explores best (pp. 8, 28–29); an independent assessment staff filters lessons (pp. 10, 29–31); centralized training spreads them faithfully (pp. 31–33).</p></div>
    <div class="dd-gobar"><button type="button" class="btn" id="camp-back">Back</button><button type="button" class="btn solid" id="camp-go">To battle 1</button></div>`;
  let pick = 'staff';
  el.querySelectorAll('[data-arch]').forEach(b => b.addEventListener('click', () => {
    pick = b.dataset.arch;
    el.querySelectorAll('[data-arch]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('custom').hidden = pick !== 'custom';
  }));
  $('camp-back').onclick = onBack;
  $('camp-go').onclick = () => onGo(pick === 'custom' ? { arch: 'custom', custom: { lat: +$('c-lat').value, assess: $('c-assess').value, train: $('c-train').value } } : { arch: pick });
  $('camp-go').focus();
}

/** Briefing before battle k. */
export function briefing(C, ch, onPlan) {
  const el = $('camp'), B = BATTLES[C.battle];
  el.hidden = false;
  clearDiagrams();
  const done = C.results.map((r, i) => `<li class="${r.won ? 'good' : 'bad'}">${esc(BATTLES[i].name)}: ${r.won ? 'won' : 'lost'}</li>`).join('');
  el.innerHTML = `<p class="eyebrow">Campaign · battle ${C.battle + 1} of ${BATTLES.length}</p><h2>${esc(ch.era === 'm' ? B.modern : B.name)}</h2>
    <p>${esc(B.briefing)}</p><ul class="dd-beats">${B.beats.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
    ${done ? `<ol class="dd-moments">${done}</ol>` : ''}
    <p class="fine">Your army fights with the doctrine it has learned so far; untrained units fall back on the old methods.</p>
    <div class="dd-gobar"><button type="button" class="btn solid" id="camp-plan">${ch.side === 'def' ? 'Plan your defense' : 'Plan your attack'}</button></div>`;
  $('camp-plan').onclick = onPlan;
  $('camp-plan').focus();
}

function cardRow(C, id, era) {
  const L = C.me, c = L.cards[id], k = byId[id], lvl = assessLevel(L.dials.assess), st = c.st;
  const acts = [];
  const can = (kind, ok, label) => { if (ok) acts.push(`<button type="button" class="btn" data-act="${kind}" data-card="${id}" ${L.actionsLeft > 0 ? '' : 'disabled'}>${label}</button>`); };
  can('analyze', c.obs && (st === 'observed' || (st === 'candidate' && c.fresh)), 'Analyze');
  can('test', st === 'candidate' || st === 'tested', 'Test');
  can('codify', st === 'tested' || (lvl === 'conduit' && st === 'candidate'), 'Codify');
  can('train', st === 'codified', 'Train');
  can('study', L.enemyUsed.includes(id) && STATES.indexOf(st) < STATES.indexOf('codified'), 'Study enemy');
  can('redteam', STATES.indexOf(st) >= STATES.indexOf('candidate') && STATES.indexOf(st) <= STATES.indexOf('codified'), 'Red-team');
  const share = mastery(c);
  const est = c.est != null ? `estimate ${c.est >= 0 ? '+' : ''}${Math.round(c.est * 100)}%${c.sd ? ` ± ${Math.round(c.sd * 100)}` : ''}` : c.obs ? 'observed, not analyzed' : 'no evidence yet';
  const flags = [c.garbled && 'garbled', c.formOnly && 'form only', c.falseKnown && 'flagged as a false lesson', c.attr && `test blames ${c.attr}`].filter(Boolean);
  return `<div class="dd-card s-${st}"><b>${esc(cardName(id, era))}</b> <small>${esc(id)} · ${st}</small><p>${esc(k.text)}</p>
    <p class="fine">${esc(est)}${c.est != null ? infoBtn(effectTip({ est: c.est, sd: c.sd || 0, n: LEARN.testRollouts, from: c.tests ? 'test' : 'analysis' }), 'Estimated effect') : ''}${flags.length ? ` · ${esc(flags.join(', '))}` : ''}${st === 'training' || st === 'mastered' ? ` · trained ${pct(share)}${infoBtn(masteryTip({ share, card: cardName(id, era) }), 'Training share')}` : ''}</p>
    ${acts.length ? `<div class="dd-tools">${acts.join('')}</div>` : ''}</div>`;
}

/** The learning phase (SPEC §6.3). act(action) applies one; onEnd() closes the phase. */
export function learningScreen(C, ch, act, onEnd, note = '') {
  const el = $('camp'), L = C.me, lvl = assessLevel(L.dials.assess);
  el.hidden = false;
  clearDiagrams();
  const cols = ['observed', 'candidate', 'tested', 'codified', 'training', 'mastered'];
  const seen = C.seen[C.seen.length - 1] || [];
  const tip = testTip({ p: L.dials.assess.rigor ? LEARN.attribution.rigor : LEARN.attribution.plain, rigor: L.dials.assess.rigor });
  const fid = fidelityTip({ p: LEARN.study.base + LEARN.study.rigor * (L.dials.assess.rigor ? 1 : 0) + LEARN.study.captured * (L.captured ? 1 : 0) });
  el.innerHTML = `<p class="eyebrow">Learning phase ${L.phase} · after ${esc(BATTLES[C.battle].name)}</p>
    <h2>What did your army learn?</h2>
    ${note ? `<p class="dd-note">${note}</p>` : ''}
    <p class="dd-dials">Command: <b>${LATITUDE[L.dials.lat].label}</b> · Assessment: <b>${ASSESS_WORD[lvl]}</b> · Training: <b>${TRAINING[L.dials.train].label}</b> · Actions left: <b class="num">${L.actionsLeft}</b></p>
    <p class="fine">Observations this phase: ${L.obs.length ? L.obs.map(o => esc(cardName(o.card, ch.era))).join(', ') : 'none surfaced'}. Tests ${infoBtn(tip, 'Test accuracy')} · copying the enemy ${infoBtn(fid, 'Fidelity')}</p>
    <div class="dd-board-l">${cols.map(st => `<div class="dd-pcol"><p class="eyebrow">${st}</p>${Object.keys(L.cards).filter(id => L.cards[id].st === st).map(id => cardRow(C, id, ch.era)).join('') || '<p class="fine">—</p>'}</div>`).join('')}</div>
    <details class="dd-more"><summary>Cards not yet observed (${Object.values(L.cards).filter(c => c.st === 'unknown').length})</summary>${Object.keys(L.cards).filter(id => L.cards[id].st === 'unknown').map(id => cardRow(C, id, ch.era)).join('')}</details>
    <div class="dd-tools"><button type="button" class="btn" data-act="staffForward" ${L.actionsLeft ? '' : 'disabled'}>${ACTIONS.staffForward.label}</button>
      <button type="button" class="btn" data-act="pullBattalion" ${L.actionsLeft ? '' : 'disabled'}>${ACTIONS.pullBattalion.label}</button>
      <button type="button" class="btn" data-dial="lat" data-dir="1" ${L.actionsLeft ? '' : 'disabled'}>More latitude</button><button type="button" class="btn" data-dial="lat" data-dir="-1" ${L.actionsLeft ? '' : 'disabled'}>Less latitude</button>
      <button type="button" class="btn" data-dial="train" data-dir="1" ${L.actionsLeft ? '' : 'disabled'}>Centralize training</button>
      <button type="button" class="btn" data-dial="rigor" data-dir="${L.dials.assess.rigor ? -1 : 1}" ${L.actionsLeft ? '' : 'disabled'}>${L.dials.assess.rigor ? 'Drop' : 'Add'} rigor</button></div>
    <p class="eyebrow">What you could see of the enemy’s changes</p>
    <ul class="dd-beats">${seen.length ? seen.map(s => `<li>${esc(s[0].toUpperCase() + s.slice(1))}.</li>`).join('') : '<li>Nothing you could see changed.</li>'}</ul>
    <p class="eyebrow">Learning timeline (L15)</p><div class="dd-dg" id="camp-l15"></div>
    <div class="dd-gobar"><button type="button" class="btn solid" id="camp-end">End the learning phase: to battle ${C.battle + 2}</button></div>`;
  diag.push(mountDiagram('L15', $('camp-l15'), { model: timelineModel(C), reduced: reduced() }));
  el.onclick = e => {
    const a = e.target.closest('[data-act]'), d = e.target.closest('[data-dial]');
    if (a && !a.disabled) act(a.dataset.card ? { kind: a.dataset.act, card: a.dataset.card } : { kind: a.dataset.act });
    else if (d && !d.disabled) act({ kind: 'dial', dial: d.dataset.dial, dir: +d.dataset.dir });
    else if (e.target.closest('#camp-end')) onEnd();
  };
}

/** Words for an action's result. */
export function resultText(action, r, era) {
  if (!r.ok) return esc(r.why);
  const n = action.card ? esc(cardName(action.card, era)) : '';
  switch (action.kind) {
    case 'analyze': return `Analyzed ${n}: estimated effect ${Math.round(r.est * 100)}% ± ${Math.round(r.sd * 100)}${infoBtn(effectTip({ est: r.est, sd: r.sd }), 'Estimated effect')}.${r.falseKnown ? ' Your staff flags it as a false lesson.' : ''}`;
    case 'test': return `Experimental unit trained in ${n}: effect ${Math.round(r.eff * 100)}% ± ${Math.round(r.sd * 100)}${infoBtn(effectTip({ est: r.eff, sd: r.sd, n: r.rollouts || LEARN.testRollouts, from: 'test' }), 'Measured effect')} over ${r.rollouts || LEARN.testRollouts} trials; the staff puts the result down to ${r.attribution}. One company misses the next battle.`;
    case 'codify': return `${n} codified${r.garbled ? ', but garbled in the writing (half effect)' : ''}. Train it to spread it.`;
    case 'train': return `${n}: the schools are teaching it; it trains every season until mastered.`;
    case 'study': return `Copied the enemy’s ${n}${r.full ? ' faithfully' : ': you got the form without the rules (half effect)'}.`;
    case 'redteam': return `Red-team memo on ${n}${r.falseKnown ? ': it is a false lesson' : ': no hidden flaw found'}.`;
    case 'staffForward': return `Staff officers went forward: honest reports this phase${r.casualty ? '; one was lost (one fewer action next phase)' : ''}.`;
    case 'pullBattalion': return 'A battalion came off the line to train in everything codified; it misses the next battle.';
    default: return 'Done.';
  }
}

/** The campaign review (SPEC §1.4 step 4, §6.7). prof: [{ a: 'M'|'N', d: 'M'|'N' }] per battle. */
export function reviewScreen(C, ch, prof, onNew) {
  const el = $('camp'), sc = campaignScores(C);
  el.hidden = false;
  clearDiagrams();
  const nm = ids => (ids.length ? ids.map(id => esc(cardName(id, ch.era))).join(', ') : 'none');
  el.innerHTML = `<p class="eyebrow">Campaign review</p><h2>You won ${sc.me.wins} of ${C.results.length} battles</h2>
    <div class="tablewrap"><table><thead><tr><th>Battle</th><th>Result</th><th>Exchange (enemy lost : you lost)</th></tr></thead><tbody>
    ${C.results.map((r, i) => `<tr><td>${esc(ch.era === 'm' ? BATTLES[i].modern : BATTLES[i].name)}</td><td>${r.won ? 'Won' : 'Lost'}</td><td>${r.exchange != null ? (+r.exchange).toFixed(2) : '—'}</td></tr>`).join('')}</tbody></table></div>
    <p><b>Learned</b> (codified, mastered, true and faithful): ${nm(sc.me.learned)}. <b>Changed</b> (anything adopted): ${nm(sc.me.changed)}${sc.me.falseAdopted.length ? `, including the false lesson ${nm(sc.me.falseAdopted)}` : ''}.</p>
    <p>The opponent learned ${nm(sc.ai.learned)}; it changed ${nm(sc.ai.changed)}.</p>
    <p class="fine">Hunzeker: “learning sets a higher bar than change” (p. 36). A well-run learning system can still lose battles: the army that learned fastest in his study lost the war (pp. 65–66, 173–174).</p>
    <p class="eyebrow">Your battles on Biddle’s 2 × 2 (L14)</p><div class="dd-dg" id="camp-l14"></div>
    <p class="eyebrow">Learning timeline (L15): switch to “Hunzeker’s three cases” to compare</p><div class="dd-dg" id="camp-l15"></div>
    <div class="dd-gobar"><button type="button" class="btn solid" id="camp-new">New game</button></div>`;
  diag.push(mountDiagram('L14', $('camp-l14'), { model: { battles: prof.map((p, i) => ({ ...p, label: `B${i + 1}` })) }, reduced: reduced() }));
  diag.push(mountDiagram('L15', $('camp-l15'), { model: timelineModel(C), reduced: reduced() }));
  $('camp-new').onclick = onNew;
}

export function hideCamp() { clearDiagrams(); $('camp').hidden = true; $('camp').innerHTML = ''; $('camp').onclick = null; }
