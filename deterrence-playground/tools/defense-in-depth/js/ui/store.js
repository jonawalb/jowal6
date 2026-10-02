// Shared UI state and small helpers. Every UI module imports this one; it imports nothing, so the UI has no
// import cycles. app.js fills S.ui with the functions other modules call back into (redraw, say, ...).

export const S = {
  g: null,            // the engine state (js/engine.js)
  me: 'def',          // the side you play: 'def' | 'att' (you are always Blue on screen, D-06)
  choices: null,      // start-screen choices { side, seed, scale, era, mode, diff, od }
  plan: null,         // your plan while planning (the same object the Auto-plan button fills)
  campaign: null,     // campaign state (js/campaign.js) or null
  setup: null,        // campaign battleSetup() for the battle in play
  sel: [],            // selected unit ids
  selFmn: null,       // selected formation id (formation orders)
  tool: null,         // armed map tool { kind, ... }: what a tap on a sector does
  filter: 'idle',     // unit filter chip (default Needs orders)
  view: 'belief',     // review map: 'belief' | 'truth'
  aarHour: null,      // review hour shown on the map
  tab: 'map',         // phone tab
  layers: new Set(['zones', 'lanes', 'enemy', 'obst', 'windows']),   // reset per side by js/ui/layers.js defaultLayers
  drawLayers: null,   // what the map draws (layers + a plan step's own, less Detailed-only ones in Simple)
  planStep: 1,        // the open step of the stepped plan panel (js/ui/plan-steps.js)
  focusSec: -1,       // roving-tabindex sector
  openHours: new Set(),
  practice: null,     // the Practice field's drill (js/ui/practice-ui.js) while it is open, else null
  ui: {},             // callbacks set by app.js: redraw(), say(html), select(ids), ...
};

export const $ = id => document.getElementById(id);
export const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const pct = x => `${Math.round((+x || 0) * 100)}%`;
export const narrow = () => matchMedia('(max-width: 640px)').matches;
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const other = s => (s === 'def' ? 'att' : 'def');
export const unitOf = id => (S.g && S.g.ix[id] != null ? S.g.units[S.g.ix[id]] : null);
export const say = html => S.ui.say && S.ui.say(html);
export const redraw = () => S.ui.redraw && S.ui.redraw();

/** Clock time of hour t (every scale starts at 05:00, SPEC §2.2). */
export const hhmm = t => `${String((5 + t) % 24).padStart(2, '0')}:00`;

/** Side names on screen: you are Blue (D-06). */
export const SIDE_NAME = { def: 'the Sorrel Republic', att: 'the Orvane Crown' };
export const ROLE_WORD = { def: 'defending', att: 'attacking' };
