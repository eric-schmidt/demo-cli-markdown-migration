#!/usr/bin/env node

// generate.js - Generate Contentful import file from markdown URL
const fs = require("fs");
const path = require("path");
const {
  createInterface,
  question,
  promptRequired,
} = require("./utils/prompts");
const { getFilenameFromUrl } = require("./utils/url-helpers");
const { parseArgument, hasFlag } = require("./utils/arg-parser");
const { DEFAULT_LOCALE } = require("./utils/constants");

const rl = createInterface();

// Parse command line arguments
const args = process.argv.slice(2);
const HELP_MODE = hasFlag(args, "--help", "-h");

let MARKDOWN_URL = parseArgument(args, "--url");
let CONTENT_TYPE = parseArgument(args, "--content-type");
let ENTRY_TITLE = parseArgument(args, "--title");
let TITLE_FIELD = parseArgument(args, "--title-field");
let BODY_FIELD = parseArgument(args, "--body-field");

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

  --body-field <id>     Field ID for the markdown body (e.g., 'body', 'content')
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
 * Extracts title from markdown content
 * Priority: user-provided > first H1 heading > filename-based generation
 * @param {string} markdown - Markdown content
 * @param {string} url - URL of the markdown file
 * @param {string} providedTitle - Title provided by user (may be empty)
 * @returns {string} The determined title
 */
function determineTitle(markdown, url, providedTitle) {
  // Use provided title if available
  if (providedTitle && providedTitle.trim()) {
    return providedTitle;
  }

  // Try to extract title from first H1 heading
  const titleMatch = markdown.match(/^#\s+(.+?)\s*$/m);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  // Fall back to filename from URL
  return getFilenameFromUrl(url);
}

/**
 * Builds the Contentful import document structure
 * @param {Object} options - Import options
 * @param {string} options.contentType - Content type ID
 * @param {string} options.titleField - Field ID for title
 * @param {string} options.titleValue - Title value
 * @param {string} options.bodyField - Field ID for markdown body
 * @param {string} options.markdown - Markdown content
 * @returns {Object} Contentful import document
 */
function buildImportDocument({
  contentType,
  titleField,
  titleValue,
  bodyField,
  markdown,
}) {
  const entrySys = {
    type: "Entry",
    contentType: {
      sys: { type: "Link", linkType: "ContentType", id: contentType },
    },
  };

  // Build fields object dynamically using the provided field IDs
  const fields = {
    [titleField]: { [DEFAULT_LOCALE]: titleValue },
    [bodyField]: { [DEFAULT_LOCALE]: markdown },
  };

  // The CLI import format mirrors export structure
  return {
    contentTypes: [],
    entries: [
      {
        sys: entrySys,
        fields: fields,
      },
    ],
    assets: [],
    locales: [],
  };
}

/**
 * Writes the import document to the outputs directory
 * @param {Object} importDoc - The import document to write
 * @returns {string} Path to the written file
 */
function writeImportFile(importDoc) {
  // Ensure outputs directory exists
  const outputDir = path.join(__dirname, "..", "outputs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write file
  const outputPath = path.join(outputDir, "import.json");
  fs.writeFileSync(outputPath, JSON.stringify(importDoc, null, 2), "utf8");

  return outputPath;
}

/**
 * Fetches markdown content from a URL and generates Contentful import file
 * @param {Object} options - Generation options
 * @returns {Promise<void>}
 */
async function generateImport({
  markdownUrl,
  contentType,
  titleField,
  entryTitle,
  bodyField,
}) {
  // Fetch markdown from URL
  console.log(`\n📥 Fetching markdown from: ${markdownUrl}`);
  const response = await fetch(markdownUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch markdown: ${response.status} ${response.statusText}`
    );
  }

  const markdown = await response.text();
  console.log(`✅ Successfully fetched ${markdown.length} characters\n`);

  // Determine the title to use
  const titleValue = determineTitle(markdown, markdownUrl, entryTitle);

  // Build import JSON
  const importDoc = buildImportDocument({
    contentType,
    titleField,
    titleValue,
    bodyField,
    markdown,
  });

  // Write to file
  writeImportFile(importDoc);

  console.log("✅ import.json successfully generated!");
  console.log(`   Location: outputs/import.json`);
  console.log(`   Content Type: "${contentType}"`);
  console.log(`   Title Field: "${titleField}"`);
  console.log(`   Title Value: "${titleValue}"`);
  console.log(`   Body Field: "${bodyField}"`);
  console.log(
    `\n💡 Next step: Run 'npm run import' to import to Contentful.\n`
  );
}

/**
 * Checks if any required parameters are missing
 * @returns {boolean} True if parameters need to be collected interactively
 */
function needsInteractiveInput() {
  return !CONTENT_TYPE || !TITLE_FIELD || !BODY_FIELD || !MARKDOWN_URL;
}

/**
 * Collects required parameters through interactive prompts
 * @returns {Promise<void>}
 */
async function collectParameters() {
  console.log("\n📦 Generate Contentful Import File");
  console.log("─".repeat(60) + "\n");

  // Prompt 1: Markdown URL
  if (!MARKDOWN_URL) {
    MARKDOWN_URL = await promptRequired(
      rl,
      "📎 Enter the markdown URL: ",
      "Markdown URL"
    );
  }

  // Prompt 2: Content Type ID
  if (!CONTENT_TYPE) {
    CONTENT_TYPE = await promptRequired(
      rl,
      "📝 Enter the content type ID (e.g., 'post', 'article'): ",
      "Content type ID"
    );
  }

  // Prompt 3: Title Field ID
  if (!TITLE_FIELD) {
    TITLE_FIELD = await promptRequired(
      rl,
      "🏷️  Enter the title field ID (e.g., 'internalTitle', 'title'): ",
      "Title field ID"
    );
  }

  // Prompt 4: Entry Title (optional - auto-generation handled here)
  if (!ENTRY_TITLE) {
    const titlePrompt = `📌 Enter the entry title (leave blank to auto-generate): `;
    ENTRY_TITLE = await question(rl, titlePrompt);
    // Auto-generation will be handled by generate.js
    if (!ENTRY_TITLE || !ENTRY_TITLE.trim()) {
      ENTRY_TITLE = ""; // Will be auto-generated by generate.js
      console.log(
        `   Title will be auto-generated from markdown content or filename`
      );
    }
  }

  // Prompt 5: Body Field ID
  if (!BODY_FIELD) {
    BODY_FIELD = await promptRequired(
      rl,
      "📄 Enter the body field ID (e.g., 'body', 'content'): ",
      "Body field ID"
    );
  }

  console.log("\n" + "─".repeat(60));
}

/**
 * Validates all required parameters are present
 * @throws {Error} If required parameters are missing
 */
function validateParameters() {
  if (!CONTENT_TYPE || !TITLE_FIELD || !BODY_FIELD || !MARKDOWN_URL) {
    throw new Error(
      "Missing required parameters. Use --help for usage information."
    );
  }
}

/**
 * Auto-generates title if not provided (for non-interactive mode)
 */
function autoGenerateTitle() {
  if (!ENTRY_TITLE || !ENTRY_TITLE.trim()) {
    const defaultTitle = getFilenameFromUrl(MARKDOWN_URL);
    ENTRY_TITLE = defaultTitle;
    console.log(`\n📌 Using auto-generated title: "${defaultTitle}"`);
  }
}

// Main execution
async function main() {
  try {
    // Collect parameters interactively if any are missing
    if (needsInteractiveInput()) {
      await collectParameters();
    }

    // Validate all required fields are present
    validateParameters();

    // Auto-generate title if needed (for non-interactive mode)
    autoGenerateTitle();

    await generateImport({
      markdownUrl: MARKDOWN_URL,
      contentType: CONTENT_TYPE,
      titleField: TITLE_FIELD,
      entryTitle: ENTRY_TITLE,
      bodyField: BODY_FIELD,
    });
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
