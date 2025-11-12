#!/usr/bin/env node

// generate.js - Interactive wrapper for generate-import-file.js (generation only)
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

async function main() {
  console.log("\n📦 Generate Contentful Import File");
  console.log("─".repeat(60) + "\n");

  try {
    // Prompt for URL
    const url = await question("📎 Enter the markdown URL: ");

    if (!url || !url.trim()) {
      console.error("\n❌ Error: URL is required\n");
      rl.close();
      process.exit(1);
    }

    console.log("\n" + "─".repeat(60));
    console.log("\n⚙️  Configuration:");
    console.log(`   URL: ${url}`);
    console.log(`   Mode: Generate import.json`);
    console.log("");

    // Build the command (no validation)
    const command = `node src/generate-import-file.js --url "${url}"`;

    console.log("🚀 Running command:");
    console.log(`   ${command}\n`);
    console.log("─".repeat(60) + "\n");

    // Execute the command
    execSync(command, { stdio: "inherit" });

    console.log("\n" + "─".repeat(60));
    console.log("\n✅ Generation completed!");
    console.log("\n💡 Tip: Use 'npm run validate' to check markdown quality before importing.\n");
  } catch (error) {
    console.error("\n" + "─".repeat(60));
    console.error("\n❌ An error occurred:");
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

