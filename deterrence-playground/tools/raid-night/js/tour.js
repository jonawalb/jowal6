// Guided walkthrough. It pauses the game while open and highlights the part of the page it describes.
const STEPS = [
  { t: 'The problem', el: 'fieldbox',
    b: 'Tonight a notional country defends four cities against three waves of drones, cruise missiles and ballistic missiles. The mix of each wave is modelled on a real raid: two nights over Ukraine and Iran\'s April 2024 attack on Israel. Most of the tracks are cheap; the weapons that stop the dangerous ones are not.' },
  { t: 'Read the tracks', el: 'fieldbox',
    b: 'Triangles are one-way attack drones: slow, many, and priced at tens of thousands of dollars. Diamonds are cruise missiles. Circles with long trails are ballistic missiles; they come in salvos, fall in seconds, and a dashed ring marks where each will land.' },
  { t: 'Three weapons', el: 'weapons',
    b: 'Guns and electronic warfare are cheap and plentiful but reach only the area around each city, and cannot stop a ballistic missile. Short-range interceptors cost tens of thousands of dollars each. Long-range interceptors reach almost the whole map and are the only good answer to ballistic missiles, at millions of dollars each, and there are only 22.' },
  { t: 'Engage', el: 'fieldbox',
    b: 'Choose a weapon (keys 1, 2, 3), then click or tap a track. The dashed circles show where that weapon reaches. Each site needs time to reload. From the keyboard, the arrow keys pick tracks in order of time to impact and Space fires. P pauses at any time.' },
  { t: 'Watch the exchange', el: 'sec-exchange',
    b: 'The panel keeps the running cost exchange: dollars spent on interceptors against the dollar value of the threats destroyed, at low and high published estimates. Leakers and damage are scored next to it, because the dollars leave out what a leaker destroys.' },
  { t: 'After the night', el: 'fieldbox',
    b: 'When wave 3 ends, a review replays the same seeded raids with two fire-control rules, cheapest-capable and best-weapon-first, and compares leakers, dollars and magazines. Copy the link to challenge someone with the same raids.' },
];

export function createTour(slot, { onOpen, onClose }) {
  let i = -1, hi = null;
  const card = document.createElement('div');
  card.className = 'tour'; card.hidden = true;
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Guided walkthrough');
  slot.appendChild(card);
  const mark = id => { hi?.classList.remove('tour-hi'); hi = document.getElementById(id) || document.querySelector('.' + id); hi?.classList.add('tour-hi'); };
  const show = () => {
    const s = STEPS[i];
    mark(s.el);
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.t}</h3><p>${s.b}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const n = i + Number(b.dataset.d);
      if (n >= STEPS.length) stop(); else { i = n; show(); }
    });
    card.querySelector('.solid').focus();
  };
  const start = () => { i = 0; card.hidden = false; onOpen(); show(); };
  const stop = () => { if (card.hidden) return; card.hidden = true; i = -1; mark(''); onClose(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) { e.stopPropagation(); stop(); } }, true);
  return { start, stop, get open() { return !card.hidden; } };
}
