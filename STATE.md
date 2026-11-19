# STATE — SAMU Backtest Lab

## Current version
**v0.2.0** (branch `feature-v0.2.0`), 19 Nov 2026

## Version history
| Version | Date | Kya aaya |
|---|---|---|
| v0.2.0 | 19 Nov 2026 | Engine: M1 OHLC simulation, intrabar path Auto/O→L→H→C/O→H→L→C/Worst-case, CSV ya fixed spread, Supertrend (SMA/RMA ATR, closed bar), Step Basket A/B/C, daily target/loss, 07:00 IST reset. RUN screen (summary, equity, close reasons, last 30 baskets) + A/B/C × path matrix. `docs/ENGINE-RULES.md` |
| v0.1.0 | 19 Nov 2026 | PWA shell (Gold Luxe theme), MT5 M1 CSV loader (UTF-16/UTF-8, tab/comma/semicolon, header ya bina header), Data screen (stats, mahine-wise coverage, gaps, spread, chart), Strategy screen (JSON load/upload/edit/download, validation, A/B/C preset switch), offline service worker, `strategies/step-basket.json` |

## Files
| File | Kaam |
|---|---|
| `index.html` | Poora app (single file) |
| `manifest.json` | PWA install info |
| `sw.js` | Offline cache (network-first, cache fallback) |
| `strategies/step-basket.json` | Step Basket strategy (schema `samu-strategy/1`) |
| `docs/ENGINE-RULES.md` | Engine ke exact rules (EA parity ke liye) |
| `tests/engine.test.js` | Engine rule tests (`node tests/engine.test.js`, 16 tests) |
| `icons/icon-192.png`, `icons/icon-512.png` | App icons |

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
11. (v0.2.0) Supertrend ATR = SMA (MT5 iATR) default; `rma` option. TEST EA v0.90 kaunsa use karta hai, confirm karna hai
12. (v0.2.0) Max DD = floating equity (bar ke low tak) pe, closed-equity peak se

## Pending / next
- [ ] **v0.3.0** Report (net, DD, PF, win rate, equity, mahine/din-wise, trade list)
- [ ] v0.4.0 Compare + export
- [ ] v0.5.0 Strategy form editor + Parity screen (EA log vs app)
- [ ] SAMU Universal EA v1.00.mq5
- [ ] TEST EA v0.90 ka ATR method + same-side-grid behaviour confirm karna
- [ ] Slippage option (trailing/SL pe)
- [ ] Real MT5 CSV se format confirm karna (abhi synthetic MT5-format data se test hua hai)
- [ ] Phase 2: VPS Helper → MT5 Strategy Tester real-tick report
