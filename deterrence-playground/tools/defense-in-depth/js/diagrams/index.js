// Lessons diagrams entry point (SPEC §10.2):  mountDiagram(id, el, { model, colors, reduced })
// Pure DOM/SVG. Each module is loaded on demand. Returns a handle at once:
//   { ready: Promise, update(model), destroy() }
// `model` is optional game data (for example L5 { timetable }, L11 { sector: {fr, d} }, L12 { mix }, L15 { campaign });
// every diagram works without it.
import { LESSONS, lessonById } from '../../data/lessons.js';

const LOAD = {
  'dg-enfilade': () => import('./dg-enfilade.js'),
  'dg-coverage': () => import('./dg-coverage.js'),
  'dg-zones': () => import('./dg-zones.js'),
  'dg-slope': () => import('./dg-slope.js'),
  'dg-barrage': () => import('./dg-barrage.js'),
  'dg-fireplan': () => import('./dg-fireplan.js'),
  'dg-leapfrog': () => import('./dg-leapfrog.js'),
  'dg-infil': () => import('./dg-infil.js'),
  'dg-counter': () => import('./dg-counter.js'),
  'dg-race': () => import('./dg-race.js'),
  'dg-curves': () => import('./dg-curves.js'),
  'dg-learning': () => import('./dg-learning.js'),
  'dg-dilemma': () => import('./dg-dilemma.js'),
};

export { LESSONS };

/** Mount diagram `id` ('L1' … 'L16') into `el`. */
export function mountDiagram(id, el, opts = {}) {
  const lesson = lessonById(id);
  if (!lesson) throw new Error(`Unknown diagram ${id}`);
  let inner = null, dead = false, pending = opts.model;
  const ready = LOAD[lesson.file]().then(mod => {
    if (dead) return null;
    inner = mod.mount(el, lesson, { ...opts, model: pending });
    return inner;
  }).catch(err => {
    el.textContent = `Diagram ${id} could not load.`;
    console.error(err);
    return null;
  });
  return {
    ready,
    update(model) { pending = model; inner?.update?.(model); },
    destroy() { dead = true; inner?.destroy?.(); el.textContent = ''; },
  };
}
