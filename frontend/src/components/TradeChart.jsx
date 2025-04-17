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

import React from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

// renders line graph showing trade output amounts over time. 
// - trades: array of trade objects with timestamp, outputAmount, and priceImpact 
const TradeChart = ({ trades }) => {
    // Show falllback message if no trades yet 
  if (!trades.length) return <p>No trades to display yet.</p>;

  // Format trades for char rendering
  const formatted = trades.map((t) => ({
    ...t,
    time: new Date(t.timestamp).toLocaleTimeString(),
    outAmount: parseFloat(t.outAmount) / 1e6, // adjust as needed
    priceImpact: parseFloat(t.priceImpact),
  }));

  return (
    <div className="chart-container">
      <h3>📈 Trade Output Over Time</h3>

      {/* 📊 Responsive Recharts container */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formatted}>
          {/* Chart gridlines */}
          <CartesianGrid strokeDasharray="3 3" />

          {/* X-axis: formatted time */}
          <XAxis dataKey="time" />

          {/* Y-axis: outAmount */}
          <YAxis />

          {/* Tooltip on hover */}
          <Tooltip />

          {/* Green trade output line */}
          <Line
            type="monotone"
            dataKey="outAmount"
            stroke="#22c55e"
            dot={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TradeChart;
