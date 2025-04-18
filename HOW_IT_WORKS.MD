The Solana Trading Bot platform is a full statck system built to automate and manage on-chain trading strategies with real-time visibility 
The backend is powered by Node.js and Express, handling both a REST API and a WebSocket server. 
It suppoets two main entry points: running strategies directly via CLI or managing them through a server-based dashboard. 
Strategies are modular, house under a central controller that dynamically loads the correct logic based on user input. 

Core utilities handle token monitoring, quote fetching, transaction execution, and wallet rotation. A secondary layer of service utilities 
supports logging, trade tracking, recap generation, and Telegram alerts for real-time feedback. 


Configurations are passed via CLI or dashboard and injected into the runtime environment, allowing strategies to remain stateless and swappable.
Trade results are stored in memory or flat files. with support for live export and daily performance recaps. The WebSocket layer broadcasts backend
logs directly to the frontend, allowing users to monitor the bot's internal behavior in real time. 

On the frontend a Vite + React dashboard enables users to configure strategy parameters, toggle between strategies, start/stop the bot, and view
visualized metrics. Components include real-time log viewers, live-updating charts for portfolio performance and trade output, a trade history table, 
and a recap panel summarizing daily PnL and performance. The UI persists confoig preferences via localStorage and offers CSV export, log reset, and 
strategy filtering tools. 

Together, This architecture allows the system to run either headlessly (via CLI) or interactively (via Dashboard). making it suitable for both production
bots and development experimentation. The platform is fully modular and designed to scale, new strategies, metrics, or integrations can be added without 
disrupting the core flow. 

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


