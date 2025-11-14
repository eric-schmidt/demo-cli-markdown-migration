/**
 * Generate Contentful Import File from Markdown URL
 *
 * Usage: node src/generate-import-file.js <markdown-url>
 *
 * Takes a markdown URL, fetches the content, and generates a Contentful-compatible
 * import.json file that can be imported using the Contentful CLI.
 */

const fs = require("fs");

// Get URL from command line
const MARKDOWN_URL = process.argv[2];

if (!MARKDOWN_URL) {
  console.error(`
❌ Error: Missing required URL parameter

Usage: node src/generate-import-file.js <markdown-url>

Example:
  node src/generate-import-file.js https://raw.githubusercontent.com/user/repo/main/doc.md
`);
  process.exit(1);
}

async function generateImport() {
  try {
    // Fetch markdown from URL
    console.log(`\nFetching markdown from: ${MARKDOWN_URL}`);
    const response = await fetch(MARKDOWN_URL);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch markdown: ${response.status} ${response.statusText}`
      );
    }

    const md = await response.text();
    console.log(`✓ Successfully fetched ${md.length} characters\n`);

    // Extract title from first H1 or use fallback
    const titleMatch = md.match(/^#\s+(.+?)\s*$/m);
    const internalTitle = titleMatch
      ? titleMatch[1].trim()
      : "Untitled Markdown Import";

    // Build import JSON for Contentful CLI
    const importDoc = {
      contentTypes: [],
      entries: [
        {
          sys: {
            type: "Entry",
            contentType: {
              sys: { type: "Link", linkType: "ContentType", id: "post" },
            },
            publishedVersion: 1, // Auto-publish on import
          },
          fields: {
            internalTitle: { "en-US": internalTitle },
            markdown: { "en-US": md },
          },
        },
      ],
      assets: [],
      locales: [],
    };

    // Write to file
    fs.writeFileSync(
      "./import.json",
      JSON.stringify(importDoc, null, 2),
      "utf8"
    );

    console.log("✅ import.json successfully generated!");
    console.log(`   Title: "${internalTitle}"`);
    console.log(`   File: ./import.json\n`);
    console.log("Next step: Import to Contentful using:");
    console.log(
      "  contentful space import --space-id <SPACE_ID> --environment-id <ENV_ID> --content-file import.json\n"
    );
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

generateImport();
