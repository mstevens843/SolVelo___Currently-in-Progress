import React from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const TradeChart = ({ trades }) => {
  if (!trades.length) return <p>No trades to display yet.</p>;

  const formatted = trades.map((t) => ({
    ...t,
    time: new Date(t.timestamp).toLocaleTimeString(),
    outAmount: parseFloat(t.outAmount) / 1e6, // adjust as needed
    priceImpact: parseFloat(t.priceImpact),
  }));

  return (
    <div className="chart-container">
      <h3>📈 Trade Output Over Time</h3>
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
