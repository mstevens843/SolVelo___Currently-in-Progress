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


const { getSwapQuote, executeSwap } = require("../../utils/swap");
const { fetchTokenList, getTokenPrice, getTokenVolume } = require("../../utils/marketData");
const { logTrade, isSafeToBuy, getWallet, isWithinDailyLimit } = require("../utils");
const { sendTelegramMessage } = require("../../telegram/bots");
require("dotenv").config();

const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");

const BASE_MINT = botConfig.inputMint || "So11111111111111111111111111111111111111112";
const MONITORED = botConfig.monitoredTokens || null;
const SLIPPAGE = parseFloat(botConfig.slippage ?? 0.006);
const AMOUNT = parseFloat(botConfig.snipeAmount ?? 0.01) * 1e9;
const DELAY_MS = parseInt(botConfig.delayMs ?? 15000);
const SCAN_INTERVAL = parseInt(botConfig.scanInterval ?? 10000);
const ENTRY_THRESHOLD = parseFloat(botConfig.entryThreshold ?? 0.02);
const VOLUME_THRESHOLD = parseFloat(botConfig.volumeThreshold ?? 10000);
const TAKE_PROFIT = parseFloat(botConfig.takeProfit ?? 0.2);
const STOP_LOSS = parseFloat(botConfig.stopLoss ?? 0.1);
const DRY_RUN = botConfig.dryRun === true;
const MAX_DAILY_VOLUME = parseFloat(botConfig.maxDailyVolume ?? 4);
const HALT_ON_FAILURES = parseInt(botConfig.haltOnFailures ?? 4);
const COOLDOWN = parseInt(botConfig.cooldown ?? 60000);

const seen = new Set();
let lastSnipe = {};
let failureCount = 0;
let todayTotal = 0;

async function delayedSniperBot() {
  console.log(`\n🕒 Delayed Sniper Tick @ ${new Date().toLocaleTimeString()}`);

  if (failureCount >= HALT_ON_FAILURES) {
    console.warn("🛑 Bot halted after too many failures.");
    return;
  }

  try {
    const candidates = MONITORED ? MONITORED : await fetchTokenList();

    for (const mint of candidates) {
      if (seen.has(mint)) continue;
      seen.add(mint);

      const now = Date.now();
      if (lastSnipe[mint] && now - lastSnipe[mint] < COOLDOWN) {
        console.log(`⏳ Cooldown active for ${mint}`);
        continue;
      }

      console.log(`👀 New token detected: ${mint} — waiting ${DELAY_MS / 1000}s...`);

      setTimeout(async () => {
        try {
          const [priceNow, volume] = await Promise.all([
            getTokenPrice(mint),
            getTokenVolume(mint)
          ]);

          const priceChange = priceNow && priceNow > 0 ? (priceNow - priceNow * (1 - ENTRY_THRESHOLD)) / priceNow : 0;

          if (volume < VOLUME_THRESHOLD || priceChange < ENTRY_THRESHOLD) {
            console.log(`📉 Skipping ${mint} — price or volume too weak.`);
            return;
          }

          const isSafe = await isSafeToBuy(mint);
          if (!isSafe) {
            console.log(`🚫 ${mint} failed honeypot check.`);
            return;
          }

          const wallet = getWallet();

          if (!isWithinDailyLimit(AMOUNT / 1e9, todayTotal, MAX_DAILY_VOLUME)) {
            console.log("⚠️ Daily cap reached. Skipping.");
            return;
          }

          const quote = await getSwapQuote({
            inputMint: BASE_MINT,
            outputMint: mint,
            amount: AMOUNT,
            slippage: SLIPPAGE,
          });

          if (!quote) {
            console.warn(`⚠️ No quote for ${mint}`);
            failureCount++;
            return;
          }

          if (DRY_RUN) {
            console.log("🧪 DRY RUN — skipping swap.");
            logTrade({
              timestamp: new Date().toISOString(),
              strategy: "delayedSniper",
              inputMint: BASE_MINT,
              outputMint: mint,
              inAmount: AMOUNT,
              outAmount: quote.outAmount,
              priceImpact: quote.priceImpactPct * 100,
              txHash: null,
              success: true,
              takeProfit: TAKE_PROFIT,
              stopLoss: STOP_LOSS,
              dryRun: true
            });
            return;
          }

          const tx = await executeSwap({ quote, wallet });

          logTrade({
            timestamp: new Date().toISOString(),
            strategy: "delayedSniper",
            inputMint: BASE_MINT,
            outputMint: mint,
            inAmount: quote.inAmount,
            outAmount: quote.outAmount,
            priceImpact: quote.priceImpactPct * 100,
            txHash: tx || null,
            success: !!tx,
            takeProfit: TAKE_PROFIT,
            stopLoss: STOP_LOSS
          });

          if (tx) {
            const explorer = `https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`;
            console.log(`✅ Delayed Snipe: ${explorer}`);
            await sendTelegramMessage(`⏳ *Delayed Snipe Success*\n[TX](${explorer})`);
            lastSnipe[mint] = now;
            todayTotal += AMOUNT / 1e9;
            failureCount = 0;
          } else {
            failureCount++;
            await sendTelegramMessage(`❌ *Delayed Snipe Failed* for ${mint}`);
          }
        } catch (innerErr) {
          failureCount++;
          console.error(`💥 Error during delayed snipe for ${mint}:`, innerErr.message);
          await sendTelegramMessage(`⚠️ *Delayed Snipe Error*\n${innerErr.message}`);
        }
      }, DELAY_MS);

      break; // One token per cycle
    }
  } catch (err) {
    failureCount++;
    console.error("💥 Scan error:", err.message);
    await sendTelegramMessage(`⚠️ *Delayed Sniper Scan Error*\n${err.message}`);
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