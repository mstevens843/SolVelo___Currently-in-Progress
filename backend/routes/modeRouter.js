// backend/routes/modeRouter.js

const express = require("express");
const { spawn } = require("child_process");
const router = express.Router();

let lastStarted = null;


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

    // store last started config
    lastStarted = { mode, config };   
  
    const configEnv = {
      ...process.env,
      BOT_CONFIG: JSON.stringify(config || {}),
    };
  
    const proc = spawn("node", [`services/${mode}.js`], {
      stdio: "inherit",
      cwd: process.cwd(),
      env: configEnv,
    });
    
    req.setModeProcess(proc);

    proc.on("exit", (code, signal) => {
        console.warn(`⚠️ Bot process exited with code ${code} / signal ${signal}`);
      
        // Clear the current process state
        req.setModeProcess(null);
      
        // Auto-restart logic
        const shouldRestart = JSON.parse(
          req.headers["x-auto-restart"] || "true"
        );
      
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

module.exports = router;
