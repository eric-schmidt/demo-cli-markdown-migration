#!/usr/bin/env node

// run-all.js - Complete workflow: validate, generate, and import
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to prompt for input
function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// Helper function to prompt for yes/no
function confirm(query) {
  return new Promise((resolve) => {
    rl.question(`${query} (y/n): `, (answer) => {
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

// Helper function to run a command with proper stdio handling
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

// Parse command line arguments
const args = process.argv.slice(2);
const HELP_MODE = args.includes("--help") || args.includes("-h");

// Parse parameters
const urlIndex = args.indexOf("--url");
let MARKDOWN_URL =
  urlIndex !== -1 && args[urlIndex + 1] ? args[urlIndex + 1] : null;

const contentTypeIndex = args.indexOf("--content-type");
let CONTENT_TYPE =
  contentTypeIndex !== -1 && args[contentTypeIndex + 1]
    ? args[contentTypeIndex + 1]
    : null;

const titleFieldIndex = args.indexOf("--title-field");
let TITLE_FIELD =
  titleFieldIndex !== -1 && args[titleFieldIndex + 1]
    ? args[titleFieldIndex + 1]
    : null;

const titleIndex = args.indexOf("--title");
let ENTRY_TITLE =
  titleIndex !== -1 && args[titleIndex + 1] ? args[titleIndex + 1] : null;

const bodyFieldIndex = args.indexOf("--body-field");
let BODY_FIELD =
  bodyFieldIndex !== -1 && args[bodyFieldIndex + 1]
    ? args[bodyFieldIndex + 1]
    : null;

// Always export errors and always run validation
const EXPORT_ERRORS = true;
const SKIP_VALIDATION = false;

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

// Helper function to extract and format filename from URL
function getFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop();
    const nameWithoutExt = filename.replace(/\.(md|markdown)$/i, "");
    const formattedName = nameWithoutExt
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
    return formattedName || "Untitled Markdown Import";
  } catch (error) {
    return "Untitled Markdown Import";
  }
}

// Main execution
async function main() {
  try {
    console.log("\n🚀 Complete Contentful Markdown Import Workflow");
    console.log("=".repeat(60) + "\n");

    // Collect all required parameters
    if (!MARKDOWN_URL) {
      MARKDOWN_URL = await question("📎 Enter the markdown URL: ");
      if (!MARKDOWN_URL || !MARKDOWN_URL.trim()) {
        console.error("\n❌ Error: Markdown URL is required\n");
        rl.close();
        process.exit(1);
      }
    }

    if (!CONTENT_TYPE) {
      CONTENT_TYPE = await question(
        "📝 Enter the content type ID (e.g., 'post', 'article'): "
      );
      if (!CONTENT_TYPE || !CONTENT_TYPE.trim()) {
        console.error("\n❌ Error: Content type ID is required\n");
        rl.close();
        process.exit(1);
      }
    }

    if (!TITLE_FIELD) {
      TITLE_FIELD = await question(
        "🏷️  Enter the title field ID (e.g., 'internalTitle', 'title'): "
      );
      if (!TITLE_FIELD || !TITLE_FIELD.trim()) {
        console.error("\n❌ Error: Title field ID is required\n");
        rl.close();
        process.exit(1);
      }
    }

    // Only prompt for title in interactive mode
    const isInteractive = !args.includes("--url");

    if (!ENTRY_TITLE && isInteractive) {
      const titlePrompt =
        "📌 Enter the entry title (leave blank to auto-generate): ";
      ENTRY_TITLE = await question(titlePrompt);
      // Don't auto-generate here - let generate.js handle it
      // This allows generate.js to use either first H1 or filename
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

    if (!BODY_FIELD) {
      BODY_FIELD = await question(
        "📄 Enter the body field ID (e.g., 'markdown', 'body', 'content'): "
      );
      if (!BODY_FIELD || !BODY_FIELD.trim()) {
        console.error("\n❌ Error: Body field ID is required\n");
        rl.close();
        process.exit(1);
      }
    }

    // Always export errors and always run validation
    const shouldExportErrors = true;
    const shouldSkipValidation = false;

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

    // Only ask for confirmation in interactive mode
    if (isInteractive) {
      const shouldProceed = await confirm(
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

    // STEP 2: Generate
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
      console.error(
        "\n❌ Generation failed. Check the error messages above.\n"
      );
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

    // STEP 3: Import
    console.log("\n📤 STEP 3/3: Importing to Contentful...");
    console.log("=".repeat(60));

    let importOutput = "";
    try {
      importOutput = await runCommand("node", ["src/import.js"], "", true);
    } catch (error) {
      console.error("\n❌ Import failed. Check the error messages above.\n");
      process.exit(1);
    }

    // Extract entry ID from import output
    let entryId = null;
    const entryIdMatch = importOutput.match(/ENTRY_ID=([a-zA-Z0-9]+)/);
    if (entryIdMatch) {
      entryId = entryIdMatch[1];
    }

    // Load .env to get space and environment IDs for generating the Contentful UI link
    let spaceId = "";
    let environmentId = "master";
    try {
      const envPath = path.join(__dirname, "..", ".env");
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf8");
        envContent.split("\n").forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) return;
          const match = trimmed.match(/^([A-Z_]+)=(.*)$/);
          if (match) {
            const [, key, value] = match;
            if (key === "CONTENTFUL_SPACE_ID") spaceId = value;
            if (key === "CONTENTFUL_ENVIRONMENT_ID") environmentId = value;
          }
        });
      }
    } catch (error) {
      // If we can't read .env, just skip the link
    }

    // Success!
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
      const entriesUrl = `https://app.contentful.com/spaces/${spaceId}/environments/${environmentId}/entries`;
      const contentTypeUrl = `${entriesUrl}?contentTypeId=${CONTENT_TYPE}&order.fieldId=sys.createdAt&order.direction=descending`;

      console.log("\n🔗 View your content in Contentful:");
      console.log(`   ${contentTypeUrl}`);
      console.log(
        "\n💡 Tip: The entry will be at the top (sorted by newest first)\n"
      );
    } else {
      console.log("\n💡 Check your Contentful space to see the new entry!\n");
    }
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
