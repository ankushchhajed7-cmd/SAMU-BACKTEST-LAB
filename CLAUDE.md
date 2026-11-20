# Project rules (SAMU Backtest Lab)

Owner works only from an Android phone (GitHub web + Chrome). Read STATE.md first: it has version history, decisions and pending work.

## Workflow
- 5-step loop: Discuss → Plan → Build → Verify → GitHub push.
- Every build on a new branch `feature-vX.Y.Z`; never push to main directly.
- When a build's tests pass, open a PR and merge it to main without asking. If a test fails or a decision is open, do not merge; tell the owner first.
- Update STATE.md with every push; also send the changed files in chat.
- Replies in Hinglish, short (mobile), ending with current date and time in IST.

## App standard (every app)
- Header always shows a **⟳ Refresh button** (clear app cache, fetch latest version, reload; user data stays) and the **version number**, from the first version.
- Bump `APP_VERSION` in index.html and `VERSION` in sw.js together.

## Engine
- Rules in docs/ENGINE-RULES.md; the Universal EA must follow the same rules.
- Run `node tests/engine.test.js`, `node tests/quad.test.js`, `node tests/sweep.test.js` `node tests/pyramid.test.js`, `node tests/pyramid-ea.test.js` and `node tests/lastcandle.test.js` before every push.
- Every EA/strategy backtest is done in this Lab (owner rule, 19 Nov 2026). Trend Pyramid rules: docs/PYRAMID-RULES.md.
- QUAD portfolio rules: docs/QUAD-RULES.md.
- AMC Last Candle rules: docs/LASTCANDLE-RULES.md (same as samusignal vps-ea AMC Last Candle EA).

## EA standard
- Full-screen "Gold Luxe" dashboard; EA file name = full name + version (e.g. "SAMU Universal EA v1.00.mq5").
