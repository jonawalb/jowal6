// The monthly decision panel for either side, and the live readout of how close the choice comes to a threshold.
import { LEVELS, METHODS, C_MSGS, P_MSGS, R_VALUES, R_PRIOR, T_VALUES, T_PRIOR } from '../data/params.js';
import { M, baseE, deliveryOdds, encounters, provocation, tAdj } from './engine.js';
import { pIntervene, pSpike } from './belief.js';
import { isAnswer, isNormal, unanswered } from './normal.js';
import { NORM, SMASH } from '../data/params.js';
import { canSmash, estimate, estimateDrivers } from './smash.js';
import { paintBelief, levelLabel, COL } from './view.js';

const $ = id => document.getElementById(id);
const pct = v => `${Math.round(v * 100)}%`;
export const emptyChoice = (side, s) => (side === 'c' ? { method: 'civ', msg: 'quiet', push: false } : { level: s.lastLevel, msg: 'quiet', hold: false, detain: false });
const radio = (name, value, checked, inner, cls = '') => `<label class="sl-opt ${cls} ${checked ? 'on' : ''}"><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}>${inner}</label>`;

/** What the player expects the other side to do, for the odds shown while choosing. */
const lastMethod = s => s.history[s.turn - 1]?.c.method || 'civ';

export function paintDecide(g) {
  const s = g.s, ch = g.choice, box = $('decide-body');
  if (g.side === 'c') {
    const L = s.lastLevel;
    box.innerHTML = `<fieldset><legend>Resupply <span class="muted">odds if the Power repeats “${LEVELS[L].label.toLowerCase()}”</span></legend>${METHODS.map(m => {
      const used = m.id === 'patron' && s.patronLeft <= 0;
      const o = m.cargo ? deliveryOdds(s, { ...ch, method: m.id }, { level: L, hold: true }) : 0;
      return radio('method', m.id, ch.method === m.id, `<span><b>${m.label}</b>${m.id === 'patron' ? ` <span class="muted">(${s.patronLeft} left)</span>` : ''}<small>${m.text}</small></span><span class="sl-odds num">${m.cargo ? `${pct(o)} · ${m.cargo} mo` : '–'}<small>provokes +${m.prov}</small></span>`, used ? 'off' : '');
    }).join('')}</fieldset>
    <fieldset><legend>Messaging</legend><div class="sl-row3">${C_MSGS.map(m => radio('cmsg', m.id, ch.msg === m.id, `<span><b>${m.label}</b><small>${m.text} +${m.prov}</small></span>`)).join('')}</div></fieldset>
    <label class="sl-check"><input type="checkbox" id="push" ${ch.push ? 'checked' : ''} ${M[ch.method].sea ? '' : 'disabled'}><span><b>If blocked, push through.</b> Better odds, +1 provocation, and a collision if their cutter holds course.</span></label>`;
    box.querySelectorAll('input[name=method]').forEach(i => { if (i.closest('.off')) i.disabled = true; });
  } else {
    const lm = lastMethod(s);
    box.innerHTML = `<fieldset><legend>Interdiction <span class="muted">against a ${M[lm].label.toLowerCase()} like last month</span></legend>${LEVELS.map((lv, i) => {
      const deny = M[lm].cargo * (deliveryOdds(s, { method: lm, push: false }, { level: 0 }) - deliveryOdds(s, { method: lm, push: false }, { level: i }));
      const pi = pIntervene(s.bR, baseE(s, i, lm)), pio = pIntervene(s.bR, baseE(s, i, 'patron'));
      const tag = i >= 1 && i <= 4 ? (isNormal(s, i) ? ' <em class="sl-n">normal</em>' : unanswered(s, i) === NORM.need - 1 ? ' <em class="sl-n tip">1 from normal</em>' : '') : '';
      return radio('level', i, ch.level === i, `<span><b><i class="num">${i}</i> ${lv.label}</b>${tag}<small>${lv.text}</small></span><span class="sl-odds num">−${deny.toFixed(1)} mo<small>Patron acts ${pct(pi)}${pio > pi + 0.01 ? ` · ${pct(pio)} with observers` : ''}</small></span>`, pi >= 0.3 ? 'hot' : '');
    }).join('')}</fieldset>
    <fieldset><legend>Messaging</legend><div class="sl-row3">${P_MSGS.map(m => radio('pmsg', m.id, ch.msg === m.id, `<span><b>${m.label}</b><small>${m.text}</small></span>`)).join('')}</div></fieldset>
    <label class="sl-check"><input type="checkbox" id="hold" ${ch.hold ? 'checked' : ''}><span><b>If they push through, hold course.</b> Halves their gain, risks a collision.</span></label>
    <label class="sl-check"><input type="checkbox" id="detain" ${ch.detain ? 'checked' : ''} ${ch.level === 4 ? '' : 'disabled'}><span><b>Detain crews you board.</b> Pleases home; the Patron counts it as a rung higher.</span></label>`;
  }
  paintSmash(g);
  paintReadout(g);
}

/** The belief charts and the one-line read of how close this choice comes. */
export function paintReadout(g) {
  const s = g.s, ch = g.choice;
  const rLabels = R_VALUES.map(levelLabel);
  if (g.side === 'p') {
    const lm = lastMethod(s), E = baseE(s, ch.level, lm);
    paintBelief($('belief-a'), { prior: R_PRIOR, post: s.bR, labels: rLabels, mark: E > 0 ? E - 1 : 0, color: COL.a });
    $('belief-a-t').textContent = 'Where is the Patron’s red line?';
    $('belief-a-x').innerHTML = `Bars: your belief about the lowest rung at which the Patron intervenes (dashed: where you started). The marker is what the Patron would see from your choice: everything left of it is a line you would cross. <b>Chance it intervenes: ${pct(pIntervene(s.bR, E))}.</b>`;
    $('belief-b-wrap').hidden = true;
    $('answer-x').innerHTML = '';
  } else {
    const enc = encounters(s.lastLevel, ch.method), Pv = provocation(ch, enc);
    paintBelief($('belief-a'), { prior: T_PRIOR, post: s.bT, labels: T_VALUES.map(String), mark: Pv - 1, color: COL.p });
    $('belief-a-t').textContent = 'How much will the Power take?';
    const tipping = NORM.rungs.filter(r => !isNormal(s, r) && unanswered(s, r) === NORM.need - 1).map(r => LEVELS[r].label.toLowerCase());
    const ans = isAnswer(ch, Math.max(1, s.lastLevel), true);
    $('answer-x').innerHTML = `${ans ? '<b>This answers the Power</b> if it meets you (+2 escalation risk, angers the Power).' : '<b>This does not answer the Power.</b> If it uses a gray-zone rung on you, that counts toward making it normal.'}${tipping.length ? ` One more unanswered use makes <b>${tipping.join(', ')}</b> normal.` : ''}`;
    $('belief-a-x').innerHTML = `Bars: your belief about the provocation level at which the Power snaps and jumps two rungs the next month. This choice provokes <b>${Pv}</b>${tAdj(s) ? ' (its home pressure is high: it snaps a rung sooner)' : ''}. <b>Chance it snaps: ${pct(pSpike(s.bT, Pv, tAdj(s)))}.</b>`;
    $('belief-b-wrap').hidden = false;
    paintBelief($('belief-b'), { prior: R_PRIOR, post: s.bR, labels: rLabels, color: COL.a });
  }
}

/** Smash the red line: the estimate from the player's own belief, the drivers, and a two-step confirm. */
function paintSmash(g) {
  const s = g.s, box = $('smash-box'), me = g.side, pct2 = v => `${Math.round(v * 100)}%`;
  if (!canSmash(s)) { box.innerHTML = `<h3>Smash the red line</h3><p class="fine">Available from ${['January', 'February', 'March'][SMASH.from]}: the Patron’s line has to be probed first.</p>`; return; }
  const est = estimate(s, me), win = me === 'c' ? est : 1 - est;
  const what = me === 'c' ? 'Send a massive publicized resupply with Patron observers, push through any block and formally invoke the treaty. You win at once if the Patron comes; if it stays out, the garrison is forced out and you lose.'
    : 'Seize the outpost and detain the garrison under a cordon. You win at once if the Patron stays out; if it steps in, you lose.';
  const drv = estimateDrivers(s, me).map(([k, v]) => `<li><span>${k}</span><b class="num ${(me === 'c') === (v >= 0) ? 'up' : 'down'}">${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}</b></li>`).join('');
  box.innerHTML = `<h3>Smash the red line</h3><p class="fine">${what} Once a game; it ends the game this month.</p>
    <p>Your estimate that the Patron steps in: <b class="num">${pct2(est)}</b>, so your chance of winning: <b class="num">${pct2(win)}</b>.</p>
    <details><summary>What drives it (log-odds at the line you believe; + pushes toward stepping in; green helps you)</summary><ul class="sl-drv">${drv}</ul><p class="fine">Estimated from your belief about the Patron’s line, not its true position.</p></details>
    ${g.smashArmed ? `<p class="sl-confirm" role="alert"><b>This ends the game this month.</b> Smash the red line?</p><button type="button" class="btn solid" id="smash-go">Yes, smash it</button> <button type="button" class="btn" id="smash-cancel">Cancel</button>`
      : `<button type="button" class="btn" id="smash-arm">Smash the red line…</button>`}`;
}

export function wireDecide(g, onChange) {
  $('smash-box').addEventListener('click', e => {
    const id = e.target.id;
    if (id === 'smash-arm') { g().smashArmed = true; paintSmash(g()); $('smash-go').focus(); }
    else if (id === 'smash-cancel') { g().smashArmed = false; paintSmash(g()); $('smash-arm').focus(); }
    else if (id === 'smash-go') { g().smashArmed = false; g().choice.smash = true; $('end-turn').click(); }
  });
  $('decide-body').addEventListener('change', e => {
    const t = e.target, ch = g().choice;
    if (t.name === 'method') { ch.method = t.value; if (!M[ch.method].sea) ch.push = false; }
    else if (t.name === 'cmsg') ch.msg = t.value;
    else if (t.name === 'pmsg') ch.msg = t.value;
    else if (t.name === 'level') { ch.level = +t.value; if (ch.level !== 4) ch.detain = false; }
    else if (t.id === 'push') ch.push = t.checked;
    else if (t.id === 'hold') ch.hold = t.checked;
    else if (t.id === 'detain') ch.detain = t.checked;
    const focusName = t.name || t.id, val = t.value;
    paintDecide(g());
    const back = document.querySelector(t.name ? `#decide-body input[name="${focusName}"][value="${val}"]` : `#${focusName}`);
    if (back) back.focus();
    onChange();
  });
}
