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

const { getSwapQuote, executeSwap } = require("../utils/swap");
const { fetchTokenList } = require("../utils/marketData");
const { logTrade, isSafeToBuy, getWallet, isAboveMinBalance, isWithinDailyLimit } = require("./utils");
const { sendTelegramMessage } = require("../telegram/bots");
require("dotenv").config();

// Parse config passed from parent process.
const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");



const BASE_MINT = process.env.INPUT_MINT || "So11111111111111111111111111111111111111112";
const SLIPPAGE = parseFloat(botConfig.slippage ?? process.env.SLIPPAGE ?? "1.0");
const SNIPE_AMOUNT = parseFloat(process.env.SNIPE_AMOUNT || "0.01") * 1e9;
const SCAN_INTERVAL = parseInt(botConfig.interval ?? process.env.SNIPE_SCAN_INTERVAL ?? "30000");

const seen = new Set();
const minBalance = 0.2; // Min SOL to keep in wallet
const maxDaily = 5;     // Max daily trading volume (SOL)
let todayTotal = 0;
const tradeAmount = SNIPE_AMOUNT / 1e9; // in SOL


async function sniperBot() {
  setInterval(async () => {
    console.log(`\n🎯 Sniper Tick @ ${new Date().toLocaleTimeString()}`);
    try {
      const mints = await fetchTokenList();

      for (const mint of mints) {
        if (seen.has(mint)) continue;

        seen.add(mint);

        const wallet = getWallet();
        console.log(`🔍 New token detected: ${mint} — checking safety...`);

        const walletBalance = await getWalletBalance(wallet);
        if (!isAboveMinBalance(walletBalance, minBalance)) {
          console.log("🛑 Skipping trade: balance too low.");
          return;
        }

        if (!isWithinDailyLimit(tradeAmount, todayTotal, maxDaily)) {
          console.log("🛑 Skipping trade: exceeds daily limit.");
          return;
        }

        const isSafe = await isSafeToBuy(mint);
        if (!isSafe) {
          console.log(`🚫 Skipping unsafe token: ${mint}`);
          continue;
        }

        console.log(`✅ Safe to buy. Attempting to snipe ${mint}...`);
        const quote = await getSwapQuote({
          inputMint: BASE_MINT,
          outputMint: mint,
          amount: SNIPE_AMOUNT,
          slippage: SLIPPAGE,
        });

        if (!quote) {
          console.warn("⚠️ No quote available. Skipping.");
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
        };

        logTrade(logData);

        if (tx) {
          console.log(`🚀 Sniped ${mint}! TX: https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`);
          await sendTelegramMessage(`🚀 *Sniped Token*\nMint: \`${mint}\`\n[View TX](https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta)`);
        } else {
          console.log(`❌ Failed to snipe ${mint}.`);
          await sendTelegramMessage(`❌ *Snipe Failed*\nMint: \`${mint}\``);
        }

        break; // one snipe per tick
      }
    } catch (err) {
      console.error("❌ Sniper error:", err.message);
      await sendTelegramMessage(`⚠️ *Sniper Error:*\n${err.message}`);
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