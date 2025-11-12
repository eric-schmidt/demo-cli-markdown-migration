#!/usr/bin/env node

// validate.js - Interactive wrapper for generate-import-file.js (validation mode)
const { execSync } = require("child_process");
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

async function main() {
  console.log("\n🔍 Validate Markdown & Generate Import File");
  console.log("─".repeat(60) + "\n");

  try {
    // 1. Prompt for URL
    const url = await question("📎 Enter the markdown URL: ");

    if (!url || !url.trim()) {
      console.error("\n❌ Error: URL is required\n");
      rl.close();
      process.exit(1);
    }

    console.log("");

    // 2. Ask about exporting errors
    const shouldExportErrors = await confirm("📄 Export validation errors to CSV?");

    console.log("\n" + "─".repeat(60));
    console.log("\n⚙️  Configuration:");
    console.log(`   URL: ${url}`);
    console.log(`   Mode: Validate & Generate`);
    console.log(`   Validation: ✅ Enabled`);
    console.log(
      `   Export Errors: ${shouldExportErrors ? "✅ Enabled" : "❌ Disabled"}`
    );
    console.log("");

    // Build the command (always includes --validate)
    let command = `node src/generate-import-file.js --url "${url}" --validate`;

    if (shouldExportErrors) {
      command += " --export-errors";
    }

    console.log("🚀 Running command:");
    console.log(`   ${command}\n`);
    console.log("─".repeat(60) + "\n");

    // Execute the command
    execSync(command, { stdio: "inherit" });

    console.log("\n" + "─".repeat(60));
    console.log("\n✅ Validation completed!");
    console.log("\n💡 Next step: Run 'npm run import' to import to Contentful.\n");
  } catch (error) {
    console.error("\n" + "─".repeat(60));
    console.error("\n❌ Validation failed or error occurred:");
    if (error.message) {
      console.error(`   ${error.message}\n`);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log("\n\n👋 Operation cancelled by user.\n");
  rl.close();
  process.exit(0);
});

// Run the interactive script
main();

