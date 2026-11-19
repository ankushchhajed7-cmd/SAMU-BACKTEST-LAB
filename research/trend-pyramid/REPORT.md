# Trend Pyramid — pehla Lab backtest (19 Nov 2026)

Data: Exness-MT5Trial17 XAUUSDm M1, 100,000 bars = 10 Aug → 19 Nov 2026 (101 din), CSV spread (median 240 pts = $0.24), balance $1,000, lot 0.01.
Chalaya: `node research/trend-pyramid/bt.js <XAUUSDm_M1.csv.gz> [from] [to]` (engine = index.html).
Rules: H1 EMA 50/200 trend, turant entry, basket TP $15, daily +$30 / −$40, Friday 20:45 close (`docs/PYRAMID-RULES.md`).

## 101 din (Net $ · max DD %)
| Preset | Auto | O→L→H→C | O→H→L→C | Worst |
|---|---|---|---|---|
| PURE_2 | −116 · 45% | −2,435 · 227% | −754 · 90% | −2,939 · 294% |
| PURE_3 | −33 · 35% | −1,321 · 129% | −548 · 60% | −1,806 · 181% |
| COMBO_2 | +47 · 35% | −2,208 · 205% | −480 · 63% | −2,765 · 277% |
| COMBO_3 | +196 · 30% | −1,218 · 121% | −138 · 41% | −1,662 · 167% |
| PURE_10 | +242 · 23% | +242 · 23% | +242 · 23% | +242 · 23% |
| COMBO_8 | +377 · 24% | +279 · 30% | +283 · 26% | +205 · 31% |
| **COMBO_10** | **+534 · 19%** | +534 · 19% | +528 · 20% | **+534 · 19%** |

COMBO_10 (Auto): PF 1.28, basket win 69%, 8.5 trades/din, 49 target din / 22 loss din, max ek basket −$20. Mahine: Aug −53 · Sep +316 · Oct +87 · Nov +185.
Exits: Basket TP 109 (+$1,635), Grid recover 99 (+$297), Max loss 70 (−$1,401), Daily target 49, Daily loss 22, Trailing 21 (−$210).

## Kya seekha
1. **Step $2–3 pe result M1 raaste par tika hai** (Auto plus/thoda minus, Worst −$1,600 se −$2,900). Gold ka ek M1 candle $2–4 chalta hai, tight trailing candle ke andar hi hit ho jaata hai → M1 backtest is setting ko sahi naap hi nahi sakta, aur Worst-case account khatam karta hai. Pehle chat wala Twelve Data M5 test (+$589) isi wajah se galat tha.
2. **Step ≥ $8 pe raasta farq nahi daalta** aur result plus.
3. Do hisse alag (step 6–10 sweep): 10 Aug–10 Oct aur 10 Oct–19 Nov — COMBO step 8/9/10 dono hisson mein har raaste pe plus. Pure 9/10 bhi zyada tar plus.
4. Spread (COMBO_10, Worst): CSV +534 · 300 pts +482 · 400 pts +199 · 500 pts +194. COMBO_8: 205 / 122 / 170 / 55. PURE_10: 242 / 170 / −127 / −4.
5. Aakhri mahina (20 Oct–19 Nov, Worst): COMBO_10 +$369, DD 9%, 21 green / 7 red din.
6. Step $10 + TP $15 pe asal mein "pyramid" kam chalta hai: zyada tar basket = pehla trade + 1 add → TP $15, ya 1–2 grid → recover / −$20. Kamai TP aur grid recover se, nuksaan max-loss (−$20) se.

## Dhyan
- Sirf 101 din ka data, aur step 8–10 data dekh ke chuna gaya (overfit ka risk). Pakka faisla: PAPER forward test + 6 mahine data.
- $1,000 pe DD 19–31% ($190–310). $50 account pe −$20 basket aur −$40 din = account ka bada hissa.
- News filter backtest mein nahi.
