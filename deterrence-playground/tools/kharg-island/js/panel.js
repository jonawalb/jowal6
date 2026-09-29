// Setup panel markup: U.S. objective and forces, Iran's posture, game length and the assumptions editor.
import { MENU, TOGGLES, BUDGET, SECTORS, OBJECTIVES, IRAN_FIELDS, MINE_LEVELS, POSTURES, PROB } from '../data/params.js';
import { SOURCES } from '../data/sources.js';

export const NOTIONAL = '<span class="notional">notional</span>';
export const srcTag = k => k ? `<a class="pill src-pill" href="#src-${k}" title="${SOURCES[k].t.replace(/"/g, '&quot;')}">source</a>` : NOTIONAL;
export const ESCAL = [[0.5, 'Low'], [1, 'Medium'], [1.8, 'High']];

const slider = (id, label, min, max, step, help = '') => `<label class="slider"><span class="sl-h"><span>${label}</span><output id="${id}-out"></output></span>
  <input type="range" id="${id}" min="${min}" max="${max}" step="${step}">${help ? `<small>${help}</small>` : ''}</label>`;
const stepper = (id, t, s, aria) => `<div class="stepper" data-k="${id}">
  <div class="st-t"><b>${t}</b><small>${s}</small></div>
  <div class="st-c"><button type="button" class="st-b" data-d="-1" aria-label="Fewer ${aria}">−</button>
  <output class="num" id="n-${id}">0</output>
  <button type="button" class="st-b" data-d="1" aria-label="More ${aria}">+</button></div></div>`;

export function panelHtml() {
  return `
  <div class="sec" aria-live="polite"><div class="status" id="status"></div><p class="fine" id="status-note"></p></div>
  <div class="sec">
    <p class="eyebrow"><span class="step us">1</span> The U.S. objective</p>
    <div class="choices three" id="obj" role="group" aria-label="U.S. objective">
      ${Object.entries(OBJECTIVES).map(([k, o]) => `<button type="button" data-k="${k}"><b>${o.t}</b><small>${o.s}</small></button>`).join('')}
    </div>
  </div>
  <div class="sec">
    <p class="eyebrow"><span class="step us">2</span> U.S. forces</p>
    <div class="budget"><div class="bar"><span id="budget-bar"></span></div><p class="fine" id="budget-t"></p></div>
    <div class="menu">
      ${MENU.map(m => stepper(m.k, m.t, `${m.s} · ${m.cost} pts ${srcTag(m.src)}`, m.one + 's')).join('')}
    </div>
    ${TOGGLES.map(t => `<label class="tg"><input type="checkbox" id="tg-${t.k}"><span class="sw"></span><span class="t">${t.t}<small>${t.s} · ${t.cost ? t.cost + ' pts' : 'no budget cost'} ${srcTag(t.src)}</small></span></label>`).join('')}
    <div id="land-opts" class="sub">
      ${slider('strikes', 'Turns of suppression strikes before landing', 0, 3, 1, 'Strikes wear down Iran\'s launchers and the garrison, and the ships stay out of range. Iran uses the time to reinforce.')}
      <p class="lbl"><b>Approach side</b> <small>Broad notional halves of the island. Click one in the island inset too.</small></p>
      <div class="choices two" id="sector" role="group" aria-label="Approach side">
        ${Object.entries(SECTORS).map(([k, s]) => `<button type="button" data-k="${k}"><b>${s.t}</b><small>${s.s}</small></button>`).join('')}
      </div>
    </div>
    <p class="fine">The ${BUDGET}-point budget and every cost are ${NOTIONAL}; menu items rest on open descriptions of each force.</p>
  </div>
  <div class="sec">
    <p class="eyebrow"><span class="step ir">3</span> Iran's posture</p>
    <div class="choices two" id="posture" role="group" aria-label="Iranian posture preset">
      ${Object.entries(POSTURES).map(([k, p]) => `<button type="button" data-k="${k}"><b>${p.t}</b><small>${p.s}</small></button>`).join('')}
      <button type="button" data-k="custom"><b>Custom</b><small>Set each force below</small></button>
    </div>
    <details id="iran-d"><summary><b>Iran's forces</b> <small class="muted" id="iran-sum"></small></summary>
      <div class="menu">${IRAN_FIELDS.map(f => stepper('ir-' + f.k, f.t, `${f.s} · ${f.src ? `${srcTag(f.src)} count ` : ''}${NOTIONAL}`, f.one + 's')).join('')}</div>
      <p class="lbl"><b>Mines on the approaches</b> <small>more than 5,000 in inventory ${srcTag('dia')}; level ${NOTIONAL}</small></p>
      <div class="choices three" id="mines" role="group" aria-label="Mine threat">
        ${Object.entries(MINE_LEVELS).map(([k, t]) => `<button type="button" data-k="${k}"><b>${t}</b></button>`).join('')}
      </div>
      <p class="lbl"><b>Willingness to widen the war</b> ${NOTIONAL}</p>
      <div class="choices three" id="escal" role="group" aria-label="Escalation propensity">
        ${ESCAL.map(([k, t]) => `<button type="button" data-k="${k}"><b>${t}</b><small>×${k}</small></button>`).join('')}
      </div>
    </details>
  </div>
  <div class="sec">
    <p class="eyebrow"><span class="step">4</span> Game</p>
    ${slider('turns', 'Turns', 6, 12, 1)}
    <p class="fine" id="turn-note"></p>
    <div class="seedrow"><span class="fine">Dice seed <b class="num" id="seed-t"></b></span><button type="button" class="btn" id="reseed">New dice</button></div>
  </div>
  <div class="sec">
    <details id="assume"><summary><b>Edit the assumptions</b> <small class="muted" id="assume-n"></small></summary>
      <p class="fine">Every probability, rate and baseline in the model. Values marked ${NOTIONAL} are assumptions that no open source gives; values with a source link rest on the cited source. Change any of them and every readout updates.</p>
      <div id="assume-body"></div>
      <button type="button" class="btn" id="assume-reset">Reset all to defaults</button>
    </details>
  </div>`;
}

export function assumptionsHtml(P) {
  const groups = [...new Set(PROB.map(p => p.g))];
  return groups.map(g => `<fieldset class="as-g"><legend>${g}</legend>
    ${PROB.filter(p => p.g === g).map(p => `<label class="as-row${P[p.k] !== p.v ? ' changed' : ''}">
      <span class="as-t">${p.t} ${srcTag(p.src)}${p.note ? `<small>${p.note}</small>` : ''}</span>
      <span class="as-i"><input type="number" data-k="${p.k}" min="${p.min}" max="${p.max}" step="${p.step}" value="${P[p.k]}" aria-label="${p.t}"><small>${p.u}</small></span>
    </label>`).join('')}</fieldset>`).join('');
}

/** Budget spent by a force package. */
export function spent(us) {
  let n = MENU.reduce((a, m) => a + m.cost * us[m.k], 0);
  for (const t of TOGGLES) if (us[t.k]) n += t.cost;
  return n;
}
