// Simple Risk Manager Utility 

function isWithinDailyLimit(tradeAmount, dailyTotal, maxPerDay) {
    return (dailyTotal + tradeAmount) <= maxPerDay; 
}

function isAboveMinBalance(currentBalance, minBalance) {
    return currentBalance >= minBalance; 
}


module.exports = {
    isWithinDailyLimit,
    isAboveMinBalance,
}