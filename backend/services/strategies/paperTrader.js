/** Paper Trader Simulation Moduel
 * - Simulates swap logic without using real funds. 
 * - Logs trade intent, simulated price impact, and estimated outcome. 
 * - Useful for testing strategies without risk on mainnet. 
 * 
 * Configurable: 
 * - input/output tokens 
 * - Trade-size
 * - Slippage
 * - Interval between simulated Trades
 * 
 * Eventually Support: 
 * - Log PnL to file or SQLite DB 
 * - Run multiple strategies side-by-side
 * - Visualize trade outcomes in dashboard
 * - Compare real vs simulated execution results. 
 */


const { getTokenPriceChange, getTokenVolume } = require("../../utils/marketData");
const { getSwapQuote } = require("../../utils/swap");
const { logTrade } = require("../utils");
const { sendTelegramMessage } = require("../../telegram/bots");
require("dotenv").config();

const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");

const inputMint = botConfig.inputMint || "So11111111111111111111111111111111111111112";
const TOKENS = botConfig.monitoredTokens || [];
const SLIPPAGE = parseFloat(botConfig.slippage ?? 0.005);
const AMOUNT = parseFloat(botConfig.snipeAmount ?? 0.01) * 1e9;
const INTERVAL = parseInt(botConfig.interval ?? 30000);
const ENTRY_THRESHOLD = parseFloat(botConfig.entryThreshold ?? 0.02);
const VOLUME_THRESHOLD = parseFloat(botConfig.volumeThreshold ?? 8000);
const TAKE_PROFIT = parseFloat(botConfig.takeProfit ?? 0.2);
const STOP_LOSS = parseFloat(botConfig.stopLoss ?? 0.1);
const COOLDOWN = parseInt(botConfig.cooldown ?? 60000);
const MAX_DAILY_TRADES = parseInt(botConfig.maxDailyTrades ?? 10);
const LOG_TO_FILE = botConfig.logToFile === true;

let tradeHistory = {};
let dailyTrades = 0;

async function paperTrader() {
  console.log(`\n📊 Paper Trader Check @ ${new Date().toLocaleTimeString()}`);
  console.log("🧠 paperTrader script is running...");


  if (dailyTrades >= MAX_DAILY_TRADES) {
    console.log("🛑 Max daily trades hit.");
    return;
  }

  for (const mint of TOKENS) {
    const now = Date.now();

    if (tradeHistory[mint] && now - tradeHistory[mint].lastTrade < COOLDOWN) {
      console.log(`⏳ Cooldown active for ${mint}. Skipping.`);
      continue;
    }

    try {
      const priceChange = await getTokenPriceChange(mint, 1); // 1h change
      const volume = await getTokenVolume(mint);

      if (priceChange < ENTRY_THRESHOLD || volume < VOLUME_THRESHOLD) {
        console.log(`⚠️ Skipping ${mint} — Change: ${(priceChange * 100).toFixed(2)}% | Volume: ${volume}`);
        continue;
      }

      const quote = await getSwapQuote({
        inputMint,
        outputMint: mint,
        amount: AMOUNT,
        slippage: SLIPPAGE,
      });

      if (!quote) {
        console.warn(`⚠️ No quote for ${mint}`);
        continue;
      }

      const out = quote.outAmount / 1e6;
      const impact = quote.priceImpactPct * 100;

      const summary = `📊 *Simulated Trade*\nMint: \`${mint}\`\n${(AMOUNT / 1e9).toFixed(3)} SOL → ${out.toFixed(3)} units\nImpact: ${impact.toFixed(2)}%`;

      const tradeLog = {
        timestamp: new Date().toISOString(),
        strategy: "paperTrader",
        inputMint,
        outputMint: mint,
        inAmount: AMOUNT,
        outAmount: quote.outAmount,
        priceImpact: impact,
        txHash: null,
        success: true,
        simulated: true,
        takeProfit: TAKE_PROFIT,
        stopLoss: STOP_LOSS
      };

      logTrade(tradeLog);
      await sendTelegramMessage(summary);

      tradeHistory[mint] = { lastTrade: now };
      dailyTrades++;

      if (LOG_TO_FILE) {
        const fs = require("fs");
        fs.appendFileSync("logs/paper_trades.log", JSON.stringify(tradeLog) + "\n");
      }

      if (dailyTrades >= MAX_DAILY_TRADES) {
        console.log("🚫 Max trades reached mid-cycle.");
        break;
      }

    } catch (err) {
      console.error(`❌ Error simulating ${mint}:`, err.message);
      await sendTelegramMessage(`⚠️ *Paper Trade Error*\n${err.message}`);
    }
  }

  // setTimeout(paperTrader, INTERVAL);
  setInterval(paperTrader, INTERVAL);

}

module.exports = paperTrader;
