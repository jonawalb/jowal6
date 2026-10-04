// "Learn to play": a hands-on first run from the default scenario. Folds in the old walkthrough's content.
import { learnButton, runLesson } from '../../../shared/js/learn.js';

const SLUG = 'hormuz-mcm';
const $ = id => document.getElementById(id);
const q = s => document.querySelector(s);
const head = () => q('#hm-status b').textContent;
const finish = () => { const m = /clear in (\d+) days/.exec(head()); return m ? +m[1] : null; };
const finText = d => d == null ? 'not cleared within a year' : `${d} days`;
const count = k => +($('hm-f-' + k)?.textContent || 0);

// Phones: the lesson card covers the bottom of the screen, so bring each step's target into the upper part.
const lift = el => {
  if (!el || innerWidth > 600 || !el.getBoundingClientRect) return;
  const r = el.getBoundingClientRect();
  if (r.top < 70 || r.top > innerHeight * 0.4) scrollBy({ top: r.top - Math.max(70, innerHeight * 0.15), behavior: 'instant' });
};
const onPhone = steps => steps.map(s => s.target ? { ...s, start: () => { const v = s.start ? s.start() : null; lift(s.target()); return v; } } : s);

export const SHEET = {
  title: 'Hormuz Mine Clearance on one screen',
  goal: 'Reopen the shipping routes through the Strait of Hormuz as fast as you can. A route counts as <b>clear</b> once it has been searched enough times to reach the confidence you pick and every suspicious contact has been dealt with. The status box gives the days to clear; the chart gives the leftover risk to one ship.',
  controls: [
    ['Play', 'Run the clearance day by day. Press again to pause.'],
    ['Day slider', 'Jump to any day. Arrow keys move one day.'],
    ['Click or drag the chart', 'Move the day.'],
    ['Scenario', 'Load a preset: light mining, heavy mining, opposed clearance or a coalition surge.'],
    ['− / + under Forces', 'Add or remove boats, ships, helicopters and diver teams.'],
    ['Sliders', 'Route size, mines laid, seabed clutter, re-mining.'],
    ['Conditions', 'Seabed difficulty, threat to the clearance force, confidence target.'],
    ['Reset', 'Back to the defaults.'],
  ],
  ideas: [
    'Clearance has two jobs, searching and then identifying what the search finds. Add forces to the slower job; adding to the faster one changes nothing.',
    'More mines and more seabed clutter mean more contacts for divers, so the finish moves out by months.',
    'Under fire, working hours drop, the force wears down and the enemy can lay new mines faster than you clear them.',
    '"Clear" is never zero risk. The leftover chance per transit is what insurers price.',
  ],
  terms: [
    ['MCM', 'Mine countermeasures: finding and destroying sea mines.'],
    ['Search pass', 'One sweep of a route with sonar. Each pass finds a given mine 85% of the time (notional).'],
    ['Contact', 'Anything the sonar flags as possibly a mine. Most are clutter.'],
    ['Clutter', 'Mine-like objects on the seabed: rocks, wrecks, debris.'],
    ['EOD', 'Explosive ordnance disposal: divers and teams who identify and destroy mines.'],
    ['Confidence', 'How sure you want to be that a mine would have been found before declaring a route clear.'],
    ['Notional', 'An assumption chosen for teaching, not a sourced figure.'],
  ],
};

/** helpers: { reset() } from app.js. */
export function mountLesson(where, { reset }) {
  let before = null;
  const steps = [
    { title: 'The job',
      body: 'Mines have closed the Strait of Hormuz. Your goal is to reopen the shipping routes as fast as possible. This box says how many days the clearance takes with the current forces, and which step is slowest.',
      target: () => $('hm-status') },
    { title: 'Reading the strip',
      body: 'The two bands are shipping routes, 100 nautical miles long and 2,000 yards wide: the geometry Eyer describes for reopening Hormuz. Red dots are mines no one has found yet. Gray specks are <b>clutter</b>: rocks and debris that look like mines and must each be checked. Positions are drawn at random to show counts.',
      target: () => q('.hm-stripbox') },
    { title: 'Run the clearance',
      do: 'Press <b>Play</b> and watch until the routes are declared clear.',
      body: 'Uncrewed boats and ships drag sonar along the routes. Every contact they find goes to divers and explosive ordnance disposal (EOD) teams to identify and destroy.',
      target: () => $('hm-play'),
      done: () => { const f = finish(); return f != null && +$('hm-day').value >= f; } },
    { title: 'Clear is a probability',
      body: 'This chart shows the chance that one ship meets a live mine on one transit. It falls toward zero but never reaches it, because every search pass misses some mines. That leftover risk is what insurers have to price before ships go back in.',
      target: () => $('hm-chart') },
    { title: 'Add a search boat',
      do: 'Under <b>3 · Forces</b>, press <b>+</b> on <b>Uncrewed boats with towed sonar</b>.',
      start: () => { before = { f: finish(), usv: count('usv') }; },
      target: () => q('[data-f="usv"][data-d="1"]'),
      done: () => count('usv') > before.usv },
    { title: 'Nothing changed. Why?',
      body: () => `Days to clear: <b>${finText(before.f)}</b> before, <b>${finText(finish())}</b> now. The search was already finishing long before the divers did. The status box names the slowest step: <i>${q('#hm-status span').textContent.split('Slowest step: ')[1] || 'see the status box'}</i>. Extra boats only make the fast job faster.`,
      target: () => $('hm-status') },
    { title: 'Fix the slowest step',
      do: 'Press <b>+</b> twice on <b>EOD and diver teams</b>.',
      start: () => { before = { f: finish(), eod: count('eod') }; },
      target: () => q('[data-f="eod"][data-d="1"]'),
      done: () => count('eod') >= before.eod + 2 },
    { title: 'The idea that wins',
      body: () => `Days to clear went from <b>${finText(before.f)}</b> to <b>${finText(finish())}</b>. Clearance is two jobs in a row, search then identify. Add forces to whichever is slower. More mines or more clutter pile work onto the divers, so the finish can move out by months.`,
      target: () => $('hm-read') },
    { title: 'Clearing under fire',
      body: 'An opposed clearance cuts working hours, wears down the force each week and lets the other side lay new mines.',
      do: 'Under <b>4 · Conditions</b>, pick the threat level <b>Opposed</b>.',
      target: () => q('[data-threat="opposed"]'),
      done: () => q('[data-threat="opposed"]')?.getAttribute('aria-pressed') === 'true' },
    { title: 'Compare 2026',
      body: () => `Now: <b>${head()}</b>. The 2026 clearance ran partly under a ceasefire. The dashed line on the chart marks its 138 days, from destroyers entering the strait on 11 April 2026 to Adm. Cooper\'s 27 August statement; the model is not fitted to it. The sourced timeline is below. Press <b>Reset</b> and try your own forces. Inputs marked notional are round teaching numbers.`,
      target: () => $('hm-chart') },
  ];
  const start = () => {
    reset();
    scrollTo({ top: 0 });
    runLesson(onPhone(steps), { slug: SLUG, title: 'Learn to play', onExit: () => banner.refresh() });
  };
  const banner = learnButton(where, { slug: SLUG, minutes: 5, onStart: start, sheet: SHEET });
  return { start };
}
