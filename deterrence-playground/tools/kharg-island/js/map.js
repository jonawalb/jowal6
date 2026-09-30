// Map of Kharg Island and its approaches: the mainland, notional force zones, an island inset with the
// notional approach sides and the ground fight, and game state for the current turn.
import { createProjection, drawBasemap, el, circlePath } from '../../../shared/js/mapkit.js';
import { LAND_KHARG } from '../data/land.js';
import { BOX, INSET_BOX, PLACES, AIRSTRIP, KHARG_CENTER, KHARKU_CENTER, MEASURED, SECTOR_GEO, ZONES } from '../data/geo.js';
import { SECTORS } from '../data/params.js';

const INSET_AT = { x: 14, y: 14 };

export function createMap(svg, tip, { onSector }) {
  const proj = createProjection(BOX);
  const P = ll => proj.project(ll);
  const { root } = drawBasemap(svg, proj, LAND_KHARG, { gratStep: 0.25 });
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const full = svg.getAttribute('viewBox');
  // Phones: crop to the island, the inset and the approaches from the mainland.
  const [cx1, cy1] = P([50.64, 28.97]);
  const crop = `0 0 ${cx1} ${cy1}`;
  const small = matchMedia('(max-width: 600px)');
  const fit = () => svg.setAttribute('viewBox', small.matches ? crop : full);
  fit(); small.addEventListener('change', fit);

  const defs = el('defs', {}, svg);
  const mk = el('marker', { id: 'kh-head', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
  el('path', { d: 'M0 0L10 5L0 10z', class: 'kh-headfill' }, mk);

  // Static labels
  const lab = el('g', {}, root);
  const txt = (ll, t, cls, dx = 0, dy = 0) => { const [x, y] = P(ll); return el('text', { x: x + dx, y: y + dy, class: cls }, lab, t); };
  txt([50.84, 29.5], 'IRAN', 'kh-big');
  txt([50.84, 29.46], 'Bushehr province', 'kh-note mid');
  txt([50.2, 29.14], 'Persian Gulf', 'kh-water');
  for (const p of PLACES) {
    const [x, y] = P(p.ll);
    el('circle', { cx: x, cy: y, r: 4, class: 'kh-town' }, lab);
    el('text', { x: x + (p.side === 'end' ? -8 : 8), y: y + 4, class: `kh-plabel ${p.side}` }, lab, p.t);
  }
  txt(KHARG_CENTER, 'Kharg', 'kh-ilabel end', -34, 6);
  txt(KHARKU_CENTER, 'Kharku', 'kh-note', 10, -6);
  // Distance to the nearest mainland shore
  const [a, b] = MEASURED.nearestShore.map(P);
  el('path', { d: `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`, class: 'kh-dist' }, lab);
  el('text', { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 + 20, class: 'kh-note mid' }, lab, 'about 30 km');
  // Hormuz arrow and scale bar
  const [hx, hy] = P([50.5, 28.93]);
  el('path', { d: `M${hx} ${hy}L${hx + 90} ${hy + 30}`, class: 'kh-arrow', 'marker-end': 'url(#kh-head)' }, lab);
  el('text', { x: hx - 6, y: hy + 4, class: 'kh-note end' }, lab, 'To Hormuz');
  const [s0x, s0y] = P([50.03, 28.88]), [s1x] = P([50.03 + 20 / (111.32 * Math.cos(29.3 * Math.PI / 180)), 28.88]);
  const sc = el('g', { class: 'kh-scale' }, root);
  el('line', { x1: s0x, y1: s0y, x2: s1x, y2: s0y }, sc);
  el('text', { x: s0x, y: s0y - 6 }, sc, '20 km');

  const layer = el('g', {}, root);
  const top = el('g', {}, root);

  // Tooltips
  const tipOn = (node, html) => {
    node.addEventListener('pointerenter', e => { tip.innerHTML = html(); tip.hidden = false; move(e); });
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerleave', () => { tip.hidden = true; });
  };
  function move(e) {
    const box = svg.parentElement.getBoundingClientRect();
    tip.style.left = Math.max(4, Math.min(e.clientX - box.left + 14, box.width - tip.offsetWidth - 6)) + 'px';
    tip.style.top = Math.max(4, Math.min(e.clientY - box.top + 14, box.height - tip.offsetHeight - 6)) + 'px';
  }

  function draw(cfg, st, info) {
    layer.replaceChildren(); top.replaceChildren();
    const land = cfg.us.obj !== 'blockade';
    // Blockade ring or approach
    if (!land) {
      el('path', { d: circlePath(proj, KHARG_CENTER, ZONES.blockadeKm), class: 'kh-ring' }, layer);
      const [rx, ry] = P([KHARG_CENTER[0], KHARG_CENTER[1] - ZONES.blockadeKm / 111]);
      el('text', { x: rx, y: ry + 18, class: 'kh-note mid' }, layer, `Blockade line, ${ZONES.blockadeKm} km out (notional)`);
    }
    // Mines around the island
    if (cfg.ir.mines) {
      const eff = st ? st.mineEff : 1, [mx, my] = P(KHARG_CENTER);
      const n = cfg.ir.mines === 2 ? 16 : 8;
      for (let i = 0; i < n; i++) {
        const ang = i / n * Math.PI * 2;
        el('circle', { cx: mx + 58 * Math.cos(ang), cy: my + 62 * Math.sin(ang), r: 3, class: 'kh-mine', opacity: 0.2 + 0.8 * eff }, layer);
      }
    }
    // Reinforcement route from the mainland
    const [r0, r1] = ZONES.reinforce.map(P);
    const reinf = st && st.lastReinf;
    el('path', { d: `M${r0[0]} ${r0[1]}L${r1[0]} ${r1[1]}`, class: `kh-reinf${reinf === true ? ' on' : reinf === false ? ' off' : ''}`, 'marker-end': 'url(#kh-head)' }, layer);
    // Two short lines so the label still fits when phones crop the map at about 50.64°E.
    const rl = el('text', { x: (r0[0] + r1[0]) / 2, y: (r0[1] + r1[1]) / 2 - 24, class: 'kh-note mid' }, layer);
    el('tspan', { x: (r0[0] + r1[0]) / 2, dy: 0 }, rl, 'Iranian resupply');
    el('tspan', { x: (r0[0] + r1[0]) / 2, dy: 16 }, rl, 'route (notional)');
    drawUsZone(cfg, st);
    drawIranZone(cfg, st);
    drawInset(cfg, st, info);
  }

  function drawUsZone(cfg, st) {
    const [x, y] = P(ZONES.usSea.center);
    const g = el('g', { class: 'kh-uszone' }, top);
    el('path', { d: circlePath(proj, ZONES.usSea.center, 12), class: 'kh-usarea' }, g);
    const amph = cfg.us.meu * 3, ddg = cfg.us.ddg;
    const aliveA = st ? st.amph : amph, aliveD = st ? st.ddg : ddg;
    const tok = (i, n, kind, alive) => {
      const cols = Math.min(n, 5), xx = x - (cols - 1) * 11 + (i % 5) * 22, yy = y + (kind === 'a' ? -12 : 14) + Math.floor(i / 5) * 18;
      el('path', { d: kind === 'a' ? `M${xx - 9} ${yy}l3 -5h12l3 5l-3 4h-12z` : `M${xx - 8} ${yy}l4 -4h8l4 4l-4 3h-8z`, class: `kh-ship ${kind}${i >= alive ? ' lost' : ''}` }, g);
    };
    for (let i = 0; i < amph; i++) tok(i, amph, 'a', aliveA);
    for (let i = 0; i < ddg; i++) tok(i, ddg, 'd', aliveD);
    el('text', { x, y: y + 46, class: 'kh-ztitle us mid' }, g, 'U.S. force (notional area)');
    tipOn(g, () => `<b>U.S. force at sea</b>A notional area, not a real position. ${aliveA} of ${amph} amphibious ships and ${aliveD} of ${ddg} destroyers still in action. Dashed ships are out of action.`);
  }

  function drawIranZone(cfg, st) {
    const [x0, y0] = P([50.62, 29.7]);
    const W = 272, H = 150;
    const g = el('g', { class: 'kh-zone' }, top);
    el('rect', { x: x0, y: y0, width: W, height: H, rx: 6 }, g);
    el('text', { x: x0 + 10, y: y0 + 20, class: 'kh-ztitle ir' }, g, 'Iran\'s forces');
    el('text', { x: x0 + 10, y: y0 + 36, class: 'kh-note' }, g, 'Notional zone, not real positions');
    const rows = [
      ['ascm', cfg.ir.ascm, st ? st.ascm : cfg.ir.ascm, 'Missile batteries'],
      ['drone', cfg.ir.drones, st ? st.drones : cfg.ir.drones, 'Drone teams'],
      ['fac', cfg.ir.fac, st ? st.fac : cfg.ir.fac, 'FAC squadrons'],
    ];
    rows.forEach(([k, n, alive, t], r) => {
      const y = y0 + 58 + r * 26;
      el('text', { x: x0 + 10, y: y + 4, class: 'kh-zl' }, g, t);
      for (let i = 0; i < n; i++) {
        const x = x0 + 132 + i * 19, dead = i >= alive, cls = `kh-tok${dead ? ' dead' : ''}`;
        if (k === 'ascm') el('path', { d: `M${x} ${y - 8}L${x + 8} ${y + 6}H${x - 8}z`, class: cls }, g);
        else if (k === 'drone') el('path', { d: `M${x} ${y - 8}L${x + 8} ${y}L${x} ${y + 8}L${x - 8} ${y}z`, class: cls }, g);
        else el('path', { d: `M${x - 8} ${y + 3}L${x + 8} ${y + 3}L${x + 4} ${y - 5}H${x - 6}z`, class: cls }, g);
        if (dead) el('path', { d: `M${x - 6} ${y - 6}L${x + 6} ${y + 6}M${x + 6} ${y - 6}L${x - 6} ${y + 6}`, class: 'kh-x' }, g);
      }
      if (!n) el('text', { x: x0 + 132, y: y + 4, class: 'kh-note' }, g, 'none');
    });
    const salvos = st ? st.salvos : cfg.ir.ascm * 2;
    el('text', { x: x0 + 10, y: y0 + H - 12, class: 'kh-zl' }, g, `${salvos} missile salvos · ${st ? st.srbm : cfg.ir.srbm} ballistic`);
    tipOn(g, () => '<b>Notional zone</b>Iran\'s coastal missiles, drones and fast attack craft are shown here on purpose, not at real positions. The model tracks how many survive, not where they are. Crossed-out tokens were destroyed.');
  }

  function drawInset(cfg, st, info) {
    const ip = createProjection(INSET_BOX);
    const Q = ll => { const [x, y] = ip.project(ll); return [INSET_AT.x + x, INSET_AT.y + y]; };
    const g = el('g', { class: 'kh-inset' }, top);
    el('rect', { x: INSET_AT.x, y: INSET_AT.y, width: ip.W, height: ip.H, class: 'kh-inbox' }, g);
    for (const ring of LAND_KHARG) {
      if (!ring.some(([lo, la]) => lo > INSET_BOX.lon0 && lo < INSET_BOX.lon1 && la > INSET_BOX.lat0 && la < INSET_BOX.lat1)) continue;
      el('path', { d: 'M' + ring.map(p => Q(p).map(v => v.toFixed(1)).join(' ')).join('L') + 'Z', class: 'tsm-land' }, g);
    }
    el('text', { x: INSET_AT.x + 8, y: INSET_AT.y + 18, class: 'kh-ztitle' }, g, 'Kharg Island');
    el('text', { x: INSET_AT.x + 8, y: INSET_AT.y + 34, class: 'kh-note' }, g, `about ${MEASURED.areaKm2} km²`);
    const land = cfg.us.obj !== 'blockade';
    for (const [k, sg] of Object.entries(SECTOR_GEO)) {
      const s = SECTORS[k], on = land && cfg.us.sector === k;
      const grp = el('g', { class: `kh-sector${on ? ' on' : ''}${land ? '' : ' dim'}`, tabindex: land ? 0 : -1, role: 'button', 'aria-label': `Land on the ${s.t.toLowerCase()}` }, g);
      const pts = sg.path.slice(0, 2).map(Q);
      el('path', { d: `M${pts[0][0]} ${pts[0][1]}L${pts[1][0]} ${pts[1][1]}`, class: 'kh-route', 'marker-end': 'url(#kh-head)' }, grp);
      const [bx, by] = Q(sg.from);
      el('circle', { cx: bx, cy: by, r: 16, class: 'kh-hit' }, grp);
      el('text', { x: bx + (k === 'W' ? -4 : 4), y: by + (k === 'W' ? -22 : 34), class: `kh-slabel ${k === 'W' ? 'start' : 'end'}` }, grp, s.t);
      if (land) {
        grp.addEventListener('click', () => onSector(k));
        grp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSector(k); } });
      }
      tipOn(grp, () => `<b>${s.t}</b><span class="tt-d">${s.s}</span>${s.steps} objectives: the airstrip area, then ${s.steps === 3 ? 'two more' : 'one more'} to secure the island. Broad and notional, not a beach assessment.${land ? '<small>Click to land here</small>' : ''}`);
    }
    // Airstrip
    const [ax, ay] = Q(AIRSTRIP.ll);
    const as = st ? st.airstrip : 'ir';
    const ag = el('g', {}, g);
    el('rect', { x: ax - 16, y: ay - 3.5, width: 32, height: 7, rx: 2, class: `kh-af ${as}`, transform: `rotate(-50 ${ax} ${ay})` }, ag);
    el('text', { x: ax - 18, y: ay + 22, class: 'kh-note end' }, ag, 'airstrip');
    tipOn(ag, () => `<b>${AIRSTRIP.t}</b>Published airport location, base level only. ${as === 'us' ? 'Held by U.S. forces and usable: troops fly in each turn.' : as === 'wrecked' ? 'Taken, but the runway was wrecked first.' : 'Held by Iran.'}`);
    // Ground fight
    if (land && st && info.turn >= info.landT) {
      const sg = SECTOR_GEO[cfg.us.sector];
      const upto = sg.path.slice(1, 2 + st.progress).map(Q);
      if (upto.length > 1) el('path', { d: 'M' + upto.map(p => p.join(' ')).join('L'), class: 'kh-adv', 'marker-end': 'url(#kh-head)' }, g);
      const at = Q(sg.path[1 + st.progress] || sg.path[sg.path.length - 1]);
      if (st.ashore > 0.05) {
        const n = el('g', { class: 'kh-lodge' }, g);
        el('circle', { cx: at[0], cy: at[1], r: 11 + Math.sqrt(st.ashore) * 6 }, n);
        el('text', { x: at[0], y: at[1] + 4 }, n, st.ashore.toFixed(1));
        tipOn(n, () => `<b>U.S. force ashore</b>${st.ashore.toFixed(2)} strength points (about ${Math.round(st.ashore * 1000).toLocaleString('en-US')} troops at the notional conversion). Objective ${st.progress} of ${SECTORS[cfg.us.sector].steps}.`);
      }
      if (st.garrison > 0.05) {
        const [gx, gy] = Q([50.318, 29.214]);
        const n = el('g', { class: 'kh-garr' }, g);
        el('rect', { x: gx - 16, y: gy - 12, width: 32, height: 24, rx: 3 }, n);
        el('text', { x: gx, y: gy + 4 }, n, st.garrison.toFixed(1));
        tipOn(n, () => `<b>Iranian garrison</b>${st.garrison.toFixed(2)} strength points, shown in a notional spot.`);
      }
    }
    tipOn(el('rect', { x: INSET_AT.x, y: INSET_AT.y, width: ip.W, height: 40, class: 'kh-hit' }, g), () => `<b>Kharg Island</b>About ${MEASURED.lengthKm} km by ${MEASURED.widthKm} km and ${MEASURED.areaKm2} km² on OpenStreetMap coastlines; Kharku lies ${MEASURED.kharkuKm} km to the north. The oil terminal is not drawn.`);
  }

  return { draw, proj };
}
