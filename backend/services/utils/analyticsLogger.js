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

const LOG_PATH = path.join(__dirname, "../logs/trades.json");

function ensureLogFileExists() {
  if (!fs.existsSync(LOG_PATH)) {
    fs.writeFileSync(LOG_PATH, "[]");
  }
}

/**
 * Appends a trade event to the log file.
 */
function logTrade({
  strategy = "unknown",
  inputMint,
  outputMint,
  inAmount,
  outAmount,
  priceImpact,
  txHash = null,
  success = true,
}) {
  ensureLogFileExists();

  const entry = {
    timestamp: new Date().toISOString(),
    strategy,
    inputMint,
    outputMint,
    inAmount,
    outAmount,
    priceImpact,
    txHash,
    success,
  };

  let logs = [];

  try {
    logs = JSON.parse(fs.readFileSync(LOG_PATH, "utf-8"));
  } catch (err) {
    console.warn("⚠️ Couldn't parse existing trade logs:", err);
  }

  logs.push(entry);
  logs = logs.slice(-100); // keep last 100 only

  fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2));

  console.log(`📦 Trade logged [${strategy}] → ${success ? "✅" : "❌"}`);
}

module.exports = { logTrade };


