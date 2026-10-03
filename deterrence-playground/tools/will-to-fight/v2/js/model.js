// Will to Fight v2: closed-form solution of the three-mover game (see data/model.js and the sketch).
import { Phi } from '../../js/normal.js';

const clamp01 = x => Math.min(1, Math.max(0, x));

/** Cohesion at public reading m: W = Φ((m − μ†)/σ), μ† = k − b/2. */
export const cohesion = (m, p) => Phi((m - (p.k - p.b / 2)) / p.sigma);

/** Solve by backward induction. Decisions use payoffs directly, so the clamp on p is respected. */
export function solve(p) {
  const mu = p.theta0 + p.ell + p.pi + p.r;
  const muHat = p.theta0 + p.ell + p.pi; // the adversary reads peacetime indicators and leaves out the rally
  const muDag = p.k - p.b / 2;
  const W = cohesion(mu, p), What = cohesion(muHat, p);
  const win = w => clamp01(p.p0 + p.gamma * w);
  const govFights = w => win(w) - p.cG >= -p.L;
  const barG = p.gamma > 0 ? (p.cG - p.L - p.p0) / p.gamma : NaN;
  const barA = p.gamma > 0 ? (1 - p.cA - p.p0) / p.gamma : NaN;

  // Adversary's expectation and choice, using its estimate.
  const expectConcede = !govFights(What);
  const expPay = expectConcede ? 1 : 1 - win(What) - p.cA;
  const attacks = expPay > 0;
  // What happens if it attacks, using true cohesion.
  const concedes = !govFights(W);
  const realPay = concedes ? 1 : 1 - win(W) - p.cA;

  let outcome, detail;
  if (!attacks) {
    outcome = 'Deterred';
    detail = 'The adversary sees cohesion clearing both bars and leaves the status quo alone.';
  } else if (concedes) {
    outcome = 'Attack, then concession';
    detail = W < 0.5 ? 'The force breaks and the government gives in.' : 'The government gives in although most of the force would fight: a wavering government.';
  } else if (realPay <= 0) {
    outcome = 'Attack, then a war the adversary regrets';
    detail = expectConcede
      ? 'The adversary expected the government to fold. The rally lifted cohesion past the government’s bar and it fights on.'
      : 'The adversary expected a war worth fighting. The rally lifted cohesion and the war is now a bad bet for it.';
  } else {
    outcome = 'Attack, then war';
    detail = W < 0.5 ? 'The government fights on as its army breaks: hollow resolve.' : 'The adversary judged the war worth it and was right by its own payoffs.';
  }
  return { mu, muHat, muDag, W, What, p: win(W), pHat: win(What), barG, barA, attacks, concedes, expectConcede, outcome, detail };
}
