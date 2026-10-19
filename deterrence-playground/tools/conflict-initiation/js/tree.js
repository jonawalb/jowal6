// Backward-induction tab: the solved game tree. Thick colored edges are each player's logical choice; the gold
// band is the equilibrium path (every branch that is reached with positive chance when both sides play logically).
// Click a node to open or close it. "Solve step by step" reveals values from the last decisions up to A's opening.
import { netShare } from '../data/engine.js';
import { f2, pct, esc } from './util.js';

const COL = 240, ROW = 38, PAD = 18;

export function mountTree(el, ctx) {
  const open = new Set();
  let anim = null, shownDepth = -1;
  el.innerHTML = `<section class="ci-sec ci-solve">
    <div class="ci-play-bar">
      <button type="button" class="btn" id="ci-anim">Solve step by step</button>
      <button type="button" class="btn ghost" id="ci-path">Open the equilibrium path</button>
      <button type="button" class="btn ghost" id="ci-all">Open B's responses</button>
      <button type="button" class="btn ghost" id="ci-close">Close all</button>
    </div>
    <p class="ci-legend"><span class="lg a"></span>A's logical choice <span class="lg b"></span>B's logical choice <span class="lg eq"></span>Equilibrium path <span class="lg off"></span>Option not taken
      · Numbers are expected payoffs (A, B). Click a node to open or close it.</p>
    <p class="ci-anim-note" id="ci-anim-note" aria-live="polite"></p>
    <div class="ci-treewrap" id="ci-treewrap"></div>
    <div class="ci-words" id="ci-words"></div>
  </section>`;
  const $ = s => el.querySelector(s);

  function eqSet(root) {
    const on = new Set();
    (function walk(n) {
      on.add(n.id);
      if (n.kind === 'leaf') return;
      if (n.kind === 'C') n.edges.forEach(e => e.p > 0 && walk(e.node));
      else walk(n.edges[n.best].node);
    })(root);
    return on;
  }
  function openPath(root) {
    const on = eqSet(root);
    (function walk(n) { if (n.kind === 'leaf' || !on.has(n.id)) return; open.add(n.id); n.edges.forEach(e => walk(e.node)); })(root);
  }
  function defaults(root) {
    open.clear(); open.add(root.id); root.edges.forEach(e => e.node.kind !== 'leaf' && open.add(e.node.id)); openPath(root);
  }

  function layout(root) {
    const rows = [];
    let row = 0, maxD = 0;
    (function place(n, d) {
      maxD = Math.max(maxD, d);
      n._d = d;
      if (n.kind === 'leaf' || !open.has(n.id)) { n._y = row++; rows.push(n); return; }
      n.edges.forEach(e => place(e.node, d + 1));
      n._y = (n.edges[0].node._y + n.edges[n.edges.length - 1].node._y) / 2;
    })(root, 0);
    return { rows: row, maxD };
  }

  function svg(root) {
    const eq = eqSet(root), { rows, maxD } = layout(root);
    const W = PAD * 2 + (maxD + 1) * COL + 260, H = PAD * 2 + rows * ROW;
    const X = n => PAD + 90 + n._d * COL, Y = n => PAD + n._y * ROW + ROW / 2;
    const reveal = n => anim === null || n._d >= shownDepth;
    let edges = '', nodes = '';
    (function walk(n) {
      const x = X(n), y = Y(n), vis = reveal(n);
      const isOpen = n.kind !== 'leaf' && open.has(n.id);
      if (isOpen) {
        n.edges.forEach((e, k) => {
          const c = e.node, cx = X(c), cy = Y(c);
          const best = n.kind !== 'C' && k === n.best && vis;
          const onEq = eq.has(n.id) && eq.has(c.id) && vis;
          const cls = `${best ? (n.kind === 'A' ? 'best a' : 'best b') : n.kind === 'C' ? 'chance' : 'off'}`;
          const d = `M${x},${y} C${x + COL * 0.45},${y} ${cx - COL * 0.55},${cy} ${cx - 8},${cy}`;
          if (onEq) edges += `<path d="${d}" class="eqband"/>`;
          edges += `<path d="${d}" class="edge ${cls}"/>`;
          const lbl = n.kind === 'C' ? `${e.label} (${pct(e.p)})` : e.label;
          edges += `<text x="${cx - 12}" y="${cy - 6}" class="el ${best ? 'on' : ''}" text-anchor="end">${esc(lbl)}</text>`;
          walk(c);
        });
      }
      const title = `<title>${esc(n.label)}\nPayoffs: A ${f2(n.v[0])}, B ${f2(n.v[1])}\nA's share ${pct(n.s)}, A's losses ${f2(n.la)}, B's losses ${f2(n.lb)}</title>`;
      // Leaves and closed nodes: payoffs to the right. Open nodes: payoffs below-left, clear of the edge labels.
      const [vx, vy, va] = !isOpen ? [x + 13, y + 4, 'start'] : [x - 14, y + 17, 'end'];
      const val = vis ? `<text x="${vx}" y="${vy}" class="nv" text-anchor="${va}">${n.kind === 'leaf' ? esc(n.label) + ' ' : ''}(${f2(n.v[0])}, ${f2(n.v[1])})</text>`
        : `<text x="${vx}" y="${vy}" class="nv pend" text-anchor="${va}">( ?, ? )</text>`;
      if (n.kind === 'leaf') nodes += `<g class="nd-g">${title}<rect x="${x - 5}" y="${y - 5}" width="10" height="10" class="nd leaf"/>${val}</g>`;
      else {
        const more = !isOpen ? `<text x="${x + 11}" y="${y - 7}" class="more">+</text>` : '';
        nodes += `<g class="nd-g click" data-id="${n.id}" tabindex="0" role="button" aria-label="${esc(n.label)}${isOpen ? ', open' : ', closed'}">${title}
          <circle cx="${x}" cy="${y}" r="10" class="nd ${n.kind === 'A' ? 'a' : n.kind === 'B' ? 'b' : 'c'} ${eq.has(n.id) ? 'eq' : ''}"/>
          <text x="${x}" y="${y + 4}" class="nl" text-anchor="middle">${n.kind}</text>${more}${val}</g>`;
      }
    })(root);
    return `<svg class="ci-tree" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Solved game tree">${edges}${nodes}</svg>`;
  }

  function words(root) {
    const P = ctx.P;
    const lines = [];
    (function walk(n, depth, prefix) {
      if (depth > 7 || n.kind === 'leaf') {
        if (n.kind === 'leaf') lines.push(`<li style="--d:${depth}">${prefix}<b>Outcome:</b> ${esc(n.label)}. A gets ${pct(n.s)} of the pie with losses ${f2(n.la)} (payoffs ${f2(n.v[0])}, ${f2(n.v[1])}).</li>`);
        return;
      }
      if (n.kind === 'C') {
        lines.push(`<li style="--d:${depth}">${prefix}<b>Chance:</b> ${esc(n.label)}.</li>`);
        n.edges.forEach(e => e.p > 0 && walk(e.node, depth + 1, `<i>${esc(e.label)} (${pct(e.p)}):</i> `));
        return;
      }
      const i = n.kind === 'A' ? 0 : 1, e = n.edges[n.best];
      const alts = n.edges.filter((_, k) => k !== n.best).map(o => `${esc(o.label)} ${f2(o.node.v[i])}`).join(', ');
      lines.push(`<li style="--d:${depth}">${prefix}<b class="${n.kind === 'A' ? 'pa' : 'pb'}">${n.kind}</b> chooses <b>${esc(e.label)}</b>: worth ${f2(e.node.v[i])} to ${n.kind}${alts ? ` (other options: ${alts})` : ''}.</li>`);
      walk(e.node, depth, '');
    })(root, 0, '');
    return `<h3>The equilibrium path in words</h3>
      <p>A's expected share of the pie is <b>${pct(root.s)}</b>, its expected losses <b>${f2(root.la)}</b>, and its net share <b>${f2(netShare(P, root))}</b>.</p>
      <ol class="ci-wordlist">${lines.join('')}</ol>`;
  }

  function draw() {
    const root = ctx.root;
    const wrap = $('#ci-treewrap'), sx = wrap.scrollLeft, sy = wrap.scrollTop;
    wrap.innerHTML = svg(root);
    wrap.scrollLeft = sx; wrap.scrollTop = sy;
    $('#ci-words').innerHTML = words(root);
    wrap.querySelectorAll('.nd-g.click').forEach(g => {
      const toggle = () => { const id = +g.dataset.id; open.has(id) ? open.delete(id) : open.add(id); draw(); };
      g.addEventListener('click', toggle);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
  }

  function animate() {
    clearInterval(anim);
    const root = ctx.root, { maxD } = layout(root);
    shownDepth = maxD + 1; anim = 0;
    const note = $('#ci-anim-note');
    const step = () => {
      shownDepth--;
      if (shownDepth < 0) { clearInterval(anim); anim = null; note.textContent = 'Solved: every decision now shows its value, and the gold band traces what logical play produces.'; draw(); return; }
      note.textContent = shownDepth === 0 ? 'Last step: A compares the value of each opening and picks the best.'
        : `Step ${maxD + 1 - shownDepth}: solving the nodes ${shownDepth} moves from the start, using the values already found below them.`;
      draw();
    };
    step();
    anim = setInterval(step, 1100);
  }

  $('#ci-anim').addEventListener('click', animate);
  $('#ci-path').addEventListener('click', () => { openPath(ctx.root); draw(); });
  $('#ci-all').addEventListener('click', () => { const r = ctx.root; open.add(r.id); r.edges.forEach(e => e.node.kind !== 'leaf' && open.add(e.node.id)); draw(); });
  $('#ci-close').addEventListener('click', () => { open.clear(); open.add(ctx.root.id); draw(); });
  defaults(ctx.root);
  draw();
  return { update: () => { if (anim !== null) { clearInterval(anim); anim = null; $('#ci-anim-note').textContent = ''; } draw(); } };
}
