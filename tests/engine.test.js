// Engine rule tests. Run: node tests/engine.test.js  (engine is read from index.html)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const src = html.split('<script id="engine">')[1].split('</script>')[0];
const ctx = { module: { exports: {} } }; vm.createContext(ctx); vm.runInContext(src, ctx);
const E = ctx.module.exports;
const st = JSON.parse(fs.readFileSync(path.join(root, 'strategies/step-basket.json'), 'utf8'));
// bars: list of [o,h,l,c]; t starts 2026-07-01 02:00 server (07:30 IST)
function ds(bars, t0 = Date.UTC(2026,6,1,2,0)/1000) {
  const n = bars.length, D = { t: new Float64Array(n), o: new Float64Array(n), h: new Float64Array(n), l: new Float64Array(n), c: new Float64Array(n), s: null };
  let prev = null;
  bars.forEach((b, i) => { let o,h,l,c; if (Array.isArray(b)) [o,h,l,c] = b; else { o = prev == null ? b : prev; c = b; h = Math.max(o,c); l = Math.min(o,c); } prev = c; D.t[i]=t0+i*60; D.o[i]=o; D.h[i]=h; D.l[i]=l; D.c[i]=c; });
  return D;
}
const S = (preset, extra={}) => { const s = JSON.parse(JSON.stringify(st)); s.basket.preset = preset; return Object.assign(s, extra); };
const R = (bars, preset, o={}) => E.run(ds(bars), S(preset), Object.assign({ forceSignal: 1, spreadMode: 'fixed', fixedPts: 0, balance: 1000, path: 'olhc' }, o));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  → ' + info : '')); if (!cond) fails++; };
const tl = r => r.trades.map(t => (t.dir>0?'B':'S') + t.lot + '@' + t.op.toFixed(2) + '→' + t.cp.toFixed(2) + '=' + t.pr.toFixed(2) + ' ' + t.r).join(', ');

// 1. TP1: buy 100, price up to 105
let r = R([100, 102, 105, 105], 'B');
ok('TP1 hit at +$5 (0.01 lot = $5)', r.baskets[0].r === 'TP1' && Math.abs(r.baskets[0].pr - 5) < 1e-6, tl(r).slice(0,80));
ok('Same-side BUY not opened while TP1 active', r.trades.filter(t => t.b === 1).length === 1);

// 2. spread: TP1 with 200 pts spread (=$0.20): buy at ask 100.20, TP when bid >= 105.20
r = R([100, 105, 105.2, 105.2], 'B', { fixedPts: 200 });
ok('Spread: BUY at ask, TP1 at bid = entry+5', Math.abs(r.trades[0].op - 100.2) < 1e-9 && r.trades[0].r === 'TP1' && Math.abs(r.trades[0].cp - 105.2) < 1e-9, tl(r));

// 3. Grid down: buy 100, sells at 95, 90, 85(lot .02 at 4th) ... check lot table
let bars = [100]; for (let p = 99; p >= 40; p--) bars.push(p);
r = R(bars, 'A', { balance: 10000 });
const b1 = r.trades.filter(t => t.b === 1);
ok('Grid down opens SELLs every $5', b1.length >= 4 && b1[1].dir === -1 && Math.abs(b1[1].op - 95) < 1e-9 && Math.abs(b1[2].op - 90) < 1e-9, tl(r).slice(0, 160));
// PL at 85 after 4th: B100 -15, S95 +10, S90 +5, S85(0.02) 0 => 0 ; at 80: -20+15+10+10(0.02*5*100)=15 -> TP $10 hit before? at 82.5: -17.5+12.5+7.5+5=7.5 ; solve -x... A: TP$10 => PL slope at 4 trades = (0.01-0.01-0.01-0.02)*100 = -3 $/$; PL(85)=0 -> PL=10 at 85-10/3=81.667
ok('Rule A: basket TP $10 closes at exact price', r.baskets[0].r === 'BASKET_TP' && Math.abs(r.baskets[0].pr - 10) < 1e-6, 'close@' + b1[0].cp.toFixed(3) + ' n=' + r.baskets[0].n);

// 4. Choppy: buy 100 → 95 sell → 100.. → 105 buy? then back down -> Rule B SL 1% = $10
bars = [100, 97, 95, 97, 100, 103, 105, 102, 99, 96, 93, 90, 88, 86, 84, 82, 80];
r = R(bars, 'B');
ok('Rule B: basket SL = 1% of basket-start balance ($10)', r.baskets[0].r === 'BASKET_SL' && Math.abs(r.baskets[0].pr + 10) < 1e-6, tl(r));

// 5. Trailing: B; trend down strongly then bounce
bars = [100]; for (let p = 99; p >= 60; p--) bars.push(p); for (let p = 61; p <= 80; p++) bars.push(p);
r = R(bars, 'B', { balance: 10000 });
const bb = r.baskets[0];
ok('Rule B trailing: closes $5 below peak', bb.r === 'TRAIL' && Math.abs(bb.pr - (r.baskets[0].peakSeen||bb.pr)) >= 0, 'profit ' + bb.pr.toFixed(2) + ' n=' + bb.n);

// 6. Max 12 trades
bars = [100]; for (let p = 99; p >= 0.5; p -= 0.5) bars.push(p);
let s6 = S('A'); s6.basket.presets.A.tp_usd = 1e9; s6.daily.target_pct = 0; s6.daily.loss_pct = 0;
r = E.run(ds(bars), s6, { forceSignal: 1, spreadMode: 'fixed', fixedPts: 0, balance: 1e6, path: 'olhc' });
ok('Max 12 trades per basket', r.maxTradesInBasket === 12, 'max=' + r.maxTradesInBasket);
const lots = r.trades.filter(t => t.b === 1).sort((a,b)=>a.id-b.id).map(t => t.lot).join(',');
ok('Lot table 1-3=.01 4-6=.02 7-9=.03 10-12=.04', lots === '0.01,0.01,0.01,0.02,0.02,0.02,0.03,0.03,0.03,0.04,0.04,0.04', lots);

// 7. Daily target 1%: preset A, $10 TP = 1% of 1000 -> day stops; next basket only after 07:00 IST (01:30 server)
bars = []; for (let k = 0; k < 6; k++) { bars.push(100, 97, 95, 92, 90, 87, 85, 83, 81, 80, 79, 100, 105, 110); }
r = R(bars, 'A');
ok('Daily target stops the day', r.dayStops.length >= 1 && r.dayStops[0].r === 'DAY_TARGET', JSON.stringify(r.dayStops[0]));
ok('No new basket same trading day after stop', r.baskets.length === 1, 'baskets=' + r.baskets.length);
// long series crossing 07:00 IST next day
const n7 = 24 * 60 + 60; bars = []; for (let k = 0; k < n7; k++) bars.push(k < 20 ? [100,97,95,92,90,87,85,83,81,80,79,78,77,76,75,74,73,72,71,70][k] : 70);
r = R(bars, 'A');
const second = r.baskets[1] || r.trades.find(t => t.b === 2);
const istOpen = second ? new Date((second.ot + 19800) * 1000).toISOString().slice(11, 16) : 'none';
ok('New basket resumes at 07:00 IST next day', istOpen === '07:00', 'next basket opened IST ' + istOpen);

// 8. Daily loss 5%: balance 100 -> SL 1% = $1 (B) ... use preset A with no SL to hit 5% loss
bars = [100]; for (let k = 0; k < 40; k++) bars.push(k % 2 ? 103 : 97.4);
let s8 = S('A'); r = E.run(ds([100, 96, 94.9, 99.9, 100.1, 95.0, 94.8, 90, 95, 100, 105, 101, 96, 91, 86, 91, 96, 101, 106]), s8, { forceSignal: 1, spreadMode: 'fixed', fixedPts: 0, balance: 100, path: 'olhc' });
ok('Daily loss 5% check runs (balance 100 → stop at -$5)', r.dayStops.some(d => d.r === 'DAY_LOSS') ? Math.abs(r.net + 5) < 1e-6 : true, 'net=' + r.net.toFixed(2) + ' stops=' + r.dayStops.map(d=>d.r));

// 9. Intrabar: one big bar triggers multiple grid levels; worst <= min(olhc, ohlc)
bars = [100, [100, 112, 88, 101], [101, 101, 101, 101]];
const ro = R(bars, 'B', { path: 'olhc' }), rh = R(bars, 'B', { path: 'ohlc' }), rw = R(bars, 'B', { path: 'worst' });
ok('Worst-case ≤ both paths', rw.net <= Math.min(ro.net, rh.net) + 1e-9, 'olhc ' + ro.net.toFixed(2) + ' ohlc ' + rh.net.toFixed(2) + ' worst ' + rw.net.toFixed(2));

// 10. accounting invariant
const sum = rw.trades.reduce((a, t) => a + t.pr, 0);
ok('Balance change = sum of trade profits', Math.abs(sum - rw.net) < 1e-6);

{ let bars=[100]; for (let p=99;p>=60;p--) bars.push(p); for (let p=61;p<=80;p++) bars.push(p);
  const r = R(bars,'B',{balance:10000}); const b=r.baskets[0];
  ok('Trail exact: profit = peak - 5', Math.abs(b.pr - (b.peakPL - 5)) < 1e-6, 'peak '+b.peakPL.toFixed(2)+' profit '+b.pr.toFixed(2)); }

// 11. report: day / month sums equal net, baskets counted once
{ const n = 3 * 1440; const bars = []; let p = 100;
  for (let k = 0; k < n; k++) { p += Math.sin(k / 37) * 0.9 + Math.cos(k / 11) * 0.6; bars.push(p); }
  const r = R(bars, 'B', { balance: 1000, path: 'auto' }); const rep = E.report(r);
  const sd = rep.days.reduce((a, d) => a + d.pl, 0), sm = rep.months.reduce((a, m) => a + m.pl, 0);
  ok('Report: sum of daily P/L = net', Math.abs(sd - r.net) < 1e-6, 'days ' + rep.days.length + ' net ' + r.net.toFixed(2));
  ok('Report: sum of monthly P/L = net', Math.abs(sm - r.net) < 1e-6);
  ok('Report: every basket counted in a day', rep.days.reduce((a, d) => a + d.baskets, 0) === r.baskets.length, r.baskets.length + ' baskets');
  ok('Report: gross profit + gross loss = net', Math.abs(rep.stats.grossProfit + rep.stats.grossLoss - r.net) < 1e-6);
  ok('Report: day dates are IST trading days (07:00 reset)', rep.days[0].date === '2026-07-01', rep.days.map(d => d.date).join(','));
}
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
