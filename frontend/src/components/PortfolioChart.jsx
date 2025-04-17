/** PorfolioChart - Portfolio equity curve chart Solana trading bot dashboard. 
 * 
 * Features: 
 * - Fetches and displays historical portfolio equity over time. 
 * - Renders an interactive line chart with tooltips using Recharts. 
 * - Pulls from `/api/portfolio-summary` which retunrs an equityCurve array.
 * - Auto-scales Y-axis and dynamically resizwsaa vis ResponsiveCounter
 * 
 * - Used in the dashboard to show simulated or real portfolio growth based on trades. 
 */

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

const API_URL = "http://localhost:5001/api/trades"; // or expose via dedicated endpoint later


/** Sends responsive line chart of portfolio equity over time
 * Pulls data from the backend and displays Recharts. 
 */
const PortfolioChart = () => {
  const [equity, setEquity] = useState([]);

  useEffect(() => {
    // fetch equityt curve on component mount
    fetch("http://localhost:5001/api/portfolio-summary")
      .then(res => res.json())
      .then(data => {
        setEquity(data.equityCurve || []);
      })
      .catch((err) => {
        console.error("❌ Portfolio fetch error:", err);
      });
  }, []);

  // Fallback if no data yet. 
  if (!equity.length) return <p>No portfolio data yet.</p>;

  return (
    <div className="portfolio-chart-container">
      <h3>💼 Simulated Portfolio Value</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={equity}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis domain={["auto", "auto"]} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PortfolioChart;
