/** Scalper Strategy Module
 * - Executes trades at regular intervals.
 * - Designed for fast in-n-out trades on volatile pairs. 
 * - Use pre-configuredd token pairs and trade size. 
 * 
 * Configurable: 
 * - Input/Output tokens (via .env)
 * - Trade Amount (in SOL or token) 
 * - Slippage tolerance (ms) 
 * 
 * 
 * Eventually Support:
 * - Take Profit (TP)/ Stop Loss (SL) logic
 * - Telegram alerts on trade success/fail
 * - Profit/loss tracking om SQLit or flat file
 * - Multi-token scalping rotation or prioritization
 */

const { getSwapQuote, executeSwap, loadKeypair } = require("../utils/swap");
require("dotenv").config();

const inputMint = process.env.INPUT_MINT || "So11111111111111111111111111111111111111112"; // SOL
const outputMint = process.env.OUTPUT_MINT || "Es9vMFrzaCERx6Cw4pTrA6MuoXovbdFxRoCkB9gfup7w"; // USDC

const AMOUNT = parseFloat(process.env.TRADE_AMOUNT || "0.01"); // 0.01 SOL
const SLIPPAGE = parseFloat(process.env.SLIPPAGE || "1.0"); // 1%
const INTERVAL = parseInt(process.env.TRADE_INTERVAL || "60000"); // 60s

async function scalperBot() {
  const wallet = loadKeypair();

  setInterval(async () => {
    console.log(`\n🔁 Running Scalper @ ${new Date().toLocaleTimeString()}`);
    
    try {
      const quote = await getSwapQuote({
        inputMint,
        outputMint,
        amount: AMOUNT * 1e9,
        slippage: SLIPPAGE
      });

      if (!quote) {
        console.warn("⚠️ No quote available. Skipping this round.");
        return;
      }

      console.log(`🧮 Quote: ${quote.inAmount / 1e9} → ${quote.outAmount / 1e6} (Impact: ${quote.priceImpactPct * 100}%)`);

      const tx = await executeSwap({ quote, wallet });

      if (tx) {
        console.log(`✅ Swap executed! Tx: https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`);
      } else {
        console.log("❌ Swap failed or skipped.");
      }
    } catch (err) {
      console.error("🚨 Error in scalper loop:", err.message);
    }
  }, INTERVAL);
}

module.exports = scalperBot;
