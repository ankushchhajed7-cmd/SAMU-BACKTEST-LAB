import { loadM1, run, summary } from './sim.mjs';
const M = loadM1(process.argv[2] || 'XAUUSDm_M1.csv.gz');
// distribution of past-60/30 min range at session start
const ist = t => Math.floor((t + 19800) / 60) % 1440; const r60 = [], r30 = [];
for (let i = 60; i < M.n; i++) { const m = ist(M.t[i]); if (m === 540 || m === 1350) { let hi=-1e9, lo=1e9, h3=-1e9, l3=1e9; for (let j = i-60; j < i; j++) { hi=Math.max(hi,M.h[j]); lo=Math.min(lo,M.l[j]); if (j>=i-30){h3=Math.max(h3,M.h[j]); l3=Math.min(l3,M.l[j]);} } r60.push(hi-lo); r30.push(h3-l3); } }
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))].toFixed(1); };
console.log('session starts', r60.length, '| 60m range p10/p25/p50/p75', [.1,.25,.5,.75].map(p=>q(r60,p)).join('/'), '| 30m', [.1,.25,.5,.75].map(p=>q(r30,p)).join('/'));
const V = [
  ['3) 2 TP + end close', { maxCyc: 2, endClose: 0 }],
  ['B) sirf 30m<$5 (pichhla test)', { startRange: 5 }],
  ['10) 3 + 30m<$5', { maxCyc: 2, endClose: 0, startRange: 5 }],
  ['11) 3 + 30m<$6', { maxCyc: 2, endClose: 0, startRange: 6 }],
  ['12) 3 + START 60m<$12', { maxCyc: 2, endClose: 0, armCalm: 12 }],
  ['13) 3 + START 60m<$15', { maxCyc: 2, endClose: 0, armCalm: 15 }],
  ['14) 3 + START 60m<$12 + 30m<$5', { maxCyc: 2, endClose: 0, armCalm: 12, startRange: 5 }],
  ['15) 10 + deep bounce', { maxCyc: 2, endClose: 0, startRange: 5, deep: { fromLv: 8, lot: 0.2, D: 2, max: 2, bgap: 2, tp: 15, hard: 4000 } }],
];
for (const [n, v] of V) { const r = ['auto', 'olhc', 'ohlc'].map(path => summary(run(M, { restart: true, ...v, path }), { balance: 10000 }, M));
  console.log(n.padEnd(32), 'net', r.map(x => x.net).join(' / '), '| khatam', r.map(x => x.blowups).join('/'), r.map(x=>x.blowDates.join(',')).join(' ; '), '| DD%', r.map(x => x.maxDDpct).join('/'), '| baskets', r[0].baskets, 'END', r[0].endCloses, '| months', JSON.stringify(r[1].months)); }
