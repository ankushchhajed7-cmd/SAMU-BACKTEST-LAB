// Trend Pyramid engine tests. Run: node tests/pyramid.test.js  (engine is read from index.html)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const src = html.split('<script id="engine">')[1].split('</script>')[0];
const ctx = { module: { exports: {} } }; vm.createContext(ctx); vm.runInContext(src, ctx);
const E = ctx.module.exports;
const base = JSON.parse(fs.readFileSync(path.join(root, 'strategies/trend-pyramid.json'), 'utf8'));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  → ' + info : '')); if (!cond) fails++; };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

// Wed 2026-01-07 02:00 UTC (server GMT+0) — trading day 07:00 IST = 01:30 UTC, so sab ek hi din mein
const START = Date.UTC(2026, 0, 7, 2, 0) / 1000;
// warmup: flat bars with ±0.5 wick → M15 ATR = 1.0 (ready after 14 M15 bars = 210 min)
function build(moves, opts = {}) {
  const P0 = opts.p0 || 2000, start = opts.start || START, warm = opts.warm != null ? opts.warm : 215;
  const t = [], o = [], h = [], l = [], c = [];
  let tt = start, p = P0;
  for (let i = 0; i < warm; i++) { t.push(tt); o.push(p); h.push(p + 0.5); l.push(p - 0.5); c.push(p); tt += 60; }
  for (const m of moves) {           // m = target price (one M1 bar straight from last close)
    t.push(tt); o.push(p); h.push(Math.max(p, m)); l.push(Math.min(p, m)); c.push(m); p = m; tt += 60;
  }
  return { t: Float64Array.from(t), o: Float64Array.from(o), h: Float64Array.from(h), l: Float64Array.from(l), c: Float64Array.from(c) };
}
function strat(over) {
  const st = JSON.parse(JSON.stringify(base));
  st.daily.target_usd = 0; st.daily.loss_usd = 0; st.filters.friday_close.enabled = false;
  st.basket.presets.T = Object.assign({ loss_levels: 0, step_price: 2 }, over || {});
  st.basket.preset = 'T';
  return st;
}
const RUN = (ds, st, o) => E.run(ds, st, Object.assign({ balance: 1000, spreadMode: 'fixed', fixedPts: 0, forceSignal: 1, path: 'auto' }, o || {}));
const first = (r, k) => r.baskets.filter(k)[0];

// 1) immediate entry: ATR ready hote hi trend side BUY, koi signal/pullback wait nahi
{
  const r = RUN(build([2000]), strat());
  ok('turant pehla BUY (warmup ke baad)', r.trades.length >= 1 && r.trades[0].dir === 1 && near(r.trades[0].op, 2000), 'open ' + (r.trades[0] && r.trades[0].op));
  ok('entry ATR ready hone pe (210 min)', r.trades[0].ot === START + 210 * 60, 'ot +' + ((r.trades[0].ot - START) / 60) + ' min');
}
// 2) pure SL = ATR(1.0) × 1.5 = $1.5
{
  const r = RUN(build([1998]), strat()), b = r.baskets[0];
  ok('pure SL ATR×1.5', b && b.r === 'SL' && b.n === 1 && near(b.pr, -1.5), b && (b.r + ' ' + b.pr));
}
// 3) pyramid add +$2, SL = last add − $2 (trailing) → wapas 1999 pe TRAIL @2000 = −$2
{
  const r = RUN(build([2002, 1999, 1999]), strat()), b = r.baskets[0];
  ok('add at +step', r.trades.filter(x => x.b === 1).length === 2 && near(r.trades.filter(x => x.b === 1)[1].op, 2002));
  ok('trail SL = add − gap', b.r === 'TRAIL' && near(b.pr, -2), b.r + ' ' + b.pr);
  ok('re-entry turant agle bar pe', r.baskets.length >= 1 && r.trades.some(x => x.b === 2 && x.dir === 1), 'baskets ' + r.baskets.length);
}
// 4) 2 adds ke baad lock: 2000 → 2004 (adds 2002, 2004), SL 2002 → +2 + 0 − 2 = $0
{
  const r = RUN(build([2004, 2001]), strat()), b = r.baskets[0];
  ok('2 adds ke baad breakeven lock', b.r === 'TRAIL' && b.n === 3 && near(b.pr, 0), b.r + ' n' + b.n + ' ' + b.pr);
}
// 5) trail gap alag (3): add 2002, SL 1999
{
  const r = RUN(build([2002, 1998]), strat({ trail_gap_price: 3 })), b = r.baskets[0];
  ok('trail_gap_price 3', b.r === 'TRAIL' && near(b.pr, -1 - 3), b.r + ' ' + b.pr);
}
// 6) basket TP $15 (step 10): add 2010, PL 15 at 2012.5
{
  const r = RUN(build([2013]), strat({ step_price: 10 })), b = r.baskets[0];
  ok('basket TP $15', b.r === 'BASKET_TP' && b.n === 2 && near(b.pr, 15), b.r + ' ' + b.pr);
  const t2 = r.trades.filter(x => x.b === 1); ok('TP fill exact 2012.5', near(t2[0].cp, 2012.5), t2[0].cp);
}
// 7) TP off (0) → max adds 5 tak jaata hai
{
  const r = RUN(build([2015, 2007]), strat({ tp_usd: 0 })), b = r.baskets[0];
  ok('TP 0 = off, max 5 adds', b.n === 6 && b.adds === 5, 'n ' + b.n + ' adds ' + b.adds);
  ok('last add 2010 → SL 2008 → +$18', b.r === 'TRAIL' && near(b.pr, 8 + 6 + 4 + 2 + 0 - 2), b.r + ' ' + b.pr);
}
// 8) combo: grid at ATR gap ($1), recover +$3 at 2000
{
  const r = RUN(build([1997.9, 2001]), strat({ loss_levels: 2 })), b = r.baskets[0];
  const tr = r.trades.filter(x => x.b === 1);
  ok('combo: koi SL nahi + 2 grid (1999, 1998)', tr.length === 3 && near(tr[1].op, 1999) && near(tr[2].op, 1998), tr.map(x => x.op).join(','));
  ok('combo: max 2 grid (1997.9 pe 3rd nahi)', b.grid === 2);
  ok('RECOVER +$3 @2000', b.r === 'RECOVER' && near(b.pr, 3) && near(tr[0].cp, 2000), b.r + ' ' + b.pr + ' @' + tr[0].cp);
}
// 9) combo: max loss −$20 → 3p = 5997 − 20
{
  const r = RUN(build([1990]), strat({ loss_levels: 2 })), b = r.baskets[0];
  ok('MAX_LOSS −$20', b.r === 'MAX_LOSS' && near(b.pr, -20) && near(r.trades[0].cp, (5997 - 20) / 3), b.r + ' ' + b.pr);
}
// 10) combo: grid khula ho to pyramid add nahi
{
  const r = RUN(build([1998.9, 2003]), strat({ loss_levels: 2, recover_usd: 10 })), b = r.baskets[0];
  ok('grid khula ho to pyramid add nahi (2002 paar, phir bhi 2 hi trade)', b.adds === 0 && b.n === 2, b.r + ' adds ' + b.adds + ' n ' + b.n);
}
// 11) daily target $30: do TP baskets (+15 +15) → DAY_TARGET, phir us din aur basket nahi
{
  const st = strat({ step_price: 10 }); st.daily.target_usd = 30;
  const r = RUN(build([2013, 2013, 2026, 2040, 2060]), st);
  ok('daily target $30 → din band', r.dayTarget === 1 && r.baskets.length === 2 && r.baskets[1].r === 'DAY_TARGET', r.baskets.map(b => b.r + ' ' + b.pr.toFixed(1)).join(', '));
  ok('net = +$30', near(r.net, 30), r.net);
}
// 12) daily loss $1: pehla SL (−1.5) se pehle −1 pe day loss
{
  const st = strat(); st.daily.loss_usd = 1;
  const r = RUN(build([1998, 1990]), st);
  ok('daily loss −$1 → din band', r.dayLoss === 1 && r.baskets.length === 1 && near(r.net, -1), r.baskets.map(b => b.r).join(',') + ' net ' + r.net);
}
// 13) spread: BUY ask pe khulta hai, bid pe band (spread 0.25 → −0.25 per trade)
{
  const r = E.run(build([1998]), strat(), { balance: 1000, spreadMode: 'fixed', fixedPts: 250, forceSignal: 1 }), b = r.baskets[0];
  ok('spread: BUY @ask 2000.25, SL ATR×1.5 from ask', near(r.trades[0].op, 2000.25) && near(b.pr, -1.5), r.trades[0].op + ' ' + b.pr);
}
// 14) SELL mirror: forceSignal −1, add at 1998, SL 2000 (ask) → TRAIL −2
{
  const r = RUN(build([1998, 2001]), strat(), { forceSignal: -1 }), b = r.baskets[0];
  ok('SELL pyramid + trail', b.dir === -1 && b.r === 'TRAIL' && b.n === 2 && near(b.pr, -2), b.r + ' ' + b.pr);
}
// 15) trend flip: EMA 2/4 on H1 — upar 5 ghante, phir neeche → FLIP close + SELL basket
{
  const st = strat({ step_price: 50 }); st.trend.ema_fast = 2; st.trend.ema_slow = 4; st.first_sl_atr = 100;
  const mv = []; for (let i = 0; i < 300; i++) mv.push(2000 + i * 0.05); for (let i = 0; i < 400; i++) mv.push(2015 - i * 0.08);
  const r = E.run(build(mv), st, { balance: 1000, spreadMode: 'fixed', fixedPts: 0, path: 'auto' });
  const fl = r.baskets.find(b => b.r === 'FLIP');
  ok('trend palta → FLIP close', !!fl && fl.dir === 1, fl && ('flip @' + new Date(fl.ct * 1000).toISOString().slice(11, 16)));
  ok('flip ke baad SELL basket', fl && r.trades.some(x => x.b === fl.id + 1 && x.dir === -1 && x.ot === fl.ct));
}
// 16) Friday close 20:45 server → FRIDAY, phir Monday tak koi basket nahi
{
  const st = strat({ step_price: 50 }); st.first_sl_atr = 100; st.filters.friday_close.enabled = true; st.filters.friday_close.server_time = '20:45';
  const fri = Date.UTC(2026, 0, 9, 17, 0) / 1000; // Fri 17:00 UTC
  const mv = []; for (let i = 0; i < 300; i++) mv.push(2000);
  const r = E.run(build(mv, { start: fri }), st, { balance: 1000, spreadMode: 'fixed', fixedPts: 0, forceSignal: 1 });
  const b = r.baskets[0];
  ok('Friday 20:45 close', b && b.r === 'FRIDAY' && new Date(b.ct * 1000).toISOString().slice(11, 16) === '20:45', b && (b.r + ' ' + new Date(b.ct * 1000).toISOString().slice(11, 16)));
  ok('Friday close ke baad nayi basket nahi', r.baskets.length === 1 && r.trades.length === 1, 'baskets ' + r.baskets.length);
}
// 17) worst path ≤ auto (same strategy, choppy data)
{
  const mv = []; for (let i = 0; i < 400; i++) mv.push(2000 + 3 * Math.sin(i / 3) + i * 0.01);
  const a = RUN(build(mv), strat({ loss_levels: 2 })), w = RUN(build(mv), strat({ loss_levels: 2 }), { path: 'worst' });
  ok('worst-case ≤ auto', w.net <= a.net + 1e-9, 'auto ' + a.net.toFixed(2) + ' worst ' + w.net.toFixed(2));
}
// 18) strategy file presets valid
{
  const ks = Object.keys(base.basket.presets);
  ok('presets: PURE_2, COMBO_3, COMBO_10 maujood', ['PURE_2', 'COMBO_3', 'COMBO_10'].every(k => ks.includes(k)), ks.join(','));
  ok('default preset exists', !!base.basket.presets[base.basket.preset], base.basket.preset);
}
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED');
process.exit(fails ? 1 : 0);
