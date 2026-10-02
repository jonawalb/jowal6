// Two small planning charts. The barrage timetable strip (SPEC §8.3): rows × hours, the barrage's cells and each
// battalion's predicted arrival, with early (gap) and late (own fire) arrivals highlighted before you commit.
// The mini Fig. A.2 (SPEC §1.2): Biddle's containment boundary (BOOK constants) with your f_r and depth on it.
import { containBoundary, range } from '../biddle.js';
import { esc } from './store.js';

// Predicted pace in rows per hour by default posture (NOTIONAL: Rush 1, Leapfrog short bounds 0.75, Infiltrate 1).
export const PACE = { rush: 1, leapfrog: 0.75, bound: 0.75, infil: 1 };

/** Rows the barrage stands on at hour h (the plan's timetable; same rule as js/arty.js barrageRows). */
export function rowsAt(b, h) {
  const r = b.r0 + Math.floor(b.rate * h), rp = h > 0 ? b.r0 + Math.floor(b.rate * (h - 1)) : r - 1, stop = b.stop ?? 99;
  if (r > stop) return [];
  const out = [];
  for (let x = b.rate > 1 ? rp + 1 : r; x <= r; x++) if (x <= stop) out.push(x);
  return out;
}

/** Predicted case for a battalion arriving at row r at hour h: 'on' | 'early' | 'gap' | 'late' | null. */
export function caseAt(b, r, h, hours) {
  let first = null, last = null;
  for (let k = 0; k <= hours; k++) if (rowsAt(b, k).includes(r)) { if (first === null) first = k; last = k; }
  if (first === null) return null;
  if (h >= first && h <= last) return 'on';
  if (h < first) return 'late';
  return h === last + 1 ? 'early' : 'gap';
}

/**
 * The strip as an SVG string. b: { r0, rate, stop }; rows: [r0, r1]; hours; bns: [{ name, posture, start }].
 * Returns { svg, warn: { early, late } }.
 */
export function timetable(b, rows, hours, bns) {
  const [ra, rb] = rows, nr = rb - ra + 1, nh = Math.min(hours, 12), cw = 24, ch = 16, lx = 44, top = 16;
  const W = lx + nh * cw + 4, H = top + nr * ch + 6;
  const cells = [];
  let early = 0, late = 0;
  for (let h = 0; h < nh; h++) {
    cells.push(`<text x="${lx + h * cw + cw / 2}" y="11" class="dd-ttx" text-anchor="middle">H+${h}</text>`);
    for (const r of rowsAt(b, h)) if (r >= ra && r <= rb) cells.push(`<rect x="${lx + h * cw + 1}" y="${top + (r - ra) * ch + 1}" width="${cw - 2}" height="${ch - 2}" class="dd-ttb"/>`);
  }
  for (let r = ra; r <= rb; r++) cells.push(`<text x="${lx - 4}" y="${top + (r - ra) * ch + 12}" class="dd-ttx" text-anchor="end">row ${r + 1}</text>`);
  bns.forEach((bn, i) => {
    const pace = PACE[bn.posture] || 1;
    for (let r = Math.max(ra, bn.start + 1); r <= rb; r++) {
      const h = Math.ceil((r - bn.start) / pace);
      if (h >= nh) break;
      const c = caseAt(b, r, h, hours);
      if (c === 'late') late++; else if (c === 'gap' || c === 'early') early++;
      const x = lx + h * cw + 4 + (i % 4) * 4, y = top + (r - ra) * ch + 4 + Math.floor(i / 4) * 3;
      cells.push(`<circle cx="${x}" cy="${y + 3}" r="2.6" class="dd-tta ${c || ''}"><title>${esc(bn.name)}: row ${r + 1} at H+${h}${c === 'late' ? ' — into its own barrage' : c === 'gap' ? ' — barrage long gone' : c === 'early' ? ' — barrage just lifted' : ''}</title></circle>`);
    }
  });
  return { svg: `<svg class="dd-tt" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Barrage timetable: rows against hours, with each battalion's predicted arrival">${cells.join('')}</svg>`, warn: { early, late } };
}

let boundary = null;
/** Mini Fig. A.2: Biddle's containment boundary with your (f_r, depth) dot. */
export function miniA2(fr, depthKm) {
  if (!boundary) boundary = containBoundary({}, range(0, 0.95, 0.05), 30);
  const W = 220, H = 120, l = 30, b = 22, x = v => l + v * (W - l - 8), y = d => H - b - (Math.min(30, d) / 30) * (H - b - 8);
  const line = boundary.map((p, i) => `${i ? 'L' : 'M'}${x(p.fr).toFixed(1)} ${y(p.d).toFixed(1)}`).join('');
  const area = `${line}L${x(0.95)} ${y(0)}L${x(0)} ${y(0)}Z`;
  const contained = boundary.reduce((best, p) => (Math.abs(p.fr - fr) < Math.abs(best.fr - fr) ? p : best), boundary[0]).d <= depthKm;
  return `<svg class="dd-a2" viewBox="0 0 ${W} ${H}" role="img" aria-label="Biddle's Figure A.2: your reserve fraction ${fr.toFixed(2)} and depth ${depthKm.toFixed(1)} km fall in the ${contained ? 'contained' : 'breakthrough risk'} region">
    <path d="${area}" class="dd-a2brk"/><path d="${line}" class="dd-a2l"/>
    <text x="${x(0.5)}" y="${y(3)}" class="dd-a2t" text-anchor="middle">Breakthrough risk</text>
    <text x="${x(0.62)}" y="${y(22)}" class="dd-a2t" text-anchor="middle">Contained</text>
    <line x1="${l}" x2="${W - 8}" y1="${H - b}" y2="${H - b}" class="dd-a2ax"/><line x1="${l}" x2="${l}" y1="8" y2="${H - b}" class="dd-a2ax"/>
    <text x="${l}" y="${H - 8}" class="dd-a2x">0</text><text x="${W - 8}" y="${H - 8}" class="dd-a2x" text-anchor="end">f_r 0.95</text>
    <text x="${l - 4}" y="${y(30) + 4}" class="dd-a2x" text-anchor="end">30</text><text x="${l - 4}" y="${H - b}" class="dd-a2x" text-anchor="end">0</text>
    <text x="10" y="${H / 2}" class="dd-a2x" transform="rotate(-90 10 ${H / 2})" text-anchor="middle">depth km</text>
    <circle cx="${x(Math.min(0.95, fr))}" cy="${y(depthKm)}" r="5" class="dd-a2dot ${contained ? 'ok' : 'bad'}"/></svg>`;
}
