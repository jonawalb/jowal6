// Dwell Time: the after-action report. Turns a finished game into a timeline (what the attacker really did
// against what the team did), findings with NIST CSF 2.0 references, and exports (JSON, CSV).
import { actionById, ROLES } from './actions.js';
import { clockText, fill, KINDS } from './engine.js';
import { scenarioById } from '../data/scenarios/index.js';
import { sectorById } from '../data/sectors.js';
import { CONTROLS } from '../data/posture.js';
import { CSF } from '../data/csf.js';
import { score, PART_LABEL, WEIGHTS } from './score.js';

const stageOf = (sc, id) => sc.stages.find(x => x.id === id);
const roleLabel = id => ROLES.find(r => r.id === id)?.label || id;

/** One row per turn: the clock, every attacker event and every action the team took. */
export function timeline(s) {
  const sc = scenarioById(s.scen);
  const rows = [];
  const advText = (e) => {
    if (!e.stage) return e.blocked === 'offline' ? { text: 'Could not act: the network was off the internet.', tech: '', ok: false, seen: null } : null;
    if (e.stage === 'burrow') return { text: `Noticed the response and dug in: ${e.label}.`, tech: 'T1505 / T1098', ok: true, seen: false, tip: true };
    if (e.stage === 'smash') return { text: fill(sc.smashText || 'Noticed the response and grabbed everything it could reach before losing access.', s), tech: sc.smashTech || 'T1567', ok: true, seen: false, tip: true };
    if (e.stage === 'reencrypt') return { text: 'Re-encrypted systems that had been restored while it still held admin access.', tech: 'T1486', ok: true, seen: true };
    const st = stageOf(sc, e.stage);
    if (!st) return null;
    return { text: e.ok ? fill(st.act, s) + (e.reentry ? ' (getting back in)' : '') : `Tried: ${fill(st.act, s).replace(/\.$/, '')}, and was blocked.`,
      tech: st.tech.map(t => t[0]).join(', '), techNames: st.tech.map(t => `${t[0]} ${t[1]}`).join('; '), tactic: st.tactic, ok: e.ok, seen: e.ok ? !!e.detected : null, p: e.p };
  };
  for (const l of s.log) {
    const adv = [...(l.t === 0 ? s.prelog || [] : []), ...l.adv].map(advText).filter(Boolean);
    if (l.tipped && !adv.some(a => a.tip)) adv.unshift({ text: 'Saw the response coming (partial containment, or planning on channels it could read).', tech: '', ok: true, seen: false, tip: true });
    rows.push({ t: l.t, clock: clockText(sc, l.h), h: l.h, acts: l.acts.map(id => ({ id, role: actionById(id).role, label: fill(actionById(id).label, s) })),
      adv, ops: l.ops, exfil: l.exfil, enc: l.enc, note: l.note });
  }
  return rows;
}

/** Findings: what went wrong, what went right, and what to fix, each tied to a CSF 2.0 category. */
export function findings(s) {
  const sc = scenarioById(s.scen), sec = sectorById(s.sector);
  const F = [];
  const add = (sev, csf, title, text, rec) => F.push({ sev, csf, title, text, rec });
  const tl = timeline(s);
  const firstFlagT = s.flags.find(x => x.real)?.t;

  // Detection.
  const missed = sc.stages.filter(st => s.hits[st.id] && s.hits[st.id].seen === 0 && st.det < 1);
  if (missed.length) add('high', 'DE.CM', `${missed.length} attacker step${missed.length > 1 ? 's' : ''} never detected`,
    missed.map(st => `${st.tactic}: ${fill(st.act, s)} (${st.tech.map(t => t[0]).join(', ')})`).join(' '),
    missed.map(st => `To catch "${st.tactic.toLowerCase()}": ${fill(st.catch, s)}`).join(' '));
  // Remaining access.
  if (s.remaining?.length) add('high', 'RS.MI', 'The attacker still had access when the exercise ended',
    `Still in place: ${s.remaining.map(f => `${f.label} (${KINDS[f.kind]})`).join('; ')}.`,
    'Scope before you evict: hunt until new searches stop finding access, then remove everything in one window. Plan a post-eviction watch period.');
  // Tip-offs.
  const tips = s.log.filter(l => l.tipped);
  if (tips.length) add('high', 'RS.MI', 'Partial containment warned the attacker',
    `In turn ${tips.map(l => l.t + 1).join(', ')} you removed some of the attacker's access while it still had other ways in${s.adv.everComms && !s.d.oob ? ', or planned on channels it was reading' : ''}. ${sc.onTip === 'accelerate' ? 'It sped up.' : sc.onTip === 'burrow' ? 'It dug in deeper.' : 'It grabbed what it could.'}`,
    'Watch quietly while you scope; contain in one coordinated window; plan on an out-of-band channel.');
  if (s.adv.everComms && !s.d.oob) add('med', 'RS.CO', 'The response was planned on a channel the attacker could read',
    'The attacker had access to mail or chat during the response and the team never moved out of band.',
    'Pre-arrange an out-of-band channel (separate identity, separate devices) and move to it at the first sign of an identity compromise.');
  // Declaration and help.
  if (s.d.aware != null && (s.d.declared == null || s.d.declared > s.d.aware + 1))
    add('med', 'RS.MA', s.d.declared == null ? 'The incident was never formally declared' : 'The incident was declared late',
      `The organization was on notice from turn ${s.d.aware + 1}${s.d.declared != null ? ` but declared in turn ${s.d.declared + 1}` : ''}.`,
      'Write declaration criteria into the plan so the on-call lead can declare without waiting for executives.');
  if (s.d.ir == null && s.d.aware != null) add('med', 'RS.MA', 'No outside responders were engaged',
    'The internal team handled the incident alone.', 'Keep an IR retainer with committed response times; most insurers have panel firms.');
  else if (s.d.ir != null && s.d.aware != null && s.d.ir > s.d.aware + 1) add('low', 'RS.MA', 'Outside responders were brought in late', `Engaged in turn ${s.d.ir + 1}.`, 'Engage on suspicion, not on confirmation; a retainer makes this cheap.');
  // Evidence.
  if (s.d.wipedUnimaged) add('med', 'RS.AN', 'Systems were wiped before they were imaged', 'Evidence on rebuilt hosts is gone, which weakens scoping, insurance claims and any prosecution.', 'Image disks and memory first; isolate rather than power off.');
  // Restore before eviction.
  if (s.log.some(l => l.reencrypted)) add('high', 'RC.RP', 'Restored systems were encrypted again', 'You restored while the attacker still held admin access.', 'Evict, confirm, then restore into a clean environment.');
  // Clocks.
  for (const c of s.clocks) {
    if (c.status === 'late' || c.status === 'missed') add('high', 'RS.CO', `${c.label}: ${c.status}`,
      `Due ${clockText(sc, c.dueH)} (day ${Math.floor(c.dueH / 24) + 1}).${c.filedH != null ? ` Filed ${clockText(sc, c.filedH)}.` : ''}`, 'Map every reporting clock in advance: trigger, deadline, who files, and what a first notice must contain.');
  }
  const materialMiss = sec.public && s.d.materialT == null && (s.adv.encMax > 0.3 || s.adv.exfil > 0.2 || s.biz.opsHist.some(x => x.ops < 60));
  if (materialMiss) add('high', 'GV.OC', 'No materiality determination', 'A public company with this much impact must determine materiality without unreasonable delay; the 8-K clock starts at that determination.', 'Pre-agree who sits on the disclosure committee and what facts it needs.');
  // Statements.
  if (s.claimBroken) add('high', 'RS.CO', 'The reassuring statement was proved wrong', 'You said there was no evidence data was accessed; data was stolen.', 'Say only what you know; "we are investigating" ages well.');
  if (s.d.publicT != null && (!s.d.statements.length || s.d.statements[0].t > s.d.publicT + 1)) add('med', 'RS.CO', 'Silence after the incident went public', 'The outage or leak was visible before you said anything.', 'Have holding statements drafted for the likely scenarios.');
  // Insurance and payment.
  if (s.posture.insured && (s.d.insurer == null || (s.d.aware != null && s.d.insurer > s.d.aware + 2))) add('med', 'GV.RM', 'The insurer was notified late or not at all', 'Late notice put coverage at risk.', 'Notify the carrier on suspicion; use its panel responders and counsel.');
  if (s.ransom?.paid != null) add(s.sanctionsRisk ? 'high' : 'med', 'GV.OC', 'A ransom was paid',
    `${s.ransom.decryptor ? 'The decryptor worked, slowly.' : s.adv.encMax ? 'The decryptor failed on most systems.' : ''} ${s.ransom.leaked ? 'The data was published anyway.' : 'The data has not appeared publicly, which is no guarantee it was deleted.'}${s.sanctionsRisk ? ' No sanctions screen was done before paying.' : ''}`,
    'Decide your payment policy before an incident: who decides, sanctions screening, insurer consent, and the 24-hour reporting duties that some regulators impose.');
  // Backups.
  if (s.adv.backupsHit) add('med', 'PR.DS', 'Backups were destroyed', 'The attacker reached the backups through the domain.', 'Keep immutable or offline backups outside the main identity domain, and rehearse restores.');
  // Posture lessons tied to how they got in.
  for (const st of sc.stages) {
    if (!s.adv.done.includes(st.id) || !st.ctl) continue;
    for (const [c, m] of Object.entries(st.ctl)) {
      if (s.posture[c] || m > 0.7) continue;
      const ctl = CONTROLS.find(x => x.id === c);
      if (ctl && !F.some(f => f.title === `Missing control: ${ctl.label}`)) add('low', ctl.csf, `Missing control: ${ctl.label}`,
        `It would have cut the odds of "${st.tactic.toLowerCase()}" (${st.tech[0][0]}) to ${Math.round(m * 100)}% of what they were.`, ctl.text);
    }
  }
  // Strengths.
  if (s.adv.evictedT != null && !s.remaining?.length) add('good', 'RS.MI', 'Full eviction', `No attacker access remained after turn ${s.adv.evictedT + 1}.`, 'Keep the post-eviction watch going for weeks; attackers often try to return.');
  if (s.d.oob && s.adv.everComms) add('good', 'RS.CO', 'Moved out of band', 'The attacker was reading mail and chat; your plan was not on them.', '');
  if (s.clocks.length && s.clocks.every(c => c.status === 'on time' || c.status === 'open')) add('good', 'RS.CO', 'Every reporting clock met', '', '');
  if (s.d.le != null) add('good', 'RS.CO', 'Law enforcement brought in', `Contacted in turn ${s.d.le + 1}.`, '');
  const order = { high: 0, med: 1, low: 2, good: 3 };
  return F.sort((a, b) => order[a.sev] - order[b.sev]);
}

/** Which CSF 2.0 categories the team exercised, and which the incident tested but the team did not. */
export function csfCoverage(s) {
  const used = {};
  for (const l of s.log) for (const id of l.acts) { const c = actionById(id).csf; used[c] = (used[c] || 0) + 1; }
  for (const c of CONTROLS) if (s.posture[c.id]) used[c.csf] = (used[c.csf] || 0) + 0.5;
  const fns = ['GV', 'ID', 'PR', 'DE', 'RS', 'RC'];
  return fns.map(fn => ({ fn, name: CSF.functions[fn], cats: Object.entries(CSF.categories).filter(([id]) => id.startsWith(fn)).map(([id, name]) => ({ id, name, n: used[id] || 0 })) }));
}

export function report(s) {
  const sc = scenarioById(s.scen), sec = sectorById(s.sector);
  return { scenario: sc.title, sector: sec.label, org: sec.org, seed: s.seed, mode: s.mode,
    posture: CONTROLS.filter(c => s.posture[c.id]).map(c => c.label), score: score(s), money: s.money, clocks: s.clocks,
    timeline: timeline(s), findings: findings(s), weights: WEIGHTS, labels: PART_LABEL };
}

const csvCell = v => { const x = v == null ? '' : String(v); return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
export function toCsv(s) {
  const r = report(s);
  const lines = [['section', 'turn', 'clock', 'who', 'item', 'detail', 'reference'].join(',')];
  for (const row of r.timeline) {
    for (const a of row.adv) lines.push(['timeline', row.t + 1, row.clock, 'Attacker', a.text, a.ok ? (a.seen ? 'detected' : 'not detected') : 'blocked', a.tech].map(csvCell).join(','));
    for (const a of row.acts) lines.push(['timeline', row.t + 1, row.clock, roleLabel(a.role), a.label, '', actionById(a.id).csf].map(csvCell).join(','));
    if (row.note) lines.push(['timeline', row.t + 1, row.clock, 'Facilitator note', row.note, '', ''].map(csvCell).join(','));
  }
  for (const f of r.findings) lines.push(['finding', '', '', f.sev, f.title, `${f.text} ${f.rec}`.trim(), f.csf].map(csvCell).join(','));
  for (const c of r.clocks) lines.push(['clock', '', '', c.who, c.label, c.status, c.src].map(csvCell).join(','));
  return lines.join('\n');
}
