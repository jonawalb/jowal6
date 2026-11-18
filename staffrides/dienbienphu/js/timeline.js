// Timeline: compressed build-up (20 Nov – 12 Mar) + expanded siege (13 Mar – 8 May),
// with lanes for airdrops, fighting, stands, diplomacy and weather.
import { parse, iso, fmtDate, esc, addDays } from './util.js';

const START = '1953-11-20', SIEGE = '1954-03-13', END = '1954-05-08';
const SPLIT = 0.2; // share of width for the build-up

export function toFrac(d) {
  const t = parse(d).getTime(), a = parse(START).getTime(), s = parse(SIEGE).getTime(), b = parse(END).getTime();
  if (t <= s) return (SPLIT * Math.max(0, t - a)) / (s - a);
  return SPLIT + ((1 - SPLIT) * Math.min(t - s, b - s)) / (b - s);
}
export function fromFrac(f) {
  const a = parse(START).getTime(), s = parse(SIEGE).getTime(), b = parse(END).getTime();
  f = Math.min(1, Math.max(0, f));
  const t = f <= SPLIT ? a + (f / SPLIT) * (s - a) : s + ((f - SPLIT) / (1 - SPLIT)) * (b - s);
  return iso(Math.round(t / 864e5) * 864e5);
}

const LANES = [
  { key: 'phase', y: 2, h: 14, label: '' },
  { key: 'air', y: 20, h: 22, label: 'Airdrops' },
  { key: 'fight', y: 46, h: 12, label: 'Fighting' },
  { key: 'stand', y: 62, h: 14, label: 'Stands' },
  { key: 'dip', y: 80, h: 10, label: 'Diplomacy' },
  { key: 'wx', y: 94, h: 10, label: 'Weather' },
];

export class Timeline {
  constructor(el, data, { onDate, onStand }) {
    this.el = el; this.D = data; this.onDate = onDate; this.onStand = onStand;
    this.windows = [];
    this.render();
    new ResizeObserver(() => this.render()).observe(el);
  }

  setWindows(w) { this.windows = w || []; this.render(); }

  render() {
    const r = this.el.getBoundingClientRect();
    const W = Math.max(200, r.width - (parseFloat(getComputedStyle(this.el).paddingLeft) + parseFloat(getComputedStyle(this.el).paddingRight)));
    const H = Math.max(96, r.height - 8);
    const sc = H / 118;
    const x = (d) => toFrac(d) * W;
    const L = Object.fromEntries(LANES.map((l) => [l.key, { ...l, y: l.y * sc, h: l.h * sc }]));
    let g = '';
    // counterfactual windows
    for (const w of this.windows) g += `<rect x="${x(w[0])}" y="0" width="${Math.max(3, x(w[1]) - x(w[0]))}" height="${L.wx.y + L.wx.h}" fill="var(--accent-soft)"/>`;
    // phases
    for (const p of this.D.meta.phases) {
      const x0 = x(p.start), x1 = x(addDays(p.end, 1));
      g += `<rect x="${x0 + 0.5}" y="${L.phase.y}" width="${Math.max(1, x1 - x0 - 1)}" height="${L.phase.h}" rx="3" fill="var(--surface-2)"/>`;
      if (x1 - x0 > 60) g += `<text x="${x0 + 5}" y="${L.phase.y + L.phase.h - 4}" font-size="${10 * Math.min(1, sc + 0.1)}" fill="var(--ink-2)">${esc(p.name)}</text>`;
    }
    // airdrops
    const rows = this.D.series?.airdrop?.rows || [];
    const amax = Math.max(1, ...rows.map((r) => r.total));
    const dayW = (x(SIEGE) - x(addDays(SIEGE, -1))) || 4;
    const bw = Math.max(1.5, (x(addDays(SIEGE, 1)) - x(SIEGE)) - 1);
    for (const rr of rows) {
      const hh = (rr.total / amax) * L.air.h;
      g += `<rect x="${x(rr.d)}" y="${L.air.y + L.air.h - hh}" width="${bw}" height="${hh}" fill="var(--fr)" opacity=".55"/>`;
    }
    // fighting ticks
    for (const e of this.D.events) {
      if (!['attack', 'fall', 'bombard', 'counterattack'].includes(e.action)) continue;
      const c = e.side === 'FR' ? 'var(--fr)' : 'var(--vm)';
      const yy = e.side === 'FR' ? L.fight.y : L.fight.y + L.fight.h / 2;
      g += `<rect x="${x(e.d)}" y="${yy}" width="2" height="${L.fight.h / 2}" fill="${c}"><title>${esc(fmtDate(e.d))}: ${esc(e.text)}</title></rect>`;
    }
    // stands
    this.D.stands.forEach((s, i) => {
      const cx = x(s.date) + 1;
      const c = s.side === 'FR' ? 'var(--fr)' : 'var(--vm)';
      g += `<g class="tl-stand" data-i="${i}" style="cursor:pointer"><circle cx="${cx}" cy="${L.stand.y + L.stand.h / 2}" r="${Math.min(8, L.stand.h / 2 + 1)}" fill="var(--surface)" stroke="${c}" stroke-width="2"/>
        <text x="${cx}" y="${L.stand.y + L.stand.h / 2 + 3.5}" font-size="9.5" text-anchor="middle" fill="var(--ink)" font-family="var(--mono)">${i + 1}</text><title>Stand ${i + 1}: ${esc(s.title)}</title></g>`;
    });
    // diplomacy
    for (const e of this.D.diplomacy) {
      if (e.d < START || e.d > END) continue;
      const cx = x(e.d) + 1, cy = L.dip.y + L.dip.h / 2, rr = L.dip.h / 2;
      g += `<path d="M${cx},${cy - rr}L${cx + rr},${cy}L${cx},${cy + rr}L${cx - rr},${cy}Z" fill="var(--dip)" opacity=".85"><title>${esc(fmtDate(e.d))}: ${esc(e.text)}</title></path>`;
    }
    // weather
    for (const e of this.D.weather) {
      if (!e.d || e.d < START || e.d > END) continue;
      g += `<rect x="${x(e.d)}" y="${L.wx.y}" width="2.5" height="${L.wx.h}" fill="var(--wx)"><title>${esc(fmtDate(e.d))}: ${esc(e.text)}</title></rect>`;
    }
    // month axis
    for (const m of ['1953-12-01', '1954-01-01', '1954-02-01', '1954-03-01', '1954-04-01', '1954-05-01']) {
      g += `<line x1="${x(m)}" x2="${x(m)}" y1="${L.air.y}" y2="${H - 12}" stroke="var(--rule)" stroke-dasharray="2 3"/>`;
      g += `<text x="${x(m) + 3}" y="${H - 2}" font-size="10" fill="var(--muted)">${fmtDate(m).split(' ').slice(1).join(' ')}</text>`;
    }
    g += `<line x1="${x(SIEGE)}" x2="${x(SIEGE)}" y1="0" y2="${H}" stroke="var(--muted)" stroke-width="1"/>`;
    g += `<g id="cursor"><line y1="0" y2="${H - 12}" stroke="var(--accent)" stroke-width="2"/><circle r="6" cy="${H - 12}" fill="var(--accent)"/></g>`;
    this.el.innerHTML = `${LANES.filter((l) => l.label).map((l) => `<span class="lane-lbl" style="top:${6 + l.y * sc + (l.h * sc) / 2 - 7}px">${l.label}</span>`).join('')}
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px" role="slider" tabindex="0" aria-label="Date" aria-valuetext=""></svg>`;
    this.svg = this.el.querySelector('svg');
    this.svg.innerHTML = g;
    this.W = W; this.x = x;
    this.bind();
    if (this.date) this.setDate(this.date);
  }

  bind() {
    const svg = this.svg;
    const pick = (e) => {
      const r = svg.getBoundingClientRect();
      return fromFrac((e.clientX - r.left) / r.width);
    };
    let drag = false;
    svg.addEventListener('pointerdown', (e) => {
      const st = e.target.closest('.tl-stand');
      if (st) { this.onStand(Number(st.dataset.i)); return; }
      drag = true; svg.setPointerCapture(e.pointerId); this.onDate(pick(e));
    });
    svg.addEventListener('pointermove', (e) => { if (drag) this.onDate(pick(e)); });
    svg.addEventListener('pointerup', () => { drag = false; });
    svg.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 7 : 1;
      if (e.key === 'ArrowRight') { this.onDate(clamp(addDays(this.date, step))); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { this.onDate(clamp(addDays(this.date, -step))); e.preventDefault(); }
    });
  }

  setDate(d) {
    this.date = d;
    const c = this.svg?.querySelector('#cursor');
    if (c) c.setAttribute('transform', `translate(${this.x(d)},0)`);
    this.svg?.setAttribute('aria-valuetext', fmtDate(d));
  }
}

export const clamp = (d) => (d < START ? START : d > END ? END : d);
export const RANGE = { START, SIEGE, END };
