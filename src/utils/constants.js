// ============================================================================
// USER-CONFIGURABLE CONSTANTS
// ============================================================================

// ────────────────────────────────────────────────────────────────────────────
// Import/Export Settings
// ────────────────────────────────────────────────────────────────────────────
// Set to true to automatically publish entries on import (generate.js & import.js)
// Set to false to import entries as drafts
const PUBLISH = true;

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
const INITIAL_PUBLISHED_VERSION = 1;

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
  PUBLISH,
  EXPORT_ERRORS,
  DEFAULT_LOCALE,
  MAX_LINE_LENGTH,
  LONG_LINE_WARNING_THRESHOLD,
  // System constants
  INITIAL_PUBLISHED_VERSION,
  ENTRY_ID_PATTERNS,
};

