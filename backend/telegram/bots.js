/**Telegram Bot Utility 
 * - Sends alerts via Telegram bot to your chat or channel. 
 * = Use it to notify you of trades, errors, or sysstem logs. 
 * 
 * Setup: 
 * 1. Createa Teelgram bot: https://t.me./BotFather
 * 2. Get your Bot Token and your rtelegram user ID
 * 3. Add them to .env
 * # Telegram Alerts (errors, trades, status)
 */


const axios = require('axios');
require("dotenv").config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.warn("⚠️ Telegram bot not fully configured in .env");
}

async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error("❌ Failed to send Telegram message:", err.message);
  }
}

module.exports = { sendTelegramMessage }