// What the player can see of rival forces: the reader the map uses, the one-line fog-of-war key (each level's full
// text behind an info button), the collapsed "rival forces you can see" list, and the fogged description of
// rivals' force orders in the month's reveal. Rules: js/fog.js.
import { COUNTRIES, IDS } from '../data/countries.js';
import { SEA, ISLAND, AREA_LABEL, SIDE } from '../data/theater.js';
import { FBY, TYPES } from '../data/formations.js';
import { seen, sight, SIGHT_LABEL } from './fog.js';
import { FOG_KEY } from './tips-text.js';
import { infoBtn } from './tips.js';

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n1 = x => +(+x).toFixed(1);
export const rangeText = r => (r.exact ? `${n1(r.v)}` : `${r.lo}–${r.hi}`);

/** A reader for the map: see(w, area) → null | { exact, v } | { exact: false, lo, hi }. Rival sight comes from
 * `s` (where everyone stood at the start of the month); your own (planned) forces from `mine` if given. */
export function seeFor(s, player, mine = s) {
  return (w, a) => {
    if (SIDE[w] === SIDE[player]) { const v = (mine.f[w][a] || 0); return v > 0 ? { exact: true, v } : null; }
    const r = seen(s, player, w, a);
    return r && (r.exact ? { exact: true, v: r.lo } : r);
  };
}

/** The list of rival contacts by area, then the key. */
export function paintFog(div, s, player) {
  const rivals = IDS.filter(w => SIDE[w] !== SIDE[player]);
  const areas = [...SEA, 'rear', ...(player === 'cn' ? ISLAND : [])];
  const rows = [];
  for (const a of areas) for (const w of rivals) {
    const r = seen(s, player, w, a);
    if (!r) continue;
    const types = r.lvl === 'exact' ? r.types.map(t => t.name).join(', ') : r.types.map(t => t.type.toLowerCase()).join(', ');
    rows.push(`<li><b>${AREA_LABEL[a]}</b>: <span style="color:var(--k-${w})">${COUNTRIES[w].short}</span> ${r.exact ? n1(r.lo) : `about ${r.lo}–${r.hi}`}
      <span class="muted">(${esc(types)})</span> <span class="k4-lvl ${r.lvl}">${SIGHT_LABEL[r.lvl]}${r.deceived ? ', may be deceived' : ''}</span></li>`);
  }
  const blind = s.blind?.[player] ? '<p class="fine bad">Your sources went quiet after last month’s public intelligence release: you see one step blurrier this month.</p>' : '';
  const sharp = s.sharp?.[player] && !s.blind?.[player] ? '<p class="fine">Your surveillance paid off last month: you see rival forces exactly this month.</p>' : '';
  const wasOpen = div.querySelector('.k4-fogd')?.open;
  const lvl = { Exact: 'exact', 'Close read': 'near', 'Rough read': 'far', Deception: 'dec' };
  const key = FOG_KEY.map(([k, v]) => infoBtn({ title: k, lines: [v], notes: [] }, `${k}: what it means`, `${k} <i aria-hidden="true">ⓘ</i>`, `k4-lvlb ${lvl[k]}`)).join(' ');
  div.innerHTML = `${sharp}${blind}<p class="k4-fogkey"><span class="k4-sub">Fog of war</span> ${key} ${infoBtn(FOG_HOW, 'How the fog of war works', 'How this works', 'k4-how')}</p>
    <p class="fine k4-maphint">Ranges on the map are rival forces as you see them. Tap or click a sea area to set your stance there.</p>
    <details class="k4-fogd"${wasOpen ? ' open' : ''}><summary>Rival forces you can see <span class="muted">(${rows.length} contact${rows.length === 1 ? '' : 's'})</span></summary>
    <ul class="k4-contacts">${rows.join('') || '<li>No rival forces in sight.</li>'}</ul></details>`;
}
const FOG_HOW = { title: 'Fog of war', lines: [
  'You see your own and your partners’ forces exactly; rival forces show as ranges, sharper near your own forces.',
  'Strengths are raw (before readiness). Who holds each area is public.',
  'The computer capitals see you by the same rules.',
], notes: [] };

/** A rival's force orders as you saw them: by name where you see exactly, by type on a close read, else unidentified.
 * `s` is the state after the month (where the formations ended up). Strike aiming shows only where you see exactly. */
export function seenOrders(s, player, w, orders) {
  const mine = SIDE[w] === SIDE[player];
  const out = [];
  for (const [id, to] of orders?.moves || []) {
    const f = FBY[id]; if (!f) continue;
    if (f.type === 'strike') { if (mine || sight(s, player, w, to === 'none' ? 'rear' : to) === 'exact') out.push(`${f.short} aimed at ${to === 'none' ? 'nothing' : 'the ' + AREA_LABEL[to]}`); continue; }
    const lvl = mine ? 'exact' : sight(s, player, w, to);
    const name = lvl === 'exact' ? f.short : lvl === 'near' ? `a${/^[AEIOU]/.test(TYPES[f.type].label) ? 'n' : ''} ${TYPES[f.type].label.toLowerCase()} formation` : 'an unidentified formation';
    out.push(`${name} → ${AREA_LABEL[to]}`);
  }
  return out;
}
