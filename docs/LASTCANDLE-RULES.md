# AMC Last Candle — engine rules (schema `samu-strategy/5`)

Engine: `runLastCandle` in `index.html` (`<script id="engine">`). EA: samusignal `vps-ea/AMC Last Candle v1.00.mq5`. Dono ke rules same hone chahiye.

## Entry
- `last_candle.tf` (default M1) ka naya candle shuru hote hi, us candle ke **pehle M1 bar ke open** par (EA: pehle 30 sec me) pichhli band candle dekho:
  close > open = **BUY**, close < open = **SELL**, |close − open| ≤ `min_body_points` ya close = open = **skip (doji)**.
- Ek candle = ek trade, lot `lot` (preset `lot` override).
- BUY ask pe (bid + spread), SELL bid pe khulta hai.

## TP
- Har single trade: TP = open ± `tp_usd` / (lot × contract × conv). BUY: bid ≥ TP. SELL: ask ≤ TP.
- conv = 1 (`pnl: quote_usd`, jaise EURUSD, XAUUSD) ya 1 / price (`pnl: base_usd`, jaise USDJPY; backtest me bar ke open ka price).
- **AVG group:** naya trade khulne se pehle, agar usi side ki single (group me nahi) trades ≥ `avg_after` (> 0) hain, to wo sab ek group: common TP = lot-weighted average price ± `avg_tp_usd` / (kul lot × contract × conv). Group ka koi bhi member TP chhuye to poora group band. Banne ke waqt hi group TP ke paar ho to turant band (profit ≥ $avg_tp_usd).
- Uske baad naya trade phir apne alag TP ke saath. Har baar `avg_after` atki singles hone par naya group.

## Rokne wale niyam (nayi trade nahi)
Order: doji → din band → Friday/weekend → spread → max trades → max per side.
- Spread > `filters.max_spread_points` (0 = off).
- Khuli trades ≥ `limits.max_trades`, ya us side ki ≥ `limits.max_per_side`.
- `filters.friday_stop`: Friday `time` IST ke baad, Saturday, Sunday, Monday `monday_from` IST se pehle.
- News filter sirf EA me (MT5 calendar), backtest me nahi.

## Daily
- Din = `reset_time` IST se agle `reset_time` IST tak. Base = din shuru hone ka **balance**.
- Aaj ka P/L = equity − din shuru ki equity (sirf is strategy ki trades).
- Check order har price pe: daily loss → daily target → TP.
- P/L ≤ −`loss_pct`% → sab band, din band. P/L ≥ +`target_pct`% → `target_close_all` ho to sab band; din band (nayi trade nahi). Target ke baad bhi loss check chalta hai.

## Model
- M1 OHLC, intrabar path Auto (green bar O→L→H→C, red O→H→L→C) / O→L→H→C / O→H→L→C / Worst-case. CSV ya fixed spread. TP exact level pe fill (gap me bar open pe).
- Swap, slippage, news nahi. Commission `costs.commission_per_lot` (TP me jud jaata hai).
- Data khatam: khuli trades `END` pe band.
