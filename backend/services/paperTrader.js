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

onst { getSwapQuote } = require("../utils/swap");
const { loadKeypair } = require("../utils/wallet");
require("dotenv").config();

const inputMint = process.env.INPUT_MINT || "So11111111111111111111111111111111111111112"; // SOL
const outputMint = process.env.OUTPUT_MINT || "Es9vMFrzaCERx6Cw4pTrA6MuoXovbdFxRoCkB9gfup7w"; // USDC

const AMOUNT = parseFloat(process.env.TRADE_AMOUNT || "0.01"); // 0.01 SOL
const SLIPPAGE = parseFloat(process.env.SLIPPAGE || "1.0");
const INTERVAL = parseInt(process.env.TRADE_INTERVAL || "60000");

async function paperTrader() {
  const wallet = loadKeypair(); // not used, but simulates actual flow

  setInterval(async () => {
    console.log(`\n📊 Running Paper Trader @ ${new Date().toLocaleTimeString()}`);

    try {
      const quote = await getSwapQuote({
        inputMint,
        outputMint,
        amount: AMOUNT * 1e9,
        slippage: SLIPPAGE
      });

      if (!quote) {
        console.warn("⚠️ No quote available. Skipping this simulated trade.");
        return;
      }

      const estimatedOut = quote.outAmount / 1e6;
      const estimatedImpact = quote.priceImpactPct * 100;

      console.log(`🧪 Simulated Trade`);
      console.log(`🔄 ${AMOUNT} SOL → ${estimatedOut.toFixed(2)} USDC`);
      console.log(`📉 Estimated Impact: ${estimatedImpact.toFixed(2)}%`);
      console.log(`📦 Route: ${quote.marketInfos?.length || 0} hops`);

      // Optional: log to file/db later

    } catch (err) {
      console.error("❌ Paper trade simulation error:", err.message);
    }
  }, INTERVAL);
}

module.exports = paperTrader;