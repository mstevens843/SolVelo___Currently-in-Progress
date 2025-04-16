const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

const connection = new Connection(process.env.SOLANA_RPC_URL);

let wallets = [];
let currentIndex = 0;
let currentWallet = null;

/**
 * ✅ Load multiple keypair wallets from disk for rotation mode
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
 */
function rotateWallet() {
  if (wallets.length === 0) throw new Error("No wallets loaded to rotate.");
  currentIndex = (currentIndex + 1) % wallets.length;
  currentWallet = wallets[currentIndex];
  console.log(`🔁 Rotated to wallet #${currentIndex}: ${currentWallet.publicKey.toBase58()}`);
  return currentWallet;
}

/**
 * ✅ Return current wallet (rotation or provider-based)
 */
function getCurrentWallet() {
  if (!currentWallet) throw new Error("No wallet loaded yet.");
  return currentWallet;
}

/**
 * ✅ Return wallet balance in SOL
 */
async function getWalletBalance(wallet = currentWallet) {
  const pubkey = wallet.publicKey || new PublicKey(wallet);
  const lamports = await connection.getBalance(pubkey);
  return lamports / 1e9;
}

/**
 * ✅ Load a specific wallet provider (Phantom, Backpack, etc)
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
 * 🚧 Stubbed provider-based wallet loaders (implement later)
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
