// Canvas renderer. All colors come from the shared CSS tokens, re-read when the color scheme changes.
import { FIELD, CITIES, WEAPONS, WEAPON_ORDER, THREATS } from '../data/params.js';
import { tti } from './sim.js';

const TOK = { sea: '--sea', land: '--land', coast: '--coast', grat: '--grat', ink: '--ink', muted: '--muted', faint: '--faint',
  panel: '--panel', drone: '--c2', cruise: '--c6', ballistic: '--bad', gun: '--c3', sri: '--c1', lri: '--c4', sel: '--accent', good: '--good',
  L: '--c7', R: '--c5' };

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let C = {}, scale = 1, dpr = 1, fx = [];
  const readColors = () => {
    const cs = getComputedStyle(document.documentElement);
    for (const [k, v] of Object.entries(TOK)) C[k] = cs.getPropertyValue(v).trim() || '#888';
  };
  readColors();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', readColors);

  function resize() {
    const w = canvas.clientWidth || 800;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    scale = w / FIELD.W;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(w * FIELD.H / FIELD.W * dpr);
  }

  /** CSS pixels to game units. */
  const px = n => n / scale;

  function takeEvents(S, now, reduced) {
    for (const e of S.events) {
      if (e.k === 'kill') fx.push({ k: 'boom', x: e.x, y: e.y, t0: now, dur: reduced ? 350 : 600, c: C[e.type] });
      else if (e.k === 'leak') fx.push({ k: 'leak', x: e.x, y: e.y, t0: now, dur: reduced ? 500 : 900 });
      else if (e.k === 'miss') fx.push({ k: 'miss', x: e.x, y: e.y, t0: now, dur: 400 });
    }
    S.events.length = 0;
    fx = fx.filter(f => now - f.t0 < f.dur);
  }

  function shape(type, x, y, r, fill) {
    ctx.beginPath();
    if (type === 'drone') { ctx.moveTo(x, y + r); ctx.lineTo(x - r, y - r * 0.8); ctx.lineTo(x + r, y - r * 0.8); ctx.closePath(); }
    else if (type === 'cruise') { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); }
    else ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
  }

  function site(w, s, i, S, active) {
    const r = px(7), cool = S.cool[w][i] / WEAPONS[w].reload;
    ctx.lineWidth = px(1.5);
    ctx.strokeStyle = C[w]; ctx.fillStyle = active ? C[w] : C.panel;
    ctx.beginPath();
    if (w === 'gun') ctx.arc(s.x, s.y, r * 0.8, 0, Math.PI * 2);
    else if (w === 'sri') ctx.rect(s.x - r * 0.8, s.y - r * 0.8, r * 1.6, r * 1.6);
    else { for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx[k ? 'lineTo' : 'moveTo'](s.x + Math.cos(a) * r, s.y + Math.sin(a) * r); } ctx.closePath(); }
    ctx.fill(); ctx.stroke();
    if (cool > 0) {
      ctx.beginPath(); ctx.strokeStyle = C.muted; ctx.lineWidth = px(2);
      ctx.arc(s.x, s.y, r * 1.6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cool)); ctx.stroke();
    }
  }

  function draw(S, view) {
    const now = performance.now();
    takeEvents(S, now, view.reduced);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    // sea, land, grid
    ctx.fillStyle = C.sea; ctx.fillRect(0, 0, FIELD.W, FIELD.H);
    ctx.strokeStyle = C.grat; ctx.lineWidth = px(1);
    ctx.beginPath();
    for (let x = 100; x < FIELD.W; x += 100) { ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.H); }
    for (let y = 100; y < FIELD.H; y += 100) { ctx.moveTo(0, y); ctx.lineTo(FIELD.W, y); }
    ctx.stroke();
    ctx.fillStyle = C.land; ctx.strokeStyle = C.coast; ctx.lineWidth = px(1.5);
    ctx.beginPath(); ctx.moveTo(0, FIELD.coastY + 20);
    for (let x = 0; x <= FIELD.W; x += 50) ctx.lineTo(x, FIELD.coastY + Math.sin(x / 90) * 14 + Math.sin(x / 37) * 5);
    ctx.lineTo(FIELD.W, FIELD.H); ctx.lineTo(0, FIELD.H); ctx.closePath(); ctx.fill(); ctx.stroke();

    // range rings for each battery's chosen weapon, from that battery's own sites
    ctx.setLineDash([px(5), px(5)]); ctx.lineWidth = px(1.2);
    for (const b of view.bats) {
      ctx.strokeStyle = C[b.weapon];
      for (const i of b.sites) { const s = WEAPONS[b.weapon].sites[i]; ctx.beginPath(); ctx.arc(s.x, s.y, WEAPONS[b.weapon].range, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.setLineDash([]);
    // hard mode: the boundary between the two batteries
    if (view.mode === 'hard') {
      ctx.setLineDash([px(2), px(6)]); ctx.strokeStyle = C.muted; ctx.lineWidth = px(1.2);
      ctx.beginPath(); ctx.moveTo(FIELD.W / 2, FIELD.coastY + 24); ctx.lineTo(FIELD.W / 2, FIELD.H); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = `600 ${px(12)}px "IBM Plex Mono", monospace`;
      const wide = scale > 0.6; // on a phone the field is small, so only the letters are drawn
      ctx.fillStyle = C.L; ctx.textAlign = 'left'; ctx.fillText(wide ? 'L · LEFT BATTERY' : 'L', px(8), FIELD.H - px(8));
      ctx.fillStyle = C.R; ctx.textAlign = 'right'; ctx.fillText(wide ? 'RIGHT BATTERY · R' : 'R', FIELD.W - px(8), FIELD.H - px(8));
    }

    // cities
    ctx.font = `600 ${px(12)}px "IBM Plex Sans", sans-serif`; ctx.textAlign = 'center';
    for (const c of CITIES) {
      const d = S.dmg[c.k], hot = fx.some(f => f.k === 'leak' && Math.hypot(f.x - c.x, f.y - c.y) < 40);
      ctx.fillStyle = hot ? C.ballistic : C.ink;
      const w = px(5);
      [[-2, 12], [-1, 18], [0, 24], [1, 15], [2, 10]].forEach(([o, h]) => ctx.fillRect(c.x + o * w * 1.3 - w / 2, c.y - px(h), w, px(h)));
      ctx.fillStyle = C.ink; ctx.fillText(c.name, c.x, c.y + px(16));
      if (d) { ctx.fillStyle = C.ballistic; ctx.fillText(`damage ${d}`, c.x, c.y + px(30)); }
    }
    // defense sites
    for (const w of WEAPON_ORDER) WEAPONS[w].sites.forEach((s, i) => site(w, s, i, S, view.bats.some(b => b.weapon === w && b.sites.includes(i))));

    // ballistic impact predictions
    ctx.setLineDash([px(3), px(3)]); ctx.strokeStyle = C.ballistic; ctx.lineWidth = px(1.2);
    for (const th of S.threats) if (th.alive && th.type === 'ballistic') { ctx.beginPath(); ctx.arc(th.x1, th.y1, px(11), 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([]);

    // threats
    for (const th of S.threats) {
      if (!th.alive) continue;
      const col = C[th.type];
      if (th.type !== 'drone') {
        const tail = th.type === 'ballistic' ? 70 : 30, f = Math.max(0, th.s - tail) / th.len;
        ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.lineWidth = px(1.5);
        ctx.beginPath(); ctx.moveTo(th.x0 + (th.x1 - th.x0) * f, th.y0 + (th.y1 - th.y0) * f); ctx.lineTo(th.x, th.y); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      shape(th.type, th.x, th.y, px(th.type === 'drone' ? 6 : 7), col);
      if (view.targeted?.has(th.id)) { ctx.strokeStyle = C.ink; ctx.lineWidth = px(1); ctx.beginPath(); ctx.arc(th.x, th.y, px(10), 0, Math.PI * 2); ctx.stroke(); }
      if (th.id === view.hover && !view.bats.some(b => b.sel === th.id)) { ctx.strokeStyle = C.muted; ctx.lineWidth = px(1.5); ctx.beginPath(); ctx.arc(th.x, th.y, px(14), 0, Math.PI * 2); ctx.stroke(); }
    }
    // selection reticles: one accent ring in normal mode; in hard mode a round L reticle and a square R reticle
    view.bats.forEach(b => {
      const sel = S.threats.find(t => t.alive && t.id === b.sel);
      if (!sel) return;
      const hard = b.k !== 'N', col = hard ? C[b.k] : C.sel, both = hard && view.bats.some(o => o !== b && o.sel === b.sel);
      const r = px(both && b.k === 'R' ? 20 : 15);
      ctx.strokeStyle = col; ctx.lineWidth = px(2.5); ctx.beginPath();
      if (b.k === 'R') ctx.rect(sel.x - r, sel.y - r, r * 2, r * 2); else ctx.arc(sel.x, sel.y, r, 0, Math.PI * 2);
      ctx.stroke();
      const lbl = `${hard ? b.k + ' ' : ''}${THREATS[sel.type].short} · ${tti(sel).toFixed(1)} s → ${sel.city}`;
      ctx.font = `500 ${px(12)}px "IBM Plex Mono", monospace`;
      // In hard mode the left label sits above-left and the right label below-right, so they do not collide.
      const right = hard ? (b.k === 'L' ? sel.x > 170 : sel.x > FIELD.W - 170) : sel.x > FIELD.W - 160;
      ctx.textAlign = right ? 'right' : 'left';
      const lx = sel.x + (right ? -px(22) : px(22)), ly = sel.y + (hard && b.k === 'R' ? px(22) : -px(12));
      ctx.lineWidth = px(3); ctx.strokeStyle = C.sea; ctx.strokeText(lbl, lx, ly);
      ctx.fillStyle = hard ? col : C.ink; ctx.fillText(lbl, lx, ly);
    });

    // interceptors
    for (const sh of S.shots) {
      ctx.strokeStyle = C[sh.w]; ctx.lineWidth = px(sh.w === 'gun' ? 1.2 : 2);
      const dx = sh.x - sh.px, dy = sh.y - sh.py, L = Math.hypot(dx, dy) || 1, tl = sh.w === 'gun' ? 16 : 10;
      ctx.beginPath(); ctx.moveTo(sh.x - dx / L * tl, sh.y - dy / L * tl); ctx.lineTo(sh.x, sh.y); ctx.stroke();
      ctx.fillStyle = C[sh.w]; ctx.beginPath(); ctx.arc(sh.x, sh.y, px(2.2), 0, Math.PI * 2); ctx.fill();
    }

    // effects
    for (const f of fx) {
      const a = (now - f.t0) / f.dur;
      ctx.globalAlpha = 1 - a;
      if (f.k === 'boom') {
        ctx.strokeStyle = f.c; ctx.lineWidth = px(2);
        ctx.beginPath(); ctx.arc(f.x, f.y, px(view.reduced ? 10 : 6 + 16 * a), 0, Math.PI * 2); ctx.stroke();
      } else if (f.k === 'leak') {
        ctx.fillStyle = C.ballistic;
        ctx.beginPath(); ctx.arc(f.x, f.y, px(view.reduced ? 16 : 8 + 26 * a), 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.strokeStyle = C.muted; ctx.lineWidth = px(1.5); const r = px(5);
        ctx.beginPath(); ctx.moveTo(f.x - r, f.y - r); ctx.lineTo(f.x + r, f.y + r); ctx.moveTo(f.x + r, f.y - r); ctx.lineTo(f.x - r, f.y + r); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  /** Nearest live threat to a point given in CSS pixels relative to the canvas, within radius (CSS px). */
  function pick(S, cx, cy, radius) {
    const x = cx / scale, y = cy / scale, R = radius / scale;
    let best = null, bd = R;
    for (const th of S.threats) {
      if (!th.alive) continue;
      const d = Math.hypot(th.x - x, th.y - y);
      if (d < bd) { bd = d; best = th; }
    }
    return best;
  }

  return { resize, draw, pick, readColors };
}
