//+------------------------------------------------------------------+
//|                                  Trend Pyramid Grid v1.00.mq5    |
//|  SAMU Backtest Lab ki "Trend Pyramid" strategy (schema            |
//|  samu-strategy/4, docs/PYRAMID-RULES.md) ke bilkul same rules:    |
//|  H1 EMA 50/200 trend ki side turant entry (koi wait nahi),        |
//|  profit side har step pe add + trailing SL, combo loss grid,      |
//|  basket TP, daily $ target/loss (07:00 IST), trend flip,          |
//|  Friday close, news filter (sirf nayi basket).                    |
//|  Default = strategies/trend-pyramid-10k.json, preset COMBO_10:    |
//|  $10,000, lot 0.03, step $10, loss grid 2. PAPER mode default.    |
//+------------------------------------------------------------------+
#property copyright   "SAMU"
#property version     "1.00"
#property description "Trend Pyramid Grid: H1 EMA trend, immediate entry, pyramid adds + trailing SL, loss grid, basket TP, daily $ limits. Same rules as SAMU Backtest Lab (samu-strategy/4)."

#include <Trade\Trade.mqh>

//--- inputs (default = Lab: trend-pyramid-10k.json, preset COMBO_10)
input group "Mode"
input bool   InpLiveTrading    = false;     // false = PAPER (virtual trades, broker ko order nahi); true = asli trade
input long   InpMagic          = 770400;    // Magic number
input int    InpSlippagePts    = 50;        // Max slippage (points)
input group "Trend + entry"
input ENUM_TIMEFRAMES InpTrendTF = PERIOD_H1; // Trend timeframe
input int    InpEmaFast        = 50;        // EMA fast
input int    InpEmaSlow        = 200;       // EMA slow
input int    InpTrendBars      = 1500;      // Trend history bars (EMA calc)
input bool   InpFlipClose      = true;      // Trend palte to sab close + nayi side
input group "Lot + pyramid"
input double InpLot            = 0.03;      // Lot (har trade)
input double InpStepPrice      = 10.0;      // Pyramid step ($ price) - profit side har itne pe add
input int    InpMaxAdds        = 5;         // Max pyramid adds
input double InpTrailGap       = 0;         // Trail gap ($ price): add ke baad SL = last add - gap (0 = step)
input bool   InpBrokerSL       = true;      // Live: SL broker pe bhi lagao (safety)
input group "Pure / combo"
input int    InpLossLevels     = 2;         // Loss grid levels (0 = pure: pehle trade ka SL ATR x)
input double InpFirstSlAtr     = 1.5;       // Pure: pehle trade ka SL = ATR x ye
input ENUM_TIMEFRAMES InpAtrTF = PERIOD_M15; // ATR timeframe
input int    InpAtrPeriod      = 14;        // ATR period (SMA = MT5 iATR)
input double InpGapAtr         = 1.0;       // Combo: grid gap = ATR x ye
input double InpRecoverUsd     = 9;         // Combo: grid khula ho to basket +$ pe close
input double InpMaxLossUsd     = 60;        // Combo: basket -$ pe close
input group "Basket + daily"
input double InpBasketTpUsd    = 45;        // Basket TP ($, 0 = off)
input double InpDailyTargetUsd = 90;        // Daily target ($, 0 = off)
input double InpDailyLossUsd   = 120;       // Daily loss ($, 0 = off)
input string InpResetIST       = "07:00";   // Naya din (IST)
input double InpServerGMT      = 0;         // Server GMT offset (Exness = 0)
input group "Filters"
input int    InpMaxSpreadPts   = 0;         // Max spread (points, 0 = off)
input bool   InpFridayClose    = true;      // Friday close
input string InpFridayTime     = "20:45";   // Friday close (SERVER time): sab close, Monday tak nayi basket nahi
input bool   InpNewsFilter     = true;      // News filter (sirf nayi basket rokta hai)
input string InpNewsCurrencies = "USD";     // News currency (comma se: USD,EUR)
input int    InpNewsBeforeMin  = 30;        // News se pehle (min)
input int    InpNewsAfterMin   = 30;        // News ke baad (min)
input group "Account"
input bool   InpOwnMode        = true;      // Own P/L mode: daily $ sirf is EA ke trades se
input double InpAllocBalance   = 10000;     // Own mode: EA ka base balance ($)
input datetime InpAllocFrom    = 0;         // Own mode: realized P/L kab se (0 = pehli baar chalne se)
input double InpMinMarginLevel = 300;       // Nayi trade tabhi jab margin level >= ye % (0 = off)
input group "Dashboard"
input bool   InpDashboard      = true;      // Gold Luxe dashboard (full screen)
input bool   InpHidePriceChart = true;      // Price chart chhupao
input bool   InpLogTrades      = true;      // Trade log CSV

#define EA_NAME    "Trend Pyramid Grid"
#define EA_VERSION "v1.00"
#define PFX        "TPG_"
#define CMT        "TPG#"
#define IST_SEC    19800

//====================================================================
//  STATE
//====================================================================
CTrade  trade;
bool    g_ready = false;
string  g_cfgErr = "";
string  g_warnMsg = "";
datetime g_since = 0;
double  g_realized = 0;
bool    g_realDirty = true;
long    g_basketId = 0;
int     g_dir = 0;            // basket direction
int     g_adds = 0;           // pyramid adds in basket
int     g_gridN = 0;          // loss grid trades in basket
double  g_sl = 0;             // basket SL price (0 = none)
double  g_atrB = 0;           // ATR at basket open
double  g_peak = -1e18;
double  g_bMin = 0;
double  g_bStartBal = 0;
long    g_dayKey = -1;
double  g_dayStartEq = 0;
bool    g_dayStopped = false;
string  g_dayStopReason = "";
bool    g_paused = false;
datetime g_lastBar = 0;
int     g_trend = 0;
double  g_emaF = 0, g_emaS = 0, g_atrNow = 0;
string  g_closeReason = "";
string  g_lastErr = "";
datetime g_lastErrT = 0;
uint    g_lastDash = 0;
int     g_resetSec = 7 * 3600;
int     g_friMin = 20 * 60 + 45;
bool    g_newsBlock = false;
string  g_newsTxt = "";
datetime g_newsT[];
string  g_newsN[];
datetime g_newsLoaded = 0;
double  g_trail = 10;

string GVN(const string k) { return PFX + _Symbol + "_" + (string)InpMagic + "_" + k; }
void   GVSet(const string k, const double v) { GlobalVariableSet(GVN(k), v); }
double GVGet(const string k, const double def) { return GlobalVariableCheck(GVN(k)) ? GlobalVariableGet(GVN(k)) : def; }

void SaveState()
  {
   GVSet("basketId", (double)g_basketId);
   GVSet("dir", g_dir);
   GVSet("adds", g_adds);
   GVSet("gridN", g_gridN);
   GVSet("sl", g_sl);
   GVSet("atrB", g_atrB);
   GVSet("peak", g_peak);
   GVSet("bMin", g_bMin);
   GVSet("bStartBal", g_bStartBal);
   GVSet("dayKey", (double)g_dayKey);
   GVSet("dayStartEq", g_dayStartEq);
   GVSet("dayStopped", g_dayStopped ? (g_dayStopReason == "DAY_TARGET" ? 1 : 2) : 0);
   GVSet("paused", g_paused ? 1 : 0);
  }

int HhmmToMin(const string s)
  {
   string p[];
   if(StringSplit(s, ':', p) != 2) return -1;
   int h = (int)StringToInteger(p[0]), m = (int)StringToInteger(p[1]);
   if(h < 0 || h > 23 || m < 0 || m > 59) return -1;
   return h * 60 + m;
  }

double NormLot(double v)
  {
   double mn = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN), mx = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX), st = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   if(st <= 0) st = 0.01;
   v = MathRound(v / st) * st;
   if(v < mn) v = mn;
   if(v > mx) v = mx;
   return NormalizeDouble(v, 2);
  }

//====================================================================
//  TIME
//====================================================================
datetime NowServer() { return MQLInfoInteger(MQL_TESTER) ? TimeCurrent() : TimeTradeServer(); }
datetime ToIst(const datetime srv) { return (datetime)((long)srv - (long)(InpServerGMT * 3600) + IST_SEC); }
long     DayKeyOf(const datetime srv) { return (long)MathFloor(((double)srv - InpServerGMT * 3600.0 + IST_SEC - g_resetSec) / 86400.0); }
string   TStr(const datetime t)
  {
   string s = TimeToString(t, TIME_DATE | TIME_MINUTES);
   StringReplace(s, ".", "-");
   return s;
  }
string IstHM(const datetime srv) { return TimeToString(ToIst(srv), TIME_MINUTES); }

// Friday close (SERVER time, Lab jaisa): Friday InpFridayTime ke baad + Sat/Sun = blocked
bool FridayBlocked(const datetime srv)
  {
   if(!InpFridayClose) return false;
   MqlDateTime d; TimeToStruct(srv, d);
   int m = d.hour * 60 + d.min;
   return ((d.day_of_week == 5 && m >= g_friMin) || d.day_of_week == 6 || d.day_of_week == 0);
  }

//====================================================================
//  NEWS FILTER (MT5 Economic Calendar, High impact, live only)
//====================================================================
void LoadNews()
  {
   g_newsLoaded = TimeCurrent();
   ArrayResize(g_newsT, 0); ArrayResize(g_newsN, 0);
   if(!InpNewsFilter || MQLInfoInteger(MQL_TESTER)) return;
   datetime now = TimeTradeServer();
   string cur[];
   int nc = StringSplit(InpNewsCurrencies, ',', cur);
   for(int c = 0; c < nc; c++)
     {
      string ccy = cur[c];
      StringTrimLeft(ccy); StringTrimRight(ccy);
      if(ccy == "") continue;
      MqlCalendarValue vals[];
      CalendarValueHistory(vals, now - 6 * 3600, now + 36 * 3600, NULL, ccy);
      for(int i = 0; i < ArraySize(vals); i++)
        {
         MqlCalendarEvent ev;
         if(!CalendarEventById(vals[i].event_id, ev)) continue;
         if(ev.importance != CALENDAR_IMPORTANCE_HIGH) continue;
         int k = ArraySize(g_newsT);
         ArrayResize(g_newsT, k + 1); ArrayResize(g_newsN, k + 1);
         g_newsT[k] = vals[i].time; g_newsN[k] = ccy + " " + ev.name;
        }
     }
  }

void UpdateNews()
  {
   g_newsBlock = false;
   if(!InpNewsFilter) { g_newsTxt = "off"; return; }
   if(MQLInfoInteger(MQL_TESTER)) { g_newsTxt = "tester (off)"; return; }
   if(TimeCurrent() - g_newsLoaded > 600) LoadNews();
   datetime now = TimeTradeServer(), nextT = 0;
   for(int i = 0; i < ArraySize(g_newsT); i++)
     {
      datetime t = g_newsT[i];
      if(now >= t - InpNewsBeforeMin * 60 && now <= t + InpNewsAfterMin * 60)
        {
         g_newsBlock = true;
         g_newsTxt = "NEWS " + g_newsN[i] + " " + IstHM(t) + " IST  -  " + IstHM(t + InpNewsAfterMin * 60) + " tak nayi basket band";
         return;
        }
      if(t > now && (nextT == 0 || t < nextT)) nextT = t;
     }
   g_newsTxt = (nextT > 0) ? "next " + IstHM(nextT) + " IST" : "clear";
  }

//====================================================================
//  INDICATORS (same formula as the Lab: EMA seeded with SMA, ATR = SMA of TR)
//====================================================================
// last CLOSED bar ka trend: 1 = BUY, -1 = SELL, 0 = not ready
int TrendSignal()
  {
   MqlRates r[];
   ArraySetAsSeries(r, false);
   int n = CopyRates(_Symbol, InpTrendTF, 1, InpTrendBars, r);   // shift 1 = sirf band bars
   if(n < InpEmaSlow + 1) { g_emaF = 0; g_emaS = 0; return 0; }
   double kf = 2.0 / (InpEmaFast + 1), ks = 2.0 / (InpEmaSlow + 1), ef = 0, es = 0, sf = 0, ss = 0;
   for(int i = 0; i < n; i++)
     {
      double c = r[i].close;
      if(i < InpEmaFast) { sf += c; if(i == InpEmaFast - 1) ef = sf / InpEmaFast; }
      else ef = ef + kf * (c - ef);
      if(i < InpEmaSlow) { ss += c; if(i == InpEmaSlow - 1) es = ss / InpEmaSlow; }
      else es = es + ks * (c - es);
     }
   g_emaF = ef; g_emaS = es;
   return ef > es ? 1 : (ef < es ? -1 : 0);
  }

// last CLOSED ATR bar (SMA of true range)
double AtrNow()
  {
   MqlRates r[];
   ArraySetAsSeries(r, false);
   int n = CopyRates(_Symbol, InpAtrTF, 1, InpAtrPeriod + 1, r);
   if(n < InpAtrPeriod + 1) return 0;
   double sum = 0;
   for(int i = 1; i < n; i++)
      sum += MathMax(r[i].high - r[i].low, MathMax(MathAbs(r[i].high - r[i - 1].close), MathAbs(r[i].low - r[i - 1].close)));
   return sum / InpAtrPeriod;
  }

//====================================================================
//  POSITIONS (real ya PAPER)
//====================================================================
bool IsMine() { return (PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic); }

struct VPos { long id; int dir; double lot; double op; datetime ot; };
VPos   g_vp[];
long   g_vpNext = 1;
double g_paperReal = 0;
bool   Paper() { return !InpLiveTrading && !MQLInfoInteger(MQL_TESTER); }

double VProfit(const int i, const double bid, const double ask)
  {
   double close = (g_vp[i].dir == 1) ? bid : ask, pr = 0;
   if(!OrderCalcProfit(g_vp[i].dir == 1 ? ORDER_TYPE_BUY : ORDER_TYPE_SELL, _Symbol, g_vp[i].lot, g_vp[i].op, close, pr))
      pr = g_vp[i].dir * (close - g_vp[i].op) * g_vp[i].lot * SymbolInfoDouble(_Symbol, SYMBOL_TRADE_CONTRACT_SIZE);
   return pr;
  }
void SaveVP()
  {
   int n = ArraySize(g_vp);
   GVSet("vp_n", n); GVSet("vp_next", (double)g_vpNext); GVSet("paperReal", g_paperReal);
   for(int i = 0; i < n; i++)
     {
      string k = "vp" + (string)i + "_";
      GVSet(k + "id", (double)g_vp[i].id); GVSet(k + "dir", g_vp[i].dir); GVSet(k + "lot", g_vp[i].lot);
      GVSet(k + "op", g_vp[i].op); GVSet(k + "ot", (double)g_vp[i].ot);
     }
  }
void LoadVP()
  {
   int n = (int)GVGet("vp_n", 0);
   g_vpNext = (long)GVGet("vp_next", 1);
   g_paperReal = GVGet("paperReal", 0);
   ArrayResize(g_vp, n);
   for(int i = 0; i < n; i++)
     {
      string k = "vp" + (string)i + "_";
      g_vp[i].id = (long)GVGet(k + "id", 0); g_vp[i].dir = (int)GVGet(k + "dir", 1); g_vp[i].lot = GVGet(k + "lot", InpLot);
      g_vp[i].op = GVGet(k + "op", 0); g_vp[i].ot = (datetime)GVGet(k + "ot", 0);
     }
  }
int RealCount()
  {
   int c = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
      if(PositionGetTicket(i) > 0 && IsMine()) c++;
   return c;
  }
int CountPos() { return Paper() ? ArraySize(g_vp) : RealCount(); }

double BasketPL()
  {
   double pl = 0;
   if(Paper())
     {
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID), ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      for(int i = 0; i < ArraySize(g_vp); i++) pl += VProfit(i, bid, ask);
      return pl;
     }
   for(int i = PositionsTotal() - 1; i >= 0; i--)
      if(PositionGetTicket(i) > 0 && IsMine())
         pl += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
   return pl;
  }
void EntryRange(double &mx, double &mn)
  {
   mx = -DBL_MAX; mn = DBL_MAX;
   if(Paper())
     {
      for(int i = 0; i < ArraySize(g_vp); i++) { if(g_vp[i].op > mx) mx = g_vp[i].op; if(g_vp[i].op < mn) mn = g_vp[i].op; }
      return;
     }
   for(int i = PositionsTotal() - 1; i >= 0; i--)
      if(PositionGetTicket(i) > 0 && IsMine())
        {
         double op = PositionGetDouble(POSITION_PRICE_OPEN);
         if(op > mx) mx = op;
         if(op < mn) mn = op;
        }
  }
int BasketDirFromPositions()
  {
   if(Paper()) return ArraySize(g_vp) > 0 ? g_vp[0].dir : 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
      if(PositionGetTicket(i) > 0 && IsMine())
         return (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 1 : -1;
   return 0;
  }
int CollectRows(int &dir[], double &lot[], double &op[], datetime &ot[], double &pr[])
  {
   int n = 0;
   if(Paper())
     {
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID), ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      n = ArraySize(g_vp);
      ArrayResize(dir, n); ArrayResize(lot, n); ArrayResize(op, n); ArrayResize(ot, n); ArrayResize(pr, n);
      for(int i = 0; i < n; i++) { dir[i] = g_vp[i].dir; lot[i] = g_vp[i].lot; op[i] = g_vp[i].op; ot[i] = g_vp[i].ot; pr[i] = VProfit(i, bid, ask); }
      return n;
     }
   for(int i = 0; i < PositionsTotal(); i++)
     {
      ulong t = PositionGetTicket(i);
      if(t == 0 || !IsMine()) continue;
      ArrayResize(dir, n + 1); ArrayResize(lot, n + 1); ArrayResize(op, n + 1); ArrayResize(ot, n + 1); ArrayResize(pr, n + 1);
      dir[n] = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 1 : -1;
      lot[n] = PositionGetDouble(POSITION_VOLUME); op[n] = PositionGetDouble(POSITION_PRICE_OPEN);
      ot[n] = (datetime)PositionGetInteger(POSITION_TIME); pr[n] = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
      n++;
     }
   return n;
  }

void CalcRealized()
  {
   g_realized = 0; g_realDirty = false;
   if(Paper()) { g_realized = g_paperReal; return; }
   if(!HistorySelect(g_since, TimeCurrent() + 86400)) { g_realDirty = true; return; }
   int n = HistoryDealsTotal();
   for(int i = 0; i < n; i++)
     {
      ulong d = HistoryDealGetTicket(i);
      if(d == 0) continue;
      if(HistoryDealGetString(d, DEAL_SYMBOL) != _Symbol || HistoryDealGetInteger(d, DEAL_MAGIC) != InpMagic) continue;
      long en = HistoryDealGetInteger(d, DEAL_ENTRY);
      if(en == DEAL_ENTRY_OUT || en == DEAL_ENTRY_INOUT || en == DEAL_ENTRY_OUT_BY)
         g_realized += HistoryDealGetDouble(d, DEAL_PROFIT) + HistoryDealGetDouble(d, DEAL_SWAP) + HistoryDealGetDouble(d, DEAL_COMMISSION);
      else if(en == DEAL_ENTRY_IN)
         g_realized += HistoryDealGetDouble(d, DEAL_COMMISSION);
     }
  }
double EaBalance()
  {
   if(!InpOwnMode) return AccountInfoDouble(ACCOUNT_BALANCE);
   if(g_realDirty) CalcRealized();
   return InpAllocBalance + g_realized;
  }
double EaEquity()
  {
   if(!InpOwnMode) return AccountInfoDouble(ACCOUNT_EQUITY);
   return EaBalance() + BasketPL();
  }
double EaNetPL()
  {
   if(g_realDirty) CalcRealized();
   return g_realized + BasketPL();
  }
bool MarginOk(const int dir, const double lot, string &why)
  {
   if(InpMinMarginLevel <= 0 || Paper()) return true;
   double price = (dir == 1) ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID), m = 0;
   if(!OrderCalcMargin(dir == 1 ? ORDER_TYPE_BUY : ORDER_TYPE_SELL, _Symbol, lot, price, m)) return true;
   double used = AccountInfoDouble(ACCOUNT_MARGIN) + m, eq = AccountInfoDouble(ACCOUNT_EQUITY);
   if(used <= 0) return true;
   double lvl = eq / used * 100.0;
   if(lvl >= InpMinMarginLevel) return true;
   why = StringFormat("Margin guard: trade ke baad margin level %.0f%% < %.0f%%  -  nayi trade nahi khuli", lvl, InpMinMarginLevel);
   return false;
  }
bool MagicClash(string &why)
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong t = PositionGetTicket(i);
      if(t == 0 || PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      if(StringFind(PositionGetString(POSITION_COMMENT), CMT) != 0 || PositionGetString(POSITION_SYMBOL) != _Symbol)
        { why = StringFormat("Magic %I64d pe kisi aur EA / symbol ki khuli trade hai (%s). InpMagic badlo.", InpMagic, PositionGetString(POSITION_SYMBOL)); return true; }
     }
   return false;
  }

void SetErr(const string e) { g_lastErr = e; g_lastErrT = TimeCurrent(); Print(EA_NAME, ": ", e); }

// broker SL = basket SL (live safety). BUY: bid <= SL, SELL: ask >= SL - same as EA check.
void SyncBrokerSL()
  {
   if(Paper() || !InpBrokerSL) return;
   double sl = (g_sl > 0) ? NormalizeDouble(g_sl, _Digits) : 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong t = PositionGetTicket(i);
      if(t == 0 || !IsMine()) continue;
      if(MathAbs(PositionGetDouble(POSITION_SL) - sl) < _Point / 2) continue;
      if(!trade.PositionModify(t, sl, PositionGetDouble(POSITION_TP)))
         Print(EA_NAME, ": broker SL set nahi hua (", trade.ResultRetcodeDescription(), "), EA khud SL check kar raha hai");
     }
  }

// returns fill price (0 = fail)
double OpenTrade(const int dir)
  {
   double lot = NormLot(InpLot);
   string why = "";
   if(!MarginOk(dir, lot, why)) { SetErr(why); return 0; }
   double price = (dir == 1) ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);
   if(Paper())
     {
      int k = ArraySize(g_vp); ArrayResize(g_vp, k + 1);
      g_vp[k].id = g_vpNext++; g_vp[k].dir = dir; g_vp[k].lot = lot; g_vp[k].op = price; g_vp[k].ot = TimeCurrent();
      SaveVP();
      return price;
     }
   string cm = CMT + (string)g_basketId;
   bool ok = (dir == 1) ? trade.Buy(lot, _Symbol, 0, 0, 0, cm) : trade.Sell(lot, _Symbol, 0, 0, 0, cm);
   if(!ok || (trade.ResultRetcode() != TRADE_RETCODE_DONE && trade.ResultRetcode() != TRADE_RETCODE_PLACED))
     {
      SetErr(StringFormat("Order fail: %s %.2f lot, code %u %s", dir == 1 ? "BUY" : "SELL", lot, trade.ResultRetcode(), trade.ResultRetcodeDescription()));
      return 0;
     }
   g_realDirty = true;
   return trade.ResultPrice() > 0 ? trade.ResultPrice() : price;
  }

void PaperLog(const int i, const double cp, const datetime ct, const double pr, const string reason)
  {
   if(!InpLogTrades) return;
   int h = FileOpen("TPG_paper_" + _Symbol + "_" + (string)InpMagic + ".csv", FILE_READ | FILE_WRITE | FILE_TXT | FILE_ANSI);
   if(h == INVALID_HANDLE) return;
   if(FileSize(h) == 0)
      FileWriteString(h, "id,basket,dir,lot,open_time_server,open_time_ist,open_price,close_time_server,close_time_ist,close_price,profit,reason\r\n");
   FileSeek(h, 0, SEEK_END);
   FileWriteString(h, StringFormat("P%I64d,%I64d,%s,%.2f,%s,%s,%s,%s,%s,%s,%.2f,%s\r\n", g_vp[i].id, g_basketId, g_vp[i].dir == 1 ? "BUY" : "SELL", g_vp[i].lot,
                                   TStr(g_vp[i].ot), TStr(ToIst(g_vp[i].ot)), DoubleToString(g_vp[i].op, _Digits), TStr(ct), TStr(ToIst(ct)), DoubleToString(cp, _Digits), pr, reason));
   FileClose(h);
  }

void ResetBasket()
  {
   g_dir = 0; g_adds = 0; g_gridN = 0; g_sl = 0; g_atrB = 0; g_peak = -1e18; g_bMin = 0;
  }

void CloseAll(const string reason)
  {
   g_closeReason = reason;
   if(Paper())
     {
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID), ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      datetime ct = TimeCurrent();
      for(int i = 0; i < ArraySize(g_vp); i++)
        {
         double pr = VProfit(i, bid, ask);
         g_paperReal += pr;
         PaperLog(i, g_vp[i].dir == 1 ? bid : ask, ct, pr, reason);
        }
      ArrayResize(g_vp, 0);
      g_realDirty = true; ResetBasket();
      SaveVP(); SaveState();
      return;
     }
   for(int attempt = 0; attempt < 3; attempt++)
     {
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         ulong t = PositionGetTicket(i);
         if(t > 0 && IsMine()) trade.PositionClose(t, InpSlippagePts);
        }
      if(RealCount() == 0) break;
     }
   g_realDirty = true;
   if(RealCount() > 0) SetErr("Close all poora nahi hua, agle tick pe phir koshish");
   else ResetBasket();
   SaveState();
  }

void StopDay(const string reason)
  {
   if(CountPos() > 0) CloseAll(reason);
   g_dayStopped = true; g_dayStopReason = reason;
   SaveState();
  }

//====================================================================
//  RULES (order = docs/PYRAMID-RULES.md)
//  daily target -> daily loss -> basket TP -> max loss -> recover -> SL/trail -> pyramid add -> loss grid
//====================================================================
void NewDayCheck()
  {
   long dk = DayKeyOf(NowServer());
   if(dk != g_dayKey)
     {
      g_dayKey = dk;
      g_dayStartEq = EaEquity();
      g_dayStopped = false; g_dayStopReason = "";
      SaveState();
     }
  }

void ManageBasket()
  {
   for(int guard = 0; guard < 4; guard++)
     {
      int n = CountPos();
      double pl = BasketPL(), eq = EaEquity();
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID), ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      if(n == 0) { if(g_dir != 0 && !Paper()) { g_closeReason = "BROKER_SL"; ResetBasket(); SaveState(); } return; }
      if(pl > g_peak) g_peak = pl;
      if(pl < g_bMin) g_bMin = pl;
      if(g_dir == 0) g_dir = BasketDirFromPositions();
      if(!g_dayStopped)
        {
         if(InpDailyTargetUsd > 0 && eq >= g_dayStartEq + InpDailyTargetUsd) { StopDay("DAY_TARGET"); return; }
         if(InpDailyLossUsd > 0 && eq <= g_dayStartEq - InpDailyLossUsd) { StopDay("DAY_LOSS"); return; }
        }
      if(InpBasketTpUsd > 0 && pl >= InpBasketTpUsd) { CloseAll("BASKET_TP"); return; }
      if(InpLossLevels > 0 && InpMaxLossUsd > 0 && pl <= -InpMaxLossUsd) { CloseAll("MAX_LOSS"); return; }
      if(g_gridN > 0 && pl >= InpRecoverUsd) { CloseAll("RECOVER"); return; }
      if(g_sl > 0 && ((g_dir == 1 && bid <= g_sl) || (g_dir == -1 && ask >= g_sl))) { CloseAll(g_adds > 0 ? "TRAIL" : "SL"); return; }
      if(g_dayStopped || g_paused) return;
      double mx, mn; EntryRange(mx, mn);
      // pyramid add (profit side)
      if(g_gridN == 0 && g_adds < InpMaxAdds && ((g_dir == 1 && ask >= mx + InpStepPrice) || (g_dir == -1 && bid <= mn - InpStepPrice)))
        {
         double op = OpenTrade(g_dir);
         if(op <= 0) return;
         g_adds++;
         g_sl = op - g_dir * g_trail;
         SaveState(); SyncBrokerSL();
         continue;
        }
      // loss grid (combo)
      double gap = g_atrB * InpGapAtr;
      if(g_adds == 0 && g_gridN < InpLossLevels && gap > 0 && ((g_dir == 1 && ask <= mn - gap) || (g_dir == -1 && bid >= mx + gap)))
        {
         if(OpenTrade(g_dir) <= 0) return;
         g_gridN++;
         SaveState();
         continue;
        }
      return;
     }
  }

// naye M1 bar pe: Friday close, trend flip, phir nayi basket (turant, koi wait nahi)
void OnNewBar()
  {
   datetime bt = iTime(_Symbol, PERIOD_M1, 0);
   if(bt == 0 || bt == g_lastBar) return;
   g_lastBar = bt;
   g_trend = TrendSignal();
   g_atrNow = AtrNow();
   bool fri = FridayBlocked(bt);
   int n = CountPos();
   if(n > 0 && fri) { CloseAll("FRIDAY"); n = CountPos(); }
   if(n > 0 && InpFlipClose && g_trend != 0 && g_dir != 0 && g_trend != g_dir) { CloseAll("FLIP"); n = CountPos(); }
   if(n > 0 || g_dayStopped || g_paused || g_trend == 0 || fri || g_atrNow <= 0) return;
   int sp = (int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   if(InpMaxSpreadPts > 0 && sp > InpMaxSpreadPts) return;
   UpdateNews();
   if(g_newsBlock) return;
   g_basketId++;
   ResetBasket();
   g_dir = g_trend;
   g_atrB = g_atrNow;
   g_bStartBal = EaBalance();
   double op = OpenTrade(g_dir);
   if(op <= 0) { g_basketId--; ResetBasket(); SaveState(); return; }
   g_sl = (InpLossLevels == 0) ? op - g_dir * g_atrB * InpFirstSlAtr : 0;
   SaveState(); SyncBrokerSL();
   ManageBasket();
  }

//====================================================================
//  TRADE LOG (same columns as the Lab trades CSV)
//====================================================================
string LogName() { return "TPG_trades_" + _Symbol + "_" + (string)InpMagic + ".csv"; }

void LogDeal(const ulong deal)
  {
   if(!InpLogTrades || !HistoryDealSelect(deal)) return;
   if(HistoryDealGetString(deal, DEAL_SYMBOL) != _Symbol || HistoryDealGetInteger(deal, DEAL_MAGIC) != InpMagic) return;
   if(HistoryDealGetInteger(deal, DEAL_ENTRY) != DEAL_ENTRY_OUT) return;
   long posId = HistoryDealGetInteger(deal, DEAL_POSITION_ID);
   datetime ct = (datetime)HistoryDealGetInteger(deal, DEAL_TIME);
   double cp = HistoryDealGetDouble(deal, DEAL_PRICE), vol = HistoryDealGetDouble(deal, DEAL_VOLUME);
   double pr = HistoryDealGetDouble(deal, DEAL_PROFIT) + HistoryDealGetDouble(deal, DEAL_SWAP) + HistoryDealGetDouble(deal, DEAL_COMMISSION);
   long reasonCode = HistoryDealGetInteger(deal, DEAL_REASON);
   datetime ot = 0; double op = 0; string dir = "", cm = "";
   if(HistorySelectByPosition(posId))
     {
      for(int i = 0; i < HistoryDealsTotal(); i++)
        {
         ulong d = HistoryDealGetTicket(i);
         if(HistoryDealGetInteger(d, DEAL_ENTRY) == DEAL_ENTRY_IN)
           {
            ot = (datetime)HistoryDealGetInteger(d, DEAL_TIME);
            op = HistoryDealGetDouble(d, DEAL_PRICE);
            dir = (HistoryDealGetInteger(d, DEAL_TYPE) == DEAL_TYPE_BUY) ? "BUY" : "SELL";
            cm = HistoryDealGetString(d, DEAL_COMMENT);
            pr += HistoryDealGetDouble(d, DEAL_COMMISSION);
           }
        }
     }
   string reason = (reasonCode == DEAL_REASON_SL) ? "BROKER_SL" : (reasonCode == DEAL_REASON_TP) ? "BROKER_TP" :
                   (reasonCode == DEAL_REASON_EXPERT) ? (g_closeReason != "" ? g_closeReason : "EA") : "MANUAL";
   string bk = (StringFind(cm, CMT) == 0) ? StringSubstr(cm, StringLen(CMT)) : (string)g_basketId;
   int h = FileOpen(LogName(), FILE_READ | FILE_WRITE | FILE_TXT | FILE_ANSI);
   if(h == INVALID_HANDLE) return;
   if(FileSize(h) == 0)
      FileWriteString(h, "id,basket,dir,lot,open_time_server,open_time_ist,open_price,close_time_server,close_time_ist,close_price,profit,reason\r\n");
   FileSeek(h, 0, SEEK_END);
   FileWriteString(h, StringFormat("%I64d,%s,%s,%.2f,%s,%s,%s,%s,%s,%s,%.2f,%s\r\n", posId, bk, dir, vol,
                                   TStr(ot), TStr(ToIst(ot)), DoubleToString(op, _Digits), TStr(ct), TStr(ToIst(ct)), DoubleToString(cp, _Digits), pr, reason));
   FileClose(h);
  }

void OnTradeTransaction(const MqlTradeTransaction &trans, const MqlTradeRequest &request, const MqlTradeResult &result)
  {
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD) { g_realDirty = true; LogDeal(trans.deal); }
  }

//====================================================================
//  DASHBOARD (Gold Luxe)
//====================================================================
#define C_BG     C'0,0,0'
#define C_PANEL  C'20,18,11'
#define C_LINE   C'74,61,26'
#define C_GOLD   C'212,175,55'
#define C_GOLD2  C'243,215,122'
#define C_GOLDD  C'138,115,48'
#define C_TXT    C'233,228,212'
#define C_MUT    C'143,136,122'
#define C_OK     C'79,209,139'
#define C_BAD    C'255,93,93'
#define C_WARN   C'255,181,71'
#define F_SERIF  "Georgia"
#define F_SANS   "Segoe UI"
#define F_MONO   "Consolas"

double g_s = 1.0;      // layout scale (chart size)
double g_k = 1.0;      // DPI factor (dpi / 96): coordinates are physical pixels, fonts MT5 khud scale karta hai
int    g_dpi = 96;
int    P(const double v) { return (int)MathRound(v * g_s * g_k); }
int    FontPt(const double px) { return (int)MathMax(7, MathRound(px * g_s * 0.75)); }
void   Del(const string nm) { ObjectDelete(0, PFX + nm); }
string Dot() { return " " + ShortToString(0x00B7) + " "; }
string Spaced(const string s)
  {
   string o = "";
   int n = StringLen(s);
   for(int i = 0; i < n; i++) o += StringSubstr(s, i, 1) + (i < n - 1 ? " " : "");
   return o;
  }
string Money(double v)
  {
   string sg = (v < 0) ? "-" : "";
   v = MathAbs(v);
   string s = DoubleToString(v, 2);
   int dot = StringFind(s, ".");
   string ip = StringSubstr(s, 0, dot), fp = StringSubstr(s, dot), o = "";
   int c = 0;
   for(int i = StringLen(ip) - 1; i >= 0; i--)
     {
      o = StringSubstr(ip, i, 1) + o; c++;
      if(c % 3 == 0 && i > 0) o = "," + o;
     }
   return sg + "$" + o + fp;
  }

void Rect(const string nm, const int x, const int y, const int w, const int h, const color bg, const color bd, const int z = 0)
  {
   string n = PFX + nm;
   if(ObjectFind(0, n) < 0)
     {
      ObjectCreate(0, n, OBJ_RECTANGLE_LABEL, 0, 0, 0);
      ObjectSetInteger(0, n, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetInteger(0, n, OBJPROP_BORDER_TYPE, BORDER_FLAT);
      ObjectSetInteger(0, n, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, n, OBJPROP_HIDDEN, true);
      ObjectSetInteger(0, n, OBJPROP_BACK, false);
     }
   ObjectSetInteger(0, n, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, n, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, n, OBJPROP_XSIZE, MathMax(1, w));
   ObjectSetInteger(0, n, OBJPROP_YSIZE, MathMax(1, h));
   ObjectSetInteger(0, n, OBJPROP_BGCOLOR, bg);
   ObjectSetInteger(0, n, OBJPROP_COLOR, bd);
   ObjectSetInteger(0, n, OBJPROP_ZORDER, z);
  }
void Lbl(const string nm, const string txt, const int x, const int y, const double px, const color c, const string font = F_SANS, const bool right = false)
  {
   string n = PFX + nm;
   if(ObjectFind(0, n) < 0)
     {
      ObjectCreate(0, n, OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(0, n, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetInteger(0, n, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, n, OBJPROP_HIDDEN, true);
      ObjectSetInteger(0, n, OBJPROP_BACK, false);
      ObjectSetInteger(0, n, OBJPROP_ZORDER, 5);
     }
   ObjectSetInteger(0, n, OBJPROP_ANCHOR, right ? ANCHOR_RIGHT_UPPER : ANCHOR_LEFT_UPPER);
   ObjectSetInteger(0, n, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, n, OBJPROP_YDISTANCE, y);
   ObjectSetString(0, n, OBJPROP_TEXT, txt == "" ? " " : txt);
   ObjectSetString(0, n, OBJPROP_FONT, font);
   ObjectSetInteger(0, n, OBJPROP_FONTSIZE, FontPt(px));
   ObjectSetInteger(0, n, OBJPROP_COLOR, c);
  }
void Btn(const string nm, const string txt, const int x, const int y, const int w, const int h, const color bg, const color fg)
  {
   string n = PFX + nm;
   if(ObjectFind(0, n) < 0)
     {
      ObjectCreate(0, n, OBJ_BUTTON, 0, 0, 0);
      ObjectSetInteger(0, n, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetInteger(0, n, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, n, OBJPROP_HIDDEN, true);
      ObjectSetInteger(0, n, OBJPROP_ZORDER, 10);
     }
   ObjectSetInteger(0, n, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, n, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, n, OBJPROP_XSIZE, w);
   ObjectSetInteger(0, n, OBJPROP_YSIZE, h);
   ObjectSetString(0, n, OBJPROP_TEXT, txt);
   ObjectSetString(0, n, OBJPROP_FONT, F_SANS);
   ObjectSetInteger(0, n, OBJPROP_FONTSIZE, FontPt(13));
   ObjectSetInteger(0, n, OBJPROP_BGCOLOR, bg);
   ObjectSetInteger(0, n, OBJPROP_COLOR, fg);
   ObjectSetInteger(0, n, OBJPROP_BORDER_COLOR, C_GOLD);
   ObjectSetInteger(0, n, OBJPROP_STATE, false);
  }
void Bar(const string nm, const string title, const string valTxt, double frac, const color fill, const int x, const int y, const int w)
  {
   frac = MathMax(0, MathMin(1, frac));
   Lbl(nm + "_t", title, x, y, 10, C_GOLD);
   Lbl(nm + "_v", valTxt, x + w, y, 10, C_TXT, F_MONO, true);
   Rect(nm + "_tr", x, y + P(18), w, (int)MathMax(3, P(7)), C'48,41,20', C'48,41,20', 1);
   Rect(nm + "_f", x, y + P(18), (int)MathMax(1, w * frac), (int)MathMax(3, P(7)), fill, fill, 2);
  }

void Card(const string nm, const int x, const int y, const int w, const int h, const string title, const string val, const color vc, const string s1, const string s2)
  {
   Rect(nm, x, y, w, h, C_PANEL, C_LINE, 1);
   Lbl(nm + "_t", Spaced(title), x + P(12), y + P(9), 10, C_GOLD);
   Lbl(nm + "_v", val, x + P(12), y + P(25), 21, vc, F_SERIF);
   Lbl(nm + "_1", s1, x + P(12), y + P(58), 10, C_TXT);
   Lbl(nm + "_2", s2, x + P(12), y + P(75), 10, C_MUT);
  }

// Layout logical units (96 dpi, scale 1). Rows: header 0-44, P/L 52-128, banner 136-166,
// cards 176-272, bars 284-310, info 322-358, table 372+. Kam height pe table / info chhup jaate hain.
void Dash()
  {
   if(!InpDashboard) return;
   if(MQLInfoInteger(MQL_TESTER) && !MQLInfoInteger(MQL_VISUAL_MODE)) return;
   int W = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS), H = (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS, 0);
   if(W < 50 || H < 50) return;
   g_dpi = (int)TerminalInfoInteger(TERMINAL_SCREEN_DPI); if(g_dpi <= 0) g_dpi = 96;
   g_k = g_dpi / 96.0;
   double Wl = W / g_k, Hl = H / g_k;
   g_s = MathMax(0.8, MathMin(2.2, MathMin(Wl / 1000.0, Hl / 420.0)));
   double LW = Wl / g_s, LH = Hl / g_s;
   double M = 18, IW = LW - 2 * M;
   bool showInfo = LH >= 362, showTable = LH >= 400;

   Rect("bg", 0, 0, W, H, C_BG, C_BG, 0);
   datetime srv = NowServer();
   string up = ShortToString(0x25B2), dn = ShortToString(0x25BC);
   int n = g_ready ? CountPos() : 0;
   double pl = g_ready ? BasketPL() : 0;
   double net = g_ready ? EaNetPL() : 0;
   double eaEq = g_ready ? EaEquity() : 0;
   bool combo = InpLossLevels > 0;

   // header
   Lbl("brand", Spaced("TREND PYRAMID GRID") + "   " + EA_VERSION, P(M), P(10), 11, C_GOLD);
   Lbl("sub", (combo ? "COMBO" : "PURE") + Dot() + "step $" + DoubleToString(InpStepPrice, 0) + Dot() + "lot " + DoubleToString(InpLot, 2) + Dot() + _Symbol + Dot() + "Magic " + (string)InpMagic + Dot() + "Lab: samu-strategy/4", P(M), P(28), 10, C_MUT);
   Lbl("ist", "IST  " + TimeToString(ToIst(srv), TIME_SECONDS), P(M + IW), P(9), 13, C_GOLD2, F_MONO, true);
   Lbl("srv", "SERVER  " + TimeToString(srv, TIME_SECONDS), P(M + IW), P(28), 10, C_MUT, F_MONO, true);

   // big P/L (sirf is EA ke trades)
   Lbl("eqT", Spaced(Paper() ? "PAPER P/L" : "EA P/L"), P(M), P(52), 10, C_GOLD);
   Lbl("eq", (net >= 0 ? "+" : "") + Money(net), P(M), P(64), 38, net >= 0 ? C_GOLD : C_BAD, F_SERIF);
   double ml = AccountInfoDouble(ACCOUNT_MARGIN_LEVEL);
   Lbl("eqS", (Paper() ? "PAPER MODE (koi asli order nahi)     " : "LIVE TRADING     ") + "EA equity " + Money(eaEq) + "     Band trades " + Money(g_realized) + "     Khuli basket " + Money(pl) +
       "     Margin " + (ml > 0 ? DoubleToString(ml, 0) + "%" : "-"), P(M), P(112), 10, C_MUT);

   // buttons
   int bw = P(120), bh = P(32);
   Btn("btnClose", "CLOSE ALL", P(M + IW) - bw, P(66), bw, bh, C'48,10,10', C_BAD);
   Btn("btnPause", g_paused ? "RESUME" : "PAUSE", P(M + IW) - 2 * bw - P(10), P(66), bw, bh, g_paused ? C_GOLD : C_PANEL, g_paused ? C_BG : C_GOLD);

   // alert banner
   string al; color ac = C_TXT, ab = C'18,15,7';
   int sp = (int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   double accEq = AccountInfoDouble(ACCOUNT_EQUITY);
   if(!g_ready) { al = "CONFIG ERROR: " + g_cfgErr; ac = C_BAD; ab = C'34,8,8'; }
   else if(Paper() && RealCount() > 0) { al = StringFormat("PAPER MODE  -  magic %I64d ki %d ASLI trade khuli hai: haath se band karo, EA ise nahi chhoota", InpMagic, RealCount()); ac = C_WARN; ab = C'34,24,6'; }
   else if(g_lastErr != "" && TimeCurrent() - g_lastErrT < 60) { al = g_lastErr; ac = C_BAD; ab = C'34,8,8'; }
   else if(g_dayStopped && g_dayStopReason == "DAY_TARGET") { al = "DAILY TARGET HIT  -  " + InpResetIST + " IST tak nayi trade band"; ac = C_OK; ab = C'8,30,20'; }
   else if(g_dayStopped) { al = "DAILY LOSS LIMIT HIT  -  " + InpResetIST + " IST tak trading band"; ac = C_BAD; ab = C'34,8,8'; }
   else if(g_paused) { al = "PAUSED  -  nayi trade band, khuli basket ke TP/SL chal rahe hain"; ac = C_WARN; ab = C'34,24,6'; }
   else if(!Paper() && InpOwnMode && InpAllocBalance > accEq) { al = StringFormat("DHYAN: base $%.0f > account equity $%.2f  -  daily loss account se bada ho sakta hai", InpAllocBalance, accEq); ac = C_WARN; ab = C'34,24,6'; }
   else if(n == 0 && FridayBlocked(srv)) { al = "FRIDAY CLOSE  -  Friday " + InpFridayTime + " (server) ke baad / weekend nayi basket nahi"; ac = C_WARN; ab = C'34,24,6'; }
   else if(n == 0 && g_newsBlock) { al = g_newsTxt; ac = C_WARN; ab = C'34,24,6'; }
   else if(InpMaxSpreadPts > 0 && sp > InpMaxSpreadPts) { al = StringFormat("Spread high: %d pts (max %d)  -  nayi basket ruki", sp, InpMaxSpreadPts); ac = C_WARN; ab = C'34,24,6'; }
   else if(g_warnMsg != "") { al = g_warnMsg; ac = C_WARN; ab = C'34,24,6'; }
   else if(n == 0 && g_trend == 0) { al = "Trend ready nahi (EMA " + (string)InpEmaSlow + " ke liye history chahiye)"; ac = C_MUT; }
   else if(n == 0) { al = (Paper() ? "PAPER READY  -  agle M1 bar pe turant virtual " : "READY  -  agle M1 bar pe turant ") + (g_trend == 1 ? "BUY" : "SELL") + " basket"; ac = C_GOLD2; }
   else { al = StringFormat("%sBasket #%I64d %s  -  %d trades (adds %d, grid %d)", Paper() ? "PAPER " : "", g_basketId, g_dir == 1 ? "BUY" : "SELL", n, g_adds, g_gridN); ac = C_GOLD2; }
   Rect("al", P(M), P(136), P(IW), P(30), ab, ac, 1);
   Lbl("alT", al, P(M + 12), P(143), 11, ac);

   // 4 cards
   double gap = 10, cw = (IW - 3 * gap) / 4.0;
   string tv = (g_trend == 1) ? up + " BUY" : (g_trend == -1) ? dn + " SELL" : "-";
   color tc = (g_trend == 1) ? C_OK : (g_trend == -1) ? C_BAD : C_MUT;
   Card("cT", P(M), P(176), P(cw), P(96), "TREND", tv, tc,
        StringFormat("EMA %d %s / EMA %d %s", InpEmaFast, DoubleToString(g_emaF, 2), InpEmaSlow, DoubleToString(g_emaS, 2)),
        EnumToString(InpTrendTF) + " closed bar" + Dot() + "ATR " + DoubleToString(g_atrNow, 2));
   string slTxt = (g_sl > 0) ? "SL " + DoubleToString(g_sl, _Digits) : (n > 0 && combo ? "SL nahi (max -" + Money(InpMaxLossUsd) + ")" : "SL -");
   Card("cB", P(M + cw + gap), P(176), P(cw), P(96), "BASKET", StringFormat("%d trades", n), C_GOLD2, "P/L " + Money(pl) + Dot() + "adds " + (string)g_adds + Dot() + "grid " + (string)g_gridN, slTxt);
   double today = eaEq - g_dayStartEq;
   Card("cD", P(M + 2 * (cw + gap)), P(176), P(cw), P(96), "TODAY", (today >= 0 ? "+" : "") + Money(today), today >= 0 ? C_OK : C_BAD,
        StringFormat("%+.2f%% of %s", g_dayStartEq > 0 ? today / g_dayStartEq * 100 : 0, Money(g_dayStartEq)), "Reset " + InpResetIST + " IST");
   string na = "-", ng = "-";
   if(n > 0)
     {
      double mx, mn; EntryRange(mx, mn);
      if(g_gridN == 0 && g_adds < InpMaxAdds) na = DoubleToString(g_dir == 1 ? mx + InpStepPrice : mn - InpStepPrice, _Digits);
      if(combo && g_adds == 0 && g_gridN < InpLossLevels && g_atrB > 0) ng = DoubleToString(g_dir == 1 ? mn - g_atrB * InpGapAtr : mx + g_atrB * InpGapAtr, _Digits);
     }
   Card("cC", P(M + 3 * (cw + gap)), P(176), P(cw), P(96), "CYCLE", "#" + (string)g_basketId, C_GOLD2, "Next add " + na, "Next grid " + ng);

   // progress bars
   double bg2 = 26, bwl = (IW - 2 * bg2) / 3.0;
   Bar("pT", "TARGET", StringFormat("%s / %s", Money(MathMax(0, today)), Money(InpDailyTargetUsd)), InpDailyTargetUsd > 0 ? today / InpDailyTargetUsd : 0, C_GOLD, P(M), P(284), P(bwl));
   Bar("pD", "DD OF LIMIT", StringFormat("%s / %s", Money(MathMax(0, -today)), Money(InpDailyLossUsd)), InpDailyLossUsd > 0 ? -today / InpDailyLossUsd : 0, C_BAD, P(M + bwl + bg2), P(284), P(bwl));
   if(combo) Bar("pS", "BASKET MAX LOSS", StringFormat("%s / %s", Money(MathMax(0, -pl)), Money(InpMaxLossUsd)), InpMaxLossUsd > 0 ? -pl / InpMaxLossUsd : 0, C_WARN, P(M + 2 * (bwl + bg2)), P(284), P(bwl));
   else Bar("pS", "BASKET TP", StringFormat("%s / %s", Money(MathMax(0, pl)), Money(InpBasketTpUsd)), InpBasketTpUsd > 0 ? pl / InpBasketTpUsd : 0, C_OK, P(M + 2 * (bwl + bg2)), P(284), P(bwl));

   // info (2 lines)
   if(showInfo)
     {
      Lbl("info", "Trades " + (string)n + Dot() + "Lot " + DoubleToString(InpLot, 2) + Dot() + "Step $" + DoubleToString(InpStepPrice, 2) + " (max " + (string)InpMaxAdds + ")" + Dot() + "Trail $" + DoubleToString(g_trail, 2) +
          Dot() + (combo ? "Grid " + (string)InpLossLevels + " x ATR" + DoubleToString(InpGapAtr, 1) + ", recover " + Money(InpRecoverUsd) + ", max -" + Money(InpMaxLossUsd) : "Pure: SL ATR x" + DoubleToString(InpFirstSlAtr, 1)) +
          Dot() + "Basket TP " + (InpBasketTpUsd > 0 ? Money(InpBasketTpUsd) : "off"), P(M), P(322), 10, C_MUT);
      Lbl("info2", "Daily +" + Money(InpDailyTargetUsd) + " / -" + Money(InpDailyLossUsd) + Dot() + "Spread " + (string)sp + " pts" + Dot() + "News " + (g_newsBlock ? "BLOCK" : g_newsTxt) +
          Dot() + "Fri " + (InpFridayClose ? InpFridayTime + " srv" : "off") + Dot() + (Paper() ? "PAPER" : "LIVE") + (InpBrokerSL && !Paper() ? " (broker SL on)" : "") +
          Dot() + (InpOwnMode ? "Base " + Money(InpAllocBalance) : "Account P/L mode") + (InpMinMarginLevel > 0 ? Dot() + "Margin guard " + DoubleToString(InpMinMarginLevel, 0) + "%" : ""), P(M), P(340), 10, C_MUT);
     }
   else { Del("info"); Del("info2"); }

   // trade table
   double cx[6]; cx[0] = M; cx[1] = M + 44; cx[2] = M + 120; cx[3] = M + 196; cx[4] = M + 320; cx[5] = M + IW;
   string hd[6] = {"#", "TYPE", "LOT", "OPEN", "TIME (IST)", "P/L"};
   int maxRows = showTable ? (int)MathMax(0, MathMin(12, MathFloor((LH - 396) / 19.0))) : 0;
   if(showTable)
     {
      for(int c = 0; c < 6; c++) Lbl("th" + (string)c, hd[c], P(cx[c]), P(372), 9, C_GOLD, F_SANS, c == 5);
      Rect("thl", P(M), P(388), P(IW), 1, C_LINE, C_LINE, 1);
     }
   else { for(int c = 0; c < 6; c++) Del("th" + (string)c); Del("thl"); }
   int rd[]; double rl[], ro[], rp[]; datetime rt[];
   int rn = CollectRows(rd, rl, ro, rt, rp);
   int row = 0;
   for(int i = 0; i < rn && row < maxRows; i++)
     {
      bool buy = rd[i] == 1;
      double y = 394 + row * 19;
      Lbl("r" + (string)row + "_0", (string)(row + 1), P(cx[0]), P(y), 10, C_MUT, F_MONO);
      Lbl("r" + (string)row + "_1", buy ? "BUY" : "SELL", P(cx[1]), P(y), 10, buy ? C_OK : C_BAD, F_MONO);
      Lbl("r" + (string)row + "_2", DoubleToString(rl[i], 2), P(cx[2]), P(y), 10, C_TXT, F_MONO);
      Lbl("r" + (string)row + "_3", DoubleToString(ro[i], _Digits), P(cx[3]), P(y), 10, C_TXT, F_MONO);
      Lbl("r" + (string)row + "_4", TimeToString(ToIst(rt[i]), TIME_MINUTES), P(cx[4]), P(y), 10, C_MUT, F_MONO);
      Lbl("r" + (string)row + "_5", Money(rp[i]), P(cx[5]), P(y), 10, rp[i] >= 0 ? C_OK : C_BAD, F_MONO, true);
      row++;
     }
   for(int r = row; r < 12; r++)
      for(int c = 0; c < 6; c++) Del("r" + (string)r + "_" + (string)c);
   if(showTable && row == 0) Lbl("empty", "Koi khuli trade nahi", P(M), P(396), 10, C_MUT); else Del("empty");
   if(showTable && n > row && row > 0) Lbl("more", StringFormat("+%d aur (chart ki height badhao)", n - row), P(M + IW), P(396 + row * 19), 9, C_MUT, F_SANS, true); else Del("more");
   ChartRedraw(0);
  }

//====================================================================
//  EVENTS
//====================================================================
bool CheckInputs(string &err)
  {
   err = "";
   if(InpLot <= 0) err += "Lot > 0 chahiye; ";
   if(InpStepPrice <= 0) err += "Step > 0 chahiye; ";
   if(InpMaxAdds < 0) err += "Max adds >= 0; ";
   if(InpEmaFast < 1 || InpEmaSlow <= InpEmaFast) err += "EMA fast < EMA slow chahiye; ";
   if(InpTrendBars < InpEmaSlow + 50) err += "Trend bars >= EMA slow + 50; ";
   if(InpAtrPeriod < 1) err += "ATR period >= 1; ";
   if(InpLossLevels < 0) err += "Loss levels >= 0; ";
   if(InpLossLevels == 0 && InpFirstSlAtr <= 0) err += "Pure mode (loss levels 0) mein First SL ATR > 0 chahiye; ";
   if(InpLossLevels > 0 && (InpGapAtr <= 0 || InpMaxLossUsd <= 0)) err += "Combo: Gap ATR aur Max loss > 0 chahiye; ";
   if(InpTrailGap < 0) err += "Trail gap >= 0; ";
   int rs = HhmmToMin(InpResetIST);
   if(rs < 0) err += "Reset time HH:MM; "; else g_resetSec = rs * 60;
   int fm = HhmmToMin(InpFridayTime);
   if(fm < 0) err += "Friday time HH:MM; "; else g_friMin = fm;
   g_trail = InpTrailGap > 0 ? InpTrailGap : InpStepPrice;
   return err == "";
  }

int OnInit()
  {
   trade.SetExpertMagicNumber(InpMagic);
   trade.SetDeviationInPoints(InpSlippagePts);
   trade.SetTypeFillingBySymbol(_Symbol);

   g_ready = CheckInputs(g_cfgErr);
   if(g_ready && Paper() == false)
     {
      string clash = "";
      if(MagicClash(clash)) { g_ready = false; g_cfgErr = clash; }
     }
   if(!g_ready)
     {
      Print(EA_NAME, " input error: ", g_cfgErr);
      Alert(EA_NAME, ": ", g_cfgErr);
      if(MQLInfoInteger(MQL_TESTER)) return INIT_PARAMETERS_INCORRECT;
      if(InpDashboard) { if(InpHidePriceChart) ChartSetInteger(0, CHART_SHOW, false); Dash(); }
      EventSetTimer(1);
      return INIT_SUCCEEDED;
     }
   g_warnMsg = "";
   double cs = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_CONTRACT_SIZE);
   if(MathAbs(cs - 100) > 1e-9) g_warnMsg = StringFormat("Contract size %.0f hai (Lab gold = 100): $ values ka matlab badal jaayega", cs);
   if(StringFind(_Symbol, "XAU") < 0) g_warnMsg = "Ye EA XAUUSD ke liye test hua hai, chart " + _Symbol + " hai";

   // own mode start time
   if(InpAllocFrom > 0) g_since = InpAllocFrom;
   else { g_since = (datetime)GVGet("since", 0); if(g_since == 0) { g_since = TimeCurrent(); GVSet("since", (double)g_since); } }
   g_realDirty = true;
   if(Paper())
     {
      LoadVP();
      if(InpAllocFrom == 0 && GVGet("paperSince", 0) == 0) GVSet("paperSince", (double)TimeCurrent());
      if(InpAllocFrom == 0) g_since = (datetime)GVGet("paperSince", (double)g_since);
     }

   // restore state (EA restart / VPS reboot)
   g_basketId = (long)GVGet("basketId", 0);
   g_paused   = GVGet("paused", 0) == 1;
   long dk = DayKeyOf(NowServer());
   if((long)GVGet("dayKey", -1) == dk)
     {
      g_dayKey = dk;
      g_dayStartEq = GVGet("dayStartEq", EaEquity());
      int ds = (int)GVGet("dayStopped", 0);
      g_dayStopped = ds > 0; g_dayStopReason = ds == 1 ? "DAY_TARGET" : ds == 2 ? "DAY_LOSS" : "";
     }
   if(CountPos() > 0)
     {
      g_dir       = (int)GVGet("dir", BasketDirFromPositions());
      if(g_dir == 0) g_dir = BasketDirFromPositions();
      g_adds      = (int)GVGet("adds", 0);
      g_gridN     = (int)GVGet("gridN", 0);
      g_sl        = GVGet("sl", 0);
      g_atrB      = GVGet("atrB", AtrNow());
      g_peak      = GVGet("peak", BasketPL());
      g_bMin      = GVGet("bMin", 0);
      g_bStartBal = GVGet("bStartBal", EaBalance());
     }
   else ResetBasket();
   NewDayCheck();
   g_trend  = TrendSignal();
   g_atrNow = AtrNow();
   g_lastBar = 0;                    // turant entry: pehle tick pe hi basket (agar sab ok)
   SaveState();
   UpdateNews();

   if(InpDashboard && !(MQLInfoInteger(MQL_TESTER) && !MQLInfoInteger(MQL_VISUAL_MODE)))
     {
      if(InpHidePriceChart) ChartSetInteger(0, CHART_SHOW, false);
      Dash();
     }
   EventSetTimer(1);
   PrintFormat("%s %s ready [%s]: %s, lot %.2f, step $%.2f, max adds %d, trail $%.2f, %s, TP %s, daily +$%.0f / -$%.0f, base $%.0f",
               EA_NAME, EA_VERSION, Paper() ? "PAPER - koi asli order nahi" : "LIVE TRADING", InpLossLevels > 0 ? "COMBO" : "PURE", InpLot, InpStepPrice, InpMaxAdds, g_trail,
               InpLossLevels > 0 ? StringFormat("grid %d x ATR%.1f, recover $%.0f, max loss $%.0f", InpLossLevels, InpGapAtr, InpRecoverUsd, InpMaxLossUsd) : StringFormat("SL ATR x%.1f", InpFirstSlAtr),
               InpBasketTpUsd > 0 ? "$" + DoubleToString(InpBasketTpUsd, 0) : "off", InpDailyTargetUsd, InpDailyLossUsd, InpAllocBalance);
   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
   SaveState();
   ObjectsDeleteAll(0, PFX);
   ChartSetInteger(0, CHART_SHOW, true);
   ChartRedraw(0);
  }

void OnTick()
  {
   if(!g_ready) return;
   NewDayCheck();
   ManageBasket();
   OnNewBar();
   if(GetTickCount() - g_lastDash > 500) { g_lastDash = GetTickCount(); Dash(); }
  }

void OnTimer()
  {
   if(g_ready) UpdateNews();
   if(InpDashboard) Dash();
  }

void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam)
  {
   if(id == CHARTEVENT_CHART_CHANGE) { Dash(); return; }
   if(id != CHARTEVENT_OBJECT_CLICK) return;
   if(sparam == PFX + "btnPause")
     {
      g_paused = !g_paused;
      SaveState();
      Print(EA_NAME, g_paused ? ": PAUSED" : ": RESUMED");
     }
   else if(sparam == PFX + "btnClose")
     {
      if(CountPos() > 0) { CloseAll("MANUAL_CLOSE_ALL"); Print(EA_NAME, ": CLOSE ALL button"); }
     }
   else return;
   ObjectSetInteger(0, sparam, OBJPROP_STATE, false);
   Dash();
  }
//+------------------------------------------------------------------+
