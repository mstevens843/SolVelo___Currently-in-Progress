import React, { useEffect, useState } from "react";

const HistoryPanel = () => {
  const [allTrades, setAllTrades] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/trades/history`)
      .then((res) => res.json())
      .then(setAllTrades)
      .catch((err) => {
        console.error("❌ Error fetching full history:", err);
      });
  }, []);

  if (!allTrades.length) return <p>Loading full trade history...</p>;

  return (
    <div className="history-panel">
      <h3>📚 Full Trade History</h3>
      <table className="w-full table-auto text-sm bg-black text-white mt-2">
        <thead>
          <tr>
            <th className="border px-2">Timestamp</th>
            <th className="border px-2">Strategy</th>
            <th className="border px-2">Output</th>
            <th className="border px-2">Impact %</th>
          </tr>
        </thead>
        <tbody>
          {allTrades.map((trade, i) => (
            <tr key={i}>
              <td className="border px-2">{new Date(trade.timestamp).toLocaleTimeString()}</td>
              <td className="border px-2">{trade.strategy}</td>
              <td className="border px-2">{(trade.outAmount / 1e6).toFixed(2)}</td>
              <td className="border px-2">{trade.priceImpact?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HistoryPanel;
