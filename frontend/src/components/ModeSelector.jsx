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

import React, { useState } from "react";
import "@/styles/components/ModeSelector.css";

const modes = [
  { value: "scalper", label: "⚡ Scalper" },
  { value: "sniper", label: "🎯 Sniper" },
  { value: "breakout", label: "🚀 Breakout" },
  { value: "chadMode", label: "🔥 Chad Mode" }, // 💪 or 🧠 also work
  { value: "dipBuyer", label: "💧 Dip Buyer" },
  { value: "delayedSniper", label: "⏱️ Delayed Sniper" },
  { value: "trendFollower", label: "📈 Trend Follower" },
  { value: "paperTrader", label: "📝 Paper Trader" },
  { value: "rebalancer", label: "⚖️ Rebalancer" },
  { value: "rotationBot", label: "🔁 Rotation Bot" },
];

const ModeSelector = ({ selected, onSelect, disabled = false }) => {
  const [open, setOpen] = useState(false);

  const selectedLabel = modes.find((m) => m.value === selected)?.label || "Choose a strategy";

  return (
    <div className="custom-dropdown-wrapper">
      <label className="dropdown-label">Select Mode:</label>
      <div
        className={`dropdown-toggle ${disabled ? "disabled" : ""}`}
        onClick={() => !disabled && setOpen((prev) => !prev)}
      >
        {selectedLabel}
        <span className="chevron">{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <ul className="dropdown-list">
          {modes.map((mode) => (
            <li
              key={mode.value}
              className="dropdown-item"
              onClick={() => {
                onSelect(mode.value); // still send backend value
                setOpen(false);
              }}
            >
              {mode.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ModeSelector;