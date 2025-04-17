/** Mode Routes: Mode Control Routes for Solana Bot Strategies
 * - Controls starting, stopping, and checking th estatus of trading bots. 
 * - Handles child process spawning and auto-restart logic. 
 */
const express = require("express");
const { spawn } = require("child_process");
const router = express.Router();

let lastStarted = null; // Store the most recent mode/config for restart



/** 
 * @route Public POST /api/mode/start
 * @desc: Start a new trading stategy bot process 
 */
router.post("/start", (req, res) => {
    const { mode, config } = req.body;
  
    if (!mode) {
      return res.status(400).json({ error: "Mode is required." });
    }
  
    if (req.currentModeProcess) {
      return res
        .status(409)
        .json({ error: "Another mode is already running." });
    }

    // track last started config for potential auto-restart
    lastStarted = { mode, config };   
    
    // Inject cofig into process.env for child process.
    const configEnv = {
      ...process.env,
      BOT_CONFIG: JSON.stringify(config || {}),
    };
    
    // Inject config into process.env for child process
    const proc = spawn("node", [`services/${mode}.js`], {
      stdio: "inherit",
      cwd: process.cwd(),
      env: configEnv,
    });
    
    req.setModeProcess(proc); // attach bot process globally

    // Handle bot crash/exit
    proc.on("exit", (code, signal) => {
        console.warn(`⚠️ Bot process exited with code ${code} / signal ${signal}`);
      
        // Clear the current process state
        req.setModeProcess(null);
      
        // Auto-restart logic
        const shouldRestart = JSON.parse(
          req.headers["x-auto-restart"] || "true"
        );
        
        // Auto-restart logic
        if (shouldRestart && lastStarted) {
          console.log("🔁 Auto-restarting bot with last known config...");
      
          setTimeout(() => {
            const retryProc = spawn("node", [`services/${lastStarted.mode}.js`], {
              stdio: "inherit",
              cwd: process.cwd(),
              env: {
                ...process.env,
                BOT_CONFIG: JSON.stringify(lastStarted.config || {}),
              },
            });
      
            req.setModeProcess(retryProc);
          }, 3000); // wait 3 sec before restart
        }
      });
  
    console.log(`🚀 Starting ${mode} with config:`, config);
  
    return res.json({ message: `${mode} started.` });
  });
  




/**
 * @route POST /api/mode/stop
 * @access Public
 * @desc: Gracefully stop the current bot process. 
 */
router.post("/stop", (req, res) => {
  if (!req.currentModeProcess) {
    return res.status(400).json({ error: "No mode currently running." });
  }

  req.currentModeProcess.kill("SIGINT");
  req.setModeProcess(null);

  return res.json({ message: "Bot stopped." });
});

router.get("/status", (req, res) => {
  if (!req.currentModeProcess) {
    return res.json({ running: false });
  }
  return res.json({ running: true });
});





/**
 * @route GET /api/mode/status
 * @access Public
 * @desc: Returns bot status, running mode and dryRun flag. 
 */
router.get("/status", (req, res) => {
  const running = !!req.currentModeProcess;

  const config = process.env.BOT_CONFIG ? JSON.parse(process.env.BOT_CONFIG) : {};
  const mode = config?.strategy || process.env.BOT_MODE || "idle";
  const dryRun = config?.dryRun ?? true;

  return res.json({ running, mode, dryRun });
});

module.exports = router;
