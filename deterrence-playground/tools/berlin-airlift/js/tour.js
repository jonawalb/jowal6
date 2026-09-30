// Guided walkthrough: six cards that point at the parts of the page. It does not change the game.
const STEPS = [
  { t: 'You run the airlift', id: 'statcard', b: 'It is 26 June 1948 and the Soviet blockade has closed every land route into West Berlin. Your job is to fly in the city\'s minimum, 4,500 tons a day at first, until the blockade lifts on 12 May 1949. Fly a day, a week or four weeks at a time. The bars show the city\'s food and coal reserves and how much patience Washington and London have left.' },
  { t: 'Three corridors, three airfields', id: 'mapcard', b: 'The 1945 agreement guarantees three corridors, each twenty miles wide. American aircraft from Rhein-Main and Wiesbaden fly the long southern corridor to Tempelhof; aircraft in the British zone fly the short northern one to Gatow, and later Tegel. Everyone flies home through the center. The bars under each airfield show landings against slots.' },
  { t: 'Read the forecast before you fly', id: 'sec-fore', b: 'This table runs your current plan through one day of good weather, cloud and fog. It names the binding limit. Early on it is aircraft; by August it is Tempelhof\'s landing slots. When slots bind, more aircraft do not help. Bigger aircraft, more runways or a shorter route do.' },
  { t: 'Aircraft and bases', id: 'sec-fleet', b: 'C-54 Skymasters carry about ten tons, C-47s about three, and both take one landing slot. From 21 August you can base C-54s at Fassberg, 55 minutes from Berlin, where each one does the work of about one and a half in the U.S. zone. Washington decides how many C-54s you get; events will ask.' },
  { t: 'Crews and the 200-hour inspection', id: 'sec-crews', b: 'The plan assumes 90 flying hours per crew a month. You can surge to 150, but fatigue builds and accidents rise. Every C-54 needs a major inspection each 200 flying hours. When the depots fall behind in winter, switch on field inspections or watch aircraft sit grounded.' },
  { t: 'Coal, food and runways', id: 'sec-cargo', b: 'About two-thirds of what the real airlift flew was coal. Set the mix so neither reserve runs dry, and remember that winter needs coal most. Some lift has to carry construction material: Tempelhof\'s new runways and Tegel only open once enough has been flown in.' },
  { t: 'Compare with 1948–49', id: 'chartcard', b: 'Your daily tonnage is drawn against the monthly averages from the USAFE summary and against sourced days such as the Easter Parade, 12,941 tons in 24 hours. Tick Autopilot to watch the season flown with the historical choices, then start a new game and try to beat it.' },
];

export function createTour(anchor) {
  let i = -1, lit = null;
  const card = document.createElement('div');
  card.className = 'tour'; card.hidden = true;
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Guided walkthrough');
  anchor.after(card);
  const clear = () => { if (lit) lit.classList.remove('hl'); lit = null; };
  const stop = () => { clear(); card.hidden = true; i = -1; anchor.after(card); };
  const show = () => {
    const s = STEPS[i];
    clear(); lit = document.getElementById(s.id); lit?.classList.add('hl');
    if (lit) { if (s.id === 'statcard') lit.after(card); else lit.before(card); }
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.t}</h3><p>${s.b}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const n = i + Number(b.dataset.d); if (n >= STEPS.length) stop(); else { i = n; show(); } });
    card.querySelector('.solid').focus({ preventScroll: true });
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start: () => { i = 0; card.hidden = false; show(); }, stop };
}
