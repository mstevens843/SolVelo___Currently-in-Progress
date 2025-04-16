/** Trend Follower Strategy Module 
 * - Identifies upward-trending tokens and enters when a token sustains gains. 
 * - Ideal for slower (6h/24h break) 
 * 
 * Detection logic: 
 * - Token must be up x% over last N hours 
 * - Optionally requires volume confrmation 
 * 
 * Configurable: 
 * - Gain Threshold
 * - Volume Threshold
 * - Token List
 * 
 * 
 * Eventually Support: 
 * - EMA crossover detection
 * - Trend continuation Filters
 * - Hold timer or trailing stop logic. 
 */


const { getTokenPriceChange, getTokenVolume } = require("../utils/marketData.js");
const { getSwapQuote, executeSwap } = require("../utils/swap");
const { logTrade, isSafeToBuy, getWallet } = require("./utils");
const { sendTelegramMessage } = require("../telegram/bots");
const { PublicKey } = require("@solana/web3.js");
require("dotenv").config();

// Parse config from env or parent process
const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");

const MONITORED_TOKENS = (botConfig.tokens ?? [
  "So11111111111111111111111111111111111111112",
  "Es9vMFrzaCERx6Cw4pTrA6MuoXovbdFxRoCkB9gfup7w"
]).map((mint) => new PublicKey(mint));

const TREND_THRESHOLD = parseFloat(botConfig.threshold ?? process.env.TREND_GAIN_THRESHOLD ?? "0.06");
const TRADE_AMOUNT = parseFloat(botConfig.tradeAmount ?? process.env.TREND_TRADE_AMOUNT ?? "0.01") * 1e9;
const SLIPPAGE = parseFloat(botConfig.slippage ?? process.env.SLIPPAGE ?? "1.0");
const SCAN_INTERVAL = parseInt(botConfig.interval ?? process.env.TREND_SCAN_INTERVAL ?? "600000");
const BASE_MINT = botConfig.inputMint ?? process.env.TREND_INPUT_MINT ?? "So11111111111111111111111111111111111111112";

async function trendFollowerBot() {
  setInterval(async () => {
    console.log(`\n📈 Trend Follower Check @ ${new Date().toLocaleTimeString()}`);

    for (const token of MONITORED_TOKENS) {
      const tokenMint = token.toBase58();

      try {
        const priceChange = await getTokenPriceChange(token, 6);
        const volume = await getTokenVolume(token);

        if (!priceChange || priceChange < TREND_THRESHOLD) {
          console.log(`📉 ${tokenMint} is not trending enough. Δ=${(priceChange * 100).toFixed(2)}%`);
          continue;
        }

        console.log(`🚀 ${tokenMint} is trending upward: +${(priceChange * 100).toFixed(2)}%`);

        const isSafe = await isSafeToBuy(tokenMint);
        if (!isSafe) {
          console.log("🚫 Token failed honeypot test. Skipping.");
          continue;
        }

        const wallet = getWallet();

        const quote = await getSwapQuote({
          inputMint: BASE_MINT,
          outputMint: tokenMint,
          amount: TRADE_AMOUNT,
          slippage: SLIPPAGE,
        });

        if (!quote) {
          console.warn("⚠️ No route available.");
          continue;
        }

        const tx = await executeSwap({ quote, wallet });

        const logData = {
          timestamp: new Date().toISOString(),
          strategy: "trendFollower",
          inputMint: BASE_MINT,
          outputMint: tokenMint,
          inAmount: quote.inAmount,
          outAmount: quote.outAmount,
          priceImpact: quote.priceImpactPct * 100,
          txHash: tx || null,
          success: !!tx,
        };

        logTrade(logData);

        if (tx) {
          const explorer = `https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`;
          console.log(`✅ Trend Buy: ${explorer}`);
          await sendTelegramMessage(`📈 *Trend Buy Executed*\n[TX](${explorer})`);
        } else {
          console.log("❌ Trend buy failed.");
          await sendTelegramMessage(`❌ *Trend Buy Failed* for ${tokenMint}`);
        }
      } catch (err) {
        console.error(`❌ Trend Follower error for ${tokenMint}:`, err.message);
        await sendTelegramMessage(`⚠️ *Trend Bot Error:*\n${err.message}`);
      }
    }
  }, SCAN_INTERVAL);
}

module.exports = trendFollowerBot;


/** Additions:
 * - Multi-wallet Protection - getWallet()
 * - Honeypot check - isSafetoBuy()
 * - Trade logging - logTrade()
 * - Telegram alerts - for success/failure
 * - Price change filter - already present 
 */