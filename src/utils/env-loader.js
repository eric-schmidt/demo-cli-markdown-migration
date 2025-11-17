const fs = require("fs");
const path = require("path");

/**
 * Loads and parses environment variables from .env file
 * Skips empty lines and comments (lines starting with #)
 * @returns {Object} Parsed environment variables as key-value pairs
 * @throws {Error} If .env file doesn't exist
 */
function loadEnvFile() {
  const envPath = path.join(__dirname, "..", "..", ".env");

  if (!fs.existsSync(envPath)) {
    throw new Error(
      ".env file not found. Please create one with CONTENTFUL_SPACE_ID and CONTENTFUL_ENVIRONMENT_ID"
    );
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  const envVars = {};

  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) return;

    // Parse KEY=VALUE format
    const match = trimmed.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      envVars[key] = value;
    }
  });

  return envVars;
}

module.exports = { loadEnvFile };
