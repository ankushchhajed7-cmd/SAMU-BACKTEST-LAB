# AMC Last Candle — backtest (20 Nov 2026)

**EA:** samusignal `vps-ea/AMC Last Candle v1.00.mq5` (PR #232). **Engine:** Lab `runLastCandle` (schema `samu-strategy/5`, rules `docs/LASTCANDLE-RULES.md`).
**Data:** Exness M1 (INVESTOR-ID `data/m1`), 14 Aug – 19 Nov 2026 (~85 trading din), CSV spread.
**Setup (EA default):** $10,000, lot 0.01, M1, har trade TP $1, 10 ke baad AVG group $1, max 40 / side 25, daily +1% ($100) / −5% ($500), reset 07:00 IST, spread max 30 pts (gold: 400), Friday 22:00 IST stop. Swap aur news filter backtest me nahi.
**Script:** `node research/amc-last-candle/bt.js <data/m1 dir>` → `results.json`. Auto aur Worst-case path ka nateeja same aaya (TP 10 pips door hai, ek M1 bar me raasta farq nahi daalta).

## Net P/L ($10,000 se, 85 din)

| Symbol | A (EA default) | NOAVG (sirf $1 TP) | AVG5 | TP2 ($2) | Max DD (A) |
|---|---|---|---|---|---|
| EURUSD | −$959 | −$692 | −$895 | −$911 | 10.0% |
| GBPUSD | −$572 | −$363 | −$467 | −$578 | 5.9% |
| AUDUSD | −$592 | −$335 | −$482 | −$532 | 6.3% |
| NZDUSD | −$718 | −$386 | −$586 | −$600 | 7.5% |
| USDJPY | −$459 | **+$147** | +$14 | +$38 | 7.9% |
| USDCHF | −$677 | −$304 | −$604 | −$553 | 8.4% |
| USDCAD | −$478 | −$288 | −$445 | −$393 | 5.1% |
| XAUUSD | **−$6,084** | −$6,472 | −$6,223 | −$5,003 | **60.9%** |

EA default (A) **8 me se 8 symbol par minus**.

## Kya hua (preset A)
- **Forex:** TP se kamaya +$400 se +$850 (USDJPY +$1,700), lekin 40 trades atak jaati hain aur unka floating loss −$900 se −$1,700. EA ~**65% samay "MAX TRADES 40"** par ruka rehta hai (nayi trade nahi khulti), aur atki trades wapas nahi aatin.
- Kamaai ~$5–8 / din, target $100 / din: forex par **daily target 85 din me 0–2 baar** hit hua.
- USDJPY / USDCHF par jab target hit hua, tab close-all me atki trades ka loss book hua (−$1,711 / −$868).
- **Gold (XAUUSD):** spread ~250 pts aur $1 TP = sirf $1 move — 86% trades jeet, par 29 din daily loss −$500 hit. −61%.
- AVG group (10 ke baad) forex par nuksaan **badhata** hai: NOAVG har pair par A se behtar raha.

## Nateeja
- Is roop me EA **live / real account ke laayak nahi**. M1 pichhli candle ka rang agle move ka bharosemand signal nahi (lagbhag sikka uchhaalna), aur bina SL ke atki trades ka loss jeet se bada.
- Agar test karna hi ho: sirf DEMO, forex (gold nahi), NOAVG ya AVG band.
- Behtar banane ke idea (abhi test nahi kiye): trend filter (sirf trend ki side), basket SL / max floating loss, TP chhota (5 pips) ya bada TF (M5/M15).
