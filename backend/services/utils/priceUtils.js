// To handle normalized price comparisons, percent changes, or average deltas. 
function getPercentageChange(oldPrice, newPrice) {
    return ((newPrice - oldPrice) / oldPrice);
  }
  
  function isPriceAboveThreshold(current, reference, threshold) {
    return getPercentageChange(reference, current) >= threshold;
  }
  
  module.exports = { getPercentageChange, isPriceAboveThreshold };