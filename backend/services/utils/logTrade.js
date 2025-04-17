/** Analytics Logger Module
 * - Records trade events with metadata for tracking performance
 * - Logs to local JSON file or .csv (simple version for now)
 * 
 * Tracked: Timestamp 
 * - Timestamp 
 * - Strategy Name
 * - Token Pair
 * - In/out amounts
 * - Estimated price amount
 * - TX success/failure
 *
 * Eventually Support: 
 * - SQlit logging. 
 * - PnL Trackinf 
 * - Live trade dashboard Analytics
 * */

const fs = require("fs");
const path = require("path");

/**
 * Logs a trade or simulated trade to /logs/<strategy>.json
 */
function logTrade(data) {
  const {
    strategy = "unknown",
    inputMint,
    outputMint,
    inAmount,
    outAmount,
    entryPrice = null,
    exitPrice = null,
    priceImpact = null,
    takeProfit = null,
    stopLoss = null,
    txHash = null,
    simulated = false,
    success = false,
    notes = ""
  } = data;

  const timestamp = new Date().toISOString();
  const gainLoss =
    entryPrice && exitPrice
      ? (((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2) + "%"
      : null;

  const entry = {
    timestamp,
    strategy,
    inputMint,
    outputMint,
    inAmount,
    outAmount,
    entryPrice,
    exitPrice,
    gainLoss,
    takeProfit,
    stopLoss,
    priceImpact,
    txHash,
    simulated,
    success,
    notes,
  };

  const logDir = path.join(__dirname, "..", "logs");
  const logPath = path.join(logDir, `${strategy}.json`);

  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
  if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, "[]");

  try {
    const existing = JSON.parse(fs.readFileSync(logPath, "utf-8"));
    existing.push(entry);
    fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));
    console.log(`📦 Logged ${simulated ? "[SIMULATED]" : ""} trade to ${strategy}.json`);
  } catch (err) {
    console.error(`❌ Logging error (${strategy}):`, err.message);
  }
}

module.exports = { logTrade };



