import {loadPair, run, summary, groupBy, PAIRS} from './bt.mjs';
import fs from 'node:fs';
const D = {}; for (const n of PAIRS) { const P = loadPair(n); if (P) D[n] = P; }
console.log('pairs', Object.keys(D).length);
const V = JSON.parse(process.argv[3] || '[{"label":"AI AUTO v1.13 niyam (TP 0.25 / SL 1.50)"}]');
const out = {};
for (const v of V) { const t = Date.now(); const tr = run(D, v); out[v.label] = tr; console.log(JSON.stringify(summary(tr, v.label)), (Date.now()-t)/1000+'s'); }
fs.writeFileSync('/tmp/fxbt/last.json', JSON.stringify(out));
