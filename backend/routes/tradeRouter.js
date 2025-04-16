const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

router.get("/", (req, res) => {
  const tradeFile = path.join(__dirname, "..", "trades.json");

  fs.readFile(tradeFile, "utf-8", (err, data) => {
    if (err) {
      console.error("❌ Failed to read trades:", err.message);
      return res.status(500).json({ error: "Failed to read trades." });
    }

    try {
      const trades = JSON.parse(data);
      return res.json(trades.reverse().slice(0, 100)); // Latest 100, newest first
    } catch (e) {
      return res.status(500).json({ error: "Invalid trade file format." });
    }
  });
});



router.get("/history", (req, res) => {
    const logFile = path.join(__dirname, "../logs/trades.json");
  
    if (!fs.existsSync(logFile)) {
      return res.json([]);
    }
  
    const raw = fs.readFileSync(logFile, "utf-8");
    try {
      const trades = JSON.parse(raw);
      return res.json(trades);
    } catch (err) {
      console.error("Failed to parse trade log:", err);
      return res.status(500).json({ error: "Could not read trade log" });
    }
  });

  

module.exports = router;
