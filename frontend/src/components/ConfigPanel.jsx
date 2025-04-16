import React, { useState, useEffect } from "react";
import "./ConfigPanel.css";

import React, { useState, useEffect } from "react";
import "./ConfigPanel.css";

const ConfigPanel = ({ config, setConfig }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="config-panel">
      <h3>⚙️ Strategy Config</h3>
      <label>
        Slippage (%)
        <input
          type="number"
          step="0.1"
          name="slippage"
          value={config.slippage}
          onChange={handleChange}
        />
      </label>
      <label>
        Trade Interval (ms)
        <input
          type="number"
          name="interval"
          value={config.interval}
          onChange={handleChange}
        />
      </label>
      <label>
        Max Trades
        <input
          type="number"
          name="maxTrades"
          value={config.maxTrades}
          onChange={handleChange}
        />
      </label>
    </div>
  );
};

export default ConfigPanel;

