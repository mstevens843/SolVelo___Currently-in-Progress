/** Dip Buyer Strategy Module
 * - Buys tokens when price drops by a configured % ina short window. 
 * - Ideal for bounce trading on hyped or volatile tokens.
 * - Useful to catch panic dips or exit scams with bounce potential. 
 * 
 * Configurable:
 * - Token list
 * - Dip % Threshold
 * - Useful to catch panic dips or exit scams with bounce potential 
 * 
 * 
 * - Configurable: 
 * - Token list 
 * - Dip % threshold 
 * - Timeframe (ms) to compare price 
 * - Trade amount, slippage
 * 
 * Eventually Support:
 * - Telegram alerts on dip trigger
 * - Combine with candle-based patterns
 * - Log rebound success/fail rate
 */



const { getTokenPrice } = require("../utils/marketData");
const { getSwapQuote, executeSwap, loadKeypair } = require("../utils/swap");
const { PublicKey } = require("@solana/web3.js");
require("dotenv").config();

const wallet = loadKeypair();

const TOKENS_TO_MONITOR = [
  new PublicKey("So11111111111111111111111111111111111111112"), // SOL
  // Add more token mints here
];

const DIP_THRESHOLD = parseFloat(process.env.DIP_THRESHOLD || "0.10"); // 10% drop
const LOOKBACK_MS = parseInt(process.env.DIP_LOOKBACK || "300000"); // 5 min
const CHECK_INTERVAL = parseInt(process.env.DIP_INTERVAL || "60000"); // 60s
const AMOUNT = parseFloat(process.env.DIP_TRADE_AMOUNT || "0.01");
const SLIPPAGE = parseFloat(process.env.SLIPPAGE || "1.0");

const priceHistory = {};

async function dipBuyerBot() {
  setInterval(async () => {
    console.log(`\n🩸 Dip Buyer Scan @ ${new Date().toLocaleTimeString()}`);

    for (const token of TOKENS_TO_MONITOR) {
      const tokenKey = token.toBase58();

      try {
        const price = await getTokenPrice(token);

        if (!price) {
          console.warn(`⚠️ No price data for ${tokenKey}`);
          continue;
        }

        const now = Date.now();
        const previous = priceHistory[tokenKey]?.price || price;
        const previousTime = priceHistory[tokenKey]?.time || now;

        const percentDrop = (previous - price) / previous;

        console.log(`📉 ${tokenKey}: Drop = ${(percentDrop * 100).toFixed(2)}%`);

        // Check if the drop meets criteria
        if (percentDrop >= DIP_THRESHOLD && now - previousTime <= LOOKBACK_MS) {
          console.log(`🚨 Dip detected for ${tokenKey}. Executing buy.`);

          const quote = await getSwapQuote({
            inputMint: process.env.DIP_INPUT_MINT || "So11111111111111111111111111111111111111112",
            outputMint: tokenKey,
            amount: AMOUNT * 1e9,
            slippage: SLIPPAGE,
          });

          if (!quote) {
            console.log("❌ No quote available. Skipping.");
            continue;
          }

          const tx = await executeSwap({ quote, wallet });

          if (tx) {
            console.log(`✅ Dip buy success: https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`);
          } else {
            console.log("❌ Dip buy failed.");
          }
        }

        // Update history
        priceHistory[tokenKey] = { price, time: now };

      } catch (err) {
        console.error(`❌ Error for ${tokenKey}:`, err.message);
      }
    }
  }, CHECK_INTERVAL);
}

module.exports = dipBuyerBot;