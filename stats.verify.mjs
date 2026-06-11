// Dependency-free verification of stats.js against textbook values.
// Run: node stats.verify.mjs  (also wired as `npm test` if a package.json exists)
import * as S from './stats.js';

let fails = 0;
const ok = (name, got, want, tol = 1e-4) => {
  const pass = Math.abs(got - want) <= tol;
  if (!pass) fails++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}: got ${got}, want ${want} ±${tol}`);
};

// mean / sample sd — classic example set {2,4,4,4,5,5,7,9}
const a8 = [2, 4, 4, 4, 5, 5, 7, 9];
ok('mean', S.mean(a8), 5, 1e-12);
ok('sample sd', S.sd(a8), Math.sqrt(32 / 7), 1e-12); // 2.13809…

// t distribution — textbook two-sided critical values
ok('p(t=2.776, df=4) ≈ .05', S.tTwoSidedP(2.776, 4), 0.05, 5e-4);
ok('p(t=2.262, df=9) ≈ .05', S.tTwoSidedP(2.262, 9), 0.05, 5e-4);
ok('p(t=1.0, df=3)', S.tTwoSidedP(1.0, 3), 0.3910, 5e-4);
ok('p(t=1.96, df=1e6) ≈ z', S.tTwoSidedP(1.96, 1e6), 0.05, 5e-4);
ok('tCrit(.05, 4)', S.tCrit(0.05, 4), 2.776, 5e-3);
ok('tCrit(.01, 10)', S.tCrit(0.01, 10), 3.169, 5e-3);

// paired t — hand-computable case: diffs [1,1,1,-1] → t=1, df=3, dz=.5
const pt = S.pairedT([2, 4, 6, 8], [1, 3, 5, 9]);
ok('pairedT t', pt.t, 1, 1e-12);
ok('pairedT df', pt.df, 3, 0);
ok('pairedT p', pt.p, 0.3910, 5e-4);
ok('pairedT dz', pt.dz, 0.5, 1e-12);

// Welch — hand-computed exact: a=[1,2,3] (mean 2, var 1), b=[2,4,6] (mean 4, var 4)
// t = −2/√(1/3+4/3) = −2√(3/5) = −1.549193, df = (5/3)²/((1/9)/2+(16/9)/2) = 50/17
const wt = S.welchT([1, 2, 3], [2, 4, 6]);
ok('welch t', wt.t, -2 * Math.sqrt(3 / 5), 1e-12);
ok('welch df', wt.df, 50 / 17, 1e-9);

// summarize CI uses t-based half-width: n=4, sd=1 → half = 3.182*0.5 = 1.591
const sm = S.summarize([1, 2, 3, 4].map(x => x + 0)); // sd = 1.2910
ok('summarize n', sm.n, 4, 0);
ok('summarize ci half-width', (sm.ci95[1] - sm.ci95[0]) / 2, 3.182 * (S.sd([1, 2, 3, 4]) / 2), 5e-3);

// bootstrap — deterministic and brackets the mean
const ci1 = S.bootMeanCI([5, 6, 7, 8, 9, 10], { seed: 7 });
const ci2 = S.bootMeanCI([5, 6, 7, 8, 9, 10], { seed: 7 });
ok('boot deterministic lo', ci1[0], ci2[0], 0);
ok('boot deterministic hi', ci1[1], ci2[1], 0);
const inCI = ci1[0] <= 7.5 && 7.5 <= ci1[1];
console.log(`${inCI ? 'ok  ' : 'FAIL'} boot CI brackets mean: [${ci1[0].toFixed(3)}, ${ci1[1].toFixed(3)}] ∋ 7.5`);
if (!inCI) fails++;

console.log(fails ? `\n${fails} FAILURE(S)` : '\nall checks pass');
process.exit(fails ? 1 : 0);
