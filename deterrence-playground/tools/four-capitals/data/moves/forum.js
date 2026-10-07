// The peace forum move (Batch B): one per capital, on the menu only in the month after its offer of talks succeeded,
// once a game. Its % is the caller's estimate that the rival accepts; the engine settles it (js/forum.js).
import { q } from '../ops.js';

// js/forum.js registers the AI's scoring here once it loads. Importing it directly would make a cycle
// (js/forum.js → js/politics.js → data/actions.js → this file) that breaks loading this module on its own.
let forumAi = () => 0;
export const setForumAi = f => { forumAi = f; };

const NAME = { us: 'Beijing', tw: 'Beijing', jp: 'Beijing' };
const make = (who, to) => ({
  id: `${who}_forum`, line: 'D', to, label: 'Call for a peace forum to end the conflict', tags: ['talks', 'soft'], base: 0.5,
  forum: true, once: true, opp: true,
  avail: s => s.forumOpen?.[who] === s.turn,
  oppWhy: () => 'your offer of talks landed last month (the opening lasts one month)',
  explain: `Invite ${who === 'cn' ? 'a rival' : NAME[who]} to a forum to end the conflict. The % is your estimate that they accept. Accepted: a ceasefire next month (escalatory moves cost more at home, and breaking it costs credibility), the ladder steps down a rung, and if the ceasefire holds the crisis ends in a settlement. Declined: a small loss of credibility.`,
  ...(who === 'cn' ? { follow: [q('to', 'Addressed to?', [['us', 'Washington', 'End it with the United States; Taipei follows.'], ['tw', 'Taipei', 'Talk to Taiwan directly, cutting Washington out.']])] } : {}),
  ai: (s, w) => forumAi(s, w),
  fx: () => {},                 // settled in the engine (js/forum.js settleForum)
});
export const FORUM = { us: make('us', 'cn'), tw: make('tw', 'cn'), cn: make('cn', 'us'), jp: make('jp', 'cn') };
