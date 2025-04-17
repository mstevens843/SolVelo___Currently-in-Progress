/** StartStopControls - UI COntrols to start and stop bot execution. 
 * 
 * Features: 
 * - "Start" button that triggers strategy execution if a mode is selected. 
 * - "Stop" button to halt an actively running bot. 
 * - Buttons fidanle based on app state (running, loading, no strategy selected)
 * - Displays dynamic text/icons for loading feedback (Starting / Stopping) 
 * 
 * - Used in dashboard to control lifecycle of trading pot per user action. 
 */


import React from "react";

const StartStopControls = ({ onStart, onStop, running, selected, loading, disabled }) => {
    return (
    <div className="start-stop-controls">
      <button
        onClick={onStart}
        disabled={!selected || running || loading}
        className="start-btn"
      >
        {loading && !running ? "⏳ Starting..." : "▶️ Start"}
      </button>
      <button
        onClick={onStop}
        disabled={!running || loading}
        className="stop-btn"
      >
        {loading && running ? "🛑 Stopping..." : "⏹ Stop"}
      </button>
    </div>
  );
};

export default StartStopControls;
