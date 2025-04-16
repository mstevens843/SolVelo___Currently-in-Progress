import React from "react";
import "./ModeSelector.css";

const modes = [
  "scalper",
  "sniper",
  "breakout",
  "chadMode",
  "dipBuyer",
  "delayedSniper",
  "trendFollower",
  "paperTrader",
  "rebalancer",
  "rotationBot",
];

const ModeSelector = ({ selected, onSelect }) => {
  return (
    <div className="mode-selector-container">
      <label htmlFor="mode-select">Select Mode:</label>
      <select
        id="mode-select"
        value={selected || ""}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="">-- Choose a strategy --</option>
        {modes.map((mode) => (
          <option key={mode} value={mode}>
            {mode}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ModeSelector;
