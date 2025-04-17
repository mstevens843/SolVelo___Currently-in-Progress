The Solana Trading Bot platform is a full statck system built to automate and manage on-chain trading strategies with real-time visibility 
THe backend is powered by Node.js and Express, handling both a REST API and a WebSocket server. 
It suppoets two main entry points: running strategies directly via CLI or managing them through a server-based dashboard. 
Strategies are modular, house under a central controller that dynamically loads the correct logic based on user input. 


## Additional File Structure Additions:
/backend
  ├── routes/
  │   ├── trades.js           New API for trade logs (merged from all bots)
  │   └── status.js           (Optional) Bot running mode/status route
  ├── logs/                   Per-strategy trade history (sniper.json, etc.)
  └── utils/
      ├── logTrade.js         Appends structured logs to file per strategy
      └── analyticsLogger.js ← 🔜 For Phase 5 PnL summaries

/frontend
  ├── components/
  │   ├── TradeChart.jsx     ← ✅ New: line graph of outAmount over time
  │   ├── ConfigPanel.jsx    ← ✅ New: edit and persist strategy config
  │   └── LogsConsole.jsx    ← ✅ New: real-time log stream (WebSocket)


