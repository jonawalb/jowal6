// Motion for Hormuz Mine Clearance: presentation only. Nothing here changes a number or holds up the day
// counter; every effect is skipped under prefers-reduced-motion.
import { reduced, pulse, flash, ping as ping0, burst } from '../../../shared/js/motion.js';
// Start rings on the next frame: the shared ring can compute a negative radius on its first frame when the
// frame timestamp predates the call (reported for shared/js/motion.js).
const ping = (...a) => requestAnimationFrame(() => ping0(...a));

const trailer = () => document.documentElement.dataset.skin === 'trailer';
let prevMines = new Map(), prevKey = '', prevDay = -1, lastSonar = 0, clickAt = 0, drawn = false;
let prevNums = null;

/** Clicks on buttons (presets, steppers, choices, reset) count as discrete changes: the chart redraws in. */
addEventListener('click', e => { if (e.target.closest('button')) clickAt = performance.now(); }, true);

/** Tween the number inside an element's text, ending on the exact text the page rendered. */
function tween(el, from, to, fmt, ms = 650) {
  if (!el || reduced() || !Number.isFinite(from) || from === to) return;
  const final = el.textContent, t0 = performance.now();
  const step = now => {
    if (!el.isConnected) return;
    const u = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - u, 3);
    el.textContent = u < 1 ? fmt(from + (to - from) * e) : final;
    if (u < 1) requestAnimationFrame(step);
  };
  el.textContent = fmt(from);
  requestAnimationFrame(step);
}
const pctF = v => v >= 0.1 ? `${Math.round(v * 100)}%` : v >= 0.001 ? `${(v * 100).toFixed(1)}%` : v > 0 ? '<0.1%' : '0%';

/** The risk line strokes in from day 0. */
function drawIn(chart) {
  const path = chart.querySelector('.hm-risk');
  if (!path || reduced()) return;
  const L = path.getTotalLength();
  path.style.transition = 'none';
  path.style.strokeDasharray = `${L} ${L}`; path.style.strokeDashoffset = L;
  void path.getBoundingClientRect();
  path.style.transition = `stroke-dashoffset ${trailer() ? 900 : 700}ms cubic-bezier(.4,0,.2,1)`;
  path.style.strokeDashoffset = 0;
  path.addEventListener('transitionend', () => { path.style.strokeDasharray = ''; path.style.strokeDashoffset = ''; path.style.transition = ''; }, { once: true });
  const fin = chart.querySelectorAll('.hm-fin, .hm-fin-t, .hm-dot');
  fin.forEach(n => { n.classList.remove('hm-fade'); void n.getBoundingClientRect(); n.classList.add('hm-fade'); });
}

/**
 * Called after every render. Stepping forward through the days: newly found mines ping, neutralized ones
 * burst, the search front sends out sonar rings and the day the routes are declared clear lights up.
 * Changing a setting: the headline and risk readouts count to their new values and the risk line redraws.
 */
export function afterRender({ strip, chart, S, R, day }) {
  const key = JSON.stringify(S), sameS = key === prevKey;
  const rich = trailer();
  const nowMines = new Map([...strip.querySelectorAll('.hm-m')].map(n => [n.dataset.k, n]));
  const nums = { finish: R.finish, riskStart: R.riskStart, riskEnd: R.riskEnd, risk: R.days[Math.min(day, R.days.length - 1)].risk };

  if (!reduced()) {
    if (sameS && day > prevDay && prevDay >= 0) {
      // Mines that changed state since the last frame.
      let n = 0;
      for (const [k, node] of nowMines) {
        const was = prevMines.get(k);
        if (!was || was === node.getAttribute('class') || n >= 14) continue;
        const cls = node.getAttribute('class');
        const x = +(node.getAttribute('cx') ?? node.dataset.x), y = +(node.getAttribute('cy') ?? node.dataset.y);
        if (cls.includes('found') && was.includes('live')) { ping(strip, x, y, { color: 'var(--accent)', r: rich ? 20 : 14, ms: 800 }); n++; }
        else if (cls.includes('done')) { burst(strip, x, y, { color: 'var(--good)', n: rich ? 10 : 8, r: rich ? 16 : 12, ms: 550 }); n++; }
      }
      // Sonar rings off the search front, a few times a second at most.
      const t = performance.now();
      if (t - lastSonar > (rich ? 320 : 480)) {
        lastSonar = t;
        strip.querySelectorAll('.hm-front').forEach(f => {
          const x = +f.getAttribute('x1'), y = (+f.getAttribute('y1') + +f.getAttribute('y2')) / 2;
          ping(strip, x, y, { color: 'var(--blue)', r: rich ? 30 : 20, ms: 900, width: 1.5 });
        });
      }
      // The day the routes are declared clear.
      if (R.finish != null && prevDay < R.finish && day >= R.finish) declared(chart, rich);
    }
    if (!sameS && prevKey) {
      const st = document.querySelector('#hm-status b');
      if (prevNums && prevNums.finish != null && R.finish != null) tween(st, prevNums.finish, R.finish, v => `Routes clear in ${Math.round(v)} days`);
      if (prevNums && (prevNums.finish == null) !== (R.finish == null)) flash(document.getElementById('hm-status'));
      const dds = [...document.querySelectorAll('#hm-read dd')];
      if (prevNums) {
        tween(dds[7], prevNums.risk, nums.risk, pctF);
        tween(dds[8], prevNums.riskStart, nums.riskStart, pctF);
        if (prevNums.riskEnd != null && R.finish != null && prevNums.finish != null) tween(dds[9], prevNums.riskEnd, nums.riskEnd, pctF);
      }
      [7, 8, 9].forEach(i => { if (dds[i]) flash(dds[i]); });
      if (performance.now() - clickAt < 120) drawIn(chart);
    }
  }
  if (!drawn && !reduced() && 'IntersectionObserver' in window) {
    drawn = true;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); drawIn(chart); } }, { threshold: .3 });
    io.observe(chart);
  }
  prevMines = new Map([...nowMines].map(([k, n]) => [k, n.getAttribute('class')]));
  prevKey = key; prevDay = day; prevNums = nums;
}

function declared(chart, rich) {
  const fin = chart.querySelector('.hm-fin');
  if (fin) {
    const x = +fin.getAttribute('x1'), y = +fin.getAttribute('y2');
    ping(chart, x, y, { color: 'var(--good)', r: rich ? 46 : 32, ms: 1000, width: 2.5 });
    if (rich) setTimeout(() => ping(chart, x, y, { color: 'var(--good)', r: 70, ms: 1100, width: 1.5 }), 180);
  }
  const st = document.getElementById('hm-status');
  pulse(st);
  st.classList.remove('hm-clear'); void st.offsetWidth; st.classList.add('hm-clear');
}

/** A pulse on the play button when it starts. */
export const press = btn => pulse(btn);
