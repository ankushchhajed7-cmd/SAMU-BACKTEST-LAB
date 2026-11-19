// Trend Pyramid backtest on Exness M1 (INVESTOR-ID data/m1 export). Usage: node bt.js <XAUUSDm_M1.csv.gz> [from YYYY-MM-DD] [to YYYY-MM-DD]
// Engine = index.html ka <script id="engine"> (app jaisa hi).
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const root = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ctx = { module: { exports: {} } }; vm.createContext(ctx); vm.runInContext(html.split('<script id="engine">')[1].split('</script>')[0], ctx);
const E = ctx.module.exports;
const st = JSON.parse(fs.readFileSync(path.join(root, 'strategies/trend-pyramid.json'), 'utf8'));

function load(file) {
  const L = zlib.gunzipSync(fs.readFileSync(file)).toString().split(/\r?\n/), N = L.length;
  const t = new Float64Array(N), o = new Float64Array(N), h = new Float64Array(N), l = new Float64Array(N), c = new Float64Array(N), s = new Float32Array(N);
  let k = 0;
  for (let i = 1; i < N; i++) { const p = L[i].split('\t'); if (p.length < 6) continue; const d = p[0].split('.'), tm = p[1].split(':');
    t[k] = Date.UTC(+d[0], d[1] - 1, +d[2], +tm[0], +tm[1], +(tm[2] || 0)) / 1000; o[k] = +p[2]; h[k] = +p[3]; l[k] = +p[4]; c[k] = +p[5]; s[k] = +(p[8] || 0); k++; }
  return { t: t.subarray(0, k), o: o.subarray(0, k), h: h.subarray(0, k), l: l.subarray(0, k), c: c.subarray(0, k), s: s.subarray(0, k) };
}
const ds = load(process.argv[2]);
const sec = v => v ? Date.UTC(...v.split('-').map((x, i) => i === 1 ? x - 1 : +x)) / 1000 : null;
const from = sec(process.argv[3]), to = process.argv[4] ? sec(process.argv[4]) + 86400 : null;
const ymd = x => new Date(x * 1000).toISOString().slice(0, 16).replace('T', ' ');
console.log('data', ymd(ds.t[0]), '→', ymd(ds.t[ds.t.length - 1]), ds.t.length, 'bars');
const out = [];
for (const p of Object.keys(st.basket.presets)) for (const path of ['auto', 'olhc', 'ohlc', 'worst']) {
  const r = E.run(ds, st, { balance: st.default_balance, preset: p, path, from, to });
  const rep = E.report(r), s = rep.stats;
  out.push({ preset: p, path, net: +r.net.toFixed(2), pct: +r.netPct.toFixed(2), ddPct: +r.maxDDPct.toFixed(2), dd: +r.maxDD.toFixed(2), pf: +r.pf.toFixed(2), win: +r.winRate.toFixed(1),
    baskets: r.baskets.length, trades: r.trades.length, tpd: +r.pyr.tradesPerDay.toFixed(1), green: s.greenDays, red: s.redDays, worstDay: +(s.worstDay ? s.worstDay.pl : 0).toFixed(2),
    largestLoss: +s.largestLoss.toFixed(2), dayTarget: r.dayTarget, dayLoss: r.dayLoss,
    months: rep.months.map(m => m.month + ' ' + m.pl.toFixed(0)).join(' | '),
    exits: Object.entries(r.pyr.exits).map(([k, v]) => k + ' ' + v.n + ' (' + v.pl.toFixed(0) + ')').join(', ') });
}
for (const x of out) console.log(JSON.stringify(x));
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
