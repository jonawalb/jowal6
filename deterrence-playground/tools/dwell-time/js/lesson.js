// "Learn to play": the hands-on lesson (shared/js/learn.js) and the rules on one screen.
// One action per step, each checked against the real game state.

/** The lesson game: The Help Desk Call at the hospital, typical posture, a seed whose opening move is detected. */
export const LESSON = { scen: 'helpdesk', sector: 'hospital', seed: 3 };

const q = s => document.querySelector(s);
const picked = (api, id) => !!api.get()?.picks.includes(id);

export function lessonSteps(api) {
  const seat = id => () => api.tab(id);
  const act = id => () => q(`[data-act="${id}"]`);
  return [
    { title: 'You are the response team', target: () => q('#bar'),
      body: 'It is Sunday night at a hospital system. You sit in all five seats: CEO, CISO, IT/SecOps, Legal and Comms. Each turn covers a few hours to a few days. This bar shows the clock, the business meters, and any reporting deadline that is running.' },
    { title: 'Read what you know', target: () => q('#feed'),
      body: 'An alert: a new MFA device on an IT admin\'s account, right after a help-desk reset, while that admin is on leave. You see alerts, never the attacker itself. Some alerts are false alarms.' },
    { title: 'The alert board', target: () => q('#board'),
      body: 'Every alert lands here as <b>untriaged</b>. Triage marks it confirmed or false. Containment actions hit every open alert of their kind, so acting before triage can lock out innocent staff.' },
    { title: 'Declare a major incident', target: act('declare'), start: seat('ciso'),
      do: 'In the CISO seat, click <b>Declare a major incident</b>.', done: () => picked(api, 'declare'),
      body: 'Declaring activates the plan and gives every seat more actions from next turn.' },
    { title: 'Work the alert', target: act('triage'), start: seat('it'),
      do: 'Switch to <b>IT / SecOps</b> and click <b>Triage the alert queue</b>, then <b>Threat-hunt across the estate</b>.', done: () => picked(api, 'triage') && picked(api, 'hunt'),
      body: 'Triage tells real from false. The hunt looks for access the alerts missed. Attackers rarely have just one way in.' },
    { title: 'Give the team authority', target: act('authorize'), start: seat('ceo'),
      do: 'In the <b>CEO</b> seat, click <b>Authorize disruptive containment</b>.', done: () => picked(api, 'authorize'),
      body: 'Taking systems offline or forcing company-wide resets stops the business, so it needs the CEO. Without this, IT cannot do it.' },
    { title: 'Call the insurer', target: act('insurer'), start: seat('legal'),
      do: 'In the <b>Legal</b> seat, click <b>Notify the cyber insurer</b>.', done: () => picked(api, 'insurer'),
      body: 'Policies require prompt notice. Late notice can cost you the coverage at the end.' },
    { title: 'End the turn', target: () => q('#end-turn'),
      do: 'Press <b>End turn</b>.', done: () => (api.get()?.s.t || 0) >= 1,
      body: 'Your actions resolve, then the attacker moves: maybe seen, maybe not.' },
    { title: 'What happened', target: () => q('#feed'),
      body: 'The turn report comes first, then news and new alerts. Read it before deciding: the attacker\'s next step often shows here, if your telemetry caught it.' },
    { title: 'The idea that wins: scope, then evict', target: () => q('#seats'), start: seat('ciso'),
      body: 'If you disable one account while the attacker still holds others, it notices and speeds up. Hunt until searches stop finding new access, move your planning <b>out of band</b> (it may be reading your email), then run a <b>coordinated eviction</b> that removes everything at once. Waiting too long has its own cost: every turn it is inside, it steals more.' },
    { title: 'The clocks', target: () => q('#clocks'),
      body: 'Reporting duties start when the rule says (awareness, a confirmed breach, a materiality decision, a ransom payment) and appear here with the time left. Legal files them. Late or missed notices cost money and trust.' },
    { title: 'How it ends', target: () => q('#end-turn'),
      body: 'After the last turn comes the after-action report: what the attacker really did and when, what you saw and missed (with MITRE ATT&CK IDs), every clock, findings mapped to NIST CSF 2.0, and a comparison with a textbook responder on the same exercise. Print it or download it.' },
  ];
}

export const SHEET = {
  title: 'Dwell Time: rules on one screen',
  goal: 'Run the response to a cyber intrusion across eight turns. Deny the attacker its objective, keep the organization running, meet every reporting deadline, and keep the evidence and your credibility.',
  controls: [
    ['Seats', 'CEO, CISO, IT/SecOps, Legal, Comms. Each has a few actions a turn (shown on its tab).'],
    ['Choose', 'Click actions to select them; click again to drop. Greyed actions say why they are blocked.'],
    ['End turn', 'Your actions resolve, then the attacker moves.'],
    ['Facilitated mode', 'All seats on one screen, a timer, notes for the report, and a facilitator-only peek at the attacker.'],
  ],
  ideas: [
    'Triage before you contain: false positives are real people.',
    'Scope before you evict: partial containment tips the attacker off.',
    'Move out of band once identity is compromised.',
    'Declare early; bring in responders, counsel and the insurer on suspicion.',
    'Image before you wipe. Evict before you restore.',
    'Say only what you know. "No evidence of data access" is the line that gets quoted back.',
  ],
  terms: [
    ['Foothold', 'Any access the attacker holds: an account, a host, admin rights, persistence, cloud tokens.'],
    ['Tip-off', 'The attacker notices the response. Some groups speed up, some dig in, insiders grab data.'],
    ['Out of band', 'Response communications on channels the attacker cannot see.'],
    ['Dwell time', 'How long an attacker is inside before it is found.'],
    ['ATT&CK', 'MITRE\'s catalog of attacker techniques; IDs like T1566.004.'],
    ['CSF 2.0', 'NIST\'s Cybersecurity Framework; the report maps findings to its categories.'],
  ],
};
