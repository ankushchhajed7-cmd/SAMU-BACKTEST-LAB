// SAMU GOLD KILLER COMMAND app ke liye itihaas: har din, har 30-min IST slot par ek manual START (60 min window,
// max 2 TP, window ke baad profit >= $1 par band, deep bounce) chala ke nateeja + agle 60 min ka gold move.
// node history.mjs XAUUSDm_M1.csv.gz out.json
import { loadM1, run } from './sim.mjs';
import { writeFileSync } from 'node:fs';
const M = loadM1(process.argv[2] || 'XAUUSDm_M1.csv.gz');
const out = process.argv[3] || 'history.json';
const ist = t => Math.floor((t + 19800) / 60) % 1440;
const deep = { fromLv: 8, lot: 0.2, D: 2, max: 2, bgap: 2, tp: 15, hard: 4000 };
const regime = r => r < 5 ? 'calm' : r < 10 ? 'normal' : 'fast';
const slots = {};
const rows = [];
for (let i = 60; i < M.n - 120; i++) {
  const m = ist(M.t[i]);
  if (m % 30 !== 0) continue;
  if (M.t[i] - M.t[i - 30] > 40 * 60) continue;            // weekend/gap ke turant baad nahi
  let hi = -1e9, lo = 1e9; for (let j = i - 30; j < i; j++) { hi = Math.max(hi, M.h[j]); lo = Math.min(lo, M.l[j]); }
  const prev30 = hi - lo;
  let h6 = -1e9, l6 = 1e9; for (let j = i; j < Math.min(M.n, i + 60); j++) { h6 = Math.max(h6, M.h[j]); l6 = Math.min(l6, M.l[j]); }
  const next60 = h6 - l6;
  // slice: 30 bar pehle se 23.5 ghante tak
  let e = i; while (e < M.n && M.t[e] - M.t[i] < 23.5 * 3600) e++;
  const S = {}; for (const k of ['t', 'o', 'h', 'l', 'c', 's']) S[k] = M[k].slice(i - 30, e); S.n = S.t.length;
  const r = run(S, { sessions: [[m, (m + 60) % 1440]], maxCyc: 2, endClose: 1, deep, path: 'auto' });
  const pl = r.pnl + r.openPL;
  const maxLv = Math.max(0, ...r.baskets.map(x => x.n), ...['open'].map(() => 0));
  const tps = r.baskets.filter(x => x.why === 'TP').length;
  rows.push({ m, prev30, next60, pl, maxLv, tps, dd: r.maxDD });
}
function agg(a) {
  if (!a.length) return null;
  const s = k => a.map(x => x[k]).sort((p, q) => p - q), q = (v, p) => v[Math.floor(p * (v.length - 1))];
  const n60 = s('next60');
  return { n: a.length, plAvg: +(a.reduce((x, y) => x + y.pl, 0) / a.length).toFixed(1), plWorst: +Math.min(...a.map(x => x.pl)).toFixed(0),
    win: Math.round(a.filter(x => x.pl > 0).length / a.length * 100), tp2: Math.round(a.filter(x => x.tps >= 2).length / a.length * 100),
    deep8: Math.round(a.filter(x => x.maxLv >= 8).length / a.length * 100), ddP90: +q(s('dd'), 0.9).toFixed(0),
    mv50: +q(n60, 0.5).toFixed(1), mv90: +q(n60, 0.9).toFixed(1), big15: Math.round(a.filter(x => x.next60 >= 15).length / a.length * 100), big25: Math.round(a.filter(x => x.next60 >= 25).length / a.length * 100) };
}
for (let m = 0; m < 1440; m += 30) {
  const a = rows.filter(x => x.m === m);
  const o = { all: agg(a) };
  for (const g of ['calm', 'normal', 'fast']) o[g] = agg(a.filter(x => regime(x.prev30) === g));
  slots[String(m)] = o;
}
const days = (M.t[M.n - 1] - M.t[0]) / 86400;
const res = { v: 1, made: new Date().toISOString().slice(0, 10), source: 'Exness XAUUSDm M1, ' + new Date(M.t[0] * 1000).toISOString().slice(0, 10) + ' se ' + new Date(M.t[M.n - 1] * 1000).toISOString().slice(0, 10) + ' (' + Math.round(days) + ' din)',
  rule: 'START 60 min, max 2 TP, window ke baad profit >= $1 par band, deep bounce L8 (0.20 lot, $15 TP, $4000 hard), lot 0.01 x1.3, $30 TP, $10k', regime: 'pichhle 30 min ka range: calm < $5, normal $5-10, fast > $10', slots };
writeFileSync(out, JSON.stringify(res));
console.log('rows', rows.length, 'file', out);
for (const m of [540, 570, 600, 1350, 1380, 1110, 1140]) console.log(String(m / 60).padEnd(5), JSON.stringify(slots[m]));
