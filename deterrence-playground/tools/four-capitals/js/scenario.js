// Applying a scenario start (data/scenarios.js) to a new game: shared tracks and flags, capitals' tracks, anger,
// resources, formation changes and the month before the game. The default changes nothing. No dice are drawn, so a
// scenario never shifts the game's random streams.
import { SCENARIO, DEFAULT_SCENARIO } from '../data/scenarios.js';
import { syncF, updateControl, syncMilitary } from './forces.js';

export function applyScenario(s, id = DEFAULT_SCENARIO) {
  const sc = SCENARIO[id] || SCENARIO[DEFAULT_SCENARIO];
  s.scenario = sc.id; s.t0 = sc.t0; s.turn = sc.t0;
  Object.assign(s, sc.set || {});
  for (const [w, v] of Object.entries(sc.c || {})) Object.assign(s.c[w], v);
  for (const [v, at] of Object.entries(sc.anger || {})) Object.assign(s.anger[v], at);
  for (const [w, r] of Object.entries(sc.res || {})) Object.assign(s.res[w], r);
  for (const [uid, ch] of Object.entries(sc.units || {})) {
    const u = Object.values(s.units).flat().find(x => x.id === uid);
    if (ch.transit) { u.to = ch.transit; u.at = 'transit'; u.eta = sc.t0; }   // arrives in the first month
    if (ch.ready != null) u.ready = ch.ready;
  }
  if (sc.last) s.last = JSON.parse(JSON.stringify(sc.last));
  s.nukePeak = s.nuke;
  syncF(s); updateControl(s); syncMilitary(s);
  return s;
}
