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
const { getSwapQuote, executeSwap } = require("../utils/swap");
const { sendTelegramMessage } = require("../telegram/bots");
const { logTrade, isSafeToBuy, getWallet } = require("./utils");
const { PublicKey } = require("@solana/web3.js");
require("dotenv").config();

// Parse config from env or parent process
const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");


const TOKENS_TO_MONITOR = (botConfig.tokens ?? [
  "So11111111111111111111111111111111111111112", // default SOL
]).map((mint) => new PublicKey(mint));



const DIP_THRESHOLD = parseFloat(botConfig.threshold ?? process.env.DIP_THRESHOLD ?? "0.10"); // 10%
const LOOKBACK_MS = parseInt(botConfig.lookback ?? process.env.DIP_LOOKBACK ?? "300000"); // 5 min
const CHECK_INTERVAL = parseInt(botConfig.interval ?? process.env.DIP_INTERVAL ?? "60000"); // 1 min
const AMOUNT = parseFloat(botConfig.tradeAmount ?? process.env.DIP_TRADE_AMOUNT ?? "0.01");
const SLIPPAGE = parseFloat(botConfig.slippage ?? process.env.SLIPPAGE ?? "1.0");
const BASE_MINT = botConfig.inputMint ?? process.env.DIP_INPUT_MINT ?? "So11111111111111111111111111111111111111112";

const priceHistory = {};

async function dipBuyerBot() {
  setInterval(async () => {
    console.log(`\n🩸 Dip Buyer Check @ ${new Date().toLocaleTimeString()}`);

    for (const token of TOKENS_TO_MONITOR) {
      const tokenKey = token.toBase58();

      try {
        const price = await getTokenPrice(token);
        if (!price) {
          console.warn(`⚠️ No price for ${tokenKey}`);
          continue;
        }

        const now = Date.now();
        const prev = priceHistory[tokenKey]?.price || price;
        const prevTime = priceHistory[tokenKey]?.time || now;
        const drop = (prev - price) / prev;

        console.log(`📉 ${tokenKey}: Drop = ${(drop * 100).toFixed(2)}%`);

        if (drop >= DIP_THRESHOLD && now - prevTime <= LOOKBACK_MS) {
          console.log(`🚨 Dip detected on ${tokenKey}. Checking safety...`);

          const isSafe = await isSafeToBuy(tokenKey);
          if (!isSafe) {
            console.log("🚫 Token failed honeypot check.");
            continue;
          }

          const wallet = getWallet();
          const quote = await getSwapQuote({
            inputMint: BASE_MINT,
            outputMint: tokenKey,
            amount: AMOUNT * 1e9,
            slippage: SLIPPAGE,
          });

          if (!quote) {
            console.warn("❌ No quote. Skipping.");
            continue;
          }

          const tx = await executeSwap({ quote, wallet });

          const logData = {
            timestamp: new Date().toISOString(),
            strategy: "dipBuyer",
            inputMint: BASE_MINT,
            outputMint: tokenKey,
            inAmount: quote.inAmount,
            outAmount: quote.outAmount,
            priceImpact: quote.priceImpactPct * 100,
            txHash: tx || null,
            success: !!tx,
          };

          logTrade(logData);

          if (tx) {
            const explorer = `https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`;
            console.log(`✅ Dip Buy Success: ${explorer}`);
            await sendTelegramMessage(`🩸 *Dip Buy Triggered*\n[TX](${explorer})`);
          } else {
            console.log("❌ Dip Buy Failed.");
            await sendTelegramMessage(`❌ *Dip Buy Failed* for ${tokenKey}`);
          }
        }

        // Save price history
        priceHistory[tokenKey] = { price, time: now };

      } catch (err) {
        console.error(`❌ Dip Buyer Error for ${tokenKey}:`, err.message);
        await sendTelegramMessage(`⚠️ *Dip Buyer Error for ${tokenKey}*\n${err.message}`);
      }
    }
  }, CHECK_INTERVAL);
}

module.exports = dipBuyerBot;



/** Additions"
 * - wallet rotation
 * - Honeypot Protection
 * - Trade logging
 * - Telegram LAerts
 * - Smarter Price Money
 */

