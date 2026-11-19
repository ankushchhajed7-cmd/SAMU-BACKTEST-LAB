# Trend Pyramid Rules (schema `samu-strategy/4`, Lab v0.8.0)

Engine: `runPyramid` in `index.html`. Strategy: `strategies/trend-pyramid.json`. Tests: `tests/pyramid.test.js`.
Prices, spread, intrabar path, exact-level fills, gap fills, daily reset: same as `docs/ENGINE-RULES.md`.

## Trend
- `trend.tf` (H1) bars = M1 ka resample (server time). EMA `ema_fast` (50) vs `ema_slow` (200) closes par.
- Sirf **band ho chuka** bar: fast > slow → BUY (1), fast < slow → SELL (−1), EMA ready nahi → 0 (koi trade nahi).

## Entry (koi wait nahi)
1. Koi position nahi + din band nahi + trend ready + ATR ready + spread ok + Friday block nahi → **naye M1 bar ke open pe** trend ki side pehla trade (`lot`).
2. Basket band hote hi agle M1 bar pe turant nayi basket (immediate re-entry).
3. `entry.flip_close_reverse`: khuli basket ki direction ≠ trend → bar open pe sab close (`FLIP`), usi bar pe nayi side ki basket.
4. Basket khulte waqt ka ATR (`atr.tf` M15, `atr.period` 14, SMA = MT5 iATR, last closed bar) basket ke liye fix ho jaata hai.

## Pyramid (profit side)
- BUY: ask ≥ sabse upar entry + `step` → naya BUY. SELL: bid ≤ sabse neeche entry − `step` → naya SELL. Max `max_adds`.
- Har add ke baad poore basket ka SL = last add price − dir × `trail_gap_price` (khaali = step). BUY bid ≤ SL, SELL ask ≥ SL → sab close (`TRAIL`).
- Loss grid ka trade khula ho to pyramid add nahi.

## Pure vs Combo (`loss_levels`)
- **Pure (0):** pehle trade ka SL = entry − dir × ATR × `first_sl_atr` (`SL`).
- **Combo (N > 0):** price SL nahi. Koi pyramid add nahi hua ho aur price ulta ATR × `gap_atr` chale (BUY: ask ≤ sabse neeche entry − gap; SELL: bid ≥ sabse upar entry + gap) → same lot ka grid trade, max N.
  - Grid khula ho aur basket P/L ≥ `recover_usd` → close (`RECOVER`).
  - Basket P/L ≤ −`max_loss_usd` → close (`MAX_LOSS`).

## Basket + daily
- Basket P/L ≥ `basket.tp_usd` → close (`BASKET_TP`). 0 / khaali = off.
- Daily: equity ≥ day-start + `target_usd` → sab close, din band (`DAY_TARGET`); ≤ day-start − `loss_usd` → (`DAY_LOSS`). Din 07:00 IST.
- `filters.friday_close`: Friday `server_time` ke baad bar open pe sab close (`FRIDAY`), Sat/Sun koi basket nahi.
- News filter backtest mein nahi (sirf live EA).

## Check order (har price pe)
daily target → daily loss → basket TP → max loss → recover → SL / trailing → pyramid add → loss grid.

## Presets (`basket.presets`)
Flat override keys: `lot`, `step_price`, `max_adds`, `trail_gap_price`, `tp_usd`, `loss_levels`, `gap_atr`, `recover_usd`, `max_loss_usd`, `first_sl_atr`. Khaali (null) = strategy ka default.

## Dhyan
Step $2–3 gold ke ek M1 candle ($2–4) ke andar aa jaata hai, isliye result intrabar raaste par bahut badalta hai. Step ≥ $8 pe raasta lagbhag farq nahi daalta. Faisla hamesha Worst-case dekh ke.
