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

const { getSwapQuote, executeSwap } = require("../utils/swap");
const { sendTelegramMessage } = require("../telegram/bots");
const { logTrade, isSafeToBuy, getWallet } = require("./utils");
require("dotenv").config();

const inputMint = process.env.CHAD_INPUT_MINT || "So11111111111111111111111111111111111111112";
const outputMint = process.env.CHAD_OUTPUT_MINT; // MUST be defined
const amount = parseFloat(process.env.CHAD_AMOUNT || "0.1");
const slippage = parseFloat(process.env.SLIPPAGE || "1.0");
const priorityFeeLamports = parseInt(process.env.CHAD_PRIORITY_FEE || "10000");

const AUTO_SELL_ENABLED = process.env.CHAD_AUTO_SELL === "true";
const AUTO_SELL_DELAY = parseInt(process.env.CHAD_SELL_DELAY || "10000"); // 10s

async function chadMode() {
  if (!outputMint) {
    console.error("❌ CHAD_OUTPUT_MINT not set. Add to .env.");
    return;
  }

  const wallet = getWallet();
  console.log(`\n🚨 CHAD MODE INITIATED — Target: ${outputMint}`);

  try {
    const isSafe = await isSafeToBuy(outputMint);
    if (!isSafe) {
      console.log("🚫 Honeypot check failed. Chad won’t die today.");
      await sendTelegramMessage(`🚫 *Chad skipped unsafe token:* \`${outputMint}\``);
      return;
    }

    const quote = await getSwapQuote({
      inputMint,
      outputMint,
      amount: amount * 1e9,
      slippage,
    });

    if (!quote) {
      console.warn("⚠️ No route available.");
      return;
    }

    quote.prioritizationFeeLamports = priorityFeeLamports;

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
    };

    logTrade(logData);

    if (tx) {
      const explorer = `https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`;
      console.log(`✅ Chad Entry: ${explorer}`);
      await sendTelegramMessage(`✅ *Chad Sniped*\n[TX](${explorer})`);

      if (AUTO_SELL_ENABLED) {
        console.log(`⏳ Waiting ${AUTO_SELL_DELAY / 1000}s before dumping...`);
        setTimeout(async () => {
          try {
            const reverseQuote = await getSwapQuote({
              inputMint: outputMint,
              outputMint: inputMint,
              amount: quote.outAmount,
              slippage,
            });

            if (!reverseQuote) {
              console.log("❌ Reverse route unavailable. Chad is holding.");
              return;
            }

            reverseQuote.prioritizationFeeLamports = priorityFeeLamports;

            const dumpTx = await executeSwap({ quote: reverseQuote, wallet });

            const dumpLog = {
              timestamp: new Date().toISOString(),
              strategy: "chadMode-dump",
              inputMint: outputMint,
              outputMint: inputMint,
              inAmount: reverseQuote.inAmount,
              outAmount: reverseQuote.outAmount,
              priceImpact: reverseQuote.priceImpactPct * 100,
              txHash: dumpTx || null,
              success: !!dumpTx,
            };

            logTrade(dumpLog);

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
            await sendTelegramMessage(`⚠️ *Dump Error:*\n${dumpErr.message}`);
          }
        }, AUTO_SELL_DELAY);
      }
    } else {
      console.log("❌ Entry swap failed.");
      await sendTelegramMessage("❌ *Chad Entry Failed*");
    }
  } catch (err) {
    console.error("🚨 Chad Mode Error:", err.message);
    await sendTelegramMessage(`⚠️ *Chad Mode Error:*\n${err.message}`);
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