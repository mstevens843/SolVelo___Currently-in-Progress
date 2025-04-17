/** Multi-wallet Executor Module 
 * - Loads multiple wallets from a local folder.
 * - Rotates through them using 
 *      - round-robin
 *      - random mode. 
 * - Can be used to run any strategy under multiple identities. 
 * 
 * Configurable: 
 * - Folder: `/wallets`
 * - Wallets: Plain .txts with base58-encoded private keys 1 per file)
 * - Optional ENV: WALLET_ROTATION_MODE = "round" | "random"
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

// Wallet folder path
const WALLET_DIR = path.join(__dirname, "../wallets");
// Rotation Mode
const ROTATION_MODE = process.env.WALLET_ROTATION_MODE || "round"; // or "random"


let walletIndex = 0; // Used fro round-robin cycling

/**
 * 
 * @returns Loads all wallet files from disk 
 * Expeects each .txt file to contain a base58-encoded secret key. 
 */
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
 * Rotate and returns the next wallet
 * - Random mode: picks randomly from wallet pool. 
 * - Round mode: cycles in order. 
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


