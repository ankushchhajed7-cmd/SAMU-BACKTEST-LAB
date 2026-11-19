# SAMU AI PRO — research backtest (19 Nov 2026)

**Data:** Exness 28 forex pair, M1, 13 Aug – 19 Nov 2026 (INVESTOR-ID v1.14 FX28), CSV spread.
**Engine:** SAMUSIGNAL-AI `src/engine.js` `analyze()` (wahi code jo app + VPS scanner chalata hai), har 15m slot, band 15m + 1H candles.
**Niyam (AI AUTO v1.13 jaise):** Grade A/B + 15m/1H saath, top 5 per slot, BUY/SELL LIMIT at `entry`, 60 min pending, 15m EMA21 trend jaanch, TP $0.25 / SL $1.50 (0.01 lot), spread ≤ $0.20, IST 07–17 + 20–22, din me 4 loss / $3 target = band, loss currency block, 1 pair 1 trade.
**Gemini AI "sahmat" check backtest me NAHI hai** (purane data par dobara nahi chal sakta).
Fill bar par sirf SL (conservative).

| Variant | Trades | Win % | Net ($, 0.01 lot) | Max DD |
|---|---|---|---|---|
| AI AUTO niyam (TP 0.25 / SL 1.50) | 861 | 77.6 | −122.5 | 129.8 |
| Grade A only | 842 | 77.4 | −122.0 | 128.0 |
| TP 0.50 / SL 1.00 | 587 | 58.3 | −74.0 | 93.5 |
| TP 1.00 / SL 1.00 | 490 | 43.1 | −68.0 | 94.0 |
| Engine SL, 1R | 440 | 39.3 | −35.4 | 56.5 |
| Engine SL, 1.5R | 420 | 32.9 | −17.6 | 59.4 |
| Engine SL, 2R | 405 | 27.9 | −19.5 | 62.8 |
| Ulta disha (invert) TP/SL 1/1 | 482 | 43.8 | −60.0 | 64.0 |
| Spread ≤ $0.12 | 555 | 78.4 | −71.3 | 74.5 |

TP 0.25 / SL 1.50 par break-even win % = 1.50 / 1.75 = **85.7 %**.

Mahine (AI AUTO niyam, engine-only): Sep 69.4 %, Oct 75.8 %, **12–19 Nov 84.6 %**.

## Live (INVESTOR-ID history, magic 7310001, AI filter ke saath)
- 434476133: 49 trade, 49 jeet, +$12.28 (12–16 Nov)
- 464208541: 25 trade, 23 jeet, +$5.00 (17–19 Nov, 0.02 lot)
- Kul **72 / 74 = 97 %** — lekin sirf 12–19 Nov, aur usi hafte engine akela bhi 84.6 % tha (aasaan hafta).

## Nateeja
1. Engine akela kisi bhi TP/SL par 3 mahine me fayde me nahi — disha ka edge ~0, kharcha (spread) bhari.
2. Live 97 % abhi sirf ek aasaan hafte ka; AI filter kitna jodta hai ye kam se kam 3–4 hafte (Sep jaisa kharab hafta milakar) live / demo record se hi pata chalega.
3. Agla kadam: AI-rejected signals ka bhi paper (AI ki asli keemat naapne ke liye), demo par record jamaana; tab tak lot / real nahi badhana.

Chalao: `ENGINE=<path>/src/engine.js node main.mjs <dataDir> '[{"label":"x","tpUsd":0.25,"slUsd":1.5}]'`
