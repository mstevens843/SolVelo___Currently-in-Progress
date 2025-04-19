/** Trend Follower Strategy Module 
 * - Identifies upward-trending tokens and enters when a token sustains gains. 
 * - Ideal for slower (6h/24h break) 
 * 
 * Detection logic: 
 * - Token must be up x% over last N hours 
 * - Optionally requires volume confrmation 
 * 
 * Configurable: 
 * - Gain Threshold
 * - Volume Threshold
 * - Token List
 * 
 * 
 * Eventually Support: 
 * - EMA crossover detection
 * - Trend continuation Filters
 * - Hold timer or trailing stop logic. 
 */


const { getTokenPriceChange, getTokenVolume } = require("../../utils/marketData.js");
const { getSwapQuote, executeSwap } = require("../../utils/swap.js");
const { logTrade, isSafeToBuy, getWallet, getWalletBalance, loadWalletsFromArray } = require("../utils/index.js");
const { sendTelegramMessage } = require("../../telegram/bots.js");
const { PublicKey } = require("@solana/web3.js");
require("dotenv").config();

// Parse config from env or parent process
const botConfig = JSON.parse(process.env.BOT_CONFIG || "{}");

const MONITORED_TOKENS = (botConfig.tokens || []).map((mint) => new PublicKey(mint));
const TREND_THRESHOLD = parseFloat(botConfig.threshold ?? 0.06);
const TRADE_AMOUNT = parseFloat(botConfig.tradeAmount ?? 0.01) * 1e9;
const SLIPPAGE = parseFloat(botConfig.slippage ?? 0.005);
const SCAN_INTERVAL = parseInt(botConfig.interval ?? 600000);
const BASE_MINT = botConfig.inputMint || "So11111111111111111111111111111111111111112";
const TAKE_PROFIT = parseFloat(botConfig.takeProfit ?? 0.15);
const STOP_LOSS = parseFloat(botConfig.stopLoss ?? 0.05);
const MAX_OPEN_TRADES = parseInt(botConfig.maxOpenTrades ?? 3);
const TREND_WINDOW = parseInt(botConfig.trendWindow ?? 6);
const CONFIRMATION_CANDLES = parseInt(botConfig.confirmationCandles ?? 3);

// Future: Track live trades
let openTrades = [];

async function trendFollowerBot() {
    setInterval(async () => {
      console.log(`\n📈 Trend Follower Tick @ ${new Date().toLocaleTimeString()}`);
  
      if (openTrades.length >= MAX_OPEN_TRADES) {
        console.log(`⚠️ Max open trades (${MAX_OPEN_TRADES}) reached. Skipping cycle.`);
        return;
      }
  
      for (const token of MONITORED_TOKENS) {
        const tokenMint = token.toBase58();
  
        try {
          const priceChange = await getTokenPriceChange(token, TREND_WINDOW);
          const volume = await getTokenVolume(token);
  
          if (!priceChange || priceChange < TREND_THRESHOLD) {
            console.log(`📉 ${tokenMint} below trend threshold (${(priceChange * 100).toFixed(2)}%)`);
            continue;
          }
  
          // TODO: Implement confirmationCandles logic (stub for now)
          if (CONFIRMATION_CANDLES > 1) {
            console.log(`🕯️ Confirmation required: ${CONFIRMATION_CANDLES} candles — not yet implemented`);
          }
  
          const isSafe = await isSafeToBuy(tokenMint);
          if (!isSafe) {
            console.log("🚫 Token failed honeypot test. Skipping.");
            continue;
          }
  
          if (Array.isArray(botConfig.wallets)) {
                loadWalletsFromArray(botConfig.wallets);
              }
          
          const wallet = getCurrentWallet(); // ✅ now safe to get active wallet
          const balance = await getWalletBalance(wallet);
          const MIN_BALANCE = 0.02;

          if (balance < MIN_BALANCE) {
            console.log(`⚠️ Wallet balance too low (${balance}). Skipping ${tokenMint}.`);
            continue;
}
  
          const quote = await getSwapQuote({
            inputMint: BASE_MINT,
            outputMint: tokenMint,
            amount: TRADE_AMOUNT,
            slippage: SLIPPAGE,
          });
  
          if (!quote) {
            console.warn("⚠️ No route available. Skipping.");
            continue;
          }
  
          const tx = await executeSwap({ quote, wallet });
  
          const logData = {
            timestamp: new Date().toISOString(),
            strategy: "trendFollower",
            inputMint: BASE_MINT,
            outputMint: tokenMint,
            inAmount: quote.inAmount,
            outAmount: quote.outAmount,
            priceImpact: quote.priceImpactPct * 100,
            txHash: tx || null,
            success: !!tx,
            takeProfit: TAKE_PROFIT,
            stopLoss: STOP_LOSS
          };
  
          logTrade(logData);
  
          if (tx) {
            openTrades.push({
              token: tokenMint,
              entryPrice: quote.outAmount / quote.inAmount,
              timestamp: Date.now(),
              tx
            });
  
            const explorer = `https://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`;
            console.log(`✅ Trend Buy: ${explorer}`);
            await sendTelegramMessage(`📈 *Trend Buy Executed*\nToken: \`${tokenMint}\`\n[TX Link](${explorer})`);
          } else {
            console.log("❌ Trade failed.");
            await sendTelegramMessage(`❌ *Trend Buy Failed* for ${tokenMint}`);
          }
  
          // One trade per cycle for now
          break;
        } catch (err) {
          console.error(`❌ Error for ${tokenMint}:`, err.message);
          await sendTelegramMessage(`⚠️ *Trend Bot Error*\n${tokenMint}: ${err.message}`);
        }
      }
    }, SCAN_INTERVAL);
  }
  
  module.exports = trendFollowerBot;

/** Additions:
 * - Multi-wallet Protection - getWallet()
 * - Honeypot check - isSafetoBuy()
 * - Trade logging - logTrade()
 * - Telegram alerts - for success/failure
 * - Price change filter - already present 
 */

/** Additions 04/17
 * trendWindow: used in price chamge check. 
 * confirmationCandles - can be implemented later using candle history 
 * take profit / stop loss - executopm logic coming later
 * .env fallbacks - removed, only config-driven now. */