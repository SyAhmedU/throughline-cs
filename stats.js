// Throughline CS — hand-written, dependency-free stats for comparing
// experiment runs. Verified against textbook critical values in
// stats.verify.mjs — re-verify if you change anything here.
// Real tails via the regularized incomplete beta function (no approximations
// beyond float64). ES module: used by the browser app and by node tests.

export const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;

export function sd(a) { // sample standard deviation (n−1)
  if (a.length < 2) return NaN;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}

// ── Special functions ─────────────────────────────────────────────
// Lanczos log-gamma (g=7, n=9), standard coefficients.
const LG = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];
export function logGamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = LG[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LG[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// Continued fraction for the incomplete beta (Lentz's method).
function betacf(a, b, x) {
  const EPS = 3e-14, FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

// Regularized incomplete beta I_x(a,b).
export function ibeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}

// Two-sided p-value for a t statistic.
export function tTwoSidedP(t, df) {
  if (!isFinite(t) || df <= 0) return NaN;
  return ibeta(df / 2, 0.5, df / (df + t * t));
}

// Two-sided critical t (quantile) via bisection on tTwoSidedP.
export function tCrit(alpha, df) {
  let lo = 0, hi = 150;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (tTwoSidedP(mid, df) > alpha) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ── Summaries & tests ─────────────────────────────────────────────
export function summarize(a) {
  const n = a.length, m = mean(a), s = sd(a);
  const se = s / Math.sqrt(n);
  const half = n > 1 ? tCrit(0.05, n - 1) * se : NaN;
  return { n, mean: m, sd: s, se, ci95: [m - half, m + half] };
}

// Paired t-test (e.g. same seeds, two methods). Cohen's d_z = meanDiff/sd(diff).
export function pairedT(a, b) {
  if (a.length !== b.length || a.length < 2) return null;
  const d = a.map((x, i) => x - b[i]);
  const md = mean(d), sdd = sd(d), n = d.length;
  if (sdd === 0) return { t: md === 0 ? 0 : Infinity, df: n - 1, p: md === 0 ? 1 : 0, dz: NaN, meanDiff: md, n };
  const t = md / (sdd / Math.sqrt(n));
  return { t, df: n - 1, p: tTwoSidedP(t, n - 1), dz: md / sdd, meanDiff: md, n };
}

// Welch's t-test (unequal n / variance; unpaired runs).
export function welchT(a, b) {
  if (a.length < 2 || b.length < 2) return null;
  const ma = mean(a), mb = mean(b);
  const va = sd(a) ** 2, vb = sd(b) ** 2;
  const na = a.length, nb = b.length;
  const se2 = va / na + vb / nb;
  if (se2 === 0) return { t: ma === mb ? 0 : Infinity, df: na + nb - 2, p: ma === mb ? 1 : 0, d: NaN, meanDiff: ma - mb };
  const t = (ma - mb) / Math.sqrt(se2);
  const df = se2 ** 2 / ((va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1));
  const sp = Math.sqrt(((na - 1) * va + (nb - 1) * vb) / (na + nb - 2)); // pooled sd for Cohen's d
  return { t, df, p: tTwoSidedP(t, df), d: sp === 0 ? NaN : (ma - mb) / sp, meanDiff: ma - mb };
}

// ── Bootstrap (deterministic, seeded) ─────────────────────────────
export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Percentile bootstrap CI for the mean. Deterministic for a given seed.
export function bootMeanCI(a, { iters = 2000, seed = 42, level = 0.95 } = {}) {
  if (a.length < 2) return null;
  const rnd = mulberry32(seed), n = a.length, means = new Array(iters);
  for (let i = 0; i < iters; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += a[(rnd() * n) | 0];
    means[i] = s / n;
  }
  means.sort((x, y) => x - y);
  const lo = means[Math.floor(((1 - level) / 2) * iters)];
  const hi = means[Math.ceil((1 - (1 - level) / 2) * iters) - 1];
  return [lo, hi];
}
