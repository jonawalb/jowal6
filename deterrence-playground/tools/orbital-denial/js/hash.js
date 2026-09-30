// Shareable state: #seed=4242&red=unknown&fm=1&log=kidi.jnhc
// log holds each month played, two actions per month, two letters per action (action, target).
const A = { jam: 'j', dazzle: 'd', cyber: 'c', asat: 'k', coorb: 'o', maneuver: 'm', harden: 'h', reconst: 'r', prolif: 'p', hold: 'x' };
const M = { isr: 'i', com: 'c', nav: 'n', ew: 'e' };
const rA = Object.fromEntries(Object.entries(A).map(([k, v]) => [v, k]));
const rM = Object.fromEntries(Object.entries(M).map(([k, v]) => [v, k]));
const POST = ['unknown', 'restrained', 'reciprocal', 'aggressive'];

export const encode = plan => plan.map(t => t.map(x => A[x.a] + (M[x.m] || '-')).join('')).join('.');
export function decode(s) {
  if (!s || !/^[a-z\-.]+$/.test(s)) return [];
  return s.split('.').slice(0, 10).map(t => (t.match(/../g) || []).slice(0, 2).map(c => ({ a: rA[c[0]] || 'hold', m: rM[c[1]] || null })));
}

export function writeHash(st) {
  const q = new URLSearchParams();
  q.set('seed', st.seed); q.set('red', st.redSetting); q.set('fm', st.fragMult);
  if (st.plan.length) q.set('log', encode(st.plan));
  history.replaceState(null, '', '#' + q.toString());
}

export function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const seed = Math.round(Number(q.get('seed')));
  return {
    seed: Number.isFinite(seed) && seed >= 1 && seed <= 999999 ? seed : null,
    redSetting: POST.includes(q.get('red')) ? q.get('red') : 'unknown',
    fragMult: q.get('fm') === '4' ? 4 : 1,
    plan: decode(q.get('log')),
  };
}
