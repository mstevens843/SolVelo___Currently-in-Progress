/** Breakout Strategy Module 
 * - Monitors token price and volume spikes. 
 * - Detects breakout opportunities using thresholds.
 * - Executes swap when breakout conditions are met. 
 * 
 * Configurable: 
 * - Token list to monitor
 * - Price threshold (% increase)
 * - Volume threshold
 * 
 * Eventually Support: 
 * - Timeframe-based candles (e.g. 1m/5m)
 * - Telegram alerts
 * - Multi-token monitoring via dynamic feeds. 
 */


/** Breakout Strategy Module 
 * - Monitors tokens for % price increase + volume spike.
 * - Enters position on breakout signal.
 * 
 * Includes:
 * - Token list config
 * - Honeypot protection
 * - Telegram alerts
 * - Analytics logging
 * - Wallet rotation
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const { getTokenPriceChange, getTokenVolume } = require('../utils/marketData.js');
const { getSwapQuote, executeSwap } = require('../utils/swap');
const { logTrade, isSafeToBuy, getWallet } = require("./utils");
const { sendTelegramMessage } = require('../telegram/bots');
require('dotenv').config();


// Parse bot config (from parent process or fallback)
const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");


const connection = new Connection(process.env.SOLANA_RPC_URL);

const MONITORED_TOKENS = (botConfig.monitoredTokens || [
  'So11111111111111111111111111111111111111112',
]).map((mint) => new PublicKey(mint));
// Add more Mints here if needed. 

const BASE_MINT = process.env.BREAKOUT_INPUT_MINT || "So11111111111111111111111111111111111111112";
const SLIPPAGE = parseFloat(botConfig.slippage ?? process.env.SLIPPAGE ?? "1.0");
const TRADE_AMOUNT = parseFloat(botConfig.tradeAmount ?? process.env.BREAKOUT_TRADE_AMOUNT ?? "0.01") * 1e9;
const PRICE_THRESHOLD = parseFloat(botConfig.priceThreshold ?? process.env.BREAKOUT_PRICE_THRESHOLD ?? "0.05");
const VOLUME_THRESHOLD = parseFloat(botConfig.volumeThreshold ?? process.env.BREAKOUT_VOLUME_THRESHOLD ?? "10000");
const SCAN_INTERVAL = parseInt(botConfig.interval ?? process.env.BREAKOUT_INTERVAL ?? "60000");

async function monitorBreakouts() {
  console.log(`\n📈 Breakout Check @ ${new Date().toLocaleTimeString()}`);

  for (const tokenMint of MONITORED_TOKENS) {
    try {
      const mint = tokenMint.toBase58();

      const priceChange = await getTokenPriceChange(tokenMint, 6); // past 6h
      const volume = await getTokenVolume(tokenMint);

      if (!priceChange || !volume) continue;

      console.log(`Token ${mint} → ΔPrice: ${(priceChange * 100).toFixed(2)}%, Volume: ${volume}`);

      if (priceChange >= PRICE_THRESHOLD && volume >= VOLUME_THRESHOLD) {
        console.log(`🚨 Breakout detected for ${mint}!`);

        const isSafe = await isSafeToBuy(mint);
        if (!isSafe) {
          console.log(`🚫 ${mint} failed honeypot check`);
          continue;
        }

        const wallet = getWallet();
        const quote = await getSwapQuote({
          inputMint: BASE_MINT,
          outputMint: mint,
          amount: TRADE_AMOUNT,
          slippage: SLIPPAGE,
        });

        if (!quote) {
          console.warn(`⚠️ No swap route available for ${mint}`);
          continue;
        }

        const tx = await executeSwap({ quote, wallet });

        const logData = {
          timestamp: new Date().toISOString(),
          strategy: "breakout",
          inputMint: BASE_MINT,
          outputMint: mint,
          inAmount: quote.inAmount,
          outAmount: quote.outAmount,
          priceImpact: quote.priceImpactPct * 100,
          txHash: tx || null,
          success: !!tx,
        };

        logTrade(logData);

        if (tx) {
          const explorer = `https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`;
          console.log(`✅ Breakout Trade Success: ${explorer}`);
          await sendTelegramMessage(`📈 *Breakout Trade*\n[TX](${explorer})`);
        } else {
          await sendTelegramMessage(`❌ *Breakout swap failed* for ${mint}`);
        }
      }
    } catch (err) {
      console.error(`❌ Error scanning token ${tokenMint.toBase58()}:`, err.message);
      await sendTelegramMessage(`⚠️ *Breakout Error for ${tokenMint.toBase58()}:*\n${err.message}`);
    }
  }

  setTimeout(monitorBreakouts, SCAN_INTERVAL);
}

module.exports = monitorBreakouts;


/** 
 * Additions :
 * - Wallet rotation
 * - Honeypot protection
 * - Telegram alerts
 * - Analytics logging
 * - Flexible config via .env
 * - Better price & volume detection falback
 */