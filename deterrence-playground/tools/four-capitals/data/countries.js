// The four capitals: objectives the player weights (and how each is measured at the end), type priors,
// default weights for the computer, and starting indices. All indices are illustrative 0–100 scales.
const war = s => 100 - 25 * Math.max(0, s.maxRung - 2);
const noNuke = s => s.nuclearUsed ? 0 : Math.round(100 - 0.6 * s.nukePeak);

export const IDS = ['us', 'tw', 'cn', 'jp'];

export const COUNTRIES = {
  us: {
    id: 'us', name: 'United States', short: 'U.S.', capital: 'Washington', color: 'var(--us)',
    prior: { resolute: 0.34, cautious: 0.33, opportunist: 0.33 },
    start: { support: 55, economy: 70, military: 70 },
    objectives: [
      { id: 'tw_free', label: "Taiwan keeps its self-government", measure: s => s.tw, w: 4 },
      { id: 'alliance', label: 'Alliances hold together', measure: s => s.coal, w: 4 },
      { id: 'economy', label: 'Limit damage to the U.S. economy', measure: s => s.c.us.economy, w: 3 },
      { id: 'avoid_war', label: 'Avoid a major war', measure: war, w: 4 },
      { id: 'no_nuke', label: 'No nuclear use', measure: noNuke, w: 5 },
      { id: 'forces', label: 'U.S. forces not struck', measure: s => 100 - 30 * Math.min(3, s.struck.us), w: 3 },
    ],
  },
  tw: {
    id: 'tw', name: 'Taiwan', short: 'Taiwan', capital: 'Taipei', color: 'var(--roc)',
    prior: { resolute: 0.4, cautious: 0.35, opportunist: 0.25 },
    start: { support: 60, economy: 65, military: 50 },
    objectives: [
      { id: 'sovereignty', label: 'Keep self-government', measure: s => s.tw, w: 5 },
      { id: 'partners', label: 'Partners stand with Taiwan', measure: s => s.coal, w: 4 },
      { id: 'economy', label: "Protect Taiwan's economy", measure: s => s.c.tw.economy, w: 3 },
      { id: 'society', label: 'Society stays united', measure: s => s.c.tw.support, w: 3 },
      { id: 'avoid_war', label: 'Avoid a major war', measure: war, w: 4 },
      { id: 'no_nuke', label: 'No nuclear use', measure: noNuke, w: 4 },
    ],
  },
  cn: {
    id: 'cn', name: 'China', short: 'China', capital: 'Beijing', color: 'var(--prc)',
    prior: { resolute: 0.4, cautious: 0.3, opportunist: 0.3 },
    start: { support: 65, economy: 62, military: 75 },
    objectives: [
      { id: 'unification', label: 'Progress toward unification', measure: s => Math.min(100, 100 - s.tw + (s.settled ? 10 : 0)), w: 5 },
      { id: 'regime', label: 'Party standing at home', measure: s => s.c.cn.support, w: 5 },
      { id: 'economy', label: "Protect China's economy", measure: s => s.c.cn.economy, w: 3 },
      { id: 'avoid_us', label: 'Avoid fighting the United States', measure: s => 100 - 30 * Math.min(3, s.struck.us + s.struck.mainland), w: 3 },
      { id: 'split', label: 'Split the coalition', measure: s => 100 - s.coal, w: 3 },
      { id: 'no_nuke', label: 'No nuclear use', measure: noNuke, w: 4 },
    ],
  },
  jp: {
    id: 'jp', name: 'Japan', short: 'Japan', capital: 'Tokyo', color: 'var(--jp)',
    prior: { resolute: 0.3, cautious: 0.45, opportunist: 0.25 },
    start: { support: 55, economy: 60, military: 55 },
    objectives: [
      { id: 'alliance', label: 'Alliance with the U.S. stays credible', measure: s => s.coal, w: 4 },
      { id: 'homeland', label: 'Japan is not struck', measure: s => 100 - 35 * Math.min(3, s.struck.jp), w: 5 },
      { id: 'economy', label: "Protect Japan's economy", measure: s => s.c.jp.economy, w: 3 },
      { id: 'tw_survives', label: 'Taiwan stays out of Beijing’s control', measure: s => s.tw, w: 3 },
      { id: 'no_nuke', label: 'No nuclear use', measure: noNuke, w: 5 },
      { id: 'stay_clear', label: 'Stay out of the fighting', measure: s => 100 - 30 * Math.min(3, s.jpCombat), w: 3 },
    ],
  },
};

export const START = { tw: 72, coal: 62, shock: 8, nuke: 5 };
export const defaultWeights = id => Object.fromEntries(COUNTRIES[id].objectives.map(o => [o.id, o.w]));
