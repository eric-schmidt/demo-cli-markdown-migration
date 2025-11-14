#!/usr/bin/env node

// generate.js - Generate Contentful import file from markdown URL
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

// Parse command line arguments
const args = process.argv.slice(2);
const HELP_MODE = args.includes("--help") || args.includes("-h");

// Parse URL parameter
const urlIndex = args.indexOf("--url");
let MARKDOWN_URL = null;

if (urlIndex !== -1 && args[urlIndex + 1]) {
  MARKDOWN_URL = args[urlIndex + 1];
}

// Show help if requested
if (HELP_MODE) {
  console.log(`
📝 Contentful Markdown Import Generator
========================================

Usage: node src/generate.js [--url <markdown-url>]

Options:
  --url <url>   URL of the markdown file to import
                Can be a GitHub raw URL, Contentful asset URL, or any publicly
                accessible markdown file URL
                If not provided, will prompt interactively

  --help, -h    Show this help message

Examples:
  # Generate import from GitHub URL
  node src/generate.js --url https://raw.githubusercontent.com/user/repo/main/doc.md

  # Generate import with interactive prompt
  node src/generate.js

  # Or use the npm script
  npm run generate

Features:
  ✓ Fetches markdown from any public URL
  ✓ Derives title from first H1 heading
  ✓ Generates Contentful CLI import format
  ✓ Creates entries in published state

Output: outputs/import.json (ready for 'npm run import')

Tip: Use 'npm run validate' to check markdown quality before importing.
`);
  process.exit(0);
}

/**
 * Generate import.json from markdown URL
 */
async function generateImport(markdownUrl) {
  // 1) Fetch markdown from URL
  console.log(`\n📥 Fetching markdown from: ${markdownUrl}`);
  const response = await fetch(markdownUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch markdown: ${response.status} ${response.statusText}`
    );
  }

  const md = await response.text();
  console.log(`✅ Successfully fetched ${md.length} characters\n`);

  // 2) Derive title from first H1 or fall back
  const titleMatch = md.match(/^#\s+(.+?)\s*$/m);
  const internalTitle = titleMatch
    ? titleMatch[1].trim()
    : "Untitled Markdown Import";

  // 3) Build import JSON (entries will be published on import)
  const PUBLISH = true;

  const entrySys = {
    type: "Entry",
    contentType: {
      sys: { type: "Link", linkType: "ContentType", id: "post" },
    },
  };

  // The CLI import format mirrors export structure
  // Top-level arrays: contentTypes, entries, assets, locales, etc.
  const importDoc = {
    contentTypes: [],
    entries: [
      {
        sys: PUBLISH ? { ...entrySys, publishedVersion: 1 } : entrySys,
        fields: {
          internalTitle: { "en-US": internalTitle },
          markdown: { "en-US": md },
        },
      },
    ],
    assets: [],
    locales: [],
  };

  // 4) Ensure outputs directory exists
  const outputDir = path.join(__dirname, "..", "outputs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 5) Write file
  const outputPath = path.join(outputDir, "import.json");
  fs.writeFileSync(outputPath, JSON.stringify(importDoc, null, 2), "utf8");

  console.log("✅ import.json successfully generated!");
  console.log(`   Location: outputs/import.json`);
  console.log(`   Title: "${internalTitle}"`);
  console.log(`   Publish on import: ${PUBLISH}`);
  console.log(`\n💡 Next step: Run 'npm run import' to import to Contentful.\n`);
}

// Main execution
async function main() {
  try {
    // If URL not provided via CLI, prompt for it
    if (!MARKDOWN_URL) {
      console.log("\n📦 Generate Contentful Import File");
      console.log("─".repeat(60) + "\n");

      MARKDOWN_URL = await question("📎 Enter the markdown URL: ");

      if (!MARKDOWN_URL || !MARKDOWN_URL.trim()) {
        console.error("\n❌ Error: URL is required\n");
        rl.close();
        process.exit(1);
      }

      console.log("\n" + "─".repeat(60));
    }

    await generateImport(MARKDOWN_URL);
  } catch (error) {
    console.error("\n❌ Error generating import:", error.message, "\n");
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

// Run the script
main();
