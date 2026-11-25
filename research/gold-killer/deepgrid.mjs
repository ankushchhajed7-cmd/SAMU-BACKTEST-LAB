import { loadM1, run, summary } from './sim.mjs';
const M = loadM1('process.argv[2] || 'XAUUSDm_M1.csv.gz'');
const rows = [];
for (const fromLv of [6, 8, 10]) for (const lot of [0.2, 0.5]) for (const D of [1.0, 2.0]) for (const tp of [5, 15]) for (const hard of [2000, 4000]) {
  const cfg = { restart: true, deep: { fromLv, lot, D, max: 2, bgap: 2, tp, hard } };
  const res = ['auto', 'olhc', 'ohlc'].map(path => summary(run(M, { ...cfg, path }), { balance: 10000 }, M));
  rows.push({ k: `L${fromLv} lot${lot} D${D} tp${tp} hard${hard}`, nets: res.map(r => r.net), blows: res.reduce((x, r) => x + r.blowups, 0), dd: res.map(r => r.maxDDpct), hard: res.map(r => r.hard), deep: res.map(r => r.deepTP) });
}
rows.sort((a, b) => Math.min(...b.nets) - Math.min(...a.nets));
for (const r of rows.slice(0, 12)) console.log(r.k.padEnd(30), 'net', r.nets.join(' / '), '| khatam', r.blows, '| DD%', r.dd.join('/'), '| hard', r.hard.join('/'), '| deepTP', r.deep.join('/'));
console.log('... sabse bure:'); for (const r of rows.slice(-3)) console.log(r.k.padEnd(30), 'net', r.nets.join(' / '), '| khatam', r.blows);
