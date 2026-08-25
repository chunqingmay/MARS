"use strict";

/**
 * 统计分析工具
 *  - 均值 / 样本标准差 / 均值±标准差 格式化
 *  - 配对 t 检验(p < 0.05 认为显著),t 分布双侧 p 值用不完全 Beta 函数计算
 */

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function formatMeanStd(values, digits = 2) {
  return `${mean(values).toFixed(digits)} ± ${std(values).toFixed(digits)}`;
}

function formatP(value) {
  if (!Number.isFinite(value)) return "—";
  if (value < 0.001) return "<0.001";
  return value.toFixed(3);
}

// ---------------------------------------------------------------------------
// 不完全 Beta 函数 / 学生 t 分布(数值食谱算法)
// ---------------------------------------------------------------------------

function lgamma(x) {
  const coefficients = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let series = 1.000000000190015;
  for (let index = 0; index < 6; index += 1) {
    series += coefficients[index] / ++y;
  }
  return -tmp + Math.log((2.5066282746310005 * series) / x);
}

function betacf(a, b, x) {
  const MAX_ITERATIONS = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= MAX_ITERATIONS; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < EPS) break;
  }
  return h;
}

function betai(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lnbt =
    lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x);
  const bt = Math.exp(lnbt);
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** t 分布双侧 p 值: t ~ t(df) 时 Pr(|T| > |t|) */
function studentsTPvalue(t, df) {
  if (!Number.isFinite(t)) return t > 0 ? 0 : 1;
  const x = df / (df + t * t);
  return betai(df / 2, 0.5, x);
}

/** 用二分法求 t 分布 95% 双侧临界值 t_crit(df),即 Pr(|T| > t_crit) = 0.05 */
function tCritical95(df) {
  if (!Number.isFinite(df) || df < 1) return NaN;
  let lo = 0;
  let hi = 100;
  while (studentsTPvalue(hi, df) > 0.05) hi *= 2;
  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2;
    if (studentsTPvalue(mid, df) > 0.05) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * 配对 t 检验。a、b 为同轮次配对的测量数组。
 * 返回 { t, df, p, significant, meanDiff, ci95 }
 * ci95 为 meanDiff 的 95% 置信区间 [lower, upper]。
 */
function pairedTTest(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 2) {
    return { t: NaN, df: n - 1, p: NaN, significant: false, meanDiff: NaN, ci95: [NaN, NaN] };
  }
  const diffs = a.slice(0, n).map((value, index) => value - b[index]);
  const meanDiff = mean(diffs);
  const sd = std(diffs);
  const se = sd / Math.sqrt(n);
  const t = sd === 0 ? (meanDiff === 0 ? 0 : Infinity) : meanDiff / se;
  const df = n - 1;
  const p = studentsTPvalue(Math.abs(t), df);
  const tCrit = tCritical95(df);
  const ci95 = [meanDiff - tCrit * se, meanDiff + tCrit * se];
  return { t, df, p, significant: p < 0.05, meanDiff, ci95 };
}

module.exports = {
  mean,
  std,
  formatMeanStd,
  formatP,
  pairedTTest,
};
