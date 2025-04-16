import React, { useState, useEffect } from "react";
import ModeSelector from "./components/ModeSelector";
import StartStopControls from "./components/StartStopControls";
import ConfigPanel from "./components/ConfigPanel";
import TradeChart from "./components/TradeChart";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/dashboard.css";

const API_BASE = "http://localhost:5001/api/mode";

const App = () => {
  const [selectedMode, setSelectedMode] = useState(
    () => localStorage.getItem("selectedMode") || ""
  );
  const [running, setRunning] = useState(false);
  const [autoRestart, setAutoRestart] = useState(
    () => JSON.parse(localStorage.getItem("autoRestart")) || false
  );
  const [loading, setLoading] = useState(false);


  // New config state with localStorage
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


  // Temporarily add sample trades with dummmy data to test
  const [trades, setTrades] = useState([
    {
      timestamp: Date.now() - 60000,
      outAmount: 3450000,
      priceImpact: 2.1,
    },
    {
      timestamp: Date.now() - 30000,
      outAmount: 5000000,
      priceImpact: 1.6,
    },
    {
      timestamp: Date.now(),
      outAmount: 4200000,
      priceImpact: 2.8,
    },
  ]);
  


  useEffect(() => {
    localStorage.setItem("botConfig", JSON.stringify(config));
  }, [config]);


  useEffect(() => {
    fetch(`${API_BASE}/status`)
      .then((res) => res.json())
      .then((data) => setRunning(data.running))
      .catch((err) => {
        console.error("Error fetching status:", err);
        toast.error("⚠️ Failed to get bot status.");
      });
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedMode", selectedMode);
  }, [selectedMode]);


  useEffect(() => {
    localStorage.setItem("autoRestart", JSON.stringify(autoRestart));
  }, [autoRestart]);

  const startMode = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" ,
        "x-auto-restart": JSON.stringify(autoRestart),
        }, 
        body: JSON.stringify({ mode: selectedMode, config }),
      });
  
      const data = await res.json();
      if (res.ok) {
        console.log("✅ Started:", data);
        toast.success(`🚀 ${selectedMode} started successfully!`);
        setRunning(true);
      } else {
        toast.error(`❌ ${data.error || "Failed to start strategy."}`);
      }
    } catch (err) {
      console.error("❌ Start error:", err);
      toast.error("❌ Could not start strategy.");
    } finally {
      setLoading(false);
    }
  };
  

  const stopMode = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/stop`, {
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


  

  return (
    <div className="app-container">
      <h1>🚀 Solana Bot Dashboard</h1>

      {/* Active Mode Banner */}
      {running && selectedMode && (
        <div className="active-banner">
          🟢 Active Mode: <strong>{selectedMode}</strong>
        </div>
      )}

      <ConfigPanel config={config} setConfig={setConfig} />


      {/* Mode Selector */}
      <ModeSelector selected={selectedMode} onSelect={setSelectedMode} />

      {/* Start / Stop Controls */}
      <StartStopControls
        selected={selectedMode}
        running={running}
        loading={loading}
        onStart={startMode}
        onStop={stopMode}
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
      <TradeChart trades={trades} />

      <ToastContainer position="bottom-right" theme="dark" autoClose={3000} />
    </div>
  );
};



export default App;
