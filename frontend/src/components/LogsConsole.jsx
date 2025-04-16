import React, { useState, useEffect } from "react";
import "./LogsConsole.css";

const LogsConsole = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:5001");

    ws.onmessage = (msg) => {
      setLogs((prev) => [...prev.slice(-100), msg.data]); // keep last 100 logs
    };

    ws.onerror = (err) => console.error("WebSocket error:", err);
    ws.onclose = () => console.warn("WebSocket closed");

    return () => ws.close();
  }, []);




  /** 
   * Mask Long wallet-like strings: 9sv...aLNh
   * Masked tx hashes: f6d7a2..33c781
   * You're now safe from leaking full wallet or tx data in your frontned logs. 

   */
  const sanitizeLog = (log) => {
    const addressPattern = /([1-9A-HJ-NP-Za-km-z]{32,44})/g;
    const txPattern = /\b([a-f0-9]{64})\b/gi;

    let sanitized = log;

    // Mask wallet addresses
    sanitized = sanitized.replace(addressPattern, (match) =>
      match.length > 20 ? `${match.slice(0, 4)}…${match.slice(-4)}` : match
    );

    // Mask tx hashes
    sanitized = sanitized.replace(txPattern, (match) =>
      `${match.slice(0, 6)}…${match.slice(-6)}`
    );

    return sanitized;
  };

  return (
    <div className="logs-console">
      <h3>📜 Live Logs</h3>
      <div className="logs-output">
        {logs.map((line, i) => (
          <div key={i} className="log-line">
            {sanitizeLog(line)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogsConsole;
