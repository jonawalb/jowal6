// Small DOM helpers: labeled sliders, segmented choices, panel sections, SVG elements.

const SVGNS = 'http://www.w3.org/2000/svg';
/** Create an SVG element with attributes, append to parent, optional text. */
export function el(tag, attrs = {}, parent = null, text = null) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
export const pct = x => (x == null || !Number.isFinite(x)) ? '–' : `${Math.round(x * 100)}%`;
export const f2 = x => (x == null || !Number.isFinite(x)) ? '–' : x.toFixed(2).replace('-', '−');
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Labeled range slider. spec: { key, label, math, min, max, step, help, fmt, note } */
export function slider(parent, spec, value, onInput) {
  const id = 'sl-' + spec.key;
  const wrap = document.createElement('div');
  wrap.className = 'slider';
  wrap.innerHTML = `<div class="sl-h"><label for="${id}">${spec.label}${spec.math ? ` <span class="sym">${spec.math}</span>` : ''}${spec.note ? ` ${spec.note}` : ''}</label><output for="${id}"></output></div>
    <input type="range" id="${id}" min="${spec.min}" max="${spec.max}" step="${spec.step}">
    ${spec.help ? `<small>${spec.help}</small>` : ''}`;
  parent.appendChild(wrap);
  const input = wrap.querySelector('input'), out = wrap.querySelector('output');
  const fmt = spec.fmt || (v => (+v).toFixed(2));
  input.value = value; out.textContent = fmt(+input.value);
  input.addEventListener('input', () => { out.textContent = fmt(+input.value); onInput(+input.value); });
  return { input, set(v) { input.value = v; out.textContent = fmt(+input.value); }, disable(d) { input.disabled = d; wrap.classList.toggle('off', d); } };
}

/** Segmented choice group with aria-pressed buttons. */
export function choices(parent, opts, value, onPick, label) {
  const g = document.createElement('div');
  g.className = 'choices';
  g.setAttribute('role', 'group');
  if (label) g.setAttribute('aria-label', label);
  const btns = opts.map(o => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.v = o.v;
    b.innerHTML = `<b>${o.t}</b>${o.s ? `<span>${o.s}</span>` : ''}`;
    b.addEventListener('click', () => onPick(o.v));
    g.appendChild(b);
    return b;
  });
  parent.appendChild(g);
  const set = v => btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
  set(value);
  return { set };
}

/** Panel section with an eyebrow title. */
export function sec(parent, title) {
  const s = document.createElement('div');
  s.className = 'sec';
  if (title) s.innerHTML = `<p class="eyebrow">${title}</p>`;
  parent.appendChild(s);
  return s;
}
