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


const { getSwapQuote } = require("../utils/swap");
const { logTrade } = require("./utils");
const { sendTelegramMessage } = require("../telegram/bots");
const { loadKeypair } = require("../utils/wallet");
require("dotenv").config();

// ✅ Parse config from env or parent process
const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");

const inputMint = botConfig.inputMint ?? process.env.INPUT_MINT ?? "So11111111111111111111111111111111111111112"; // SOL
const outputMint = botConfig.outputMint ?? process.env.OUTPUT_MINT ?? "Es9vMFrzaCERx6Cw4pTrA6MuoXovbdFxRoCkB9gfup7w"; // USDC

const AMOUNT = parseFloat(botConfig.tradeAmount ?? process.env.TRADE_AMOUNT ?? "0.01");
const SLIPPAGE = parseFloat(botConfig.slippage ?? process.env.SLIPPAGE ?? "1.0");
const INTERVAL = parseInt(botConfig.interval ?? process.env.TRADE_INTERVAL ?? "60000"); // 60s


async function paperTrader() {
  const wallet = loadKeypair(); // Simulates real mode

  setInterval(async () => {
    console.log(`\n📊 Paper Trader Simulation @ ${new Date().toLocaleTimeString()}`);

    try {
      const quote = await getSwapQuote({
        inputMint,
        outputMint,
        amount: AMOUNT * 1e9,
        slippage: SLIPPAGE,
      });

      if (!quote) {
        console.warn("⚠️ No quote available. Skipping simulation.");
        return;
      }

      const estimatedOut = quote.outAmount / 1e6;
      const estimatedImpact = quote.priceImpactPct * 100;

      const summary = `
        📊 *Simulated Trade*:
        ${AMOUNT} SOL → ${estimatedOut.toFixed(3)} USDC
        📉 Price Impact: ${estimatedImpact.toFixed(2)}%
        🔁 Hops: ${quote.marketInfos?.length || 0}
      `;

      console.log(summary);

      const logData = {
        timestamp: new Date().toISOString(),
        strategy: "paperTrader",
        inputMint,
        outputMint,
        inAmount: AMOUNT * 1e9,
        outAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct * 100,
        txHash: null,
        success: true,
        simulated: true,
      };

      logTrade(logData);
      await sendTelegramMessage(summary);

    } catch (err) {
      console.error("❌ Paper trade error:", err.message);
      await sendTelegramMessage(`⚠️ *Paper Trade Error:*\n${err.message}`);
    }
  }, INTERVAL);
}

module.exports = paperTrader;