# STATE — SAMU Backtest Lab

## Current version
**v0.5.1** (branch `feature-v0.5.1`), 19 Nov 2026

## EA
**SAMU Universal EA v1.02** (branch `feature-ea-v1.02`) — code ready, **VPS Helper se VPS pe bheja** (samusignal `vps-ea/`, helper compile karega; result SamuSignal app → COPY tab → VPS Helper). JSON file na mile to EA **built-in Step Basket** settings se chalta hai. Setup: `docs/EA-SETUP.md`

## Version history
| Version | Date | Kya aaya |
|---|---|---|
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
| `CLAUDE.md` | Kaam ke rules (agle sessions ke liye) |
| `docs/ENGINE-RULES.md` | Engine ke exact rules (EA parity ke liye) |
| `ea/SAMU Universal EA v1.02.mq5` | Universal EA |
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
14. (EA v1.00) EA strategy JSON `MQL5\Files\step-basket.json` se padhta hai (Common folder optional). Config galat ho to live chart pe CONFIG ERROR banner, tester mein init fail
12. (v0.2.0) Max DD = floating equity (bar ke low tak) pe, closed-equity peak se
13. (v0.3.0) Din ka P/L = agle din ki start equity − is din ki start equity (floating shamil), isliye saare din jod ke = net. Mahina = trading day (IST, 7 AM) ka mahina

## Pending / next
- [x] EA v1.01 VPS pe compile OK + chal raha (19 Nov 13:29 IST, pehli SELL)
- [ ] **EA v1.02 compile + dashboard screenshot** → OK ho to `feature-ea-v1.02` main mein merge
- [ ] Account equity confirm karo: agar sach mein ~$53 hai to base $1000 ke saath daily loss $50 = poora account
- [ ] EA v1.02 tester (1 minute OHLC) vs app (Auto path) same data pe compare
- [ ] Parity screen (EA trade log vs app), EA ka log format fix hone ke baad
- [ ] TEST EA v0.90 ka same-side-grid behaviour confirm karna
- [ ] Slippage option (trailing/SL pe)
- [ ] Real MT5 CSV se format confirm karna (abhi synthetic MT5-format data se test hua hai)
- [ ] Phase 2: VPS Helper → MT5 Strategy Tester real-tick report
