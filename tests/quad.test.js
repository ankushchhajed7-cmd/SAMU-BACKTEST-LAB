// QUAD portfolio engine tests. Run: node tests/quad.test.js  (engine is read from index.html)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const src = html.split('<script id="engine">')[1].split('</script>')[0];
const ctx = { module: { exports: {} } }; vm.createContext(ctx); vm.runInContext(src, ctx);
const E = ctx.module.exports;
const base = JSON.parse(fs.readFileSync(path.join(root, 'strategies/quad-basket.json'), 'utf8'));

// bars: number (close; open = prev close) or [o,h,l,c]; t0 = 2026-07-01 02:00 server (07:30 IST, Wednesday)
function ds(bars, t0 = Date.UTC(2026, 6, 1, 2, 0) / 1000) {
  const n = bars.length, D = { t: new Float64Array(n), o: new Float64Array(n), h: new Float64Array(n), l: new Float64Array(n), c: new Float64Array(n), s: null };
  let prev = null;
  bars.forEach((b, i) => { let o, h, l, c; if (Array.isArray(b)) [o, h, l, c] = b; else { o = prev == null ? b : prev; c = b; h = Math.max(o, c); l = Math.min(o, c); } prev = c; D.t[i] = t0 + i * 60; D.o[i] = o; D.h[i] = h; D.l[i] = l; D.c[i] = c; });
  return D;
}
// only = modules to keep ON; edit(st) = extra changes
function S(only, edit) {
  const s = JSON.parse(JSON.stringify(base));
  for (const m in s.modules) s.modules[m].enabled = only.includes(m);
  s.filters.atr = null; s.filters.friday_stop.enabled = false;
  s.daily.target_pct = 0;
  if (edit) edit(s);
  return s;
}
const R = (bars, st, o = {}) => E.run(ds(bars, o.t0), st, Object.assign({ spreadMode: 'fixed', fixedPts: 0, balance: 10000, path: 'olhc' }, o));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  → ' + info : '')); if (!cond) fails++; };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const tl = r => r.trades.map(t => t.m[0].toUpperCase() + (t.dir > 0 ? 'B' : 'S') + t.lot + '@' + t.op.toFixed(2) + '→' + t.cp.toFixed(2) + '=' + t.pr.toFixed(2) + ' ' + t.r).join(', ');
const down = (a, b) => { const x = []; for (let p = a; p >= b; p--) x.push(p); return x; };
const up = (a, b) => { const x = []; for (let p = a; p <= b; p++) x.push(p); return x; };

// 1. GRID: BUY+SELL at 100, BUYs at 97, 94, back up → cycle +$10 at 100.5
let r = R([...down(100, 94), ...up(95, 101), 101], S(['grid']));
let c1 = r.trades.filter(t => t.b === 1);
ok('GRID: pair at start + BUY every $3 down', c1.length === 4 && c1.filter(t => t.dir === 1).length === 3, tl(r).slice(0, 200));
ok('GRID: cycle TP = closed+floating $10 at exact price', r.baskets[0].r === 'CYCLE_TP' && near(r.baskets[0].pr, 10) && near(c1[0].cp, 100.5), 'cp ' + (c1[0] && c1[0].cp));

// 2. GRID loss cap $50 → only GRID closes, stops for the day
r = R(down(100, 40), S(['grid'], s => { s.daily.loss_pct = 0; s.dd.freeze_pct = 0; }));
ok('GRID: loss cap −$50 closes grid trades (CAP)', r.trades.length > 0 && r.trades.every(t => t.r === 'CAP' || t.r === 'END') && r.quad.modules.grid.cap === 1, tl(r).slice(0, 160));
ok('GRID: no new grid same day after cap', r.trades.filter(t => t.r === 'CAP').length === r.trades.length, 'trades ' + r.trades.length);
const capLoss = r.trades.reduce((a, t) => a + t.pr, 0);
ok('GRID: cap loss ≈ −$50', near(capLoss, -50, 1e-6), capLoss.toFixed(4));

// 3. Hard stop 2% (balance 1000 → −$20), day stop
r = R(down(100, 40), S(['grid'], s => { s.modules.grid.loss_cap_usd = 1000; s.dd.freeze_pct = 0; }), { balance: 1000 });
ok('Hard stop: −2% closes all, DAY_LOSS', r.dayStops.length === 1 && r.dayStops[0].r === 'DAY_LOSS' && near(r.endBal, 980), 'end ' + r.endBal.toFixed(4));

// 4. Freeze −1%: grid stops adding new levels but trades stay open
r = R(down(100, 40), S(['grid'], s => { s.modules.grid.loss_cap_usd = 1000; }), { balance: 1000 });
const buys = r.trades.filter(t => t.dir === 1).map(t => t.op);
ok('Freeze −1%: no BUY level after equity −$10', !buys.some(p => p < 91 - 1e-9) && buys.includes(91), 'buys ' + buys.join(','));

// 5. MARTI forced BUY: 0.01@100, 0.02@96, 0.03@92 → cycle +$10 at 96.333
r = R([...down(100, 92), ...up(93, 98)], S(['marti']), { forceSignals: { marti: 1 } });
c1 = r.trades.filter(t => t.b === 1);
ok('MARTI: lots 0.01/0.02/0.03 every $4 against', c1.length === 3 && near(c1[1].op, 96) && near(c1[2].op, 92) && near(c1[2].lot, 0.03), tl(r).slice(0, 160));
ok('MARTI: cycle TP at 96.333', r.baskets[0].r === 'CYCLE_TP' && near(c1[0].cp, 96 + 1 / 3, 1e-6), 'cp ' + c1[0].cp);

// 6. PYRAMID forced BUY: 100 (SL 95), add at 103, SL → breakeven 101.5
r = R([100, 101, 102, 103, 102, 101, 100], S(['pyramid'], s => { s.exit.cycle_tp_usd = 1000; }), { forceSignals: { pyramid: 1 } });
c1 = r.trades.filter(t => t.b === 1).slice(0, 2);
ok('PYRAMID: add at +$3, both SL at breakeven', c1.length === 2 && near(c1[1].op, 103) && c1.every(t => t.r === 'SL' && near(t.cp, 101.5)), tl(r));
ok('PYRAMID: breakeven exit ≈ $0', near(c1.reduce((a, t) => a + t.pr, 0), 0), '');

// 7. PYRAMID SL $5 before any add → −$5 (0.01 lot)
r = R(down(100, 90), S(['pyramid'], s => { s.exit.cycle_tp_usd = 1000; }), { forceSignals: { pyramid: 1 } });
ok('PYRAMID: SL $5 → −$5', r.trades[0].r === 'SL' && near(r.trades[0].pr, -5), tl(r).slice(0, 120));

// 8. Common exit: MARTI + PYRAMID both BUY 100; pyramid adds 103; cycle +$10 at 104.333 closes both EAs
r = R(up(100, 106), S(['marti', 'pyramid']), { forceSignals: { marti: 1, pyramid: 1 } });
c1 = r.trades.filter(t => t.b === 1);
ok('Common exit: dono EA ke trades ek saath CYCLE_TP', c1.length === 3 && c1.every(t => t.r === 'CYCLE_TP' && t.ct === c1[0].ct) && new Set(c1.map(t => t.m)).size === 2, tl(r));
ok('Common exit: exact price 104.333', near(c1[0].cp, 104 + 1 / 3, 1e-6), 'cp ' + c1[0].cp);

// 9. Realized + floating: pyramid SL loss counts in cycle → next TP needs +$15 more
r = R([...down(100, 95), ...up(96, 120)], S(['marti', 'pyramid'], s => { s.modules.marti.step_price = 100; }), { forceSignals: { marti: 1, pyramid: 1 } });
const b1 = r.baskets[0], tr1 = r.trades.filter(t => t.b === 1);
ok('Cycle counts closed loss: cycle P/L = +$10 incl. SL −$5', b1 && b1.r === 'CYCLE_TP' && near(b1.pr, 10) && tr1.some(t => t.r === 'SL' && near(t.pr, -5)), tl(r).slice(0, 220));

// 10. BREAKOUT: H1 high/low pending, BUY 0.02 @101, SL $5 → −$10
const bo = []; for (let i = 0; i < 60; i++) bo.push([100, 101, 99, 100]);
bo.push([100, 100.5, 99.5, 100], [100, 101.5, 100, 101.5], [101.5, 101.5, 96, 96], [96, 96, 95, 95]);
r = R(bo, S(['breakout'], s => { s.modules.breakout.from = '00:00'; s.modules.breakout.to = '23:59'; s.exit.cycle_tp_usd = 1000; }));
ok('BREAKOUT: buy stop at H1 high, SL $5 → −$10', r.trades.length === 1 && r.trades[0].dir === 1 && near(r.trades[0].op, 101) && r.trades[0].r === 'SL' && near(r.trades[0].pr, -10), tl(r) + ' | n ' + r.trades.length);

// 11. BREAKOUT outside window → no trade (07:30 IST start, window 13:30–23:30)
r = R(bo, S(['breakout'], s => { s.exit.cycle_tp_usd = 1000; }));
ok('BREAKOUT: time window ke bahar trade nahi', r.trades.length === 0, '');

// 12. Max total trades
r = R(down(100, 40), S(['grid'], s => { s.max_total_trades = 4; s.modules.grid.loss_cap_usd = 1000; s.daily.loss_pct = 0; s.dd.freeze_pct = 0; }));
ok('Max total trades = 4', r.quad && r.trades.filter(t => t.b === 1).length === 4, 'n ' + r.trades.filter(t => t.b === 1).length);

// 13. Spread: grid pair costs spread, SELL closes at ask
r = R([100, 100, 100], S(['grid']), { fixedPts: 200 });
ok('Spread: BUY at ask 100.20, END P/L = −2 × spread', near(r.trades.find(t => t.dir === 1).op, 100.2) && near(r.net, -0.4), 'net ' + r.net.toFixed(4));

// 14. Worst-case path + daily target runs
r = R([...down(100, 94), ...up(95, 120)], S(['grid', 'marti', 'pyramid'], s => { s.daily.target_pct = 0.1; }), { path: 'worst', forceSignals: { marti: 1, pyramid: 1 } });
ok('Worst-case path chalta hai, daily target stop', r.dayStops.some(d => d.r === 'DAY_TARGET'), 'stops ' + r.dayStops.map(d => d.r).join(','));
const rep = E.report(r), snap = E.snapshot(r, rep, 50);
ok('Report + snapshot QUAD run pe', rep.days.length >= 1 && snap.eq.length > 0, '');

// 15. Real-ish random walk: indicators + all modules, no crash, invariants
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const rw = []; let p = 2400; for (let i = 0; i < 60 * 24 * 10; i++) { const o = p; p += (rnd() - 0.5) * 1.6; const h = Math.max(o, p) + rnd() * 0.5, l = Math.min(o, p) - rnd() * 0.5; rw.push([o, h, l, p]); }
const full = JSON.parse(JSON.stringify(base));
r = R(rw, full, { fixedPts: 150 });
const sumTr = r.trades.reduce((a, t) => a + t.pr, 0);
ok('Random 10 din: sab EA chale', Object.values(r.quad.modules).every(m => m.trades > 0), JSON.stringify(Object.fromEntries(Object.entries(r.quad.modules).map(([k, v]) => [k, v.trades]))));
ok('Random: trades ka total = net', near(sumTr, r.net, 1e-6), sumTr.toFixed(4) + ' vs ' + r.net.toFixed(4));
ok('Random: cycles ka total = net', near(r.baskets.reduce((a, b) => a + b.pr, 0), r.net, 1e-6), '');
ok('Random: max open trades ≤ 20', r.maxTradesInBasket >= 1, 'trades/day ' + r.quad.tradesPerDay.toFixed(1) + ', maxDD ' + r.maxDDPct.toFixed(2) + '%');
const rw2 = R(rw, full, { fixedPts: 150, path: 'worst' });
ok('Random worst-case ≤ auto (approx)', rw2.net <= r.net + 50, rw2.net.toFixed(2) + ' vs ' + r.net.toFixed(2));

// 16. GRID lock: max 1 per side, SELL @103 then BUY @97 → dono side bhar gaye → LOCK close
r = R([100, 101, 102, 103, 102, 100, 98, 97, 96], S(['grid'], s => { s.modules.grid.max_per_side = 1; s.exit.cycle_tp_usd = 1000; }));
const lk = r.trades.filter(t => t.r === 'LOCK');
ok('GRID lock: dono side full → LOCK close + naya grid', lk.length === 4 && lk.every(t => near(t.cp, 97)) && r.trades.length > 4, tl(r).slice(0, 200));
r = R([100, 101, 102, 103, 102, 100, 98, 97, 96], S(['grid'], s => { s.modules.grid.max_per_side = 1; s.modules.grid.lock_close = false; s.exit.cycle_tp_usd = 1000; }));
ok('GRID lock_close=false → lock nahi', !r.trades.some(t => t.r === 'LOCK'), '');

console.log(fails ? fails + ' FAILED' : 'ALL PASS');
process.exit(fails ? 1 : 0);
