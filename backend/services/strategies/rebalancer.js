/** Rebalancer Strategy Module 
 * - Monitors wallet token balances. 
 * - Automatically swaps tokens to maintain a target ratio. 
 * - Great for maintaining long-term positions ( 60/40 split )
 * 
 * 
 * Configurable: 
 * - Target allocation per Token 
 * - Minimum deviation % before rebalance triggers 
 * - Trade amount granularity 
 * 
 * Eventually Support: 
 * - Telegram alerts when rebalancing is triggered
 * - SQLite logging of balance history + TXs
 * - Dynamic ratio based on price trend (e.g. 70/30 SOL rally)
 */


const { getTokenBalance, getTokenPrice } = require("../../utils/marketData");
const { getSwapQuote, executeSwap } = require("../../utils/swap");
const { logTrade, isSafeToBuy, getWallet, getWalletBalance, loadWalletsFromArray } = require("../utils");
const { sendTelegramMessage } = require("../../telegram/bots");
const { PublicKey } = require("@solana/web3.js");
require("dotenv").config();

const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");

const TARGET_ALLOCATION = botConfig.targetAllocations || {};
const REBALANCE_THRESHOLD = parseFloat(botConfig.rebalanceThreshold ?? 0.05);
const MIN_TRADE_SIZE = parseFloat(botConfig.minTradeSize ?? 0.005);
const SLIPPAGE = parseFloat(botConfig.slippage ?? 0.005);
const DRY_RUN = botConfig.dryRun === true;
const MAX_TRADES = parseInt(botConfig.maxTradesPerCycle ?? 4);
const HALT_ON_FAILURES = parseInt(botConfig.haltOnFailures ?? 3);

let failureCount = 0;

async function rebalancer() {
// Load wallets sent from frontend config (as stringified secret keys)
  if (Array.isArray(botConfig.wallets)) {
        loadWalletsFromArray(botConfig.wallets);
      }
  

  const wallet = getCurrentWallet(); // ✅ now safe to get active wallet  console.log("\n📐 Portfolio Rebalance Check");

  const solBalance = await getWalletBalance(wallet);
  const MIN_SOL = 0.01;

  if (solBalance < MIN_SOL) {
    console.warn(`⚠️ Not enough SOL for transaction fees (${solBalance} SOL). Skipping rebalance.`);
    return;
  }

  if (failureCount >= HALT_ON_FAILURES) {
    console.warn("🛑 Too many failures. Bot paused.");
    return;
  }

  try {
    const tokenMints = Object.keys(TARGET_ALLOCATION);

    const [prices, balances] = await Promise.all([
      Promise.all(tokenMints.map(m => getTokenPrice(new PublicKey(m)))),
      Promise.all(tokenMints.map(m => getTokenBalance(wallet.publicKey, m))),
    ]);

    const values = tokenMints.map((m, i) => balances[i] * prices[i]);
    const totalValue = values.reduce((a, b) => a + b, 0);

    const currentAlloc = {};
    tokenMints.forEach((m, i) => {
      currentAlloc[m] = values[i] / totalValue;
    });

    console.log("📊 Current Allocation:");
    tokenMints.forEach(m => {
      console.log(`- ${m}: ${(currentAlloc[m] * 100).toFixed(2)}% (Target: ${(TARGET_ALLOCATION[m] * 100).toFixed(2)}%)`);
    });

    let tradeCount = 0;

    for (const [token, targetPct] of Object.entries(TARGET_ALLOCATION)) {
      const currentPct = currentAlloc[token] ?? 0;
      const delta = currentPct - targetPct;

      if (Math.abs(delta) >= REBALANCE_THRESHOLD) {
        const fromMint = delta > 0 ? token : tokenMints.find(m => m !== token);
        const toMint = delta > 0 ? tokenMints.find(m => m !== token) : token;

        const fromPrice = prices[tokenMints.indexOf(fromMint)];
        const amountToRebalance = (Math.abs(delta) * totalValue) / fromPrice;

        if (amountToRebalance < MIN_TRADE_SIZE) {
          console.log(`⚠️ Rebalance size too small (${amountToRebalance.toFixed(4)}). Skipping.`);
          continue;
        }

        if (tradeCount >= MAX_TRADES) {
          console.log("🚫 Max trades per cycle reached.");
          break;
        }

        console.log(`🔁 Rebalancing ${fromMint} → ${toMint} by ${amountToRebalance.toFixed(4)}...`);

        const isSafe = await isSafeToBuy(toMint);
        if (!isSafe) {
          console.log("🚫 Target token failed honeypot check.");
          continue;
        }

        const quote = await getSwapQuote({
          inputMint: fromMint,
          outputMint: toMint,
          amount: amountToRebalance * 1e9,
          slippage: SLIPPAGE,
        });

        if (!quote) {
          console.warn("❌ No quote route. Skipping.");
          failureCount++;
          continue;
        }

        if (DRY_RUN) {
          console.log("🧪 DRY RUN — Logging only.");
          logTrade({
            timestamp: new Date().toISOString(),
            strategy: "rebalancer",
            inputMint: fromMint,
            outputMint: toMint,
            inAmount: quote.inAmount,
            outAmount: quote.outAmount,
            priceImpact: quote.priceImpactPct * 100,
            txHash: null,
            success: true,
            dryRun: true
          });
          tradeCount++;
          continue;
        }

        const tx = await executeSwap({ quote, wallet });

        const logData = {
          timestamp: new Date().toISOString(),
          strategy: "rebalancer",
          inputMint: fromMint,
          outputMint: toMint,
          inAmount: quote.inAmount,
          outAmount: quote.outAmount,
          priceImpact: quote.priceImpactPct * 100,
          txHash: tx || null,
          success: !!tx
        };

        logTrade(logData);

        if (tx) {
          const explorer = `https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`;
          console.log(`✅ Rebalanced ${fromMint} → ${toMint}: ${explorer}`);
          await sendTelegramMessage(`📐 *Rebalanced*\n[TX](${explorer})`);
          tradeCount++;
          failureCount = 0;
        } else {
          console.log("❌ Swap failed.");
          failureCount++;
          await sendTelegramMessage(`❌ *Rebalance Failed* for ${fromMint} → ${toMint}`);
        }
      } else {
        console.log(`✅ ${token} within target range.`);
      }
    }

    if (tradeCount === 0) {
      console.log("✅ No rebalance required.");
    }

  } catch (err) {
    failureCount++;
    console.error("❌ Rebalancer Error:", err.message);
    await sendTelegramMessage(`⚠️ *Rebalancer Error*\n${err.message}`);
  }
}

module.exports = rebalancer;




/** Additions
 * Multi-wallet Support
 * - Honeypot Guard
 * - Telegram Alerts
 * - Trade Logging
 * - Configurable tokens
 */

/** Additions 04/17 
 * Feature	Status
targetAllocations	✅ Any token mix
rebalanceThreshold	✅ Prevents unnecessary trades
minTradeSize	✅ Avoids dust rebalancing
dryRun	✅ Supported
maxTradesPerCycle	✅ Respects limit
haltOnFailures	✅ Prevents chaos
.env removed	✅ All config-driven
 */