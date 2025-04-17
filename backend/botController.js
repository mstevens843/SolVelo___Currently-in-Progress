/** botController.js - CLI entry point for launching trading strategies. 
 * 
 * Features: 
 * - Accepts command-line args for strategy mode and config path. 
 * - Loads and parses the specified JSON config file. 
 * - Injects config into `process.env.BOT_CONFIG` for global access. 
 * - Dynamically imports the correct strategy file from `/strategies`
 * - Executes the strategy via async wrapper (suppeorts await/async ops)
 * 
 * Usage: 
 * node botController.js --mode sniper --config ./configs/sniper.json
 * - Used as the standalone bot launcher from CLI or programmatic shelle execution. 
 */
const minimist = require('minimist');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

(async () => {
  // Parse CLI args like --mode sniper --config ./configs/sniper.json
  const args = minimist(process.argv.slice(2));
  const mode = args.mode;
  const configPath = args.config;

  // Exit early if required args are missing 
  if (!mode || !configPath) {
    console.error("❌ Usage: node botController.js --mode sniper --config ./configs/sniper.json");
    process.exit(1);
  }

  // Load strategy config from JSON file. 
  let botConfig;
  try {
    const raw = fs.readFileSync(path.resolve(configPath), 'utf-8');
    botConfig = JSON.parse(raw);

    // Inject config into process.env for use accross bot services 
    process.env.BOT_CONFIG = JSON.stringify(botConfig);
  } catch (err) {
    console.error("❌ Failed to load config:", err.message);
    process.exit(1);
  }

  // Inform which mode is launching
  console.log(`🚀 Launching ${mode.toUpperCase()} mode...`);

  // Dynamically import and and execute selected strategy 
  try {
    const strategyPath = `./strategies/${mode}.js`;
    const strategy = require(strategyPath);
    
    // Execite the strategy 
    await strategy();
  } catch (err) {
    console.error("💥 Failed to run strategy:", err.message);
    process.exit(1);
  }
})();