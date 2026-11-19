// Trend Pyramid Grid EA vs Lab strategy file. Run: node tests/pyramid-ea.test.js
// EA ke default inputs = strategies/trend-pyramid-10k.json (preset COMBO_10), aur rule order = docs/PYRAMID-RULES.md
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const eaFile = fs.readdirSync(path.join(root, 'ea')).filter(f => /^Trend Pyramid Grid v[\d.]+\.mq5$/.test(f)).sort().pop();
const ea = fs.readFileSync(path.join(root, 'ea', eaFile), 'utf8');
const st = JSON.parse(fs.readFileSync(path.join(root, 'strategies/trend-pyramid-10k.json'), 'utf8'));
const P = st.basket.presets.COMBO_10;
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info != null ? '  → ' + info : '')); if (!cond) fails++; };
const inp = name => { const m = ea.match(new RegExp('input\\s+[\\w ]+\\s' + name + '\\s*=\\s*([^;]+);')); return m ? m[1].trim().replace(/^"|"$/g, '') : undefined; };
const num = name => parseFloat(inp(name));
const pick = (k, def) => P[k] != null ? P[k] : def;

ok('EA file mila', !!eaFile, eaFile);
ok('EA source sirf ASCII', ![...ea].some(c => c.charCodeAt(0) > 127));
ok('PAPER default (InpLiveTrading = false)', inp('InpLiveTrading') === 'false');
ok('lot', num('InpLot') === st.lot, num('InpLot') + ' vs ' + st.lot);
ok('step (COMBO_10)', num('InpStepPrice') === pick('step_price', st.pyramid.step_price), num('InpStepPrice'));
ok('max adds', num('InpMaxAdds') === st.pyramid.max_adds);
ok('trail gap 0 = step', num('InpTrailGap') === 0 && st.pyramid.trail_gap_price == null && P.trail_gap_price == null);
ok('loss levels', num('InpLossLevels') === P.loss_levels, num('InpLossLevels'));
ok('first SL ATR', num('InpFirstSlAtr') === st.first_sl_atr);
ok('ATR period', num('InpAtrPeriod') === st.atr.period && inp('InpAtrTF') === 'PERIOD_' + st.atr.tf);
ok('gap ATR', num('InpGapAtr') === st.loss_grid.gap_atr);
ok('recover $', num('InpRecoverUsd') === st.loss_grid.recover_usd, num('InpRecoverUsd'));
ok('max loss $', num('InpMaxLossUsd') === st.loss_grid.max_loss_usd, num('InpMaxLossUsd'));
ok('basket TP $', num('InpBasketTpUsd') === st.basket.tp_usd, num('InpBasketTpUsd'));
ok('daily target $', num('InpDailyTargetUsd') === st.daily.target_usd);
ok('daily loss $', num('InpDailyLossUsd') === st.daily.loss_usd);
ok('reset time', inp('InpResetIST') === st.daily.reset_time);
ok('trend EMA', num('InpEmaFast') === st.trend.ema_fast && num('InpEmaSlow') === st.trend.ema_slow && inp('InpTrendTF') === 'PERIOD_' + st.trend.tf);
ok('flip close', inp('InpFlipClose') === String(st.entry.flip_close_reverse));
ok('Friday close', inp('InpFridayClose') === String(st.filters.friday_close.enabled) && inp('InpFridayTime') === st.filters.friday_close.server_time);
ok('news filter', inp('InpNewsFilter') === String(st.filters.news.enabled) && num('InpNewsBeforeMin') === st.filters.news.before_min && num('InpNewsAfterMin') === st.filters.news.after_min);
ok('base balance = default_balance', num('InpAllocBalance') === st.default_balance);
ok('server GMT', num('InpServerGMT') === st.server_gmt_offset_hours);
ok('max spread', num('InpMaxSpreadPts') === st.filters.max_spread_points);

// rule order inside ManageBasket (docs/PYRAMID-RULES.md)
const mb = ea.split('void ManageBasket()')[1].split('\nvoid ')[0];
const order = ['"DAY_TARGET"', '"DAY_LOSS"', '"BASKET_TP"', '"MAX_LOSS"', '"RECOVER"', '"TRAIL" : "SL"', 'pyramid add', 'loss grid'];
const pos = order.map(k => mb.indexOf(k));
ok('ManageBasket check order = Lab', pos.every(p => p >= 0) && pos.every((p, i) => i === 0 || p > pos[i - 1]), pos.join(','));
// new bar: Friday → flip → new basket
const nb = ea.split('void OnNewBar()')[1].split('\nvoid ')[0];
ok('new bar: FRIDAY → FLIP → nayi basket', nb.indexOf('"FRIDAY"') < nb.indexOf('"FLIP"') && nb.indexOf('"FLIP"') < nb.indexOf('g_basketId++'));
ok('pure SL = ATR × first SL', /g_sl = \(InpLossLevels == 0\) \? op - g_dir \* g_atrB \* InpFirstSlAtr : 0;/.test(nb));
ok('add ke baad SL = op − dir × trail', /g_sl = op - g_dir \* g_trail;/.test(mb));
ok('turant entry (g_lastBar = 0 on init)', /g_lastBar = 0;/.test(ea));
ok('dashboard full-screen bg', /Rect\("bg", 0, 0, W, H/.test(ea) && /CHART_SHOW, false/.test(ea));
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASS');
process.exit(fails ? 1 : 0);
