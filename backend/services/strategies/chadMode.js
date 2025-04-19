/** Chad Mode Strategy Module
 * - Max-risk Mode for sniping fresh mints or low caps 
 * - Uses higher priority fees to front-run and maximize entry speed. 
 * - Designed for fast entry and optionally fast exit (1-candle flip) 
 * 
 * Configurable 
 * - Token list or dynamic target
 * - Trade amount (high)
 * - Priority fee amount
 * - Optional auto-dump toggle 
 * 
 * Eventually Support: 
 * - Auto-sell after delay or % gain 
 * - Telegram alers or successes 
 * - Honeypot detection before entry
 * - Logging wins/losses per snipe 
 */

const { getSwapQuote, executeSwap } = require("../../utils/swap");
const { sendTelegramMessage } = require("../../telegram/bots");
const { logTrade, isSafeToBuy, getWallet, getWalletBalance, loadWalletsFromArray } = require("../utils");
require("dotenv").config();

const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");

const inputMint = botConfig.inputMint || "So11111111111111111111111111111111111111112";
const outputMint = botConfig.outputMint;
const amount = parseFloat(botConfig.positionSize ?? 0.03) * 1e9;
const slippage = parseFloat(botConfig.slippage ?? 0.015);
const dryRun = botConfig.dryRun === true;
const priorityFeeLamports = parseInt(botConfig.priorityFeeLamports ?? 10000);
const takeProfit = parseFloat(botConfig.takeProfit ?? 0.5);
const stopLoss = parseFloat(botConfig.stopLoss ?? 0.2);

// Auto-sell logic
const autoSell = botConfig.autoSell ?? {};
const AUTO_SELL_ENABLED = autoSell.enabled ?? true;
const AUTO_SELL_DELAY = parseInt(autoSell.delay ?? 10000);
const USE_RANDOM_DELAY = autoSell.useRandomDelay === true;
const RANDOM_DELAY_RANGE = autoSell.randomDelayRange ?? [2000, 5000];

function getRandomDelay() {
  const [min, max] = RANDOM_DELAY_RANGE;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function chadMode() {
  if (!outputMint) {
    console.error("❌ outputMint not defined in config.");
    return;
  }

  // Load wallets sent from frontend config (as stringified secret keys)
  if (Array.isArray(botConfig.wallets)) {
        loadWalletsFromArray(botConfig.wallets);
      }
  
  const wallet = getCurrentWallet(); // ✅ now safe to get active wallet
  console.log(`\n🚨 CHAD MODE ENGAGED — Target: ${outputMint}`);

  const solBalance = await getWalletBalance(wallet);
  const MIN_SOL = 0.01;

  if (solBalance < MIN_SOL) {
    console.warn(`⚠️ Not enough SOL for transaction fees (${solBalance} SOL). Skipping rebalance.`);
    return;
  }

  try {
    const isSafe = await isSafeToBuy(outputMint);
    if (!isSafe) {
      console.log("🚫 Unsafe token. Chad refrains.");
      await sendTelegramMessage(`🚫 *Chad skipped unsafe token:* \`${outputMint}\``);
      return;
    }

    const quote = await getSwapQuote({
      inputMint,
      outputMint,
      amount,
      slippage,
    });

    if (!quote) {
      console.warn("⚠️ No route available.");
      return;
    }

    quote.prioritizationFeeLamports = priorityFeeLamports;

    if (dryRun) {
      console.log("🧪 DRY RUN — Logging only.");
      logTrade({
        timestamp: new Date().toISOString(),
        strategy: "chadMode",
        inputMint,
        outputMint,
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct * 100,
        txHash: null,
        success: true,
        dryRun: true,
        takeProfit,
        stopLoss
      });
      return;
    }

    const tx = await executeSwap({ quote, wallet });

    const logData = {
      timestamp: new Date().toISOString(),
      strategy: "chadMode",
      inputMint,
      outputMint,
      inAmount: quote.inAmount,
      outAmount: quote.outAmount,
      priceImpact: quote.priceImpactPct * 100,
      txHash: tx || null,
      success: !!tx,
      takeProfit,
      stopLoss
    };

    logTrade(logData);

    if (tx) {
      const explorer = `https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`;
      console.log(`✅ Chad Sniped: ${explorer}`);
      await sendTelegramMessage(`✅ *Chad Sniped*\n[TX](${explorer})`);

      if (AUTO_SELL_ENABLED) {
        const delay = USE_RANDOM_DELAY ? getRandomDelay() : AUTO_SELL_DELAY;
        console.log(`⏳ Holding ${delay / 1000}s before dumping...`);

        setTimeout(async () => {
          try {
            const reverseQuote = await getSwapQuote({
              inputMint: outputMint,
              outputMint: inputMint,
              amount: quote.outAmount,
              slippage,
            });

            if (!reverseQuote) {
              console.log("❌ No route for exit.");
              await sendTelegramMessage("❌ *Chad Dump Failed — no route*");
              return;
            }

            reverseQuote.prioritizationFeeLamports = priorityFeeLamports;
            const dumpTx = await executeSwap({ quote: reverseQuote, wallet });

            logTrade({
              timestamp: new Date().toISOString(),
              strategy: "chadMode-dump",
              inputMint: outputMint,
              outputMint: inputMint,
              inAmount: reverseQuote.inAmount,
              outAmount: reverseQuote.outAmount,
              priceImpact: reverseQuote.priceImpactPct * 100,
              txHash: dumpTx || null,
              success: !!dumpTx
            });

            if (dumpTx) {
              const dumpExplorer = `https://explorer.solana.com/tx/${dumpTx}?cluster=mainnet-beta`;
              console.log(`💸 Chad Dumped: ${dumpExplorer}`);
              await sendTelegramMessage(`💸 *Chad Dumped*\n[TX](${dumpExplorer})`);
            } else {
              console.log("❌ Dump failed.");
              await sendTelegramMessage("❌ *Chad Dump Failed*");
            }
          } catch (dumpErr) {
            console.error("💥 Dump Error:", dumpErr.message);
            await sendTelegramMessage(`⚠️ *Chad Dump Error:*\n${dumpErr.message}`);
          }
        }, delay);
      }
    } else {
      console.log("❌ Entry failed.");
      await sendTelegramMessage("❌ *Chad Entry Failed*");
    }
  } catch (err) {
    console.error("🚨 Chad Mode Error:", err.message);
    await sendTelegramMessage(`⚠️ *Chad Error:*\n${err.message}`);
  }
}

module.exports = chadMode;



/** 
 * Additions: 
 * Wallet Rotation
 * HoneyPot guard (optional Skip) 
 * Telegram alerts 
 * Analytics logging (for both buys + dump) 
 * Clean error handling
 * Priority fee handling
 * Auto-dump mode (optional)
 */


/** Additions: 04/17
 * Feature	Action
inputMint, outputMint	Use from config (not .env)
positionSize	Replaces amount
slippage, walletIndex	Use from config
takeProfit, stopLoss	Add to trade logs
dryRun	Respect test-only mode
priorityFeeLamports	Add optional config override
AUTO_SELL_ENABLED, AUTO_SELL_DELAY	Convert to config-based autoSell object
randomDelayRange	Apply random delay before sell
useRandomDelay	Enable randomized timing
 */