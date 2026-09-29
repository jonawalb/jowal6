// Guided walkthrough: eight fixed setups, one or two per model, each with a short explanation.
export const STEPS = [
  { m: 'fearon95', title: 'War is costly, so a deal exists', set: { v: 'range', p: 0.5, ca: 0.1, cb: 0.1, opt: 0, div: 'cont' },
    body: 'Fearon starts here: because fighting destroys value, every x between p − c<sub>A</sub> and p + c<sub>B</sub> beats war for both sides. A rational explanation for war has to say why states fail to reach one of these deals.' },
  { m: 'fearon95', title: 'Hidden resolve makes war a calculated risk', set: { v: 'info', p: 0.4, ca: 0.1, cmax: 0.6, cbt: 0.1 },
    body: 'A cannot see B’s cost of war, and B would exaggerate it if asked. So A demands more than some types of B will accept, trading a risk of war for better terms. In this draw B’s cost is low and B fights.' },
  { m: 'powell06', title: 'Shifting power breaks bargains', set: { v: 'shift', p: 0.3, D: 0.4, d: 0.2, dl: 0.95 },
    body: 'Powell’s single condition: war comes when the per-period shift in power outruns the surplus that peace creates. Drag the point on the region plot to find the boundary.' },
  { m: 'brink', title: 'Brinkmanship with hidden resolve', set: { v: 'crisis', ff: 0.08, RI: 0.3, RII: 0.2, RIIp: 0.3, p: 0.85, q: 0.75 },
    body: 'Each escalation adds an autonomous risk of disaster. I cannot tell a bluffing II from a resolute one, so an irresolute II sometimes escalates and wins: the less resolved side can prevail.' },
  { m: 'fearon94', title: 'Audience costs tie hands', set: { a1: 3, a2: 0.5, v: 1, W1: 2, W2: 2 },
    body: 'A leader who escalates in public pays more for backing down the longer the crisis runs. The state with the stronger audience is less likely to back down once a crisis starts.' },
  { m: 'jervis78', title: 'The security dilemma', set: { v: 'game', cc: 4, dc: 3, dd: 2, cd: 1, q: 0.3, seq: 0, rep: 0 },
    body: 'In a Stag Hunt both states want mutual cooperation, but if each doubts the other, defecting pays. Lower the cost of being exploited (CD) and watch the trust needed fall.' },
  { m: 'kydd00', title: 'Reassurance by costly gesture', set: { p2: 0.1, a: 0.73, RN: 2, SN: 1, TM: 2, RM: 1, SM: 1 },
    body: 'At this level of mistrust no one cooperates in a single round. A first gesture sized between what a mean type would fake and what a nice type would risk lets nice types find each other.' },
  { m: 'slantchev03', title: 'Wars end when fighting stops teaching', set: { v: 'incomplete', t2: 's', I0: 1, I1: 1, dl2: 0.99 },
    body: 'A strong player 2 refuses early offers and fights two battles to prove its strength, then settles. The war lasts only as long as it still reveals information.' },
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
    apply(s);
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const n = i + Number(b.dataset.d); if (n >= STEPS.length) stop(); else { i = n; show(); } }; });
    card.querySelector('.solid').focus();
  };
  const start = () => { i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
