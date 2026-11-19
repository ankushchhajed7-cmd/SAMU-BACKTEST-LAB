# SAMU Engine Rules (v0.2.0)

Backtest Lab ka engine in rules pe chalta hai. **SAMU Universal EA ko bhi bilkul yahi rules follow karne hain**, taaki app aur EA ka result same aaye.

## Prices
- MT5 bars **Bid** prices hain. Ask = Bid + spread (spread points × point).
- BUY ask pe khulta hai, bid pe band hota hai. SELL bid pe khulta hai, ask pe band hota hai.
- Spread poore M1 bar ke liye ek hi hota hai (CSV ka `<SPREAD>` ya fixed).
- P/L = Σ dir × (close − open) × lot × contract_size − commission × lot.

## Intrabar path (M1 bar ke andar)
| Mode | Raasta |
|---|---|
| Auto (MT5) | Bull bar (C ≥ O): O→L→H→C · Bear bar: O→H→L→C |
| O→L→H→C / O→H→L→C | Har bar pe wahi |
| Worst-case | Har bar dono raaste chalake, jiska bar-end equity kam ho wo chuna jaata hai |

- Har hissa (jaise O→L) seedhi line maana jaata hai. Engine har us price pe rukta hai jahan koi rule lag sakta hai (TP, SL, trailing, grid level, daily limit) aur **exact usi price** pe fill karta hai.
- Bar ka open pichhle close se alag ho (gap) to fill **open price** pe hota hai (exact level pe nahi).

## Signal
- Supertrend `entry.tf` (M15) pe: M1 bars ko server time ke 15-min blocks mein resample karke.
- ATR: `sma` = MT5 iATR (TR ka simple average, default), `rma` = Wilder/TradingView.
- Standard Supertrend: hl2 ± mult×ATR, final bands pichhle close se carry, trend flip close ke band cross karne pe.
- `use_closed_bar: true`: sirf **band ho chuka** M15 bar (start + 15m ≤ abhi ka M1 bar time).
- `warmup_bars`: shuru ke itne M15 bars pe signal nahi (default 50).

## Basket
1. Koi position nahi + din band nahi + signal ready → **naye M1 bar ke open pe** pehla trade Supertrend ki direction mein (lot table #1).
2. Pehle trade ka TP: BUY → bid ≥ entry + `tp_price`; SELL → ask ≤ entry − `tp_price`.
3. Jab tak sirf 1 trade hai aur uska TP laga hai, **usi side ka grid trade nahi khulta** (`grid_same_side_while_tp: false`). Ulti side ka grid khul sakta hai.
4. Doosra trade khulte hi pehle trade ka TP hat jaata hai.
5. Grid: ask ≥ (sabse upar entry + step) → BUY; bid ≤ (sabse neeche entry − step) → SELL. "Entry" = basket ke saare trades (BUY + SELL) ki open price.
6. Lot = lot table mein basket ki ginti (naya trade = n+1). Max `max_trades`, uske baad sirf TP/SL ka wait.
7. Ek price check pe ek hi grid trade khulta hai. Gap ke baad agla level naye trade se naapa jaata hai.

## Basket close (preset)
Check ka order: daily target → daily loss → basket TP → basket SL → trailing → pehle trade ka TP → grid.
- `tp_usd`: basket P/L ≥ tp → sab close.
- `sl_pct_balance`: basket P/L ≤ −(basket shuru hote waqt ke balance × %) → sab close.
- `trail`: basket P/L ka peak ≥ `start_usd` ho jaaye to, P/L ≤ peak − `drop_usd` hote hi sab close.

## Daily
- Trading day 07:00 IST se shuru (server time = IST − 5:30 + GMT offset).
- Day-start equity = naye din ke pehle M1 bar ke open pe equity (khuli basket ka floating P/L bhi shamil).
- Equity ≥ start × (1 + target%) → sab close, us din aur trade nahi.
- Equity ≤ start × (1 − loss%) → sab close, us din aur trade nahi.
- 07:00 IST reset pe khuli basket chalti rehti hai.

## Not modelled yet
Slippage (sirf spread hai), swap, margin / stop-out, news filter, requotes.
