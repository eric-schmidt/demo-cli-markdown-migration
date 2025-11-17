#!/usr/bin/env node

// import-to-contentful.js
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { loadEnvFile } = require("./utils/env-loader");
const { ENTRY_ID_PATTERNS } = require("./utils/constants");

/**
 * Displays error message when import.json is not found
 */
function displayImportFileNotFoundError() {
  console.error(`
❌ Error: outputs/import.json not found

Please generate the import file first by running:
  npm run generate

Or:
  node src/generate.js --url <markdown-url>
`);
}

/**
 * Displays error message when .env file is not found
 */
function displayEnvFileNotFoundError() {
  console.error(`
❌ Error: .env file not found

Please create a .env file with the following content:

CONTENTFUL_SPACE_ID=your-space-id-here
CONTENTFUL_ENVIRONMENT_ID=master

Example:
  cp env.example .env
  # Then edit .env with your Contentful credentials
`);
}

/**
 * Displays error when Contentful CLI is not installed
 * @param {string} spaceId - Space ID for example command
 * @param {string} environmentId - Environment ID for example command
 */
function displayCLINotFoundError(spaceId, environmentId) {
  console.error(`
❌ Error: Contentful CLI not found

Please install the Contentful CLI globally:
  npm install -g contentful-cli

Or use npx to run it without installing:
  npx contentful-cli space import --space-id ${spaceId} --environment-id ${environmentId} --content-file outputs/import.json
`);
}

/**
 * Validates the import.json file exists and reads its metadata
 * @returns {Object} Object with importFilePath and shouldPublish flag
 * @throws {Error} If file doesn't exist
 */
function validateImportFile() {
  const importFilePath = path.join(__dirname, "..", "outputs", "import.json");
  if (!fs.existsSync(importFilePath)) {
    displayImportFileNotFoundError();
    process.exit(1);
  }
  
  // Read import.json to check for autoPublish metadata
  let shouldPublish = false;
  try {
    const importData = JSON.parse(fs.readFileSync(importFilePath, "utf8"));
    shouldPublish = importData.__metadata?.autoPublish || false;
  } catch (error) {
    // If we can't parse metadata, default to false
    console.log("⚠️  Could not read publish metadata, defaulting to draft mode");
  }
  
  return { importFilePath, shouldPublish };
}

/**
 * Loads and validates environment variables
 * @returns {Object} Environment variables with spaceId and environmentId
 */
function loadAndValidateEnv() {
  let envVars;
  try {
    envVars = loadEnvFile();
  } catch (error) {
    displayEnvFileNotFoundError();
    process.exit(1);
  }

  const { CONTENTFUL_SPACE_ID, CONTENTFUL_ENVIRONMENT_ID } = envVars;

  if (!CONTENTFUL_SPACE_ID) {
    console.error(`❌ Error: CONTENTFUL_SPACE_ID not found in .env file`);
    process.exit(1);
  }

  if (!CONTENTFUL_ENVIRONMENT_ID) {
    console.error(`❌ Error: CONTENTFUL_ENVIRONMENT_ID not found in .env file`);
    process.exit(1);
  }

  return {
    spaceId: CONTENTFUL_SPACE_ID,
    environmentId: CONTENTFUL_ENVIRONMENT_ID,
  };
}

/**
 * Checks if Contentful CLI is installed
 * @param {string} spaceId - Space ID for error message
 * @param {string} environmentId - Environment ID for error message
 * @returns {boolean} True if CLI is installed
 */
function checkCLIInstalled(spaceId, environmentId) {
  try {
    execSync("contentful --version", { stdio: "ignore" });
    return true;
  } catch (error) {
    displayCLINotFoundError(spaceId, environmentId);
    process.exit(1);
  }
}

/**
 * Attempts to extract entry ID from CLI output
 * @param {string} output - Combined stdout and stderr from CLI
 * @returns {string|null} Extracted entry ID or null
 */
function extractEntryId(output) {
  for (const pattern of ENTRY_ID_PATTERNS) {
    const match = output.match(pattern.regex);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Runs the Contentful CLI import command
 * @param {string} spaceId - Contentful space ID
 * @param {string} environmentId - Contentful environment ID
 * @param {boolean} shouldPublish - Whether to publish entries on import
 * @returns {Promise<Object>} Result with success status and output
 */
function runImportCommand(spaceId, environmentId, shouldPublish) {
  return new Promise((resolve, reject) => {
    const commandArgs = [
      "space",
      "import",
      "--space-id",
      spaceId,
      "--environment-id",
      environmentId,
      "--content-file",
      "outputs/import.json",
    ];
    
    // Add publish flag if configured
    if (shouldPublish) {
      commandArgs.push("--publish");
    }

    console.log(`🚀 Running command:`);
    console.log(`   contentful ${commandArgs.join(" ")}\n`);
    console.log("─".repeat(60) + "\n");

    const child = spawn("contentful", commandArgs, {
      stdio: ["inherit", "pipe", "pipe"],
      shell: false,
    });

    let output = "";
    let errorOutput = "";

    // Capture and display stdout
    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      process.stdout.write(chunk);
      output += chunk;
    });

    // Capture and display stderr
    child.stderr.on("data", (data) => {
      const chunk = data.toString();
      process.stderr.write(chunk);
      errorOutput += chunk;
    });

    child.on("close", (code) => {
      const combinedOutput = output + "\n" + errorOutput;
      resolve({ success: code === 0, output: combinedOutput });
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Displays success message with optional entry ID and link
 * @param {string|null} entryId - The imported entry ID
 * @param {string} spaceId - Contentful space ID
 * @param {string} environmentId - Contentful environment ID
 */
function displaySuccessMessage(entryId, spaceId, environmentId) {
  console.log("\n" + "─".repeat(60));
  console.log("\n✅ Import completed successfully!");

  if (spaceId && environmentId && entryId) {
    // Direct link to the specific entry
    const entryUrl = `https://app.contentful.com/spaces/${spaceId}/environments/${environmentId}/entries/${entryId}`;
    console.log("\n🔗 View your entry in Contentful:");
    console.log(`   ${entryUrl}\n`);
  } else {
    console.log(
      "\n💡 Entry imported successfully (ID not captured from CLI output)"
    );
  }

  console.log("");
}

// Main function
async function importToContentful() {
  console.log("📦 Starting Contentful import process...\n");

  // Validate import file exists and read metadata
  const { importFilePath, shouldPublish } = validateImportFile();

  // Load and validate environment variables
  const { spaceId, environmentId } = loadAndValidateEnv();

  console.log(`🔧 Configuration:`);
  console.log(`   Space ID: ${spaceId}`);
  console.log(`   Environment: ${environmentId}`);
  console.log(`   Import File: outputs/import.json`);
  console.log(`   Auto-Publish: ${shouldPublish ? "✅ Enabled" : "❌ Disabled (entries will be drafts)"}\n`);

  // Check if contentful-cli is installed
  checkCLIInstalled(spaceId, environmentId);

  try {
    // Run the import command
    const result = await runImportCommand(spaceId, environmentId, shouldPublish);

    if (!result.success) {
      console.error("\n" + "─".repeat(60));
      console.error("\n❌ Import failed. Check the error messages above.\n");
      process.exit(1);
    }

    // Extract entry ID from output
    const entryId = extractEntryId(result.output);

    // Display success message
    displaySuccessMessage(entryId, spaceId, environmentId);
  } catch (error) {
    console.error("\n❌ Failed to start import process:", error.message, "\n");
    process.exit(1);
  }
}

// Run the import
importToContentful();
