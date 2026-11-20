// AMC Last Candle engine tests. Run: node tests/lastcandle.test.js  (engine is read from index.html)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const src = html.split('<script id="engine">')[1].split('</script>')[0];
const ctx = { module: { exports: {} } }; vm.createContext(ctx); vm.runInContext(src, ctx);
const E = ctx.module.exports;
const base = JSON.parse(fs.readFileSync(path.join(root, 'strategies/amc-last-candle.json'), 'utf8'));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  → ' + info : '')); if (!cond) fails++; };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

// Wed 2026-01-07 02:00 UTC (server GMT+0) = 07:30 IST, naya trading din abhi shuru hua
const START = Date.UTC(2026, 0, 7, 2, 0) / 1000;
function build(bars, start) {        // bars: [o, h, l, c]
  const t = [], o = [], h = [], l = [], c = [];
  let tt = start || START;
  for (const b of bars) { t.push(tt); o.push(b[0]); h.push(b[1]); l.push(b[2]); c.push(b[3]); tt += 60; }
  return { t: Float64Array.from(t), o: Float64Array.from(o), h: Float64Array.from(h), l: Float64Array.from(l), c: Float64Array.from(c) };
}
const G = (p, d = 0.0002) => [p, p + d, p, p + d];           // green bar
const R = (p, d = 0.0002) => [p, p, p - d, p - d];           // red bar
const Z = p => [p, p + 0.00005, p - 0.00005, p];             // doji
function strat(fn) {
  const st = JSON.parse(JSON.stringify(base));
  st.daily.target_pct = 0; st.daily.loss_pct = 0; st.filters.friday_stop.enabled = false; st.filters.max_spread_points = 0;
  if (fn) fn(st);
  return st;
}
const RUN = (ds, st, o) => E.run(ds, st, Object.assign({ balance: 10000, spreadMode: 'fixed', fixedPts: 0, path: 'auto' }, o || {}));

// 1) GREEN -> agle bar ke open pe BUY, TP $1 (0.01 lot EURUSD = 10 pips)
{
  const r = RUN(build([G(1.1000), [1.1002, 1.1013, 1.1002, 1.1002]]), strat());
  const t = r.trades[0];
  ok('green candle -> BUY agle bar ke open pe', t && t.dir === 1 && near(t.op, 1.1002) && t.ot === START + 60, t && (t.dir + ' @ ' + t.op));
  ok('BUY ka TP $1 (10 pips)', t && t.r === 'SINGLE_TP' && near(t.pr, 1, 1e-6) && near(t.cp, 1.1012, 1e-9), t && (t.r + ' ' + t.pr));
}
// 2) RED -> SELL, spread ke saath bhi TP = $1 (ask pe band)
{
  const r = RUN(build([R(1.1000), [1.0998, 1.0998, 1.0980, 1.0985]]), strat(), { fixedPts: 10 });
  const t = r.trades[0];
  ok('red candle -> SELL', t && t.dir === -1 && near(t.op, 1.0998), t && (t.dir + ' @ ' + t.op));
  ok('SELL TP $1 spread ke saath', t && t.r === 'SINGLE_TP' && near(t.pr, 1, 1e-6), t && t.pr);
}
// 3) doji -> skip
{
  const r = RUN(build([Z(1.1), Z(1.1), Z(1.1)]), strat());
  ok('doji candle pe koi trade nahi', r.trades.length === 0 && r.lc.skips.doji === 2 && r.lc.opened === 0, 'skips ' + JSON.stringify(r.lc.skips));
}
// 4) 10 SELL atki (gap up) -> 11vi SELL pe pehli 10 = AVG group, combined $1 pe band
{
  const bars = []; let p = 1.1000;
  for (let k = 0; k < 12; k++) { bars.push([p, p, p - 0.0001, p - 0.0001]); p += 0.0002; }   // red bars, har bar 2 pip upar khulta
  const ops = []; for (let k = 1; k <= 11; k++) ops.push(1.1000 + 0.0002 * k);            // sells k=1..11 (bar 1..11 ke open)
  const avg10 = ops.slice(0, 10).reduce((a, b) => a + b, 0) / 10, gtp = avg10 - 0.0001;   // 0.10 lot -> $1 = 1 pip
  bars.push([p, p, gtp - 0.00001, gtp - 0.00001]);                                       // crash bar
  const r = RUN(build(bars), strat(st => { st.limits.max_per_side = 25; }));
  const g = r.baskets.find(b => b.r === 'AVG_TP');
  ok('AVG group bana (10 trades)', r.lc.groups >= 1 && r.lc.maxGroup === 10, 'groups ' + r.lc.groups + ' max ' + r.lc.maxGroup);
  ok('AVG group combined +$1 pe band', g && g.n === 10 && near(g.pr, 1, 1e-6), g && (g.n + ' trades ' + g.pr.toFixed(4)));
  const t11 = r.trades.find(x => near(x.op, ops[10]));
  ok('11vi trade SINGLE hi rahi (apna $1 TP)', t11 && t11.kind === 'SINGLE' && t11.r === 'SINGLE_TP' && near(t11.pr, 1, 1e-6), t11 && (t11.kind + ' ' + t11.r));
}
// 5) NOAVG preset: group kabhi nahi
{
  const bars = []; let p = 1.1000;
  for (let k = 0; k < 14; k++) { bars.push([p, p, p - 0.0001, p - 0.0001]); p += 0.0002; }
  const r = RUN(build(bars), strat(), { preset: 'NOAVG' });
  ok('NOAVG: koi AVG group nahi', r.lc.groups === 0 && r.lc.maxOpen === 13, 'groups ' + r.lc.groups + ' open ' + r.lc.maxOpen);
}
// 6) daily target 1% of balance: $100 balance -> $1 -> din band
{
  const r = RUN(build([G(1.1000), [1.1002, 1.1013, 1.1002, 1.1012], G(1.1012), G(1.1014), G(1.1016)]), strat(st => { st.daily.target_pct = 1; }), { balance: 100 });
  ok('daily target hit -> din band', r.dayTarget === 1 && r.trades.length === 1 && near(r.net, 1, 1e-6) && r.lc.skips.day >= 3, 'trades ' + r.trades.length + ' net ' + r.net.toFixed(4) + ' skip.day ' + r.lc.skips.day);
}
// 7) daily loss 5%: $100 -> -$5 pe sab band
{
  const bars = [R(1.1000), [1.0998, 1.1060, 1.0998, 1.1060], R(1.1060), R(1.1058)];
  const r = RUN(build(bars), strat(st => { st.daily.loss_pct = 5; }), { balance: 100 });
  const b = r.baskets[0];
  ok('daily loss -$5 pe band + din band', r.dayLoss === 1 && b && b.r === 'DAY_LOSS' && near(b.pr, -5, 1e-6) && r.trades.length === 1, b && (b.r + ' ' + b.pr.toFixed(4) + ' trades ' + r.trades.length));
}
// 8) max trades
{
  const bars = []; let p = 1.1000;
  for (let k = 0; k < 8; k++) { bars.push([p, p, p - 0.0001, p - 0.0001]); p += 0.0002; }
  const r = RUN(build(bars), strat(st => { st.limits.max_trades = 3; }));
  ok('max trades 3', r.lc.maxOpen === 3 && r.lc.skips.max === 4, 'open ' + r.lc.maxOpen + ' skip ' + r.lc.skips.max);
}
// 9) max per side
{
  const bars = []; let p = 1.1000;
  for (let k = 0; k < 8; k++) { bars.push([p, p, p - 0.0001, p - 0.0001]); p += 0.0002; }
  const r = RUN(build(bars), strat(st => { st.limits.max_per_side = 2; }));
  ok('max per side 2', r.lc.maxSell === 2 && r.lc.skips.side === 5, 'sell ' + r.lc.maxSell + ' skip ' + r.lc.skips.side);
}
// 10) spread filter
{
  const r = RUN(build([G(1.1), G(1.1002), G(1.1004)]), strat(st => { st.filters.max_spread_points = 30; }), { fixedPts: 40 });
  ok('spread 40 > 30: koi trade nahi', r.trades.length === 0 && r.lc.skips.spread === 2, 'skip ' + r.lc.skips.spread);
}
// 11) weekend stop (Saturday IST)
{
  const sat = Date.UTC(2026, 0, 10, 6, 0) / 1000;
  const r = RUN(build([G(1.1), G(1.1002), G(1.1004)], sat), strat(st => { st.filters.friday_stop.enabled = true; }));
  ok('Saturday: koi trade nahi', r.trades.length === 0 && r.lc.skips.weekend === 2, 'skip ' + r.lc.skips.weekend);
  const fri = Date.UTC(2026, 0, 9, 16, 31) / 1000;   // Friday 22:01 IST
  const r2 = RUN(build([G(1.1), G(1.1002)], fri), strat(st => { st.filters.friday_stop.enabled = true; }));
  ok('Friday 22:00 IST ke baad nayi trade nahi', r2.trades.length === 0, 'trades ' + r2.trades.length);
}
// 12) base_usd (USDJPY): $1 TP = 0.15 yen @150
{
  const st = strat(s => { s.contract_size = 100000; s.point = 0.001; s.pnl = 'base_usd'; });
  const r = RUN(build([[150, 150.02, 150, 150.02], [150.02, 150.2, 150.02, 150.1]]), st);
  const t = r.trades[0];
  ok('USDJPY base_usd: TP ~$1', t && t.r === 'SINGLE_TP' && near(t.cp - t.op, 0.15002, 1e-4) && near(t.pr, 1, 0.01), t && (t.cp - t.op).toFixed(5) + ' $' + t.pr.toFixed(4));
}
// 13) M5 candle: signal sirf naye M5 candle ke pehle M1 bar pe
{
  const st = strat(s => { s.last_candle.tf = 'M5'; });
  const bars = []; let p = 1.1;
  for (let k = 0; k < 15; k++) { bars.push(G(p, 0.00002)); p += 0.00002; }
  const r = RUN(build(bars), st);
  ok('M5: 15 min me sirf 2 trade (5 aur 10 min pe)', r.lc.opened === 2 && r.trades.every(x => (x.ot - START) % 300 === 0), 'opened ' + r.lc.opened);
}
// 14) worst-case path <= auto (random walk), EA default
{
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bars = []; let p = 1.1;
  for (let k = 0; k < 3000; k++) { const c = p + (rnd() - 0.5) * 0.0006, h = Math.max(p, c) + rnd() * 0.0002, l = Math.min(p, c) - rnd() * 0.0002; bars.push([p, h, l, c]); p = c; }
  const st = strat(s => { s.daily.target_pct = 1; s.daily.loss_pct = 5; });
  const a = RUN(build(bars), st, { fixedPts: 8 }), w = RUN(build(bars), st, { fixedPts: 8, path: 'worst' });
  ok('worst-case net <= auto net', w.net <= a.net + 1e-9, 'auto ' + a.net.toFixed(2) + ' worst ' + w.net.toFixed(2));
  const sumT = a.trades.reduce((s, x) => s + x.pr, 0);
  ok('trades ka jod = net', near(sumT, a.net, 1e-6), sumT.toFixed(4) + ' vs ' + a.net.toFixed(4));
  ok('har SINGLE_TP trade = $1', a.trades.filter(x => x.r === 'SINGLE_TP').every(x => near(x.pr, 1, 1e-6)), a.trades.filter(x => x.r === 'SINGLE_TP').length + ' singles');
  ok('har AVG_TP basket >= $1 (banne pe hi profit me ho to turant band)', a.baskets.filter(x => x.r === 'AVG_TP').every(x => x.pr >= 1 - 1e-6), a.baskets.filter(x => x.r === 'AVG_TP').length + ' groups');
  ok('report() chalta hai', !!E.report(a).stats && !!E.snapshot(a), '');
}
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED');
process.exit(fails ? 1 : 0);
