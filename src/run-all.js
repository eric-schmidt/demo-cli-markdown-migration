#!/usr/bin/env node

// run-all.js - Complete workflow: validate, generate, and import
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { createInterface, question, confirm } = require("./utils/prompts");
const { parseArgument, hasFlag } = require("./utils/arg-parser");
const { loadEnvFile } = require("./utils/env-loader");
const { EXPORT_ERRORS } = require("./utils/constants");

const rl = createInterface();

// Parse command line arguments
const args = process.argv.slice(2);
const HELP_MODE = hasFlag(args, "--help", "-h");

let MARKDOWN_URL = parseArgument(args, "--url");
let CONTENT_TYPE = parseArgument(args, "--content-type");
let TITLE_FIELD = parseArgument(args, "--title-field");
let ENTRY_TITLE = parseArgument(args, "--title");
let BODY_FIELD = parseArgument(args, "--body-field");

// Show help if requested
if (HELP_MODE) {
  console.log(`
🚀 Complete Contentful Markdown Import Workflow
================================================

Usage: node src/run-all.js [options]

This script runs the complete workflow: validate → generate → import

Options:
  --url <url>              URL of the markdown file to import (required)
  --content-type <id>      Content type ID (e.g., 'post', 'article') (required)
  --title-field <id>       Field ID for the entry title (required)
  --title <title>          Value for the entry title (optional, auto-generated if not provided)
  --body-field <id>        Field ID for the markdown body (required)
  --help, -h               Show this help message

Note: Validation always runs and exports errors to outputs/validation-errors.csv.
      Validation errors will not prevent import - fix them in Contentful UI.

Examples:
  # Run complete workflow with interactive prompts
  node src/run-all.js

  # Run complete workflow with all parameters specified
  node src/run-all.js \\
    --url https://raw.githubusercontent.com/user/repo/main/doc.md \\
    --content-type article \\
    --title-field internalTitle \\
    --title "My Article" \\
    --body-field markdown

  # Or use the npm script
  npm run all

Workflow Steps:
  1. 📋 Validate markdown (checks syntax, structure, and quality)
  2. 📝 Generate import.json (converts markdown to Contentful format)
  3. 📤 Import to Contentful (uploads content using Contentful CLI)

Prerequisites:
  - .env file with CONTENTFUL_SPACE_ID and CONTENTFUL_ENVIRONMENT_ID
  - Contentful CLI installed (npm install -g contentful-cli)
  - Authenticated with Contentful (contentful login)

Output: Content published to your Contentful space
`);
  process.exit(0);
}

/**
 * Helper function to run a command with proper stdio handling
 * @param {string} command - Command to run
 * @param {Array<string>} args - Command arguments
 * @param {string} description - Description to display
 * @param {boolean} captureOutput - Whether to capture output
 * @returns {Promise<string>} Output from command if captured
 */
function runCommand(command, args, description, captureOutput = false) {
  return new Promise((resolve, reject) => {
    if (description) {
      console.log(`\n${description}`);
    }
    console.log(`Running: ${command} ${args.join(" ")}\n`);

    const options = captureOutput
      ? { stdio: ["inherit", "pipe", "inherit"], shell: false }
      : { stdio: "inherit", shell: false };

    const child = spawn(command, args, options);

    let output = "";

    if (captureOutput) {
      child.stdout.on("data", (data) => {
        const chunk = data.toString();
        process.stdout.write(chunk); // Still display to user
        output += chunk; // But also capture it
      });
    }

    child.on("error", (error) => {
      reject(new Error(`Failed to start process: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

/**
 * Checks if running in interactive mode
 * @returns {boolean} True if interactive mode
 */
function isInteractive() {
  return !args.includes("--url");
}

/**
 * Validates required parameter is not empty
 * @param {string} value - Value to validate
 * @param {string} fieldName - Name for error message
 * @throws {Error} If value is empty
 */
function validateRequired(value, fieldName) {
  if (!value || !value.trim()) {
    console.error(`\n❌ Error: ${fieldName} is required\n`);
    rl.close();
    process.exit(1);
  }
}

/**
 * Collects all required parameters from user
 * @returns {Promise<void>}
 */
async function collectParameters() {
  // Prompt 1: Markdown URL
  if (!MARKDOWN_URL) {
    MARKDOWN_URL = await question(rl, "📎 Enter the markdown URL: ");
    validateRequired(MARKDOWN_URL, "Markdown URL");
  }

  // Prompt 2: Content Type ID
  if (!CONTENT_TYPE) {
    CONTENT_TYPE = await question(
      rl,
      "📝 Enter the content type ID (e.g., 'post', 'article'): "
    );
    validateRequired(CONTENT_TYPE, "Content type ID");
  }

  // Prompt 3: Title Field ID
  if (!TITLE_FIELD) {
    TITLE_FIELD = await question(
      rl,
      "🏷️  Enter the title field ID (e.g., 'internalTitle', 'title'): "
    );
    validateRequired(TITLE_FIELD, "Title field ID");
  }

  // Prompt 4: Entry Title (optional in interactive mode)
  if (!ENTRY_TITLE && isInteractive()) {
    const titlePrompt =
      "📌 Enter the entry title (leave blank to auto-generate): ";
    ENTRY_TITLE = await question(rl, titlePrompt);
    // Auto-generation will be handled by generate.js
    if (!ENTRY_TITLE || !ENTRY_TITLE.trim()) {
      ENTRY_TITLE = ""; // Will be auto-generated by generate.js
      console.log(
        `   Title will be auto-generated from markdown content or filename`
      );
    }
  } else if (!ENTRY_TITLE) {
    // Non-interactive mode without --title provided
    ENTRY_TITLE = ""; // Will be auto-generated by generate.js
  }

  // Prompt 5: Body Field ID
  if (!BODY_FIELD) {
    BODY_FIELD = await question(
      rl,
      "📄 Enter the body field ID (e.g., 'body', 'content'): "
    );
    validateRequired(BODY_FIELD, "Body field ID");
  }
}

/**
 * Displays configuration summary
 */
function displayConfiguration() {
  console.log("\n" + "=".repeat(60));
  console.log("⚙️  Configuration Summary:");
  console.log(`   URL: ${MARKDOWN_URL}`);
  console.log(`   Content Type: ${CONTENT_TYPE}`);
  console.log(`   Title Field: ${TITLE_FIELD}`);
  console.log(
    `   Entry Title: ${
      ENTRY_TITLE && ENTRY_TITLE.trim() ? ENTRY_TITLE : "(auto-generated)"
    }`
  );
  console.log(`   Body Field: ${BODY_FIELD}`);
  console.log(`   Validation: ✅ Enabled (errors will be exported to CSV)`);
  console.log("=".repeat(60) + "\n");
}

/**
 * Runs the validation step
 * @returns {Promise<boolean>} True if validation had errors
 */
async function runValidationStep() {
  console.log("\n📋 STEP 1/3: Validating markdown...");
  console.log("=".repeat(60));

  const validateArgs = [
    "src/validate.js",
    "--url",
    MARKDOWN_URL,
    "--export-errors",
  ];

  let validationHadErrors = false;
  try {
    await runCommand("node", validateArgs, "");
    console.log("\n✅ Validation passed with no critical issues!");
  } catch (error) {
    // Validation failed, but we'll continue anyway
    validationHadErrors = true;
    console.log("\n⚠️  Validation completed with errors/warnings.");
    console.log(
      "📄 Validation errors have been exported to: outputs/validation-errors.csv"
    );
    console.log(
      "💡 You can fix these issues in the Contentful UI after import."
    );
    console.log("\n🚀 Continuing with import process...");
  }

  return validationHadErrors;
}

/**
 * Runs the generation step
 * @returns {Promise<void>}
 */
async function runGenerationStep() {
  console.log("\n📝 STEP 2/3: Generating import.json...");
  console.log("=".repeat(60));

  const generateArgs = [
    "src/generate.js",
    "--url",
    MARKDOWN_URL,
    "--content-type",
    CONTENT_TYPE,
    "--title-field",
    TITLE_FIELD,
    "--body-field",
    BODY_FIELD,
  ];

  // Only add title if provided
  if (ENTRY_TITLE && ENTRY_TITLE.trim()) {
    generateArgs.push("--title", ENTRY_TITLE);
  }

  try {
    await runCommand("node", generateArgs, "");
  } catch (error) {
    console.error("\n❌ Generation failed. Check the error messages above.\n");
    process.exit(1);
  }

  // Verify import.json was created
  const importFilePath = path.join(__dirname, "..", "outputs", "import.json");
  if (!fs.existsSync(importFilePath)) {
    console.error(
      "\n❌ Error: import.json was not created. Generation failed.\n"
    );
    process.exit(1);
  }

  console.log("\n✅ import.json successfully created!");
}

/**
 * Runs the import step
 * @returns {Promise<string>} Import output
 */
async function runImportStep() {
  console.log("\n📤 STEP 3/3: Importing to Contentful...");
  console.log("=".repeat(60));

  let importOutput = "";
  try {
    importOutput = await runCommand("node", ["src/import.js"], "", true);
  } catch (error) {
    console.error("\n❌ Import failed. Check the error messages above.\n");
    process.exit(1);
  }

  return importOutput;
}

/**
 * Extracts entry ID from import output
 * @param {string} importOutput - Output from import command
 * @returns {string|null} Entry ID if found
 */
function extractEntryId(importOutput) {
  const entryIdMatch = importOutput.match(/ENTRY_ID=([a-zA-Z0-9]+)/);
  return entryIdMatch ? entryIdMatch[1] : null;
}

/**
 * Loads environment variables for building Contentful URL
 * @returns {Object} Object with spaceId and environmentId
 */
function loadEnvironmentInfo() {
  let spaceId = "";
  let environmentId = "master";

  try {
    const envVars = loadEnvFile();
    spaceId = envVars.CONTENTFUL_SPACE_ID || "";
    environmentId = envVars.CONTENTFUL_ENVIRONMENT_ID || "master";
  } catch (error) {
    // If we can't read .env, just skip the link
  }

  return { spaceId, environmentId };
}

/**
 * Displays success message with links
 * @param {boolean} validationHadErrors - Whether validation found errors
 * @param {string|null} entryId - Entry ID if available
 * @param {string} spaceId - Contentful space ID
 * @param {string} environmentId - Contentful environment ID
 */
function displaySuccessMessage(
  validationHadErrors,
  entryId,
  spaceId,
  environmentId
) {
  console.log("\n" + "=".repeat(60));
  console.log("🎉 COMPLETE WORKFLOW FINISHED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log("\n✅ Your markdown content has been:");
  console.log("   1. Validated for quality and structure");
  console.log("   2. Converted to Contentful import format");
  console.log("   3. Imported and published to your Contentful space");

  if (validationHadErrors) {
    console.log("\n📋 Note: Validation found some issues:");
    console.log("   • Review: outputs/validation-errors.csv");
    console.log("   • These can be fixed in the Contentful UI");
  }

  // Generate link to Contentful UI
  if (spaceId && entryId) {
    // Direct link to the specific entry
    const entryUrl = `https://app.contentful.com/spaces/${spaceId}/environments/${environmentId}/entries/${entryId}`;
    console.log("\n🔗 View your entry in Contentful:");
    console.log(`   ${entryUrl}\n`);
  } else if (spaceId) {
    // Fallback to filtered entries list
    const contentTypeUrl = `https://app.contentful.com/spaces/${spaceId}/environments/${environmentId}/entries?contentTypeId=${CONTENT_TYPE}&order.fieldId=sys.createdAt&order.direction=descending`;
    console.log("\n🔗 View your content in Contentful:");
    console.log(`   ${contentTypeUrl}`);
    console.log(
      "\n💡 Tip: The entry will be at the top (sorted by newest first)\n"
    );
  } else {
    console.log("\n💡 Check your Contentful space to see the new entry!\n");
  }
}

// Main execution
async function main() {
  try {
    console.log("\n🚀 Complete Contentful Markdown Import Workflow");
    console.log("=".repeat(60) + "\n");

    // Collect all required parameters
    await collectParameters();

    // Display configuration summary
    displayConfiguration();

    // Only ask for confirmation in interactive mode
    if (isInteractive()) {
      const shouldProceed = await confirm(
        rl,
        "🚦 Proceed with this configuration?"
      );
      if (!shouldProceed) {
        console.log("\n👋 Operation cancelled by user.\n");
        rl.close();
        process.exit(0);
      }
    }

    // IMPORTANT: Close readline before running child processes
    // This prevents conflicts between parent and child readline interfaces
    rl.close();

    console.log("\n" + "=".repeat(60));

    // STEP 1: Validate (always run)
    const validationHadErrors = await runValidationStep();

    // STEP 2: Generate
    await runGenerationStep();

    // STEP 3: Import
    const importOutput = await runImportStep();

    // Extract entry ID and environment info
    const entryId = extractEntryId(importOutput);
    const { spaceId, environmentId } = loadEnvironmentInfo();

    // Display success message
    displaySuccessMessage(validationHadErrors, entryId, spaceId, environmentId);
  } catch (error) {
    console.error("\n❌ Error during workflow:", error.message, "\n");
    // Ensure readline is closed if an error occurs before we manually close it
    if (!rl.closed) {
      rl.close();
    }
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log("\n\n👋 Operation cancelled by user.\n");
  if (!rl.closed) {
    rl.close();
  }
  process.exit(0);
});

// Run the workflow
main();
