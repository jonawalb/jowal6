// The monthly decision panel for either side, and the live readout of how close the choice comes to a threshold.
import { LEVELS, METHODS, C_MSGS, P_MSGS, R_VALUES, R_PRIOR, T_VALUES, T_PRIOR } from '../data/params.js';
import { M, baseE, deliveryOdds, encounters, provocation, tAdj } from './engine.js';
import { pIntervene, pSpike } from './belief.js';
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
      return radio('level', i, ch.level === i, `<span><b><i class="num">${i}</i> ${lv.label}</b><small>${lv.text}</small></span><span class="sl-odds num">−${deny.toFixed(1)} mo<small>Patron acts ${pct(pi)}${pio > pi + 0.01 ? ` · ${pct(pio)} with observers` : ''}</small></span>`, pi >= 0.3 ? 'hot' : '');
    }).join('')}</fieldset>
    <fieldset><legend>Messaging</legend><div class="sl-row3">${P_MSGS.map(m => radio('pmsg', m.id, ch.msg === m.id, `<span><b>${m.label}</b><small>${m.text}</small></span>`)).join('')}</div></fieldset>
    <label class="sl-check"><input type="checkbox" id="hold" ${ch.hold ? 'checked' : ''}><span><b>If they push through, hold course.</b> Halves their gain, risks a collision.</span></label>
    <label class="sl-check"><input type="checkbox" id="detain" ${ch.detain ? 'checked' : ''} ${ch.level === 4 ? '' : 'disabled'}><span><b>Detain crews you board.</b> Pleases home; the Patron counts it as a rung higher.</span></label>`;
  }
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
  } else {
    const enc = encounters(s.lastLevel, ch.method), Pv = provocation(ch, enc);
    paintBelief($('belief-a'), { prior: T_PRIOR, post: s.bT, labels: T_VALUES.map(String), mark: Pv - 1, color: COL.p });
    $('belief-a-t').textContent = 'How much will the Power take?';
    $('belief-a-x').innerHTML = `Bars: your belief about the provocation level at which the Power snaps and jumps two rungs the next month. This choice provokes <b>${Pv}</b>${tAdj(s) ? ' (its home pressure is high: it snaps a rung sooner)' : ''}. <b>Chance it snaps: ${pct(pSpike(s.bT, Pv, tAdj(s)))}.</b>`;
    $('belief-b-wrap').hidden = false;
    paintBelief($('belief-b'), { prior: R_PRIOR, post: s.bR, labels: rLabels, color: COL.a });
  }
}

export function wireDecide(g, onChange) {
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
