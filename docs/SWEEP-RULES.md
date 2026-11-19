# Liquidity Sweep Engine Rules (v0.7.0)

Strategy: **QUANT PILOT** (Sumedh Kumar, github.com/sumedhkumar/sumedhkumarQP, 15 Nov 2026).
Engine `runSweep` (schema `samu-strategy/3`) unke Python code (`backend/core/strategy.py`, `risk.py`, `paper_engine.py`, `backtest.py`, `agents/analyst.py` mock_decision) ka seedha JS port hai.
Strategy file: `strategies/liquidity-sweep-qp.json`. Tests: `node tests/sweep.test.js`.

## Data
- M1 bars se M5 banta hai (UTC = server − GMT offset, 5 min blocks). M5 volume = M1 **tick volume** ka jod.
- Purana saved data (v0.7.0 se pehle) mein tick volume nahi → "volume spike" bonus nahi milta. Data dobara load karo.

## Cartographer (levels)
Har `levels_refresh_m5_bars` (24 = 2 ghante) M5 bar pe, bar `k` ke liye M5 bars `[k−600, k−3)` se:
- **PDH / PDL**: pichhle UTC din ka high/low (strength 2).
- **ASIA_HIGH / ASIA_LOW**: 00:00–07:00 UTC (aaj ka, ya 07:00 UTC se pehle ho to kal ka), kam se kam 6 bars (strength 1).
- **SWING_4H_HIGH / LOW**: 4H fractal (2 left + 2 right, unique), aakhri 3 (strength 1).
- **EQH / EQL**: aakhri 288 M5 bars ke M15 fractals, aakhri 12 points, ±`eq_tolerance_pips` cluster (≥ 2 points, strength = ginti).
- Same side ke levels tolerance ke andar merge (naam "PDH+ASIA_HIGH", strength jud jaati hai). Price ke order mein.

## Hunter (sweep)
Confirmation (displacement) candle = M5 bar `i`:
- Body ≥ `displacement_mult` × pichhle `body_lookback` bars ki avg body.
- Har level ke liye `j = i, i−1, i−2` (confirm_candles): high level → `high[j] > L`, `close[j−1] < L`, pichhle 7 bars ke high ≤ L; bar `i` bearish aur close < L. Low level mirror.
- Beech mein (j..i−1) koi pehle hi confirm ho chuka ho to skip.
- Depth = wick extreme − L, pips mein (`pip_size` 0.1). `min_depth_pips`..`max_depth_pips` ke bahar → skip.
- Entry = close[i]. SL = extreme ± `sl_buffer_pips`. TP1 = `tp1_rr` × R. TP2 = TP1 se aage pehla ulta-side level jo ≥ `tp2_min_rr` R ho, warna `tp2_min_rr` R.
- Ek level pe ek setup. Signal id = level naam + sweep bar time.

## Analyst (confidence, rule-based)
4 + displacement (≥2× → +2, ≥1.5× → +1) + volume spike (+1, max(vol[j], vol[i]) > 1.5× avg) + level strength ≥ 2 ya merged (+1) + London/NY (+1) + depth 13–22 pips (+1; QUANT PILOT mein fixed 10–25 band). 1–10.

## Guardian (AEGIS) — sab pass ho tabhi trade
Spread ≤ `spread_limit_price` · din ka DD (UTC din, equity) < `daily_dd_kill_pct` · khule trades < `max_open_trades` · RR ≥ `min_rr` · confidence ≥ `min_confidence` · session (`sessions`, UTC: Asian 0–7, London 7–12, NY 12–21) · news hour · same signal dobara nahi + level cooldown `cooldown_min` · lot = equity × risk% / (|entry − SL| × contract), 0.01 step neeche round; min lot ka risk > `max_risk_pct` → veto.

## Management
- 1R pe SL = entry (breakeven).
- TP1 pe aadha lot (0.01 step neeche) band, SL breakeven.
- TP1 ke baad har M5 close pe trailing: SL = close − R (BUY) / close + R (SELL), sirf tight.
- TP2 pe baaki band.

## Do execution modes (preset `exec`)
| | `qp` (preset QP) | `m1` (REAL presets) |
|---|---|---|
| Fill | M5 close (setup price, 2 digit round) | agle M1 bar ka open: BUY ask, SELL bid |
| Spread | 0 (Guardian ko 25 pts maana) | CSV spread (ya fixed) |
| Exits | M5 candle: SL pehle, phir BE/TP1/trail/TP2 | M1 raasta (Auto/O→L→H→C/O→H→L→C/Worst); BUY bid pe, SELL ask pe; gap pe open price |
| RR check | rounded prices (QUANT PILOT bug: kabhi 1.99 → veto) | asli prices |
| Warmup | pehle 300 M5 bars | same |

`qp` mode QUANT PILOT ke `run_backtest` se trade-by-trade match karta hai (19 Nov 2026, Exness XAUUSDm 10 Aug–19 Nov: dono 19 trades, −$463.25).

## Report
Har trade = ek "basket" (n = 1). Days 07:00 IST reset (baaki Lab jaisa); Guardian ka DD din UTC hai (QUANT PILOT jaisa).

## Not modelled
Slippage, swap, commission (0), margin, news calendar, Claude (LLM) Analyst — sirf rule-based score.
