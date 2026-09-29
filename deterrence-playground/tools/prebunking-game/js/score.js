// Prebunking Game: scoring for the pre/post quiz and the training meters.
import { SETS, ORDER, FLAG_MAX } from '../data/quiz.js';
import { TECHNIQUES, METER } from '../data/techniques.js';

/** Items shown in a phase, in display order. o = 0: set A before, B after; o = 1: the reverse. */
export function itemsFor(phase, o) {
  const key = (phase === 'pre') === (o === 0) ? 'A' : 'B';
  return ORDER.map(i => SETS[key][i]);
}
export const setKey = (phase, o) => ((phase === 'pre') === (o === 0) ? 'A' : 'B');

/** Summary of one quiz: mean trust in manipulative and neutral items, flags, discernment. */
export function summarize(items, ratings) {
  const man = [], neu = [];
  items.forEach((it, i) => { const r = ratings[i]; if (r) (it.tech ? man : neu).push(r); });
  const mean = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
  const mM = mean(man), mN = mean(neu);
  return {
    nMan: man.length, nNeu: neu.length,
    manMean: mM, neuMean: mN,
    hits: man.filter(r => r <= FLAG_MAX).length,
    falseAlarms: neu.filter(r => r <= FLAG_MAX).length,
    discern: mM != null && mN != null ? mN - mM : null,
  };
}

/** Pre vs post comparison and a plain-language verdict. */
export function compare(pre, post) {
  const dMan = post.manMean - pre.manMean;
  const dNeu = post.neuMean - pre.neuMean;
  const dDis = post.discern - pre.discern;
  let s = 'warn', head, text;
  if (dMan <= -0.5 && dNeu > -0.5 && dDis > 0) {
    s = 'good'; head = 'Sharper, not just warier';
    text = 'You trusted the manipulative posts less after training and kept trusting the plain ones.';
  } else if (dMan <= -0.5 && dNeu <= -0.5) {
    head = 'Warier of everything';
    text = 'You trusted the manipulative posts less, but the plain ones too. Researchers call this a shift in response bias: it is not the same as telling the two apart better.';
  } else if (dDis > 0.25) {
    s = 'good'; head = 'Better at telling them apart';
    text = 'The gap between your trust in plain and manipulative posts grew after training.';
  } else if (dDis < -0.25) {
    s = 'bad'; head = 'No gain this round';
    text = 'The gap between your trust in plain and manipulative posts shrank. The second set may have been harder for you, or the techniques did not stick.';
  } else {
    head = 'About the same';
    text = 'Your ratings moved little. If you already flagged most manipulative posts on the pre-test, there was not much room to improve.';
  }
  return { dMan, dNeu, dDis, s, head, text };
}

/** Per-technique pre vs post rating for the six manipulative items. */
export function byTechnique(o, a, b) {
  const pre = itemsFor('pre', o), post = itemsFor('post', o);
  return TECHNIQUES.map(t => {
    const i = pre.findIndex(it => it.tech === t.key), j = post.findIndex(it => it.tech === t.key);
    return { t, pre: a[i] || null, post: b[j] || null };
  });
}

/** Meter values after the first n training choices. */
export function meters(choices, n = choices.length) {
  let f = METER.start.followers, c = METER.start.cred;
  for (let i = 0; i < n; i++) {
    const k = choices[i];
    if (k == null) continue;
    const kind = TECHNIQUES[i].options[k].kind;
    const m = METER[kind];
    f = Math.round(f * m.followers);
    c = Math.max(0, Math.min(100, c + m.cred));
  }
  return { followers: f, cred: c };
}
