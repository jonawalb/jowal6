// Security posture: the controls an organization already has when the incident starts.
// Each control changes the odds of specific attacker steps (see each scenario's `ctl`) or what the defenders can do.
export const CONTROLS = [
  { id: 'fido', label: 'Phishing-resistant MFA for admins', short: 'FIDO2 MFA',
    text: 'Administrators sign in with hardware security keys or passkeys, not push prompts or SMS codes.', csf: 'PR.AA' },
  { id: 'mfaall', label: 'MFA and network allow-lists on every cloud login', short: 'MFA everywhere',
    text: 'Every login to SaaS and cloud data platforms, including contractors and service accounts, needs MFA or key-based sign-in, and is allowed only from known networks.', csf: 'PR.AA' },
  { id: 'helpdesk', label: 'Help-desk identity checks', short: 'Help-desk checks',
    text: 'Password and MFA resets for privileged accounts need a video check or a manager call-back to a number on file.', csf: 'PR.AA' },
  { id: 'edr', label: 'EDR on nearly every endpoint and server', short: 'EDR coverage',
    text: 'Endpoint detection and response covers about 98% of machines, including servers and hypervisor management hosts.', csf: 'DE.CM' },
  { id: 'logs', label: 'Central logging, 12 months kept', short: 'Logging',
    text: 'Identity, endpoint, network and cloud logs flow to one place and are kept for a year.', csf: 'DE.CM' },
  { id: 'pam', label: 'Tiered privileged access', short: 'Privileged access',
    text: 'Domain and cloud admin rights are vaulted, time-limited and used only from dedicated admin workstations.', csf: 'PR.AA' },
  { id: 'seg', label: 'Segmented networks (IT/OT and internal zones)', short: 'Segmentation',
    text: 'Operational technology sits behind a monitored boundary, and internal zones limit lateral movement.', csf: 'PR.IR' },
  { id: 'immut', label: 'Immutable, tested backups', short: 'Immutable backups',
    text: 'Backups are offline or immutable, kept apart from the main domain, and restores are rehearsed.', csf: 'PR.DS' },
  { id: 'retainer', label: 'Incident-response retainer', short: 'IR retainer',
    text: 'A contract with an IR firm that commits responders within hours.', csf: 'RS.MA' },
  { id: 'insured', label: 'Cyber insurance', short: 'Insurance',
    text: 'A cyber policy with a panel of approved responders and lawyers. It covers much of the cost if you notify the insurer promptly and get consent before paying any ransom.', csf: 'GV.RM' },
  { id: 'plan', label: 'Tested incident-response plan', short: 'Tested plan',
    text: 'Roles, decision rights and call trees are written down and were rehearsed in an exercise within the last year.', csf: 'GV.RR' },
  { id: 'oob', label: 'Out-of-band channel ready', short: 'Out-of-band',
    text: 'A separate, pre-arranged messaging and conference channel that does not depend on corporate email, chat or identity.', csf: 'RS.CO' },
  { id: 'vendor', label: 'Software inventory and vendor-risk program', short: 'Vendor risk',
    text: 'You know which third-party agents run where, with what privileges, and vendors must tell you quickly about a compromise.', csf: 'GV.SC' },
  { id: 'hire', label: 'Remote-hire identity verification', short: 'Hiring checks',
    text: 'Remote hires pass a live identity check, and laptops ship only to a verified home address.', csf: 'GV.SC' },
];

export const PRESETS = [
  { id: 'low', label: 'Under-resourced', text: 'Insurance and partial EDR. No retainer, no tested plan.',
    on: ['insured'] },
  { id: 'typical', label: 'Typical', text: 'EDR, logging, insurance and a plan exercised once. The usual gaps in identity and backups.',
    on: ['edr', 'logs', 'insured', 'plan'] },
  { id: 'mature', label: 'Mature', text: 'Every control on the list. Still breachable, and still the response that decides how bad it gets.',
    on: CONTROLS.map(c => c.id) },
];

export const presetPosture = id => {
  const p = PRESETS.find(x => x.id === id) || PRESETS[1];
  return Object.fromEntries(CONTROLS.map(c => [c.id, p.on.includes(c.id)]));
};
