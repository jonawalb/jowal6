// Scoreboard panel, weapon bar, hard-mode battery cards and the lock-order switch. updateHud runs about ten
// times a second.
import { WEAPONS, WEAPON_ORDER, THREATS, THREAT_ORDER, CITIES, BATTERIES } from '../data/params.js';
import { summary, tti } from './sim.js';
import { ORDERS, orderInfo } from './targeting.js';
import { range, ratio, exchangeState } from './fmt.js';

const $ = id => document.getElementById(id);
const BAT_KEYS = {
  L: '<kbd>W</kbd> fire · <kbd>A</kbd> <kbd>D</kbd> target · <kbd>Tab</kbd> munition',
  R: '<kbd>Space</kbd>/<kbd>↑</kbd> fire · <kbd>←</kbd> <kbd>→</kbd> target · <kbd>Return</kbd> <kbd>\\</kbd> <kbd>Delete</kbd> munition',
};

/** Build the hard-mode battery cards and the lock-order switch once, and wire their buttons. */
export function buildControls({ onWeapon, onLock }) {
  $('bats').innerHTML = Object.entries(BATTERIES).map(([k, B]) => `<div class="bat" data-b="${k}">
    <p class="bat-h"><span class="bat-tag">${k}</span><b>${B.name}</b> <span class="muted">cities ${B.cities.join('–')}</span></p>
    <p class="bat-k">${BAT_KEYS[k]}</p>
    <div class="bat-w" role="group" aria-label="${B.name} munition">${WEAPON_ORDER.map(w =>
      `<button type="button" class="bbtn" data-b="${k}" data-w="${w}" aria-pressed="false"><span class="wn">${WEAPONS[w].short}</span><span class="num" data-a></span></button>`).join('')}</div>
    <p class="bat-t num" data-t="${k}">No target</p></div>`).join('');
  $('bats').addEventListener('click', e => { const b = e.target.closest('.bbtn'); if (b) onWeapon(b.dataset.b, b.dataset.w); });
  document.querySelectorAll('.wbtn').forEach(b => b.addEventListener('click', () => onWeapon('N', b.dataset.w)));
  $('lockorder').innerHTML = `<span class="lock-l">Lock order <kbd>O</kbd></span>`
    + ORDERS.map(o => `<button type="button" data-o="${o.k}" aria-pressed="false" title="${o.help}">${o.name}</button>`).join('');
  $('lockorder').addEventListener('click', e => { const b = e.target.closest('[data-o]'); if (b) onLock(b.dataset.o); });
}

export function updateHud(S, bats, mode, lock) {
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

  document.querySelectorAll('#lockorder [data-o]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.o === lock)));
  document.querySelectorAll('.order-now').forEach(el => { el.textContent = orderInfo(lock).name; });

  if (mode !== 'hard') {
    const weapon = bats.N.weapon;
    for (const w of WEAPON_ORDER) {
      const b = document.querySelector(`.wbtn[data-w="${w}"]`);
      b.setAttribute('aria-pressed', String(w === weapon));
      b.querySelector('[data-a]').textContent = `${S.ammo[w]} left`;
      const ready = S.cool[w].filter(c => c <= 0).length;
      b.querySelector('[data-r]').textContent = S.ammo[w] ? `${ready}/${S.cool[w].length} sites ready` : 'empty';
      b.classList.toggle('empty', !S.ammo[w]);
    }
    return;
  }
  for (const [k, B] of Object.entries(BATTERIES)) {
    const bat = bats[k];
    document.querySelectorAll(`.bbtn[data-b="${k}"]`).forEach(b => {
      const w = b.dataset.w, sites = B.sites[w], ready = sites.filter(i => S.cool[w][i] <= 0).length;
      b.setAttribute('aria-pressed', String(w === bat.weapon));
      b.querySelector('[data-a]').textContent = S.ammo[w] ? `${S.ammo[w]} left · ${ready}/${sites.length} ready` : 'empty';
      b.classList.toggle('empty', !S.ammo[w]);
    });
    const th = S.threats.find(t => t.alive && t.id === bat.sel);
    document.querySelector(`[data-t="${k}"]`).textContent = th
      ? `${WEAPONS[bat.weapon].short} → ${THREATS[th.type].short}, ${tti(th).toFixed(0)} s to City ${th.city}`
      : `${WEAPONS[bat.weapon].short} · no target`;
  }
}
