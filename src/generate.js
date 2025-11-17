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

// Helper function to extract and format filename from URL
function getFilenameFromUrl(url) {
  try {
    // Extract the filename from the URL path
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop();

    // Remove extension and format as a title
    const nameWithoutExt = filename.replace(/\.(md|markdown)$/i, "");

    // Convert dashes/underscores to spaces and capitalize words
    const formattedName = nameWithoutExt
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();

    return formattedName || "Untitled Markdown Import";
  } catch (error) {
    return "Untitled Markdown Import";
  }
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

// Parse content type parameter
const contentTypeIndex = args.indexOf("--content-type");
let CONTENT_TYPE = null;

if (contentTypeIndex !== -1 && args[contentTypeIndex + 1]) {
  CONTENT_TYPE = args[contentTypeIndex + 1];
}

// Parse title parameter
const titleIndex = args.indexOf("--title");
let ENTRY_TITLE = null;

if (titleIndex !== -1 && args[titleIndex + 1]) {
  ENTRY_TITLE = args[titleIndex + 1];
}

// Show help if requested
if (HELP_MODE) {
  console.log(`
📝 Contentful Markdown Import Generator
========================================

Usage: node src/generate.js [--url <markdown-url>] [--content-type <type-id>] [--title <entry-title>]

Options:
  --url <url>           URL of the markdown file to import
                        Can be a GitHub raw URL, Contentful asset URL, or any publicly
                        accessible markdown file URL
                        If not provided, will prompt interactively

  --content-type <id>   Content type ID to import into (e.g., 'post', 'article')
                        If not provided, will prompt interactively

  --title <title>       Title for the entry
                        If not provided, will prompt interactively with a default
                        based on the markdown filename

  --help, -h            Show this help message

Examples:
  # Generate import from GitHub URL with specific content type and title
  node src/generate.js --url https://raw.githubusercontent.com/user/repo/main/doc.md --content-type article --title "My Article"

  # Generate import with interactive prompts
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
async function generateImport(markdownUrl, contentType, entryTitle) {
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

  // 2) Use provided title, or derive from first H1, or fall back to filename-based default
  let internalTitle = entryTitle;

  if (!internalTitle || !internalTitle.trim()) {
    // Try to extract title from first H1 heading
    const titleMatch = md.match(/^#\s+(.+?)\s*$/m);
    if (titleMatch) {
      internalTitle = titleMatch[1].trim();
    } else {
      // Fall back to filename from URL
      internalTitle = getFilenameFromUrl(markdownUrl);
    }
  }

  // 3) Build import JSON (entries will be published on import)
  const PUBLISH = true;

  const entrySys = {
    type: "Entry",
    contentType: {
      sys: { type: "Link", linkType: "ContentType", id: contentType },
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
  console.log(`   Content Type: "${contentType}"`);
  console.log(`   Title: "${internalTitle}"`);
  console.log(`   Publish on import: ${PUBLISH}`);
  console.log(
    `\n💡 Next step: Run 'npm run import' to import to Contentful.\n`
  );
}

// Main execution
async function main() {
  try {
    // If URL, content type, or title not provided via CLI, prompt for them
    if (!MARKDOWN_URL || !CONTENT_TYPE || !ENTRY_TITLE) {
      console.log("\n📦 Generate Contentful Import File");
      console.log("─".repeat(60) + "\n");

      if (!MARKDOWN_URL) {
        MARKDOWN_URL = await question("📎 Enter the markdown URL: ");

        if (!MARKDOWN_URL || !MARKDOWN_URL.trim()) {
          console.error("\n❌ Error: URL is required\n");
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

      if (!ENTRY_TITLE) {
        // Generate a default title suggestion from the filename
        const defaultTitle = getFilenameFromUrl(MARKDOWN_URL);
        const titlePrompt = `📌 Enter the entry title (default: "${defaultTitle}"): `;

        ENTRY_TITLE = await question(titlePrompt);

        // If user didn't provide a title, use the default
        if (!ENTRY_TITLE || !ENTRY_TITLE.trim()) {
          ENTRY_TITLE = defaultTitle;
          console.log(`   Using default: "${defaultTitle}"`);
        }
      }

      console.log("\n" + "─".repeat(60));
    }

    await generateImport(MARKDOWN_URL, CONTENT_TYPE, ENTRY_TITLE);
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
