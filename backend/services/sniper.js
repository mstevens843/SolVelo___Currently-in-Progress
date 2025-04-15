/** SNIPER MODE
 * - Watches for new tokens appearing on Jupiter (or a dummy feed for now)
 * - Filter out scammy or duplicate tokens (base logic) 
 * - Buys instantly when a fresh mint is detected (your chosen account) 
 */

/** SETUP
 * - Load known tokens from a file or memory
 * - Ping Jupiter token list every 30-60 seconds
 * - Comprare for new tokens
 * - If new token found -> try to snipe with 'swap.js'
 * 
 * Plans for Later: 
 * - Real-time Solana event feeds.
 * - Telegram Alerts and Safety checks. 
 */


const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { getSwapQuote, executeSwap, loadKeypair } = require("../utils/swap");
require("dotenv").config();

const WALLET = loadKeypair();
const TOKENS_FILE = path.join(__dirname, "../db/known_tokens.json");

const TRADE_AMOUNT = parseFloat(process.env.SNIPE_AMOUNT || "0.005"); // in SOL
const SLIPPAGE = parseFloat(process.env.SLIPPAGE || "1.0"); // %
const INPUT_MINT = "So11111111111111111111111111111111111111112"; // SOL

/**
 * Load previously known token mints
 */
function loadKnownTokens() {
  if (!fs.existsSync(TOKENS_FILE)) return [];
  return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf-8"));
}

/**
 * Save updated token list to disk
 */
function saveKnownTokens(tokens) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

/**
 * Fetch all token mints currently on Jupiter
 */
async function fetchTokenList() {
  const response = await axios.get("https://token.jup.ag/all");
  return response.data.map((t) => t.address);
}

/**
 * Attempt to buy a fresh token
 */
async function snipeToken(mint) {
  console.log(`🚨 New Token Detected: ${mint} — Sniping now...`);

  const quote = await getSwapQuote({
    inputMint: INPUT_MINT,
    outputMint: mint,
    amount: TRADE_AMOUNT * 1e9,
    slippage: SLIPPAGE,
  });

  if (!quote) {
    console.warn(`❌ No quote available for ${mint}`);
    return;
  }

  const tx = await executeSwap({ quote, wallet: WALLET });

  if (tx) {
    console.log(`✅ Snipe Success! https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`);
  } else {
    console.log(`❌ Snipe Failed for token: ${mint}`);
  }
}

/**
 * Main sniper loop
 */
async function sniperBot() {
  let knownTokens = loadKnownTokens();

  setInterval(async () => {
    console.log(`\n🔎 Checking Jupiter token list @ ${new Date().toLocaleTimeString()}`);
    try {
      const allTokens = await fetchTokenList();

      const newMints = allTokens.filter((mint) => !knownTokens.includes(mint));

      if (newMints.length) {
        for (const mint of newMints.slice(0, 3)) {
          await snipeToken(mint); // ⚠️ Rapid fire here
        }

        // Update local memory + file
        knownTokens = [...knownTokens, ...newMints];
        saveKnownTokens(knownTokens);
      } else {
        console.log("No new tokens found.");
      }
    } catch (err) {
      console.error("❌ Sniper loop failed:", err.message);
    }
  }, parseInt(process.env.SNIPE_INTERVAL || "45000")); // default every 45s
}

module.exports = sniperBot;


