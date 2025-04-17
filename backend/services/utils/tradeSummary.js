/** This module handles:
 * - Reading strategy-specific trade logs 
 * - Calculating analytics from completed trades. 
 * - Posting summaries to Telegram. 
 * 
 * - Used for PnL sand performance summaries for strategy. 
 */

const fs = require("fs");
const path = require("path");
const { sendTelegramMessage } = require("../../telegram/bots");


/** 
 * @private
 * - Reads trade logs for a specific strategy from /logs{strategy}.json
 */
function readLogs(strategy) {
  const logPath = path.join(__dirname, "..", "logs", `${strategy}.json`);
  if (!fs.existsSync(logPath)) {
    console.warn(`⚠️ No log file found for ${strategy}`);
    return [];
  }

  try {
    const data = fs.readFileSync(logPath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`❌ Failed to parse ${strategy}.json:`, err.message);
    return [];
  }
}

/** 
 * @private 
 * Analtzes trade outcomes for a strategy
 * Filters for completed trades and computes: 
 * - AVG Gain %
 * - Win/Loss count
 * - Simulated vs. Real Trade counts
 */
function calculateAnalytics(trades) {
  if (!trades.length) return null;

  const completed = trades.filter(t => t.success && t.entryPrice && t.exitPrice);
  const simulated = trades.filter(t => t.simulated);
  const real = trades.filter(t => !t.simulated);

  let wins = 0, losses = 0, gainTotal = 0;

  for (const t of completed) {
    const gain = ((t.exitPrice - t.entryPrice) / t.entryPrice) * 100;
    gainTotal += gain;
    if (gain > 0) wins++; else losses++;
  }

  return {
    total: trades.length,
    completed: completed.length,
    wins,
    losses,
    avgGain: (gainTotal / completed.length).toFixed(2),
    winRate: ((wins / completed.length) * 100).toFixed(2),
    simulated: simulated.length,
    real: real.length
  };
}

/** 
 * @public
 * - Generates a summary for a specific strategy and sends it to Telegram. 
 */
async function summarizeStrategy(strategy) {
  const trades = readLogs(strategy);
  const stats = calculateAnalytics(trades);

  if (!stats) {
    console.log(`📭 No trades for ${strategy}`);
    return;
  }

  const message = `
📊 *${strategy} Summary*
────────────────────────
Total Trades: ${stats.total}
Simulated: ${stats.simulated} | Real: ${stats.real}
Completed: ${stats.completed}
✅ Wins: ${stats.wins} | ❌ Losses: ${stats.losses}
📈 Avg Gain: ${stats.avgGain}%
🎯 Win Rate: ${stats.winRate}%
`;

  console.log(message);
  await sendTelegramMessage(message);
}

module.exports = { summarizeStrategy };
