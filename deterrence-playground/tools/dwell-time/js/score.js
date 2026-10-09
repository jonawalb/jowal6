// Dwell Time: the score. Six parts, each 0-100, weighted. METHOD.md explains the choices.
import { sectorById } from '../data/sectors.js';
import { scenarioById } from '../data/scenarios/index.js';

const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
export const WEIGHTS = { denial: 0.35, continuity: 0.2, cost: 0.15, compliance: 0.15, trust: 0.1, forensics: 0.05 };
export const PART_LABEL = {
  denial: 'Attacker denied', continuity: 'Operations kept running', cost: 'Cost contained',
  compliance: 'Obligations met', trust: 'Trust kept', forensics: 'Evidence preserved',
};

export function score(s) {
  const sc = scenarioById(s.scen), sec = sectorById(s.sector);
  const o = { exfil: 40, impact: 35, ot: 40, remain: 30, backups: 10, leak: 10, ...(sc.obj || {}) };
  const remaining = s.adv.fh.filter(f => f.on);
  const why = {};
  let d = 100;
  d -= o.exfil * s.adv.exfil;
  d -= o.impact * (s.adv.encMax || 0);
  if (s.adv.otHit) d -= o.ot;
  if (remaining.length) d -= o.remain + 5 * (remaining.length - 1);
  if (s.adv.backupsHit) d -= o.backups;
  if (s.ransom?.leaked) d -= o.leak;
  why.denial = [
    s.adv.exfil > 0.01 ? `${Math.round(s.adv.exfil * 100)}% of the target data stolen` : 'no data stolen',
    s.adv.encMax ? `${Math.round(s.adv.encMax * 100)}% of ${sec.crown.replace(/^the /, '')} encrypted at the peak` : null,
    s.adv.otHit ? 'operational technology disrupted' : null,
    remaining.length ? `${remaining.length} piece${remaining.length > 1 ? 's' : ''} of attacker access still in place at the end` : 'attacker fully evicted',
  ].filter(Boolean).join('; ');

  const hrs = s.biz.opsHist.reduce((a, x) => a + x.h, 0) || 1;
  const cont = s.biz.opsHist.reduce((a, x) => a + x.ops * x.h, 0) / hrs;
  why.continuity = `operations averaged ${Math.round(cont)}% over ${Math.round(hrs / 24)} days`;

  const net = s.money?.net ?? 0;
  const cost = 100 * Math.exp(-net / sec.costScale);
  why.cost = `$${(net / 1000).toFixed(1)}M net of insurance`;

  let comp = 100;
  const late = s.clocks.filter(c => c.status === 'late').length, missed = s.clocks.filter(c => c.status === 'missed').length;
  comp -= 25 * late + 35 * missed;
  const materialMiss = sec.public && s.d.materialT == null && (s.adv.encMax > 0.3 || s.adv.exfil > 0.2 || s.biz.opsHist.some(x => x.ops < 60));
  if (materialMiss) comp -= 30;
  if (s.sanctionsRisk) comp -= 20;
  why.compliance = [late ? `${late} late` : null, missed ? `${missed} missed` : null, materialMiss ? 'no materiality determination' : null,
    s.sanctionsRisk ? 'paid without a sanctions screen' : null].filter(Boolean).join('; ') || 'every clock met';

  const parts = {
    denial: clamp(d), continuity: clamp(cont), cost: clamp(cost), compliance: clamp(comp), trust: clamp(s.biz.rep), forensics: clamp(s.ev),
  };
  why.trust = `reputation ${Math.round(s.biz.rep)} of 100${s.claimBroken ? '; the reassuring statement was proved wrong' : ''}`;
  why.forensics = `evidence ${Math.round(s.ev)} of 100${s.d.wipedUnimaged ? '; hosts wiped before imaging' : ''}`;
  const total = Math.round(Object.entries(WEIGHTS).reduce((a, [k, w]) => a + w * parts[k], 0));
  return { total, parts, why, verdict: verdict(total) };
}

export function verdict(x) {
  return x >= 85 ? 'Textbook response' : x >= 72 ? 'Strong response' : x >= 58 ? 'Rough but recovered' : x >= 45 ? 'Costly incident' : 'Crisis';
}
