// L15 How armies learn (Hunzeker Figs. 1a-3c, p. 46). A learning-race timeline: one row per side per domain,
// phase blocks Exploration / Selection / Action / Mastery. "Your campaign" fills from the game (model.campaign,
// 8 seasons) or shows a demo run; "Hunzeker's three cases" shows 18-season reference rows by archetype.
// model.campaign = { seasons: 8, labels?: [..], you: {AT: [[phase, from, to, note?], …], CA, ED}, opp: {…} }
import { SEASONS, SEASONS_SHORT, PHASES, DOMAINS, ARCHETYPES, REFERENCE } from '../../data/hunzeker.js';
import { frame, s, h, txt, seg, sized, keepFocus } from './dg-common.js';

const PCOL = { E: 'var(--c7, var(--blue))', S: 'var(--c5, var(--warn))', SA: 'var(--c6, var(--warn))', A: 'var(--c2, var(--accent))', M: 'var(--good)' };
const DEMO = {
  seasons: 8, demo: true,
  you: { AT: [['E', 0, 2], ['S', 2, 4, 'Tested small groups with an experimental company.'], ['A', 4, 7], ['M', 7, 8]],
    CA: [['E', 0, 3], ['S', 3, 5], ['A', 5, 8, 'Liaison batteries trained; 40% of units so far.']],
    ED: [['E', 1, 3], ['SA', 3, 5], ['M', 5, 8]] },
  opp: { AT: [['E', 0, 5], ['S', 5, 6], ['A', 6, 8]],
    CA: [['E', 0, 2], ['S', 2, 4], ['A', 4, 6], ['M', 6, 8]],
    ED: [['E', 0, 8, 'Never left exploration: no one judged the experiments.']] },
};

export function mount(el, lesson, opts = {}) {
  const st = { view: 'camp', sel: null, model: opts.model };
  const f = frame(el, lesson, opts);
  seg(f.controls, 'Show', [{ v: 'camp', l: 'Your campaign' }, { v: 'ref', l: 'Hunzeker’s three cases' }], st.view, v => { st.view = v; st.sel = null; sz.redraw(); });

  function rows() {
    if (st.view === 'ref') {
      return { n: 18, labels: SEASONS, short: SEASONS_SHORT, groups: DOMAINS.map(d => ({ d, rows: ARCHETYPES.map(a => ({ name: a.name.replace(' model', ''), spans: REFERENCE[a.id][d.id].spans, note: REFERENCE[a.id][d.id].note, pages: REFERENCE[a.id][d.id].pages, fig: d.fig + a.fig })) })) };
    }
    const c = st.model?.campaign || DEMO, n = c.seasons || 8;
    const labels = c.labels || Array.from({ length: n }, (_, i) => `Season ${i + 1}`);
    return { n, labels, short: labels.map((_, i) => 'S' + (i + 1)), demo: !st.model?.campaign, groups: DOMAINS.map(d => ({ d, rows: [
      { name: 'You', spans: c.you?.[d.id] || [] }, { name: 'Opponent', spans: c.opp?.[d.id] || [] }] })) };
  }

  function draw(W) {
    const R = rows(), narrow = W < 560, lw = narrow ? 76 : 96, rh = 24, gh = 22, top = 30;
    const H = top + R.groups.length * (gh + R.groups[0].rows.length * (rh + 3)) + 8;
    const cw = (W - lw - 8) / R.n, X = i => lw + i * cw;
    const svg = f.svg(W, H, st.view === 'ref' ? 'Learning phases by season for the three reference armies in each domain.' : 'Learning phases by season for you and your opponent in each domain.');
    const every = cw < 22 ? 2 : 1;
    R.short.forEach((l, i) => { if (i % every === 0) txt(svg, X(i) + cw * every / 2, 12, cw * every < 34 ? l : R.labels[i], { anchor: 'middle', cls: 'dg-tick', size: cw * every < 50 ? 9.5 : 10.5 }); s('line', { x1: X(i), x2: X(i), y1: 20, y2: H - 6, class: 'dg-grid' }, svg); });
    let y = top, k = 0;
    R.groups.forEach(gp => {
      txt(svg, 4, y + gh / 2, gp.d.name, { weight: 700, cls: 'dg-small' });
      y += gh;
      gp.rows.forEach(r => {
        txt(svg, 4, y + rh / 2, r.name, { cls: 'dg-small dg-mute' });
        s('rect', { x: lw, y, width: W - lw - 8, height: rh, fill: 'var(--chip)', 'fill-opacity': 0.4 }, svg);
        r.spans.forEach(([p, a, b, note]) => {
          const key = 'b' + (k++), ph = PHASES[p], wpx = (b - a) * cw;
          const g = s('g', { tabindex: 0, role: 'button', 'aria-label': `${gp.d.name}, ${r.name}: ${ph.name} from ${R.labels[Math.floor(a)]} to ${R.labels[Math.min(R.n - 1, Math.ceil(b) - 1)]}`, class: 'dg-hit' + (st.sel?.key === key ? ' sel' : ''), 'data-key': key }, svg);
          s('rect', { x: X(a) + 0.5, y: y + 1, width: Math.max(2, wpx - 1), height: rh - 2, rx: 2, fill: PCOL[p], 'fill-opacity': 0.85 }, g);
          s('rect', { x: X(a) - 1, y: y - 1, width: wpx + 2, height: rh + 2, class: 'dg-focus' }, g);
          const lab = wpx > 70 ? ph.name : wpx > 22 ? ph.short : '';
          if (lab) txt(g, X(a) + wpx / 2, y + rh / 2 + 1, lab, { anchor: 'middle', size: 10.5, weight: 600, fill: 'var(--panel)', on: true });
          const act = () => { st.sel = { key, d: gp.d, r, p, a, b, note }; keepFocus(f.stage, () => sz.redraw()); };
          g.addEventListener('click', act);
          g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
        });
        y += rh + 3;
      });
    });
    info(R);
  }

  function info(R) {
    f.extra.textContent = '';
    const leg = h('ul', { class: 'dg-legend' }, f.extra);
    for (const [p, c] of Object.entries(PCOL)) { const li = h('li', {}, leg); h('i', {}, li).style.background = c; li.append(PHASES[p].name); }
    const sel = st.sel;
    if (sel) {
      const box = h('div', { class: 'dg-info' }, f.extra);
      h('h4', {}, box, `${sel.d.name} · ${sel.r.name} · ${PHASES[sel.p].name}`);
      h('p', {}, box, `${R.labels[Math.floor(sel.a)]} to ${R.labels[Math.min(R.n - 1, Math.ceil(sel.b) - 1)]}. ${PHASES[sel.p].what}` +
        (sel.note ? ' ' + sel.note : '') + (sel.r.note ? ' ' + sel.r.note : '') + (sel.r.pages ? ` (Fig. ${sel.r.fig}; text pp. ${sel.r.pages}.)` : ''));
    }
    f.readout.innerHTML = st.view === 'ref'
      ? 'Each archetype is modeled on one of the three armies in Hunzeker’s study. The Staff model explored later but filtered and trained fastest; the Republican model explored first and longest. Spans read from p. 46 (±½ season); where the text dates a step differently, the text governs. Tap a block for details.'
      : (R.demo ? '<b>Demo run.</b> Play a campaign to fill this with your own learning. ' : '') + 'Mastery needs a majority of your frontline units trained in the new way, not just a pamphlet (Hunzeker p. 37). Tap a block for what happened.';
  }

  const sz = sized(f.stage, draw);
  return { update(m) { st.model = m; sz.redraw(); }, destroy() { sz.destroy(); } };
}
