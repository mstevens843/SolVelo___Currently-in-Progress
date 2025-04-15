const connection = require('./config/rpc'); 
const loadKeypair = require('./utils/wallet'); 

(async () => {
    try {
        const wallet = loadKeypair();
        const ballance = await connection.getBalance(wallet.publicKey);
        console.log(`Wallet ${wallet.publicKey.toBase58()}`);
        console.log(`Balance: ${balance / 1e9} SOL`); 
    } catch(err) {
        console.error('Error loading wallet or fetching balance:', err)
    }
})();


// backend/index.js
const strategies = require('./services');

const mode = process.argv[2]; // e.g. "scalper", "sniper", "breakout"

if (!mode || !strategies[mode]) {
  console.error(`❌ Invalid mode: ${mode}`);
  console.log(`✅ Available modes: ${Object.keys(strategies).join(', ')}`);
  process.exit(1);
}

console.log(`🚀 Starting ${mode} strategy...`);
strategies[mode]();