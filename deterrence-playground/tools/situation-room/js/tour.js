// Guided walkthrough. Every number and camp below is read from data/srs.js (Cheap Talk SRS1 + SRS2).
import { PEOPLE } from './model.js';

const pid = n => PEOPLE.findIndex(p => p.n === n);
const STEPS = [
  { title: 'The night before the quarantine speech',
    body: '21 October 1962. Press Play to replay the meeting turn by turn. On issue a, Douglas Dillon (the source labels him by his first name, Clarence) wanted the blockade to stop all military equipment; Kennedy and McNamara argued for offensive missile equipment only. The coders mark the broader blockade as the hawk side and Kennedy as leaning against it.',
    set: { reset: true, v: 'replay', m: '506', i: 'issue_506a', t: 0 } },
  { title: 'A President against his experts',
    body: 'June 1957. Eisenhower leans toward a test-ban arrangement while Lewis Strauss, Edward Teller and Ernest Lawrence argue against it. The issue index codes the ban as the dove side, and the side refusing it as the one worried about looking soft on communism, following the project rule for arms control with Moscow.',
    set: { v: 'replay', m: '20401', i: 'issue_20401a' } },
  { title: 'Vietnam in the record',
    body: 'December 1967. General Wheeler and Ambassador Bunker back a 72-hour B-52 operation against sanctuaries in Cambodia; McNamara and Rusk oppose it. Johnson does not come down on a side, so POTUS SP is 0. Only 10 meetings in this sample name Vietnam; the project’s Vietnam series is not yet validated.',
    set: { v: 'replay', m: '21560', i: 'issue_21560a' } },
  { title: 'Thirty-five years of meetings',
    body: 'All 220 coded meetings by year. Coders found in-room disagreement in 108. Orange squares had a fight; blue-grey ones carry only a Level-2 advice issue; a dark dot marks a meeting where the President leaned on an issue. Select any square to replay it.',
    set: { v: 'timeline' } },
  { title: 'Hawks or doves?',
    body: 'On 71 hawk–dove issues the President came down on a side: 32 times with the hawks, 39 with the doves. On issues where one side feared looking soft on communism, he split 32 to 32. This is his lean in the meeting, not the policy that followed.',
    set: { v: 'patterns' } },
  { title: 'Who argued with whom',
    body: 'Lines join people coded on opposite sides of the same issue. Eisenhower and John Foster Dulles top the list at 9 issues, yet they were on the same side of 11: frequent co-attendance drives both counts. Switch to "Same side" to compare.',
    set: { v: 'network', nm: 'opp', p: null } },
  { title: 'One adviser’s record',
    body: 'Each speaker has a dossier: meetings, every issue they took a side on, and how often the President’s lean matched theirs. For Dulles it matched on 11 of 20. Select any issue in the list to replay the meeting where it came up.',
    set: { v: 'people', p: pid('John Dulles') } },
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
    apply(s.set);
    card.innerHTML = `<div class="tour-h"><span>Walkthrough ${i + 1} / ${STEPS.length}</span><button type="button" class="x" aria-label="Close walkthrough">×</button></div>
      <h3>${s.title}</h3><p>${s.body}</p>
      <div class="tour-nav"><button type="button" class="btn" ${i === 0 ? 'disabled' : ''} data-d="-1">Back</button>
      <button type="button" class="btn solid" data-d="1">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.x').onclick = stop;
    card.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const n = i + Number(b.dataset.d); if (n >= STEPS.length) stop(); else { i = n; show(); } }; });
    card.querySelector('.solid').focus({ preventScroll: true });
    card.scrollIntoView({ block: 'nearest' });
  };
  const start = () => { i = 0; card.hidden = false; show(); };
  const stop = () => { card.hidden = true; i = -1; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) stop(); });
  return { start, stop };
}
