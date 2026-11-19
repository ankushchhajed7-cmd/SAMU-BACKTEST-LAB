import {loadPair, run, summary, groupBy, PAIRS} from './bt.mjs';
const D = {}; for (const n of PAIRS) { const P = loadPair(n); if (P) D[n] = P; }
// avg spread $ per 0.01 lot
const DEF={JPY:1/155,CHF:1/0.80,CAD:1/1.38,GBP:1.31,EUR:1.10,AUD:0.66,NZD:0.58,USD:1};
const sp = {}; for (const n of PAIRS){ const P=D[n]; let s=0; for(let i=0;i<P.size;i++) s+=P.s[i]; sp[n]=+(s/P.size*P.pt*1000*DEF[n.slice(3)]).toFixed(3); }
console.log('spread $/0.01lot', JSON.stringify(sp));
const cfg = JSON.parse(process.argv[3]||'{}');
const tr = run(D, Object.assign({windows:false,maxLoss:0,target:0,curBlock:false}, cfg));
console.log('ALL', JSON.stringify(summary(tr)));
console.log('PAIR'); for (const g of groupBy(tr, x=>x.n)) console.log(g.k, g.trades, g.win+'%', g.net, 'spr', sp[g.k]);
console.log('HOUR IST'); for (const g of groupBy(tr, x=>Math.floor(((x.at+19800)%86400)/3600)).sort((a,b)=>a.k-b.k)) console.log(g.k, g.trades, g.win+'%', g.net);
console.log('MONTH'); for (const g of groupBy(tr, x=>new Date(x.ct*1000).toISOString().slice(0,7)).sort((a,b)=>a.k<b.k?-1:1)) console.log(g.k, g.trades, g.win+'%', g.net);
console.log('FIB'); for (const g of groupBy(tr, x=>x.fib)) console.log(g.k, g.trades, g.win+'%', g.net);
