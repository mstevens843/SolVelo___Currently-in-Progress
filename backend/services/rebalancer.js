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


const { getTokenBalance, getTokenPrice } = require("../utils/marketData");
const { getSwapQuote, executeSwap } = require("../utils/swap");
const { logTrade, isSafeToBuy, getWallet } = require("./utils");
const { sendTelegramMessage } = require("../telegram/bots");
const { PublicKey } = require("@solana/web3.js");
require("dotenv").config();

// Parse config from env or parent process
const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");

const SOL = "So11111111111111111111111111111111111111112";
const USDC = "Es9vMFrzaCERx6Cw4pTrA6MuoXovbdFxRoCkB9gfup7w";

// Allow dynamic target allocation via config
const TARGET_ALLOCATION = botConfig.targetAllocation ?? {
  [SOL]: 0.6,
  [USDC]: 0.4,
};

const MIN_REBALANCE_DELTA = parseFloat(botConfig.rebalanceThreshold ?? process.env.REBALANCE_THRESHOLD ?? "0.05");
const SLIPPAGE = parseFloat(botConfig.slippage ?? process.env.SLIPPAGE ?? "1.0");

async function rebalancer() {
  const wallet = getWallet();
  console.log("\n📐 Portfolio Rebalance Check");

  try {
    const [solBalance, usdcBalance] = await Promise.all([
      getTokenBalance(wallet.publicKey, SOL),
      getTokenBalance(wallet.publicKey, USDC),
    ]);

    const [solPrice, usdcPrice] = await Promise.all([
      getTokenPrice(new PublicKey(SOL)),
      getTokenPrice(new PublicKey(USDC)),
    ]);

    const solValue = solBalance * solPrice;
    const usdcValue = usdcBalance * usdcPrice;
    const total = solValue + usdcValue;

    const currentAllocation = {
      [SOL]: solValue / total,
      [USDC]: usdcValue / total,
    };

    console.log(`📊 Current: SOL=${(currentAllocation[SOL]*100).toFixed(2)}% | USDC=${(currentAllocation[USDC]*100).toFixed(2)}%`);

    for (const [token, targetPct] of Object.entries(TARGET_ALLOCATION)) {
      const delta = currentAllocation[token] - targetPct;

      if (Math.abs(delta) >= MIN_REBALANCE_DELTA) {
        const fromMint = delta > 0 ? token : Object.keys(TARGET_ALLOCATION).find(k => k !== token);
        const toMint = delta > 0 ? Object.keys(TARGET_ALLOCATION).find(k => k !== token) : token;

        const fromPrice = fromMint === SOL ? solPrice : usdcPrice;
        const amount = (Math.abs(delta) * total) / fromPrice;

        console.log(`🔁 Rebalancing ${fromMint} → ${toMint} by ${amount.toFixed(4)}`);

        const isSafe = await isSafeToBuy(toMint);
        if (!isSafe) {
          console.log("🚫 Target token failed honeypot check. Skipping.");
          continue;
        }

        const quote = await getSwapQuote({
          inputMint: fromMint,
          outputMint: toMint,
          amount: amount * (fromMint === SOL ? 1e9 : 1e6),
          slippage: SLIPPAGE,
        });

        if (!quote) {
          console.warn("❌ No swap route. Skipping.");
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
          success: !!tx,
        };

        logTrade(logData);

        if (tx) {
          const explorer = `https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`;
          console.log(`✅ Rebalance TX: ${explorer}`);
          await sendTelegramMessage(`📐 *Rebalanced*\n[TX](${explorer})`);
        } else {
          console.log("❌ Swap failed.");
          await sendTelegramMessage(`❌ *Rebalance Failed*`);
        }
      } else {
        console.log("✅ Allocation within target range.");
      }
    }
  } catch (err) {
    console.error("❌ Rebalancer Error:", err.message);
    await sendTelegramMessage(`⚠️ *Rebalance Error:*\n${err.message}`);
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