# QUAD Basket — engine rules (v0.6.0)

Strategy file: `strategies/quad-basket.json` (schema `samu-strategy/2`, type `portfolio`).
Backtest Lab ka engine (`runQuad`) inhi rules pe chalta hai. **QUAD ke 4 live EA aur QUAD TESTER EA ko bhi bilkul yahi rules follow karne hain**, taaki app aur EA ka result same aaye.

Prices, spread, intrabar path (Auto / O→L→H→C / O→H→L→C / Worst-case) aur "exact price pe fill" — sab `ENGINE-RULES.md` jaisa.

## Modules (4 EA)
Har EA ka apna magic (7001–7004). Indicators M1 se resample karke banate hain, sirf **band ho chuke** bar ka value (start + tf ≤ abhi ka M1 bar time).
Signal wali entries sirf **naye M1 bar ke open** pe.

### EA-1 GRID (`modules.grid`)
1. Koi GRID trade nahi → turant **BUY + SELL** (`lot`), anchor = us waqt ka bid.
2. Step = `step_price`; agar ATR filter "tez market" bole to `step_price_high_atr`. Step grid shuru hote waqt fix hota hai.
3. Bid ≥ anchor + step × (k+1) → naya **SELL** (upar wala level). Bid ≤ anchor − step × (k+1) → naya **BUY**. Har side max `max_per_side`, har level ek baar.
4. GRID ka khula P/L ≤ −`loss_cap_usd` → saare GRID trades close (`CAP`), GRID us din band.
5. **Lock** (v0.6.2, `lock_close`, default on): dono side `max_per_side` bhar gaye → GRID hedge mein phans jaata hai (P/L hilta nahi, cycle din/hafton atka rehta) → saare GRID trades close (`LOCK`), agle M1 bar se naya grid.

### EA-2 MARTI (`modules.marti`)
1. Trend = `trend_tf` ka band close vs EMA(`trend_ema`): upar = uptrend, neeche = downtrend.
2. `tf` (M5) ke band bar pe Bollinger(`bb_period`, `bb_dev`, population stdev):
   uptrend + low ≤ lower band → **BUY**; downtrend + high ≥ upper band → **SELL**. Ek bar pe ek hi signal.
3. Price `step_price` ulta jaaye (BUY: ask ≤ last entry − step; SELL: bid ≥ last + step) → agla lot `lots[k]`. Max `lots` ki ginti.
4. Khula P/L ≤ −`loss_cap_usd` → MARTI close (`CAP`), us din band.
5. ATR "tez market" ho to naya MARTI sequence shuru nahi hota.

### EA-3 PYRAMID (`modules.pyramid`)
1. Trend = `trend_tf` (M15) band close vs EMA(`trend_ema`).
2. `tf` (M5) ke band bar pe: uptrend + low ≤ EMA(`ema`) + close > EMA → **BUY**; downtrend + high ≥ EMA + close < EMA → **SELL**.
3. Pehle trade ka SL = entry ∓ `sl_price`.
4. Profit wali taraf `add_step_price` (BUY: ask ≥ last + step; SELL: bid ≤ last − step) → ek aur `lot` (max `max_trades`). `breakeven_on_add` → saare PYRAMID trades ka SL = sabka average entry price.
5. SL hit → wo trade(s) close (`SL`). Us din ka PYRAMID band P/L ≤ −`day_loss_cap_usd` → PYRAMID us din band.

### EA-4 BREAKOUT (`modules.breakout`)
1. Sirf `from`–`to` IST ke beech. Har naye `tf` (H1) bar pe: pichhle band H1 ka high = **Buy Stop**, low = **Sell Stop** (range ≥ `min_range_price`, aur abhi ka price range ke andar ho).
2. Buy Stop: ask ≥ high → BUY; Sell Stop: bid ≤ low → SELL. Ek chala to doosra delete. Agle H1 bar pe purane pending hat ke naye lagte hain (agar koi BREAKOUT trade khula nahi hai).
3. SL = entry ∓ `sl_price`. Din ka band P/L ≤ −`day_loss_cap_usd` → us din band.

## Common exit (cycle)
- **Cycle P/L** = is cycle mein band hue saare trades ka P/L (SL, CAP sab) + abhi khule saare trades ka P/L.
- Cycle P/L ≥ `exit.cycle_tp_usd` (+$10) → chaaro EA ke saare trades close (`CYCLE_TP`), pending delete, saare EA reset. Naya cycle agle M1 bar se.
- Cycle P/L ≤ −`exit.cycle_sl_usd` → sab close (`CYCLE_SL`), naya cycle.
- Cycle tab shuru hota hai jab us cycle ka pehla trade khulta hai.

## DD control (account equity, day-start equity base)
Check ka order har price pe: daily target → hard stop → peak → freeze → cycle TP → cycle SL → EA caps → GRID lock → SL → pending → GRID / MARTI / PYRAMID levels.
- **Daily target**: equity ≥ day start × (1 + `daily.target_pct`%) → sab close, din band.
- **Hard stop**: equity ≤ day start × (1 − `daily.loss_pct`%) → sab close, din band.
- **Peak protection**: equity ≤ highest equity × (1 − `dd.peak_pct`%) → sab close. Live EA mein PAUSE (haath se RESUME); backtest mein us din band, peak = tab ka balance.
- **Freeze**: equity ≤ day start × (1 − `dd.freeze_pct`%) → GRID aur MARTI naye level / naya start nahi karte. PYRAMID aur BREAKOUT chalte rehte hain.
- Naya din 07:00 IST: EA ke "us din band" flags aur din ka loss reset. Khule trades chalte rehte hain.

## Filters (sirf nayi entry pe)
- `max_total_trades`: chaaro EA milake itne se zyada khule trades nahi.
- `max_spread_points` (0 = off).
- `atr`: `tf`(`period`) ATR > `high_price` = tez market (GRID ka bada step, MARTI start band).
- `friday_stop`: Friday `time` IST ke baad (aur Sat/Sun) naya start / pending nahi.
- News filter: abhi **backtest mein nahi** (live EA mein hoga).

## Presets
`basket.presets` = kaun se EA chalu. `ALL` + har EA ko ek-ek karke OFF (`NO_GRID` …). Matrix / Compare se pata chalta hai kaun sa EA basket ki madad kar raha hai.

## Not modelled yet
Slippage, swap, margin / stop-out, news filter, requotes.
