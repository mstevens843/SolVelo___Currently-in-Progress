/**
 * - Checks a token before buying it to avoid scams or illiquid pools. 
 * - Simulates a swap using Jupiter and enforeces basic safety rules. 
 * 
 * Used To Simulate a small swap to detect: 
 * - Abnormally high price impact (low liquidity or scam token) 
 * - Insufficient output received (malformed or malicious)
 * 
 * - If a tokden fails this checked, it is skipped during execution. 
 * 
 * Prevents: 
 * - Zero Liquidity
 * - High price impact (slippage traps)
 * - Unknown Mints
 * 
 * Configurable: 
 * - min liquidity threshoold
 * - max acceptance price impact %
 */

const { getSwapQuote } = require("../../utils/swap");
require("dotenv").config();

// Constants pulled from .env or fallback defaults. 
const BASE_MINT = process.env.INPUT_MINT || "So11111111111111111111111111111111111111112";
const SLIPPAGE = parseFloat(process.env.SLIPPAGE || "1.0");
const SIMULATE_AMOUNT = parseFloat(process.env.HONEYPOT_CHECK_AMOUNT || "0.005") * 1e9;
const MAX_IMPACT = parseFloat(process.env.HONEYPOT_MAX_IMPACT || "5.0"); // percent
const MIN_EXPECTED_OUTPUT = parseFloat(process.env.HONEYPOT_MIN_RECEIVED || "5"); // 5 USDC or whatever


/** 
 * Performs a simulated swap to test whether a token is safe to buy. 
 * @param {string} outputMint - token mint address you're buying. 
 * @returns {boolean} - true if the token passes impact and output threholds. 
 */


async function isSafeToBuy(outputMint) { // honeypotguard = basically = issafetobuy
  try {
    const quote = await getSwapQuote({
      inputMint: BASE_MINT,
      outputMint,
      amount: SIMULATE_AMOUNT,
      slippage: SLIPPAGE,
    });

    if (!quote) {
      console.warn(`❌ No route found for ${outputMint}`);
      return false;
    }

    const impact = quote.priceImpactPct * 100;
    const out = quote.outAmount / 1e6;

    if (impact > MAX_IMPACT) {
      console.warn(`⚠️ High price impact: ${impact.toFixed(2)}% — likely illiquid`);
      return false;
    }

    if (out < MIN_EXPECTED_OUTPUT) {
      console.warn(`⚠️ Output too low: ${out.toFixed(2)} — pool may be broken`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("❌ Honeypot guard error:", err.message);
    return false;
  }
}

module.exports = { isSafeToBuy };