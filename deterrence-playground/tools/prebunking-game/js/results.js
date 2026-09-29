// Prebunking Game: results screen. The player's own score and the published findings sit in two
// separate, differently styled cards so the two are never read as one measurement.
import { EFFECTS, SOURCES, CAVEATS } from '../data/research.js';
import { postHtml, esc } from './post.js';
import { itemsFor, summarize, compare, byTechnique, setKey } from './score.js';
import { TECHNIQUES } from '../data/techniques.js';

const f1 = v => (v == null || Number.isNaN(v) ? '–' : v.toFixed(1));
const sg = v => (v == null || Number.isNaN(v) ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(1));
const TNAME = Object.fromEntries(TECHNIQUES.map(t => [t.key, t.name]));

function bar(v, cls) {
  const w = v == null ? 0 : ((v - 1) / 6) * 100;
  return `<span class="tb"><i class="${cls}" style="width:${w.toFixed(1)}%"></i></span>`;
}

export function renderResults(host, S, act) {
  const preItems = itemsFor('pre', S.o), postItems = itemsFor('post', S.o);
  const hasPre = S.a.every(Boolean), hasPost = S.b.every(Boolean);
  const pre = summarize(preItems, S.a), post = summarize(postItems, S.b);
  const cmp = hasPre && hasPost ? compare(pre, post) : null;
  const rows = [
    ['Trust in manipulative posts', 'mean of 6, lower is better', pre.manMean, post.manMean, 'b-man'],
    ['Trust in plain posts', 'mean of 3, should stay high', pre.neuMean, post.neuMean, 'b-neu'],
  ];
  host.innerHTML = `<div class="card screen results">
    <p class="eyebrow">Your score in this game</p>
    <h2 class="scr-h">${cmp ? esc(cmp.head) : hasPost ? 'Post-test only' : 'Finish the post-test to see results'}</h2>
    ${cmp ? `<div class="status" data-s="${cmp.s}"><b>Discernment change ${sg(cmp.dDis)}</b><span>${esc(cmp.text)}</span></div>` : '<p class="fine">You skipped the pre-test, so there is nothing to compare against. Restart to play all four stages.</p>'}
    <div class="tablewrap"><table class="res">
      <thead><tr><th>Measure</th><th class="num">Before</th><th class="num">After</th><th class="hide-s">On the 1–7 scale</th></tr></thead>
      <tbody>
      ${rows.map(([n, s, a, b, c]) => `<tr><td>${n}<small>${s}</small></td><td class="num">${hasPre ? f1(a) : '–'}</td><td class="num">${f1(b)}</td>
        <td class="hide-s">${hasPre ? bar(a, c + ' pre') : ''}${bar(b, c)}</td></tr>`).join('')}
      <tr><td>Discernment<small>plain minus manipulative, higher is better</small></td><td class="num">${hasPre ? sg(pre.discern) : '–'}</td><td class="num">${sg(post.discern)}</td><td class="hide-s"></td></tr>
      <tr><td>Manipulative posts flagged<small>rated 1–3</small></td><td class="num">${hasPre ? pre.hits + '/6' : '–'}</td><td class="num">${post.hits}/6</td><td class="hide-s"></td></tr>
      <tr><td>Plain posts flagged<small>false alarms, rated 1–3</small></td><td class="num">${hasPre ? pre.falseAlarms + '/3' : '–'}</td><td class="num">${post.falseAlarms}/3</td><td class="hide-s"></td></tr>
      </tbody></table></div>
    ${hasPre ? `<p class="eyebrow">By technique: your trust rating, before → after</p>
    <ul class="bytech">${byTechnique(S.o, S.a, S.b).map(x => `<li><span>${x.t.name}</span><span class="num">${x.pre ?? '–'} → ${x.post ?? '–'}</span></li>`).join('')}</ul>` : ''}
    <p class="fine">Your pre-test used set ${setKey('pre', S.o)} and your post-test set ${setKey('post', S.o)}, assigned at random. The sets are different posts and have not been tested for difficulty, so part of any change can come from the posts themselves. Nine ratings per test is a very small sample.</p>
    <details class="review"><summary>Review every post and its technique</summary>
      ${[['Pre-test', preItems, S.a], ['Post-test', postItems, S.b]].map(([h, its, R]) => `<p class="eyebrow">${h}</p><div class="rv">${its.map((it, k) =>
        `<div class="rv-i">${postHtml(it)}<p class="rv-m"><span class="pill">${it.tech ? TNAME[it.tech] : 'No technique'}</span> You rated it <b>${R[k] ?? '–'}</b>. ${esc(it.why)}</p></div>`).join('')}</div>`).join('')}
    </details>
    <div class="acts-row"><button type="button" class="btn" id="again">Play again</button></div>
  </div>
  <div class="card screen research" id="research">
    <p class="eyebrow">What the published research found · a different game</p>
    <h2 class="scr-h">Bad News in the studies</h2>
    <p>These numbers come from studies of the original <i>Bad News</i> game (about 15 minutes of play) with their own test items. <b>They are not your score, and your score cannot be compared with them.</b> This tool is a short game written for this site. It has not been validated.</p>
    <ul class="effects">${EFFECTS.map(e => `<li><b>${esc(e.label)}</b><q>${e.q}</q><cite><a href="${SOURCES[e.src].url}" target="_blank" rel="noopener">${esc(SOURCES[e.src].cite)}</a>, ${e.where}</cite></li>`).join('')}</ul>
    <p class="eyebrow">Caveats the literature states</p>
    <ul class="effects cav">${CAVEATS.map(e => `<li><q>${e.q}</q><cite><a href="${SOURCES[e.src].url}" target="_blank" rel="noopener">${esc(SOURCES[e.src].cite)}</a>, ${e.where}</cite></li>`).join('')}</ul>
    <p class="fine">In these studies a lower reliability rating for the fake items after play counts as an inoculation effect; d is Cohen’s standardized mean difference.</p>
  </div>`;
  host.querySelector('#again').onclick = () => act.restart();
}
