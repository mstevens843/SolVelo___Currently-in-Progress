/** TradeChart - Visualizes individual trade output over time. 
 * 
 * Features: 
 * - Displays a line chart of `outAmount` from recent trades
 * - Parses timestamps into human-readable time for the X-axis 
 * - Adjusts outAmount (ex: lamports to SOL) for display
 * - Interactive tooltip for hovering over trade points 
 * - Responsive and clean using ReCharts 
 * 
 * - Used in the dashboard to monitor trade impace and volume visually in real-time 
 */

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import "@/styles/components/TradeChart.css";

const API = import.meta.env.VITE_API_BASE_URL;

const TradeChart = ({ trades }) => {
  const [fullHistory, setFullHistory] = useState([]);
  const [showFull, setShowFull] = useState(false); // toggle state

  // Fetch full trade history on mount
  useEffect(() => {
    fetch(`${API}/api/trades/history`)
      .then((res) => res.json())
      .then((data) => setFullHistory(data))
      .catch((err) => console.error("❌ Failed to fetch full history:", err));
  }, []);

  const selectedData = showFull ? fullHistory : trades;

  if (!selectedData.length) return <p>No trades to display yet.</p>;

  const formatted = selectedData.map((t) => ({
    ...t,
    time: new Date(t.timestamp).toLocaleTimeString(),
    outAmount: parseFloat(t.outAmount) / 1e6,
    priceImpact: parseFloat(t.priceImpact),
  }));

  return (
    <div className="chart-container">
      <h3>📈 Trade Output Over Time</h3>

      {/* Toggle Full vs Recent */}
      <div className="toggle-view">
        <label>
          <input
            type="checkbox"
            checked={showFull}
            onChange={() => setShowFull((prev) => !prev)}
          />
          Show Full History
        </label>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="outAmount" stroke="#22c55e" dot={true} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TradeChart;



/**
 * ✅ Updated TradeChart.jsx (with toggle between recent & full history)
✅ Summary of Changes
Added a toggle to switch between recent session trades (props.trades) and full trade history (/api/trades/history).

Used useEffect to fetch full trade history on mount.

Reused the same chart, dynamically feeding it either dataset.



 */