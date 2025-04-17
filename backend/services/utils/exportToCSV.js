/** Trade Log to CSV Exporter
 * Converts structured trade logs into CSV format
 * Used by: /api/trades/download route, for easy export and review.
 * 
 * Features: 
 * - Converts JSON trade entries into CSV rows
 * - Escapes string values (mint addresses, timestamps)
 * - Supports writing directly to file. 
 */

const fs = require("fs");
const path = require("path");

// Converts an array of trade objects to CSV string format
function convertToCSV(trades) {
  const headers = [
    "timestamp",
    "strategy",
    "inputMint",
    "outputMint",
    "inAmount",
    "outAmount",
    "priceImpact",
    "entryPrice",
    "exitPrice",
    "success",
  ];

  const rows = trades.map((t) =>
    headers
      .map((key) => {
        const val = t[key];
        return typeof val === "string" ? `"${val}"` : val ?? "";
      })
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

// Writes CSV file to Disk from trade Array 
function writeCSVFile(trades, outputPath) {
  const csv = convertToCSV(trades);
  fs.writeFileSync(outputPath, csv);
}

module.exports = { convertToCSV, writeCSVFile };
