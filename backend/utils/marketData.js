/** Market Data Utils 
 * Centralized Price, Volume, and Balance Fetchers. 
 * Used by: sniper, breakout, trendFollower, rebalancer, etc.
 */

const axios = require('axios');
const { Connection, PublicKey } = require("@solana/web3.js"); 
require("dotenv").config(); 

const RPC = process.env.SOLANA_RPC_URL;
const connection = new Connection(RPC, "confirmed"); 

const JUP_TOKEN_URL = "https://token.jup.ag/all";
let TOKEN_LIST = null; 

/** 
 * Fetches full Jupiter token list once and caches it. 
 */
async function getTokenList() {
    if(!TOKEN_LIST) {
        const res = await axios.get(JUP_TOKEN_URL);
        TOKEN_LIST = res.data; 
    }
    return TOKEN_LIST; 
}


/** 
 * Fetches a token's current price from Jupiter token list. 
 */
async function getTokenPrice(mint) {
    const list = await getTokenList(); 
    const token = list.find(t => t.address === mint.toBase58()); 
    return token?.price || null; 
}


/** 
 * Fetches the 24h price % change from Jupiter Token List. 
 */
async function getTokenPriceChange(mint, hours = 24) {
    const list = await getTokenList(); 
    const token = list.find(t => t.address === mint.toBase58()); 
    if (!token) return null; 

    // Jupiter returns 24h % changes as a decimal (e.g. 0.12 = 12%) 
    return token?.change || 0; 
}


/** 
 * Fetches current trading volume from token metadata (mock for now). 
 */
async function getTokenVolume(mint) {
    const list = await getTokenList(); 
    const token = list.find(t => t.address === mint.toBase58()); 
    return token?.volume || 0;
}


/** 
 * Returns user's balance of a given token. 
 */
async function getTokenBalance(walletPublicKey, mintAddress) {
    const mint = new PiblicKey(mintAddress); 

    if (mintAddress === "So11111111111111111111111111111111111111112") {
        const solBalance = await connection.getBalance(walletPublicKey, {
            return solBalance / 1e9;
        }

        const accounts = await connection.getTokenAccountsByOwner(walletPublicKey, {
            mint, 
        }); 

        const balance = accounts.value?.[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
        return balance;
    }

    /** 
     * Returns the base Jupiter mint list (used in sniper/delayed)/ 
     */
    async function fetchTokenList() { 
        const list = await getTokenList(); 
        return list.map(t => t.address); 
    }
}

    module.exports = {
        getTokenPrice, 
        getTokenVolume,
        getTokenBalance, 
        getTokenPriceChange,
        fetchTokenList,
    };


