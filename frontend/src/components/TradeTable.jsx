/** TradeTable - Displays historical trade data in a compact table
 * 
 * Features: 
 * - Shows trade time, strategy, input/output tokens, in/out amounts, price impact, and status
 * - Beatuifuies raw data (timestamp, token abbreviations, strategy names
 * - Uses tooltips for token mints to preserve UX clarity. 
 * 
 * Optimizations: 
 * - Cleaner, timestamp formatting (HH:MM:SS) 
 * - Capitalized strategy names
 * - Tooltip titles for input/output
 * - Fixed precision handling for token amounts. 
 * 
 * - Used in the dashboard to review live or historical bot trade logs. 
 */

import React from "react";
import "@/styles/components/TradeTable.css";


/** 
 * TradeTable renders a responsive, styled table of recent trades. 
 * 
 * Props: 
 * - trades: array of trade objects (timestamp, token mints, amounts, success, etc.) 
 */
const TradeTable = ({ trades }) => {
  return (
    <div className="trade-table-container">
      <h3>📊 Trade History</h3>
      {trades.length === 0 ? (
        <p className="no-trades">No trades yet.</p>
      ) : (
        <table className="trade-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Strategy</th>
              <th>Input</th>
              <th>Output</th>
              <th>In Amt</th>
              <th>Out Amt</th>
              <th>Impact</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t, i) => (
              <tr key={i}>
                <td>
                  {new Date(t.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
                <td>{t.strategy?.charAt(0).toUpperCase() + t.strategy?.slice(1) || "—"}</td>
                <td title={t.inputMint}>
                {t.inputMint?.slice(0, 4)}…{t.inputMint?.slice(-4)}
                </td>
                <td title={t.outputMint}>
                {t.outputMint?.slice(0, 4)}…{t.outputMint?.slice(-4)}
                </td>

                <td>{Number(t.inAmount / 1e9).toFixed(4)}</td>
                <td>{Number(t.outAmount / 1e6).toFixed(4)}</td>
                <td>{(t.priceImpact || 0).toFixed(2)}%</td>
                <td className={t.success ? "status-ok" : "status-fail"}>
                  {t.success ? "✅" : "❌"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TradeTable;


/** Optimizations: 
 * - Cleaner Timestamp 
 * - Strategy Name Capitalized 
 * - Tooltips for token mints
 * - Precision handling for in/out comments
 * - Better formatting for a pro dashboard feel 
 */


/** 
 * Let me know if you want a:

🔍 Filter dropdown

📦 Export trades button

💬 Tooltip popup with trade details
 */