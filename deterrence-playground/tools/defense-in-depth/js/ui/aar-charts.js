// Review charts (SPEC §7.4 items 4–5) as SVG strings with halo text (paint-order: stroke) so labels stay
// readable on any background: enemy strength you saw against the true strength, per group of columns, and the
// race between the attacker's deepest penetration and the objective line, with the counterstrokes and t*.
import { SCALES } from '../../data/scales.js';
import { picture } from '../engine.js';
import { gridFor } from '../grid.js';
import { isCompany } from '../forces.js';
import { hhmm, esc } from './store.js';

/** Per column group, per hour: { seen: [], truth: [] } enemy strength. */
export function seenVsTrue(g, me) {
  const G = gridFor(g.scale), k = SCALES[g.scale].colGroups, per = Math.ceil(G.cols / k), T = g.snaps.length - 1;
  const groups = Array.from({ length: k }, (_, i) => ({ cols: [i * per, Math.min(G.cols, (i + 1) * per) - 1], seen: [], truth: [] }));
  for (let h = 0; h <= T; h++) {
    const s = g.snaps[h];
    if (!s) continue;
    const pic = picture(g, me, 'fog', h);
    for (const grp of groups) { grp.seen[h] = 0; grp.truth[h] = 0; }
    for (let sec = 0; sec < G.n; sec++) if (pic.sec[sec]) groups[Math.min(k - 1, Math.floor(G.col[sec] / per))].seen[h] += pic.sec[sec];
    g.units.forEach((u, i) => {
      if (u.side === me || !isCompany(u) || s.sec[i] < 0 || s.flags[i] & 1) return;
      groups[Math.min(k - 1, Math.floor(G.col[s.sec[i]] / per))].truth[h] += Math.max(0, s.str[i]);
    });
  }
  return groups;
}

/** Small multiples: one panel per column group; solid = true, dashed = what you had seen. */
export function chartSeen(g, me, width, hour = null) {
  const groups = seenVsTrue(g, me), T = g.snaps.length - 1, narrow = width < 560;
  const per = narrow ? 2 : Math.min(groups.length, groups.length > 4 ? 3 : 4), ph = 90, top = 40, gap = 46;
  const rows = Math.ceil(groups.length / per), H = top + rows * (ph + gap), cw = (width - 40) / per;
  const ymax = Math.max(10, ...groups.flatMap(x => [...x.seen, ...x.truth].filter(Number.isFinite)));
  const out = [`<g class="dd-lgd"><line x1="8" x2="32" y1="12" y2="12" class="dd-cl true"/><text x="38" y="16" class="dd-ct">True enemy strength</text>
    <line x1="${narrow ? 8 : 190}" x2="${narrow ? 32 : 214}" y1="${narrow ? 28 : 12}" y2="${narrow ? 28 : 12}" class="dd-cl seen"/><text x="${narrow ? 38 : 220}" y="${narrow ? 32 : 16}" class="dd-ct">What you had seen</text></g>`];
  groups.forEach((grp, i) => {
    const x0 = 34 + (i % per) * cw, y1 = top + Math.floor(i / per) * (ph + gap) + 14, y0 = y1 + ph, pw = cw - 16;
    const sx = h => x0 + (h / Math.max(1, T)) * pw, sy = v => y0 - (v / ymax) * ph;
    const line = arr => arr.map((v, h) => `${h ? 'L' : 'M'}${sx(h).toFixed(1)} ${sy(v || 0).toFixed(1)}`).join('');
    out.push(`<text x="${x0}" y="${y1 - 6}" class="dd-ct b">Columns ${grp.cols[0] + 1}–${grp.cols[1] + 1}</text>`);
    for (const v of [0, Math.round(ymax / 2), Math.round(ymax)]) out.push(`<line x1="${x0}" x2="${x0 + pw}" y1="${sy(v)}" y2="${sy(v)}" class="dd-cgrid"/>${i % per === 0 ? `<text x="${x0 - 4}" y="${sy(v) + 4}" class="dd-cax" text-anchor="end">${v}</text>` : ''}`);
    out.push(`<text x="${x0}" y="${y0 + 14}" class="dd-cax">${hhmm(0)}</text><text x="${x0 + pw}" y="${y0 + 14}" class="dd-cax" text-anchor="end">${hhmm(T)}</text>`);
    out.push(`<path d="${line(grp.truth)}" class="dd-cl true"/><path d="${line(grp.seen)}" class="dd-cl seen"/>`);
    if (hour != null) out.push(`<line x1="${sx(hour)}" x2="${sx(hour)}" y1="${y1}" y2="${y0}" class="dd-cnow"/>`);
  });
  return `<svg class="dd-chart" viewBox="0 0 ${width} ${H}" role="img" aria-label="Enemy strength you had seen against the true strength, hour by hour, for each group of columns">${out.join('')}</svg>`;
}

/** The race: attacker's deepest row by hour against the objective line; counterstrokes and t* marked. */
export function chartRace(g, me, width) {
  const Sc = SCALES[g.scale], T = g.snaps.length - 1, hist = g.deepHist || [];
  const r0 = Sc.bands.nml[0], r1 = Math.max(Sc.obj.row + 2, ...hist.filter(Number.isFinite));
  const l = 44, top = 18, H = 190, ph = H - top - 30, pw = width - l - 14;
  const sx = h => l + (h / Math.max(1, T)) * pw, sy = r => top + ph - ((r - r0) / Math.max(1, r1 - r0)) * ph;
  const out = [];
  for (let r = r0; r <= r1; r += Math.max(1, Math.round((r1 - r0) / 5))) out.push(`<line x1="${l}" x2="${l + pw}" y1="${sy(r)}" y2="${sy(r)}" class="dd-cgrid"/><text x="${l - 4}" y="${sy(r) + 4}" class="dd-cax" text-anchor="end">row ${r + 1}</text>`);
  out.push(`<line x1="${l}" x2="${l + pw}" y1="${sy(Sc.obj.row)}" y2="${sy(Sc.obj.row)}" class="dd-cobj"/><text x="${l + pw}" y="${sy(Sc.obj.row) - 5}" class="dd-ct" text-anchor="end">${esc(Sc.obj.name)} (objective)</text>`);
  const pts = hist.map((r, h) => `${h ? 'L' : 'M'}${sx(h + 1).toFixed(1)} ${sy(Math.max(r0, r)).toFixed(1)}`).join('');
  if (pts) out.push(`<path d="M${sx(0)} ${sy(r0)}${pts.replace(/^M/, 'L')}" class="dd-cl deep"/>`);
  for (const e of g.events) if (e.kind === 'counter' && e.how === 'counterstroke') out.push(`<circle cx="${sx(e.t)}" cy="${sy(gridFor(g.scale).row[e.sec])}" r="5" class="dd-ccs ${e.won ? 'won' : ''}"><title>Counterstroke at ${hhmm(e.t)}${e.won ? ', retook the sector' : ', stalled'}</title></circle>`);
  const ts = g.telemetry && g.telemetry.summary && g.telemetry.summary.race ? g.telemetry.summary.race.tStar : null;
  if (ts != null) out.push(`<line x1="${sx(ts)}" x2="${sx(ts)}" y1="${top}" y2="${top + ph}" class="dd-cnow"/><text x="${sx(ts) + 4}" y="${top + 10}" class="dd-ct">t* ${hhmm(ts)}</text>`);
  out.push(`<text x="${l}" y="${H - 6}" class="dd-cax">${hhmm(0)}</text><text x="${l + pw}" y="${H - 6}" class="dd-cax" text-anchor="end">${hhmm(T)}</text>`);
  out.push(`<text x="${l + 6}" y="${top + ph - 6}" class="dd-ct">Attacker’s deepest row</text>`);
  return `<svg class="dd-chart" viewBox="0 0 ${width} ${H}" role="img" aria-label="The race: the attacker's deepest row hour by hour against the objective line, with counterstrokes marked">${out.join('')}</svg>`;
}
