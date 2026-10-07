// Canvas renderer. All colors come from the shared CSS tokens, re-read when the color scheme or the graphics
// style (Original / Trailer, shared/js/skin.js) changes. Motion extras (launch flashes, detection pings, kill
// sparks, city shakes, long tracer tails) are drawing only: they never touch the simulation or its clock, and
// they are off when the game's own reduced-motion setting or the system preference asks for less motion.
import { FIELD, CITIES, WEAPONS, WEAPON_ORDER, THREATS } from '../data/params.js';
import { tti } from './sim.js';
import { skin } from '../../../shared/js/skin.js';

const PRM = matchMedia('(prefers-reduced-motion: reduce)');

const TOK = { sea: '--sea', land: '--land', coast: '--coast', grat: '--grat', ink: '--ink', muted: '--muted', faint: '--faint',
  panel: '--panel', drone: '--c2', cruise: '--c6', ballistic: '--bad', gun: '--c3', sri: '--c1', lri: '--c4', sel: '--accent', good: '--good',
  L: '--c7', R: '--c5' };

export function createRenderer(canvas, { onEvent } = {}) {
  const ctx = canvas.getContext('2d');
  let C = {}, scale = 1, dpr = 1, fx = [];
  // Trailer look: glow, long tails, mono labels. Original uses the site's own font tokens (--mono, --body).
  let TR = false, MONO = '"IBM Plex Mono", monospace', SANS = '"IBM Plex Sans", sans-serif';
  const readColors = () => {
    const cs = getComputedStyle(document.documentElement);
    for (const [k, v] of Object.entries(TOK)) C[k] = cs.getPropertyValue(v).trim() || '#888';
    TR = skin() === 'trailer';
    MONO = TR ? '"Martian Mono", monospace' : cs.getPropertyValue('--mono').trim() || '"IBM Plex Mono", monospace';
    SANS = TR ? '"Martian Mono", monospace' : cs.getPropertyValue('--body').trim() || '"IBM Plex Sans", sans-serif';
  };
  readColors();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', readColors);
  addEventListener('skinchange', readColors);
  // The Trailer stylesheet is added by chrome.js after this module may have run: read again once it has loaded.
  if (document.readyState !== 'complete') addEventListener('load', readColors, { once: true });
  document.fonts?.ready.then(readColors);
  // Motion bookkeeping (drawing only): threats already pinged, and city shakes.
  let seenFor = null, seen = new Set(), shakeAt = {}, camAt = 0;

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
    const calm = reduced || PRM.matches;
    for (const e of S.events) {
      if (e.k === 'kill') {
        fx.push({ k: 'boom', x: e.x, y: e.y, t0: now, dur: reduced ? 350 : 600, c: C[e.type] });
        if (!calm) fx.push({ k: 'spark', x: e.x, y: e.y, t0: now, dur: TR ? 620 : 480, a0: Math.random() * Math.PI, n: TR ? 10 : 7 });
      } else if (e.k === 'leak') {
        fx.push({ k: 'leak', x: e.x, y: e.y, t0: now, dur: reduced ? 500 : 900 });
        if (!calm) { fx.push({ k: 'shock', x: e.x, y: e.y, t0: now, dur: 700 }); shakeAt[e.city] = now; if (TR) camAt = now; }
      } else if (e.k === 'miss') fx.push({ k: 'miss', x: e.x, y: e.y, t0: now, dur: 400 });
      else if (e.k === 'launch' && !calm) fx.push({ k: 'launch', x: e.x, y: e.y, t0: now, dur: 320, c: C[e.w] });
      onEvent?.(e);
    }
    S.events.length = 0;
    // Detection: a ping the first time each track is drawn.
    if (seenFor !== S) { seenFor = S; seen = new Set(); }
    for (const th of S.threats) {
      if (seen.has(th.id)) continue;
      seen.add(th.id);
      if (!calm && th.alive) fx.push({ k: 'ping', x: th.x, y: th.y, t0: now, dur: 650, c: C[th.type] });
    }
    fx = fx.filter(f => now - f.t0 < f.dur);
  }
  // Short, decaying jitter (game units) for a city that was just hit.
  const jig = (t0, now, amp, dur = 420) => { const u = (now - t0) / dur; return u >= 1 || u < 0 ? 0 : Math.sin(u * 42) * amp * (1 - u); };

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
    const cam = TR && camAt ? jig(camAt, now, px(3), 360) : 0;
    if (cam) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = C.sea; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, cam * scale * dpr, cam * 0.6 * scale * dpr);
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
      ctx.font = `600 ${px(TR ? 11 : 12)}px ${MONO}`;
      const wide = scale > 0.6; // on a phone the field is small, so only the letters are drawn
      ctx.fillStyle = C.L; ctx.textAlign = 'left'; ctx.fillText(wide ? 'L · LEFT BATTERY' : 'L', px(8), FIELD.H - px(8));
      ctx.fillStyle = C.R; ctx.textAlign = 'right'; ctx.fillText(wide ? 'RIGHT BATTERY · R' : 'R', FIELD.W - px(8), FIELD.H - px(8));
    }

    // cities
    ctx.font = `600 ${px(TR ? 11 : 12)}px ${SANS}`; ctx.textAlign = 'center';
    for (const c of CITIES) {
      const d = S.dmg[c.k], hot = fx.some(f => f.k === 'leak' && Math.hypot(f.x - c.x, f.y - c.y) < 40);
      const sx = shakeAt[c.k] ? jig(shakeAt[c.k], now, px(4)) : 0, cx = c.x + sx;
      ctx.fillStyle = hot ? C.ballistic : C.ink;
      const w = px(5);
      [[-2, 12], [-1, 18], [0, 24], [1, 15], [2, 10]].forEach(([o, h]) => ctx.fillRect(cx + o * w * 1.3 - w / 2, c.y - px(h), w, px(h)));
      ctx.fillStyle = C.ink; ctx.fillText(c.name, cx, c.y + px(16));
      // On a phone the text is large next to the site markers below the cities, so the damage label goes above the skyline.
      if (d) { ctx.fillStyle = C.ballistic; ctx.fillText(`damage ${d}`, cx, scale > 0.6 ? c.y + px(30) : c.y - px(32)); }
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
      if (TR && th.type === 'ballistic') { ctx.globalAlpha = 0.28; shape(th.type, th.x, th.y, px(13), col); ctx.globalAlpha = 1; }
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
      ctx.font = `500 ${px(TR ? 11 : 12)}px ${MONO}`;
      // In hard mode the left label sits above-left and the right label below-right, so they do not collide.
      const right = hard ? (b.k === 'L' ? sel.x > 170 : sel.x > FIELD.W - 170) : sel.x > FIELD.W - 160;
      ctx.textAlign = right ? 'right' : 'left';
      const lx = sel.x + (right ? -px(22) : px(22)), ly = sel.y + (hard && b.k === 'R' ? px(22) : -px(12));
      ctx.lineWidth = px(3); ctx.strokeStyle = C.sea; ctx.strokeText(lbl, lx, ly);
      ctx.fillStyle = hard ? col : C.ink; ctx.fillText(lbl, lx, ly);
    });

    // interceptors
    const longTail = !view.reduced && !PRM.matches;
    for (const sh of S.shots) {
      const dx = sh.x - sh.px, dy = sh.y - sh.py, L = Math.hypot(dx, dy) || 1;
      if (longTail) {
        // Tracer: a longer fading tail behind the head (back toward the launch site), plus glow in Trailer.
        const tl = (sh.w === 'gun' ? 34 : 46) * (TR ? 1.5 : 1), tx = sh.x - dx / L * tl, ty = sh.y - dy / L * tl;
        const g = ctx.createLinearGradient(tx, ty, sh.x, sh.y);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, C[sh.w]);
        ctx.strokeStyle = g; ctx.lineCap = 'round';
        if (TR) { ctx.globalAlpha = 0.3; ctx.lineWidth = px(sh.w === 'gun' ? 4 : 6); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(sh.x, sh.y); ctx.stroke(); ctx.globalAlpha = 1; }
        ctx.lineWidth = px(sh.w === 'gun' ? 1.2 : 2);
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(sh.x, sh.y); ctx.stroke(); ctx.lineCap = 'butt';
      } else {
        ctx.strokeStyle = C[sh.w]; ctx.lineWidth = px(sh.w === 'gun' ? 1.2 : 2);
        const tl = sh.w === 'gun' ? 16 : 10;
        ctx.beginPath(); ctx.moveTo(sh.x - dx / L * tl, sh.y - dy / L * tl); ctx.lineTo(sh.x, sh.y); ctx.stroke();
      }
      if (TR) { ctx.globalAlpha = 0.35; ctx.fillStyle = C[sh.w]; ctx.beginPath(); ctx.arc(sh.x, sh.y, px(5), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.fillStyle = TR ? C.ink : C[sh.w]; ctx.beginPath(); ctx.arc(sh.x, sh.y, px(2.2), 0, Math.PI * 2); ctx.fill();
    }

    // effects
    for (const f of fx) {
      const a = (now - f.t0) / f.dur;
      ctx.globalAlpha = 1 - a;
      if (f.k === 'boom') {
        ctx.strokeStyle = f.c; ctx.lineWidth = px(2);
        ctx.beginPath(); ctx.arc(f.x, f.y, px(view.reduced ? 10 : 6 + 16 * a), 0, Math.PI * 2); ctx.stroke();
      } else if (f.k === 'spark') {
        // Kill burst: sparks flying out, with a hot core in Trailer.
        const e = 1 - (1 - a) ** 3, r0 = px(4 + 10 * e), r1 = px(8 + (TR ? 24 : 18) * e);
        ctx.strokeStyle = C.sel; ctx.lineWidth = px(TR ? 1.8 : 1.4); ctx.lineCap = 'round'; ctx.beginPath();
        for (let i = 0; i < f.n; i++) { const t = f.a0 + i * Math.PI * 2 / f.n; ctx.moveTo(f.x + Math.cos(t) * r0, f.y + Math.sin(t) * r0); ctx.lineTo(f.x + Math.cos(t) * r1, f.y + Math.sin(t) * r1); }
        ctx.stroke(); ctx.lineCap = 'butt';
        if (TR) { ctx.globalAlpha = (1 - a) * 0.85; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(f.x, f.y, px(3 + 5 * (1 - a)), 0, Math.PI * 2); ctx.fill(); }
      } else if (f.k === 'launch') {
        ctx.strokeStyle = f.c; ctx.lineWidth = px(1.6);
        ctx.beginPath(); ctx.arc(f.x, f.y, px(8 + 12 * a), 0, Math.PI * 2); ctx.stroke();
        if (TR) { ctx.globalAlpha = (1 - a) * 0.5; ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, px(9), 0, Math.PI * 2); ctx.fill(); }
      } else if (f.k === 'ping') {
        ctx.globalAlpha = (1 - a) * 0.8; ctx.strokeStyle = f.c; ctx.lineWidth = px(1.2);
        ctx.beginPath(); ctx.arc(f.x, f.y, px(6 + 20 * a), 0, Math.PI * 2); ctx.stroke();
      } else if (f.k === 'shock') {
        ctx.strokeStyle = C.ballistic; ctx.lineWidth = px(2.2);
        ctx.beginPath(); ctx.arc(f.x, f.y, px(14 + 46 * (1 - (1 - a) ** 2)), 0, Math.PI * 2); ctx.stroke();
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
