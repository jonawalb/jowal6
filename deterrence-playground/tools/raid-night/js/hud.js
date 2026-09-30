// Scoreboard panel and weapon bar. Called about ten times a second.
import { WEAPONS, WEAPON_ORDER, THREATS, THREAT_ORDER, CITIES } from '../data/params.js';
import { summary } from './sim.js';
import { range, ratio, exchangeState } from './fmt.js';

const $ = id => document.getElementById(id);

export function updateHud(S, weapon) {
  const m = summary(S);
  $('x-spent').textContent = range(m.spent.lo, m.spent.hi);
  $('x-value').textContent = range(m.value.lo, m.value.hi);
  const st = $('x-status');
  if (!m.spent.hi && !m.value.hi) {
    $('x-ratio').textContent = 'No priced shots yet';
    st.dataset.s = 'good';
  } else if (!m.value.lo) {
    $('x-ratio').textContent = 'Spending, nothing priced destroyed';
    st.dataset.s = 'bad';
  } else {
    $('x-ratio').textContent = `${ratio(m.ratio.lo)} to ${ratio(m.ratio.hi)}`;
    st.dataset.s = exchangeState(m.ratio);
  }
  $('x-note').textContent = `Dollars spent per dollar of threat destroyed, at the low and at the high cost estimates.${m.unpricedKills ? ` Plus ${m.unpricedKills} cruise missile${m.unpricedKills > 1 ? 's' : ''} destroyed, not priced.` : ''}`;

  $('leaks').innerHTML = THREAT_ORDER.map(k => `<dt>${THREATS[k].short}</dt><dd>${m.kills[k]} down · ${m.leaks[k]} leaked</dd>`).join('')
    + `<dt>Damage</dt><dd>${m.dmgTotal} pts${m.dmgTotal ? ' (' + CITIES.filter(c => m.dmg[c.k]).map(c => `${c.k} ${m.dmg[c.k]}`).join(', ') + ')' : ''}</dd>`;

  $('mags').innerHTML = WEAPON_ORDER.map(w => {
    const W = WEAPONS[w], left = S.ammo[w], f = left / W.mag;
    return `<div class="mag" data-w="${w}"><span class="mag-n">${W.short}</span><span class="mag-bar" role="img" aria-label="${left} of ${W.mag} left"><i style="width:${(f * 100).toFixed(1)}%"></i></span><span class="num">${left}/${W.mag}</span></div>`;
  }).join('');

  for (const w of WEAPON_ORDER) {
    const b = document.querySelector(`.wbtn[data-w="${w}"]`);
    b.setAttribute('aria-pressed', String(w === weapon));
    b.querySelector('[data-a]').textContent = `${S.ammo[w]} left`;
    const ready = S.cool[w].filter(c => c <= 0).length;
    b.querySelector('[data-r]').textContent = S.ammo[w] ? `${ready}/${S.cool[w].length} sites ready` : 'empty';
    b.classList.toggle('empty', !S.ammo[w]);
  }
}
