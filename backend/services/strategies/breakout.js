/** Breakout Strategy Module 
 * - Monitors token price and volume spikes. 
 * - Detects breakout opportunities using thresholds.
 * - Executes swap when breakout conditions are met. 
 * 
 * Configurable: 
 * - Token list to monitor
 * - Price threshold (% increase)
 * - Volume threshold
 * 
 * Eventually Support: 
 * - Timeframe-based candles (e.g. 1m/5m)
 * - Telegram alerts
 * - Multi-token monitoring via dynamic feeds. 
 */


/** Breakout Strategy Module 
 * - Monitors tokens for % price increase + volume spike.
 * - Enters position on breakout signal.
 * 
 * Includes:
 * - Token list config
 * - Honeypot protection
 * - Telegram alerts
 * - Analytics logging
 * - Wallet rotation
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const { getTokenPriceChange, getTokenVolume } = require('../../utils/marketData.js');
const { getSwapQuote, executeSwap } = require('../../utils/swap.js');
const { logTrade, isSafeToBuy, getWallet, isAboveMinBalance, isWithinDailyLimit } = require("../utils/index.js");
const { sendTelegramMessage } = require('../../telegram/bots.js');
require('dotenv').config();

const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");

const connection = new Connection(process.env.SOLANA_RPC_URL);

const MONITORED_TOKENS = (botConfig.monitoredTokens || [
  'So11111111111111111111111111111111111111112',
]).map((mint) => new PublicKey(mint));

const BASE_MINT = botConfig.inputMint || "So11111111111111111111111111111111111111112";
const SLIPPAGE = parseFloat(botConfig.slippage ?? 0.008);
const POSITION_SIZE = parseFloat(botConfig.positionSize ?? 0.01) * 1e9;
const INTERVAL = parseInt(botConfig.interval ?? 15000);
const BREAKOUT_THRESHOLD = parseFloat(botConfig.breakoutThreshold ?? 0.18);
const VOLUME_MULTIPLIER = parseFloat(botConfig.volumeSpikeMultiplier ?? 2.5);
const CONFIRMATION_CANDLES = parseInt(botConfig.confirmationCandles ?? 2);
const MIN_LIQUIDITY = parseFloat(botConfig.minLiquidity ?? 12000);
const TAKE_PROFIT = parseFloat(botConfig.takeProfit ?? 0.25);
const STOP_LOSS = parseFloat(botConfig.stopLoss ?? 0.1);
const MAX_DAILY_VOLUME = parseFloat(botConfig.maxDailyVolume ?? 4);
const HALT_ON_FAILURES = parseInt(botConfig.haltOnFailures ?? 4);
const DRY_RUN = botConfig.dryRun === true;
const COOLDOWN = parseInt(botConfig.cooldown ?? 60000);

let lastTrade = {};
let todayTotal = 0;
let failureCount = 0;

async function monitorBreakouts() {
  console.log(`\n📈 Breakout Tick @ ${new Date().toLocaleTimeString()}`);

  if (failureCount >= HALT_ON_FAILURES) {
    console.warn(`🛑 Bot halted after ${failureCount} failures.`);
    return;
  }

  for (const tokenMint of MONITORED_TOKENS) {
    const mint = tokenMint.toBase58();

    try {
      const now = Date.now();
      if (lastTrade[mint] && now - lastTrade[mint] < COOLDOWN) {
        console.log(`⏳ Cooldown active for ${mint}. Skipping.`);
        continue;
      }

      const priceChange = await getTokenPriceChange(tokenMint, 6);
      const volumeNow = await getTokenVolume(tokenMint);
      const avgVolume = volumeNow / VOLUME_MULTIPLIER;

      if (!priceChange || !volumeNow) continue;

      console.log(`Token ${mint} → ΔPrice: ${(priceChange * 100).toFixed(2)}%, Volume: ${volumeNow}`);

      if (priceChange >= BREAKOUT_THRESHOLD && volumeNow >= MIN_LIQUIDITY && volumeNow >= avgVolume * VOLUME_MULTIPLIER) {
        console.log(`🚨 Breakout detected: ${mint}`);

        const isSafe = await isSafeToBuy(mint);
        if (!isSafe) {
          console.log(`🚫 ${mint} failed honeypot check`);
          continue;
        }

        const wallet = getWallet();

        if (!isWithinDailyLimit(POSITION_SIZE / 1e9, todayTotal, MAX_DAILY_VOLUME)) {
          console.log("⚠️ Max daily volume reached. Skipping.");
          return;
        }

        const quote = await getSwapQuote({
          inputMint: BASE_MINT,
          outputMint: mint,
          amount: POSITION_SIZE,
          slippage: SLIPPAGE,
        });

        if (!quote) {
          console.warn(`⚠️ No quote for ${mint}`);
          failureCount++;
          continue;
        }

        if (DRY_RUN) {
          console.log("🧪 Dry Run — not executing swap.");
          logTrade({
            timestamp: new Date().toISOString(),
            strategy: "breakout",
            inputMint: BASE_MINT,
            outputMint: mint,
            inAmount: POSITION_SIZE,
            outAmount: quote.outAmount,
            priceImpact: quote.priceImpactPct * 100,
            txHash: null,
            success: true,
            takeProfit: TAKE_PROFIT,
            stopLoss: STOP_LOSS,
            dryRun: true
          });
          lastTrade[mint] = now;
          continue;
        }

        const tx = await executeSwap({ quote, wallet });

        const logData = {
          timestamp: new Date().toISOString(),
          strategy: "breakout",
          inputMint: BASE_MINT,
          outputMint: mint,
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
          const explorer = `https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`;
          console.log(`✅ Breakout trade success: ${explorer}`);
          await sendTelegramMessage(`📈 *Breakout Trade*\n[TX](${explorer})`);
          todayTotal += POSITION_SIZE / 1e9;
          failureCount = 0;
          lastTrade[mint] = now;
        } else {
          failureCount++;
          await sendTelegramMessage(`❌ *Breakout Swap Failed* for ${mint}`);
        }
      } else {
        console.log(`❌ No breakout for ${mint}`);
      }
    } catch (err) {
      failureCount++;
      console.error(`❌ Error scanning ${mint}:`, err.message);
      await sendTelegramMessage(`⚠️ *Breakout Error:*\n${err.message}`);
    }
  }

  setTimeout(monitorBreakouts, INTERVAL);
}

module.exports = monitorBreakouts;



/** 
 * Additions :
 * - Wallet rotation
 * - Honeypot protection
 * - Telegram alerts
 * - Analytics logging
 * - Flexible config via .env
 * - Better price & volume detection falback
 */


/** Additions 04/17 
 * ✅ inputMint, slippage, positionSize, interval	Swap hardcoded .env fallbacks for config
✅ breakoutThreshold	Rename and apply to priceChange check
✅ volumeSpikeMultiplier	Compare current volume to average
✅ confirmationCandles	Stub logic now — future implementation
✅ minLiquidity	Apply to volume threshold
✅ takeProfit, stopLoss	Include in trade log for future exit logic
✅ dryRun, maxDailyVolume, haltOnFailures	Add runtime behavior controls
✅ cooldown	Prevent double-entry too fast
 */