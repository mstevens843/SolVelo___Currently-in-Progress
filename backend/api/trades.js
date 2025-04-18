/** Trade Router: Handles all trade Related API including:
 * - Fetching Recent Trades 
 * - Full trade history
 * - CSV Report
 * - Per-strategy Logs
 * - Daily PnL recap
 * - Resetting Logs
 */


const express = require("express");
const fs = require("fs");
const path = require("path");
const { convertToCSV } = require("../services/utils/exportToCSV");
const router = express.Router();


const LOGS_DIR = path.join(__dirname, "..", "logs");

/** Public: GET /api/trades
 * Return Last 100 trades across all strategies. 
 */
router.get("/", (req, res) => {
    try {
      const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith(".json"));
      const allTrades = [];
  
      for (const file of files) {
        const fullPath = path.join(LOGS_DIR, file);
        const content = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  
        content.forEach((entry) => {
          allTrades.push({
            ...entry,
            strategy: file.replace(".json", ""),
          });
        });
      }
  
      allTrades.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      res.json(allTrades.slice(0, 100));
    } catch (err) {
      console.error("❌ Failed to load trades:", err.message);
      res.status(500).json({ error: "Failed to read trade logs." });
    }
  });



/** Public: GET /api/trades/history
 * Return full trade history acroess all strategies. 
 */
router.get("/history", (req, res) => {
    try {
      const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith(".json"));
      const all = [];
  
      for (const file of files) {
        const fullPath = path.join(LOGS_DIR, file);
        const content = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
        all.push(...content);
      }
  
      res.json(all);
    } catch (err) {
      console.error("❌ Failed to parse trade logs:", err);
      res.status(500).json({ error: "Could not read full trade log." });
    }
  });


  /** Public: GET /api/trades/download
   * - Export all trades to CSV File
   */
  router.get("/download", (req, res) => {
    const files = fs.readdirSync(path.join(__dirname, "..", "logs")).filter(f => f.endsWith(".json"));
    let all = [];
  
    for (const file of files) {
      const content = fs.readFileSync(path.join(__dirname, "..", "logs", file), "utf-8");
      try {
        const parsed = JSON.parse(content);
        all.push(...parsed);
      } catch (e) {
        console.warn(`⚠️ Skipping invalid log: ${file}`);
      }
    }
  
    const csv = convertToCSV(all);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=trades-${Date.now()}.csv`);
    return res.send(csv);
  });





/** Public: GET /api/trades/recap
 * - Generate and return a daily gain/loss summary
 */
router.get("/:strategy/logs", (req, res) => {
  const strategy = req.params.strategy;
  const logPath = path.join(LOGS_DIR, `${strategy}.json`);

  if (!fs.existsSync(logPath)) {
    return res.status(404).json({ error: "No log file found for this strategy" });
  }

  const data = JSON.parse(fs.readFileSync(logPath, "utf-8"));
  const recent = data.slice(-20).reverse();
  res.json(recent);
});


 
/** Public: GET /api/trades/recap
 * - Generate and return a daily gain/loss summary
 */
router.get("/recap", (req, res) => {
  try {
    const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith(".json"));
    const all = [];

    for (const file of files) {
      const content = JSON.parse(fs.readFileSync(path.join(LOGS_DIR, file), "utf-8"));
      all.push(...content);
    }

    const today = new Date().toISOString().slice(0, 10);
    const todayTrades = all.filter(t =>
      t.timestamp && t.timestamp.startsWith(today)
    );

    let successfulTrades = 0;
    let failedTrades = 0;
    let totalPnL = 0;
    let best = null;
    let worst = null;

    for (const trade of todayTrades) {
      if (trade.success) successfulTrades++;
      else failedTrades++;

      const inAmt = trade.inAmount / 1e9;
      const outAmt = trade.outAmount / 1e6;
      const gainPct = ((outAmt - inAmt) / inAmt) * 100;

      totalPnL += gainPct;

      if (!best || gainPct > best.gainLossPct) {
        best = { ...trade, gainLossPct: gainPct };
      }

      if (!worst || gainPct < worst.gainLossPct) {
        worst = { ...trade, gainLossPct: gainPct };
      }
    }

    res.json({
      date: today,
      totalTrades: todayTrades.length,
      successfulTrades,
      failedTrades,
      totalPnL: Number(totalPnL.toFixed(2)),
      bestTrade: best,
      worstTrade: worst,
    });
  } catch (err) {
    console.error("❌ Recap error:", err.message);
    res.status(500).json({ error: "Failed to generate recap." });
  }
});




/** Private: POST /api/trades/reset
 * Reset all strategy logs (clear all log files)
 *  */ 
router.post("/reset", (req, res) => {
  try {
    const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith(".json"));

    for (const file of files) {
      const filePath = path.join(LOGS_DIR, file);
      fs.writeFileSync(filePath, "[]");
    }

    res.json({ message: "All strategy logs have been reset." });
  } catch (err) {
    console.error("❌ Failed to reset logs:", err);
    res.status(500).json({ error: "Failed to reset logs." });
  }
});


module.exports = router;
