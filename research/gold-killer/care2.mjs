import { loadM1, run, summary } from './sim.mjs';
const M = loadM1(process.argv[2] || 'XAUUSDm_M1.csv.gz');
const deep = { fromLv: 8, lot: 0.2, D: 2, max: 2, bgap: 2, tp: 15, hard: 4000 };
const V = [];
for (const r of [4, 5, 6, 7, 8]) V.push([`B range<$${r}`, { startRange: r }]);
for (const r of [5, 6, 7]) V.push([`B range<$${r} + deep`, { startRange: r, deep }]);
V.push(['B range<$5 (60 min)', { startRange: 5, startMin: 60 }]);
for (const [n, v] of V) { const r = ['auto', 'olhc', 'ohlc'].map(path => summary(run(M, { restart: true, ...v, path }), { balance: 10000 }, M));
  console.log(n.padEnd(26), 'net', r.map(x => x.net).join(' / '), '| khatam', r.map(x => x.blowups).join('/'), '| DD%', r.map(x => x.maxDDpct).join('/'), '| baskets', r[0].baskets, '| months', JSON.stringify(r[0].months)); }
