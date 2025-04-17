/** Portfolio: Simulated Portfolio Tracker API
 * - This route simulates equity over time based on trade logs
 * - It assumes an initial balance and calculates gain/loss
 * - Based on entry/exit prices for successful trades. 
 */
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const logsDir = path.join(__dirname, "..", "logs");
const INITIAL_BALANCE = 10; // starting balance in SOL (or USDC equivalent)


/** Helper: Load and combine all strategy trade loops. */
function getAllTrades() {
  const files = fs.readdirSync(logsDir).filter(f => f.endsWith(".json"));
  let all = [];

  for (const file of files) {
    const filePath = path.join(logsDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    all.push(...content);
  }

  return all.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Helper: simulate equity curve and performance
function simulatePortfolio(trades) {
  let balance = INITIAL_BALANCE;
  let unrealized = 0;
  const equity = [];

  for (const t of trades) {
    // Only count successful trades with entry price
    if (!t.success || !t.entryPrice) continue;

    // Estimate how much SOL or USDC was used for this trade. 
    const entryValue = (t.inAmount / 1e9) * t.entryPrice;

    if (t.exitPrice) {
    // Closed trade → update balance with gain/loss
      const gain = (t.exitPrice - t.entryPrice) / t.entryPrice;
      balance += entryValue * gain;
    } else {
        // Open trade → count as unrealized
      unrealized += entryValue;
    }

    // Save point in equity curve
    equity.push({
      time: new Date(t.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      value: Number(balance.toFixed(4)),
    });
  }

  return {
    startingBalance: INITIAL_BALANCE,
    finalBalance: Number(balance.toFixed(4)),
    unrealized: Number(unrealized.toFixed(4)),
    equityCurve: equity,
  };
}





/** 
 * @route GET /api/portfolio
 * @access Public
 * @desc: Returns simulated equity curve + performance
 */
router.get("/", (req, res) => {
  try {
    const trades = getAllTrades();
    const portfolio = simulatePortfolio(trades);
    res.json(portfolio);
  } catch (err) {
    console.error("❌ Portfolio error:", err.message);
    res.status(500).json({ error: "Failed to simulate portfolio." });
  }
});

module.exports = router;
