/** Multi-wallet Executor Module 
 * - Loads multiple wallets from a local folder.
 * - Rotates through them using round-robin or random mode. 
 * - Can be used to run any strategy under multiple identities. 
 * 
 * Configurable: 
 * - Wallet folder path 
 * 
 * Eventually Support:
 * - PnL tracking per wallet
 * - Rotation limits / bans
 * - GUI wallet assignment per strategy 
 */


const fs = require("fs");
const path = require("path");
const bs58 = require("bs58");
const { Keypair } = require("@solana/web3.js");

const WALLET_DIR = path.join(__dirname, "../wallets");
const ROTATION_MODE = process.env.WALLET_ROTATION_MODE || "round"; // or "random"

let walletIndex = 0;

function loadWallets() {
  if (!fs.existsSync(WALLET_DIR)) {
    console.error("❌ wallets/ folder not found. Please create it and add .txt files with private keys.");
    process.exit(1);
  }

  const files = fs.readdirSync(WALLET_DIR).filter(f => f.endsWith(".txt"));
  if (!files.length) {
    console.error("❌ No wallet files found in /wallets.");
    process.exit(1);
  }

  return files.map(file => {
    const secret = fs.readFileSync(path.join(WALLET_DIR, file), "utf-8").trim();
    return Keypair.fromSecretKey(bs58.decode(secret));
  });
}

const wallets = loadWallets();

/**
 * Rotate to the next wallet (round-robin or random).
 */
function getWallet() {
  if (ROTATION_MODE === "random") {
    const index = Math.floor(Math.random() * wallets.length);
    return wallets[index];
  }

  // Default = round-robin
  const wallet = wallets[walletIndex];
  walletIndex = (walletIndex + 1) % wallets.length;
  return wallet;
}

module.exports = { getWallet, walletCount: wallets.length };


