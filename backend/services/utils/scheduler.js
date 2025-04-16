function runInterval(fn, interval) {
    setInterval(async () => {
      try {
        await fn();
      } catch (err) {
        console.error("Scheduler error:", err.message);
      }
    }, interval);
  }
  
  function runWithDelay(fn, delay) {
    setTimeout(async () => {
      try {
        await fn();
      } catch (err) {
        console.error("Delayed run error:", err.message);
      }
    }, delay);
  }
  
  module.exports = {
    runInterval,
    runWithDelay,
  };
  