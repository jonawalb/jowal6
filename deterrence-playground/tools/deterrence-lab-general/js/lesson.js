// "Learn to play": a hands-on first lesson (shared/js/learn.js) and the one-screen rules sheet.
// Folds in the old walkthrough (js/tour.js). The Fearon (1997) lesson is opened from the Game Theory Gallery
// with #m=B&tour=B. `done` checks read the page itself: the equilibrium box and the open tab.
import { B_DEFAULTS } from './models/signal.js';

const $ = s => document.querySelector(s);
const mod = () => document.body.dataset.mod;
const status = m => ($(`#${m.toLowerCase()}-status b`)?.textContent || '').trim();
const slider = k => $(`#sl-${k}`)?.closest('.slider');
const tab = m => $(`.tabs [data-m="${m}"]`);
const jump = () => [...document.querySelectorAll('#panel .btn')].find(b => /bluff-proof/.test(b.textContent));

export const STEPS = [
  { title: 'What you are trying to do',
    body: 'Each tab is a small crisis game. You are <b>S</b>, a government making a threat. <b>R</b> is the other side, holding something S wants (the <em>stake</em>). S wins if R gives way without a war. The catch: R cannot see whether S would really fight. The question in every tab is the same: <b>when does R believe the threat?</b>' },
  { title: 'Read the game tree',
    body: 'Read it left to right. <b>N</b> (nature, or chance) first decides whether S is <b>resolute</b> (would really fight) or <b>irresolute</b> (would rather back down). S then stays quiet or threatens. R concedes or resists. The pairs in brackets are <b>payoffs</b>: what S and R each end up with, where the stake is worth 1. The dashed line means R cannot tell the two S types apart. Thick lines are what actually happens.',
    target: () => $('#a-tree') },
  { title: 'The equilibrium box',
    body: 'An <b>equilibrium</b> is a pair of plans where neither side can do better by changing its own plan alone: the stable way this game gets played. Right now it is <em>semi-separating</em>: the irresolute S bluffs 13% of the time, R calls (resists) 83% of threats, and war happens 25% of the time. Bluffs and calls are in balance.',
    target: () => $('#a-status') },
  { title: 'Make backing down expensive',
    body: 'An <b>audience cost</b> is the price a leader pays at home for threatening in public and then backing down: lost votes, lost face.',
    do: 'Drag the <b>Audience cost of backing down</b> slider to 0.40 or more (or use the arrow keys on it).',
    target: () => slider('a'),
    done: () => status('A') === 'Commitment' },
  { title: 'Now the threat is credible',
    body: 'Backing down now costs S more than fighting, so even the irresolute S would fight. The threat is <b>credible</b>: believable, because carrying it out is in S’s own interest. R concedes, war falls to 0%, and the audience cost is never actually paid. This is Fearon’s (1994) commitment logic, and one common reading of Kennedy’s public warnings in the Cuban Missile Crisis.',
    target: () => $('#a-read') },
  { title: 'Or let a reputation do the work',
    body: 'The <b>prior</b> is what R believes about S before the crisis: the chance S is resolute.',
    do: 'Bring the audience cost back below 0.40, then raise <b>Prior that S is resolute</b> to about 0.80. You can also click the colored map: left is a low audience cost, up is a high prior.',
    target: () => (status('A') === 'Commitment' ? slider('a') : slider('p')),
    done: () => status('A') === 'Pooling bluff' },
  { title: 'A reputation invites bluffs',
    body: 'R already thinks S is probably resolute, so it concedes to any threat, and the irresolute S bluffs and wins. The threat works without tied hands. Trachtenberg reads Fashoda (1898) this way. On the map, each color is a different equilibrium and the dot is your setup; the case cards below the figures load readings of real crises.',
    target: () => $('#a-region') },
  { title: 'Signals: pay to be believed',
    body: 'A <b>signal</b> is something S does to show it is resolute. Talk is cheap, so a believable signal must cost more than a bluffer would pay. Tab B compares two ways to pay: <b>sink costs</b> (mobilize, paid whatever happens) and <b>tie hands</b> (a public pledge, paid only if S retreats).',
    do: 'Open tab <b>B · Costly signals</b>, then press <b>Set the smallest bluff-proof signal</b>.',
    target: () => (mod() === 'B' ? jump() : tab('B')),
    done: () => mod() === 'B' && ['Separating', 'Commitment'].includes(status('B')) },
  { title: 'Salami tactics: one slice at a time',
    body: 'In tab C a challenger takes small slices, one after another. The defender is weak (would rather give way) or tough (always resists). A weak defender resists early slices to protect its <b>reputation</b>, so even a 5% chance that it is tough keeps the challenger out of the early slices.',
    do: 'Open tab <b>C · Salami tactics</b>, then press <b>Play it out</b> to watch one history.',
    target: () => (mod() === 'C' ? $('#c-play') : tab('C')),
    done: () => mod() === 'C' && !!$('#c-strip li.hid') },
  { title: 'The idea that wins',
    body: 'A threat works when a bluffer would not make it. S gets there three ways: make backing down costly (tab A), pay up front (tab B), or keep a little doubt alive (tab C). Fearon’s comparison table in tab B shows the trade-off: tying hands costs S less on average but carries more risk of war. And with no doubt at all, salami deterrence unravels: tick <b>Complete information</b> in tab C to see every slice taken. All values are <span class="notional">notional</span>: they teach the logic and estimate nothing. The address bar stores your exact setup, so you can share it.' },
];

// Fearon (1997) on its own. Each step loads a setup through apply(set).
export const fearonSteps = apply => [
  { title: 'The question',
    body: 'How can a leader convince another state that it really means a threat, when a bluffer would say exactly the same thing? Talk is cheap, so a <b>credible</b> (believable) signal has to cost something a bluffer would not pay (Fearon 1997).',
    start: () => apply({ m: 'B', B: { ...B_DEFAULTS } }) },
  { title: 'Two ways to pay',
    body: 'A leader can <b>sink costs</b>: take an action that is costly up front, whatever happens next, such as mobilizing troops. Or a leader can <b>tie hands</b>: create audience costs that are paid only later, and only if the leader backs down. Which works better, and at what risk?',
    target: () => $('#panel .choices') },
  { title: 'Sinking costs: pay to be believed',
    body: 'Here S pays k before R responds. Once k is more than the irresolute type could gain, only a resolute S will pay it. The signal separates the types (R can tell them apart) and R’s belief after the signal jumps to 1. The price: the resolute type burns k every time. The Berlin airlift (1948) is the case card.',
    start: () => apply({ m: 'B', B: { ...B_DEFAULTS, tech: 'sunk', k: 0.45 }, case: 'berlin48' }),
    target: () => $('#b-status') },
  { title: 'Tying hands: pay only if you fold',
    body: 'Now S makes a public commitment (or puts a small force where it would be overrun) that costs almost nothing unless S backs down. Past a ≥ c − vᵢ, no type that commits will fold. NATO’s Enhanced Forward Presence is the case card.',
    start: () => apply({ m: 'B', B: { ...B_DEFAULTS, tech: 'tied', k: 0.36 }, case: 'efp' }),
    target: () => $('#b-status') },
  { title: 'Compare the two',
    body: 'Fearon’s comparison table sets each technique at its smallest bluff-proof size. Tying hands leaves S better off on average, because the cost is paid only when S fails to follow through, which in equilibrium it never does. But it carries a higher chance of war.',
    start: () => apply({ m: 'B', B: { ...B_DEFAULTS, tech: 'tied', k: 0.36 } }),
    target: () => $('#b-cmp') },
  { title: 'The answer',
    body: 'Fearon’s two results: in equilibrium leaders never bluff with either kind of signal, and leaders do better on average by tying hands, even though that creates a greater risk of war than sinking costs. That may explain why so many crises look like contests in creating domestic audience costs. Switch techniques and move the signal size to see the trade-off.' },
];

export const SHEET = {
  title: 'Deterrence Lab: the rules on one screen',
  goal: 'You are S, a government making a threat or commitment. R holds the stake and cannot see whether S would really fight. Move the payoffs and beliefs and watch which <b>equilibrium</b> results: when R believes S, when bluffing pays, and when the crisis ends in war.',
  controls: [
    ['Tabs A · B · C', 'Pick a model: audience costs, costly signals, salami tactics. ← → move between tabs.'],
    ['Sliders', 'Set payoffs and beliefs. Arrow keys nudge a focused slider.'],
    ['Colored map', 'Click or drag to move both plotted parameters at once.'],
    ['Bluff-proof button (B)', 'Jumps to the smallest signal a bluffer would not send.'],
    ['Play it out / New draw (C)', 'Animate one history of the salami game, or draw another.'],
    ['Case cards', 'Load a notional reading of a real crisis into the model.'],
    ['Address bar', 'Stores the tab and every parameter, so a link reproduces your setup.'],
  ],
  ideas: [
    'A threat is believed when a bluffer would not make it.',
    'A big enough audience cost makes even the irresolute type fight, so R concedes and the cost is never paid.',
    'A strong reputation (high prior) also works, but lets the irresolute type bluff and win.',
    'Tying hands is cheaper on average than sinking costs, but riskier.',
    'A little doubt about the defender deters early salami slices; with none, deterrence unravels.',
  ],
  terms: [
    ['Payoff', 'What a side ends up with in an outcome. The stake is worth 1.'],
    ['Equilibrium', 'Plans where neither side gains by changing its own plan alone.'],
    ['Resolute', 'An S that would really fight if resisted.'],
    ['Credible', 'Believable, because carrying out the threat is in S’s interest.'],
    ['Signal', 'A costly action that shows S’s type.'],
    ['Prior / posterior', 'R’s belief that S is resolute before / after seeing what S did.'],
    ['Pooling / separating', 'Both types act alike (R learns nothing) / act differently (R learns the type).'],
    ['Audience cost', 'The domestic price of backing down after a public threat.'],
  ],
};
