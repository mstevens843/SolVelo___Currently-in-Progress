/** Main Frontend Dashboard for Solana Trading Bot 
 * 
 * Features: 
 * - Central hun to start/stop strategies, configure settings, and view bot activity. 
 * - Supports real-tiem trade history, portfolio tracking. 
 * - Pulls trade data and daily recap from backend via REST API 
 * - Saves config, mode, and restart prefs to localStorage for persistence 
 * - Toast notifications for all major actions (start, stop, errors, etc.)
 * - Toggle between Portfolio and Trade charts
 * - Export Trades to CSV and reset logs directly from UI. 
 * 
 * - This file is the heart of the frontend: connects UI + bot control logic 
 */

import React, { useState, useEffect } from "react";
import ModeSelector from "./components/ModeSelector";
import StartStopControls from "./components/StartStopControls";
import ConfigPanel from "./components/ConfigPanel";
import TradeChart from "./components/TradeChart";
import PortfolioChart from "./components/PortfolioChart";
import HistoryPanel from "./components/HistoryPanel";
import WalletLoader from "./components/WalletLoader";
import TokenSelector from "./components/TokenSelector";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/dashboard.css";


const App = () => {
  const [selectedMode, setSelectedMode] = useState(
    () => localStorage.getItem("selectedMode") || ""
  );
  const [running, setRunning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [autoRestart, setAutoRestart] = useState(
    () => JSON.parse(localStorage.getItem("autoRestart")) || false
  );
  const [loading, setLoading] = useState(false);

  const [chartMode, setChartMode] = useState("trades");
  const [recap, setRecap] = useState(null);
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [wallets, setWallets] = useState([]);
  const [activeWallet, setActiveWallet] = useState(null);

  const [targetToken, setTargetToken] = useState(() => {
    return localStorage.getItem("targetToken") || null;
  });
  const [selectedWallets, setSelectedWallets] = useState(() => {
    const stored = localStorage.getItem("selectedWallets");
    return stored ? JSON.parse(stored) : [];
  });




  // Config state saved to localStorage
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem("botConfig");
    return saved
      ? JSON.parse(saved)
      : {
          slippage: 0.5,
          interval: 3000,
          maxTrades: 3,
        };
  });


  const [trades, setTrades] = useState([]);
  // Temporarily add sample trades with dummmy data to test
  // const [trades, setTrades] = useState([
  //   {
  //     timestamp: Date.now() - 60000,
  //     outAmount: 3450000,
  //     priceImpact: 2.1,
  //   },
  //   {
  //     timestamp: Date.now() - 30000,
  //     outAmount: 5000000,
  //     priceImpact: 1.6,
  //   },
  //   {
  //     timestamp: Date.now(),
  //     outAmount: 4200000,
  //     priceImpact: 2.8,
  //   },
  // ]);
  
// Fetch trade data on initial load
useEffect(() => {
  fetch(`${import.meta.env.VITE_API_BASE_URL}/api/trades`)
  .then((res) => res.json())
    .then((data) => {
      setTrades(data);
      fetchRecap(); // update recap after trades load. 
    })
    .catch((err) => {
      console.error("❌ Trade fetch error:", err);
      toast.error("⚠️ Failed to load trade data.");
    });
}, []);


// Fetch recap separately on mount 
useEffect(() => {
  fetch(`${import.meta.env.VITE_API_BASE_URL}/api/trades/recap`)
  .then(res => res.json())
    .then(data => setRecap(data))
    .catch(err => {
      console.error("❌ Recap fetch error:", err);
      toast.error("⚠️ Failed to load recap data.");
    });
}, []);

  // Save bot config to localStorage
  useEffect(() => {
    localStorage.setItem("botConfig", JSON.stringify(config));
  }, [config]);

  // Get bot status (running or not)
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/mode/status`)
    .then((res) => res.json())
      .then((data) => setRunning(data.running))
      .catch((err) => {
        console.error("Error fetching status:", err);
        toast.error("⚠️ Failed to get bot status.");
      });
  }, []);

  // Persist Selected Mode
  useEffect(() => {
    localStorage.setItem("selectedMode", selectedMode);
  }, [selectedMode]);

  // ⛔ Reset confirmation if config or strategy changes
  useEffect(() => {
    setConfirmed(false);
  }, [config, selectedMode]);

  // Persist auto-restart toggle
  useEffect(() => {
    localStorage.setItem("autoRestart", JSON.stringify(autoRestart));
  }, [autoRestart]);

  /**
   * startMode - launches strategy with current config and mode. 
   */
  const startMode = async () => {
    setLoading(true);
  
    // 🟡 Sniper mode needs a token
    if (selectedMode === "sniper" && !targetToken) {
      toast.warn("🎯 Sniper mode requires a target token.");
      setLoading(false);
      return;
    }
  
    // 🔁 Rotation Bot needs 2+ wallets
    if (selectedMode === "rotationBot" && selectedWallets.length < 2) {
      toast.warn("🔁 Rotation Bot requires at least two wallets.");
      setLoading(false);
      return;
    }
  
    // 🚫 All other modes allow only 1 wallet
    const singleWalletModes = [
      "sniper",
      "scalper",
      "breakout",
      "chadMode",
      "dipBuyer",
      "delayedSniper",
      "trendFollower",
      "rebalancer",
      "paperTrader",
    ];
  
    if (singleWalletModes.includes(selectedMode) && selectedWallets.length > 1) {
      toast.warn(`🚫 ${selectedMode} allows only one selected wallet.`);
      setLoading(false);
      return;
    }
  
    // 🔑 No wallets selected at all
    if (!selectedWallets.length) {
      toast.warn("🔑 Please select at least one wallet to use.");
      setLoading(false);
      return;
    }
  
    try {
      const finalConfig = {
        ...config,
        inputMint: selectedWallets[0], // Always use first one
        monitoredTokens: targetToken ? [targetToken] : [],
        wallets: selectedWallets,
        // wallets: selectedWallets.map(w => w.replace(/^"|"$/g, "")), // <-- strip extra quotes
      };
  
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/mode/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auto-restart": JSON.stringify(autoRestart),
        },
        body: JSON.stringify({ mode: selectedMode, config: finalConfig }),
      });
  
      const data = await res.json();
      if (res.ok) {
        toast.success(`🚀 ${selectedMode} started.`);
        setRunning(true);
      } else {
        toast.error(`❌ ${data.error || "Failed to start."}`);
      }
    } catch (err) {
      toast.error("❌ Could not start strategy.");
    } finally {
      setLoading(false);
    }
  };
  
  
  // stopMode - halts the bot
  const stopMode = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/mode/stop`, {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok) {
        console.log("🛑 Stopped:", data);
        toast.warn("🛑 Strategy stopped.");
        setRunning(false);
      } else {
        toast.error(`❌ ${data.error || "Failed to stop strategy."}`);
      }
    } catch (err) {
      console.error("❌ Stop error:", err);
      toast.error("❌ Could not stop strategy.");
    } finally {
      setLoading(false)
    }
  };

  // fetchRecap - re-fetch daily summary data
  const fetchRecap = () => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/trades/recap`)
      .then(res => res.json())
      .then(setRecap)
      .catch(err => {
        console.error("❌ Recap fetch error:", err);
        toast.error("⚠️ Failed to load recap data.");
      });
  };


  // Apply strategy filter to trades 
  const visibleTrades = strategyFilter === "all"
  ? trades
  : trades.filter((t) => t.strategy === strategyFilter);

  useEffect(() => {
    setSelectedWallets(["default"]);
  }, []);
  

  return (
    <div className="app-container">
      <h1>🚀 Solana Bot Dashboard</h1>


      {/* Active Mode Banner */}
      {running && selectedMode && (
        <div className="active-banner">
          🟢 Active Mode: <strong>{selectedMode}</strong>
        </div>
      )}

        <WalletLoader
          onWalletLoaded={() => {}}
          onSelectionChange={(wallets) => setSelectedWallets(wallets)}
        />
    <TokenSelector
      onMintSelected={(mint) => {
        console.log("🔥 Token selected:", mint);
        localStorage.setItem("targetToken", mint);
        setTargetToken(mint);
      }}
    />
      {targetToken && (
        <p className="selected-token-info">
          🎯 Target Token: <strong>{targetToken.slice(0, 6)}...{targetToken.slice(-4)}</strong>
        </p>
      )}
      <ConfigPanel config={config} setConfig={setConfig} disabled={running} />


      {/* Mode Selector */}
      <ModeSelector selected={selectedMode} onSelect={setSelectedMode} disabled={running} />

      {selectedWallets.length === 1 && selectedMode !== "rotationBot" && (
        <p className="selected-wallet-info">
          ✅ Using wallet: <strong>{selectedWallets[0].slice(0, 6)}...{selectedWallets[0].slice(-4)}</strong>
        </p>
      )}

      {wallets.length > 1 && (
      <div className="wallet-switcher">
        <label className="text-white text-sm mr-2">🎛️ Active Wallet:</label>
        <select
          value={activeWallet?.publicKey.toBase58() || ""}
          onChange={(e) =>
            setActiveWallet(wallets.find((w) => w.publicKey.toBase58() === e.target.value))
          }
        >
          {wallets.map((w) => (
            <option key={w.publicKey.toBase58()} value={w.publicKey.toBase58()}>
              {w.publicKey.toBase58()}
            </option>
          ))}
        </select>
      </div>
    )}

      
      {/* Start / Stop Controls */}
      <StartStopControls
        selected={selectedMode}
        running={running}
        loading={loading}
        onStart={startMode}
        onStop={stopMode}
        // disabled={!confirmed}
      />

      {/* Auto-Restart Toggle */}
      <div className="auto-restart-toggle">
        <label>
          <input
            type="checkbox"
            checked={autoRestart}
            onChange={(e) => setAutoRestart(e.target.checked)}
          />
          🔁 Auto-Restart Bot if Crashed
        </label>
      </div>

      
      {/* Daily Recap Panel */}
      {recap && (
        <div className="recap-panel">
          <h3>📅 Daily Performance Recap ({recap.date})</h3>
          <ul>
            <li>Total Trades: {recap.totalTrades}</li>
            <li>✅ Successful: {recap.successfulTrades}</li>
            <li>❌ Failed: {recap.failedTrades}</li>
            <li>📈 Net PnL: {recap.totalPnL.toFixed(2)}%</li>
            {recap.bestTrade && (
              <li>🏆 Best: {recap.bestTrade.outputMint.slice(0, 4)}… @ {recap.bestTrade.gainLossPct.toFixed(2)}%</li>
            )}
            {recap.worstTrade && (
              <li>💀 Worst: {recap.worstTrade.outputMint.slice(0, 4)}… @ {recap.worstTrade.gainLossPct.toFixed(2)}%</li>
            )}
          </ul>
        </div>
      )}
      <button onClick={fetchRecap} className="refresh-recap-btn">
        🔄 Refresh Recap
      </button>



      {/* Chart Type Selector */}
      <div className="chart-toggle">
        <label>
          📊 Chart Type:
          <select value={chartMode} onChange={(e) => setChartMode(e.target.value)}>
            <option value="trades">📈 Trade Volume</option>
            <option value="portfolio">💼 Portfolio Curve</option>
          </select>
        </label>
      </div>


      {/* <div className="sticky top-0 bg-[#0e0e0e] z-50 p-2 mb-2 shadow-md"> */}
      <div className="sticky"> 
        <label>
          🎯 Strategy Filter:
          <select
            value={strategyFilter}
            onChange={(e) => setStrategyFilter(e.target.value)}
            style={{ marginLeft: "8px" }}
          >
            <option value="all">All</option>
            <option value="scalper">Scalper</option>
            <option value="sniper">Sniper</option>
            <option value="breakout">Breakout</option>
            <option value="chadMode">Chad Mode</option>
            <option value="dipBuyer">Dip Buyer</option>
            <option value="delayedSniper">Delayed Sniper</option>
            <option value="trendFollower">Trend Follower</option>
            <option value="rotationBot">Rotation Bot</option>
            <option value="rebalancer">Rebalancer</option>
            <option value="paperTrader">Paper Trader</option>
          </select>
        </label>
      </div>
            
      {/* Export CSV Button */}
      <div className="csv-export">
        <button
          onClick={() =>
            window.open((`${import.meta.env.VITE_API_BASE_URL}/api/trades/download`), "_blank")
          }
        >
          📤 Export Trades CSV
        </button>
      </div>

      {/* Reset Logs Button */}
      <div className="reset-logs">
        <button
          onClick={() => {
            const confirmReset = window.confirm("🧹 Are you sure you want to clear all trade logs?");
            if (!confirmReset) return;

            fetch(`${import.meta.env.VITE_API_BASE_URL}/api/trades/reset`, {
              method: "POST",
            })
              .then((res) => res.json())
              .then((data) => {
                toast.success("🧹 All logs cleared.");
                setTrades([]);
                setRecap(null);
              })
              .catch((err) => {
                console.error("❌ Reset failed:", err);
                toast.error("❌ Failed to clear logs.");
              });
          }}
        >
          🧹 Clear All Logs
        </button>
      </div>


      {chartMode === "trades" ? (
        <TradeChart trades={trades} />
      ) : (
        <PortfolioChart />
      )}

      {/* 📚 Full Trade History Table */}
      <HistoryPanel />

      <ToastContainer position="bottom-right" theme="dark" autoClose={3000} />
    </div>
  );
};



export default App;
