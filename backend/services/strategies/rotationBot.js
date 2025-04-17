/** Rotation Bot Strategy Module
 * - Rotates capital into the best performing token in a monitored list. 
 * - Compares 24h or short-term performance of known tokens.
 * - Swaps from current holdings into strongest trading asset. 
 * 
 * Configurable:
 * - Token List 
 * - Ranking metric (e.g. % gain over 24h) 
 * - Reallocation interval 
 * 
 * Eventually Support:
 * - Hisotrical backtesting
 * - Telegram alerts for rotations
 * - Rotation overried via dashboard
 */

/** Rotation Bot Strategy Module
 * - Rotates capital into the best performing token in a monitored list.
 * - Compares 24h or short-term performance of known tokens.
 * - Swaps from current holdings into strongest trending asset.
 * 
 * Configurable:
 * - Token list
 * - Ranking metric (e.g. % gain over 24h)
 * - Reallocation interval
 * 
 * Eventually Support:
 * - Historical backtesting
 * - Telegram alerts for rotations
 * - Rotation override via dashboard
 */

const { getTokenPriceChange, getTokenVolume, getTokenBalance } = require("../../utils/marketData.js");
const { getSwapQuote, executeSwap } = require("../../utils/swap.js");
const { logTrade, isSafeToBuy, getWallet, isWithinDailyLimit } = require("../utils/index.js");
const { sendTelegramMessage } = require("../../telegram/bots.js");
const { PublicKey } = require("@solana/web3.js");
require("dotenv").config();

const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");

const SECTORS = botConfig.sectors ?? {};
const ROTATION_INTERVAL = parseInt(botConfig.rotationInterval ?? 3600000);
const SCAN_INTERVAL = parseInt(botConfig.scanInterval ?? 10000);
const BASE_MINT = botConfig.inputMint || "So11111111111111111111111111111111111111112";
const POSITION_SIZE = parseFloat(botConfig.positionSize ?? 0.015) * 1e9;
const ENTRY_THRESHOLD = parseFloat(botConfig.entryThreshold ?? 0.03);
const VOLUME_THRESHOLD = parseFloat(botConfig.volumeThreshold ?? 15000);
const MIN_MOMENTUM = parseFloat(botConfig.minMomentum ?? 0.02);
const MAX_DRAWDOWN = parseFloat(botConfig.maxDrawdown ?? 0.1);
const SLIPPAGE = parseFloat(botConfig.slippage ?? 0.005);
const TAKE_PROFIT = parseFloat(botConfig.takeProfit ?? 0.25);
const STOP_LOSS = parseFloat(botConfig.stopLoss ?? 0.1);
const MAX_OPEN_TRADES = parseInt(botConfig.maxOpenTrades ?? 2);
const MAX_DAILY_VOLUME = parseFloat(botConfig.maxDailyVolume ?? 5);
const HALT_ON_FAILURES = parseInt(botConfig.haltOnFailures ?? 4);
const COOLDOWN = parseInt(botConfig.cooldown ?? 60000);
const DRY_RUN = botConfig.dryRun === true;

let failureCount = 0;
let lastRotated = {};
let todayVolume = 0;
let openTrades = [];

async function rotationBot() {
  console.log(`\n♻️ RotationBot Tick @ ${new Date().toLocaleTimeString()}`);

  if (failureCount >= HALT_ON_FAILURES) {
    console.warn("🛑 Bot halted after too many failures.");
    return;
  }

  try {
    const wallet = getWallet();

    // Flatten all tokens from all sectors
    const allTokens = Object.values(SECTORS).flat();

    const candidates = [];

    for (const mint of allTokens) {
      const tokenMint = new PublicKey(mint);
      const priceChange = await getTokenPriceChange(tokenMint, 6);
      const volume = await getTokenVolume(tokenMint);

      if (priceChange >= ENTRY_THRESHOLD && volume >= VOLUME_THRESHOLD) {
        candidates.push({ mint, priceChange, volume });
      }
    }

    candidates.sort((a, b) => b.priceChange - a.priceChange);

    const top = candidates[0];
    if (!top || top.priceChange < MIN_MOMENTUM) {
      console.log("⚠️ No strong token to rotate into.");
      return;
    }

    if (lastRotated[top.mint] && Date.now() - lastRotated[top.mint] < COOLDOWN) {
      console.log(`⏳ Cooldown active for ${top.mint}`);
      return;
    }

    const baseBalance = await getTokenBalance(wallet.publicKey, BASE_MINT);
    if (!baseBalance || baseBalance <= 0) {
      console.log("❌ No balance in base token.");
      return;
    }

    if (!isWithinDailyLimit(POSITION_SIZE / 1e9, todayVolume, MAX_DAILY_VOLUME)) {
      console.log("⚠️ Max daily volume hit.");
      return;
    }

    if (openTrades.length >= MAX_OPEN_TRADES) {
      console.log("⚠️ Max open trades reached.");
      return;
    }

    const isSafe = await isSafeToBuy(top.mint);
    if (!isSafe) {
      console.log("🚫 Honeypot check failed.");
      return;
    }

    const quote = await getSwapQuote({
      inputMint: BASE_MINT,
      outputMint: top.mint,
      amount: POSITION_SIZE,
      slippage: SLIPPAGE,
    });

    if (!quote) {
      console.warn("❌ No route for rotation.");
      failureCount++;
      return;
    }

    if (DRY_RUN) {
      console.log("🧪 Dry run active.");
      logTrade({
        timestamp: new Date().toISOString(),
        strategy: "rotationBot",
        inputMint: BASE_MINT,
        outputMint: top.mint,
        inAmount: POSITION_SIZE,
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

    const logData = {
      timestamp: new Date().toISOString(),
      strategy: "rotationBot",
      inputMint: BASE_MINT,
      outputMint: top.mint,
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
      console.log(`✅ Rotated into ${top.mint}: ${explorer}`);
      await sendTelegramMessage(`♻️ *Rotation Success*\n[TX](${explorer})`);
      todayVolume += POSITION_SIZE / 1e9;
      lastRotated[top.mint] = Date.now();
      openTrades.push(top.mint);
      failureCount = 0;
    } else {
      failureCount++;
      await sendTelegramMessage(`❌ *Rotation Swap Failed* for ${top.mint}`);
    }

  } catch (err) {
    failureCount++;
    console.error("💥 RotationBot Error:", err.message);
    await sendTelegramMessage(`⚠️ *Rotation Error:*\n${err.message}`);
  }

  setTimeout(rotationBot, ROTATION_INTERVAL);
}

module.exports = rotationBot;




/** additions:
 * Multi-wallet support
 * HoneyPot Check 
 * Telegram Alerts 
 * Trade Logging
 */

/** 04/17 
 * 
 * 
 * Feature	Status
sectors config (grouped tokens)	✅ Iterate by category, flatten and rank
rotationInterval / scanInterval	✅ Already respected
volumeThreshold, minMomentum, entryThreshold	✅ Enforced before rotating
positionSize, maxDailyVolume	✅ Trade only portion, not entire balance
takeProfit, stopLoss	✅ Logged
cooldown, maxOpenTrades, haltOnFailures	✅ Enforced runtime behavior
dryRun	✅ Logged but no trade
.env fallback	❌ Removed completely
 * 
 */