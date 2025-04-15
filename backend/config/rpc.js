/** Core Trading Logic + API/webhook if needed
 * Solana RPC setup
 */
const { Connection, clusterApiUrl } = require('@solana/web3.js');
require('dotenv').config(); 


const connection = new Connection(
    process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'), 
    'confirmed'
); 


module.exports = connection;
