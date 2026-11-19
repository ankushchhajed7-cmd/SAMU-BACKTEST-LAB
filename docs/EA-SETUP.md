# SAMU Universal EA v1.00 — VPS setup

## 1. Files copy karo (VPS pe)
1. MT5 → **File → Open Data Folder**
2. `MQL5\Experts\` mein daalo: **`SAMU Universal EA v1.00.mq5`** (repo ka `ea/` folder)
3. `MQL5\Files\` mein daalo: **`step-basket.json`** (repo ka `strategies/` folder)
   - App ke Strategy screen se **JSON download** karke bhi daal sakte ho (form mein badli settings ke saath)

## 2. Compile
1. MetaEditor mein `.mq5` kholo → **Compile (F7)**
2. Neeche "Errors" tab mein **0 errors** aana chahiye. Errors aayein to unka **screenshot bhejo**

## 3. Chart pe lagao
1. **XAUUSDm M1** chart kholo (EA ka timeframe M1 hi rakho; Supertrend apne aap M15 se padhta hai)
2. Navigator → Expert Advisors → **SAMU Universal EA v1.00** → chart pe drag
3. Inputs:
   | Input | Default | Matlab |
   |---|---|---|
   | InpStrategyFile | step-basket.json | MQL5\Files mein JSON ka naam |
   | InpCommonFolder | false | true = Common\Files se padhe |
   | InpPreset | (khaali) | A/B/C… likho to JSON ka preset override |
   | InpMagic | 770100 | Har chart/EA ka alag rakho |
   | InpSlippagePts | 50 | Max slippage |
   | InpDashboard | true | Gold Luxe dashboard |
   | InpHidePriceChart | true | Dashboard ke peeche price chart chhupao |
   | InpLogTrades | true | Trade log CSV |
4. **Algo Trading** button ON

## 4. Dashboard
- Upar: EA version, strategy, preset, symbol, magic · IST + server time
- Bada gold number = **Equity**; neeche balance + floating
- Banner: READY / basket chal rahi / DAILY TARGET HIT / LOSS LIMIT / PAUSED / spread high / errors
- Cards: **TREND** (Supertrend), **BASKET** (trades, P/L, peak, SL), **TODAY** (aaj ka P/L), **CYCLE** (basket #, next BUY/SELL level)
- Bars: **TARGET**, **DD OF LIMIT**, **BASKET SL**
- Trade table + **PAUSE / RESUME** aur **CLOSE ALL** buttons
- Config galat ho to banner pe laal **CONFIG ERROR** + wajah (EA trade nahi karega)

## 5. Strategy Tester (app se milane ke liye)
- Expert: SAMU Universal EA v1.00 · Symbol XAUUSDm · Period **M1**
- Model: **"1 minute OHLC"** = app ke **Auto (MT5)** path jaisa · **"Every tick based on real ticks"** = sabse asli
- `step-basket.json` tester apne aap copy karta hai (`#property tester_file`). Doosra naam use karo to `MQL5\Files` mein hona chahiye aur tester ke liye naam `step-basket.json` hi rakho
- Deposit = app ka starting balance (jaise 1000)

## 6. Trade log
- File: `MQL5\Files\SAMU_UEA_trades_<symbol>_<magic>.csv`
  (tester mein: `Tester\Agent-...\MQL5\Files\`)
- Columns app ke **Trades CSV** jaise hi hain → baad mein **Parity screen** isse app se milayega

## 7. Restart safe
Basket #, peak, basket-start balance, day-start equity, day stop aur PAUSE state Global Variables mein save hote hain. VPS restart ke baad EA wahi se chalta hai.
