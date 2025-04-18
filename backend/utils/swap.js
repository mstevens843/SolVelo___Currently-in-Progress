/** Swap.js - Core Swap Execution + quote retrieval utility
 * 
 * Features: 
 * - Fetch swap quote from Jupiter Aggregator
 * - Execute swap via Jupiter's smart routing API
 * - Supports legacy and versioned Solana transactions
 * - Used by all trading strategies to perform real token swaps
 * - Loads wallet from env or strategy context 
 */

const axios = require("axios");
const { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } = require("@solana/web3.js");
const bs58 = require("bs58");
require("dotenv").config();

const RPC_URL = process.env.SOLANA_RPC_URL;
const connection = new Connection(RPC_URL, "confirmed");

const JUPITER_QUOTE_URL = "https://api.jup.ag/swap/v1/quote";
const JUPITER_SWAP_URL = "https://api.jup.ag/swap/v1/swap";

/**
 * Load keypair from PRIVATE_KEY ub .env
 * This is the primary trading wallet used for all transacitons; 
 */
function loadKeypair() {
  if (!process.env.PRIVATE_KEY) throw new Error("Missing PRIVATE_KEY in .env");
  const secret = bs58.decode(process.env.PRIVATE_KEY.trim());
  return Keypair.fromSecretKey(secret);
}

/**
 * GET swap quote using a Juptier API 
 * Params: 
 * - inputMint: from token mint address
 * - outputMint: to a token mint address
 * - amount: input amount in atomic (lamports, u64)
 * - slippage: allowed slippage % (e.g. 1.0 for 1%) 
 */
async function getSwapQuote({ inputMint, outputMint, amount, slippage }) {
  try {
    const params = {
      inputMint,
      outputMint,
      amount, // atomic units (e.g. 0.01 SOL = 0.01 * 10^9)
      slippageBps: slippage * 100, // 1% = 100 bps
      swapMode: "ExactIn"
    };

    const response = await axios.get(JUPITER_QUOTE_URL, { params });
    return response.data[0] || null;
  } catch (err) {
    console.error("❌ Error fetching Jupiter quote:", err.message);
    return null;
  }
}

/**
 * Execute a swap based on the provided Jupiter quote
 * - Signs and sends transactions to Solana via Jupiter's API. 
 */
async function executeSwap({ quote, wallet }) {
  try {
    const payload = {
      quoteResponse: quote,
      userPublicKey: wallet.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      useSharedAccounts: true,
      asLegacyTransaction: false,
      useTokenLedger: false,
      dynamicComputeUnitLimit: true,
      skipUserAccountsRpcCalls: true,
      dynamicSlippage: true,
      prioritizationFeeLamports: 0
    };

    const res = await axios.post(JUPITER_SWAP_URL, payload);
    const { swapTransaction, lastValidBlockHeight } = res.data;

    const transactionBuffer = Buffer.from(swapTransaction, "base64");

    let transaction;
    try {
      transaction = VersionedTransaction.deserialize(transactionBuffer);
    } catch (e) {
      console.warn("⚠️ Failed to deserialize as VersionedTransaction, using legacy.");
      transaction = Transaction.from(transactionBuffer);
    }

    transaction.sign([wallet]);
    const serialized = transaction.serialize();
    const signature = await connection.sendRawTransaction(serialized);
    console.log("📤 Sent transaction:", signature);

    await connection.confirmTransaction({ signature, lastValidBlockHeight }, "processed");

    console.log("✅ Swap confirmed:", `https://explorer.solana.com/tx/${signature}?cluster=mainnet-beta`);
    return signature;
  } catch (err) {
    console.error("❌ Swap failed:", err.message);
    return null;
  }
}

/**
 * Entry point if run directly. 
 * If run directly, fetch and execute a test swap for manual debugging. 
 */
if (require.main === module) {
  (async () => {
    const wallet = loadKeypair();

    const quote = await getSwapQuote({
      inputMint: "So11111111111111111111111111111111111111112", // SOL
      outputMint: "Es9vMFrzaCERx6Cw4pTrA6MuoXovbdFxRoCkB9gfup7w", // USDC
      amount: 0.01 * 1e9,
      slippage: 1.0,
    });

    if (!quote) {
      console.log("No route available.");
      return;
    }

    console.log("🔁 Quote preview:", {
      inAmount: quote.inAmount,
      outAmount: quote.outAmount,
      impact: quote.priceImpactPct,
    });

    const tx = await executeSwap({ quote, wallet });

    if (!tx) console.log("Swap failed or was skipped.");
  })();
}

module.exports = { getSwapQuote, executeSwap, loadKeypair };
