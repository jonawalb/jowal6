// Guided walkthrough for Extended Deterrence. Each step sets a package and stakes on top of the defaults.
const none = { treaty: 0, statements: 0, tripwire: 0, sharing: 0 };

export const STEPS = [
  { title: 'Why would a patron fight for someone else?',
    body: 'A patron has promised to defend an ally. The challenger does not know how much the ally is worth to the patron. With no commitment devices the patron fights only if the ally is worth more than the war would cost, and the challenger thinks that is unlikely. Most challengers attack.',
    set: { dev: { ...none } } },
  { title: 'Boston for Bonn',
    body: 'Once the challenger can strike the patron’s own cities, the war costs more than the ally could ever be worth. Drag the Boston-for-Bonn chart or raise w past 1: credibility from interests alone falls to zero. This is the credibility problem a patron faces once the challenger can strike its homeland.',
    set: { dev: { ...none }, w: 1.2 } },
  { title: 'Tie your hands',
    body: 'A treaty and repeated public pledges make walking away costly. Now the patron fights whenever its value of the ally clears a lower bar. These devices cost almost nothing in peacetime. Fearon (1997) calls this tying hands.',
    set: { dev: { ...none, treaty: 1, statements: 1 } } },
  { title: 'Put troops in the way',
    body: 'A forward force cannot hold the ally alone, but an attack on it engages the patron at once. That is Schelling’s tripwire. It also stiffens local defense, which Huth (1988) found matters. Credibility jumps, and so does entrapment: the patron now fights some wars it would not choose.',
    set: { dev: { ...none, treaty: 1, statements: 1, tripwire: 1 } } },
  { title: 'Money talks, if the challenger listens',
    body: 'Turn on screening. A patron that pays a large peacetime cost reveals that it values the ally at least that much, so the challenger rules out the lowest values. This is Fearon’s sinking-costs logic, and it only works if the challenger draws the inference.',
    set: { dev: { ...none, treaty: 1, statements: 1, tripwire: 1 }, screen: 1 } },
  { title: 'Nuclear sharing',
    body: 'With screening off again, add nuclear sharing. Sharing weapons and planning ties hands further and adds a small, notional chance that escalation escapes the patron’s control. Treat that number with care: Fuhrmann and Sechser (2014) find that stationing nuclear weapons on an ally’s soil adds no measurable deterrence beyond a formal alliance.',
    set: { dev: { treaty: 1, statements: 1, tripwire: 1, sharing: 1 } } },
  { title: 'Abandonment or entrapment',
    body: 'The lower chart plots every package. Moving up the frontier buys deterrence with money and with entrapment risk (bigger circles). Snyder (1984) called this the alliance security dilemma: a choice between supporting an ally and holding back, caught between fear of abandonment and fear of entrapment in the ally’s war. Click any circle to load that package.',
    set: { dev: { ...none, treaty: 1 } } },
];

export function createTour(root, apply) {
  let i = -1;
  const card = document.createElement('div');
  card.className = 'tour';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guided walkthrough');
  root.appendChild(card);
  const show = () => {
    const s = STEPS[i];
    apply(s.set);
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const n = i + Number(b.dataset.d);
      if (n >= STEPS.length) stop(); else { i = n; show(); }
    });
    card.querySelector('.solid').focus();
  };
  const start = () => { i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
