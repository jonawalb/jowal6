// Side panel and dossier renderers.
import { MEETINGS, ISSUES, PEOPLE, PERSON, PAIRS, ROLES, POSITIONS, ISSUE_MEETING, splitDesc, esc, fmtDate, fmtPct, issueLetter, aggregate } from './model.js';

const yesNo = v => (v === 'Y' ? 'Yes' : v === 'N' ? 'No' : '–');
const sideTxt = v => (v == null ? 'blank' : `side ${v}`);

/** Plain-language rows for one issue's index codes. */
export function codeRows(i) {
  return `<dl class="readout codes">
    <dt>Fact / policy</dt><dd>${i.fp === 'F' ? 'F · a fact or assessment' : 'P · what to do'}</dd>
    <dt>About communism</dt><dd>${yesNo(i.ac)}</dd>
    <dt>Side A/C</dt><dd>${i.acs == null ? (i.ac === 'Y' ? 'blank · no side fears looking soft' : 'blank · not applicable') : `side ${i.acs} fears looking soft on communism`}</dd>
    <dt>Hawk / dove</dt><dd>${i.hd === 'Y' ? `Yes · hawk is side ${i.hs}` : 'No'}</dd>
    <dt>POTUS SP</dt><dd>${i.sp === 1 ? '1 · President came down on a side' : '0 · President did not lean'}</dd>
    <dt>President side</dt><dd>${sideTxt(i.ps)}${i.ps != null && i.hd === 'Y' ? (i.ps === i.hs ? ' (hawk)' : ' (dove)') : ''}</dd>
  </dl>`;
}

function camps(mi, k) {
  const pos = POSITIONS[mi][k];
  const by = { 1: [], 0: [], 'N/A': [] };
  for (const [pid, p] of pos) by[p.v]?.push(`<button type="button" class="plink" data-pid="${pid}">${esc(PEOPLE[pid].n)}</button>${p.moved ? '<span class="muted" title="Coded on both sides"> (moved)</span>' : ''}`);
  const row = (v, c) => (by[v].length ? `<p class="camp"><span class="key" style="background:${c}"></span><b>${v === 'N/A' ? 'N/A' : 'Side ' + v}</b> ${by[v].join(', ')}</p>` : '');
  return row(1, 'var(--c1)') + row(0, 'var(--c2)') + row('N/A', 'var(--chip)');
}

export function meetingPanel(S, m) {
  const mi = MEETINGS.indexOf(m);
  const issue = S.i ? ISSUES[S.i] : null;
  let html = `<div class="sec"><div class="status" data-s="${m.code === 1 ? 'bad' : 'good'}"><b>${m.code === 1 ? 'Disagreement in the room' : 'No in-room disagreement'}</b><span>${esc(m.assess)}${m.type && m.type !== '—' ? ' · ' + esc(m.type) : ''}</span></div>
    <p class="fine"><b>Participants (master index):</b> ${esc(m.parts || '–')}</p></div>`;
  if (issue) {
    const s = splitDesc(issue.d);
    html += `<div class="sec"><p class="eyebrow">Issue ${issueLetter(S.i)}</p><p class="iq-p">${esc(s.q)}</p>${camps(mi, S.i)}${codeRows(issue)}
      ${issue.c ? `<p class="fine"><b>Coder comment:</b> ${esc(issue.c)}</p>` : ''}</div>`;
  }
  if (m.notes) html += `<div class="sec"><p class="eyebrow">Coder's notes on the meeting</p><p class="notes">${esc(m.notes)}</p></div>`;
  return html;
}

function personStats(pid) {
  const r = PERSON[pid];
  const sided = r.stances.filter(s => s.v === 0 || s.v === 1);
  return { r, sided, agreeRate: r.agree + r.differ ? r.agree / (r.agree + r.differ) : null, hawkRate: r.hawk + r.dove ? r.hawk / (r.hawk + r.dove) : null };
}
export { personStats };

/** Opponents and allies of one person, sorted. */
export function partners(pid, key = 'opp') {
  const out = [];
  for (const [k, e] of PAIRS) {
    const [a, b] = k.split('|').map(Number);
    if (a !== pid && b !== pid) continue;
    if (e[key]) out.push({ other: a === pid ? b : a, n: e[key], e });
  }
  return out.sort((x, y) => y.n - x.n);
}

export function dossier(pid) {
  if (pid == null) return '<p class="fine">Pick a speaker to see their record.</p>';
  const p = PEOPLE[pid];
  const { r, sided, agreeRate, hawkRate } = personStats(pid);
  const posList = [...new Set(r.meetings.map(mi => MEETINGS[mi].spk.find(s => s[0] === pid)[1]).filter(Boolean))];
  const years = r.meetings.map(mi => MEETINGS[mi].date.slice(0, 4));
  const opp = partners(pid, 'opp').slice(0, 6), same = partners(pid, 'same').slice(0, 6);
  const plist = xs => xs.length ? xs.map(x => `<button type="button" class="plink" data-pid="${x.other}">${esc(PEOPLE[x.other].n)}</button> <span class="num muted">${x.n}</span>`).join(', ') : '<span class="muted">none</span>';
  const stance = sided.length + r.stances.filter(s => s.v === 'N/A').length;
  return `<h2 class="dn">${esc(p.n)}</h2>
    <p class="fine">${esc(posList.join(' · ') || ROLES[p.role])}</p>
    <dl class="readout">
      <dt>Meetings spoken in</dt><dd>${r.meetings.length} (${years[0]}${years.length > 1 && years.at(-1) !== years[0] ? '–' + years.at(-1) : ''})</dd>
      <dt>Issues coded on</dt><dd>${stance} (${sided.length} with a side${r.stances.some(s => s.moved) ? `, moved on ${r.stances.filter(s => s.moved).length}` : ''})</dd>
      <dt>Hawk side</dt><dd>${hawkRate == null ? '–' : `${r.hawk} of ${r.hawk + r.dove} hawk–dove issues (${fmtPct(r.hawk, r.hawk + r.dove)})`}</dd>
      <dt>Fear-of-communism side</dt><dd>${r.ac + r.nonac ? `${r.ac} of ${r.ac + r.nonac} (${fmtPct(r.ac, r.ac + r.nonac)})` : '–'}</dd>
      <dt>President's lean matched</dt><dd>${agreeRate == null ? '–' : `${r.agree} of ${r.agree + r.differ} (${fmtPct(r.agree, r.agree + r.differ)})`}</dd>
    </dl>
    <p class="fine"><b>Most often on the other side:</b> ${plist(opp)}</p>
    <p class="fine"><b>Most often on the same side:</b> ${plist(same)}</p>
    <p class="eyebrow mt-s">Issues</p>
    <ol class="ilist">${r.stances.map(s => {
      const m = MEETINGS[s.mi], i = ISSUES[s.k], d = splitDesc(i.d);
      const side = s.v === 'N/A' ? 'N/A' : `side ${s.v}`;
      const tags = [i.hd === 'Y' && (s.v === 0 || s.v === 1) ? (s.v === i.hs ? 'hawk' : 'dove') : '', i.ps != null && pid !== m.pres && (s.v === 0 || s.v === 1) ? (s.v === i.ps ? 'President agreed' : 'President differed') : '', s.moved ? 'moved' : ''].filter(Boolean);
      return `<li><button type="button" class="ilink" data-m="${m.id}" data-k="${s.k}"><span class="num">${m.date}</span> <b>${issueLetter(s.k)}</b> ${esc(d.q)}</button>
        <span class="tag" data-v="${s.v}">${side}${s.v === 1 && d.s1 ? ': ' + esc(d.s1) : s.v === 0 && d.s0 ? ': ' + esc(d.s0) : ''}</span>${tags.map(t => `<span class="pill">${t}</span>`).join('')}</li>`;
    }).join('') || '<li class="fine">Spoke, but was not coded on any issue.</li>'}</ol>
    <p class="eyebrow mt-s">Meetings</p>
    <ol class="mini">${r.meetings.map(mi => { const m = MEETINGS[mi]; return `<li><button type="button" class="ilink" data-m="${m.id}"><span class="num">${m.date}</span> ${esc(m.subj)}</button></li>`; }).join('')}</ol>`;
}

export function summaryPanel(idx, label) {
  const a = aggregate(idx);
  return `<div class="sec"><p class="eyebrow">${esc(label)}</p>
    <dl class="readout">
      <dt>Meetings</dt><dd>${a.meetings}</dd>
      <dt>With in-room disagreement</dt><dd>${a.code1} (${fmtPct(a.code1, a.meetings)})</dd>
      <dt>Level-2 advice meetings</dt><dd>${a.level2}</dd>
      <dt>Issues</dt><dd>${a.issues}</dd>
      <dt>Fact (F) issues</dt><dd>${a.F} (${fmtPct(a.F, a.issues)})</dd>
      <dt>About communism</dt><dd>${a.ac} (${fmtPct(a.ac, a.issues)})</dd>
      <dt>A side fears looking soft</dt><dd>${a.acSide} (${fmtPct(a.acSide, a.issues)})</dd>
      <dt>Hawk vs dove</dt><dd>${a.hd} (${fmtPct(a.hd, a.issues)})</dd>
      <dt>President leaned</dt><dd>${a.sp} (${fmtPct(a.sp, a.issues)})</dd>
      <dt>…with the hawks</dt><dd>${a.presHawk} of ${a.presHawk + a.presDove} hawk–dove leans</dd>
      <dt>…with the A/C side</dt><dd>${a.presAC} of ${a.presAC + a.presNonAC}</dd>
    </dl></div>`;
}

export function issueCard(k) {
  const i = ISSUES[k], m = MEETINGS[ISSUE_MEETING[k]];
  return `<p class="fine"><span class="num">${m.date}</span> · meeting ${esc(m.id)} · issue ${issueLetter(k)}</p><p>${esc(splitDesc(i.d).q)}</p>`;
}
