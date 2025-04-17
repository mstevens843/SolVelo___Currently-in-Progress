const express = require("express");
const modeRouter = require("./modes");
const tradeRouter = require("./trades");
const portfolioSummary = require("./portfolio-summary")

const router = express.Router();

// Attach all API sub-routes
router.use("/mode", (req, res, next) => {
  // This part stays for /mode control
  req.setModeProcess = (proc) => {
    req.currentModeProcess = proc;
  };
  next();
}, modeRouter);

router.use("/trades", tradeRouter);
router.use("/portfolio-summary", portfolioSummary);

// Optionally add more:
/// router.use("/alerts", telegramRouter);

module.exports = router;