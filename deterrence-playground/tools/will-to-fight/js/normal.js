// Standard normal density, CDF and quantile. Pure, no DOM.
// Phi uses the Chebyshev erfc fit (fractional error < 1.2e-7 everywhere); PhiInv uses Acklam's rational
// approximation refined by one Halley step against Phi, so PhiInv(Phi(x)) = x to about 1e-7 on |x| < 6.

const SQRT2 = Math.SQRT2;
export const SQRT2PI = Math.sqrt(2 * Math.PI);

/** Standard normal density phi(x). */
export const phi = x => Math.exp(-0.5 * x * x) / SQRT2PI;

/** Complementary error function (Chebyshev fit, Numerical Recipes erfcc). */
function erfc(x) {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
    t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
    t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}

/** Standard normal CDF Phi(x). */
export const Phi = x => 0.5 * erfc(-x / SQRT2);

const A = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
const B = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
const C = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
const D = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];

/** Standard normal quantile Phi^{-1}(p), p in (0,1). Returns +-Infinity at the endpoints. */
export function PhiInv(p) {
  if (!(p > 0)) return -Infinity;
  if (!(p < 1)) return Infinity;
  const lo = 0.02425, hi = 1 - lo;
  let x;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) / ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1);
  } else if (p <= hi) {
    const q = p - 0.5, r = q * q;
    x = (((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q / (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) / ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1);
  }
  const e = Phi(x) - p, u = e * SQRT2PI * Math.exp(0.5 * x * x);
  return x - u / (1 + 0.5 * x * u);
}

/** Logistic function and its inverse. */
export const logistic = z => 1 / (1 + Math.exp(-z));
export const logit = p => Math.log(p / (1 - p));
