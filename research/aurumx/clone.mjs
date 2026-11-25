// AurumX clone — tick backtest (SAMU Backtest Lab research). Vantage demo 26209579 ke ticks (Watcher v1.11) par.
// Niyam (video + real trades se): side = M1 close vs EMA(100) M1; flat ho to STOP order price se D door,
// price ke peeche-peeche (sirf achhi taraf) khisakta; fill par SL = entry -/+ SL; profit >= TS par trailing SL = best -/+ TD.
// Usage: node clone.mjs <ticksDir> <history.json> '[{"label":"x","D":0.5,...}]'
import fs from 'node:fs';
const DIR = process.argv[2] || 'ticks', HIST = process.argv[3] || 'history.json';
export function loadTicks(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.csv')).sort();
  const T = [], B = [], A = [];
  for (const f of files) {
    const L = fs.readFileSync(dir + '/' + f, 'utf8').split('\n');
    const hour = L[0].split('hour=')[1].split(',')[0];
    const [d, tm] = hour.split(' '); const [y, mo, da] = d.split('.').map(Number); const hh = +tm.split(':')[0];
    const t0 = Date.UTC(y, mo - 1, da, hh);
    for (let i = 2; i < L.length; i++) { const p = L[i].split(','); if (p.length < 3) continue; T.push(t0 + +p[0]); B.push(+p[1]); A.push(+p[2]); }
  }
  return { T: Float64Array.from(T), B: Float64Array.from(B), A: Float64Array.from(A), n: T.length };
}
const Pt = s => { const [d, t] = s.split(' '); const [y, m, dd] = d.split('.').map(Number); const [h, mi, se] = t.split(':').map(Number); return Date.UTC(y, m - 1, dd, h, mi, se); };
export function realTrades(file) {
  const ds = JSON.parse(fs.readFileSync(file, 'utf8')).deals.slice().sort((a, b) => Pt(a.time) - Pt(b.time) || a.ticket - b.ticket);
  const q = [], tr = [];
  for (const d of ds) {
    if (d.entry === 'IN') { q.push(d); continue; }
    const want = d.type === 'BUY' ? 'SELL' : 'BUY'; const k = q.findIndex(o => o.type === want); if (k < 0) continue;
    const o = q.splice(k, 1)[0];
    tr.push({ side: o.type === 'BUY' ? 1 : -1, ot: Pt(o.time), ct: Pt(d.time), op: o.price, cp: d.price, pl: d.profit });
  }
  return tr;
}
const DEF = { D: 0.5, SL: 0.5, TS: 0.3, TD: 0.3, ema: 100, tf: 1, slipIn: 0, slipOut: 0, wait: 0, upd: 0, fast: 0, xSpread: 0, flipAfter: 0, flipMin: 15, comm: 0, lot: 0.01, from: 0, to: 9e15, label: '' };
export function run(X, cfgIn) {
  const C = Object.assign({}, DEF, cfgIn); const k = 2 / (C.ema + 1); const tfMs = C.tf * 60000;
  let barId = -1, lastClose = null, ema = null, sigClose = null, sigEma = null;
  let side = 0, pend = null, pos = null, lastCt = -1e18; const trades = [];
  let lossRun = 0, lossSide = 0, flipSide = 0, flipUntil = 0;
  const val = 100 * C.lot; // $ per $1 move (gold contract 100)
  for (let i = 0; i < X.n; i++) {
    const t = X.T[i], b = X.B[i], a = X.A[i] + C.xSpread;
    const id = Math.floor(t / tfMs);
    if (id !== barId) { if (lastClose !== null) { ema = ema === null ? lastClose : ema + k * (lastClose - ema); sigClose = lastClose; sigEma = ema; } barId = id; }
    lastClose = b;
    if (t < C.from || t > C.to || sigEma === null) continue;
    let want = sigClose > sigEma ? 1 : -1;
    if (flipSide && t < flipUntil) want = flipSide; else flipSide = 0;
    if (pos) {
      const s = pos.s;
      if (s > 0) { if (b > pos.best) pos.best = b; if (pos.best - pos.e >= C.TS) pos.sl = Math.max(pos.sl, pos.best - C.TD); if (b <= pos.sl) close(pos.sl - C.slipOut, t); }
      else { if (a < pos.best) pos.best = a; if (pos.e - pos.best >= C.TS) pos.sl = Math.min(pos.sl, pos.best + C.TD); if (a >= pos.sl) close(pos.sl + C.slipOut, t); }
      continue;
    }
    if (t - lastCt < C.wait * 1000) continue;
    if (!pend || pend.s !== want) pend = { s: want, px: want > 0 ? b + C.D : a - C.D, ut: t, et: t };
    const canUpd = t - pend.ut >= C.upd * 1000; if (canUpd) pend.ut = t;
    if (pend.s > 0) { if (canUpd && b + C.D < pend.px) { pend.px = b + C.D; pend.et = t; }
      if (a >= pend.px && C.fast && t - pend.et > C.fast * 1000) { pend.px = b + C.D; pend.et = t; }
      else if (a >= pend.px) { const e = Math.max(a, pend.px) + C.slipIn; pos = { s: 1, e, sl: e - C.SL, best: b, ot: t }; pend = null; } }
    else { if (canUpd && a - C.D > pend.px) { pend.px = a - C.D; pend.et = t; }
      if (b <= pend.px && C.fast && t - pend.et > C.fast * 1000) { pend.px = a - C.D; pend.et = t; }
      else if (b <= pend.px) { const e = Math.min(b, pend.px) - C.slipIn; pos = { s: -1, e, sl: e + C.SL, best: a, ot: t }; pend = null; } }
  }
  function close(px, t) { const pl = (px - pos.e) * pos.s * val - C.comm; trades.push({ s: pos.s, ot: pos.ot, ct: t, e: pos.e, x: px, pl });
    if (pl < 0) { if (lossSide === pos.s) lossRun++; else { lossSide = pos.s; lossRun = 1; } } else { lossRun = 0; lossSide = 0; }
    if (C.flipAfter && lossRun >= C.flipAfter) { flipSide = -pos.s; flipUntil = t + C.flipMin * 60000; lossRun = 0; lossSide = 0; }
    pos = null; lastCt = t; }
  return trades;
}
export function stats(tr, hours) {
  let eq = 0, pk = 0, dd = 0, w = 0, gw = 0, gl = 0, hold = [];
  for (const x of tr) { eq += x.pl; pk = Math.max(pk, eq); dd = Math.max(dd, pk - eq); if (x.pl > 0) { w++; gw += x.pl; } else gl -= x.pl; hold.push((x.ct - x.ot) / 1000); }
  hold.sort((a, b) => a - b);
  return { n: tr.length, perHour: hours ? +(tr.length / hours).toFixed(0) : undefined, win: +(w / Math.max(1, tr.length) * 100).toFixed(1), net: +eq.toFixed(2), dd: +dd.toFixed(2),
    pf: +(gw / Math.max(1e-9, gl)).toFixed(2), avgW: +(gw / Math.max(1, w)).toFixed(2), avgL: +(-gl / Math.max(1, tr.length - w)).toFixed(2), holdMed: hold[hold.length >> 1] || 0,
    buy: tr.filter(x => x.s > 0).length, sell: tr.filter(x => x.s < 0).length };
}
if (import.meta.url === 'file://' + process.argv[1]) {
  const X = loadTicks(DIR), R = realTrades(HIST);
  const from = R[0].ot, to = R[R.length - 1].ct, hrs = (to - from) / 3600000;
  const real = R.map(r => ({ s: r.side, ot: r.ot, ct: r.ct, pl: r.pl }));
  console.log('ticks', X.n, 'window', new Date(from).toISOString(), '->', new Date(to).toISOString(), hrs.toFixed(1) + 'h');
  console.log('REAL AurumX', JSON.stringify(stats(real, hrs)));
  const V = JSON.parse(process.argv[4] || '[{"label":"clone default"}]');
  for (const v of V) { const win = v.full ? {} : { from, to }; const tr = run(X, Object.assign({}, win, v)); const h = v.full ? (X.T[X.n - 1] - X.T[0]) / 3600000 : hrs; console.log(v.label.padEnd(28), JSON.stringify(stats(tr, h))); }
}
