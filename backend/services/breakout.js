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


const { Connection, PublicKey } = require('@solana/web3.js');
const { getTokenPrice, getTokenVolume } = require('../utils/marketData');
const { executeSwap } = require('../utils/swap');
const { loadKeypair } = require('../utils/wallet');
require('dotenv').config();

const connection = new Connection(process.env.SOLANA_RPC_URL);
const wallet = loadKeypair();

const MONITORED_TOKENS = [
  new PublicKey('So11111111111111111111111111111111111111112'), // SOL (example)
  // Add more token mint addresses here
];

const PRICE_THRESHOLD = parseFloat(process.env.BREAKOUT_PRICE_THRESHOLD || '0.05'); // 5% price increase
const VOLUME_THRESHOLD = parseFloat(process.env.BREAKOUT_VOLUME_THRESHOLD || '10000'); // 10k volume

async function monitorBreakouts() {
  for (const tokenMint of MONITORED_TOKENS) {
    try {
      const priceData = await getTokenPrice(tokenMint);
      const volumeData = await getTokenVolume(tokenMint);

      if (!priceData || !volumeData) continue;

      const { currentPrice, previousPrice } = priceData;
      const { currentVolume } = volumeData;

      const priceChange = (currentPrice - previousPrice) / previousPrice;

      if (priceChange >= PRICE_THRESHOLD && currentVolume >= VOLUME_THRESHOLD) {
        console.log(`🚨 Breakout detected for ${tokenMint.toBase58()}`);
        await executeSwap({
          inputMint: process.env.BREAKOUT_INPUT_MINT || 'So11111111111111111111111111111111111111112',
          outputMint: tokenMint.toBase58(),
          amount: parseFloat(process.env.BREAKOUT_TRADE_AMOUNT || '0.01') * 1e9,
          slippage: parseFloat(process.env.SLIPPAGE || '1.0'),
          wallet
        });
      }
    } catch (err) {
      console.error(`❌ Error monitoring token ${tokenMint.toBase58()}:`, err.message);
    }
  }

  setTimeout(monitorBreakouts, parseInt(process.env.BREAKOUT_INTERVAL || '60000')); // every 60s
}

module.exports = monitorBreakouts;