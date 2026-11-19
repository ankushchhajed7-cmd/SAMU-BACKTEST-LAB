// SAMU AI PRO research backtest: SAMUSIGNAL AI engine (analyze) on Exness M1 data, AI AUTO EA rules.
// Engine only (no Gemini). Usage: node bt.mjs <dataDir> [variant json]
import fs from 'node:fs';
import zlib from 'node:zlib';
// engine: SAMUSIGNAL-AI repo ka src/engine.js (ENGINE env ya default path)
const E = await import(process.env.ENGINE || '/home/claude/ankushchhajed7-cmd/samusignal-ai/src/engine.js');

const DIR = process.argv[2] || '/tmp/fxdata';
const PAIRS = ['EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD','AUDUSD','NZDUSD','EURJPY','EURGBP','EURCHF','EURCAD','EURAUD','EURNZD',
  'GBPJPY','GBPCHF','GBPCAD','GBPAUD','GBPNZD','AUDJPY','AUDCHF','AUDCAD','AUDNZD','NZDJPY','NZDCHF','NZDCAD','CADCHF','CADJPY','CHFJPY'];

export function loadPair(n) {
  const f = fs.readdirSync(DIR).find(x => x.toUpperCase().startsWith(n) && x.endsWith('_M1.csv.gz'));
  if (!f) return null;
  const meta = JSON.parse(fs.readFileSync(DIR + '/' + f.replace('.csv.gz', '.json')));
  const L = zlib.gunzipSync(fs.readFileSync(DIR + '/' + f)).toString().split(/\r?\n/);
  const N = L.length; const t = new Float64Array(N), o = new Float64Array(N), h = new Float64Array(N), l = new Float64Array(N), c = new Float64Array(N), s = new Float64Array(N);
  let k = 0;
  for (let i = 1; i < N; i++) { const p = L[i].split('\t'); if (p.length < 6) continue; const d = p[0].split('.'), tm = p[1].split(':');
    t[k] = Date.UTC(+d[0], d[1] - 1, +d[2], +tm[0], +tm[1]) / 1000; o[k] = +p[2]; h[k] = +p[3]; l[k] = +p[4]; c[k] = +p[5]; s[k] = +(p[8] || 0); k++; }
  const pt = meta.point || Math.pow(10, -meta.digits);
  return { n, sym: meta.symbol, digits: meta.digits, pt, pip: n.endsWith('JPY') ? 0.01 : 0.0001, t: t.subarray(0, k), o: o.subarray(0, k), h: h.subarray(0, k), l: l.subarray(0, k), c: c.subarray(0, k), s: s.subarray(0, k), size: k };
}
function bars(P, sec) { // closed bars with start time
  const out = []; let cur = null;
  for (let i = 0; i < P.size; i++) { const b = Math.floor(P.t[i] / sec) * sec;
    if (!cur || cur.t !== b) { cur = { t: b, o: P.o[i], h: P.h[i], l: P.l[i], c: P.c[i] }; out.push(cur); }
    else { if (P.h[i] > cur.h) cur.h = P.h[i]; if (P.l[i] < cur.l) cur.l = P.l[i]; cur.c = P.c[i]; } }
  return out;
}
const DEF = { tpUsd: 0.25, slUsd: 1.50, engineSLTP: false, rr: null, grades: 'AB', topN: 5, windows: true, maxLoss: 4, target: 3, curBlock: true,
  trendRecheck: true, maxSprUsd: 0.20, pendMin: 60, fillBarTP: false, from: 0, to: 9e12, label: '' };

export function run(D, cfgIn) {
  const C = Object.assign({}, DEF, cfgIn);
  const names = Object.keys(D);
  // USD per 1.0 price per 1 lot, by quote ccy, from live rates
  const rate = (pair, T) => { const P = D[pair]; if (!P) return null; let lo = 0, hi = P.size - 1; if (P.t[0] > T) return P.c[0];
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (P.t[m] <= T) lo = m; else hi = m - 1; } return P.c[lo]; };
  const DEF_R = { JPY: 1 / 155, CHF: 1 / 0.80, CAD: 1 / 1.38, GBP: 1.31, EUR: 1.10, AUD: 0.66, NZD: 0.58, USD: 1 };
  const quoteUsd = (q, T) => { if (q === 'USD') return 1;
    const a = rate(q + 'USD', T); if (a) return a; const b = rate('USD' + q, T); if (b) return 1 / b; return DEF_R[q]; };
  const S = {};
  for (const n of names) { const P = D[n]; S[n] = { P, b15: bars(P, 900), b1h: bars(P, 3600), i15: 0, i1h: 0, im: 0, ord: null }; }
  // timeline of 15m slots
  let t0 = Infinity, t1 = 0; for (const n of names) { t0 = Math.min(t0, D[n].t[0]); t1 = Math.max(t1, D[n].t[D[n].size - 1]); }
  t0 = Math.max(Math.ceil(t0 / 900) * 900 + 86400 * 4, Math.ceil(C.from / 900) * 900); t1 = Math.min(t1, C.to);
  const trades = []; const day = {}; const istDay = T => Math.floor((T + 19800) / 86400);
  const inWin = T => { if (!C.windows) return true; const m = Math.floor(((T + 19800) % 86400) / 60); return (m >= 420 && m < 1020) || (m >= 1200 && m < 1320); };
  const ema21 = b => { const cl = b.map(x => x.c); return E.ema(cl, 21); };
  const flipped = (st, dir) => { const b = st.b15; const k = st.i15; if (k < 30) return false; const sl = b.slice(Math.max(0, k - 80), k); const e = ema21(sl); const L = sl.length - 1;
    const c = sl[L].c; return dir > 0 ? (c < e[L] && e[L] < e[L - 1]) : (c > e[L] && e[L] > e[L - 1]); };
  const dstate = T => { const k = istDay(T); return day[k] || (day[k] = { pl: 0, losses: 0, stop: false, blk: new Set() }); };
  for (let T = t0; T < t1; T += 900) {
    // 1) signals at slot T
    const cands = [];
    for (const n of names) { const st = S[n];
      while (st.i15 < st.b15.length && st.b15[st.i15].t + 900 <= T) st.i15++;
      while (st.i1h < st.b1h.length && st.b1h[st.i1h].t + 3600 <= T) st.i1h++;
      while (st.im < st.P.size && st.P.t[st.im] < T) st.im++;
      if (st.ord || st.i15 < 120 || st.i1h < 70) continue;
      if (st.im === 0 || T - st.P.t[st.im - 1] > 600) continue; // market closed
      const b15 = st.b15.slice(st.i15 - 150, st.i15), b1h = st.b1h.slice(Math.max(0, st.i1h - 150), st.i1h);
      const live = st.P.c[st.im - 1];
      let sig; try { sig = E.analyze({ b15, b1h, live, spec: { d: st.P.digits, pip: st.P.pip }, now: T * 1000 }); } catch (e) { continue; }
      const dir = sig.dir === 'BUY' ? 1 : -1, al = Math.sign(sig.t15) === dir && Math.sign(sig.t1h) === dir;
      if (!C.grades.includes(sig.grade) || !al) continue;
      const far = Math.abs(sig.live - sig.entry) / (sig.atr || 1);
      const score = (sig.grade === 'A' ? 3 : 2) + 2 + Math.min(3, Math.abs(sig.t15) + Math.abs(sig.t1h)) / 2 - Math.min(2, far) / 2 + (sig.smart && sig.smart.type !== 'LIMIT' ? 0.5 : 0);
      cands.push({ n, sig, dir, score });
    }
    cands.sort((a, b) => b.score - a.score);
    const ds = dstate(T);
    for (const cd of cands.slice(0, C.topN)) {
      const st = S[cd.n]; const { sig, dir } = cd;
      if (!inWin(T) || ds.stop) continue;
      const b6 = cd.n.slice(0, 3), q6 = cd.n.slice(3);
      if (C.curBlock && (ds.blk.has(b6) || ds.blk.has(q6))) continue;
      if (C.trendRecheck && flipped(st, dir)) continue;
      const k = 100000 * quoteUsd(q6, T);
      let tpD, slD;
      if (C.engineSLTP) { slD = Math.abs(sig.entry - sig.sl); tpD = slD * (C.rr || 1); }
      else { tpD = C.tpUsd / (k * 0.01); slD = C.slUsd / (k * 0.01); }
      const spr = st.P.s[st.im - 1] * st.P.pt;
      if (C.maxSprUsd && spr * k * 0.01 > C.maxSprUsd + 1e-9) continue;
      const bid = st.P.c[st.im - 1], ask = bid + spr, entry = sig.entry;
      if (dir > 0 ? entry >= ask : entry <= bid) continue;
      st.ord = { n: cd.n, dir, entry, tp: entry + dir * tpD, sl: entry - dir * slD, at: T, exp: T + C.pendMin * 60, filled: false, k, grade: sig.grade, fib: sig.fibX, score: cd.score };
    }
    // 2) walk minutes T..T+900 for all orders, chronological
    const act = names.filter(n => S[n].ord);
    if (!act.length) continue;
    const ev = [];
    for (const n of act) { const st = S[n]; let j = st.im; while (j < st.P.size && st.P.t[j] < T + 900) { ev.push([st.P.t[j], n, j]); j++; } }
    ev.sort((a, b) => a[0] - b[0]);
    for (const [tm, n, j] of ev) { const st = S[n], o = st.ord; if (!o) continue; const P = st.P;
      const spr = P.s[j] * P.pt, bH = P.h[j], bL = P.l[j], aH = bH + spr, aL = bL + spr;
      if (!o.filled) {
        if (tm >= o.exp) { st.ord = null; continue; }
        if (C.trendRecheck && tm % 900 === 0 && flipped(st, o.dir)) { st.ord = null; continue; }
        const fill = o.dir > 0 ? aL <= o.entry : bH >= o.entry;
        if (!fill) continue;
        o.filled = true; o.ft = tm;
        if (C.invert) { const d0 = o.dir; o.dir = -d0; const tpD = Math.abs(o.tp - o.entry), slD = Math.abs(o.sl - o.entry);
          o.entry = d0 > 0 ? o.entry - spr : o.entry + spr; // BUY-limit level hit -> SELL at bid (= ask - spr); SELL-limit level -> BUY at ask
          o.tp = o.entry + o.dir * tpD; o.sl = o.entry - o.dir * slD; }
        const slHit = o.dir > 0 ? bL <= o.sl : aH >= o.sl;
        if (slHit) { close(st, o, o.sl, tm, 'SL'); continue; }
        if (C.fillBarTP) { const tpHit = o.dir > 0 ? bH >= o.tp && P.c[j] >= o.entry : aL <= o.tp && P.c[j] <= o.entry; if (tpHit) { close(st, o, o.tp, tm, 'TP'); } }
        continue;
      }
      const slHit = o.dir > 0 ? bL <= o.sl : aH >= o.sl, tpHit = o.dir > 0 ? bH >= o.tp : aL <= o.tp;
      if (slHit) close(st, o, o.sl, tm, 'SL'); else if (tpHit) close(st, o, o.tp, tm, 'TP');
    }
    for (const n of act) { const st = S[n]; while (st.im < st.P.size && st.P.t[st.im] < T + 900) st.im++; }
  }
  function close(st, o, px, tm, r) {
    const pl = (px - o.entry) * o.dir * o.k * 0.01;
    trades.push({ n: o.n, dir: o.dir, at: o.at, ft: o.ft, ct: tm, pl, r, grade: o.grade, fib: o.fib });
    st.ord = null;
    const ds = dstate(tm); ds.pl += pl;
    if (pl < 0) { ds.losses++; ds.blk.add(o.n.slice(0, 3)); ds.blk.add(o.n.slice(3)); if (C.maxLoss && ds.losses >= C.maxLoss) ds.stop = true; }
    if (C.target && ds.pl >= C.target) ds.stop = true;
  }
  return trades;
}

export function summary(tr, label) {
  tr.sort((a, b) => a.ct - b.ct);
  let eq = 0, pk = 0, dd = 0; const w = tr.filter(x => x.pl > 0);
  for (const x of tr) { eq += x.pl; pk = Math.max(pk, eq); dd = Math.max(dd, pk - eq); }
  const gw = w.reduce((s, x) => s + x.pl, 0), gl = -tr.filter(x => x.pl <= 0).reduce((s, x) => s + x.pl, 0);
  const days = new Set(tr.map(x => Math.floor((x.ct + 19800) / 86400))).size;
  return { label, trades: tr.length, perDay: +(tr.length / Math.max(1, days)).toFixed(1), win: +(w.length / Math.max(1, tr.length) * 100).toFixed(1),
    net: +eq.toFixed(2), maxDD: +dd.toFixed(2), pf: +(gw / Math.max(1e-9, gl)).toFixed(2), avgW: +(gw / Math.max(1, w.length)).toFixed(2), avgL: +(gl / Math.max(1, tr.length - w.length)).toFixed(2) };
}
export function groupBy(tr, f) { const g = {}; for (const x of tr) { const k = f(x); (g[k] || (g[k] = [])).push(x); }
  return Object.entries(g).map(([k, v]) => Object.assign({ k }, summary(v))).sort((a, b) => b.net - a.net); }
export { PAIRS };
