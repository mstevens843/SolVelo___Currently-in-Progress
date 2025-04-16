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

const { getSwapQuote, executeSwap } = require("../utils/swap");
const { logTrade, isSafeToBuy, getWallet } = require("./utils");
const { sendTelegramMessage } = require("../telegram/bots");
require("dotenv").config();

//  Parse config from env or parent process
const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");

const inputMint = botConfig.inputMint ?? process.env.INPUT_MINT ?? "So11111111111111111111111111111111111111112"; // SOL
const outputMint = botConfig.outputMint ?? process.env.OUTPUT_MINT ?? "Es9vMFrzaCERx6Cw4pTrA6MuoXovbdFxRoCkB9gfup7w"; // USDC

const AMOUNT = parseFloat(botConfig.tradeAmount ?? process.env.TRADE_AMOUNT ?? "0.01");
const SLIPPAGE = parseFloat(botConfig.slippage ?? process.env.SLIPPAGE ?? "1.0");
const INTERVAL = parseInt(botConfig.interval ?? process.env.TRADE_INTERVAL ?? "60000"); // 60s

async function scalperBot() {
  setInterval(async () => {
    console.log(`\n🔁 Scalper Run @ ${new Date().toLocaleTimeString()}`);
    
    try {
      const wallet = getWallet();

      const isSafe = await isSafeToBuy(outputMint);
      if (!isSafe) {
        console.log("🚫 Honeypot check failed. Skipping.");
        return;
      }

      const quote = await getSwapQuote({
        inputMint,
        outputMint,
        amount: AMOUNT * 1e9,
        slippage: SLIPPAGE,
      });

      if (!quote) {
        console.warn("⚠️ No quote available. Skipping this round.");
        return;
      }

      console.log(`🧮 Quote: ${quote.inAmount / 1e9} → ${quote.outAmount / 1e6} (Impact: ${quote.priceImpactPct * 100}%)`);

      const tx = await executeSwap({ quote, wallet });

      const logData = {
        timestamp: new Date().toISOString(),
        strategy: "scalper",
        inputMint,
        outputMint,
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct * 100,
        txHash: tx || null,
        success: !!tx,
      };

      logTrade(logData);

      if (tx) {
        console.log(`✅ Swap executed! TX: https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`);
        await sendTelegramMessage(`✅ *Scalper Swap Complete*\n[TX](https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta)`);
      } else {
        console.log("❌ Swap failed or skipped.");
        await sendTelegramMessage("❌ *Scalper swap failed or skipped.*");
      }
    } catch (err) {
      console.error("🚨 Scalper error:", err.message);
      await sendTelegramMessage(`⚠️ *Scalper Error:*\n${err.message}`);
    }
  }, INTERVAL);
}

module.exports = scalperBot;


/** 
 * Additions: 
 * - Multi-wallet rotation
 * - Honeypot Protection Check
 * - Telegram trade alerts 
 * - Analytics Logging
 * - Clean error handling + structure
 */