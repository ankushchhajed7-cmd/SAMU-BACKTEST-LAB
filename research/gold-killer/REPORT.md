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

## 25 Nov — "Strategy 2": $1,000 DD par basket band, phir recovery trade (owner idea)
`rec` option: equity stop ke baad ek market trade (GK nayi basket ruki rehti), SL $sl, profit $tStart par trail $trail, band: loss wapas / SL / maxMin.

| Strategy 2 | Disha | Path auto | O→L→H→C | O→H→L→C |
|---|---|---|---|---|
| sirf stop (koi S2 nahi) | – | −$12,656 (35 stop) | −$46,970 | −$47,103 |
| 0.30 lot, SL $5 | move ke saath | S2 −$1,280 | −$4,579 | −$3,370 |
| 0.50 lot, SL $8 | move ke saath | S2 −$2,946 | −$8,747 | −$3,754 |
| 1.00 lot, SL $3 | move ke saath | S2 −$5,070 | −$12,661 | −$11,780 |
| 0.30 lot, SL $5 | **ulta (bounce)** | S2 **+$1,339** (30/35 jeet) | +$1,860 | +$3,289 |
| 0.50 lot, SL $8 | **ulta (bounce)** | S2 **+$2,292** (24/35) | +$7,783 | +$5,720 |

Nateeja: move ke saath wali recovery har path par minus. Bounce wali recovery plus hai (60–85 % jeet), par stop ka sirf ~5–15 % wapas laati hai — 101 din me 35–77 stop × $1,000 ke saamne chhoti. Kul natija phir bhi minus. Asli dikkat: basket bahut baar −$1,000 tak jaati hai.

## 25 Nov — Step 1: gehri basket me "bounce" trade (stop ki jagah)
`deep` option: basket `fromLv` level tak pahunche → GK ke naye level band; BUY basket ke liye BUY STOP (price se D door, peeche chalta) se ek badi trade (`lot`), max 2, pichhle se `bgap` $2 door; side ka kul ≥ `tp` → band; kul ≤ −`hard` → band.
48 setting × 3 path (auto / O→L→H→C / O→H→L→C). Top (sabse bura path sabse achha):

| Setting | Net (3 path) | Account khatam | Max DD % | Hard stop |
|---|---|---|---|---|
| v1.04 abhi (tulna) | −$18,086 / −$10,261* / −$10,169* | 2 / 1 / 1 | 100+ | – |
| **L8, lot 0.2, D $2, tp $15, hard $4k** | **+$5,096 / +$2,437 / +$10,695** | **0** | 46 / 90 / 50 | 5 / 7 / 5 |
| L6, lot 0.2, D $1, tp $5, hard $4k | +$13,959 / +$2,217 / +$4,508 | 0 | 33 / 59 / 85 | 2 / 6 / 5 |
| L6, lot 0.2, D $1, tp $15, hard $4k | +$12,292 / −$2,778 / −$3,567 | 0 | 39 / 77 / 79 | 3 / 8 / 8 |
| bounce lot 0.5 wale | zyadatar minus | 2–7 | ~100 | 7–11 |
| hard $2k wale | minus | 3+ | ~100 | 13–18 |
(*pehle bina restart wale run.)

Nateeja: chhoti bounce trade (0.2) + hard $4k se 3 path par account khatam nahi hua aur net plus — v1.04 se behtar. Par DD abhi bhi bada (hard stop $4k 5–7 baar / 101 din) aur 48 me se sabse achha chuna gaya hai (overfit ka khatra). Tick data aur demo par aage jaanch zaroori.

## 25 Nov — time + news ke alawa aur "care"
Time filter sirf NAYI basket rokta hai; khuli basket bahar bhi level jodti hai. 11 Aug wali basket 09:00 IST (session) me shuru hui, gold 11:20 IST tak $50 gira. 4 Nov: din ka range $152.
| Niyam | Net (3 path) | Khatam | DD % | Baskets (101 din) |
|---|---|---|---|---|
| v1.04 abhi | −$18,086 / −$57,967 / +$23,623 | 2/8/2 | 100+ | 626 |
| A) session ke bahar max 8 level | +$1,367 / −$45,216 / −$38,379 | 2/7/5 | 62–115 | 610 |
| **B) nayi basket tabhi jab pichhle 30 min ka range < $5** | **+$9,715 / +$18,173 / +$12,022** | **0/0/0** | 36–62 | 136 |
| B range < $4 | +$5,082 / +$8,632 / +$3,875 | 0/0/0 | 27–96 | 48 |
| B range < $6 | +$16,469 / +$184 / +$20,926 | 0/1/0 | 49–102 | 234 |
| B range < $7 / $8 | ek path par −$31k / −$67k | 4 / 6 | 100+ | 329 / 396 |
| B $6 + deep bounce | +$9,933 / −$726 / +$6,366 | 0/0/0 | 25–59 | 234 |
`startRange`, `startMin`, `outLvCap` options in sim.mjs. B $5: har mahina plus (auto path). DD ab bhi 36–62 % — basket shuru hone ke baad ka bada move abhi bhi khatra.
