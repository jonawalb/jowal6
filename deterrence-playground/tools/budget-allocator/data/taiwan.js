// Taiwan profile for the Defense Budget Allocator. Wraps the original Taiwan data files unchanged
// (budget.js: sourced budget figures; categories.js: model parameters and unit costs; taiwan_fms.js: U.S. reference cases) and holds the Taiwan wording.
// The page's static HTML is Taiwan's method and sources, so this profile has no `doc` block.
import { BUDGETS, CABINET_145, ACT_780_ITEMS } from './budget.js';
import { CATS, PRESETS, CROSSING } from './categories.js';
import { REF_CASES, WAIT_ASOF } from './taiwan_fms.js';

const fmtBn = v => v >= 1000 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(1) : v.toFixed(2);

export const TAIWAN = {
  k: 'tw', name: 'Taiwan', sub: 'NT$ · crossing',
  money: bn => `NT$${fmtBn(bn)}bn`,
  budgets: BUDGETS,
  cats: CATS,
  presets: PRESETS,
  defaults: { b: 's145', preset: 'porcupine', supp: 0.6, warn: 5 },
  geo: { km: CROSSING.km, speed: CROSSING.knots, unit: 'kn' },
  refMix: { budget: 's145', label: 'Cabinet mix', sub: 'Sept. 3 proposal, mapped', lines: CABINET_145,
    off: 'Only the NT$145.7bn line has a published breakdown', title: 'What the cabinet proposed, Sept. 3, 2026' },
  refText: {
    s780: ['What the act names', `The act reserves the money for U.S. Foreign Military Sales cases and names ${ACT_780_ITEMS.join(', ')}. No per-item amounts were published, so there is no reference mix.`],
    s1250: ['What the plan covered', 'The proposal listed precision artillery, long-range missiles, drones, air and missile defense, AI-enabled command and surveillance, war stocks, production lines and co-development with the United States, across 23 programs. No per-category amounts were published, so there is no reference mix.'],
  },
  strip: { left: 'Embarkation', right: 'Taiwan', zero: 'coast', noun: 'ships', play: 'Play the crossing', exportTitle: 'Notional crossing',
    aria: 'Stylized Taiwan Strait crossing. A PLA amphibious wave sails from the embarkation coast on the left toward Taiwan on the right, through bands showing how far each of Taiwan\'s weapon layers reaches and how strong it is. Ships marked with an X are engaged.' },
  text: {
    verdict: {
      good: ['Costly crossing', 'A large share of the crossing force comes under effective attack.'],
      warn: ['Contested crossing', 'Taiwan engages part of the force, but most of it arrives untouched.'],
      bad: ['Crossing largely unopposed', 'Too little of Taiwan\'s firepower survives, sees the fleet or reaches it.'],
    },
    explain: {
      mobile: n => `Only ${n}% of mobile launchers survive the opening strikes; air defense and resilience spending protect them.`,
      platform: n => `Large platforms are few and easy to find, so only ${n}% remain after suppression.`,
      track: 'Weak sensors and networks leave shooters without good tracks on the fleet.',
      mines: n => `With short warning only ${n}% of the minefield is laid in time.`,
    },
    tiles: { engaged: 'of the crossing force comes under effective attack', hours: h => `of a ${h} h crossing`, shooters: 'after PLA suppression strikes' },
    supp: ['PLA suppression strikes', 'Share of Taiwan\'s unprotected forces the opening missile and air strikes would destroy.'],
    warn: ['Warning before the assault', 'Days Taiwan has to lay mines before the fleet sails.'],
  },
  refCases: REF_CASES,
  refAsof: WAIT_ASOF,
};
