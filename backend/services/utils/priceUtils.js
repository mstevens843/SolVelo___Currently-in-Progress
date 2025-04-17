// LAMPORT Conversion Utilities
// To handle normalized price comparisons, percent changes, or average deltas. 
// Used throughout all strategy and wallet logic for accurate math. 

// Converts SOL to lamports
function getPercentageChange(oldPrice, newPrice) {
    return ((newPrice - oldPrice) / oldPrice);
  }
  
  // Converts lamports to SOL 
  function isPriceAboveThreshold(current, reference, threshold) {
    return getPercentageChange(reference, current) >= threshold;
  }
  
  module.exports = { getPercentageChange, isPriceAboveThreshold };