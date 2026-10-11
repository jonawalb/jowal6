// Facilitator curveballs: the improvised pressure a live facilitator adds ("the general counsel is on a plane").
// The facilitator throws at most one a turn, each once a game. It shows in the feed before the room decides.
// `apply` runs at the start of the turn; `late` runs after the team's actions and returns a line for the turn
// report, so the outcome depends on what the room did about it. Both are deterministic: a rerun from the
// exercise link replays them exactly. `when` limits a curveball to games where it makes sense.
const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const away = (s, role, n) => { s.d.away = [...(s.d.away || []), { t: s.t, role, n }]; };

export const CURVEBALLS = [
  { id: 'ceo', label: 'The CEO is unreachable this turn', role: 'all',
    title: 'The CEO is unreachable',
    text: 'The CEO is on a long-haul flight with no connection until tomorrow. Nothing the CEO has not already delegated can happen this turn.',
    apply: s => away(s, 'ceo', 1) },
  { id: 'gc', label: 'General counsel is out this turn', role: 'legal',
    title: 'The general counsel is in a deposition',
    text: 'The general counsel is in a deposition and unreachable until evening. A junior lawyer can handle one thing this turn, at most.',
    when: s => s.d.declared != null,
    apply: s => away(s, 'legal', 1) },
  { id: 'board', label: 'A board member calls the CEO', role: 'ceo',
    title: 'A board member calls the CEO',
    text: 'A board member heard rumors from a friend at another company and calls the CEO directly: why has the board not been told? The call takes the CEO\'s time this turn unless the board has already been briefed.',
    apply: s => { if (s.d.board == null) away(s, 'ceo', 1); },
    late: s => (s.d.board == null ? 'The board member hung up unhappy and is calling other directors.' : null) },
  { id: 'reporter', label: 'A reporter has the story', role: 'comms',
    title: 'A reporter has the story',
    text: 'A trade reporter emails Comms: a source says {org} is dealing with a cyberattack. The story runs in two hours, with or without a comment.',
    when: s => s.d.publicT == null,
    apply: s => { s.d.publicT = s.t; },
    late: s => { if (s.d.statements.some(x => x.t === s.t)) return 'The story ran with your statement in it.'; s.biz.rep = clamp(s.biz.rep - 4); return 'The story ran with "did not respond to a request for comment."'; } },
  { id: 'post', label: 'An employee posts about it online', role: 'comms',
    title: 'An employee posted about it',
    text: 'An employee posted on a public forum: "IT locked everyone out, something big is going on at {org}." It is being shared, with guesses about ransomware.',
    when: s => s.d.publicT == null,
    apply: s => { s.d.publicT = s.t; },
    late: s => { const hit = s.d.staff ? 1 : 4; s.biz.rep = clamp(s.biz.rep - hit); return s.d.staff ? 'Briefed staff pushed back on the rumors in the thread.' : 'Staff had heard nothing official, and the thread filled with speculation.'; } },
  { id: 'deepfake', label: 'A deepfake "CEO" asks Finance for a wire', role: 'ceo',
    title: 'Finance gets a call from "the CEO"',
    text: 'Finance received a call in what sounds exactly like the CEO\'s voice, asking for an urgent $250,000 wire to "the incident-response firm" before the end of the day.',
    late: s => {
      if (s.d.staff) return 'Finance called the CEO back on a known number: it was a voice clone. No money moved.';
      s.biz.cost.fraud = (s.biz.cost.fraud || 0) + 250; return 'Finance wired $250,000. The call was a voice clone; the money is gone.';
    } },
  { id: 'bridge', label: 'The bridge invite went to an outside address', role: 'ciso',
    title: 'The bridge invite was forwarded',
    text: 'IT notices that this morning\'s invitation to the incident bridge was forwarded from a compromised mailbox to an outside address.',
    late: (s, ctx) => {
      if (s.d.oob) return 'The response had moved out of band; the forwarded link led to a meeting no one uses.';
      if (s.adv.comms) { ctx.fxTip = 0.6; return 'An unidentified participant sat silently on the incident bridge for twenty minutes.'; }
      return 'Nobody unexpected joined the bridge.';
    } },
  { id: 'customer', label: 'Your largest customer wants answers', role: 'comms',
    title: 'Your largest customer wants answers',
    text: 'Your largest customer heard rumors and wants written confirmation of what happened and whether its data is affected within 24 hours, or it will suspend the contract.',
    late: s => { if (s.d.customers != null) return 'The customer, briefed directly, agreed to wait for the investigation.'; s.biz.rep = clamp(s.biz.rep - 4); return 'The customer suspended new work and copied its lawyers.'; } },
  { id: 'regulator', label: 'A regulator calls first', role: 'legal',
    title: 'A regulator calls first',
    text: 'A regulator saw social-media chatter and calls asking whether {org} has an incident to report.',
    when: (s, sc, sec) => sec.clocks.some(c => c.via === 'file') || !!s.profile?.clock,
    late: s => {
      const open = s.clocks.filter(k => k.via === 'file' && k.filedH == null);
      if (!open.length) return 'Legal had already filed, or nothing was due yet. The call was short.';
      s.biz.rep = clamp(s.biz.rep - 3); return 'A notice was due and not yet filed. The regulator noted it.';
    } },
  { id: 'backups', label: 'The backups were hit too', role: 'it',
    title: 'The backup console',
    text: 'The backup administrator reports the backup console shows deleted jobs and expired retention on the main backup sets.',
    when: (s, sc) => sc.stages.some(st => st.eff?.backups) && !s.adv.backupsHit,
    apply: s => { if (!s.posture.immut) s.adv.backupsHit = true; },
    late: s => (s.posture.immut ? 'The immutable copies were untouched; restores can still use them.' : 'The main backup sets are gone. Restores will be slow.') },
];
export const curveballById = id => CURVEBALLS.find(c => c.id === id);
