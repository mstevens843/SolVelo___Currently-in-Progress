import React from "react";

const StartStopControls = ({ onStart, onStop, running, selected, loading }) => {
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
