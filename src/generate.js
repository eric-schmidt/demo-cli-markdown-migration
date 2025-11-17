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

// Parse title field parameter
const titleFieldIndex = args.indexOf("--title-field");
let TITLE_FIELD = null;

if (titleFieldIndex !== -1 && args[titleFieldIndex + 1]) {
  TITLE_FIELD = args[titleFieldIndex + 1];
}

// Parse body field parameter
const bodyFieldIndex = args.indexOf("--body-field");
let BODY_FIELD = null;

if (bodyFieldIndex !== -1 && args[bodyFieldIndex + 1]) {
  BODY_FIELD = args[bodyFieldIndex + 1];
}

// Show help if requested
if (HELP_MODE) {
  console.log(`
📝 Contentful Markdown Import Generator
========================================

Usage: node src/generate.js [options]

Options:
  --url <url>           URL of the markdown file to import
                        Can be a GitHub raw URL, Contentful asset URL, or any publicly
                        accessible markdown file URL
                        If not provided, will prompt interactively

  --content-type <id>   Content type ID to import into (e.g., 'post', 'article')
                        REQUIRED - If not provided, will prompt interactively

  --title-field <id>    Field ID for the entry title (e.g., 'internalTitle', 'title')
                        REQUIRED - If not provided, will prompt interactively

  --title <title>       Value for the entry title
                        If not provided, will prompt interactively and can be
                        left blank to auto-generate from the markdown filename

  --body-field <id>     Field ID for the markdown body (e.g., 'markdown', 'body')
                        REQUIRED - If not provided, will prompt interactively

  --help, -h            Show this help message

Examples:
  # Generate import with all parameters specified
  node src/generate.js \\
    --url https://raw.githubusercontent.com/user/repo/main/doc.md \\
    --content-type article \\
    --title-field internalTitle \\
    --title "My Article" \\
    --body-field markdown

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
async function generateImport(
  markdownUrl,
  contentType,
  titleField,
  entryTitle,
  bodyField
) {
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
  let titleValue = entryTitle;

  if (!titleValue || !titleValue.trim()) {
    // Try to extract title from first H1 heading
    const titleMatch = md.match(/^#\s+(.+?)\s*$/m);
    if (titleMatch) {
      titleValue = titleMatch[1].trim();
    } else {
      // Fall back to filename from URL
      titleValue = getFilenameFromUrl(markdownUrl);
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

  // Build fields object dynamically using the provided field IDs
  const fields = {
    [titleField]: { "en-US": titleValue },
    [bodyField]: { "en-US": md },
  };

  // The CLI import format mirrors export structure
  // Top-level arrays: contentTypes, entries, assets, locales, etc.
  const importDoc = {
    contentTypes: [],
    entries: [
      {
        sys: PUBLISH ? { ...entrySys, publishedVersion: 1 } : entrySys,
        fields: fields,
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
  console.log(`   Title Field: "${titleField}"`);
  console.log(`   Title Value: "${titleValue}"`);
  console.log(`   Body Field: "${bodyField}"`);
  console.log(`   Publish on import: ${PUBLISH}`);
  console.log(
    `\n💡 Next step: Run 'npm run import' to import to Contentful.\n`
  );
}

// Main execution
async function main() {
  try {
    // If any required parameters are missing, prompt for them
    // Note: ENTRY_TITLE is optional and will be auto-generated if not provided
    if (
      !CONTENT_TYPE ||
      !TITLE_FIELD ||
      !BODY_FIELD ||
      !MARKDOWN_URL
    ) {
      console.log("\n📦 Generate Contentful Import File");
      console.log("─".repeat(60) + "\n");

      // Prompt 1: Content Type ID
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

      // Prompt 2: Title Field ID (REQUIRED)
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

      // Prompt 3: Entry Title (will apply filename default later if empty)
      if (!ENTRY_TITLE) {
        const titlePrompt = `📌 Enter the entry title (leave blank to auto-generate from filename): `;
        ENTRY_TITLE = await question(titlePrompt);
        // Note: We'll apply the filename default after getting the URL if this is empty
      }

      // Prompt 4: Body Field ID (REQUIRED)
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

      // Prompt 5: Markdown URL (last)
      if (!MARKDOWN_URL) {
        MARKDOWN_URL = await question("📎 Enter the markdown URL: ");

        if (!MARKDOWN_URL || !MARKDOWN_URL.trim()) {
          console.error("\n❌ Error: Markdown URL is required\n");
          rl.close();
          process.exit(1);
        }
      }

      // Now that we have the URL, apply filename default for title if needed
      if (!ENTRY_TITLE || !ENTRY_TITLE.trim()) {
        const defaultTitle = getFilenameFromUrl(MARKDOWN_URL);
        ENTRY_TITLE = defaultTitle;
        console.log(`   Using auto-generated title: "${defaultTitle}"`);
      }

      console.log("\n" + "─".repeat(60));
    }

    // Validate all required fields are present
    if (!CONTENT_TYPE || !TITLE_FIELD || !BODY_FIELD || !MARKDOWN_URL) {
      console.error(
        "\n❌ Error: Missing required parameters. Use --help for usage information.\n"
      );
      rl.close();
      process.exit(1);
    }

    // Auto-generate ENTRY_TITLE if not provided (even when running non-interactively)
    if (!ENTRY_TITLE || !ENTRY_TITLE.trim()) {
      const defaultTitle = getFilenameFromUrl(MARKDOWN_URL);
      ENTRY_TITLE = defaultTitle;
      console.log(`\n📌 Using auto-generated title: "${defaultTitle}"`);
    }

    await generateImport(
      MARKDOWN_URL,
      CONTENT_TYPE,
      TITLE_FIELD,
      ENTRY_TITLE,
      BODY_FIELD
    );
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
