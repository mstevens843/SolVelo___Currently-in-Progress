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

const { getTokenPriceChange, getTokenBalance } = require("../utils/marketData.js");
const { getSwapQuote, executeSwap } = require("../utils/swap");
const { logTrade, isSafeToBuy, getWallet } = require("./utils");
const { sendTelegramMessage } = require("../telegram/bots");
const { PublicKey } = require("@solana/web3.js");
require("dotenv").config();

//  Parse config from env or parent process
const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");

const TOKENS = botConfig.tokens ?? [
  { symbol: "SOL", mint: "So11111111111111111111111111111111111111112" },
  { symbol: "USDC", mint: "Es9vMFrzaCERx6Cw4pTrA6MuoXovbdFxRoCkB9gfup7w" },
  // Add more tokens as needed
];

const ROTATE_INTERVAL = parseInt(botConfig.interval ?? process.env.ROTATION_INTERVAL ?? "1800000"); // 30 min
const MIN_ROTATION_DELTA = parseFloat(botConfig.threshold ?? process.env.ROTATION_THRESHOLD ?? "0.05"); // 5%
const SLIPPAGE = parseFloat(botConfig.slippage ?? process.env.SLIPPAGE ?? "1.0");
const BASE_MINT = botConfig.baseMint ?? process.env.ROTATION_BASE ?? "So11111111111111111111111111111111111111112"; // e.g. SOL

async function rotationBot() {
  setInterval(async () => {
    console.log(`\n♻️ Rotation Check @ ${new Date().toLocaleTimeString()}`);

    try {
      const wallet = getWallet();
      const ranked = [];

      for (const token of TOKENS) {
        const change = await getTokenPriceChange(new PublicKey(token.mint), 6);
        ranked.push({ ...token, change });
      }

      ranked.sort((a, b) => b.change - a.change);
      const winner = ranked[0];

      console.log(`📈 Top Token: ${winner.symbol} (${(winner.change * 100).toFixed(2)}%)`);

      if (winner.mint === BASE_MINT || winner.change < MIN_ROTATION_DELTA) {
        console.log("✅ No better option. Holding base token.");
        return;
      }

      const baseBalance = await getTokenBalance(wallet.publicKey, BASE_MINT);
      if (!baseBalance || baseBalance <= 0) {
        console.log("❌ No funds in base token. Skipping.");
        return;
      }

      const isSafe = await isSafeToBuy(winner.mint);
      if (!isSafe) {
        console.log("🚫 Winning token failed honeypot check.");
        return;
      }

      const quote = await getSwapQuote({
        inputMint: BASE_MINT,
        outputMint: winner.mint,
        amount: baseBalance * 1e9,
        slippage: SLIPPAGE,
      });

      if (!quote) {
        console.log("❌ No route to rotate.");
        return;
      }

      const tx = await executeSwap({ quote, wallet });

      const logData = {
        timestamp: new Date().toISOString(),
        strategy: "rotationBot",
        inputMint: BASE_MINT,
        outputMint: winner.mint,
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct * 100,
        txHash: tx || null,
        success: !!tx,
      };

      logTrade(logData);

      if (tx) {
        const explorer = `https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`;
        console.log(`✅ Rotated into ${winner.symbol}: ${explorer}`);
        await sendTelegramMessage(`♻️ *Rotation Complete*\nSwapped into *${winner.symbol}*\n[TX](${explorer})`);
      } else {
        console.log("❌ Rotation swap failed.");
        await sendTelegramMessage(`❌ *Rotation Failed* for ${winner.symbol}`);
      }

    } catch (err) {
      console.error("💥 Rotation Error:", err.message);
      await sendTelegramMessage(`⚠️ *Rotation Error:*\n${err.message}`);
    }
  }, ROTATE_INTERVAL);
}

module.exports = rotationBot;


/** additions:
 * Multi-wallet support
 * HoneyPot Check 
 * Telegram Alerts 
 * Trade Logging
 */