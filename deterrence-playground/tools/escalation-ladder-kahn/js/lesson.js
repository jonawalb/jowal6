// "Learn to play": a hands-on first game on the Cuban Missile Crisis, using the shared lesson component.
// The old walkthrough (fixed ladder states) is folded in here: the ladder and its thresholds, Cuba's climb, the U-2
// that nobody ordered, retrying from the allied side, leaving the record, 1,000 futures and the critiques.
// `api` comes from app.js: { state: () => state, begin: () => void } (begin resets to Cuba, step 1, no comparison).
import { learnButton, runLesson } from '../../../shared/js/learn.js';

const SLUG = 'escalation-ladder-kahn';
const $ = s => document.querySelector(s);
const shown = el => !!el && !el.hidden && el.offsetParent !== null;

export const SHEET = {
  title: "Kahn's Escalation Ladder: the rules",
  goal: 'Two ways to use the page. <b>Read history:</b> step through a real nuclear crisis and see which of Herman Kahn\'s 44 rungs each step reached. <b>Retry from the allied side:</b> make the U.S. or allied decisions yourself and try to end the crisis in a settlement, with the model\'s "war or worse" share as low as you can keep it.',
  controls: [
    ['Crisis buttons', 'Pick a crisis. "Change crisis" reopens the full list.'],
    ['Back / Next, ← →', 'Step through the crisis. The numbered dots jump to a step.'],
    ['Compare with', 'Overlay a second crisis in orange on the ladder and the path chart.'],
    ['Click a rung', 'See which crises in this tool reached that rung.'],
    ['Retry from the allied side', 'Play the crisis: choose among options that were really on the table.'],
    ['Run 1,000 futures', 'After you leave the record, replay the branch 1,000 times to see odds instead of one roll.'],
    ['Edit the model', 'Change any of the notional numbers behind the outcome bar.'],
    ['Esc', 'Leave the tutorial or close this sheet.'],
  ],
  ideas: [
    'Jumping several rungs in one move costs extra risk for every rung skipped. Small steps are safer than big ones.',
    'Climbing is easier than coming down: higher on the ladder, the model slides toward war faster than it slides back.',
    'A choice that is itself a deal (a pledge, a trade) pulls the odds toward settlement; one that leaves the dispute open pulls them toward standoff.',
    'Leaving the record hands the crisis to dice. One branch is one roll; "Run 1,000 futures" shows how often a policy ends badly.',
    'Real crises jump, stall and come back down. A U-2 shot down over Cuba was a step nobody ordered. The ladder\'s neat climb hides that.',
  ],
  terms: [
    ['Rung', 'One kind of action in a crisis, ranked from mild (1) to catastrophic (44).'],
    ['Threshold', 'A red dashed line where Kahn thought a crisis changes character, e.g. the first use of nuclear weapons.'],
    ['DEFCON', 'U.S. defense readiness condition; lower numbers mean forces closer to war.'],
    ['Leave the record', 'Pick an option that did not happen. From then on the crisis is a model branch, not history.'],
    ['Notional', 'Made-up placeholder numbers for thinking, not estimates from any source.'],
    ['Seed', 'A number that fixes the dice, so the same link replays the same rolls.'],
    ['Settlement / standoff', 'The crisis ends in a deal / fades or freezes without one.'],
  ],
};

export function mountLesson(where, api) {
  const start = () => { api.begin(); runLesson(steps(api), { slug: SLUG, title: 'Learn to play', onFinish: () => banner.refresh() }); };
  const banner = learnButton(where, { slug: SLUG, minutes: 5, onStart: start, sheet: SHEET });
  return start;
}

function steps(api) {
  const S = api.state;
  return [
    { title: 'What you are trying to do',
      body: 'Herman Kahn ranked 44 kinds of crisis action, from words to all-out nuclear war, and called it an escalation ladder (1965). Here you first <b>watch</b> a real crisis climb it, then <b>replay</b> it as the U.S. side. Your aim in the replay: end the crisis in a settlement, a deal, while keeping the chance of war as low as you can.' },
    { title: 'The ladder',
      target: () => $('#ladder'),
      body: 'Each row is a rung: one kind of action, mild at the bottom, catastrophic at the top. The red dashed lines are Kahn\'s six <b>thresholds</b>, points where he thought a crisis changes character. The most important is the No Nuclear Use Threshold above rung 20. The blue number on a rung shows which step of the crisis reached it.' },
    { title: 'Watch Cuba climb',
      target: () => $('#next'),
      body: 'October 1962. Kennedy\'s quarantine speech hardens positions (rung 4). <b>DEFCON</b>, the U.S. readiness level, then rises.',
      do: 'Press <b>Next</b> (or the → key) until step 4, October 24: DEFCON 2.',
      done: () => S().c === 'cuba' && S().s >= 3 && !S().m },
    { title: 'Crises also fall, and not always on purpose',
      target: () => $('#step'),
      start: () => api.set({ s: 4 }),
      body: 'DEFCON 2 is rung 11, "Super-ready status", the highest a U.S.-Soviet crisis reaches here. Step 5 is a U-2 spy plane shot down over Cuba, which nobody in Moscow ordered as a step up. The rung drops to 8. A ladder pictures deliberate moves; real crises jump, stall and slip.' },
    { title: 'Now you decide',
      target: () => $('#retry'),
      body: 'Time to play Kennedy and his advisers (the ExComm) from the start of the crisis.',
      do: 'Press <b>Retry this crisis from the allied side</b>.',
      done: () => S().m === 'play' && shown($('#play')) },
    { title: 'Read the scoreboard',
      target: () => $('.cf-dist'),
      body: 'This bar is your score. It splits the crisis into four endings: <b>settlement</b> (a deal), <b>standoff</b> (it fades with no deal), <b>limited war</b> and <b>nuclear use</b>. The orange and red at the right end are "war or worse". The numbers come from a <b>notional</b> model: made-up placeholders for thinking, not estimates. The hatched band is Kennedy\'s own guess at the chance of war.' },
    { title: 'Make your first decision',
      target: () => $('.cf-opts') || $('.cf-dec'),
      body: 'Missiles are in Cuba. Every option was really debated in October 1962; one is what Kennedy did. You learn which after you choose.',
      do: 'Pick one of the options.',
      done: () => !!$('.cf-rev') },
    { title: 'What your choice did',
      target: () => $('.cf-rev .kl-rq') || $('.cf-rev'),
      body: () => ($('.cf-off')
        ? 'You <b>left the record</b>: you picked something that did not happen. From now on the crisis is a model branch, not history. Each round the Soviet response is a roll of dice on a notional table, shown with its chance. The <b>seed</b> fixes the dice, so a shared link replays the same rolls.'
        : 'You chose what Kennedy did. The crisis moves to the rung of the historical step, and the line under it shows the chance of "war or worse" before and after your choice.')
        + ' Below are all the options with their sources.' },
    { title: 'The one idea that wins',
      target: () => $('.cf-body'),
      body: 'In this model, every rung you jump in one move adds risk, and stepping down earns relief. High on the ladder the slide toward war is faster than the slide back, because escalating is easier than de-escalating. Small steps and offers of a deal keep the right end of the bar short.',
      do: 'Keep choosing (press the button under the options, then decide again) until the run ends.',
      wait: 'It moves on when your run ends. You can skip.',
      done: () => !!$('.cf-end') },
    { title: 'What your result means',
      target: () => $('.cf-end') || $('.cf-body'),
      body: 'Your bar sits above "What happened". Both are the model\'s numbers, so read them as a comparison, not a forecast. If you left the record, "Run 1,000 futures" replays your branch with fresh dice and shows how often a policy ends badly; one branch is only one roll. "Start the retry again" lets you try another path. Further down, "Why the ladder misleads" explains what a single line of rungs hides.' },
  ];
}
