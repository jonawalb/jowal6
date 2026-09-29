// Side panel: presets, inputs (each marked sourced or notional) and the readouts.
import { S as SRC, CHANNEL, THREAT, ENVS, ENV_NOTE, FORCES, THREAT_LEVELS, THREAT_NOTE, CONF, PRESETS, MODEL } from '../data/params.js';

const a = (k, txt) => `<a href="${SRC[k].url}" target="_blank" rel="noopener">${txt || SRC[k].name}</a>`;
const N = '<span class="notional">notional</span>';
const tag = p => p.src ? `<span class="hm-src">${a(p.src, 'source')}</span>` : N;
export const pct = v => v >= 0.1 ? `${Math.round(v * 100)}%` : v >= 0.001 ? `${(v * 100).toFixed(1)}%` : v > 0 ? '<0.1%' : '0%';
const fmt1 = v => (Math.round(v * 10) / 10).toLocaleString('en-US');

function slider(id, label, p, unit = '', help = '') {
  return `<div class="slider"><div class="sl-h"><label for="hm-${id}">${label} ${tag(p)}</label><output id="hm-${id}-o"></output></div>
    <input type="range" id="hm-${id}" data-k="${id}" min="${p.min}" max="${p.max}" step="${p.step}">
    ${help ? `<small>${help}</small>` : ''}</div>`;
}

export function panelHTML() {
  return `
  <div class="sec"><div class="status" id="hm-status"><b></b><span></span></div>
    <dl class="readout" id="hm-read"></dl></div>
  <div class="sec">
    <p class="eyebrow">Scenario</p>
    <div class="choices" id="hm-presets">${PRESETS.map(p => `<button type="button" data-p="${p.k}"><b>${p.label}</b><br><small>${p.sub}</small></button>`).join('')}</div>
  </div>
  <div class="sec">
    <p class="eyebrow">1 · The routes to clear</p>
    ${slider('lengthNm', 'Route length', CHANNEL.lengthNm, 'nm')}
    ${slider('routes', 'Number of routes', CHANNEL.routes)}
    ${slider('widthYd', 'Route width', CHANNEL.widthYd, 'yd')}
    <p class="fine">Defaults from Eyer: "${CHANNEL.widthYd.q}"</p>
  </div>
  <div class="sec">
    <p class="eyebrow">2 · Mines and clutter</p>
    ${slider('mines', 'Mines laid in the strait', THREAT.mines, '', THREAT.mines.note)}
    ${slider('share', 'Share laid in the routes', THREAT.shareInRoutes, '%')}
    ${slider('contactsPerNm2', 'Mine-like contacts per sq nm', THREAT.contactsPerNm2, '', THREAT.contactsPerNm2.note)}
    ${slider('remineWeek', 'Mines re-laid per week', THREAT.remineWeek, '', THREAT.remineWeek.note)}
  </div>
  <div class="sec">
    <p class="eyebrow">3 · Forces</p>
    <div class="hm-forces">${FORCES.map(f => `
      <div class="hm-force"><div class="t"><b>${f.label}</b> ${f.src ? `<span class="hm-src">${a(f.src, 'rate sourced')}</span>` : N}<small>${f.note}</small></div>
        <div class="hm-step" role="group" aria-label="${f.label}"><button type="button" class="btn" data-f="${f.k}" data-d="-1" aria-label="Fewer ${f.short}">−</button><output id="hm-f-${f.k}" class="num"></output><button type="button" class="btn" data-f="${f.k}" data-d="1" aria-label="More ${f.short}">+</button></div></div>`).join('')}</div>
  </div>
  <div class="sec">
    <p class="eyebrow">4 · Conditions</p>
    <p class="fine">Seabed ${'<span class="hm-src">' + a('thales', 'source') + '</span>'}</p>
    <div class="choices hm-seg" id="hm-env">${Object.entries(ENVS).map(([k, e]) => `<button type="button" data-env="${k}"><b>${e.label}</b><br><small>${e.acr} sq nm/h per sonar</small></button>`).join('')}</div>
    <p class="fine">Threat to the MCM force ${N}</p>
    <div class="choices hm-seg" id="hm-threat">${Object.entries(THREAT_LEVELS).map(([k, t]) => `<button type="button" data-threat="${k}"><b>${t.label}</b><br><small>${t.sub}</small></button>`).join('')}</div>
    <p class="fine">Confidence to reach before declaring a route clear ${N}</p>
    <div class="choices hm-seg hm-conf" id="hm-conf">${CONF.map(c => `<button type="button" data-conf="${c}">${c}%</button>`).join('')}</div>
    <p class="fine">${THREAT_NOTE} One search pass finds a given mine ${Math.round(MODEL.pdPass.v * 100)} percent of the time ${N}.</p>
  </div>`;
}

export function renderPanel(host, S, R, day) {
  const st = host.querySelector('#hm-status');
  const weeks = d => d / 7 >= 2 ? `${Math.round(d / 7)} weeks` : `${d} days`;
  if (R.finish == null) {
    st.dataset.s = 'bad';
    st.querySelector('b').textContent = 'Not cleared within a year';
    st.querySelector('span').textContent = 'Losses or re-mining outpace the clearance effort under these settings.';
  } else {
    st.dataset.s = R.finish > 120 ? 'warn' : 'good';
    st.querySelector('b').textContent = `Routes clear in ${R.finish} days`;
    st.querySelector('span').textContent = `About ${weeks(R.finish)} to reach ${S.conf}% confidence. Slowest step: ${R.bottleneck === 'id' ? 'identifying and neutralizing contacts' : 'searching the routes'}.`;
  }
  const D = R.days[Math.min(day, R.days.length - 1)];
  host.querySelector('#hm-read').innerHTML = `
    <dt>Area to clear</dt><dd>${fmt1(R.area)} sq nm</dd>
    <dt>Search passes needed</dt><dd>${R.P} (to ${S.conf}%)</dd>
    <dt>Search capacity</dt><dd>${fmt1(R.dailyRate)} sq nm/day</dd>
    <dt>Mines in the routes</dt><dd>${fmt1(R.minesIn)}${S.remineWeek ? ` + ${S.remineWeek}/week` : ''}</dd>
    <dt>Day ${day}: searched</dt><dd>${Math.round(D.frac * 100)}% of the effort</dd>
    <dt>Day ${day}: contacts cleared</dt><dd>${Math.round(D.processed)} of ${Math.round(D.available)} found</dd>
    <dt>Mines in the water, day ${day}</dt><dd>${fmt1(D.left)} expected</dd>
    <dt>Risk per transit, day ${day}</dt><dd>${pct(D.risk)}</dd>
    <dt>Risk per transit at the start</dt><dd>${pct(R.riskStart)}</dd>
    <dt>…when declared clear</dt><dd>${R.finish == null ? 'n/a' : pct(R.riskEnd)}</dd>`;
  for (const id of ['lengthNm', 'routes', 'widthYd', 'mines', 'share', 'contactsPerNm2', 'remineWeek']) {
    const el = host.querySelector(`#hm-${id}`);
    el.value = S[id];
    host.querySelector(`#hm-${id}-o`).textContent = `${S[id].toLocaleString('en-US')}${{ lengthNm: ' nm', widthYd: ' yd', share: '%' }[id] || ''}`;
  }
  for (const f of FORCES) host.querySelector(`#hm-f-${f.k}`).textContent = S[f.k];
  host.querySelectorAll('[data-env]').forEach(b => b.setAttribute('aria-pressed', b.dataset.env === S.env));
  host.querySelectorAll('[data-threat]').forEach(b => b.setAttribute('aria-pressed', b.dataset.threat === S.threat));
  host.querySelectorAll('[data-conf]').forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.conf) === S.conf));
}

export function wirePanel(host, set, S, preset) {
  host.addEventListener('input', e => { const k = e.target.dataset.k; if (k) set({ [k]: Number(e.target.value) }); });
  host.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.f) { const f = FORCES.find(x => x.k === b.dataset.f); set({ [f.k]: Math.max(0, Math.min(f.max, S()[f.k] + Number(b.dataset.d))) }); }
    else if (b.dataset.env) set({ env: b.dataset.env });
    else if (b.dataset.threat) set({ threat: b.dataset.threat });
    else if (b.dataset.conf) set({ conf: Number(b.dataset.conf) });
    else if (b.dataset.p) preset(b.dataset.p);
  });
}
export { ENV_NOTE };
