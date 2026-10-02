// L6 (P2) A four-phase fire plan (Hunzeker p. 76) and its control hand-off; registration vs predicted fire
// (pp. 59, 76-77, 109). Tap a phase for what it does and who controls it.
import { FIREPLAN, FIREPLAN_PAGE } from '../../data/hunzeker.js';
import { frame, s, h, txt, seg, sized, keepFocus } from './dg-common.js';

const COLS = ['var(--c7, var(--blue))', 'var(--c2, var(--accent))', 'var(--c4, var(--red))', 'var(--c3, var(--good))'];

export function mount(el, lesson, opts = {}) {
  const st = { sel: 1, reg: false };
  const f = frame(el, lesson, opts);
  seg(f.controls, 'Gun laying', [{ v: false, l: 'Predicted (no registration)' }, { v: true, l: 'Registration first' }], st.reg, v => { st.reg = v; sz.redraw(); });

  function draw(W) {
    const narrow = W < 560, H = narrow ? 230 : 190, x0 = 10, w = W - 20, top = st.reg ? 54 : 30;
    const widths = [0.18, 0.28, 0.2, 0.34], bh = 46;
    const svg = f.svg(W, H, 'Timeline of the four fire-plan phases, with the control hand-off from the senior artillery commander to the divisions.');
    if (st.reg) {
      s('rect', { x: x0, y: 8, width: w * 0.3, height: 22, fill: 'var(--warn)', 'fill-opacity': 0.35 }, svg);
      txt(svg, x0 + 6, 19, 'registration: days of ranging shots', { cls: 'dg-small', weight: 600 });
      txt(svg, x0 + w * 0.3 + 8, 19, '→ the defender sees where you will attack', { cls: 'dg-small dg-bad', weight: 600 });
    }
    let x = x0;
    FIREPLAN.forEach((p, i) => {
      const bw = w * widths[i];
      const g = s('g', { tabindex: 0, role: 'button', 'aria-label': `Phase ${p.id}: ${p.name}. ${p.control}.`, class: 'dg-hit' + (st.sel === i ? ' sel' : ''), 'data-key': 'p' + i }, svg);
      s('rect', { x: x + 1, y: top, width: bw - 2, height: bh, fill: COLS[i], 'fill-opacity': 0.85, rx: 3 }, g);
      s('rect', { x: x - 1, y: top - 2, width: bw + 2, height: bh + 4, class: 'dg-focus' }, g);
      txt(g, x + 8, top + 15, `${p.id}`, { weight: 700, size: 14, fill: 'var(--panel)', on: true });
      txt(g, x + 8, top + 33, narrow ? ['Recon', 'Hurricane', 'CB', 'Creep'][i] : p.name, { size: 11, weight: 600, fill: 'var(--panel)', on: true });
      const act = () => { st.sel = i; keepFocus(f.stage, () => sz.redraw()); };
      g.addEventListener('click', act); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
      x += bw;
    });
    const hand = x0 + w * 0.66, cy = top + bh + 22;
    s('rect', { x: x0, y: cy, width: hand - x0, height: 18, fill: 'var(--blue)', 'fill-opacity': 0.18 }, svg);
    s('rect', { x: hand, y: cy, width: x0 + w - hand, height: 18, fill: 'var(--good)', 'fill-opacity': 0.22 }, svg);
    txt(svg, x0 + 6, cy + 9, narrow ? 'senior gunner' : 'senior artillery commander', { cls: 'dg-small', weight: 600 });
    txt(svg, hand + 6, cy + 9, 'divisions', { cls: 'dg-small', weight: 600 });
    s('path', { d: `M${hand} ${cy - 6} v30`, stroke: 'var(--ink)', 'stroke-width': 2 }, svg);
    txt(svg, hand, cy + 36, 'control handed down', { anchor: 'middle', cls: 'dg-small dg-mute' });
    if (narrow) txt(svg, x0, H - 8, 'zero hour →', { cls: 'dg-tick' });
    const p = FIREPLAN[st.sel];
    f.extra.textContent = '';
    const box = h('div', { class: 'dg-info' }, f.extra);
    h('h4', {}, box, `Phase ${p.id}: ${p.name}`);
    h('p', {}, box, `${p.what} Controlled by: ${p.control}. (Hunzeker p. ${FIREPLAN_PAGE}.)`);
    f.readout.innerHTML = st.reg
      ? '<b class="bad">Registration warns the defender.</b> Ranging shots before the attack show where it will fall, and his reserves move first (Hunzeker pp. 52–53; Biddle pp. 32–33).'
      : '<b class="good">Predicted fire keeps the surprise.</b> Guns laid from survey, air photographs and sound ranging open without ranging shots; one short hurricane, then the creeping barrage (Hunzeker pp. 59, 76–77, 112). Each assault element can have its own battery in direct support.';
  }
  const sz = sized(f.stage, draw);
  return { update() {}, destroy() { sz.destroy(); } };
}
