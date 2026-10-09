// Every decision a seat at the table can make. Each action names its seat (role), what it costs in that seat's
// attention this turn (slots) and in money (usd, thousands), the NIST CSF 2.0 category it exercises (csf), when it
// is allowed (req), and what it does (apply). `order` sets the order actions resolve within a turn.
import { contain, openFlags, REMOVES, fill, updateClocks, leak } from './engine.js';
import { sectorById } from '../data/sectors.js';

export const ROLES = [
  { id: 'ceo', label: 'CEO', long: 'Chief executive', text: 'Owns business-disrupting decisions, the board, materiality and any ransom decision.' },
  { id: 'ciso', label: 'CISO', long: 'Chief information security officer', text: 'Runs the incident: declares it, brings in help, sets the eviction plan.' },
  { id: 'it', label: 'IT / SecOps', long: 'IT and security operations lead', text: 'Hands on keyboard: triage, hunting, containment, imaging and recovery.' },
  { id: 'legal', label: 'Legal', long: 'General counsel', text: 'Privilege, insurance, sanctions screening and every regulatory clock.' },
  { id: 'comms', label: 'Comms', long: 'Communications lead', text: 'What staff, customers, reporters and partners hear, and when.' },
];

export function slotsFor(s) {
  const dec = s.d.declared != null, ir = s.d.irOn != null && s.d.irOn <= s.t;
  return { ceo: 1, ciso: 1 + (dec ? 1 : 0), it: 2 + (dec ? 1 : 0) + (ir ? 2 : 0) + (s.posture.plan ? 1 : 0), legal: 1 + (dec ? 1 : 0), comms: 1 };
}
export const cost = a => a.slots || { [a.role]: 1 };

const has = (chosen, id) => chosen.includes(id);
const authed = (s, chosen) => s.d.auth != null || has(chosen, 'authorize');
const declared = (s, chosen) => s.d.declared != null || has(chosen, 'declare');
const NEED_AUTH = 'Needs the CEO\'s authorization for business-disrupting containment.';
const pay = (s, k, bucket = 'response') => { s.biz.cost[bucket] += k; };
const kindsOpen = (s, kinds) => openFlags(s, kinds).length;

export const ACTIONS = [
  /* ---------- CEO ---------- */
  { id: 'authorize', role: 'ceo', order: 1, csf: 'GV.RR', once: true, done: s => s.d.auth != null,
    label: 'Authorize disruptive containment',
    text: 'Give the response team standing authority to take systems offline, cut network links and force company-wide resets, even if the business stops.',
    apply(s, c) { s.d.auth = s.t; c.notes.push('The CEO authorized business-disrupting containment.'); } },
  { id: 'continuity', role: 'ceo', order: 2, csf: 'RC.RP', once: true, done: s => s.d.continuity != null,
    label: 'Activate business continuity (downtime procedures)',
    text: 'Switch to manual and downtime procedures (paper workflows, manual plant operation, branch fallbacks). Every disruption hurts 25% less. Costs about $20k a turn.',
    apply(s, c) { s.d.continuity = s.t; c.notes.push('Business continuity procedures are active.'); } },
  { id: 'board', role: 'ceo', order: 3, csf: 'GV.OV', once: true, done: s => s.d.board != null,
    label: 'Brief the board',
    text: 'Tell the board what you know, what you do not, and the decisions coming. Boards that hear late tend to overrule.',
    apply(s, c) { s.d.board = s.t; c.notes.push('The board has been briefed.'); } },
  { id: 'materiality', role: 'ceo', order: 4, csf: 'GV.OC', once: true, done: s => s.d.materialT != null,
    label: 'Convene the disclosure committee: determine materiality',
    text: 'A public company must decide "without unreasonable delay" whether the incident is material. A yes starts the four-business-day SEC Form 8-K clock.',
    req: (s, sc, ch) => (!sectorById(s.sector).public ? 'Only for publicly traded companies.' : s.d.aware == null && !declared(s, ch) ? 'Nothing confirmed to assess yet.' : null),
    apply(s, c) { s.d.materialT = s.t; c.notes.push('The disclosure committee determined the incident is material. The SEC Form 8-K is due in four business days.'); } },
  { id: 'negotiate', role: 'ceo', order: 20, csf: 'RS.MA', once: true, done: s => !!s.ransom?.negotiated,
    label: 'Open negotiations (through counsel and a negotiator)',
    text: 'Buy time and information: confirm what they took and test whether they can decrypt. Professional negotiators usually lower the demand.',
    req: (s, sc, ch) => (!s.ransom ? 'No demand has been made.' : s.ransom.paid != null ? 'Already paid.' : s.d.counsel == null && s.d.irOn == null && !ch.includes('counsel') ? 'Needs outside counsel or the IR firm to run it.' : null),
    apply(s, c) { s.ransom.negotiated = true; s.ransom.demand = Math.round(s.ransom.demand * 0.55); s.ransom.deadline += 1; c.notes.push(`Negotiations bought a day and brought the demand to $${(s.ransom.demand / 1000).toFixed(1)}M.`); } },
  { id: 'pay', role: 'ceo', order: 21, csf: 'RS.MI', once: true, done: s => s.ransom?.paid != null,
    label: 'Pay the ransom',
    text: 'Pay for a decryptor and a promise to delete stolen data. Decryptors are slow and imperfect, the promise is unenforceable, and paying a sanctioned group can violate US sanctions even if you did not know (OFAC applies strict liability).',
    req: s => (!s.ransom ? 'No demand has been made.' : null),
    apply(s, c, rng) {
      const r = s.ransom; r.paid = s.t; r.consent = s.d.insurer != null; s.d.paidT = s.t;
      pay(s, r.demand, 'ransom');
      if (s.adv.enc > 0) r.decryptor = rng.u() < 0.85;
      r.suppressed = rng.u() < 0.6;
      if (!r.suppressed && s.adv.exfil > 0.1) leak(s);
      if (!s.d.ofac) { s.sanctionsRisk = true; c.notes.push('The ransom was paid without a sanctions screen.'); }
      if (!r.consent && s.posture.insured) c.notes.push('The insurer was not consulted, so the payment is not covered.');
      c.notes.push(`Paid $${(r.demand / 1000).toFixed(1)}M. ${s.adv.enc > 0 ? (r.decryptor ? 'A decryptor arrived; it is slow.' : 'The decryptor they sent does not work on most systems.') : ''}`);
      s.biz.rep -= 3;
    } },

  /* ---------- CISO ---------- */
  { id: 'declare', role: 'ciso', order: 1, csf: 'RS.MA', once: true, done: s => s.d.declared != null,
    label: 'Declare a major incident',
    text: 'Activate the incident-response plan: an incident commander, a battle rhythm, and more hands on every seat from next turn.',
    apply(s, c) { s.d.declared = s.t; c.noisy = true; c.notes.push('A major incident was declared.'); } },
  { id: 'irfirm', role: 'ciso', order: 2, csf: 'RS.MA', once: true, done: s => s.d.ir != null,
    label: 'Engage the incident-response firm',
    text: 'Outside responders bring forensic and hunting depth: +2 IT/SecOps actions a turn and better hunting once on site. With a retainer they arrive next turn; without one, a turn later and at a higher rate.',
    apply(s, c) {
      s.d.ir = s.t; s.d.irOn = s.t + (s.posture.retainer ? 1 : 2);
      pay(s, s.posture.retainer ? 250 : 400);
      c.notes.push(`The IR firm is engaged and will be on site ${s.posture.retainer ? 'next turn' : 'in two turns'}.`);
    } },
  { id: 'oob', role: 'ciso', order: 3, csf: 'RS.CO', once: true, done: s => s.d.oob,
    label: 'Move response communications out of band',
    text: 'Run the response on phones and a separate, clean chat and bridge, not corporate email or chat. Attackers who read your mail watch you plan.',
    apply(s, c) { s.d.oob = true; pay(s, 10); c.notes.push('The response team moved to an out-of-band channel.'); } },
  { id: 'le', role: 'ciso', order: 4, csf: 'RS.CO', once: true, done: s => s.d.le != null,
    label: 'Contact the FBI and CISA',
    text: 'Report to the local FBI field office and CISA. They may share indicators from other victims, and early reporting is a mitigating factor if a payment question arises.',
    apply(s, c) { s.d.le = s.t; s.d.leIntel = true; c.notes.push('The FBI field office and CISA have been contacted.'); } },
  { id: 'intel', role: 'ciso', order: 5, csf: 'DE.AE',
    label: 'Pull threat intelligence on this activity',
    text: 'Match what you have seen against known playbooks. Better odds of spotting the next step for two turns, and a likely next move.',
    req: s => (!s.flags.some(x => x.st === 'confirmed' && x.real) && !s.flags.length ? 'Nothing to match yet.' : null),
    apply(s, c) { s.d.intel = 2; c.notes.push(`Threat intel: ${fill(c.sc.intelHint || 'expect the attacker to move toward your most valuable systems next.', s)}`); } },
  { id: 'evict', role: 'ciso', order: 40, csf: 'RS.MI', slots: { ciso: 1, it: 2 },
    label: 'Execute a coordinated eviction',
    text: 'All at once, in one window: disable every flagged account, isolate every flagged host, rotate cloud credentials, block known indicators and reset privileged credentials. It only works if you have found all of their access.',
    req: (s, sc, ch) => (!declared(s, ch) ? 'Declare a major incident first.' : !authed(s, ch) ? NEED_AUTH : !s.flags.length ? 'Nothing found to evict yet.' : null),
    apply(s, c) {
      const r = contain(s, null, c, 'evict');
      for (const f of s.adv.fh) if (f.on && (f.kind === 'priv' || f.kind === 'account' || f.kind === 'cloud' || f.kind === 'comms')) { f.on = false; f.offT = s.t; c.removed.push(f); }
      c.opsHit += 12; pay(s, 60);
      s.d.evictT = s.t;
      c.notes.push(`Coordinated eviction: ${r.real + r.fp} flagged items contained${r.fp ? ` (${r.fp} were false alarms)` : ''}, and every account, privileged and cloud credential was reset.`);
    } },

  /* ---------- IT / SecOps ---------- */
  { id: 'triage', role: 'it', order: 10, csf: 'DE.AE',
    label: 'Triage the alert queue',
    text: 'Work every new alert to a verdict: confirmed malicious or false positive. Containment then hits only real things.',
    req: s => (!s.flags.some(x => x.st === 'new') ? 'No untriaged alerts.' : null),
    apply(s, c) {
      let r = 0, f = 0;
      for (const x of s.flags) if (x.st === 'new') { if (x.real) { x.st = 'confirmed'; r++; } else { x.st = 'fp'; f++; } }
      c.notes.push(`Triage: ${r} confirmed malicious, ${f} false positive${f === 1 ? '' : 's'}.`);
    } },
  { id: 'hunt', role: 'it', order: 11, csf: 'RS.AN',
    label: 'Threat-hunt across the estate',
    text: 'Search for what the alerts missed: the same tools, accounts and behavior elsewhere. Better with EDR, logs, the IR firm, and indicators from the FBI or CISA.',
    apply(s, c, rng) {
      c.noisy = true;
      let found = 0;
      const ir = s.d.irOn != null && s.d.irOn <= s.t;
      for (const f of s.adv.fh) {
        if (!f.on || s.flags.some(x => x.fid === f.id && x.st !== 'done')) continue;
        let p = 0.2 + (s.posture.edr ? 0.2 : 0) + (s.posture.logs ? 0.15 : 0) + (ir ? 0.2 : 0) + (s.d.leIntel && c.sc.leIntel ? c.sc.leIntel.hunt || 0 : 0);
        if (f.kind === 'persist' || f.kind === 'cloud') p -= s.posture.logs ? 0.05 : 0.15;
        if (f.kind === 'vendor' && s.posture.vendor) p += 0.25;
        if (rng.u() < Math.min(0.9, p)) {
          s.flags.push({ id: `x${s.nextId++}`, kind: f.kind, label: f.label, real: true, fid: f.id, st: 'confirmed', t: s.t, src: 'hunt' });
          found++;
        }
      }
      if (s.adv.exfil > 0.05 && rng.u() < 0.35 + (s.posture.logs ? 0.3 : 0) + (ir ? 0.15 : 0)) s.d.scopedExfil = true;
      s.lastHunt = { t: s.t, found };
      c.notes.push(found ? `The hunt found ${found} more piece${found === 1 ? '' : 's'} of attacker access.` : 'The hunt found nothing new.');
      if (s.d.scopedExfil && !s.d.exfilNoted) { s.d.exfilNoted = true; c.notes.push('It also found evidence that data was staged and sent out.'); }
    } },
  { id: 'monitor', role: 'it', order: 12, csf: 'DE.CM',
    label: 'Watch quietly',
    text: 'Raise logging and watch the attacker\'s known access without touching it. Better odds of seeing their next move this turn, and it is unlikely to tip them off.',
    apply(s, c) { s.d.monitor = true; c.notes.push('Extra monitoring on known attacker access this turn.'); } },
  { id: 'image', role: 'it', order: 13, csf: 'RS.AN',
    label: 'Capture forensic images and memory',
    text: 'Copy disks and memory of affected systems before anything is wiped. Keeps the evidence for scoping, insurers, regulators and law enforcement.',
    req: s => (!s.flags.some(x => x.real && x.st !== 'fp') && !s.flags.length ? 'Nothing flagged to image.' : null),
    apply(s, c) { s.ev = Math.min(100, s.ev + 20); s.d.imaged = s.t + 1; pay(s, 15); c.notes.push('Forensic images and memory captured.'); } },
  { id: 'disable', role: 'it', order: 30, csf: 'RS.MI',
    label: 'Disable flagged accounts and revoke their sessions',
    text: 'Lock every flagged account and kill its sessions and tokens. Fast, but anything you have not found is still in.',
    req: s => (!kindsOpen(s, REMOVES.disable) ? 'No flagged accounts.' : null),
    apply(s, c) { const r = contain(s, REMOVES.disable, c, 'disable'); c.notes.push(`Disabled ${r.real + r.fp} flagged account${r.real + r.fp === 1 ? '' : 's'}${r.fp ? ` (${r.fp} belonged to real employees doing nothing wrong)` : ''}.`); } },
  { id: 'isolate', role: 'it', order: 31, csf: 'RS.MI',
    label: 'Network-isolate flagged hosts',
    text: 'Cut flagged machines off the network with EDR, leaving them powered on for forensics. Persistence on them stops working.',
    req: s => (!kindsOpen(s, REMOVES.isolate) ? 'No flagged hosts.' : null),
    apply(s, c) { const r = contain(s, REMOVES.isolate, c, 'isolate'); c.notes.push(`Isolated ${r.real + r.fp} flagged host${r.real + r.fp === 1 ? '' : 's'}.`); } },
  { id: 'rotate', role: 'it', order: 32, csf: 'RS.MI',
    label: 'Rotate cloud identity secrets and tokens',
    text: 'Revoke refresh tokens, rotate app secrets and the token-signing certificate. Password resets alone do not remove forged or stolen cloud tokens.',
    req: (s, sc, ch) => (!authed(s, ch) ? NEED_AUTH : null),
    apply(s, c) {
      for (const f of s.adv.fh) if (f.on && f.kind === 'cloud') { f.on = false; f.offT = s.t; c.removed.push(f); }
      contain(s, REMOVES.rotate, c, 'rotate');
      c.opsHit += 5; pay(s, 40); c.notes.push('Cloud tokens revoked and signing secrets rotated. Everyone signs in again.');
    } },
  { id: 'resetall', role: 'it', order: 33, csf: 'RS.MI', slots: { it: 2 },
    label: 'Enterprise-wide credential reset',
    text: 'Reset every user, admin and service-account password and the domain\'s Kerberos (krbtgt) key twice, letting the first reset replicate before the second. Removes stolen credentials you have not found, at a heavy cost to the business for a turn.',
    req: (s, sc, ch) => (!authed(s, ch) ? NEED_AUTH : null),
    apply(s, c) {
      for (const f of s.adv.fh) if (f.on && ['account', 'priv', 'comms'].includes(f.kind)) { f.on = false; f.offT = s.t; c.removed.push(f); }
      contain(s, ['account', 'priv', 'comms'], c, 'resetall');
      c.opsHit += 15; pay(s, 80); c.notes.push('Every credential was reset. The business lost most of a day to lockouts.');
    } },
  { id: 'reimage', role: 'it', order: 34, csf: 'RS.MI',
    label: 'Wipe and rebuild flagged hosts',
    text: 'Reinstall flagged machines from known-good images. Removes persistence on them for good, and destroys their evidence unless you imaged first.',
    req: s => (!kindsOpen(s, REMOVES.reimage) ? 'No flagged hosts.' : null),
    apply(s, c) {
      const r = contain(s, REMOVES.reimage, c, 'reimage');
      if (!s.d.imaged) { s.ev = Math.max(0, s.ev - 15); s.d.wipedUnimaged = (s.d.wipedUnimaged || 0) + 1; c.notes.push('Hosts were wiped before imaging; their evidence is gone.'); }
      pay(s, 40, 'recovery'); c.notes.push(`Rebuilt ${r.real + r.fp} host${r.real + r.fp === 1 ? '' : 's'}.`);
    } },
  { id: 'block', role: 'it', order: 35, csf: 'RS.MI',
    label: 'Block known attacker infrastructure',
    text: 'Block the domains, IP addresses and file hashes you have confirmed. Slows command-and-control and theft, but blocking before you have scoped can warn the attacker and cost you visibility (CISA AA20-245A).',
    req: (s, sc, ch) => (!s.flags.some(x => x.st === 'confirmed' || x.st === 'done') && !(ch.includes('triage') && s.flags.some(x => x.st === 'new')) ? 'No confirmed indicators yet.' : null),
    apply(s, c) { s.adv.quiet = Math.max(s.adv.quiet, 1); c.blockTip = true; c.notes.push('Known attacker infrastructure is blocked at the edge.'); } },
  { id: 'egress', role: 'it', order: 36, csf: 'RS.MI', once: true, done: s => s.d.egress,
    label: 'Restrict internet egress',
    text: 'Allow outbound traffic only to approved destinations. Throttles data theft sharply, and breaks some business tools.',
    req: (s, sc, ch) => (!authed(s, ch) ? NEED_AUTH : null),
    apply(s, c) { s.d.egress = true; c.notes.push('Outbound traffic is restricted to an allow-list.'); } },
  { id: 'offline', role: 'it', order: 37, csf: 'RS.MI', once: true, done: s => s.d.offline,
    label: 'Disconnect core IT from the internet',
    text: 'Pull the organization off the internet. The attacker cannot act remotely, and neither can much of the business.',
    req: (s, sc, ch) => (!authed(s, ch) ? NEED_AUTH : null),
    apply(s, c) { s.d.offline = true; s.d.offT = s.t; c.notes.push('Core IT is disconnected from the internet.'); } },
  { id: 'online', role: 'it', order: 38, csf: 'RC.RP', once: true, done: s => !s.d.offline,
    label: 'Reconnect to the internet',
    text: 'Bring the organization back online. If the attacker still has access you have not removed, it resumes.',
    req: s => (!s.d.offline ? 'Not disconnected.' : null),
    apply(s, c) { s.d.offline = false; c.notes.push('Core IT is back online.'); } },
  { id: 'otcut', role: 'it', order: 39, csf: 'RS.MI', once: true, done: s => s.d.otCut,
    label: 'Sever IT–OT connections',
    text: 'Cut every link between the business network and {ot}. Operators run them locally or by hand.',
    req: (s, sc, ch) => (!authed(s, ch) ? NEED_AUTH : null),
    apply(s, c) { s.d.otCut = true; c.notes.push('IT–OT connections are severed; operators are running locally.'); } },
  { id: 'rebuild', role: 'it', order: 41, csf: 'RC.RP', slots: { it: 2 },
    label: 'Rebuild the identity core (clean-room AD recovery)',
    text: 'Recover the directory from a known-clean point into an isolated environment and rebuild trust. Removes deep persistence; expensive and slow.',
    req: (s, sc, ch) => (!authed(s, ch) ? NEED_AUTH : !declared(s, ch) ? 'Declare a major incident first.' : null),
    apply(s, c) {
      for (const f of s.adv.fh) if (f.on && ['account', 'priv', 'persist', 'comms'].includes(f.kind)) { f.on = false; f.offT = s.t; c.removed.push(f); }
      contain(s, ['account', 'priv', 'persist', 'comms'], c, 'rebuild');
      c.opsHit += 10; pay(s, 300, 'recovery');
      if (!s.d.imaged) { s.ev = Math.max(0, s.ev - 10); }
      c.notes.push('The identity core was rebuilt from a clean point.');
    } },
  { id: 'restore', role: 'it', order: 50, csf: 'RC.RP',
    label: 'Restore systems from backup',
    text: 'Bring encrypted systems back, priority systems first. Restoring while the attacker is still inside invites a second round.',
    req: s => (s.adv.enc <= 0 ? 'Nothing is encrypted.' : null),
    apply(s, c) {
      const ok = !s.adv.backupsHit;
      const step = ok ? 0.4 : s.ransom?.decryptor ? 0.3 : 0.15;
      s.adv.enc = Math.max(0, +(s.adv.enc - step).toFixed(2)); s.d.restoreTries++;
      pay(s, 50, 'recovery');
      c.notes.push(ok ? 'Restored a block of systems from clean backups.' : s.ransom?.decryptor ? 'Decrypting systems with the attacker\'s tool, slowly.' : 'Backups were destroyed; rebuilding systems from scratch, slowly.');
    } },

  { id: 'vector', role: 'it', order: 14, csf: 'PR.AA', once: true, done: s => s.d.vectorClosed,
    label: '{vectorFix}',
    text: '{vectorText}',
    req: (s, sc, ch) => (s.d.aware == null && !s.flags.some(x => x.st === 'confirmed' || x.st === 'done') && !ch.includes('triage') && !ch.includes('declare') ? 'You do not yet know how they got in.' : null),
    apply(s, c) { s.d.vectorClosed = true; pay(s, 20); c.notes.push(fill('Closed the way in: {vectorFix}.', s).replace('.: ', ': ')); } },
  { id: 'vendoroff', role: 'it', order: 37, csf: 'GV.SC', once: true, done: s => s.d.vendorOff, scen: ['supply'],
    label: 'Shut down the compromised vendor software everywhere',
    text: 'Disconnect or power down every instance of {vendor}, as the advisory says. Its backdoor stops working; so does everything it manages.',
    req: (s, sc, ch) => (!authed(s, ch) ? NEED_AUTH : null),
    apply(s, c) { s.d.vendorOff = true; contain(s, ['vendor'], c, 'vendoroff');
      for (const f of s.adv.fh) if (f.on && f.kind === 'vendor') { f.on = false; f.offT = s.t; c.removed.push(f); }
      c.notes.push(fill('Every instance of {vendor} is shut down.', s)); } },

  /* ---------- Legal ---------- */
  { id: 'counsel', role: 'legal', order: 2, csf: 'GV.RR', once: true, done: s => s.d.counsel != null,
    label: 'Retain outside breach counsel',
    text: 'Counsel directs the forensic work so findings are more likely to stay privileged, and runs notifications. About $150k plus fees.',
    apply(s, c) { s.d.counsel = s.t; pay(s, 150); c.notes.push('Outside breach counsel retained.'); } },
  { id: 'insurer', role: 'legal', order: 3, csf: 'GV.RM', once: true, done: s => s.d.insurer != null,
    label: 'Notify the cyber insurer',
    text: 'Most policies require prompt notice, and the insurer\'s consent before hiring vendors outside its panel or paying any ransom. Late notice can cost you the coverage.',
    req: s => (!s.posture.insured ? 'No cyber policy.' : null),
    apply(s, c) { s.d.insurer = s.t; c.notes.push('The insurer has been notified and assigned a claims handler.'); } },
  { id: 'hold', role: 'legal', order: 4, csf: 'RS.AN', once: true, done: s => s.d.hold,
    label: 'Issue a legal hold',
    text: 'Preserve logs, mail and systems relevant to the incident. Stops routine deletion of evidence.',
    apply(s, c) { s.d.hold = true; s.ev = Math.min(100, s.ev + 10); c.notes.push('A legal hold is in place.'); } },
  { id: 'ofac', role: 'legal', order: 5, csf: 'GV.OC', once: true, done: s => s.d.ofac,
    label: 'Screen the extortionist against sanctions lists',
    text: 'Check the group, wallets and intermediaries against OFAC sanctions lists before any payment is considered.',
    req: s => (!s.ransom ? 'No demand has been made.' : null),
    apply(s, c) { s.d.ofac = true; c.notes.push(`Sanctions screen: ${c.sc.ofacText || 'no direct match, but affiliations cannot be ruled out.'}`); } },
  { id: 'file', role: 'legal', order: 60, csf: 'RS.CO',
    label: 'File the notices now due to regulators',
    text: 'File every regulator or government notice whose clock is running. Filing on partial facts and updating later is normal; missing a deadline is not.',
    req: (s, sc, ch) => (!s.clocks.some(k => k.via === 'file' && k.filedH == null) && !ch.includes('materiality') && !ch.includes('pay') ? 'No regulator clock is running.' : null),
    apply(s, c) {
      const sc = c.sc; const h = sc.turns[s.t].h + 1;
      updateClocks(s, sc, c.sec);
      const done = s.clocks.filter(k => k.via === 'file' && k.filedH == null);
      for (const k of done) k.filedH = h;
      c.notes.push(`Filed: ${done.map(k => k.label).join('; ')}.`);
    } },
  { id: 'notify', role: 'legal', order: 61, csf: 'RC.CO',
    label: 'Notify affected {people}',
    text: 'Send the notices owed to the people or customers whose data was taken (letters, a call center, credit monitoring where appropriate).',
    req: s => (!s.clocks.some(k => k.via === 'people' && k.filedH == null) ? 'No notice to affected people is due.' : null),
    apply(s, c) {
      const h = c.sc.turns[s.t].h + 1;
      const done = s.clocks.filter(k => k.via === 'people' && k.filedH == null);
      for (const k of done) k.filedH = h;
      s.biz.rep += 2; c.notes.push(`Notified: ${done.map(k => k.who).join('; ')}.`);
    } },

  /* ---------- Comms ---------- */
  { id: 'holding', role: 'comms', order: 5, csf: 'RS.CO', once: true, done: s => s.d.statements.length > 0,
    label: 'Issue a careful holding statement',
    text: '"We are investigating a cybersecurity incident, have engaged outside experts and notified law enforcement. We will share more as we confirm it." Says only what is known.',
    apply(s, c) { s.d.statements.push({ t: s.t, kind: 'holding' }); s.biz.rep += s.d.publicT != null ? 4 : 2; c.notes.push('A holding statement went out.'); } },
  { id: 'reassure', role: 'comms', order: 6, csf: 'RS.CO', once: true, done: s => s.d.statements.length > 0,
    label: 'Issue a reassuring statement',
    text: '"We have no evidence that customer data was accessed." Calms customers today. If it turns out to be wrong, it is the line reporters will quote back.',
    apply(s, c) { s.d.statements.push({ t: s.t, kind: 'reassure' }); s.d.claimSafe = s.t; s.biz.rep += 7; c.notes.push('A reassuring statement went out.'); } },
  { id: 'staff', role: 'comms', order: 7, csf: 'PR.AT', once: true, done: s => s.d.staff,
    label: 'Brief all staff (and warn about impostor calls)',
    text: 'Tell employees what is happening, what not to say publicly, and to expect impostors posing as IT or executives. Makes social-engineering re-entry much harder.',
    apply(s, c) { s.d.staff = true; c.notes.push('All staff were briefed and warned about impostor calls.'); } },
  { id: 'customers', role: 'comms', order: 8, csf: 'RC.CO', once: true, done: s => s.d.customers != null,
    label: 'Brief key customers and partners directly',
    text: 'Call your largest customers, partners and regulators-of-record before they read about it.',
    apply(s, c) { s.d.customers = s.t; s.biz.rep += (s.d.publicT != null || s.biz.ops < 75) ? 4 : 1; c.notes.push('Key customers and partners were briefed directly.'); } },
];

export const actionById = id => ACTIONS.find(a => a.id === id);
