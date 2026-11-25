import { loadM1, run, summary } from './sim.mjs';
const M = loadM1(process.argv[2] || 'XAUUSDm_M1.csv.gz');
const deep = { fromLv: 8, lot: 0.2, D: 2, max: 2, bgap: 2, tp: 15, hard: 4000 };
const V = [['v1.04 abhi', {}], ['A) session ke bahar max 8 level', { outLvCap: 8 }], ['B) shuru tab jab 30 min range < $5', { startRange: 5 }], ['C) shuru tab jab 30 min range < $3', { startRange: 3 }],
  ['D) A + B', { outLvCap: 8, startRange: 5 }], ['E) deep bounce (Step 1)', { deep }], ['F) deep + A + B', { deep, outLvCap: 8, startRange: 5 }]];
for (const [n, v] of V) { const r = ['auto', 'olhc', 'ohlc'].map(path => summary(run(M, { restart: true, ...v, path }), { balance: 10000 }, M));
  console.log(n.padEnd(36), 'net', r.map(x => x.net).join(' / '), '| khatam', r.map(x => x.blowups).join('/'), '| DD%', r.map(x => x.maxDDpct).join('/'), '| baskets', r[0].baskets); }
