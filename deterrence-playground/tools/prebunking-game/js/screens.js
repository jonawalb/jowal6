// Non-round screens: intro with body check-in, practice feedback, the mirror after Part 1, final results.

import { CHECKIN, CHANNELS, PRACTICE, ROUNDS } from '../data/rounds.js';
import { bayes, lambdaHat, summary, fmtLam, fmtSigned, LAM_MIN, LAM_MAX } from './score.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = x => `${Math.round(x)}%`;

export function renderIntro(root, st, onStart) {
  root.innerHTML = `<article class="card rcard intro">
    <p class="eyebrow">How it works</p>
    <h2 class="q">Twelve reports from an invented town. The numbers are the evidence. Everything else is weather.</h2>
    <ol class="steps">
      <li><b>Judge.</b> Each round gives a base rate and one report whose strength is stated as a number. You say how likely the problem is.</li>
      <li><b>Look in the mirror.</b> After six rounds the game shows how much weight you put on each report, and whether a soundtrack, a crowd or an earlier story changed it.</li>
      <li><b>Feel it, name it, place it.</b> In the last six rounds you check your feeling and trace where it came from before you answer. Two of the pulls are new.</li>
    </ol>
    <div class="ci">
      <p class="eyebrow">Before you start: a body check-in</p>
      <p class="fine">Optional. Pick anything that is true right now. It stays in your browser and comes back in one round.</p>
      <div class="words" id="ci" role="group" aria-label="Body check-in">
        ${CHECKIN.map(c => `<button type="button" data-k="${c.k}" aria-pressed="${st.checkin.includes(c.k)}">${c.t}</button>`).join('')}
      </div>
    </div>
    <div class="ans-row"><button type="button" class="btn solid" id="go">Start with a practice round</button>
    <span class="fine">About five minutes. One round uses optional sound; turn it on in the panel.</span></div>
  </article>`;
  root.querySelectorAll('#ci button').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.k;
    let next = st.checkin.includes(k) ? st.checkin.filter(x => x !== k) : [...st.checkin, k];
    if (k === 'fine' && next.includes('fine')) next = ['fine'];
    else next = next.filter(x => x !== 'fine' || k === 'fine');
    st.checkin = next;
    root.querySelectorAll('#ci button').forEach(x => x.setAttribute('aria-pressed', String(next.includes(x.dataset.k))));
  }));
  root.querySelector('#go').addEventListener('click', onStart);
}

export function renderPractice(root, answer, onNext) {
  const p = PRACTICE, b = bayes(p.prior, p.lr) * 100, l = lambdaHat(p.prior, p.lr, answer / 100);
  root.innerHTML = `<article class="card rcard">
    <p class="eyebrow">Practice: the answer</p>
    <h2 class="q">Bayes says ${pct(b)}. You said ${pct(answer)}.</h2>
    <div class="work">
      <p><b>Base rate 20 in 100</b> is odds of 20 to 80, or 1 to 4.</p>
      <p><b>The report is 4× as likely if the closure is real</b>, so it multiplies the odds by 4: 4 to 4, or 1 to 1.</p>
      <p><b>1 to 1 is 50%.</b> Every round works this way: odds times the report's number.</p>
    </div>
    <p>Your answer implies a weight on the report of <b class="num">λ̂ = ${fmtLam(l)}</b>. A weight of 1 means you moved exactly as far as the report justifies. Above 1 you moved further, between 0 and 1 less far, below 0 the wrong way.</p>
    <p class="fine">Nobody needs to be exact. The game compares each round with a twin that has the same numbers, so arithmetic slips mostly cancel.</p>
    <div class="ans-row"><button type="button" class="btn solid" id="next">Start Part 1</button></div>
  </article>`;
  root.querySelector('#next').addEventListener('click', onNext);
}

// Dot rows: twin (open) and loaded (filled) lambda-hat on a shared scale.
function dotRows(pairs) {
  const X = l => ((l - LAM_MIN) / (LAM_MAX - LAM_MIN)) * 100;
  const axis = `<div class="dr axis"><span class="dr-l"></span><div class="dr-t">${[-1, 0, 1, 2, 3, 4].map(v =>
    `<span style="left:${X(v)}%">${v}</span>`).join('')}</div></div>`;
  return `<div class="dots" role="table" aria-label="Weight on the report, loaded round against its twin">${axis}
    ${pairs.map(p => {
      const a = X(p.N.lam), b = X(p.L.lam);
      return `<div class="dr" role="row"><span class="dr-l" role="rowheader">${CHANNELS[p.r.channel].name}${p.r.part === 2 ? (p.r.seen ? ' <small>seen</small>' : ' <small>new</small>') : ''}</span>
        <div class="dr-t" role="cell" aria-label="twin ${fmtLam(p.N.lam)}, loaded ${fmtLam(p.L.lam)}">
          <i class="cal" style="left:${X(1)}%"></i>
          <i class="seg" style="left:${Math.min(a, b)}%;width:${Math.abs(b - a)}%"></i>
          <i class="d n" style="left:${a}%"></i><i class="d l" style="left:${b}%"></i></div></div>`;
    }).join('')}</div>
    <div class="legend"><span class="lg"><i class="d l"></i>Loaded round</span><span class="lg"><i class="d n"></i>Neutral twin, same numbers</span><span class="lg"><i class="cal"></i>λ = 1, the Bayesian weight</span></div>`;
}

function roundTable(scored, part) {
  const rows = ROUNDS.filter(r => r.part === part && scored[r.id]).map(r => {
    const s = scored[r.id];
    return `<tr><td>${esc(r.q)}<small>${r.kind === 'loaded' ? CHANNELS[r.channel].name : 'neutral twin'}</small></td>
      <td class="num">${pct(s.bayes)}</td><td class="num">${pct(s.answer)}</td><td class="num">${fmtLam(s.lam)}</td></tr>`;
  }).join('');
  return `<div class="tablewrap"><table class="rt"><thead><tr><th>Round</th><th class="r">Bayes</th><th class="r">You</th><th class="r">λ̂</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function verdict(gap) {
  if (gap == null) return { s: 'warn', b: 'Not enough answers', t: '' };
  if (gap > 0.15) return { s: 'bad', b: 'The pull showed up', t: `On loaded rounds your weight sat ${gap.toFixed(2)} further from 1 than on their twins.` };
  if (gap < -0.15) return { s: 'good', b: 'Loaded rounds were closer to 1', t: `On loaded rounds your weight sat ${Math.abs(gap).toFixed(2)} closer to 1 than on their twins.` };
  return { s: 'warn', b: 'Little difference', t: `Loaded rounds and twins were within ${Math.abs(gap).toFixed(2)} of each other.` };
}

export function renderMirror(root, scored, onNext) {
  const S = summary(scored), v = verdict(S.p1?.gap);
  root.innerHTML = `<article class="card rcard">
    <p class="eyebrow">The mirror · Part 1</p>
    <div class="status" data-s="${v.s}"><b>${v.b}</b><span>${v.t} Three pairs is far too few to say anything about you; read it as a demonstration. <span class="notional">notional score</span></span></div>
    ${dotRows(S.pairs.filter(p => p.r.part === 1))}
    ${roundTable(scored, 1)}
    <p>Each loaded round had a twin with the same base rate and the same report strength. The soundtrack, the comment thread and the earlier story carried no evidence at all. If a dot moved away from 1 only on the loaded round, that was the feeling, not the numbers.</p>
    <p>One round pointed the other way: the ferry report was <i>reassuring</i>. An alarming story read a moment earlier can make good news count for less, which shows up as λ̂ below 1.</p>
    <div class="ans-row"><button type="button" class="btn solid" id="next">Start Part 2: feel it, name it, place it</button></div>
  </article>`;
  root.querySelector('#next').addEventListener('click', onNext);
}

export function renderResults(root, scored, checks, onRestart) {
  const S = summary(scored), v1 = verdict(S.p1?.gap), v2 = verdict(S.p2?.gap);
  const f = x => x == null ? '–' : fmtSigned(x);
  const counts = {};
  Object.values(checks || {}).forEach(c => { if (c?.word) counts[c.word] = (counts[c.word] || 0) + 1; });
  const words = Object.entries(counts).map(([w, n]) => (n > 1 ? `${w} ×${n}` : w));
  root.innerHTML = `<article class="card rcard">
    <p class="eyebrow">Results</p>
    <div class="twostat">
      <div class="status" data-s="${v1.s}"><b>Part 1: ${f(S.p1?.gap)}</b><span>Extra distance from λ = 1 on loaded rounds, before the check-in step.</span></div>
      <div class="status" data-s="${v2.s}"><b>Part 2: ${f(S.p2?.gap)}</b><span>The same, with feel, name and place before each answer.</span></div>
    </div>
    ${dotRows(S.pairs)}
    <dl class="readout">
      <dt>Part 2, channel seen before</dt><dd>${f(S.seen)} <span class="fine">(crowd)</span></dd>
      <dt>Part 2, new channels</dt><dd>${f(S.unseen)} <span class="fine">(grievance, body)</span></dd>
      <dt>Pull toward alarm, Part 1</dt><dd>${S.p1 ? fmtSigned(S.p1.pullGap, 0) : '–'} points vs twins</dd>
      <dt>Pull toward alarm, Part 2</dt><dd>${S.p2 ? fmtSigned(S.p2.pullGap, 0) : '–'} points vs twins</dd>
      <dt>Words you used</dt><dd>${words.length ? esc(words.join(', ')) : '–'}</dd>
    </dl>
    <p class="fine">All scores are this game's own construction <span class="notional">notional</span>. Part 2 comes after Part 1, so practice alone could shrink the gap. The shared link below reproduces this screen.</p>
    <h3>What Walberg's model predicts here</h3>
    <p>In the Emotional Priors model, a campaign can move belief by changing the weight on evidence instead of faking the evidence. The model predicts that training people to notice when their reactions are being moved should protect them on channels they were never trained on, while hardening one channel should not (hypothesis H4 in the working paper). The "new" row above is a toy version of that test. In the paper's simulation the transfer follows from how awareness is specified, so it is a prediction to test, not a finding.</p>
    ${roundTable(scored, 2)}
    <div class="ans-row"><button type="button" class="btn" id="copy2">Copy link to these results</button><button type="button" class="btn" id="again">Play again</button></div>
  </article>`;
  root.querySelector('#again').addEventListener('click', onRestart);
  return root.querySelector('#copy2');
}
