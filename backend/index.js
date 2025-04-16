const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const { spawn } = require("child_process");
const strategies = require("./services");
const loadKeypair = require("./utils/wallet");
const connection = require("./config/rpc");
require("dotenv").config();

const modeFromCLI = process.argv[2];

if (modeFromCLI) {
  // === CLI Mode Runner ===
  (async () => {
    try {
      const wallet = loadKeypair();
      const balance = await connection.getBalance(wallet.publicKey);
      console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
      console.log(`Balance: ${balance / 1e9} SOL`);

      if (!strategies[modeFromCLI]) {
        console.error(`❌ Invalid mode: ${modeFromCLI}`);
        console.log(`✅ Available modes: ${Object.keys(strategies).join(", ")}`);
        process.exit(1);
      }

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

  let currentModeProcess = null;

  app.use(cors());
  app.use(express.json());

  // Dynamic strategy control
  const apiRouter = require("./routes");
app.use("/api", (req, res, next) => {
  req.currentModeProcess = currentModeProcess;
  req.setModeProcess = (proc) => {
    currentModeProcess = proc;
  };
  next();
}, apiRouter);

  // Create HTTP + WebSocket server
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("🧠 LogsConsole connected via WebSocket");

    const originalLog = console.log;
    console.log = (...args) => {
      const line = args.join(" ");
      if (ws.readyState === ws.OPEN) {
        ws.send(line);
      }
      originalLog(...args);
    };

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
