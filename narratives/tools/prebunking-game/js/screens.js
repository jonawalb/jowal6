// Non-round screens: intro with body check-in, practice feedback, the mirror after Part 1, final results.

import { CHECKIN, CHANNELS, PRACTICE, ROUNDS } from '../data/rounds.js';
import { bayes, lambdaHat, summary, readLam, fmtLam, fmtSigned, LAM_MIN, LAM_MAX } from './score.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = x => `${Math.round(x)}%`;

export function renderIntro(root, st, onStart, onExample) {
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
    <div class="ans-row go-row"><button type="button" class="btn solid" id="go">Start with a practice round</button>
    <button type="button" class="btn" id="ex-intro">See an example result</button>
    <span class="fine">About five minutes to play. One round uses optional sound; turn it on in the panel.</span></div>
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
  root.querySelector('#ex-intro').addEventListener('click', onExample);
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
const rowName = p => p.skip ? `${CHANNELS[p.r.channel].name} <small>sound off, not scored</small>`
  : CHANNELS[p.r.channel].name + (p.r.part === 2 ? (p.r.seen ? ' <small>seen</small>' : ' <small>new</small>') : '');

function dotRows(pairs) {
  const X = l => ((l - LAM_MIN) / (LAM_MAX - LAM_MIN)) * 100;
  const axis = `<div class="dr axis"><span class="dr-l"></span><div class="dr-t">${[-1, 0, 1, 2, 3, 4].map(v =>
    `<span style="left:${X(v)}%">${v}</span>`).join('')}</div></div>`;
  return `<div class="dots" id="dots" role="table" aria-label="Weight on the report, loaded round against its twin">
    <p class="axis-t">Weight you gave the report (λ̂). At 1 you moved as far as the numbers justify; right of 1, too far; left of 1, not far enough; below 0, the wrong way.</p>
    ${axis}
    ${pairs.map((p, k) => {
      const a = X(p.N.lam), b = X(p.L.lam);
      const head = (k === 0 || pairs[k - 1].r.part !== p.r.part) && pairs.some(q => q.r.part !== p.r.part)
        ? `<div class="dr grp" role="row"><span class="dr-l" role="rowheader">Part ${p.r.part}${p.r.part === 2 ? ': after feel, name, place' : ': before the check-in'}</span></div>` : '';
      return `${head}<div class="dr${p.skip ? ' skip' : ''}" role="row"><span class="dr-l" role="rowheader">${rowName(p)}</span>
        <div class="dr-t" role="cell" aria-label="twin ${fmtLam(p.N.lam)}, loaded ${fmtLam(p.L.lam)}">
          <i class="cal" style="left:${X(1)}%"></i>
          <i class="seg" style="left:${Math.min(a, b)}%;width:${Math.abs(b - a)}%"></i>
          <i class="d n" style="left:${a}%"></i><i class="d l" style="left:${b}%"></i></div></div>`;
    }).join('')}</div>
    <div class="legend"><span class="lg"><i class="d l"></i>Round with an outside pull</span><span class="lg"><i class="d n"></i>Neutral twin, same numbers</span><span class="lg"><i class="cal"></i>λ = 1, the weight the numbers justify</span></div>`;
}

// Round table, ordered by pair: the loaded round, then its twin.
function roundTable(scored, part, skip = []) {
  const groups = ROUNDS.filter(r => r.part === part && r.kind === 'loaded' && scored[r.id] && scored[r.twin]).map(r => {
    const tw = ROUNDS.find(x => x.id === r.twin);
    const row = (x, tag) => {
      const s = scored[x.id];
      return `<tr><td>${esc(x.q)}<small>${tag}</small></td><td class="num">${pct(s.bayes)}</td><td class="num">${pct(s.answer)}</td><td class="num">${fmtLam(s.lam)}</td></tr>`;
    };
    const nm = CHANNELS[r.channel].name;
    return `<tbody><tr class="pair-h"><th colspan="4" scope="rowgroup">${nm} vs its twin${skip.includes(r.id) ? ' (sound off, not scored)' : ''}</th></tr>
      ${row(r, `${nm}, outside pull`)}${row(tw, 'neutral twin')}</tbody>`;
  }).join('');
  return `<div class="tablewrap full-only"><table class="rt"><thead><tr><th>Round</th><th class="r">Bayes</th><th class="r">You</th><th class="r" title="Implied weight on the report; 1 = what the numbers justify">λ̂</th></tr></thead>${groups}</table></div>`;
}

function verdict(gap) {
  if (gap == null) return { s: 'warn', b: 'Not enough answers', t: '' };
  if (gap > 0.15) return { s: 'bad', b: 'The pull showed up', t: `On rounds with an outside pull your weight sat ${gap.toFixed(2)} further from 1 than on their twins.` };
  if (gap < -0.15) return { s: 'good', b: 'Loaded rounds were closer to 1', t: `On rounds with an outside pull your weight sat ${Math.abs(gap).toFixed(2)} closer to 1 than on their twins.` };
  return { s: 'warn', b: 'Little difference', t: `Rounds with an outside pull and their twins were within ${Math.abs(gap).toFixed(2)} of each other.` };
}

/** One plain-English clause per pair where the loaded round and its twin differ by more than 0.15. */
export function pairReading(pairs) {
  const out = pairs.filter(p => !p.skip && Math.abs(p.L.lam - p.N.lam) > 0.15).map(p => {
    const nm = CHANNELS[p.r.channel].name.toLowerCase();
    return `on the ${nm} round you ${readLam(p.L.lam)} (weight ${fmtLam(p.L.lam)}, twin ${fmtLam(p.N.lam)})`;
  });
  if (!out.length) return 'Each round with an outside pull landed close to its twin.';
  const s = out.join('; ');
  return s[0].toUpperCase() + s.slice(1) + '.';
}

/** Plain-English result sentence for one part. */
export function partSentence(S, part) {
  const sum = part === 1 ? S.p1 : S.p2;
  if (!sum) return 'Not enough answers yet.';
  const ps = S.pairs.filter(p => p.r.part === part);
  const lead = sum.gap > 0.15 ? 'The outside pull moved your answers.'
    : sum.gap < -0.15 ? 'Your answers sat nearer the textbook weight when an outside pull was present.'
      : 'The outside pull made little difference to your answers.';
  return `${lead} ${pairReading(ps)}`;
}

export function changeSentence(S) {
  if (!S.p1 || !S.p2) return '';
  const a = S.p1.gap, b = S.p2.gap;
  const dir = Math.abs(b) < Math.abs(a) - 0.05 ? 'shrank' : Math.abs(b) > Math.abs(a) + 0.05 ? 'grew' : 'barely changed';
  return `The extra distance on rounds with an outside pull ${dir}: ${fmtSigned(a)} in Part 1, ${fmtSigned(b)} in Part 2 (nearer zero means the pull moved you less).`;
}

const exampleBanner = () => `<div class="ex-banner" role="note"><b>Example answers, not yours.</b> <span>Invented answers that show what a result looks like. They assume sound was on for the soundtrack round. Play to see your own.</span>
  <button type="button" class="btn" id="ex-back">Back to your game</button></div>`;

export function renderMirror(root, scored, onNext, opts = {}) {
  const S = summary(scored, { skip: opts.skip }), v = verdict(S.p1?.gap);
  const offNote = (opts.skip || []).includes('r1')
    ? '<p>You left sound off, so the soundtrack round had no pull. It is shown but left out of the averages.</p>' : '';
  root.innerHTML = `<article class="card rcard" id="mirror">
    ${opts.example ? '<p class="eyebrow"><span class="ex-chip">Example</span> The mirror · Part 1</p>' : '<p class="eyebrow">The mirror · Part 1</p>'}
    <div class="status" data-s="${v.s}"><b>${v.b}</b><span>${v.t} Three pairs is far too few to say anything about you; read it as a demonstration. <span class="notional">notional score</span></span></div>
    <p class="plain" id="mirror-read">${partSentence(S, 1)}</p>
    ${dotRows(S.pairs.filter(p => p.r.part === 1))}
    ${roundTable(scored, 1, opts.skip)}
    ${offNote}
    <p>Each loaded round had a twin with the same base rate and the same report strength. The soundtrack, the comment thread and the earlier story carried no evidence at all. If a dot moved away from 1 only on the loaded round, the likeliest cause is the feeling, not the numbers, though the twins also differ in topic and one answer per round is noisy.</p>
    <p class="full-only">One round pointed the other way: the ferry report was <i>reassuring</i>. An alarming story read a moment earlier may make good news count for less (a mood-congruence prediction, not a tested result), which would show up as λ̂ below 1.</p>
    <div class="ans-row"><button type="button" class="btn solid" id="next">Start Part 2: feel it, name it, place it</button></div>
  </article>`;
  root.querySelector('#next').addEventListener('click', onNext);
}

export function renderResults(root, scored, checks, onRestart, opts = {}) {
  const S = summary(scored, { skip: opts.skip }), v1 = verdict(S.p1?.gap), v2 = verdict(S.p2?.gap);
  const f = x => x == null ? '–' : fmtSigned(x);
  const counts = {};
  Object.values(checks || {}).forEach(c => { if (c?.word) counts[c.word] = (counts[c.word] || 0) + 1; });
  const words = Object.entries(counts).map(([w, n]) => (n > 1 ? `${w} ×${n}` : w));
  root.innerHTML = `<article class="card rcard" id="results">
    ${opts.example ? exampleBanner() : ''}
    <p class="eyebrow">${opts.example ? '<span class="ex-chip">Example</span> ' : ''}Results</p>
    <p class="plain" id="change-read">${changeSentence(S)}</p>
    <div class="twostat">
      <div class="status" data-s="${v1.s}"><b>Part 1: ${f(S.p1?.gap)}</b><span>Extra distance from λ = 1 on rounds with an outside pull, before the check-in step. <span class="notional">notional</span></span></div>
      <div class="status" data-s="${v2.s}"><b>Part 2: ${f(S.p2?.gap)}</b><span>The same, with feel, name and place before each answer. <span class="notional">notional</span></span></div>
    </div>
    <p class="plain">Part 1: ${partSentence(S, 1).replace(/^./, c => c.toLowerCase())}</p>
    <p class="plain">Part 2: ${partSentence(S, 2).replace(/^./, c => c.toLowerCase())}</p>
    ${dotRows(S.pairs)}
    <dl class="readout">
      <dt>Part 2, channel seen before</dt><dd>${f(S.seen)} <span class="fine">(crowd)</span></dd>
      <dt>Part 2, new channels</dt><dd>${f(S.unseen)} <span class="fine">(grievance, body)</span></dd>
      <dt class="full-only">Pull toward yes, Part 1</dt><dd class="full-only">${S.p1 ? fmtSigned(S.p1.pullGap, 0) : '–'} points vs twins</dd>
      <dt class="full-only">Pull toward yes, Part 2</dt><dd class="full-only">${S.p2 ? fmtSigned(S.p2.pullGap, 0) : '–'} points vs twins</dd>
      <dt>Words you used</dt><dd>${words.length ? esc(words.join(', ')) : '–'}</dd>
    </dl>
    <p class="fine">All scores are this game's own construction <span class="notional">notional</span>. Part 2 comes after Part 1, so practice alone could shrink the gap. ${opts.example ? '' : 'The shared link below reproduces this screen.'}</p>
    <h3>What Walberg's model predicts here</h3>
    <p>In the Emotional Priors model (an unpublished working paper), a campaign can move belief by changing the weight on evidence instead of faking the evidence. The model predicts that training people to notice when their reactions are being moved should protect them on channels they were never trained on, while hardening one channel should not (hypothesis H4 in the working paper). The "new channels" row above is a toy version of that test. In the paper's simulation the transfer follows from how awareness is specified, so it is a prediction to test, not a finding.</p>
    ${roundTable(scored, 2)}
    <div class="ans-row">${opts.example
      ? '<button type="button" class="btn solid" id="ex-back2">Back to your game</button>'
      : '<button type="button" class="btn" id="copy2">Copy link to these results</button><button type="button" class="btn" id="again">Play again</button>'}</div>
  </article>`;
  if (opts.example) {
    root.querySelectorAll('#ex-back, #ex-back2').forEach(b => b.addEventListener('click', opts.onBack));
    return null;
  }
  root.querySelector('#again').addEventListener('click', onRestart);
  return root.querySelector('#copy2');
}
