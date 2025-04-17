/** WalletManager.js - Wallet utility for Solana Trading bot platform.
 * 
 * Features: 
 * - Load a single keypair or multiple keypairs from ./wallet
 * - Rotate wallets fro session-based trade distribution. 
 * - Fetch wallet balances. 
 * - Stubbed support for Phantom, Backpack, Solflare (future)
 * 
 * - Used by strategy files that require wallet access and by rotation-based bot logic. 
 */


const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

const connection = new Connection(process.env.SOLANA_RPC_URL);

// internal state
let wallets = [];
let currentIndex = 0;
let currentWallet = null;

/**
 * ✅ Load multiple keypair wallets from disk for rotation mode
 * ✅ Used for rotating wallet strategies. 
 */
function loadAllWallets(folder = "./wallets") {
  const files = fs.readdirSync(folder);
  wallets = files.map((f) => {
    const secret = JSON.parse(fs.readFileSync(path.join(folder, f)));
    return Keypair.fromSecretKey(new Uint8Array(secret));
  });
  currentWallet = wallets[0];
  console.log(`🔐 Loaded ${wallets.length} wallets for rotation`);
  return currentWallet;
}

/**
 * ✅ Rotate to the next wallet (round-robin)
 * ✅ Useful for distributing trades across multiple wallets. 
 */
function rotateWallet() {
  if (wallets.length === 0) throw new Error("No wallets loaded to rotate.");
  currentIndex = (currentIndex + 1) % wallets.length;
  currentWallet = wallets[currentIndex];
  console.log(`🔁 Rotated to wallet #${currentIndex}: ${currentWallet.publicKey.toBase58()}`);
  return currentWallet;
}

/**
 * ✅ Return current active wallet.
 */
function getCurrentWallet() {
  if (!currentWallet) throw new Error("No wallet loaded yet.");
  return currentWallet;
}

/**
 * ✅ Returns the current wallet's balance in SOL. 
 */
async function getWalletBalance(wallet = currentWallet) {
  const pubkey = wallet.publicKey || new PublicKey(wallet);
  const lamports = await connection.getBalance(pubkey);
  return lamports / 1e9;
}

/**
 * ✅ Load walelt from environment or fallback to default keypair. 
 * Supported: keypair (default), phantom, backback, solflare
 */
function loadWallet(provider = process.env.WALLET_PROVIDER || "keypair") {
  switch (provider) {
    case "phantom":
      return loadPhantomWallet();
    case "backpack":
      return loadBackpackWallet();
    case "solflare":
      return loadSolflareWallet();
    case "keypair":
    default:
      return loadKeypairWallet();
  }
}

/**
 * 🔧 Load a single keypair wallet from disk (default)
 */
function loadKeypairWallet() {
  const { loadKeypair } = require("./multiWalletExecutor");
  currentWallet = loadKeypair();
  return currentWallet;
}

/**
 * 🚧 Stubbed wallet rpovider integrations
 * - These can be implemented in the future usigng wallett adapters or browser extensions. 
 */
function loadPhantomWallet() {
  throw new Error("Phantom wallet support not implemented yet");
}

function loadBackpackWallet() {
  throw new Error("Backpack wallet support not implemented yet");
}

function loadSolflareWallet() {
  throw new Error("Solflare wallet support not implemented yet");
}

module.exports = {
  loadWallet,
  loadAllWallets,
  rotateWallet,
  getCurrentWallet,
  getWalletBalance,
};
