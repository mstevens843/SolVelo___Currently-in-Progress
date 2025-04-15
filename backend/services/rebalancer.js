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
const { getSwapQuote, executeSwap, loadKeypair } = require("../utils/swap");
const { PublicKey } = require("@solana/web3.js");
require("dotenv").config();

const wallet = loadKeypair();

const SOL = "So11111111111111111111111111111111111111112";
const USDC = "Es9vMFrzaCERx6Cw4pTrA6MuoXovbdFxRoCkB9gfup7w";

const TARGET_ALLOCATION = {
  [SOL]: 0.6,
  [USDC]: 0.4,
};

const MIN_REBALANCE_DELTA = parseFloat(process.env.REBALANCE_THRESHOLD || "0.05"); // 5% deviation

async function rebalancer() {
  console.log("📐 Running portfolio rebalancer...");

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

    console.log(`📊 Current Allocation: SOL=${(currentAllocation[SOL]*100).toFixed(2)}% | USDC=${(currentAllocation[USDC]*100).toFixed(2)}%`);

    for (const [token, targetPct] of Object.entries(TARGET_ALLOCATION)) {
      const delta = currentAllocation[token] - targetPct;

      if (Math.abs(delta) >= MIN_REBALANCE_DELTA) {
        const fromMint = delta > 0 ? token : Object.keys(TARGET_ALLOCATION).find(k => k !== token);
        const toMint = delta > 0 ? Object.keys(TARGET_ALLOCATION).find(k => k !== token) : token;

        const excessValue = Math.abs(delta) * total;
        const amount = excessValue / (fromMint === SOL ? solPrice : usdcPrice);

        console.log(`🔁 Rebalancing: Swap ${amount.toFixed(4)} ${fromMint === SOL ? "SOL" : "USDC"} → ${toMint === SOL ? "SOL" : "USDC"}`);

        const quote = await getSwapQuote({
          inputMint: fromMint,
          outputMint: toMint,
          amount: amount * (fromMint === SOL ? 1e9 : 1e6),
          slippage: parseFloat(process.env.SLIPPAGE || "1.0"),
        });

        if (!quote) {
          console.log("❌ No route available. Skipping.");
          return;
        }

        const tx = await executeSwap({ quote, wallet });
        if (tx) {
          console.log(`✅ Rebalance TX: https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`);
        }
      } else {
        console.log("✅ Allocation within threshold. No action needed.");
      }
    }
  } catch (err) {
    console.error("❌ Rebalancer error:", err.message);
  }
}

module.exports = rebalancer;