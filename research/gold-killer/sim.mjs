// SAMU GOLD KILLER v1.04 — M1 backtest + DD-reducer variants (SAMU Backtest Lab research).
// Rules = samusignal vps-ea/SAMU GOLD KILLER v1.04.mq5 (HandleSide):
//  BUY side: BUY STOP at ask + D, trails only DOWN (>= TrailStep) ; level k>1 needs want <= lowest BUY open - gap.
//  SELL side mirror. Lot = 0.01 * mult^(k-1). Side basket profit >= TP -> close side. MaxLevels.
//  New basket (count==0) only inside IST sessions 09:00-10:30, 22:30-00:30 (v1.04). News filters NOT simulated.
// Intrabar path from M1 OHLC (bid): bullish O->L->H->C, bearish O->H->L->C ('worst' = against both sides is impossible, so 'ohlc'/'olhc' options).
// Usage: node sim.mjs <XAUUSDm_M1.csv.gz> '[{"label":"x", ...}]'
import fs from 'node:fs';
import zlib from 'node:zlib';

export function loadM1(file, point = 0.001) {
  const L = zlib.gunzipSync(fs.readFileSync(file)).toString('utf8').split(/\r?\n/);
  const t = [], o = [], h = [], l = [], c = [], s = [];
  for (let i = 1; i < L.length; i++) {
    const k = L[i].split('\t'); if (k.length < 6) continue;
    const d = k[0].split('.').map(Number), tm = k[1].split(':').map(Number);
    t.push(Date.UTC(d[0], d[1] - 1, d[2], tm[0], tm[1]) / 1000);
    o.push(+k[2]); h.push(+k[3]); l.push(+k[4]); c.push(+k[5]); s.push((+(k[8] || 0)) * point);
  }
  return { t, o, h, l, c, s, n: t.length };
}

const DEF = {
  D: 0.80, gap: 0.80, step: 0.05, lot0: 0.01, mult: 1.3, tp: 30, maxLv: 22, balance: 10000,
  sessions: [[540, 630], [1350, 30]], useTime: true, offsetH: 0, path: 'auto', slip: 0,
  // DD reducers
  gapMult: 1.0,      // 1) gap grows: gap_k = gap * gapMult^(k-1)
  lotCap: 0,         // 2) max lot per order
  fastMove: 0, fastMin: 15,  // 5) pause new levels if (high-low) over last fastMin minutes >= fastMove $
  reducerFrom: 0, reducerMin: 1.0, // 6) DD reducer from level N: close newest+oldest when sum >= reducerMin $
  eqStop: 0,         // 7) total floating <= -eqStop $ -> close all baskets
  outLvCap: 0,       // 10) session ke bahar khuli basket max itne level tak hi (0 = off)
  startRange: 0, startMin: 30, // 11) nayi basket tabhi jab pichhle startMin minute ka range < startRange $
  deep: null,        // 9) Step 1 (owner): basket gehri (>= fromLv) -> GK levels band; bounce STOP (D door, trail) se ek badi trade (lot),
                     //    max 'max' bounce trades (gap 'bgap' $); side ka kul >= tp -> band; kul <= -hard -> band.
  rec: null,         // 8) Strategy 2 (recovery) eqStop ke baad: {lot, sl, trail, tStart, maxMin, pauseGK}
                     //    move ki disha me (jis side ki basket doobi uski ULTI) market trade, SL $sl, profit >= tStart par trail $trail,
                     //    band jab: loss wapas (target) / SL / maxMin minute.
  label: ''
};

export function run(M, cfg) {
  const C = Object.assign({}, DEF, cfg);
  const side = [mk(1), mk(-1)];
  function mk(d) { return { d, pos: [], pend: null, deep: false, nb: 0 }; }
  let deepCloses = 0, hardCloses = 0;
  let bal = C.balance, peakEq = C.balance, maxDD = 0, maxDDpct = 0, worstFloat = 0;
  const baskets = []; let eqStops = 0, reducerCloses = 0;
  const ist = t => ((Math.floor((t + C.offsetH * -3600 + 19800) / 60) % 1440) + 1440) % 1440;
  const inSess = m => C.sessions.some(([a, b]) => a <= b ? (m >= a && m < b) : (m >= a || m < b));
  const lotAt = k => { let x = Math.round(C.lot0 * Math.pow(C.mult, k - 1) * 100) / 100; if (C.lotCap) x = Math.min(x, C.lotCap); return Math.max(0.01, x); };
  const gapAt = k => C.gap * Math.pow(C.gapMult, Math.max(0, k - 2));
  const val = (p, b, a) => p.s > 0 ? (b - p.e) * p.lot * 100 : (p.e - a) * p.lot * 100;
  const sideProfit = (S, b, a) => S.pos.reduce((x, p) => x + val(p, b, a), 0);
  function closeSide(S, b, a, t, why) {
    const pl = sideProfit(S, b, a); bal += pl;
    baskets.push({ d: S.d, n: S.pos.length, lots: S.pos.reduce((x, p) => x + p.lot, 0), pl, t, why });
    S.pos = []; S.pend = null; S.deep = false; S.nb = 0;
  }
  let blown = null, worstT = 0; const blows = []; let pnl = 0;
  let R = null; const recs = [];
  const hiQ = [], loQ = []; // for fastMove window (bar index deque by value)
  for (let i = 0; i < M.n && !blown; i++) {
    const t = M.t[i], sp = M.s[i] || 0.2, o = M.o[i], h = M.h[i], l = M.l[i], c = M.c[i];
    // fast-move window over last fastMin bars (including this bar's range progressively; use previous bars + current)
    let fast = false;
    if (C.fastMove) {
      let hi = -1e9, lo = 1e9; for (let j = Math.max(0, i - C.fastMin + 1); j <= i; j++) { if (M.h[j] > hi) hi = M.h[j]; if (M.l[j] < lo) lo = M.l[j]; }
      fast = hi - lo >= C.fastMove;
    }
    const bull = c >= o;
    const path = C.path === 'ohlc' ? [o, h, l, c] : C.path === 'olhc' ? [o, l, h, c] : bull ? [o, l, h, c] : [o, h, l, c];
    const inS = !C.useTime || inSess(ist(t));
    let calm = true;
    if (C.startRange) { let hi = -1e9, lo = 1e9; for (let j = Math.max(0, i - C.startMin); j < i; j++) { if (M.h[j] > hi) hi = M.h[j]; if (M.l[j] < lo) lo = M.l[j]; } calm = hi - lo < C.startRange; }
    const allow0 = inS && calm;
    for (const b of path) {
      const a = b + sp;
      if (R) {
        const cur = R.d > 0 ? b : a, pl = (cur - R.e) * R.d * R.lot * 100;
        if ((cur - R.e) * R.d > R.best) R.best = (cur - R.e) * R.d;
        if (R.best >= C.rec.tStart) R.sl = Math.max(R.sl, R.best - C.rec.trail);
        const hitSL = (cur - R.e) * R.d <= R.sl;
        const done = pl >= R.target, timeout = C.rec.maxMin && t - R.t0 >= C.rec.maxMin * 60;
        if (hitSL || done || timeout) {
          const ex = hitSL ? R.e + R.d * R.sl : cur; const fpl = (ex - R.e) * R.d * R.lot * 100;
          bal += fpl; recs.push({ pl: fpl, why: hitSL ? 'SL' : done ? 'TARGET' : 'TIME', t }); R = null;
        }
      }
      for (const S of side) {
        if (R && C.rec.pauseGK && S.pos.length === 0) { S.pend = null; continue; }
        // basket TP
        if (S.pos.length && !S.deep && sideProfit(S, b, a) >= C.tp) { closeSide(S, b, a, t, 'TP'); continue; }
        if (C.deep && S.pos.length) {
          const P = C.deep, prof = sideProfit(S, b, a);
          if (!S.deep && S.pos.length >= P.fromLv) { S.deep = true; S.pend = null; }
          if (S.deep) {
            if (prof >= P.tp) { closeSide(S, b, a, t, 'DEEP_TP'); deepCloses++; continue; }
            if (P.hard && prof <= -P.hard) { closeSide(S, b, a, t, 'HARD'); hardCloses++; continue; }
            if (S.nb >= P.max) continue;
            const want = S.d > 0 ? a + P.D : b - P.D;
            const ext = S.d > 0 ? Math.min(...S.pos.map(p => p.e)) : Math.max(...S.pos.map(p => p.e));
            const ok = w => S.d > 0 ? w <= ext - P.bgap : w >= ext + P.bgap;
            if (!S.pend) { if (ok(want)) S.pend = { px: want, k: -1 }; }
            else if ((S.d > 0 ? want <= S.pend.px - C.step : want >= S.pend.px + C.step) && ok(want)) S.pend.px = want;
            if (S.pend && (S.d > 0 ? a >= S.pend.px : b <= S.pend.px)) {
              const e = S.d > 0 ? Math.max(a, S.pend.px) + C.slip : Math.min(b, S.pend.px) - C.slip;
              S.pos.push({ s: S.d, e, lot: P.lot }); S.pend = null; S.nb++;
            }
            continue;
          }
        }
        // DD reducer
        if (C.reducerFrom && S.pos.length >= C.reducerFrom) {
          const newest = S.pos[S.pos.length - 1], oldest = S.pos[0];
          if (val(newest, b, a) + val(oldest, b, a) >= C.reducerMin) { bal += val(newest, b, a) + val(oldest, b, a); S.pos.pop(); S.pos.shift(); reducerCloses++; }
        }
        // pending handling
        const k = S.pos.length + 1;
        const blocked = (C.maxLv && S.pos.length >= C.maxLv) || (S.pos.length === 0 && !allow0) || (fast && S.pos.length > 0) || (C.outLvCap && !inS && S.pos.length >= C.outLvCap);
        if (blocked) { S.pend = null; continue; }
        const want = S.d > 0 ? a + C.D : b - C.D;
        const ext = S.pos.length ? (S.d > 0 ? Math.min(...S.pos.map(p => p.e)) : Math.max(...S.pos.map(p => p.e))) : null;
        const gapOk = w => ext === null || (S.d > 0 ? w <= ext - gapAt(k) + 1e-9 : w >= ext + gapAt(k) - 1e-9);
        if (!S.pend) { if (gapOk(want)) S.pend = { px: want, k }; }
        else if (S.pend.k !== k) S.pend = null;
        else {
          const better = S.d > 0 ? want <= S.pend.px - C.step + 1e-9 : want >= S.pend.px + C.step - 1e-9;
          if (better && gapOk(want)) S.pend.px = want;
        }
        // fill
        if (S.pend) {
          const hit = S.d > 0 ? a >= S.pend.px : b <= S.pend.px;
          if (hit) { const e = S.d > 0 ? Math.max(a, S.pend.px) + C.slip : Math.min(b, S.pend.px) - C.slip; S.pos.push({ s: S.d, e, lot: lotAt(k) }); S.pend = null; }
        }
      }
      // equity
      const fl = side.reduce((x, S) => x + sideProfit(S, b, a), 0);
      if (fl < worstFloat) { worstFloat = fl; worstT = t; }
      if (C.eqStop && fl <= -C.eqStop) {
        const loser = side.map(S => ({ d: S.d, p: sideProfit(S, b, a) })).sort((x, y) => x.p - y.p)[0];
        for (const S of side) if (S.pos.length) closeSide(S, b, a, t, 'EQSTOP'); eqStops++;
        if (C.rec && !R) { const d = C.rec.revert ? loser.d : -loser.d; const e = d > 0 ? a : b; R = { d, e, lot: C.rec.lot, sl: -C.rec.sl, best: 0, target: -fl, t0: t }; }
      }
      const eq = bal + side.reduce((x, S) => x + sideProfit(S, b, a), 0);
      if (eq > peakEq) peakEq = eq;
      const dd = peakEq - eq; if (dd > maxDD) { maxDD = dd; maxDDpct = dd / peakEq * 100; }
      if (eq <= C.balance * (C.stopOutPct || 0) / 100 || eq <= 0) {
        for (const S of side) if (S.pos.length) closeSide(S, b, a, t, 'BLOWN');
        blows.push(t);
        if (!C.restart) { blown = t; break; }
        pnl += bal - C.balance; bal = C.balance; peakEq = C.balance;   // naya $10k, ginti jaari
      }
    }
  }
  const last = M.n - 1, b = M.c[last], a = b + (M.s[last] || 0.2);
  const openPL = side.reduce((x, S) => x + sideProfit(S, b, a), 0);
  pnl += bal - C.balance;
  return { bal, openPL, pnl, blows, recs, deepCloses, hardCloses, maxDD, maxDDpct, worstFloat, worstT, blown, baskets, eqStops, reducerCloses };
}

export function summary(r, C, M) {
  const months = {};
  for (const x of r.baskets) { const k = new Date(x.t * 1000).toISOString().slice(0, 7); months[k] = (months[k] || 0) + x.pl; }
  const days = (M.t[M.n - 1] - M.t[0]) / 86400;
  const tp = r.baskets.filter(x => x.why === 'TP');
  return {
    net: +(r.pnl + r.openPL).toFixed(0), blowups: r.blows.length, blowDates: r.blows.map(x => new Date(x * 1000).toISOString().slice(5, 10)), maxDD: +r.maxDD.toFixed(0), maxDDpct: +r.maxDDpct.toFixed(1), worstFloat: +r.worstFloat.toFixed(0),
    baskets: r.baskets.length, perDay: +(r.baskets.length / days).toFixed(1), maxLevel: Math.max(0, ...r.baskets.map(x => x.n)), maxLots: +Math.max(0, ...r.baskets.map(x => x.lots)).toFixed(2),
    blown: r.blown ? new Date(r.blown * 1000).toISOString().slice(0, 16) : null, worstAt: r.worstT ? new Date(r.worstT * 1000).toISOString().slice(0, 16) : null,
    eqStops: r.eqStops, reducer: r.reducerCloses, deepTP: r.deepCloses, hard: r.hardCloses, recN: (r.recs||[]).length, recNet: +((r.recs||[]).reduce((x, y) => x + y.pl, 0)).toFixed(0), recWin: (r.recs||[]).filter(x => x.pl > 0).length, worstBasket: +Math.min(0, ...r.baskets.map(x => x.pl)).toFixed(0),
    months: Object.fromEntries(Object.entries(months).map(([k, v]) => [k, +v.toFixed(0)]))
  };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const M = loadM1(process.argv[2] || 'XAUUSDm_M1.csv.gz');
  const V = JSON.parse(process.argv[3] || '[{"label":"v1.04 abhi"}]');
  for (const v of V) { const C = Object.assign({}, DEF, v); console.log(v.label.padEnd(34), JSON.stringify(summary(run(M, v), C, M))); }
}
