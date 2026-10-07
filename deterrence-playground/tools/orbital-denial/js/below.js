// Below the fold: how to read it, method, calibration, balance check, parameters and sources.
import { P as PARAMS, PDEF, ANCHORS, SHELLS, MISSIONS, MISSION_KEYS, BACKGROUND, DEBRIS0, STOCKS } from '../data/params.js';
import { SOURCES } from '../data/sources.js';
import { breakup } from './debris.js';
import { STRATEGIES, monteCarlo } from './plans.js';

const fmt = n => Math.round(n).toLocaleString('en-US');
const SHORT = { kessler1978: 'Kessler & Cour-Palais 1978', kessler2010: 'Kessler et al. 2010', krisko2011: 'ODQN 15-4', odqn11_2: 'ODQN 11-2',
  odqn12_1: 'ODQN 12-1', odqn14_4: 'ODQN 14-4', odqn26_1: 'ODQN 26-1', odqn26_4: 'ODQN 26-4', odqn28_2: 'ODQN 28-2',
  usspacecom2021: 'USSPACECOM 2021', swf2026: 'SWF 2026', esa2025: 'ESA 2025', csis2025: 'CSIS 2025', acton2018: 'Acton 2018', acton2019: 'Acton 2019' };
const cite = k => `<a href="#src-${k}">${SHORT[k]}</a>`;
const NOT = '<span class="notional">notional</span>';

function calibration() {
  const rows = Object.values(ANCHORS).map(a => {
    const N = breakup(a.mass + PDEF.kvMass, PDEF);
    const last = a.counts[a.counts.length - 1];
    return `<tr><td>${a.name}<br><small class="muted">${fmt(a.mass)} kg, ${a.alt} (${cite(a.src)})</small></td><td class="num">${fmt(N)}</td>
      <td>${a.counts.map(c => `${fmt(c[1])} at ${c[0] < 1 ? `${Math.round(c[0] * 12)} mo` : `${c[0]} yr`} (${cite(c[2])})`).join('<br>')}</td>
      <td class="num">${(last[1] / N).toFixed(1)}×</td></tr>`;
  }).join('');
  return `<div class="tablewrap"><table><thead><tr><th>Test</th><th>Breakup model, ≥10 cm</th><th>Cataloged fragments (source)</th><th>Latest ÷ model</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function renderBelow(root, getP) {
  root.innerHTML = `
  <div class="col">
    <h2>How to read it</h2>
    <p><b>The loop.</b> Each month you give two orders and Red gives two, at the same time. Red cannot see your orders; it answers what you did the month before, according to a posture you cannot see: restrained, reciprocal or aggressive. The log shows every roll.</p>
    <p><b>Winning.</b> Space support is the share of each side's satellite service still working, weighted by mission: reconnaissance ${MISSIONS.isr.w * 100}, communications ${MISSIONS.com.w * 100}, navigation ${MISSIONS.nav.w * 100}, early warning ${MISSIONS.ew.w * 100} ${NOT}. Each month adds your support minus Red's to the advantage (crisis months count a fifth). At ±${PDEF.theta.toFixed(2)} after month 10 the war goes to that side; in between it is a stalemate. If the nuclear threshold is crossed, the game ends there and everyone loses.</p>
    <p><b>Three costs.</b> Destructive attacks are permanent, so they free your later orders; reversible ones must be repeated. But destructive attacks raise the escalation risk more, and missile kills leave debris that hits your satellites as well as Red's. The review weighs all three against a reversible-only version of your own game.</p>

    <h2 class="mt">Method</h2>
    <p>The game couples three published modeling ideas. The equations, every parameter and the balance and sensitivity runs are on the <a href="METHOD.html">method page</a>.</p>
    <h3>1. How many fragments a kill makes</h3>
    <p>The NASA standard breakup model gives the number of fragments of size L<sub>c</sub> or larger from a catastrophic collision of total mass M (target plus projectile) ${cite('krisko2011')}:</p>
    <p class="eq">N(≥L<sub>c</sub>) = 0.1 · M<sup>0.75</sup> · L<sub>c</sub><sup>−1.71</sup>   (M in kg, L<sub>c</sub> in m)</p>
    <p>At L<sub>c</sub> = 10 cm, the usual limit of a trackable fragment, a 2,000 kg reconnaissance satellite ${NOT} yields about ${fmt(breakup(MISSIONS.isr.mass + PDEF.kvMass, PDEF))} fragments. The same power law gives ${PDEF.smallRatio} fragments of 1 cm or more for each 10 cm fragment. A co-orbital kill is treated as a low-debris disable at ${PDEF.coorbFrac * 100}% of a full breakup ${NOT}.</p>
    <h3>2. How often debris hits a satellite</h3>
    <p>Kessler and Cour-Palais (1978) showed that collision fragments raise the chance of further collisions, so a debris belt can grow on its own ${cite('kessler1978')}; the collision rate varies as the square of the number of objects in orbit ${cite('kessler2010')}. The model uses the kinetic form, rate = spatial density × relative speed × cross-section, for each shell:</p>
    <p class="eq">λ<sub>10</sub> = (D / V) · v · σ     per satellite per year<br>λ = λ<sub>10</sub> · [p<sub>cat</sub> + (1 − p<sub>cat</sub>) + (r − 1) · p<sub>small</sub>]</p>
    <p>D is trackable fragments in the shell, V its volume (a ${SHELLS.high.band} km band ${NOT}), v = ${SHELLS.high.v} km/s in LEO ${cite('kessler2010')}, σ = ${PDEF.sigma} m² ${NOT}. Of strikes by trackable fragments, p<sub>cat</sub> = ${PDEF.pCat} are catastrophic ${cite('kessler2010')} and make a new breakup cloud: this is the cascade. The rest, and a share p<sub>small</sub> = ${PDEF.pSmallKill} ${NOT} of strikes by the r = ${PDEF.smallRatio} times more numerous 1–10 cm fragments, end a satellite's mission without a new cloud. A fresh cloud counts ${PDEF.freshK}× for about ${Math.round(PDEF.freshTau * 12)} months while it is still concentrated near its parent's orbit ${NOT} ${cite('odqn11_2')}.</p>
    <h3>3. How long debris stays</h3>
    <p>Fragments decay as D(t) = D<sub>0</sub> e<sup>−t/τ</sup>, with τ fitted to the two real clouds: low LEO τ = ${SHELLS.low.tau} yr, because about 9% of modeled Cosmos 1408 fragments of 1 cm or more remained after two years ${cite('odqn28_2')}; high LEO τ = ${SHELLS.high.tau} yr, because 2,837 of 3,532 cataloged Fengyun-1C fragments were still in orbit 15.3 years after the test ${cite('odqn26_4')}. MEO and GEO have no drag in the model. A constant background source ${NOT} puts back what drag removes from the pre-war fragments, so with no war each shell holds its pre-war count; the real environment would grow even without launches ${cite('esa2025')}. After the war both sides rebuild to full strength and the projection runs on, as in the critical-density analysis Kessler and colleagues describe ${cite('kessler2010')}.</p>
    <h3>4. Escalation</h3>
    <p>Each month's hazard is h = h<sub>0</sub> + Σ w<sub>a</sub> · e · (1 + φF), and the chance of crossing the nuclear threshold that month is 1 − e<sup>−h</sup>, the same form as the <a href="../entanglement/">Nuclear Entanglement</a> tool. w<sub>a</sub> is larger for destructive attacks; e = ${PDEF.entangle} when the target is early warning and nuclear command, the entanglement mechanism James Acton describes ${cite('acton2018')}, ${cite('acton2019')}; F is how much of its warning and reconnaissance the target side has lost, so a blinded side reads attacks as worse. The first destructive attack of the game counts ${PDEF.firstKill}×. All of these weights are ${NOT}: no data exist to estimate them.</p>
    <h3>Calibration</h3>
    ${calibration()}
    <p class="fine">The model reproduces Cosmos 1408 within about a third. Fengyun-1C broke into about four times as many cataloged pieces as the model predicts, which NASA noted at the time ("considerably exceed model predictions") ${cite('odqn12_1')}. The Advanced setting "×4" plays with Fengyun-1C-like clouds. The ratio of 1 cm to 10 cm fragments, ${PDEF.smallRatio}, matches Fengyun-1C's estimated 150,000 fragments of 1 cm or more against about 2,600 large ones (about 58) ${cite('odqn12_1')}. The fitted lifetimes give 57% of Cosmos 1408's cataloged fragments left after 5.5 months; the ODQN count was 990 of 1,760, or 56% ${cite('odqn26_4')}.</p>
    <h3>Sensitivity and what is left out</h3>
    <p>Results move most with the fragment multiplier, the cross-section σ and the band thickness (all scale the debris hazard in proportion), the entanglement multiplier and the Red posture. The ×4 setting roughly quadruples the debris legacy without changing who wins the war, because debris kills few satellites within ten months. The advantage threshold and the reversible effect sizes decide how often wars end in stalemate. The <a href="METHOD.html">method page</a> lists the runs.</p>
    <p>Left out: orbital mechanics beyond shell averages (planes, inclinations, conjunction screening), collisions between fragments, the ground segment except as a cyber target, nuclear detonations in space, spoofing, rendezvous without attack, launch capacity limits, third parties' reactions, and any bargaining or war termination. Numbers of satellites, their masses and missions, the two powers and their doctrines are all ${NOT}.</p>
  </div>
  <div class="col">
    <h2>Balance check</h2>
    <p>Six scripted strategies, 300 seeded games each (seed 2026, with the default settings these are the same runs as the tables on the <a href="METHOD.html">method page</a>), Red's posture drawn from each seed. No strategy should win every time, and doing nothing or going all-out kinetic should do badly.</p>
    <div class="od-go" style="justify-content:flex-start"><button type="button" class="btn" id="bal-run">Run 1,800 games</button> <span class="fine num" id="bal-prog"></span></div>
    <div class="tablewrap"><table id="bal"><tbody><tr><td class="fine">Press the button to run it in your browser.</td></tr></tbody></table></div>

    <h2 class="mt">Model inputs</h2>
    <p class="fine">${NOT} marks values without a source. Each side starts with ${MISSION_KEYS.map(m => `${MISSIONS[m].n0} ${MISSIONS[m].short} (${MISSIONS[m].need} needed, ${fmt(MISSIONS[m].mass)} kg)`).join(', ')} ${NOT}; stocks: ${STOCKS.asat} missiles, ${STOCKS.coorb} co-orbital, ${STOCKS.maneuver} maneuvers, ${STOCKS.reconst} relaunches, ${STOCKS.prolif} proliferation batches ${NOT}. Everyone else: ${fmt(BACKGROUND.low)} satellites in low LEO and ${fmt(BACKGROUND.high)} in high LEO; pre-war fragments ${fmt(DEBRIS0.low)} and ${fmt(DEBRIS0.high)} ${NOT}.</p>
    <div class="tablewrap"><table id="param-table"><thead><tr><th>Parameter</th><th>Value</th><th>Basis</th></tr></thead><tbody>
      ${PARAMS.map(p => `<tr><td>${p.t}</td><td class="num">${p.v}${p.u ? ' ' + p.u : ''}</td><td>${p.src ? cite(p.src) : NOT}${p.note ? ` ${p.note}` : ''}</td></tr>`).join('')}
    </tbody></table></div>

    <h2 class="mt">The real anchors</h2>
    <p>On 11 January 2007 a Chinese direct-ascent interceptor destroyed the 960 kg Fengyun-1C weather satellite at about 850 km ${cite('odqn11_2')}. By 1 May 2022, 3,532 of its fragments had been cataloged and 2,837 were still in orbit ${cite('odqn26_4')}. On 15 November 2021 a Russian direct-ascent missile destroyed the 1,750 kg Cosmos 1408 in a 490 × 465 km orbit ${cite('odqn26_1')}; U.S. Space Command reported "more than 1,500 pieces of trackable orbital debris" ${cite('usspacecom2021')}. The lower cloud was mostly gone within two years ${cite('odqn28_2')}. The Secure World Foundation counts 6,904 cataloged pieces of debris from counterspace tests by four countries, 2,773 still in orbit ${cite('swf2026')}.</p>
    <p>The action menu follows the categories in the Secure World Foundation and CSIS assessments ${cite('swf2026')}, ${cite('csis2025')}: electronic warfare (jamming), directed energy (dazzling), cyber, direct-ascent and co-orbital attacks. CSIS classes electronic attacks as not permanent and kinetic ones as permanent.</p>

    <h2 class="mt">Sources</h2>
    <ol class="src" id="sources">${Object.entries(SOURCES).map(([k, s]) => `<li id="src-${k}"><a href="${s.url}" target="_blank" rel="noopener">${s.t}</a>. <span>Used for: ${s.used}.</span></li>`).join('')}</ol>
  </div>`;
  root.querySelector('#bal-run').onclick = () => runBalance(getP());
}

function runBalance(P) {
  const keys = ['passive', 'allout', 'reversible', 'surprise', 'defend', 'tit'], out = [];
  const prog = document.getElementById('bal-prog');
  let i = 0;
  const next = () => {
    if (i >= keys.length) {
      document.getElementById('bal').innerHTML = `<thead><tr><th>Strategy</th><th class="r">You win</th><th class="r">Stalemate</th><th class="r">Red wins</th><th class="r">Threshold crossed</th><th class="r">Extra sats lost, 25 y</th></tr></thead><tbody>${out.join('')}</tbody>`;
      prog.textContent = 'Done.'; return;
    }
    const k = keys[i++], r = monteCarlo(STRATEGIES[k].f, P, { n: 300, seed: 2026 });
    const p = x => `${Math.round(100 * x / r.n)}%`;
    out.push(`<tr><td>${STRATEGIES[k].t}</td><td class="num">${p(r.blue)}</td><td class="num">${p(r.draw)}</td><td class="num">${p(r.red)}</td><td class="num">${p(r.escalation)}</td><td class="num">${fmt(r.extraAll)}</td></tr>`);
    prog.textContent = `${i} of ${keys.length} strategies…`;
    setTimeout(next, 0);
  };
  prog.textContent = 'Running…';
  setTimeout(next, 20);
}
