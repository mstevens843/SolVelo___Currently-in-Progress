import React, { useState, useEffect } from "react";
import ModeSelector from "./components/ModeSelector";
import LogsConsole from "./components/LogsConsole";
import TradeTable from "./components/TradeTable";
import "./styles/dashboard.css";

const API_BASE = "http://localhost:5001";

const Dashboard = () => {
  const [selectedMode, setSelectedMode] = useState(null);
  const [logs, setLogs] = useState([]);
  const [trades, setTrades] = useState([]);

  const handleModeChange = (mode) => {
    setSelectedMode(mode);
    setLogs((prev) => [...prev, `🚀 Strategy switched to ${mode}`]);
  };

  const handleLogPush = (log) => {
    setLogs((prev) => [...prev.slice(-49), log]);
  };

  // Fetch trades on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/trades`)
      .then((res) => res.json())
      .then((data) => setTrades(data))
      .catch((err) => console.error("❌ Trade fetch error:", err));
  }, []);

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Solana Trading Bot Control Panel</h1>

      <div className="dashboard-grid">
        <div className="left-panel">
          <ModeSelector selected={selectedMode} onSelect={handleModeChange} />
          <LogsConsole logs={logs} />
        </div>

        <div className="right-panel">
          <TradeTable trades={trades} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
