## Solana Trading Bot Dashboard
- A full-stack modular trading bot for Solana built with Node.js, React, Vite, Express, Websockets, and Jupiter Aggregator. 
- Includes real-time mode switching, trade execution, logging, and visual tracking -- all from a sleek web
dashboard. 


## Features
**Strategy Control**:
- Start/Stop any trading strategy (Scalper, Sniper, Breakout, Chad mode, etc. )
- Mode selection from frontend UI (React) 
- Server-side execution handled via Express + Node

**Real-Time Logs**: 
- WebSocket-powered log streaming from backend to UI 
- Auto-updates without refresh. 
- Console piped directly into the frontend

**Trade History Panel**:
- Log all swaps with 
- timestamp, strategy used, input/output token, amounts & impact, success status
- Data pulled from trades.json 

**Toast Notifications**: 
- Live frontend feedback for: 
- Strategy start/stop
- API Failures
- Runtime errors 

**Active Mode Banner**: 
- Real-time display of current running bot 
- Auto-clears when stopped .




### File Structure
/backend
  ├── services/             ← Strategy logic (scalper.js, sniper.js, etc.)
  ├── routes/
  │   ├── modeRouter.js     ← API: start/stop bot
  │   └── tradeRouter.js    ← API: fetch trade history
  ├── utils/                ← swap, wallet, market data logic
  ├── config/               ← RPC setup
  ├── index.js              ← CLI + Express hybrid entrypoint
  ├── trades.json           ← Persistent trade history log

/frontend
  ├── components/
  │   ├── ModeSelector.jsx
  │   ├── StartStopControls.jsx
  │   ├── LogsConsole.jsx
  │   └── TradeTable.jsx
  ├── styles/dashboard.css
  ├── App.jsx               ← Orchestrates all frontend logic
  ├── main.jsx






### Tech Stack
**Layer / Backend**: 
- Backend / Node.js, Express, WebSockets, dotenv, fs, 
- Blockchain / Solana + Jupiter API via `@solana/web3.js`
- Frontend / React 19, Vite, Tailwind-ready 
- UI Feedback / `react-toastify`
- Logging / Console -> WebSocket -> React 
- Deployment / Render (planned) 




### How it Works 
1. Frontend user selects a strategy -> sent via `POST /api/mode/start`
2. Backend launches `node services/[mode].js via child process. 
3. Backend pips all `console.log` to a WebSocket stream -> showl ive in UI. 
4. Trade info is logged to `trades.json` -> loaded into the dashboard table. 
5. User can stop any strategy -> `POST /api/mode/stop`. 


### Strategies Supported 
- Scalper
- Sniper
- Breakout
- Chad mode
- Dip Buyer
- Trend Follower
- Delayed Sniper 
- Rotation Bot 
- Rebalancer 
- Paper Trader

**All Strategies are modular and follow the same `getSwapQuote -> executeSwap` flow using Jupiter's swap API.** 


### Running Locally 

# Backend
cd backend
npm install
node index.js     # or just let frontend control modes

# Frontend 
cd frontend
npm install
npm run dev

**Deployment: Render** 



**Future Upgrades**: 
- Mode queueing system 
- Webhook integration
- Live Price Chart
- Trade PnL summary 
- API keys + wallet masking in logs 

