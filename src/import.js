#!/usr/bin/env node

// import-to-contentful.js
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env file
function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");

  if (!fs.existsSync(envPath)) {
    console.error(`
❌ Error: .env file not found

Please create a .env file with the following content:

CONTENTFUL_SPACE_ID=your-space-id-here
CONTENTFUL_ENVIRONMENT_ID=master

Example:
  cp env.example .env
  # Then edit .env with your Contentful credentials
`);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  const envVars = {};

  envContent.split("\n").forEach((line) => {
    // Skip empty lines and comments
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    // Parse KEY=VALUE
    const match = trimmed.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      envVars[key] = value;
    }
  });

  return envVars;
}

// Main function
function importToContentful() {
  console.log("📦 Starting Contentful import process...\n");

  // Check if import.json exists
  const importFilePath = path.join(__dirname, "..", "outputs", "import.json");
  if (!fs.existsSync(importFilePath)) {
    console.error(`
❌ Error: outputs/import.json not found

Please generate the import file first by running:
  npm run generate

Or:
  node src/generate.js --url <markdown-url>
`);
    process.exit(1);
  }

  // Load environment variables
  const envVars = loadEnvFile();
  const { CONTENTFUL_SPACE_ID, CONTENTFUL_ENVIRONMENT_ID } = envVars;

  // Validate required environment variables
  if (!CONTENTFUL_SPACE_ID) {
    console.error("❌ Error: CONTENTFUL_SPACE_ID not found in .env file");
    process.exit(1);
  }

  if (!CONTENTFUL_ENVIRONMENT_ID) {
    console.error("❌ Error: CONTENTFUL_ENVIRONMENT_ID not found in .env file");
    process.exit(1);
  }

  console.log(`🔧 Configuration:`);
  console.log(`   Space ID: ${CONTENTFUL_SPACE_ID}`);
  console.log(`   Environment: ${CONTENTFUL_ENVIRONMENT_ID}`);
  console.log(`   Import File: outputs/import.json\n`);

  // Check if contentful-cli is installed
  try {
    execSync("contentful --version", { stdio: "ignore" });
  } catch (error) {
    console.error(`
❌ Error: Contentful CLI not found

Please install the Contentful CLI globally:
  npm install -g contentful-cli

Or use npx to run it without installing:
  npx contentful-cli space import --space-id ${CONTENTFUL_SPACE_ID} --environment-id ${CONTENTFUL_ENVIRONMENT_ID} --content-file outputs/import.json
`);
    process.exit(1);
  }

  // Build the contentful CLI command
  const commandArgs = [
    "space",
    "import",
    "--space-id",
    CONTENTFUL_SPACE_ID,
    "--environment-id",
    CONTENTFUL_ENVIRONMENT_ID,
    "--content-file",
    "outputs/import.json",
  ];

  console.log(`🚀 Running command:`);
  console.log(
    `   contentful ${commandArgs.join(" ")}\n`
  );
  console.log("─".repeat(60) + "\n");

  // Use spawn to capture output while displaying it
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
    if (code !== 0) {
      console.error("\n" + "─".repeat(60));
      console.error("\n❌ Import failed. Check the error messages above.\n");
      process.exit(1);
    }

    console.log("\n" + "─".repeat(60));
    console.log("\n✅ Import completed successfully!");

    // Combine stdout and stderr for pattern matching
    const combinedOutput = output + "\n" + errorOutput;

    // Try to extract entry ID from the output
    let entryId = null;

    // Try multiple patterns to extract entry ID from CLI output
    const patterns = [
      /(?:Created|Published|Updated)\s+Entry\s+([a-zA-Z0-9]+)/i,
      /entry[:\s]+([a-zA-Z0-9]{20,})/i, // Generic "entry: ID" pattern
      /"id":\s*"([a-zA-Z0-9]{20,})"/, // JSON format
      /sys\.id[:\s]+([a-zA-Z0-9]{20,})/i, // sys.id pattern
    ];

    for (const pattern of patterns) {
      const match = combinedOutput.match(pattern);
      if (match && match[1]) {
        entryId = match[1];
        break;
      }
    }

    // If we still don't have an entry ID, try reading the import.json
    if (!entryId) {
      try {
        const importData = JSON.parse(
          fs.readFileSync(importFilePath, "utf8")
        );
        if (importData.entries && importData.entries.length > 0) {
          console.log(
            "\n💡 Entry imported successfully (ID not captured from CLI output)"
          );
        }
      } catch (e) {
        // Ignore read errors
      }
    }

    // If we found an entry ID, output it in a machine-readable format
    if (entryId) {
      console.log(`\n📝 ENTRY_ID=${entryId}`);
    }

    console.log("");
  });

  child.on("error", (error) => {
    console.error(
      "\n❌ Failed to start import process:",
      error.message,
      "\n"
    );
    process.exit(1);
  });
}

// Run the import
importToContentful();
