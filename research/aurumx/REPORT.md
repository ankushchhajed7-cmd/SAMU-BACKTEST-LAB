# AurumX (Vantage demo 26209579) — tick clone backtest (25 Nov 2026)

**Data:** Watcher v1.11 ticks, XAUUSD+, 24 Nov 04:00 – 25 Nov 05:00 server (GMT+2), 562,516 tick, spread $0.11.
Real trades: history.json (magic 2026, comment "AurumX"), 749 trade, 24 Nov 18:02 – 25 Nov 04:51 (10.8 h).

## AurumX ke niyam (video + ticks se)
- Flat ho to **STOP order price se ~$0.50 door**, price ke peeche sirf achhi taraf khisakta (video: bid 3559.58 → stop 3560.13 … 3558.12 → 3558.64).
- Fill par **SL = entry ∓ $0.50**, TP nahi; profit ~$0.40 hone par **trailing SL ~$0.33–0.40** peeche (close = best − 0.33 median).
- **Disha:** M1 close vs **EMA(100) M1** — 94.7 % trades isi se mel khaate (60 min price change 91 %).
- Entry tez palat par: extreme se entry tak median 4.4 s, doori ~$1.0.
- Ek waqt me 1 trade, 0.01 lot.

## Natije (0.01 lot, $ me)
| | Trades | /ghanta | Win % | Net | Max DD | PF |
|---|---|---|---|---|---|---|
| **AurumX asli** (10.8 h) | 749 | 69 | 61.4 | **+130.1** | 5.5 | 1.93 |
| Clone, wahi 10.8 h | 794 | 73 | 51.5 | +66.9 | 11.1 | 1.35 |
| Clone, poore 24 h | 1982 | 79 | 48.8 | +129.3 | 12.8 | 1.26 |
| Clone 24 h, slippage $0.05 + $0.05 | 2009 | 80 | 40.7 | **−76.8** | 105 | 0.88 |
| Clone 24 h, slippage $0.10 + $0.10 | 2041 | 82 | 34.5 | **−276.7** | 277 | 0.63 |
| Clone 24 h, slip $0.10×2 + comm $0.06 | 2041 | 82 | 31.6 | **−399.2** | 399 | 0.51 |

Clone params: D 0.6, SL 0.5, trail start 0.4, trail 0.4, stop update har 3 s, palat 3 s ke andar.
Clone AurumX ki trade ginti/time/disha pakadta hai, par win % ~10 point kam (asli ka koi aur entry filter abhi pakda nahi).

**AurumX asli trades par real-account kharcha jodo:** slip $0.05/side → +55; $0.10/side → **−20**; $0.10 + comm $0.06 → **−65**.

## Nateeja
Ek trade ki kamai sirf ~$0.17 hai. Demo par fill turant aur bina slippage — isliye munafa. Real account par $0.10 ka slippage/side hi poora munafa kha jaata hai. **Real par chalane layak nahi**, jab tak real account (0.01 lot, 1–2 din) par khud na dikhe.

Chalao: `node clone.mjs <ticksDir> <history.json> '[{"label":"x","D":0.6,"TS":0.4,"TD":0.4,"upd":3,"fast":3,"full":1,"slipIn":0.05,"slipOut":0.05}]'`
