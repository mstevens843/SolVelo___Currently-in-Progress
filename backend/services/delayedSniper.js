/** Delayed Sniper Strategy Module 
 * - Detects new token mints (via Jupiter list or external feed.). 
 * - Monitors token for a warm-up period before buying. 
 * - Prevents instant rug risk by sniping only when LP is present. 
 * 
 * Configurable: 
 * - Detection source (e.g. Jupiter list or external feed)'
 * - Delay before buying. 
 * - Amount / Slippage
 * 
 * Eventually Support:
 * - Liquidity threshold before snipe.
 * - HoneyPot detection
 * - Telgram alerts on entry
 *
 */


const { getSwapQuote, executeSwap } = require("../utils/swap");
const { fetchTokenList } = require("../utils/marketData");
const { logTrade, isSafeToBuy, getWallet } = require("./utils");
const { sendTelegramMessage } = require("../telegram/bots");
require("dotenv").config();

// ✅ Parse config passed from parent process
const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");

// ✅ Pull values from config or env vars (in order of priority)
const BASE_MINT = botConfig.inputMint ?? process.env.INPUT_MINT ?? "So11111111111111111111111111111111111111112";
const TRADE_AMOUNT = parseFloat(botConfig.tradeAmount ?? process.env.DELAYED_SNIPE_AMOUNT ?? "0.01") * 1e9;
const SLIPPAGE = parseFloat(botConfig.slippage ?? process.env.SLIPPAGE ?? "1.0");
const SCAN_INTERVAL = parseInt(botConfig.interval ?? process.env.DELAYED_SCAN_INTERVAL ?? "60000");
const DELAY_MS = parseInt(botConfig.delayMs ?? process.env.DELAYED_SNIPE_DELAY ?? "120000");

// 🧠 Should You Add getWalletBalance or isAboveMinBalance?
// But since it's a targeted low-frequency trigger bot, and AMOUNT is
//  small, it's not strictly necessary unless you're automating across many tokens with small margins.

const seen = new Set();

async function delayedSniperBot() {
  console.log(`\n🕒 Delayed Sniper checking @ ${new Date().toLocaleTimeString()}`);

  try {
    const mintList = await fetchTokenList();

    for (const mint of mintList) {
      if (seen.has(mint)) continue;
      seen.add(mint);

      console.log(`👀 New token detected: ${mint}. Waiting ${DELAY_MS / 1000}s before action...`);

      setTimeout(async () => {
        try {
          const isSafe = await isSafeToBuy(mint);
          if (!isSafe) {
            console.log(`🚫 ${mint} failed honeypot guard. Skipping.`);
            return;
          }

          const wallet = getWallet();
          const quote = await getSwapQuote({
            inputMint: BASE_MINT,
            outputMint: mint,
            amount: TRADE_AMOUNT,
            slippage: SLIPPAGE,
          });

          if (!quote) {
            console.warn(`⚠️ No route available for ${mint}`);
            return;
          }

          const tx = await executeSwap({ quote, wallet });

          const logData = {
            timestamp: new Date().toISOString(),
            strategy: "delayedSniper",
            inputMint: BASE_MINT,
            outputMint: mint,
            inAmount: quote.inAmount,
            outAmount: quote.outAmount,
            priceImpact: quote.priceImpactPct * 100,
            txHash: tx || null,
            success: !!tx,
          };

          logTrade(logData);

          if (tx) {
            const explorer = `https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`;
            console.log(`✅ Delayed Snipe Success: ${explorer}`);
            await sendTelegramMessage(`⏳ *Delayed Snipe Complete*\n[TX](${explorer})`);
          } else {
            console.log("❌ Swap failed.");
            await sendTelegramMessage(`❌ *Delayed snipe failed* for ${mint}`);
          }
        } catch (innerErr) {
          console.error(`❌ Error during delayed snipe for ${mint}:`, innerErr.message);
          await sendTelegramMessage(`⚠️ *Delayed Sniper Error*\n${innerErr.message}`);
        }
      }, DELAY_MS);

      break; // Only watch one token per interval
    }
  } catch (err) {
    console.error("🚨 Delayed Sniper scan failed:", err.message);
    await sendTelegramMessage(`⚠️ *Delayed Sniper Crash*\n${err.message}`);
  }

  setTimeout(delayedSniperBot, SCAN_INTERVAL);
}

module.exports = delayedSniperBot;


/** Additioms:
 * - multi-wallet protection
 * - Honeypot detection
 * - Analytics logging
 * - Telegram alerts
 * - controlled delay
 * - one snipe per run
 */