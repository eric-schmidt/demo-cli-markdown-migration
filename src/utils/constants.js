// ============================================================================
// USER-CONFIGURABLE CONSTANTS
// ============================================================================

// ────────────────────────────────────────────────────────────────────────────
// Import/Export Settings
// ────────────────────────────────────────────────────────────────────────────
// Always export validation errors to CSV when running the complete workflow (run-all.js)
const EXPORT_ERRORS = true;

// ────────────────────────────────────────────────────────────────────────────
// Localization Settings
// ────────────────────────────────────────────────────────────────────────────
// Default locale for content (change if using a different primary locale)
const DEFAULT_LOCALE = "en-US";

// ────────────────────────────────────────────────────────────────────────────
// Validation Settings
// ────────────────────────────────────────────────────────────────────────────
// Maximum line length before flagging as potentially problematic
const MAX_LINE_LENGTH = 120;

// Number of long lines before showing a warning
const LONG_LINE_WARNING_THRESHOLD = 10;

// ============================================================================

// System constants (generally should not be modified)
// Entry ID extraction patterns for Contentful CLI output
const ENTRY_ID_PATTERNS = [
  {
    name: "CLI_OUTPUT_FORMAT",
    regex: /(?:Created|Published|Updated)\s+Entry\s+([a-zA-Z0-9]+)/i,
  },
  {
    name: "GENERIC_ENTRY_FORMAT",
    regex: /entry[:\s]+([a-zA-Z0-9]{20,})/i,
  },
  {
    name: "JSON_FORMAT",
    regex: /"id":\s*"([a-zA-Z0-9]{20,})"/,
  },
  {
    name: "SYS_ID_FORMAT",
    regex: /sys\.id[:\s]+([a-zA-Z0-9]{20,})/i,
  },
];

module.exports = {
  // User-configurable constants
  EXPORT_ERRORS,
  DEFAULT_LOCALE,
  MAX_LINE_LENGTH,
  LONG_LINE_WARNING_THRESHOLD,
  // System constants
  ENTRY_ID_PATTERNS,
};
