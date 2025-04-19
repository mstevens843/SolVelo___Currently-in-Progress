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

const { getSwapQuote, executeSwap } = require("../../utils/swap");
const { getWallet, isSafeToBuy, logTrade, isAboveMinBalance, isWithinDailyLimit, getWalletBalance, loadWalletsFromArray } = require("../utils");
const { getTokenVolume, getTokenPriceChange } = require("../../utils/marketData");
const { sendTelegramMessage } = require("../../telegram/bots");
require("dotenv").config();

const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");

const BASE_MINT = botConfig.inputMint || "So11111111111111111111111111111111111111112";
const MONITORED = botConfig.monitoredTokens || [];

const SLIPPAGE = parseFloat(botConfig.slippage ?? 0.002);
const SCALP_AMOUNT = parseFloat(botConfig.scalpAmount ?? 0.005) * 1e9;
const INTERVAL = parseInt(botConfig.interval ?? 10000);
const ENTRY_THRESHOLD = parseFloat(botConfig.entryThreshold ?? 0.005);
const VOLUME_THRESHOLD = parseFloat(botConfig.volumeThreshold ?? 0);
const TAKE_PROFIT = parseFloat(botConfig.takeProfit ?? 0.01);
const STOP_LOSS = parseFloat(botConfig.stopLoss ?? 0.005);
const MAX_DAILY_VOLUME = parseFloat(botConfig.maxDailyVolume ?? 3);
const MAX_OPEN_TRADES = parseInt(botConfig.maxOpenTrades ?? 2);
const HALT_ON_FAILURES = parseInt(botConfig.haltOnFailures ?? 5);
const DRY_RUN = botConfig.dryRun === true;
const MIN_BALANCE = 0.2;
let todayTotal = 0;
let failureCount = 0;
let openTrades = [];

async function scalperBot() {
  setInterval(async () => {
    console.log(`\n🔁 Scalper Tick @ ${new Date().toLocaleTimeString()}`);

    if (failureCount >= HALT_ON_FAILURES) {
      console.warn(`🛑 Bot halted after ${failureCount} failures.`);
      return;
    }

    if (openTrades.length >= MAX_OPEN_TRADES) {
      console.log(`⚠️ Max open trades (${MAX_OPEN_TRADES}) hit. Skipping.`);
      return;
    }

    // Load wallets sent from frontend config (as stringified secret keys)
    if (Array.isArray(botConfig.wallets)) {
      loadWalletsFromArray(botConfig.wallets);
    }

    const wallet = getCurrentWallet(); // ✅ now safe to get active wallet

    if (solBalance < MIN_SOL) {
      console.warn(`⚠️ Not enough SOL for transaction fees (${solBalance} SOL). Skipping rebalance.`);
      return;
    }
  
    if (failureCount >= HALT_ON_FAILURES) {
      console.warn("🛑 Too many failures. Bot paused.");
      return;
    }


    for (const mint of MONITORED) {
      try {
        const token = mint;
        const priceChange = await getTokenPriceChange(token, 1); // 1h window
        const volume = await getTokenVolume(token);

        if (priceChange < ENTRY_THRESHOLD) {
          console.log(`📉 ${token} not moving enough (${(priceChange * 100).toFixed(2)}%)`);
          continue;
        }

        if (volume < VOLUME_THRESHOLD) {
          console.log(`💤 Low volume for ${token}: ${volume}`);
          continue;
        }

        const isSafe = await isSafeToBuy(token);
        if (!isSafe) {
          console.log(`🚫 Token ${token} failed honeypot.`);
          continue;
        }

        if (!isWithinDailyLimit(SCALP_AMOUNT / 1e9, todayTotal, MAX_DAILY_VOLUME)) {
          console.log("⚠️ Daily volume limit hit.");
          return;
        }

        const balance = await getWalletBalance(wallet);
        if (!isAboveMinBalance(balance, MIN_BALANCE)) {
          console.log("⚠️ Low wallet balance.");
          return;
        }

        const quote = await getSwapQuote({
          inputMint: BASE_MINT,
          outputMint: token,
          amount: SCALP_AMOUNT,
          slippage: SLIPPAGE,
        });

        if (!quote) {
          console.warn("⚠️ No quote. Skipping.");
          failureCount++;
          continue;
        }

        if (DRY_RUN) {
          console.log("🧪 Dry Run — no execution.");
          logTrade({
            timestamp: new Date().toISOString(),
            strategy: "scalper",
            inputMint: BASE_MINT,
            outputMint: token,
            inAmount: SCALP_AMOUNT,
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
          strategy: "scalper",
          inputMint: BASE_MINT,
          outputMint: token,
          inAmount: quote.inAmount,
          outAmount: quote.outAmount,
          priceImpact: quote.priceImpactPct * 100,
          txHash: tx || null,
          success: !!tx,
          takeProfit: TAKE_PROFIT,
          stopLoss: STOP_LOSS
        };

        logTrade(logData);

        if (tx) {
          todayTotal += SCALP_AMOUNT / 1e9;
          openTrades.push({
            token,
            entryPrice: quote.outAmount / quote.inAmount,
            timestamp: Date.now(),
            tx
          });

          const explorer = `https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`;
          console.log(`✅ Scalped ${token}: ${explorer}`);
          await sendTelegramMessage(`🔪 *Scalp Success*\nToken: \`${token}\`\n[TX Link](${explorer})`);
          failureCount = 0;
        } else {
          console.log("❌ Swap failed.");
          failureCount++;
          await sendTelegramMessage(`❌ *Scalp Failed*\nToken: \`${token}\``);
        }

        break; // one trade per tick
      } catch (err) {
        console.error(`💥 Error with ${mint}:`, err.message);
        failureCount++;
        await sendTelegramMessage(`⚠️ *Scalper Error*\n${err.message}`);
      }
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