// Optional: paste a mint to manually override scanning.
import React, { useState } from "react";
import "@/styles/components/TokenSelector.css";

const TokenSelector = ({ onMintSelected }) => {
  const [mint, setMint] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!mint.trim()) return;
    onMintSelected(mint.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="token-selector">
      <h3 className="token-title">🎯 Target Token (Optional)</h3>
      <input
        type="text"
        placeholder="Paste token mint address"
        className="token-input"
        value={mint}
        onChange={(e) => setMint(e.target.value)}
      />
      <button type="submit" className="token-submit">
        Set Target Token
      </button>
    </form>
  );
};

export default TokenSelector;

