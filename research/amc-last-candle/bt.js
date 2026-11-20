// AMC Last Candle backtest on Exness M1 (INVESTOR-ID data/m1 export).
// Usage: node bt.js <dataDir> [SYMBOLS comma] ; engine = index.html <script id="engine"> (app jaisa hi)
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const root = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ctx = { module: { exports: {} } }; vm.createContext(ctx); vm.runInContext(html.split('<script id="engine">')[1].split('</script>')[0], ctx);
const E = ctx.module.exports;
const base = JSON.parse(fs.readFileSync(path.join(root, 'strategies/amc-last-candle.json'), 'utf8'));
const DIR = process.argv[2] || '/home/claude/ankushchhajed7-cmd/investor-id/data/m1';
const SYMS = (process.argv[3] || 'EURUSD,GBPUSD,AUDUSD,NZDUSD,USDJPY,USDCHF,USDCAD,XAUUSD').split(',');
const PATHS = (process.env.PATHS || 'auto,worst').split(',');
function load(sym) {
  const meta = JSON.parse(fs.readFileSync(path.join(DIR, sym + 'm_M1.json'), 'utf8'));
  const L = zlib.gunzipSync(fs.readFileSync(path.join(DIR, sym + 'm_M1.csv.gz'))).toString().split(/\r?\n/), N = L.length;
  const t = new Float64Array(N), o = new Float64Array(N), h = new Float64Array(N), l = new Float64Array(N), c = new Float64Array(N), s = new Float32Array(N);
  let k = 0;
  for (let i = 1; i < N; i++) { const p = L[i].split('\t'); if (p.length < 6) continue; const d = p[0].split('.'), tm = p[1].split(':');
    t[k] = Date.UTC(+d[0], d[1] - 1, +d[2], +tm[0], +tm[1], +(tm[2] || 0)) / 1000; o[k] = +p[2]; h[k] = +p[3]; l[k] = +p[4]; c[k] = +p[5]; s[k] = +(p[8] || 0); k++; }
  return { meta, ds: { t: t.subarray(0, k), o: o.subarray(0, k), h: h.subarray(0, k), l: l.subarray(0, k), c: c.subarray(0, k), s: s.subarray(0, k) } };
}
const out = [];
for (const sym of SYMS) {
  const { meta, ds } = load(sym);
  const st = JSON.parse(JSON.stringify(base));
  st.symbol = meta.symbol; st.contract_size = meta.contract; st.point = meta.point; st.server_gmt_offset_hours = meta.server_offset_h || 0;
  st.pnl = sym.startsWith('USD') ? 'base_usd' : 'quote_usd';
  if (sym === 'XAUUSD') st.filters.max_spread_points = +(process.env.XAU_SPREAD || 400);   // gold: EA me InpMaxSpreadPts badhana padega
  let spr = 0; for (let i = 0; i < ds.s.length; i++) spr += ds.s[i]; spr /= ds.s.length;
  for (const p of Object.keys(st.basket.presets)) for (const pm of PATHS) {
    const r = E.run(ds, st, { balance: st.default_balance, preset: p, path: pm });
    const rep = E.report(r), s = rep.stats;
    out.push({ sym, preset: p, path: pm, avgSpread: +spr.toFixed(1), maxSp: st.filters.max_spread_points, net: +r.net.toFixed(2), pct: +r.netPct.toFixed(2), ddPct: +r.maxDDPct.toFixed(2), dd: +r.maxDD.toFixed(2),
      trades: r.trades.length, tpd: +r.lc.tradesPerDay.toFixed(1), tradeWin: +r.lc.tradeWin.toFixed(1), groups: r.lc.groups, maxOpen: r.lc.maxOpen,
      green: s.greenDays, red: s.redDays, days: rep.days.length, worstDay: +(s.worstDay ? s.worstDay.pl : 0).toFixed(2), bestDay: +(s.bestDay ? s.bestDay.pl : 0).toFixed(2),
      dayTarget: r.dayTarget, dayLoss: r.dayLoss, worstFloat: +s.worstFloating.toFixed(2),
      months: rep.months.map(m => m.month + ' ' + m.pl.toFixed(0)).join(' | '),
      exits: Object.entries(r.lc.exits).map(([k, v]) => k + ' ' + v.trades + 't (' + v.pl.toFixed(0) + ')').join(', '),
      skips: r.lc.skips, from: new Date(r.from * 1000).toISOString().slice(0, 10), to: new Date(r.to * 1000).toISOString().slice(0, 10) });
    console.log(JSON.stringify(out[out.length - 1]));
  }
}
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
