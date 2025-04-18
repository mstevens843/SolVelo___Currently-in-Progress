/** ConfigPanel - Frontend config UI for Solana trading bot
 * 
 * Features: 
 * - UI to edit and update strategy config in real-time (slippage, trade interval 
 * - Controlled input fields for live config editing
 * - Dynamically syncs input changes to parent bot state via props
 * - Easily extensible for more advanced settings (TP/SL, monitored tokend, etc.)
 * 
 * - Used inside the both dashboard to allow strategy tuning before or during bot runtime. 
 */

import React, { useState, useEffect } from "react";
import "@/styles/components/ConfigPanel.css";


/** ConfigPanel displays a form that lets the user configure key trading bot settings.
 * Props: 
 * - config: current config state object
 * - setConfig: function to update config state
 */
const ConfigPanel = ({ config, setConfig }) => {


    /** updates specific config value in parent state
     * Triggered when any input field is modified. 
     */
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

