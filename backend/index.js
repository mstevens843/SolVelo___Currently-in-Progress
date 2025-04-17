/** index.js - Dual-mode bot controller: CLI launcher or Express + WebSocket server. 
 * 
 * Features: 
 * - CLI Mode:
 *      - Accepts aa strategy name via `process.argv[2]
 *      - Loads wallet + balance
 *      - Launces strategy directly from `./services/strategies`
 * 
 * - Server Mode: 
 *      - Starts Express REST API and WebSocket server on PORT 5001
 *      - Exposes `/api/*` strategy control endpoint
 *      - WebSocket broadcasts console logs to connected frontend
 *      - Shares `currentModeProcess` between routes for process control 
 * 
 * - Used as the main entry point for both development (server mode)
 * and production script execution (CLI Mode)
 */

const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const { spawn } = require("child_process");
const strategies = require("./services/strategies");
const loadKeypair = require("./utils/wallet");
const connection = require("./config/rpc");
require("dotenv").config();

// If a mode is passed via CLI, run strategy directly.
const modeFromCLI = process.argv[2];

if (modeFromCLI) {
  // === CLI Mode Runner ===
  (async () => {
    try {
        // Load wallet & fetch balance
      const wallet = loadKeypair();
      const balance = await connection.getBalance(wallet.publicKey);
      console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
      console.log(`Balance: ${balance / 1e9} SOL`);
        // invalid strategy check
      if (!strategies[modeFromCLI]) {
        console.error(`❌ Invalid mode: ${modeFromCLI}`);
        console.log(`✅ Available modes: ${Object.keys(strategies).join(", ")}`);
        process.exit(1);
      }
      // Start strategy
      console.log(`🚀 Starting ${modeFromCLI} strategy...`);
      strategies[modeFromCLI]();
    } catch (err) {
      console.error("❌ Error loading wallet or fetching balance:", err.message);
    }
  })();
} else {
  // === Express + WebSocket Server Mode ===
  const app = express();
  const PORT = process.env.PORT || 5001;

  let currentModeProcess = null; // Track current running strategy (if spawned via API)

  app.use(cors());
  app.use(express.json());

  /**
   * API ROuter Injection
   * Injects current mode process and setter for use in route files
   */
  const apiRouter = require("./api");
  app.use("/api", (req, res, next) => {
    req.currentModeProcess = currentModeProcess;
    req.setModeProcess = (proc) => {
        currentModeProcess = proc;    
    };
    next();
}, apiRouter);

  // Create HTTP + WebSocket server (for logsConsole)
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });


  /** 
   * WebSocket connection for real-time logs
   * Overrides console.log and mirrors to frontend via WS. 
   */
  wss.on("connection", (ws) => {
    console.log("🧠 LogsConsole connected via WebSocket");

    // Store original log gunction
    const originalLog = console.log;
    console.log = (...args) => {
      const line = args.join(" ");
      if (ws.readyState === ws.OPEN) {
        ws.send(line);
      }
      originalLog(...args);
    };

    // Restore log on disconnect
    ws.on("close", () => {
      console.log("🔌 WebSocket disconnected");
      console.log = originalLog;
    });
  });

  // Launch server
  server.listen(PORT, () => {
    console.log(`🧠 Bot controller API + WS running @ http://localhost:${PORT}`);
  });
}
