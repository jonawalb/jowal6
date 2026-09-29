// The clearance model. A day-by-day expected-value calculation: search effort accumulates at the forces'
// area coverage rate until every route has been searched enough times to reach the confidence target,
// while diver/EOD teams work through the contacts the search turns up. All inputs come from data/params.js;
// the result is notional because most inputs are.
import { CHANNEL, THREAT, ENVS, FORCES, THREAT_LEVELS, MODEL } from '../data/params.js';

export const DEFAULTS = {
  lengthNm: CHANNEL.lengthNm.v, routes: CHANNEL.routes.v, widthYd: CHANNEL.widthYd.v,
  mines: THREAT.mines.v, share: THREAT.shareInRoutes.v, contactsPerNm2: THREAT.contactsPerNm2.v, remineWeek: THREAT.remineWeek.v,
  env: 'medium', threat: 'permissive', conf: 90,
  ...Object.fromEntries(FORCES.map(f => [f.k, f.v])),
};

const YD_M = 0.9144, NM_M = 1852;

/** Passes needed so a mine survives all of them with probability at most 1 - conf. */
export const passesFor = conf => Math.max(1, Math.ceil(Math.log(1 - conf / 100) / Math.log(1 - MODEL.pdPass.v)));

export function run(S) {
  const widthNm = S.widthYd * YD_M / NM_M;
  const area = S.lengthNm * S.routes * widthNm;                 // square nm to clear
  const minesIn = S.mines * S.share / 100;
  const P = passesFor(S.conf);
  const pd = MODEL.pdPass.v;
  const T = THREAT_LEVELS[S.threat];
  const envRatio = ENVS[S.env].acr / ENVS.easy.acr;
  const search = FORCES.filter(f => f.acr);
  const eod = FORCES.find(f => f.k === 'eod');
  const survive = d => Math.pow(1 - T.lossWeek, d / 7);

  let effort = 0, need = P * area, remined = 0, processed = 0, finish = null;
  const days = [];
  const contactsBase = S.contactsPerNm2 * area;
  for (let d = 0; d <= MODEL.maxDays; d++) {
    const working = d >= MODEL.setupDays.v;
    const rate = working ? search.reduce((s, f) => s + S[f.k] * survive(d) * f.acr * envRatio * T.hours, 0) : 0;
    if (working && d > MODEL.setupDays.v && S.remineWeek > 0 && finish == null) {
      const add = S.remineWeek / 7;
      remined += add;
      need += add * P * 1;                                        // re-survey about 1 sq nm around each new mine
    }
    effort = Math.min(need, effort + rate);
    const frac = need > 0 ? effort / need : 1;
    const minesTot = minesIn + remined;
    const found = minesTot * (1 - Math.pow(1 - pd, frac * P));
    const available = contactsBase * Math.min(1, frac * P) + found; // contacts show up on the first pass
    const idRate = working ? S.eod * survive(d) * eod.idPerDay * T.hours / 12 : 0;
    processed = Math.min(available, processed + idRate);
    const left = minesTot - (available > 0 ? found * processed / available : 0);
    const risk = transitRisk(S, Math.max(0, left));
    days.push({ d, frac, effort, found, available, processed, left, risk, rate, idRate });
    if (finish == null && frac >= 0.999 && processed >= available - 1e-6) finish = d;
    if (finish != null && d >= finish + 14) break;
    if (working && rate < 1e-3 && idRate < 1e-3 && d > MODEL.setupDays.v + 30) break;
  }
  const end = finish != null ? days[finish] : days[days.length - 1];
  const searchDays = days.find(x => x.frac >= 0.999)?.d ?? null;
  return {
    area, widthNm, minesIn, P, pd, finish, searchDays, days, end,
    bottleneck: finish == null ? 'none' : searchDays != null && finish - searchDays > 2 ? 'id' : 'search',
    residual: end.left,
    riskStart: transitRisk(S, minesIn),
    riskEnd: end.risk,
    dailyRate: search.reduce((s, f) => s + S[f.k] * f.acr * envRatio * T.hours, 0),
  };
}

/** Chance that one ship transiting one route meets a live mine that fires. Mines are spread evenly
 *  across the routes and across each route's width. */
export function transitRisk(S, minesLeft) {
  const w = S.widthYd * YD_M;
  const perRoute = minesLeft / S.routes;
  const p = Math.min(1, MODEL.dangerWidthM.v / w) * MODEL.actuate.v;
  return 1 - Math.pow(1 - p, perRoute);
}

/** Deterministic pseudo-random number in [0,1) for an integer key. */
export function rand(k) {
  let x = (k + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
