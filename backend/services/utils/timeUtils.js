// Standardized timestamps delays, or number conversion helpers. 
function nowISO() {
    return new Date().toISOString();
  }
  
  function wait(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }
  
  module.exports = { nowISO, wait };
  