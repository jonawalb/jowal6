// "Keep the lights on": a small notional model of how much space support a side keeps over a year of war,
// given its architecture, the attacks it faces and the responses it has prepared. Every parameter is notional.
import { esc } from './common.js';

export const ARCH = {
  exquisite: { name: 'A few large satellites', n: 6, spares: 1, ground: 0.40, line: 'Six expensive, long-lived satellites (the classic GEO or large-LEO design).' },
  mixed: { name: 'Mixed', n: 40, spares: 6, ground: 0.33, line: 'Forty mid-sized satellites with some crosslinks.' },
  proliferated: { name: 'Proliferated', n: 300, spares: 30, ground: 0.22, line: 'Three hundred small satellites with laser crosslinks (the SDA or Starlink approach).' },
};
export const ATTACKS = [
  { id: 'rev', name: 'Jamming, lasers and cyber', line: 'Reversible attacks on links and sensors.' },
  { id: 'kin', name: 'Kinetic ASAT salvo', line: '20 interceptors fired over the first 30 days.' },
  { id: 'gnd', name: 'Strikes on ground stations', line: 'Missiles or sabotage against control and downlink sites.' },
];
export const RESPONSES = [
  { id: 'harden', name: 'Hardening and maneuver', line: 'Anti-jam links, shielded sensors, fuel to dodge.' },
  { id: 'aug', name: 'Allied and commercial backup', line: 'Buy or borrow capacity from allies and firms.' },
  { id: 'spares', name: 'Spares already on orbit', line: 'Switched on in the first days.' },
  { id: 'launch', name: 'Responsive launch', line: 'Rockets and satellites on standby to replace losses.' },
  { id: 'strike', name: 'Disrupt their counterspace', line: 'Hit their launchers, jammers, command links and tracking network.' },
];

// Daily capacity, 0–1, for one configuration.
export function simulate(arch, attacks, resp, days = 365) {
  const A = ARCH[arch], has = id => resp.has(id), on = id => attacks.has(id);
  const out = [];
  let K = on('kin') ? 20 : 0, kills = 0, replaced = 0, spares = 0;
  const pk = has('harden') ? 0.45 : 0.7;
  const launchStart = has('launch') ? { exquisite: 120, mixed: 14, proliferated: 10 }[arch] : { exquisite: 400, mixed: 180, proliferated: 120 }[arch];
  const launchRate = { exquisite: 1 / 90, mixed: 4 / 30, proliferated: 40 / 30 }[arch];   // satellites per day
  for (let t = 0; t <= days; t++) {
    if (has('strike') && t === 7) K *= 0.5;                       // half their remaining interceptors lost to strikes
    if (K > 0 && t < 30) { const fired = Math.min(K, 20 / 30); K -= fired; kills = Math.min(A.n, kills + fired * pk); }
    if (has('spares') && t >= 3) spares = Math.min(A.spares, kills);
    if (t >= launchStart) replaced = Math.min(kills - spares, replaced + launchRate);
    const kinLoss = Math.max(0, (kills - spares - replaced) / A.n);
    let rev = 0;
    if (on('rev')) {
      rev = 0.35 * (has('harden') ? 0.5 : 1) * (0.6 + 0.4 * Math.exp(-t / 30));
      if (has('strike') && t >= 14) rev *= 0.5;
    }
    const gnd = on('gnd') ? A.ground * Math.exp(-t / 20) * (has('strike') ? 0.8 : 1) : 0;
    let cap = (1 - Math.min(1, kinLoss)) * (1 - rev) * (1 - gnd);
    if (has('aug') && t >= 2) cap = Math.max(cap, 0.25 + 0.5 * cap);
    out.push(Math.max(0, Math.min(1, cap)));
  }
  return out;
}

export function mountSustain(host) {
  const S = { arch: 'exquisite', attacks: new Set(['rev', 'kin', 'gnd']), resp: new Set() };
  const checks = (list, set, name) => list.map(o =>
    `<label class="tg"><input type="checkbox" data-set="${name}" value="${o.id}" ${set.has(o.id) ? 'checked' : ''}><span class="sw"></span><span class="t">${esc(o.name)}<small>${esc(o.line)}</small></span></label>`).join('');
  host.innerHTML = `<div class="ctl">
      <div><p class="eyebrow">Your architecture</p><div class="seg sl-seg" role="group" aria-label="Architecture" id="su-arch">
        ${Object.entries(ARCH).map(([k, a]) => `<button type="button" data-v="${k}">${esc(a.name)}</button>`).join('')}</div>
        <p class="fine" id="su-arch-l" style="margin-top:4px"></p></div>
      <div><p class="eyebrow">Their attacks</p>${checks(ATTACKS, S.attacks, 'attacks')}</div>
      <div><p class="eyebrow">Your preparations</p>${checks(RESPONSES, S.resp, 'resp')}</div>
    </div>
    <div><svg id="su-chart" viewBox="0 0 640 300" role="img" aria-label="Space support over a year of war"></svg>
      <div class="sl-readouts" id="su-read"></div>
      <p class="fine" id="su-note" style="margin-top:8px"></p></div>`;
  host.querySelector('#su-arch').onclick = e => { const b = e.target.closest('button'); if (b) { S.arch = b.dataset.v; draw(); } };
  host.addEventListener('change', e => { const i = e.target; if (!i.dataset.set) return; i.checked ? S[i.dataset.set].add(i.value) : S[i.dataset.set].delete(i.value); draw(); });

  function draw() {
    host.querySelectorAll('#su-arch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.arch)));
    host.querySelector('#su-arch-l').textContent = ARCH[S.arch].line;
    const run = simulate(S.arch, S.attacks, S.resp), base = simulate(S.arch, S.attacks, new Set());
    const W = 640, H = 300, L = 42, R = 10, T = 26, B = 30;
    // Time axis is a square-root scale so the first week is readable next to the full year.
    const x = d => L + Math.sqrt(d / 365) * (W - L - R), y = v => T + (1 - v) * (H - T - B);
    const path = a => a.map((v, d) => `${d ? 'L' : 'M'}${x(d).toFixed(1)},${y(v).toFixed(1)}`).join('');
    const phases = [[0, 7, 'Short term'], [7, 90, 'Medium term'], [90, 365, 'Long term']];
    const svg = host.querySelector('#su-chart');
    svg.innerHTML = `${phases.map(([a, b, n], i) => `<rect x="${x(a)}" y="${T}" width="${x(b) - x(a)}" height="${H - T - B}" fill="var(--chip)" opacity="${i % 2 ? 0.25 : 0.6}"/>
        <text class="ph" x="${(x(a) + x(b)) / 2}" y="${T - 8}" text-anchor="middle">${n}</text>`).join('')}
      ${[0, .25, .5, .75, 1].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--rule)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v * 100}%</text>`).join('')}
      ${[1, 7, 30, 90, 180, 365].map(d => `<text x="${x(d)}" y="${H - 10}" text-anchor="middle">${d === 1 ? 'day 1' : d}</text>`).join('')}
      <path d="${path(base)}" fill="none" stroke="var(--faint)" stroke-width="2" stroke-dasharray="5 4"/>
      <path d="${path(run)}" fill="none" stroke="var(--blue)" stroke-width="3"/>`;
    const at = d => Math.round(run[d] * 100) + '%';
    host.querySelector('#su-read').innerHTML = [[7, 'after one week'], [60, 'after two months'], [365, 'after one year']]
      .map(([d, l]) => `<div><b>${at(d)}</b><span>support ${l}${S.resp.size ? `, vs ${Math.round(base[d] * 100)}% unprepared` : ''}</span></div>`).join('');
    host.querySelector('#su-note').innerHTML = `Blue: with your preparations. Dashed: the same attacks with none. <span class="notional">notional</span> Every number in this model is an illustration, not an estimate.`
      + (S.resp.has('strike') ? ' Striking launchers and tracking sites on the other side\'s territory risks escalation, possibly to nuclear use if those sites also serve nuclear forces; see Nuclear Entanglement.' : '');
  }
  draw();
}
