# STATE — SAMU Backtest Lab

## Current version
**v0.8.1** (branch `feature-v0.8.1`), 19 Nov 2026 — Trend Pyramid $10k (lot 0.03) strategy file

## EA
**SAMU Universal EA v1.04** — Friday stop + news filter; VPS Helper se VPS pe (samusignal `vps-ea/`), strategy JSON bhi Helper v1.06 se (`vps-files/step-basket.json` = Step Basket $10 FINAL). Setup: `docs/EA-SETUP.md`

## Version history
| Version | Date | Kya aaya |
|---|---|---|
| v0.8.1 | 19 Nov 2026 | **Trend Pyramid $10k (0.03)**: Ankush ka account $10,000, lot **0.03** (Ankush ka faisla). `strategies/trend-pyramid-10k.json` = 0.01 file ka ×3 (TP $45, recover $9, max loss −$60, daily +$90 / −$120), default COMBO_10, balance $10k. Strategy screen pe **Trend Pyramid $10k (0.03)** button. Test: 10k net = 3 × base (31 tests). `bt.js` mein `STRAT` env |
| v0.8.0 | 19 Nov 2026 | **Trend Pyramid engine** (`runPyramid`, schema `samu-strategy/4`): H1 EMA 50/200 trend ki side **turant entry** (koi wait nahi, basket band hote hi agle M1 bar pe nayi), profit side har step pe add (max 5), har add ke baad SL = last add − trail gap, pure mode pehla SL ATR(M15)×1.5, combo mode loss grid (ATR×1, max 2, recover +$3, max loss −$20), basket TP $15, daily +$30 / −$40 ($), trend flip close + reverse, Friday 20:45 close. `strategies/trend-pyramid.json` (7 presets: PURE_2/3/10, COMBO_2/3/8/10, default COMBO_10, balance $1000), Strategy screen pe **Trend Pyramid** button + form (preset ke step/trail/grid/TP), Run/Report pe Exits + adds card, HTML report. `docs/PYRAMID-RULES.md`, `tests/pyramid.test.js` (29), `research/trend-pyramid/` (bt.js + REPORT.md) |
| v0.7.0 | 19 Nov 2026 | **Liquidity Sweep engine** (`runSweep`, schema `samu-strategy/3`): Sumedh Kumar ke QUANT PILOT repo (github.com/sumedhkumar/sumedhkumarQP) ki strategy ka JS port — levels (PDH/PDL, Asia, 4H swing, EQH/EQL), sweep + displacement, rule-based confidence, Guardian (1% risk, max 2, DD 4%, London/NY, cooldown), BE 1R / TP1 50% / trailing / TP2. Presets: **REAL** (M1 fill + CSV spread), **QP** (unka apna backtester, trade-by-trade match), REAL_ALLDAY, REAL_CONF6. `strategies/liquidity-sweep-qp.json` (`default_balance` 10000 → button se load pe RUN balance $10k), Strategy screen pe **Liquidity Sweep (QUANT PILOT)** button + form, Run/Report pe Guardian + exits card, HTML report mein sweep trades (level, confidence). CSV loader ab **tick volume** bhi rakhta hai (`ds.v`, IndexedDB mein bhi). `docs/SWEEP-RULES.md`, `tests/sweep.test.js` (25). Header version fix (v0.6.4 dikh raha tha) |
| v0.6.7 | 19 Nov 2026 | **QUAD cancel** (gold + US30 dono par loss). **SAMU AI PRO research** (`research/samu-ai-pro/`): SAMUSIGNAL AI engine ka 28 forex pair backtest (Exness M1, 13 Aug–19 Nov). AI AUTO niyam engine-only: 861 trade, 77.6 % win, −$122.5 (0.01 lot) — break-even 85.7 %. Har TP/SL variant minus. Live AI AUTO 72/74 (97 %) lekin sirf 12–19 Nov (usi hafte engine-only 84.6 %). Report: `research/samu-ai-pro/REPORT.md` |
| v0.6.6 | 19 Nov 2026 | **SAMU Universal EA v1.04**: `filters.friday_stop` (Friday time IST ke baad + weekend nayi basket nahi) + `filters.news` (MT5 calendar High news ± min, sirf live/paper). Banner + info line. `step-basket.json` mein `friday_stop` (off) + EA built-in same. Docs EA-SETUP v1.04. VPS: samusignal `vps-ea/` + Helper v1.06 `vps-files/step-basket.json` (= FINAL) |
| v0.6.5 | 19 Nov 2026 | **Step Basket $10 FINAL** (`strategies/step-basket-10-final.json`): lot table, basket SL 5% ($500), daily target 1% / loss 5%, Friday 14:00 IST (`filters.friday_stop`), news on (backtest mein nahi). Test: 1 mahine +$1,122 · 101 din +$1,138, DD 6.8%. SL $2000 test (20%) alag se: 101 din +$1,243, DD 8.6% — FINAL mein nahi. Lot table abhi owner ka confirm pending |
| v0.6.4 | 19 Nov 2026 | **Step Basket $10** (`strategies/step-basket-10.json` lot table, `step-basket-10-fixed.json` 0.01): pehla trade Supertrend, koi TP nahi, $5 step (neeche SELL / upar BUY), basket +$10, basket SL 5%, daily target 1%, max 20 trades. Step Basket engine mein **Friday stop** (`filters.friday_stop`, IST) + test + form fields. Buttons **Step $10 (lot table)** / **Step $10 (0.01)**. Fix: nayi strategy load hone par RUN ka preset us strategy ka apna (pehle pichhli strategy ka B reh jaata tha) |
| v0.6.3 | 19 Nov 2026 | `strategies/quad-basket-set-c.json` + **QUAD Set C** button. Settings Ankush ne Sheet "QUAD Set B — Settings + aapke badlav" (claude.ai artifact) ke peele column mein bhari |
| v0.6.2 | 19 Nov 2026 | **GRID lock** (`modules.grid.lock_close`, default on): dono side max level bhar jaayein to GRID close (`LOCK`) — pehle hedge mein phans kar mahino atka rehta tha (Set B ka pehla +5% isi bug ki wajah se nakli tha). Naya **`strategies/quad-basket-set-b.json`** + Strategy screen pe **QUAD Set B** button. Form mein "Lock pe close". 2 naye tests |
| v0.6.1 | 19 Nov 2026 | DATA screen pe **⬇ GitHub se Data**: INVESTOR-ID repo ke `data/m1/<SYMBOL>_M1.json` + `.csv.gz` (raw.githubusercontent, gzip → DecompressionStream) → wahi CSV loader; server GMT offset meta se apne aap. Data INVESTOR-ID v1.13 ka **Scan → 📥 M1 Data lao** banata hai (GitHub Actions + MT5 investor login). Symbol yaad rehta hai |
| v0.6.0 | 19 Nov 2026 | **QUAD Basket** (`strategies/quad-basket.json`, schema `samu-strategy/2` portfolio): 4 EA — GRID (BUY+SELL, $3 levels), MARTI (H1 EMA trend + M5 Bollinger, 0.01→0.04), PYRAMID (M15 EMA trend + M5 EMA20, profit pe add, SL breakeven), BREAKOUT (H1 high/low stop orders 13:30–23:30 IST). Common exit: cycle ka band + khula P/L = +$10. DD: EA-wise caps, cycle SL $150, freeze −1%, hard stop −2%, peak −4%, max 20 trades, ATR/Friday filters. Presets = EA on/off (ALL, NO_GRID…). Run/Report pe **EA-wise P/L** table + Trades/din; Trades CSV mein `ea` column; Compare mein Trades/din. Strategy screen: **QUAD Basket (4 EA)** button + QUAD form. Rules: `docs/QUAD-RULES.md`. Tests: `tests/quad.test.js` (25) |
| EA v1.03 | 19 Nov 2026 | **PAPER mode (default)**: `InpLiveTrading = false` → virtual positions (bid/ask se P/L, OrderCalcProfit), broker ko koi order nahi; restart-safe (GV); paper trades CSV `SAMU_UEA_paper_*.csv`; dashboard PAPER P/L + banner; purani asli trade (same magic) ho to warning. Tester mein hamesha normal orders. Ankush: is account pe sirf testing, koi asli trade nahi chahiye |
| EA v1.02 | 19 Nov 2026 | Dashboard theek: v1.01 laptop (150% DPI, chhoti height) pe bahut chhota + overlap tha. Ab DPI factor (dpi/96) + min scale 0.8 + compact layout (info / table jagah na ho to chhupte hain), panels / bars dikhte rang. Bada number = **EA P/L** (sirf is EA: band trades since + khuli basket), $1000 / account equity hataye (Ankush: doosre EA ka +/- bhi dikh raha tha). Base > account equity ho to warning (trade nahi rokta). Buttons upar daayein |
| EA v1.01 | 19 Nov 2026 | Purane account pe safe: **Own P/L mode** (InpOwnMode, InpAllocBalance $1000, InpAllocFrom) — daily % + basket SL sirf is EA ke trades se; **margin guard** (InpMinMarginLevel 300%); **magic clash check** (khuli + 30 din history); dashboard pe EA equity, account equity, margin level. Ankush: VPS pe nayi account ki jagah nahi → purane $1000 account pe lagayenge |
| EA v1.00 | 19 Nov 2026 | `ea/SAMU Universal EA v1.00.mq5`: JSON parser (MQL5\Files), same engine rules, Supertrend (SMA/RMA, closed bar), grid + lot table, presets TP/SL/trailing, TP1 (broker + virtual), daily target/loss 07:00 IST, spread/time filters, built-in strategy fallback (JSON file na ho to), restart-safe state (Global Variables), trade log CSV (app ke Trades CSV jaisa), Gold Luxe dashboard (DPI scale, PAUSE / CLOSE ALL, CONFIG ERROR banner). `tests/ea-config.test.js`, `docs/EA-SETUP.md` |
| v0.5.1 | 19 Nov 2026 | Header mein ⟳ Refresh button: app cache saaf + latest version + reload (data safe). Refresh ke baad toast ("Update ho gaya: purana → naya"). Offline pe refresh nahi. Service worker ab browser HTTP cache bypass karta hai (`no-cache`) |
| v0.5.0 | 19 Nov 2026 | Strategy form editor (30 fields, 8 groups): general, Supertrend, pehla trade TP, grid, lot table (row add/delete + auto-fill N/start/badhat), basket preset (TP/SL/trailing on-off, naya preset copy, preset hatao), daily, costs & filters. Har change turant apply + validate + save; Run screen ke presets bhi update |
| v0.4.0 | 19 Nov 2026 | Compare screen: saved runs list (max 24, duplicate check, select/remove), equity overlay (% return), side-by-side 23 metrics (best green / worst red), mahine-wise P/L per run, warnings (alag range/balance/strategy), Compare HTML export. Report pe "+ Compare", Matrix pe "Sab Compare mein daalo" (Worst-case rows auto-select). Engine `snapshot()` + 3 tests |
| v0.3.0 | 19 Nov 2026 | Report screen: 18 stats (PF, win rate, expectancy, recovery, avg/largest win-loss, streaks, worst floating, green/red days, best/worst day), equity + drawdown % chart, mahine-wise P/L (+total), din-wise P/L (7 AM IST, month filter, TARGET/LOSS stop), baskets/trades list (50/page). Export: HTML report (self-contained, strategy JSON included), trades CSV, daily CSV. Matrix row tap → uska report. Last run reload ke baad bhi bacha rehta hai. Engine `report()` + 5 tests |
| v0.2.0 | 19 Nov 2026 | Engine: M1 OHLC simulation, intrabar path Auto/O→L→H→C/O→H→L→C/Worst-case, CSV ya fixed spread, Supertrend (SMA/RMA ATR, closed bar), Step Basket A/B/C, daily target/loss, 07:00 IST reset. RUN screen (summary, equity, close reasons, last 30 baskets) + A/B/C × path matrix. `docs/ENGINE-RULES.md` |
| v0.1.0 | 19 Nov 2026 | PWA shell (Gold Luxe theme), MT5 M1 CSV loader (UTF-16/UTF-8, tab/comma/semicolon, header ya bina header), Data screen (stats, mahine-wise coverage, gaps, spread, chart), Strategy screen (JSON load/upload/edit/download, validation, A/B/C preset switch), offline service worker, `strategies/step-basket.json` |

## Files
| File | Kaam |
|---|---|
| `index.html` | Poora app (single file) |
| `manifest.json` | PWA install info |
| `sw.js` | Offline cache (network-first, cache fallback) |
| `strategies/step-basket.json` | Step Basket strategy (schema `samu-strategy/1`) |
| `strategies/quad-basket.json` | QUAD Basket 4-EA portfolio (schema `samu-strategy/2`) |
| `docs/QUAD-RULES.md` | QUAD engine ke exact rules (4 EA + TESTER EA parity) |
| `strategies/liquidity-sweep-qp.json` | Liquidity Sweep (QUANT PILOT) strategy (schema `samu-strategy/3`) |
| `docs/SWEEP-RULES.md` | Liquidity Sweep engine ke exact rules + QP/REAL modes |
| `strategies/trend-pyramid.json` | Trend Pyramid strategy (schema `samu-strategy/4`), $1000 / 0.01 |
| `strategies/trend-pyramid-10k.json` | Trend Pyramid, $10,000 / 0.03 (Ankush ka live setup) |
| `docs/PYRAMID-RULES.md` | Trend Pyramid engine ke exact rules |
| `tests/pyramid.test.js` | Trend Pyramid tests (`node tests/pyramid.test.js`) |
| `research/trend-pyramid/` | Trend Pyramid backtest script + REPORT.md |
| `tests/sweep.test.js` | Sweep engine tests (`node tests/sweep.test.js`) |
| `tests/quad.test.js` | QUAD engine tests (`node tests/quad.test.js`) |
| `CLAUDE.md` | Kaam ke rules (agle sessions ke liye) |
| `docs/ENGINE-RULES.md` | Engine ke exact rules (EA parity ke liye) |
| `ea/SAMU Universal EA v1.04.mq5` | Universal EA |
| `docs/EA-SETUP.md` | EA VPS setup, tester, log |
| `tests/ea-config.test.js` | EA ke JSON keys = strategy file (`node tests/ea-config.test.js`) |
| `tests/engine.test.js` | Engine rule tests (`node tests/engine.test.js`, 24 tests) |
| `icons/icon-192.png`, `icons/icon-512.png` | App icons |

## Working rules
- 5-step loop: Discuss → Plan → Build → Verify → GitHub push
- Har build naye branch `feature-vX.Y.Z` pe; main pe kabhi direct push nahi
- **(19 Nov 2026 se) Jo version build + test pass ho jaaye, use bina confirmation PR bana ke main mein merge karna.** Test fail ho ya koi decision baaki ho to merge nahi, pehle Ankush ko batana
- Har push ke saath STATE.md update; files chat mein bhi bhejna
- Jawab Hinglish, mobile ke liye chhote, end mein date + time (IST)
- **App standard (19 Nov 2026 se, har nayi app ke liye):** header mein shuru se hi **⟳ Refresh button** (cache saaf + latest version + reload, data safe) aur **version number** dikhna chahiye
- EA standard: full-screen Gold Luxe dashboard, EA file naam = poora naam + version

## Settings / conventions
- Broker: Exness, symbol XAUUSDm, server GMT+0, point 0.001, contract 100 (0.01 lot pe $1 move = $1)
- IST = server + 5:30. Trading day = 07:00 IST se agle 07:00 IST tak
- Bar times app mein **server time** mein store hote hain (MT5 jaisa)
- Data browser ke IndexedDB mein save rehta hai (reload pe dobara upload nahi)
- Gold daily break (~1h, 20:00–23:59 UTC ke beech shuru) aur weekend gaps "missing" mein count nahi hote

## Decisions (Step Basket)
1. Supertrend (M15, ATR 10, ×3.0, closed bar) sirf **pehle trade** ki direction decide karta hai
2. Pehla trade TP $5 price; doosra trade khulte hi TP hat jaata hai
3. Grid $5: sabse neeche entry se $5 neeche SELL, sabse upar entry se $5 upar BUY
4. Lot table: 1–3 = 0.01, 4–6 = 0.02, 7–9 = 0.03, 10–12 = 0.04; max 12, uske baad sirf TP/SL ka wait
5. Basket presets (on/off pieces):
   - **A**: TP +$10, SL nahi, trailing nahi
   - **B**: SL 1% (basket start ka balance), trailing +$10 start / $5 drop
   - **C**: TP +$10 + SL 1%
   - Final choice data se: teeno ko Worst-case path pe compare karenge
6. Daily target 1% / loss 5% (day-start equity). Hit → sab close, us din band, 07:00 IST reset
7. Reset ke waqt khuli basket chalti rahegi (`open_basket_at_reset: keep`)
8. Swap/commission = 0 (Phase 1)
9. (v0.2.0) Jab tak sirf pehla trade hai aur uska TP laga hai, usi side ka grid trade nahi khulta. Warna spread ki wajah se +$5 pe TP se pehle naya BUY khul jaata aur TP kabhi hit nahi hota
10. (v0.2.0) Nayi basket sirf naye M1 bar ke open pe khulti hai (EA bhi yahi karega)
11. (v0.2.0) Supertrend ATR = SMA (MT5 iATR) default; `rma` option. (19 Nov: Ankush ne default = SMA confirm kiya)
15. (EA v1.03) Default PAPER mode — live chart pe sirf virtual trades; asli trade sirf InpLiveTrading = true se (Ankush ka faisla: backtest / testing account pe koi asli trade nahi)
14. (EA v1.00) EA strategy JSON `MQL5\Files\step-basket.json` se padhta hai (Common folder optional). Config galat ho to live chart pe CONFIG ERROR banner, tester mein init fail
12. (v0.2.0) Max DD = floating equity (bar ke low tak) pe, closed-equity peak se
13. (v0.3.0) Din ka P/L = agle din ki start equity − is din ki start equity (floating shamil), isliye saare din jod ke = net. Mahina = trading day (IST, 7 AM) ka mahina

## Decisions (QUAD Basket, 19 Nov 2026)
1. 4 alag EA, ek common exit: cycle ka **band + khula** P/L = +$10 → chaaro ke saare trades close (Ankush: closed trades bhi gine jaayein)
2. Symbol XAUUSDm, account $10,000. DD control sabse pehli priority, trades din bhar aate rahein (target 30+/din)
3. EA set Claude ne final kiya: GRID + trend-filtered MARTI + PYRAMID (anti-martingale) + H1 BREAKOUT — har market mein kam se kam 2 EA profit mein
4. Cycle SL $150 jodha (v0.6.0): bina iske SL/CAP ka loss cycle mein jamta rehta tha aur cycle din bhar khinchta tha
5. Build ka kram: pehle Lab mein backtest; achha result aaye tabhi 4 live EA + QUAD TESTER EA (PAPER mode default)
6. Synthetic random data pe QUAD loss deta hai (spread ka kharcha) — asli faisla sirf asli XAUUSDm M1 data se

## Step Basket $10 (19 Nov 2026, Ankush ka naya rule)
- Rules: pehla trade (Supertrend M15 direction), $5 neeche → SELL, aur neeche → SELL…; upar wale se $5 upar → BUY. Koi alag TP nahi, sirf basket +$10. Daily target 1% ($10k), basket SL 5%, Friday 14:00 IST ke baad nayi basket nahi, news time avoid (backtest mein news nahi)
- 1 mahina (19 Oct–19 Nov), $10k, Exness CSV spread:
  - **Lot table (0.01×3, 0.02×3, 0.03×3, 0.04 aage), max 20: +$1,111 (+11.1%), DD 4.4%, 147 basket, 97% jeet, 22 trades/din, basket SL 0 baar, 11 target din.** Worst-case same. Spread 300/400 pe bhi +10%
  - 0.01 fixed: −$142 (−1.4%), DD 6.4% — ek basket SL −$510 (6 Nov) ne 1 mahine ki kamai kha li
  - TP $20 (0.01): +6.7% (1 mahina) lekin 101 din −24.9% → nahi
- Lot table, poore 101 din: **+$1,138 (+11.4%)**, DD 6.8%, PF 1.36, 4 basket SL (−$500 ke aaspaas) + 1 daily loss; mahine: 10 Aug–10 Sep −3.2%, 10 Sep–10 Oct +6.6%, 10 Oct–19 Nov +11.9%. Raaste (O→L→H→C / O→H→L→C / Worst) pe bhi +11% se +18%
- Dhyan: sirf 3 mahine ka data; ek basket SL = ~5% ($500). Agla kadam: Universal EA mein Friday stop + PAPER test

## Liquidity Sweep (QUANT PILOT) — pehla backtest (19 Nov 2026)
- Ankush ne Sumedh Kumar ka repo (Python + React "QUANT PILOT", 7 agent, MT5 Windows only) check karwaya, phir Lab mein backtest maanga. Code scan: koi bahar data bhejne wala code nahi (SAFE)
- Data: Exness-MT5Trial17 XAUUSDm M1, 100,000 bars = 10 Aug → 19 Nov 2026 (101 din), $10,000, 1% risk
- **QP preset (unka apna backtester):** 19 trades, **−$463 (−4.6%)**, win 15.8%, PF 0.57, DD 10.3%. Python `run_backtest` se bilkul same 19 trades / −$463.25 (parity OK)
- **REAL (M1 fill + Exness spread):** 28 trades, **−$400 (−4.0%)**, win 21%, PF 0.73, max DD 11.7% ($1,167), lagatar 10 trade bina profit (SL/BE). Mahine: Aug −4.7%, Sep −1.4%, Oct −0.8%, Nov +3.0%. Exits: SL 16 (−$1,457), BE 6, Trailing 4 (+$591), TP2 2 (+$466). 0.32 trades/din. Raaste (Auto/OLHC/OHLC/Worst) se farq nahi
- Spread 0: −3.6% → spread wajah nahi. Session off (Asia bhi): 40 trades −4.1%. Confidence ≥ 6: 34 trades −4.0%, DD 13.1%
- QUANT PILOT ka RR veto bug: rounded prices se RR 1.99 nikalta hai → 18 achhe setups unke backtester mein reject (REAL mein theek kiya, isliye 28 trades)
- Depth 10–25 pips ($1.0–$2.5) unke tests mein gold $2,650 pe socha gaya; abhi gold $3,700–4,600 → sweep window bahut chhota. Agla idea (Ankush ka faisla baaki): depth ko ATR/price ke hisaab se scale karke test

## Trend Pyramid (19 Nov 2026)
- Ankush ne grid EA ke 4 plan mein se Plan 1 (trend grid) + Plan 4 (pyramid) mila ke chuna; shart: EA on hote hi trend ki side turant trade, koi wait nahi. Pure vs combo ka faisla data se
- Ankush (19 Nov): **aage se har backtest is Lab mein hi** (alag chat script nahi)
- 101 din, $1000, CSV spread: **COMBO_10 +$534 (+53%), DD 19%, PF 1.28, chaaro raaste same**; COMBO_8 +$205…+$377; PURE_10 +$242. Step $2–3: Auto ±, Worst −$1,600 se −$2,900 (M1 raasta tight trailing ko naap nahi sakta) → chhota step reject
- Pehle chat ka Twelve Data M5 test (Pure $2 = +$589) galat tha — candle raasta + spread model kamzor. Details: `research/trend-pyramid/REPORT.md`
- **Ankush (19 Nov): account $10,000, lot 0.03.** COMBO_10 (101 din, CSV spread): **+$1,602 (+16.0%), DD $780 (7.0%), worst din −$120, 51 green / 27 red din**, chaaro raaste same. Mahine: Aug −$160 · Sep +$947 · Oct +$261 · Nov +$554. Avg ~$20/din (target 1%/din = $100 se kaafi kam)
- Agla: EA (Gold Luxe dashboard, PAPER default) → PAPER forward test

## Pending / next
- [ ] Trend Pyramid: preset COMBO_10 confirm (data ka best) → MQL5 EA ($10k, 0.03) + PAPER test
- **SAMU AI PRO:** AI AUTO demo par 3–4 hafte record (≥ 200 trade, ek kharab hafta milakar); AI-rejected signals ka paper (AI ki asli keemat); tab EA faisla. Real / lot nahi badhana.
- INVESTOR-ID: M1 Data button 2 baar dispatch hota hai (do run, pehla cancel, ~5 min barbaad) — theek karna.
- [ ] Liquidity Sweep: Ankush decide kare — chhod do, ya depth scale (ATR) / TP badal ke naya test; achha nikle tabhi MQL5 EA
- [ ] Universal EA: `filters.friday_stop` support (Step $10 ko VPS pe PAPER chalane ke liye)
- [x] v0.6.1 "GitHub se Data" (INVESTOR-ID v1.13 M1 export) — INVESTOR-ID PR #28 merge + pehla asli run baaki
- [x] QUAD ka pehla asli backtest (19 Nov 2026): Exness-MT5Trial17 XAUUSDm M1, 100,000 bars = 10 Aug → 19 Nov 2026 (101 din; MT5 maxbars 100k pe ruka), $10,000, CSV spread (median 240 pts):
  - ALL Auto: **−$1,561 (−15.6%)**, max DD 16.8%, PF 0.66, 53 trades/din, 296 cycle TP (+$10) vs 24 cycle SL (−$150) + 6 peak stop; 35 green / 52 red din; har mahina minus (Sep ~0)
  - ALL Worst-case: −$3,749 (−37.5%), DD 37.9%
  - Har EA minus (Auto): GRID −667, BREAKOUT −370, MARTI −306, PYRAMID −218. Koi preset (NO_GRID/NO_MARTI/NO_PYRAMID/NO_BREAKOUT) plus mein nahi; sabse kam bura NO_BREAKOUT Auto −6.8% (Worst −28.5%)
  - Spread 0 pe bhi −$887 (−8.9%) → spread se zyada, design mein hi edge nahi. Chhota +$10 TP vs bade loss (cap $50–60, cycle SL $150) ka asantulan
  - Daily −2% hard stop din ka loss rokta hai (worst din −$170), lekin lagatar laal din jud ke DD 17% — "max DD 2%" sirf ek din ka hai, poore period ka nahi
- [x] Ankush: "doosri set file banao" → 2 sweep (258 + 264 settings), pehle 2 mahine (10 Aug–10 Oct) pe chuna, aakhri 40 din (10 Oct–19 Nov) pe check. Sirf ~11% settings in-sample plus; top 12 mein se sirf 2 out-of-sample plus → zyada tar settings ka plus sirf kismat (overfit)
- [x] **Set B** (`quad-basket-set-b.json`): GRID + MARTI; GRID step $8 (tez $10), max 4/side, lock close; MARTI M15 BB(20,2), step $6; cycle SL $150. Poore 101 din: **+$269 (+2.7%)**, max DD 4.8%, PF 1.12, 16 trades/din, Worst-case +$259; mahine +257 / −45 / +274 / −215. Akele GRID −0.5%, akela MARTI −7.2%. Spread 300 pts pe −$100, 400 pe −$570 → bahut patla faayda
- [ ] Set B: live EA se pehle **PAPER forward test** (2–4 hafte) + 6 mahine ka data (MT5 maxbars 100k pe ruka — 2 runs ya M1 export ko 2 hisson mein)
- QUAD (original, lock fix ke baad): −$1,669 (−16.7%) Auto
- [x] **Set C** (Ankush, Sheet se): chaaro EA ON, cycle SL $500, max 25 trades, freeze 5%, hard stop 10%, peak 8%, caps $100, GRID step $6/$8 max 6 lock OFF, MARTI trend H4, PYRAMID SL $10 add $4, BREAKOUT lot 0.01 SL $10, Friday stop 14:30 (Sheet mein time aisa padha gaya). Result: Auto **+$15 (0.1%)**, DD 8.9% ($943), 40 trades/din; **Worst-case −$1,986 (−19.9%), DD 22%**. Worst din −$300, ek cycle −$500 tak. NO_BREAKOUT Auto +4.4% lekin Worst −21%, O→H→L→C −9.4%. PYRAMID ka result raaste par bahut nirbhar (Auto −57, Worst −1,768) → M1 backtest pe bharosa nahi
- [ ] Achha result → 4 live EA (GRID/MARTI/PYRAMID/BREAKOUT) + SAMU QUAD TESTER, naya repo SAMU-QUAD-BASKET
- [x] EA v1.01 VPS pe compile OK + chal raha (19 Nov 13:29 IST, pehli SELL)
- [x] `feature-ea-v1.03` main mein merge (19 Nov, Ankush ke kehne par; v1.02 bhi isi mein)
- [ ] **EA v1.03 compile (VPS Helper → COPY tab) + PAPER dashboard screenshot** — error aaye to v1.04
- [ ] v1.01 ki asli SELL 0.01 XAUUSDm (13:29 IST, magic 770100) haath se band karni hai
- [ ] Account equity confirm karo: agar sach mein ~$53 hai to base $1000 ke saath daily loss $50 = poora account
- [ ] EA v1.02 tester (1 minute OHLC) vs app (Auto path) same data pe compare
- [ ] Parity screen (EA trade log vs app), EA ka log format fix hone ke baad
- [ ] TEST EA v0.90 ka same-side-grid behaviour confirm karna
- [ ] Slippage option (trailing/SL pe)
- [ ] Real MT5 CSV se format confirm karna (abhi synthetic MT5-format data se test hua hai)
- [ ] Phase 2: VPS Helper → MT5 Strategy Tester real-tick report
