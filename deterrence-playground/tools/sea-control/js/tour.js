// Guided walkthrough (pattern from tools/crisis-stability/js/tour.js). Each step loads a preset plus any
// overrides; everything else returns to that preset's values.
import { BASE, PRESETS } from '../data/presets.js';

const P = (k, extra = {}) => ({ preset: k, ...BASE, ...PRESETS.find(p => p.k === k).p, ...extra });

export const STEPS = [
  { title: 'Two moves',
    body: 'The dominant navy splits its budget between a battle fleet and distributed forces. The challenger sees the split and picks the answer that suits it best: battle, a fleet in being, or sea denial. The chart shows how much sea traffic the dominant navy keeps open at every split. Drag the handle.',
    set: P('precision', { m: 0.7 }) },
  { title: 'Mahan\'s world',
    body: 'Close rivals and weak denial weapons. The challenger has a real chance in battle, so it fights until the battle fleet is large, and the best mix puts most of the budget there. This is the world Mahan described: command comes from "that overbearing power on the sea which drives the enemy\'s flag from it" (p. 138).',
    set: P('mahan', { m: 0.5 }), scroll: 'maincard' },
  { title: 'The challenger refuses battle',
    body: 'Make the dominant navy stronger and let the challenger value its fleet. It stops offering battle and keeps its fleet in being, "refusing what Nelson called a regular battle" (Corbett, pp. 224–225). The best mix holds just enough battle fleet to contain it. Push further and the challenger turns to denial against a thinner escort force.',
    set: P('corbett', { m: 0.65 }), scroll: 'maincard' },
  { title: 'Cheap denial',
    body: 'Give the challenger cheap mines, submarines and missiles. It switches to denial as soon as the battle fleet is big enough to make fighting a bad bet. From there on, every share of budget moved into the battle fleet closes traffic, because it comes out of the escorts and sensors that counter denial. The best mix is now mostly distributed forces, as the paper\'s hypothesis H3 predicts.',
    set: P('precision', { m: 0.7 }), scroll: 'maincard' },
  { title: 'Insurers close the lane',
    body: 'Walberg\'s paper argues that a challenger can close a sea lane without defeating the navy, by pushing losses past the point where war-risk insurers withdraw. Here the toggle is on. Without it, the best mix would keep about three-quarters of traffic open; with it, keeping losses under the threshold takes so many escorts that the battle fleet shrinks and the challenger fights instead.',
    set: P('insure', { m: 0.5 }), scroll: 'maincard' },
  { title: 'Doctrinal lock-in',
    body: 'Now the navy plans half the time for the battle it prefers and values capital ships for their own sake. It buys far more battle fleet than the best mix. The challenger still answers with denial, so the navy keeps less traffic open. This is the paper\'s lock-in: the force the institution wants is not the force the threat calls for.',
    set: P('lockin', { m: 0.65 }), scroll: 'maincard' },
];

export function createTour(root, apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  root.prepend(card);
  const show = () => {
    const s = STEPS[i];
    apply(JSON.parse(JSON.stringify(s.set)));
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const n = i + Number(b.dataset.d);
      if (n >= STEPS.length) stop(); else { i = n; show(); }
    });
    card.querySelector('.solid').focus({ preventScroll: true });
    card.scrollIntoView({ block: 'nearest' });
  };
  const start = () => { i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
