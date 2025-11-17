// Contentful-specific constants
const INITIAL_PUBLISHED_VERSION = 1;
const DEFAULT_LOCALE = "en-US";

// Validation constants
const MAX_LINE_LENGTH = 120;
const LONG_LINE_WARNING_THRESHOLD = 10;

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
  INITIAL_PUBLISHED_VERSION,
  DEFAULT_LOCALE,
  MAX_LINE_LENGTH,
  LONG_LINE_WARNING_THRESHOLD,
  ENTRY_ID_PATTERNS,
};

