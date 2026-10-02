// The keyboard map (SPEC §8.6). Keys work while the walkthrough is open; only keys typed with focus inside the
// tour card (or in a form field) belong there. Focus is never lost: app.js puts it back after each action.
import { S, $ } from './store.js';

export const KEYS = [
  ['N', 'End the hour'], ['U', 'Undo the last order this hour'], ['Esc', 'Clear the selection and tool'],
  [']  [', 'Next / previous unit in the current filter (the map pans to it)'], ['}  {', 'Next / previous formation'],
  ['I', 'Next unit that needs orders'], ['C', 'Next unit in contact'], ['F', 'Cycle the unit filter'],
  ['P', 'Cycle posture (attacker)'], ['W', 'Waves or small groups'], ['G', 'Cycle stance (defender)'],
  ['L', 'Leapfrog (two units selected)'], ['R', 'Riposte tool (defender)'], ['K', 'Fire-lane tool (MG companies)'],
  ['A', 'Cycle through your batteries'], ['T', 'Show the start tips'], ['+  −  0', 'Zoom in, out, fit'],
  ['Tab, then arrows', 'Move between sectors; Enter acts on the focused sector, Esc leaves the map'],
  ['Shift + arrows', 'Pan the map'], ['?', 'This list'],
];

export function keyHelpHTML() {
  return `<div class="tour-h"><span>Keyboard</span><button type="button" class="x" aria-label="Close">×</button></div>
    <dl class="dd-keylist">${KEYS.map(([k, t]) => `<dt><kbd>${k}</kbd></dt><dd>${t}</dd>`).join('')}</dl>`;
}

/** api: { endHour, undo, clear, cycleUnit(d, filter?), cycleFmn(d), cycleFilter, posture, form, stance, leapfrog,
 * riposte, lane, battery, tips, zoom(k), pan(dx, dy), help } */
export function wireKeys(api) {
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t.closest && (t.closest('input, textarea, select, summary') || t.closest('#tour') || t.closest('#keyhelp'))) {
      if (e.key === 'Escape' && t.closest('#keyhelp')) api.help(false);
      return;
    }
    const k = e.key;
    if (k === '?') { api.help(true); e.preventDefault(); return; }
    if (e.shiftKey && k.startsWith('Arrow')) {
      const d = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] }[k];
      if (S.g) { api.pan(...d); e.preventDefault(); }
      return;
    }
    if (k === '+' || k === '=') { api.zoom('in'); return; }
    if (k === '-' || k === '_') { api.zoom('out'); return; }
    if (k === '0') { api.zoom('fit'); return; }
    const g = S.g;
    if (!g) return;
    const key = k.length === 1 ? k.toLowerCase() : k;
    const map = {
      n: api.endHour, u: api.undo, Escape: api.clear, ']': () => api.cycleUnit(1), '[': () => api.cycleUnit(-1),
      '}': () => api.cycleFmn(1), '{': () => api.cycleFmn(-1), i: () => api.cycleUnit(1, 'idle'), c: () => api.cycleUnit(1, 'contact'),
      f: api.cycleFilter, p: api.posture, w: api.form, g: api.stance, l: api.leapfrog, r: api.riposte, k: api.lane, a: api.battery, t: api.tips,
    };
    const fn = map[key];
    if (fn) { fn(); if (key !== 'Escape' || !$('sheet').hidden) e.preventDefault(); }
  });
}
