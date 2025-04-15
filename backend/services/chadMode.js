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

const { getSwapQuote, executeSwap, loadKeypair } = require("../utils/swap");
const { Connection } = require("@solana/web3.js");
require("dotenv").config();

const RPC = process.env.SOLANA_RPC_URL;
const connection = new Connection(RPC, "confirmed");
const wallet = loadKeypair();

const inputMint = process.env.CHAD_INPUT_MINT || "So11111111111111111111111111111111111111112";
const outputMint = process.env.CHAD_OUTPUT_MINT; // REQUIRED — new mint you're sniping
const amount = parseFloat(process.env.CHAD_AMOUNT || "0.1"); // Go big
const slippage = parseFloat(process.env.SLIPPAGE || "1.0");
const priorityFeeLamports = parseInt(process.env.CHAD_PRIORITY_FEE || "10000");

const AUTO_SELL_ENABLED = process.env.CHAD_AUTO_SELL === "true";
const AUTO_SELL_DELAY = parseInt(process.env.CHAD_SELL_DELAY || "10000"); // ms

async function chadMode() {
  if (!outputMint) {
    console.error("❌ CHAD_OUTPUT_MINT not set. Add to .env.");
    return;
  }

  console.log(`🚀 CHAD MODE ACTIVATED - Sniping ${outputMint}`);

  try {
    const quote = await getSwapQuote({
      inputMint,
      outputMint,
      amount: amount * 1e9,
      slippage,
    });

    if (!quote) {
      console.log("⚠️ No route available. Aborting.");
      return;
    }

    quote.prioritizationFeeLamports = priorityFeeLamports;

    const tx = await executeSwap({ quote, wallet });

    if (tx) {
      console.log(`✅ CHAD SWAP SENT: https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`);

      if (AUTO_SELL_ENABLED) {
        console.log(`⏳ Waiting ${AUTO_SELL_DELAY / 1000}s to auto-dump...`);
        setTimeout(async () => {
          const reverseQuote = await getSwapQuote({
            inputMint: outputMint,
            outputMint: inputMint,
            amount: quote.outAmount,
            slippage,
          });

          if (!reverseQuote) return console.log("❌ No reverse route. Hold position.");

          reverseQuote.prioritizationFeeLamports = priorityFeeLamports;

          const dumpTx = await executeSwap({ quote: reverseQuote, wallet });

          if (dumpTx) {
            console.log(`💸 Auto-Dump Success: https://explorer.solana.com/tx/${dumpTx}?cluster=mainnet-beta`);
          } else {
            console.log("❌ Auto-dump failed.");
          }
        }, AUTO_SELL_DELAY);
      }
    } else {
      console.log("❌ Swap failed.");
    }
  } catch (err) {
    console.error("🚨 Chad mode error:", err.message);
  }
}

module.exports = chadMode;