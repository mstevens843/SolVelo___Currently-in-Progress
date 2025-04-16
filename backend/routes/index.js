const express = require("express");
const modeRouter = require("./modeRouter");
const tradeRouter = require("./tradeRouter");

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

// Optionally add more:
/// router.use("/alerts", telegramRouter);

module.exports = router;