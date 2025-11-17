/**
 * Escapes a value for safe inclusion in CSV format
 * Wraps values containing quotes, commas, or newlines in quotes
 * and doubles any internal quotes
 * @param {*} value - The value to escape
 * @returns {string} Escaped CSV value
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape quotes by doubling them and wrap in quotes if contains special chars
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of row objects to CSV format
 * @param {Array<Object>} rows - Array of objects to convert
 * @param {Array<string>} headers - CSV column headers
 * @returns {string} CSV formatted string
 */
function arrayToCSV(rows, headers) {
  const headerRow = headers.join(",");
  const dataRows = rows.map((row) =>
    headers.map((header) => escapeCSV(row[header])).join(",")
  );
  return [headerRow, ...dataRows].join("\n");
}

module.exports = { escapeCSV, arrayToCSV };

