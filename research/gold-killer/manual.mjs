// Owner idea 25 Nov: manual START (calm check) + max 2 TP per START + session khatam par profit me ho to sab band
import { loadM1, run, summary } from './sim.mjs';
const M = loadM1(process.argv[2] || 'XAUUSDm_M1.csv.gz');
const S9 = [[540, 600], [1350, 1410]]; // 09:00-10:00 + 22:30-23:30 IST
const V = [
  ['v1.04 abhi', {}],
  ['1) max 2 TP har START', { maxCyc: 2 }],
  ['2) session khatam: profit>=$0 band', { endClose: 0 }],
  ['3) 1+2', { maxCyc: 2, endClose: 0 }],
  ['4) 1+2, profit>=$3 band', { maxCyc: 2, endClose: 3 }],
  ['5) 1+2 + calm START (60m<$5)', { maxCyc: 2, endClose: 0, armCalm: 5 }],
  ['6) 1+2 + calm START (60m<$8)', { maxCyc: 2, endClose: 0, armCalm: 8 }],
  ['7) 5 + nayi basket 30m<$5', { maxCyc: 2, endClose: 0, armCalm: 5, startRange: 5 }],
  ['8) 3 + window 1 ghanta', { maxCyc: 2, endClose: 0, sessions: S9 }],
  ['9) 8 + calm START 60m<$5', { maxCyc: 2, endClose: 0, sessions: S9, armCalm: 5 }],
];
for (const [n, v] of V) { const r = ['auto', 'olhc', 'ohlc'].map(path => summary(run(M, { restart: true, ...v, path }), { balance: 10000 }, M));
  console.log(n.padEnd(34), 'net', r.map(x => x.net).join(' / '), '| khatam', r.map(x => x.blowups).join('/'), r[1].blowDates.join(','), '| DD%', r.map(x => x.maxDDpct).join('/'), '| baskets', r[0].baskets, 'END', r[0].endCloses, '| worst', r.map(x=>x.worstBasket).join('/')); }
