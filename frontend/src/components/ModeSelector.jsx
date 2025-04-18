/** ModeSelector - Dropdown strategy selector for trading bot.
 * 
 * Features:
 * - Displays a dropdownwith all available bot strategy modes
 * - Allows the user to switch between strategies dynamically 
 * - Communicates selected mode to parent component via `onSelect` callback
 * - Clean UI structure and easily extensible with more strategies. 
 * 
 * - Used on the dashboard to configure which trading algorithm the bot runs. 
 */

import React from "react";
import "@/styles/components/ModeSelector.css";

// List of available strategy modes
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

/** ModeSelector renders a dropdwon for choosing a bot strategy mode.
 * Props: 
 * - selected: currently active mode
 * - onSelect: function to update selected mode in parent component. 
 */
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
