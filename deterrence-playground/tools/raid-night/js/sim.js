// Raid Night simulation: pure state and a fixed-step update, shared by the live game and the headless
// heuristic replays in the after-action review. No DOM access here.
import { FIELD, CITIES, WEAPONS, WEAPON_ORDER, THREATS, THREAT_ORDER, WAVE_TRACKS, SPAWN } from '../data/params.js';
import { RAIDS } from '../data/raids.js';
import { COST, THREAT_COST } from '../data/costs.js';
import { mulberry32, hash01 } from './rng.js';

export const DT = 1 / 60;

/** Scale a real raid mix to n tracks, keeping proportions (largest remainder, at least 1 of each type present). */
export function scaleMix(mix, n) {
  const tot = THREAT_ORDER.reduce((s, k) => s + (mix[k] || 0), 0);
  const out = {}, rem = [];
  let used = 0;
  for (const k of THREAT_ORDER) {
    const exact = (mix[k] || 0) / tot * n;
    out[k] = mix[k] ? Math.max(1, Math.floor(exact)) : 0;
    used += out[k];
    rem.push([exact - Math.floor(exact), k]);
  }
  rem.sort((a, b) => b[0] - a[0]);
  for (let i = 0; used < n; i = (i + 1) % rem.length) { if (mix[rem[i][1]]) { out[rem[i][1]]++; used++; } }
  while (used > n) { const k = THREAT_ORDER.reduce((a, b) => (out[a] >= out[b] ? a : b)); out[k]--; used--; }
  return out;
}

/** Spawn schedule for every wave, fixed by the seed alone, so every player and every replay sees the same raids. */
export function buildWaves(seed) {
  let id = 1;
  return RAIDS.map((raid, w) => {
    const r = mulberry32((seed * 2654435761 + (w + 1) * 97531) >>> 0);
    const counts = scaleMix(raid.mix, WAVE_TRACKS[w]);
    const spawns = [];
    const add = (type, t) => {
      const city = CITIES[Math.floor(r() * CITIES.length)];
      const x1 = city.x + (r() - 0.5) * 30, y1 = city.y + (r() - 0.5) * 16;
      let x0, y0;
      if (type === 'ballistic') { x0 = x1 + (r() - 0.5) * 420; y0 = -20; }
      else if (type === 'drone' && r() < 0.35) { const left = r() < 0.5; x0 = left ? -20 : FIELD.W + 20; y0 = 40 + r() * 260; }
      else { x0 = 40 + r() * (FIELD.W - 80); y0 = -20; }
      spawns.push({ t, type, x0, y0, x1, y1, city: city.k, ph: r() * 6.28 });
    };
    for (const type of ['drone', 'cruise']) {
      const [a, b] = SPAWN[type];
      for (let i = 0; i < counts[type]; i++) add(type, a + r() * (b - a));
    }
    let left = counts.ballistic;
    const [a, b] = SPAWN.ballistic;
    while (left > 0) {
      const size = Math.min(left, 2 + Math.floor(r() * 4)), t0 = a + r() * (b - a);
      for (let i = 0; i < size; i++) add('ballistic', t0 + i * 0.35 + r() * 0.3);
      left -= size;
    }
    spawns.sort((p, q) => p.t - q.t);
    for (const s of spawns) s.id = id++;
    return { raid, counts, spawns };
  });
}

const zero = () => ({ drone: 0, cruise: 0, ballistic: 0 });
const byW = v => ({ gun: v, sri: v, lri: v });

export function createGame(seed, { headless = false } = {}) {
  const S = {
    seed, headless, waves: buildWaves(seed), wave: 0, t: 0, time: 0, phase: 'wave', next: 0,
    threats: [], shots: [], events: [],
    ammo: Object.fromEntries(WEAPON_ORDER.map(k => [k, WEAPONS[k].mag])),
    cool: Object.fromEntries(WEAPON_ORDER.map(k => [k, WEAPONS[k].sites.map(() => 0)])),
    fired: byW(0), wasted: byW(0), hits: byW(0), use: { gun: zero(), sri: zero(), lri: zero() },
    spent: { lo: 0, hi: 0 }, value: { lo: 0, hi: 0 },
    kills: zero(), leaks: zero(), unpricedKills: 0,
    dmg: Object.fromEntries(CITIES.map(c => [c.k, 0])),
    perWave: [],
  };
  return S;
}

function pos(th) {
  const f = Math.min(1, th.s / th.len);
  let x = th.x0 + (th.x1 - th.x0) * f, y = th.y0 + (th.y1 - th.y0) * f;
  const wv = THREATS[th.type].weave;
  if (wv) { const a = Math.sin(th.s / 38 + th.ph) * wv * Math.min(1, (th.len - th.s) / 80); x += th.nx * a; y += th.ny * a; }
  th.x = x; th.y = y;
}

export const tti = th => (th.len - th.s) / THREATS[th.type].speed;
export const liveThreats = S => S.threats.filter(t => t.alive);

function spawn(S, sp) {
  const len = Math.hypot(sp.x1 - sp.x0, sp.y1 - sp.y0);
  const th = { ...sp, len, s: 0, alive: true, resolved: 0, nx: -(sp.y1 - sp.y0) / len, ny: (sp.x1 - sp.x0) / len, wave: S.wave };
  pos(th);
  S.threats.push(th);
}

/** Probability that the interceptors already flying at a threat kill it. */
export function coverage(S, th) {
  let miss = 1;
  for (const sh of S.shots) if (sh.target === th.id) miss *= 1 - WEAPONS[sh.w].pk[th.type];
  return 1 - miss;
}

/** Why a weapon cannot fire at a threat right now, or '' if it can (and which site would fire). */
export function canFire(S, w, th) {
  if (!th || !th.alive) return { reason: 'gone' };
  if (S.ammo[w] <= 0) return { reason: 'empty' };
  const W = WEAPONS[w];
  if (W.pk[th.type] <= 0) return { reason: 'ineffective' };
  let best = -1, bestD = Infinity, inRange = false;
  W.sites.forEach((s, i) => {
    const d = Math.hypot(s.x - th.x, s.y - th.y);
    if (d > W.range) return;
    inRange = true;
    if (S.cool[w][i] <= 0 && d < bestD) { best = i; bestD = d; }
  });
  if (!inRange) return { reason: 'range' };
  if (best < 0) return { reason: 'reload' };
  return { reason: '', site: best };
}

/** Assign weapon w to threat id. Returns { ok, reason }. */
export function fire(S, w, id) {
  if (S.phase !== 'wave') return { ok: false, reason: 'idle' };
  const th = S.threats.find(t => t.id === id);
  const c = canFire(S, w, th);
  if (c.reason) return { ok: false, reason: c.reason };
  const site = WEAPONS[w].sites[c.site];
  S.cool[w][c.site] = WEAPONS[w].reload;
  S.ammo[w]--; S.fired[w]++; S.use[w][th.type]++;
  if (COST[w].lo != null) { S.spent.lo += COST[w].lo; S.spent.hi += COST[w].hi; }
  S.shots.push({ w, target: id, x: site.x, y: site.y, px: site.x, py: site.y });
  if (!S.headless) S.events.push({ k: 'launch', w, x: site.x, y: site.y });
  return { ok: true, reason: '' };
}

function kill(S, th, w) {
  th.alive = false;
  S.kills[th.type]++; S.hits[w]++;
  const v = THREAT_COST[th.type];
  if (v.lo != null) { S.value.lo += v.lo; S.value.hi += v.hi; } else S.unpricedKills++;
  if (!S.headless) S.events.push({ k: 'kill', type: th.type, x: th.x, y: th.y });
}

function snapshot(S) {
  S.perWave.push({
    ammo: { ...S.ammo }, spent: { ...S.spent }, value: { ...S.value },
    leaks: { ...S.leaks }, kills: { ...S.kills }, dmg: Object.values(S.dmg).reduce((a, b) => a + b, 0),
  });
}

/** Advance one fixed step. */
export function step(S, dt = DT) {
  if (S.phase !== 'wave') return;
  S.t += dt; S.time += dt;
  const W = S.waves[S.wave];
  while (S.next < W.spawns.length && W.spawns[S.next].t <= S.t) spawn(S, W.spawns[S.next++]);
  for (const w of WEAPON_ORDER) for (let i = 0; i < S.cool[w].length; i++) S.cool[w][i] = Math.max(0, S.cool[w][i] - dt);
  for (const th of S.threats) {
    if (!th.alive) continue;
    th.s += THREATS[th.type].speed * dt;
    pos(th);
    if (th.s >= th.len) {
      th.alive = false;
      S.leaks[th.type]++;
      S.dmg[th.city] += THREATS[th.type].dmg;
      if (!S.headless) S.events.push({ k: 'leak', type: th.type, x: th.x1, y: th.y1, city: th.city });
    }
  }
  const keep = [];
  for (const sh of S.shots) {
    const th = S.threats.find(t => t.id === sh.target);
    if (!th || !th.alive) { S.wasted[sh.w]++; continue; }
    const d = Math.hypot(th.x - sh.x, th.y - sh.y), move = WEAPONS[sh.w].speed * dt;
    sh.px = sh.x; sh.py = sh.y;
    if (d <= move + 2) {
      const roll = hash01(S.seed, th.id, th.resolved++);
      if (roll < WEAPONS[sh.w].pk[th.type]) kill(S, th, sh.w);
      else if (!S.headless) S.events.push({ k: 'miss', w: sh.w, x: th.x, y: th.y });
      continue;
    }
    sh.x += (th.x - sh.x) / d * move; sh.y += (th.y - sh.y) / d * move;
    keep.push(sh);
  }
  S.shots = keep;
  S.threats = S.threats.filter(t => t.alive);
  if (S.next >= W.spawns.length && !S.threats.some(t => t.alive) && !S.shots.length) {
    snapshot(S);
    S.threats = [];
    S.phase = S.wave < S.waves.length - 1 ? 'break' : 'over';
    if (!S.headless) S.events.push({ k: 'waveEnd', wave: S.wave });
  }
}

export function nextWave(S) {
  if (S.phase !== 'break') return false;
  S.wave++; S.t = 0; S.next = 0; S.phase = 'wave';
  for (const w of WEAPON_ORDER) S.cool[w] = S.cool[w].map(() => 0);
  return true;
}

/** Summary numbers for the HUD and the after-action review. */
export function summary(S) {
  const leakTotal = THREAT_ORDER.reduce((a, k) => a + S.leaks[k], 0);
  const killTotal = THREAT_ORDER.reduce((a, k) => a + S.kills[k], 0);
  const dmgTotal = Object.values(S.dmg).reduce((a, b) => a + b, 0);
  const ratio = { lo: S.value.lo ? S.spent.lo / S.value.lo : null, hi: S.value.hi ? S.spent.hi / S.value.hi : null };
  return { leakTotal, killTotal, dmgTotal, ratio, spent: S.spent, value: S.value, ammo: S.ammo, fired: S.fired,
    wasted: S.wasted, use: S.use, kills: S.kills, leaks: S.leaks, dmg: S.dmg, perWave: S.perWave, unpricedKills: S.unpricedKills };
}
