/** Mode Routes: Mode Control Routes for Solana Bot Strategies
 * - Controls starting, stopping, and checking the status of trading bots.
 * - Handles child process spawning and auto-restart logic.
 */
const express = require("express");
const { spawn } = require("child_process");
const router = express.Router();
const fs = require("fs");
const path = require("path");

let currentModeProcess = null;
let lastConfigPath = null;
let lastMode = null;

/** 
 * @route POST /api/mode/start
 * @desc Start a new trading strategy bot process 
 */
router.post("/start", (req, res) => {
  const { mode, config } = req.body;
  console.log("🛰️ Received start request:", { mode, config });

  if (!mode || !config) {
    return res.status(400).json({ error: "Mode and config are required." });
  }

  if (currentModeProcess) {
    return res.status(409).json({ error: "A bot is already running." });
  }

  const configDir = path.join(__dirname, "../runtime");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
  }

  const timestamp = Date.now();
  const configFilename = `${mode}-${timestamp}.json`;
  const configPath = path.join(configDir, configFilename);

  try {
    const sanitizedConfig = {
      ...config,
      wallets: (config.wallets || []).map((w) =>
        w.trim().replace(/^"+|"+$/g, "")
      ),
    };

    fs.writeFileSync(configPath, JSON.stringify(sanitizedConfig, null, 2));
    console.log("✅ Config written:", configPath);

    lastConfigPath = configPath;
    lastMode = mode;
  } catch (err) {
    console.error("❌ Failed to write config file:", err.message);
    return res.status(500).json({ error: "Failed to write config file." });
  }

  console.log("🚀 Spawning strategy:", mode);

  const proc = spawn("node", [`services/strategies/${mode}.js`, configPath], {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  currentModeProcess = proc;

  proc.on("exit", (code, signal) => {
    console.warn(`⚠️ Bot exited: code ${code}, signal ${signal}`);
    currentModeProcess = null;

    const shouldRestart = JSON.parse(req.headers["x-auto-restart"] || "true");

    if (shouldRestart && lastMode && lastConfigPath) {
      console.log("🔁 Restarting bot...");

      setTimeout(() => {
        const retryProc = spawn("node", [`services/strategies/${lastMode}.js`, lastConfigPath], {
          stdio: "inherit",
          cwd: process.cwd(),
        });

        currentModeProcess = retryProc;
      }, 3000);
    }
  });

  return res.json({ message: `${mode} started.` });
});

/**
 * @route POST /api/mode/stop
 * @desc Gracefully stop the current bot process
 */
router.post("/stop", (req, res) => {
  if (!currentModeProcess) {
    return res.status(400).json({ error: "No bot is currently running." });
  }

  currentModeProcess.kill("SIGINT");
  currentModeProcess = null;
  return res.json({ message: "Bot stopped." });
});

/**
 * @route GET /api/mode/status
 * @desc Returns bot status and mode info
 */
router.get("/status", (req, res) => {
  const running = !!currentModeProcess;
  return res.json({
    running,
    mode: lastMode || "idle",
    configPath: lastConfigPath || null,
  });
});

module.exports = router;
