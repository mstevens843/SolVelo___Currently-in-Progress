/** SNIPER MODE
 * - Watches for new tokens appearing on Jupiter (or a dummy feed for now)
 * - Filter out scammy or duplicate tokens (base logic) 
 * - Buys instantly when a fresh mint is detected (your chosen account) 
 */

/** SETUP
 * - Load known tokens from a file or memory
 * - Ping Jupiter token list every 30-60 seconds
 * - Comprare for new tokens
 * - If new token found -> try to snipe with 'swap.js'
 * 
 * Plans for Later: 
 * - Real-time Solana event feeds.
 * - Telegram Alerts and Safety checks. 
 */

/** Sniper Strategy Module
 * - Detects new token listings from Jupiter token list.
 * - Attempts to snipe early using available liquidity.
 * 
 * Integrated:
 * - Honeypot detection (price impact, slippage, liquidity)
 * - Telegram alerts (trade success/failure)
 * - Analytics logging (saved to trades.json)
 * - Multi-wallet rotation (spread risk)
 */

const { getSwapQuote, executeSwap } = require("../../utils/swap");
const { fetchTokenList } = require("../../utils/marketData");
const { logTrade, isSafeToBuy, getWallet, isAboveMinBalance, isWithinDailyLimit } = require("../utils");

const { sendTelegramMessage } = require("../../telegram/bots");
require("dotenv").config();

// Parse config passed from parent process.
const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");



// Config-driven values
const BASE_MINT = botConfig.inputMint || "So11111111111111111111111111111111111111112";
const MONITORED = botConfig.monitoredTokens || [];
const SLIPPAGE = parseFloat(botConfig.slippage ?? 1.0);
const SNIPE_AMOUNT = parseFloat(botConfig.snipeAmount ?? 0.01) * 1e9;
const SCAN_INTERVAL = parseInt(botConfig.interval ?? 30000);
const ENTRY_THRESHOLD = parseFloat(botConfig.entryThreshold ?? 0.02);
const VOLUME_THRESHOLD = parseFloat(botConfig.volumeThreshold ?? 0);
const TAKE_PROFIT = parseFloat(botConfig.takeProfit ?? 0);
const STOP_LOSS = parseFloat(botConfig.stopLoss ?? 0);
const MAX_DAILY = parseFloat(botConfig.maxDailyVolume ?? 5);
const HALT_ON_FAILURES = parseInt(botConfig.haltOnFailures ?? 3);
const DRY_RUN = botConfig.dryRun === true;
const MIN_BALANCE = 0.2; // hardcoded for now



// Runtime state
const seen = new Set();
let todayTotal = 0;
let failureCount = 0;


async function sniperBot() {
  setInterval(async () => {
    console.log(`\n🎯 Sniper Tick @ ${new Date().toLocaleTimeString()}`);

    if (failureCount >= HALT_ON_FAILURES) {
      console.warn(`🛑 Bot halted after ${failureCount} consecutive failures.`);
      return;
    }

    try {
      const allTokens = await fetchTokenList();
      const targets = MONITORED.length > 0
        ? allTokens.filter(mint => MONITORED.includes(mint))
        : allTokens;

      for (const mint of targets) {
        if (seen.has(mint)) continue;
        seen.add(mint);

        console.log(`🔍 Token: ${mint} — Checking...`);

        const wallet = getWallet();
        const balance = await getWalletBalance(wallet);
        if (!isAboveMinBalance(balance, MIN_BALANCE)) {
          console.log("⚠️ Low balance. Skipping.");
          return;
        }

        if (!isWithinDailyLimit(SNIPE_AMOUNT / 1e9, todayTotal, MAX_DAILY)) {
          console.log("⚠️ Daily limit reached.");
          return;
        }

        const [priceChange, volume] = await Promise.all([
          getTokenPriceChange(mint, 1), // 1h for snipe threshold
          getTokenVolume(mint)
        ]);

        if (priceChange < ENTRY_THRESHOLD) {
          console.log(`📉 ${mint} not pumping enough (${(priceChange * 100).toFixed(2)}%)`);
          continue;
        }

        if (volume < VOLUME_THRESHOLD) {
          console.log(`💤 Volume too low (${volume})`);
          continue;
        }

        const isSafe = await isSafeToBuy(mint);
        if (!isSafe) {
          console.log(`🚫 Unsafe token: ${mint}`);
          continue;
        }

        console.log(`✅ Target acquired. Attempting to snipe ${mint}`);

        const quote = await getSwapQuote({
          inputMint: BASE_MINT,
          outputMint: mint,
          amount: SNIPE_AMOUNT,
          slippage: SLIPPAGE
        });

        if (!quote) {
          console.warn("⚠️ No quote available.");
          failureCount++;
          continue;
        }

        if (DRY_RUN) {
          console.log("🧪 DRY RUN MODE — Not executing.");
          logTrade({
            timestamp: new Date().toISOString(),
            strategy: "sniper",
            inputMint: BASE_MINT,
            outputMint: mint,
            inAmount: SNIPE_AMOUNT,
            outAmount: quote.outAmount,
            priceImpact: quote.priceImpactPct * 100,
            txHash: null,
            success: true,
            dryRun: true
          });
          continue;
        }

        const tx = await executeSwap({ quote, wallet });

        const logData = {
          timestamp: new Date().toISOString(),
          strategy: "sniper",
          inputMint: BASE_MINT,
          outputMint: mint,
          inAmount: SNIPE_AMOUNT,
          outAmount: quote.outAmount,
          priceImpact: quote.priceImpactPct * 100,
          txHash: tx || null,
          success: !!tx,
          takeProfit: TAKE_PROFIT,
          stopLoss: STOP_LOSS
        };

        logTrade(logData);

        if (tx) {
          todayTotal += SNIPE_AMOUNT / 1e9;
          const explorer = `https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`;
          console.log(`🚀 Sniped ${mint}: ${explorer}`);
          await sendTelegramMessage(`🚀 *Sniped*\nMint: \`${mint}\`\n[TX](${explorer})`);
          failureCount = 0;
        } else {
          console.log("❌ Swap failed.");
          failureCount++;
          await sendTelegramMessage(`❌ *Snipe Failed* for \`${mint}\``);
        }

        break; // One per tick
      }
    } catch (err) {
      failureCount++;
      console.error("💥 Bot Error:", err.message);
      await sendTelegramMessage(`⚠️ *Sniper Error*\n${err.message}`);
    }
  }, SCAN_INTERVAL);
}

module.exports = sniperBot;

/**
 * Additions: 
 * - HoneyPot protection
 * - Analytics Logging
 * - Multi-wallet Rotation
 * - Telegram alerts
 * - Clean Structure + safe error handling
 */

/** Additions 04/17
 * Feature	Status	Notes
monitoredTokens	✅	Filters fetchTokenList()
takeProfit/stopLoss	✅ (stub)	Passed into log, exit logic later
entryThreshold	✅	Filters by price pump %
volumeThreshold	✅	Minimum liquidity check
maxDailyVolume	✅	Limits total exposure
haltOnFailures	✅	Auto-pauses after X fails
dryRun	✅	Skips swaps, logs quote
.env fallbacks	❌ Removed	All config-only now
 * 
 */