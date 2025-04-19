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

/** BAsicallty a contrarian to Sniper Mode */



const { getTokenPrice, getTokenVolume } = require("../../utils/marketData");
const { getSwapQuote, executeSwap } = require("../../utils/swap");
const { sendTelegramMessage } = require("../../telegram/bots");
const { logTrade, isSafeToBuy, getWallet, isWithinDailyLimit, getWalletBalance, loadWalletsFromArray } = require("../utils");
const { PublicKey } = require("@solana/web3.js");
require("dotenv").config();

const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");

const TOKENS = (botConfig.watchedTokens ?? []).map((mint) => new PublicKey(mint));
const DIP_THRESHOLD = parseFloat(botConfig.dipThreshold ?? 0.2);
const LOOKBACK_MS = parseInt(botConfig.recoveryWindow ?? 300000); // Default 5m window
const INTERVAL = parseInt(botConfig.interval ?? 20000);
const VOLUME_THRESHOLD = parseFloat(botConfig.volumeThreshold ?? 10000);
const CONFIRMATION_CANDLES = parseInt(botConfig.confirmationCandles ?? 2);
const BASE_MINT = botConfig.inputMint ?? "So11111111111111111111111111111111111111112";
const POSITION_SIZE = parseFloat(botConfig.positionSize ?? 0.01) * 1e9;
const SLIPPAGE = parseFloat(botConfig.slippage ?? 0.004);
const TAKE_PROFIT = parseFloat(botConfig.takeProfit ?? 0.15);
const STOP_LOSS = parseFloat(botConfig.stopLoss ?? 0.07);
const DRY_RUN = botConfig.dryRun === true;
const MAX_DAILY_VOLUME = parseFloat(botConfig.maxDailyVolume ?? 3);
const HALT_ON_FAILURES = parseInt(botConfig.haltOnFailures ?? 3);
const COOLDOWN = parseInt(botConfig.cooldown ?? 60000);

let priceHistory = {};
let failureCount = 0;
let lastBuyTimestamps = {};
let todayTotal = 0;

async function dipBuyerBot() {
  setInterval(async () => {
    console.log(`\n🩸 Dip Buyer Tick @ ${new Date().toLocaleTimeString()}`);

    if (failureCount >= HALT_ON_FAILURES) {
      console.warn("🛑 Bot halted after too many failures.");
      return;
    }

    for (const token of TOKENS) {
      const tokenKey = token.toBase58();
      const now = Date.now();

      try {
        const cooldownActive = lastBuyTimestamps[tokenKey] && now - lastBuyTimestamps[tokenKey] < COOLDOWN;
        if (cooldownActive) {
          console.log(`⏳ Cooldown active for ${tokenKey}`);
          continue;
        }

        const price = await getTokenPrice(token);
        const volume = await getTokenVolume(token);
        if (!price || !volume || volume < VOLUME_THRESHOLD) {
          console.log(`⚠️ Skipping ${tokenKey} — insufficient price or volume`);
          continue;
        }

        const lastPrice = priceHistory[tokenKey]?.price ?? price;
        const lastTime = priceHistory[tokenKey]?.time ?? now;
        const drop = (lastPrice - price) / lastPrice;

        console.log(`📉 ${tokenKey}: Drop = ${(drop * 100).toFixed(2)}%, Volume = ${volume}`);

        if (drop >= DIP_THRESHOLD && now - lastTime <= LOOKBACK_MS) {
          console.log(`🚨 Dip triggered for ${tokenKey}`);

          const isSafe = await isSafeToBuy(tokenKey);
          if (!isSafe) {
            console.log(`🚫 Honeypot check failed.`);
            continue;
          }

          if (!isWithinDailyLimit(POSITION_SIZE / 1e9, todayTotal, MAX_DAILY_VOLUME)) {
            console.log("⚠️ Max daily volume hit.");
            return;
          }

          // Load wallets sent from frontend config (as stringified secret keys)
          if (Array.isArray(botConfig.wallets)) {
                loadWalletsFromArray(botConfig.wallets);
              }
          

          const wallet = getCurrentWallet(); // ✅ now safe to get active wallet          const solBalance = await getWalletBalance(wallet);
          const MIN_SOL = 0.01;

          if (solBalance < MIN_SOL) {
            console.warn(`⚠️ Not enough SOL for transaction fees (${solBalance} SOL). Skipping rebalance.`);
            return;
          }
          const quote = await getSwapQuote({
            inputMint: BASE_MINT,
            outputMint: tokenKey,
            amount: POSITION_SIZE,
            slippage: SLIPPAGE,
          });

          if (!quote) {
            console.warn("❌ No quote available.");
            failureCount++;
            continue;
          }

          if (DRY_RUN) {
            console.log("🧪 Dry run — not executing.");
            logTrade({
              timestamp: new Date().toISOString(),
              strategy: "dipBuyer",
              inputMint: BASE_MINT,
              outputMint: tokenKey,
              inAmount: POSITION_SIZE,
              outAmount: quote.outAmount,
              priceImpact: quote.priceImpactPct * 100,
              txHash: null,
              success: true,
              dryRun: true,
              takeProfit: TAKE_PROFIT,
              stopLoss: STOP_LOSS
            });
            continue;
          }

          const tx = await executeSwap({ quote, wallet });

          logTrade({
            timestamp: new Date().toISOString(),
            strategy: "dipBuyer",
            inputMint: BASE_MINT,
            outputMint: tokenKey,
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
            console.log(`✅ Dip Buy Success: ${explorer}`);
            await sendTelegramMessage(`🩸 *Dip Buy Triggered*\n[TX](${explorer})`);
            todayTotal += POSITION_SIZE / 1e9;
            failureCount = 0;
            lastBuyTimestamps[tokenKey] = now;
          } else {
            failureCount++;
            await sendTelegramMessage(`❌ *Dip Buy Failed* for ${tokenKey}`);
          }
        }

        priceHistory[tokenKey] = { price, time: now };
      } catch (err) {
        failureCount++;
        console.error(`❌ Error for ${tokenKey}:`, err.message);
        await sendTelegramMessage(`⚠️ *Dip Buyer Error for ${tokenKey}*\n${err.message}`);
      }
    }
  }, INTERVAL);
}

module.exports = dipBuyerBot;





/** Additions"
 * - wallet rotation
 * - Honeypot Protection
 * - Trade logging
 * - Telegram LAerts
 * - Smarter Price Money
 */


/** Additions:
 * Feature	Status
watchedTokens → replaces tokens ✅	
dipThreshold ✅	
recoveryWindow 🟡 stubbed (for later TP logic)	
confirmationCandles 🟡 stubbed	
volumeThreshold ✅	
positionSize ✅	
takeProfit, stopLoss ✅	
dryRun ✅	
maxDailyVolume ✅	
haltOnFailures ✅	
cooldown ✅
 */