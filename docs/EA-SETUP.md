# SAMU Universal EA v1.03 — VPS setup

## 0. VPS Helper (automatic)
EA ki file `samusignal` repo ke `vps-ea/` folder mein, main branch pe hai. **SamuSignal VPS Helper** 2 min mein use VPS ke har MT5 terminal ke `MQL5\Experts` mein daal ke compile kar deta hai. Compile ka result: SamuSignal app → **COPY tab → VPS Helper**.
Helper JSON copy nahi karta — `MQL5\Files\step-basket.json` na ho to EA **built-in Step Basket** settings se chalta hai (dashboard banner batata hai). Apni settings chahiye to neeche step 1.3 se JSON daalo.

## 1. Files copy karo (haath se, agar helper nahi)
1. MT5 → **File → Open Data Folder**
2. `MQL5\Experts\` mein daalo: **`SAMU Universal EA v1.03.mq5`** (repo ka `ea/` folder)
3. `MQL5\Files\` mein daalo: **`step-basket.json`** (repo ka `strategies/` folder)
   - App ke Strategy screen se **JSON download** karke bhi daal sakte ho (form mein badli settings ke saath)

## 2. Compile
1. MetaEditor mein `.mq5` kholo → **Compile (F7)**
2. Neeche "Errors" tab mein **0 errors** aana chahiye. Errors aayein to unka **screenshot bhejo**

## 3. Chart pe lagao
1. **XAUUSDm M1** chart kholo (EA ka timeframe M1 hi rakho; Supertrend apne aap M15 se padhta hai)
2. Navigator → Expert Advisors → **SAMU Universal EA v1.03** → chart pe drag
3. Inputs:
   | Input | Default | Matlab |
   |---|---|---|
   | **InpLiveTrading** | **false** | **false = PAPER**: virtual trades, broker ko koi order nahi. true = asli trade |
   | InpStrategyFile | step-basket.json | MQL5\Files mein JSON ka naam |
   | InpCommonFolder | false | true = Common\Files se padhe |
   | InpPreset | (khaali) | A/B/C… likho to JSON ka preset override |
   | InpMagic | 770100 | Har chart/EA ka alag rakho |
   | InpSlippagePts | 50 | Max slippage |
   | InpDashboard | true | Gold Luxe dashboard |
   | InpHidePriceChart | true | Dashboard ke peeche price chart chhupao |
   | InpLogTrades | true | Trade log CSV |
   | InpOwnMode | true | Daily % aur basket SL sirf is EA ke trades se (purane account ke liye) |
   | InpAllocBalance | 1000 | Own mode: daily % aur basket SL % ka base ($) — dashboard pe P/L sirf is EA ka |
   | InpAllocFrom | 0 | Own mode: realized P/L kab se gine (0 = pehli baar chalne se) |
   | InpMinMarginLevel | 300 | Margin level is % se neeche ho to nayi trade nahi (0 = off) |
4. **Algo Trading** button ON

## 3a. PAPER mode (default, v1.03)
- `InpLiveTrading = false` → EA live chart pe poore rules se chalta hai lekin trades **virtual** hain: broker ko koi order nahi, account ka balance / margin nahi badalta.
- Dashboard: **PAPER P/L**, banner "PAPER …". Paper trades ka log: `MQL5\Files\SAMU_UEA_paper_<symbol>_<magic>.csv` (app ke Trades CSV jaise columns).
- Paper P/L = bid/ask spread ke saath, slippage nahi.
- Purane version ki koi **asli** trade (same magic) khuli ho to banner batata hai — EA use nahi chhoota, haath se band karo.
- Strategy Tester mein hamesha normal (simulated) orders, taaki tester report bane.
- Asli trading: `InpLiveTrading = true` (khud badalna padega).

## 3b. Purane account pe (doosre EAs ke saath)
- **InpOwnMode = true** (default). EA ka apna balance = `InpAllocBalance` + is EA ka band trades ka P/L. Daily +1% / −5% aur basket SL 1% isi se naapte hain → doosre EAs ka profit / loss asar nahi karta.
- **Margin guard**: trade ke baad account margin level `InpMinMarginLevel` (300%) se neeche jaaye to nayi trade nahi (banner pe dikhega). Doosre EAs ka margin safe.
- **Magic clash**: magic 770100 pe kisi aur EA / symbol ki trade (khuli ya 30 din ki history) mili to EA trade nahi karega, banner pe laal error → InpMagic badlo.
- EA sirf apne magic + symbol ke trades chhoota hai; CLOSE ALL bhi sirf apne.
- Account **Hedging** hona chahiye.
- Dhyan: margin guard se grid trade ruki to basket app ke backtest se alag chalegi.

## 4. Dashboard
- Upar: EA version, strategy, preset, symbol, magic · IST + server time
- Bada number = **EA P/L** (sirf is EA ke trades: band + khuli basket, `Since` date se); neeche band trades, khuli basket, margin level. Doosre EAs ka P/L yahan nahi aata
- PAUSE / CLOSE ALL buttons upar daayein
- High-DPI laptop / chhoti height pe khud scale + compact (table / info chhup jaate hain). Badi jagah ke liye Toolbox band karo (Ctrl+T) ya chart maximize
- Banner: base > account equity warning / READY / basket chal rahi / DAILY TARGET HIT / LOSS LIMIT / PAUSED / spread high / errors
- Cards: **TREND** (Supertrend), **BASKET** (trades, P/L, peak, SL), **TODAY** (aaj ka P/L), **CYCLE** (basket #, next BUY/SELL level)
- Bars: **TARGET**, **DD OF LIMIT**, **BASKET SL**
- Trade table + **PAUSE / RESUME** aur **CLOSE ALL** buttons
- Config galat ho to banner pe laal **CONFIG ERROR** + wajah (EA trade nahi karega)

## 5. Strategy Tester (app se milane ke liye)
- Expert: SAMU Universal EA v1.03 · Symbol XAUUSDm · Period **M1**
- Model: **"1 minute OHLC"** = app ke **Auto (MT5)** path jaisa · **"Every tick based on real ticks"** = sabse asli
- `step-basket.json` tester apne aap copy karta hai (`#property tester_file`). Doosra naam use karo to `MQL5\Files` mein hona chahiye aur tester ke liye naam `step-basket.json` hi rakho
- Deposit = app ka starting balance (jaise 1000)

## 6. Trade log
- File: `MQL5\Files\SAMU_UEA_trades_<symbol>_<magic>.csv`
  (tester mein: `Tester\Agent-...\MQL5\Files\`)
- Columns app ke **Trades CSV** jaise hi hain → baad mein **Parity screen** isse app se milayega

## 7. Restart safe
Basket #, peak, basket-start balance, day-start equity, day stop aur PAUSE state Global Variables mein save hote hain. VPS restart ke baad EA wahi se chalta hai.
