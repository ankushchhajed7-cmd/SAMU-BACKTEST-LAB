// Liquidity Sweep (QUANT PILOT port) tests. Run: node tests/sweep.test.js  (engine is read from index.html)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const src = html.split('<script id="engine">')[1].split('</script>')[0];
const ctx = { module: { exports: {} } }; vm.createContext(ctx); vm.runInContext(src, ctx);
const E = ctx.module.exports;
const base = JSON.parse(fs.readFileSync(path.join(root, 'strategies/liquidity-sweep-qp.json'), 'utf8'));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  → ' + info : '')); if (!cond) fails++; };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const P = sg => ({ pip: sg.pip_size, min_depth_pips: sg.min_depth_pips, max_depth_pips: sg.max_depth_pips, displacement_mult: sg.displacement_mult,
  confirm_candles: sg.confirm_candles, sl_buffer_pips: sg.sl_buffer_pips, tp1_rr: sg.tp1_rr, tp2_min_rr: sg.tp2_min_rr,
  body_lookback: sg.body_lookback, volume_spike_mult: sg.volume_spike_mult, eq_tolerance_price: sg.eq_tolerance_pips * sg.pip_size });
const PRM = P(base.signal);

// QUANT PILOT tests/conftest.make_candles: quiet M5 candles (bodies 0.3), start 2026-01-01 09:00 UTC (London)
const START = 1767258000;
function quiet(n, price = 2650, step = 0.3, start = START) {
  const out = []; let p = price;
  for (let i = 0; i < n; i++) { const o = p, c = p + (i % 2 === 0 ? step : -step); out.push({ t: start + i * 300, o, h: Math.max(o, c) + 0.1, l: Math.min(o, c) - 0.1, c, v: 1000 }); p = c; }
  return out;
}
const LEVEL = 2652.0;
function withSweep(depth = 1.5, body = 1.6, closeInside = true) {
  const c = quiet(100), t = c[c.length - 1].t, last = c[c.length - 1].c, sc = LEVEL - 0.2;
  c.push({ t: t + 300, o: last, h: LEVEL + depth, l: last - 0.1, c: sc, v: 2500 });
  const dc = closeInside ? sc - body : LEVEL + 0.5;
  c.push({ t: t + 600, o: sc, h: sc + 0.1, l: dc - 0.1, c: dc, v: 3000 });
  return c;
}
const M5 = c => ({ t: c.map(x => x.t), o: c.map(x => x.o), h: c.map(x => x.h), l: c.map(x => x.l), c: c.map(x => x.c), v: c.map(x => x.v) });
const LV = [{ name: 'EQH', price: LEVEL, side: 'high', strength: 2 }, { name: 'PDL', price: 2630, side: 'low', strength: 2 }];

// ---- Hunter (same numbers as QUANT PILOT tests/test_strategy.py) ----
{
  const m = M5(withSweep(1.5)), su = E.detectAt(m, m.t.length - 1, LV, PRM, true);
  ok('bearish sweep detect', su.length === 1 && su[0].dir === -1, JSON.stringify(su[0] && { e: su[0].entry, sl: su[0].sl, tp1: su[0].tp1, tp2: su[0].tp2 }));
  const s = su[0];
  ok('depth 15 pips', near(s.depth, 15));
  ok('SL = wick + 5 pips', near(s.sl, +(LEVEL + 1.5 + 0.5).toFixed(2)));
  ok('TP1 = 1:2', near((s.entry - s.tp1) / (s.sl - s.entry), 2, 1e-3));
  ok('TP2 neeche TP1 se', s.tp2 < s.tp1);
  ok('displacement ≥ 1.2', s.disp >= 1.2);
}
for (const d of [0.5, 3.5]) { const m = M5(withSweep(d)); ok('reject depth ' + d * 10 + ' pips', E.detectAt(m, m.t.length - 1, LV, PRM, true).length === 0); }
{ const m = M5(withSweep(1.5, 0.2)); ok('reject weak displacement', E.detectAt(m, m.t.length - 1, LV, PRM, true).length === 0); }
{ const m = M5(withSweep(1.5, 1.6, false)); ok('reject: close wapas andar nahi', E.detectAt(m, m.t.length - 1, LV, PRM, true).length === 0); }
{ const m = M5(withSweep(1.5)), strict = Object.assign({}, PRM, { displacement_mult: 50 }); ok('displacement param respected', E.detectAt(m, m.t.length - 1, LV, strict, true).length === 0); }

// ---- Cartographer ----
{
  const c = quiet(400), m = M5(c), lv = E.mapLevels(m, 400 - 300, 397, PRM), names = lv.map(x => x.name).join('+');
  ok('levels: PDH + PDL', names.indexOf('PDH') >= 0 && names.indexOf('PDL') >= 0, names);
  ok('levels price-sorted', lv.every((x, i) => i === 0 || lv[i - 1].price <= x.price));
}
// ---- Analyst score ----
ok('score: strong + volume + strength + NY + mid depth = 10', E.sweepScore({ disp: 5.33, vspike: true, level: { name: 'EQH', strength: 2 }, session: 'NEW_YORK', depth: 15 }) === 10);
ok('score: weak, Asia, no bonus = 4', E.sweepScore({ disp: 1.3, vspike: false, level: { name: 'EQH', strength: 1 }, session: 'ASIAN', depth: 24 }) === 4);

// ---- full run: 400 quiet M5 bars, then sweep of PDH (2650.4) + bearish displacement ----
// M5 candle → 5 M1 bars (bull: O→L→H→C, bear: O→H→L→C)
function toM1(c5, spreadPts) {
  const rows = [];
  c5.forEach(b => {
    const v = b.v / 5, bull = b.c >= b.o;
    const seq = bull ? [[b.o, b.o, b.l, b.l], [b.l, b.h, b.l, b.h], [b.h, b.h, b.c, b.c], [b.c, b.c, b.c, b.c], [b.c, b.c, b.c, b.c]]
      : [[b.o, b.h, b.o, b.h], [b.h, b.h, b.l, b.l], [b.l, b.c, b.l, b.c], [b.c, b.c, b.c, b.c], [b.c, b.c, b.c, b.c]];
    seq.forEach((q, k) => rows.push({ t: b.t + k * 60, o: q[0], h: Math.max(q[0], q[1], q[2], q[3]), l: Math.min(q[0], q[1], q[2], q[3]), c: q[3], v }));
  });
  const n = rows.length, D = { t: new Float64Array(n), o: new Float64Array(n), h: new Float64Array(n), l: new Float64Array(n), c: new Float64Array(n), s: new Float32Array(n).fill(spreadPts || 0), v: new Float32Array(n) };
  rows.forEach((r, i) => { D.t[i] = r.t; D.o[i] = r.o; D.h[i] = r.h; D.l[i] = r.l; D.c[i] = r.c; D.v[i] = r.v; });
  return D;
}
// after = list of [o,h,l,c] M5 candles after the displacement
function scenario(after) {
  const c = quiet(400), L0 = 2650.4, last = c[c.length - 1], sc = L0 - 0.2;
  let t = last.t;
  c.push({ t: t += 300, o: last.c, h: L0 + 1.5, l: last.c - 0.1, c: sc, v: 2500 });
  c.push({ t: t += 300, o: sc, h: sc + 0.1, l: sc - 1.7, c: sc - 1.6, v: 3000 });
  after.forEach(a => c.push({ t: t += 300, o: a[0], h: a[1], l: a[2], c: a[3], v: 1000 }));
  for (let k = 0; k < 5; k++) { const p = c[c.length - 1].c; c.push({ t: t += 300, o: p, h: p + 0.05, l: p - 0.05, c: p, v: 1000 }); }
  return c;
}
const ST = () => JSON.parse(JSON.stringify(base));
const entry = 2650.2 - 1.6, sl = 2650.4 + 1.5 + 0.5, risk = sl - entry, lot = Math.floor(10000 * 0.01 / (risk * 100) * 100 + 1e-9) / 100;
{
  const r = E.run(toM1(scenario([[entry, sl + 0.6, entry - 0.2, sl + 0.4]])), ST(), { preset: 'QP', balance: 10000 });
  const sh = r.trades.find(x => x.dir === -1), lg = r.trades.find(x => x.dir === 1);
  ok('QP: SHORT liya (PDH sweep)', !!sh && sh.lvl.indexOf('PDH') >= 0, r.trades.map(x => x.lvl + ' ' + x.lot + ' ' + x.r + ' ' + x.pr).join(', '));
  ok('QP: lot = 1% risk (' + lot + ')', sh && near(sh.lot, lot));
  ok('QP: SL loss ≈ 1%', sh && sh.r === 'SL' && near(sh.pr, -+(risk * lot * 100).toFixed(2), 0.011), sh && sh.pr);
  ok('QP: rally candle = PDL ka bullish sweep → LONG bhi (rule sahi)', !!lg && lg.lvl.indexOf('PDL') >= 0);
}
{
  const tp1 = entry - 2 * risk, tp2 = entry - 3 * risk;
  const r = E.run(toM1(scenario([[entry, entry + 0.1, entry - risk - 0.1, entry - risk + 0.1], [entry - risk + 0.1, entry - risk + 0.2, tp1 - 0.1, tp1 + 0.2], [tp1 + 0.2, tp1 + 0.3, tp2 - 0.3, tp2 - 0.2]])), ST(), { preset: 'QP', balance: 10000 });
  const half = Math.floor(lot / 2 * 100 + 1e-9) / 100, rest = +(lot - half).toFixed(2), want = half * 2 * risk * 100 + rest * 3 * risk * 100;
  ok('QP: BE → TP1 50% → TP2', r.trades.length === 1 && r.trades[0].r === 'TP2' && r.trades[0].tp1 && near(r.trades[0].pr, want, 0.02), r.trades[0] && (r.trades[0].pr + ' vs ' + want.toFixed(2)));
}
{
  const r = E.run(toM1(scenario([[entry, sl + 0.6, entry - 0.2, sl + 0.4]]), 20), ST(), { preset: 'REAL', balance: 10000, path: 'auto' });
  const x = r.trades.find(q => q.dir === -1);
  ok('REAL: SELL fill = agle M1 ka open (bid)', x && near(x.op, entry, 1e-9), x && x.op);
  ok('REAL: SL pe close ask = SL', x && x.r === 'SL' && near(x.cp, sl, 1e-9), x && x.cp);
}
{
  const r = E.run(toM1(scenario([[entry, sl + 0.6, entry - 0.2, sl + 0.4]]), 400), ST(), { preset: 'REAL', balance: 10000 });
  ok('REAL: spread $0.40 > $0.35 → veto', r.trades.length === 0 && r.sweep.veto.Spread >= 1, JSON.stringify(r.sweep.veto));
}
{
  // REAL vs QP same scenario: TP2 path; REAL has spread cost on SELL exit (ask)
  const tp1 = entry - 2 * risk, tp2 = entry - 3 * risk, sc = [[entry, entry + 0.1, entry - risk - 0.1, entry - risk + 0.1], [entry - risk + 0.1, entry - risk + 0.2, tp1 - 0.1, tp1 + 0.2], [tp1 + 0.2, tp1 + 0.3, tp2 - 0.3, tp2 - 0.2]];
  const a = E.run(toM1(scenario(sc), 0), ST(), { preset: 'REAL', balance: 10000 }), b = E.run(toM1(scenario(sc), 0), ST(), { preset: 'QP', balance: 10000 });
  ok('REAL (spread 0) = QP on clean path', a.trades.length === 1 && b.trades.length === 1 && near(a.net, b.net, 0.05), a.net.toFixed(2) + ' vs ' + b.net.toFixed(2));
}
console.log(fails ? '\n' + fails + ' FAIL' : '\nSab PASS');
process.exit(fails ? 1 : 0);
