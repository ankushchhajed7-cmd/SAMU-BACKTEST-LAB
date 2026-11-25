# SAMU GOLD KILLER v1.04 — DD reducer backtest (25 Nov 2026)

**Data:** Exness XAUUSDm M1, 10 Aug – 19 Nov 2026 (101 din), CSV spread ($0.26). Balance $10,000.
**Niyam:** `vps-ea/SAMU GOLD KILLER v1.04.mq5` jaise (BUY + SELL grid, STOP $0.80 trail $0.05, gap $0.80, lot 0.01 × 1.3, side basket +$30, max 22 level, nayi basket sirf 09:00–10:30 + 22:30–00:30 IST). **News filter simulate nahi** (purana calendar nahi).
**Khatam** = equity $0 → us din account saaf; ginti ke liye phir $10k se aage chalaya (`restart`).
M1 candle ke andar price ka raasta (auto / O→L→H→C / O→H→L→C) natije ko bahut badalta hai — $0.80 ke palat ek minute ke andar hote hain; pakka natija tick data se hi.

## Main natije (path = auto)
| Variant | Net | Account khatam | Max DD | Note |
|---|---|---|---|---|
| 1) v1.04 abhi | −$18,086 | **2 baar (11 Aug, 4 Nov)** | 102 % | 11 Aug: gold 2.5 ghante me $50 gira, BUY L21 |
| 2) gap ×1.15 | −$12,612 | 2 | 106 % | |
| 3) lot cap 0.10 | −$25,770 | 3 | 100 % | |
| 4) mult 1.2 | +$30,337 | 0 | 81 % | dusre path par khatam |
| 5) max level 12 | +$15,612 | 0 | 40 % | O→L→H→C path par 2 baar khatam |
| 6) tez move pause $8/15 min | +$8,203 | 1 | 126 % | |
| 7) DD reducer L8 | −$35,912 | 3 | 107 % | basket aur gehri ho jaati |
| 8) equity stop $1,000 | −$12,656 | 1 | 100 % | 35 baar stop |
| 9) 2+3+6+8 combo | +$691 | 0 | 54 % | 16 stop; dusre path −$13,138 |

## Robustness (3 path)
- mult 1.3/1.2 × max level 10/12/14: **har setting kisi na kisi path par account khatam** ya DD 60–100 %.
- Equity stop $1k / $2k (akele ya combo): stop 11–74 baar, net ~0 se −$68k.

## Nateeja
Gold Killer ki kamai "seedhe bade move" ka risk lekar aati hai. 101 din me aise 2 din aaye (11 Aug, 4 Nov) jab v1.04 $10k account saaf kar deta. DD reducer ya to risk nahi rokte (gap, lot cap, reducer, max level bina stop), ya risk rokte hain to kamai khatam (equity stop). Demo par chalao; real par sirf utna paisa jo poora jaa sake.
Pakka natija: 1546 terminal par Watcher v1.11 tick record 2 hafte → tick simulator.

Chalao: `node sim.mjs XAUUSDm_M1.csv.gz '[{"label":"x","restart":true,"mult":1.2,"maxLv":14,"eqStop":1000,"path":"auto"}]'`
