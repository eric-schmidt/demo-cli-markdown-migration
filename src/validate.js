/**
 * Validate Markdown from URL
 *
 * Usage: node src/validate.js <markdown-url>
 *
 * Validates markdown structure and exports issues to a CSV file with line numbers.
 * Checks for: broken links, broken images, missing alt text, multiple H1s, etc.
 */

const fs = require("fs");
const { marked } = require("marked");

// Get URL from command line
const MARKDOWN_URL = process.argv[2];

if (!MARKDOWN_URL) {
  console.error(`
❌ Error: Missing required URL parameter

Usage: node src/validate.js <markdown-url>

Example:
  node src/validate.js https://raw.githubusercontent.com/user/repo/main/doc.md
`);
  process.exit(1);
}

/**
 * Finds the line number for a given substring in the markdown
 */
function findLineNumber(markdown, searchText) {
  const index = markdown.indexOf(searchText);
  if (index === -1) return null;

  const beforeText = markdown.substring(0, index);
  const lineNumber = beforeText.split("\n").length;
  return lineNumber;
}

/**
 * Validates markdown and collects issues with line numbers
 */
function validateMarkdown(md, internalTitle) {
  const issues = [];

  console.log("\n" + "=".repeat(60));
  console.log("📋 MARKDOWN VALIDATION REPORT");
  console.log("=".repeat(60) + "\n");

  // Basic metrics
  const lineCount = md.split("\n").length;
  const wordCount = md.split(/\s+/).length;
  console.log("📊 Document Metrics:");
  console.log(`   Characters: ${md.length.toLocaleString()}`);
  console.log(`   Lines: ${lineCount.toLocaleString()}`);
  console.log(`   Words: ${wordCount.toLocaleString()}`);
  console.log(`   Title: "${internalTitle}"\n`);

  // Parse markdown
  let tokens;
  try {
    tokens = marked.lexer(md);
    console.log("✅ Markdown syntax is valid\n");
  } catch (error) {
    console.error("❌ Markdown parsing failed:", error.message);
    issues.push({
      type: "Critical",
      category: "Parse Error",
      line: 0,
      element: "N/A",
      description: error.message,
      additionalInfo: "",
    });
    return { tokens: [], issues };
  }

  // Extract all content elements
  const headings = tokens.filter((t) => t.type === "heading");
  const images = tokens.filter((t) => t.type === "image");
  const links = [];

  const extractLinks = (tokenList) => {
    tokenList.forEach((token) => {
      if (token.type === "link") {
        links.push(token);
      }
      if (token.tokens) {
        extractLinks(token.tokens);
      }
    });
  };
  extractLinks(tokens);

  console.log("🔍 Content Analysis:");
  console.log(`   Headings: ${headings.length}`);
  console.log(`   Images: ${images.length}`);
  console.log(`   Links: ${links.length}\n`);

  console.log("⚠️  Quality Checks:\n");

  // Check for multiple H1s
  const h1Headings = headings.filter((h) => h.depth === 1);
  if (h1Headings.length > 1) {
    console.log(`   ⚠️  Multiple H1 headings found (${h1Headings.length})`);
    h1Headings.forEach((h1) => {
      const h1Text = h1.text || "(no text)";
      const searchPattern = `# ${h1Text}`;
      const lineNumber = findLineNumber(md, searchPattern);

      issues.push({
        type: "Warning",
        category: "Multiple H1",
        line: lineNumber || "Unknown",
        element: searchPattern,
        description: "Multiple H1 headings found (SEO concern)",
        additionalInfo: `Total H1s: ${h1Headings.length}`,
      });
    });
  } else {
    console.log("   ✅ Single H1 heading");
  }

  // Check for broken images
  const brokenImages = images.filter(
    (img) => !img.href || img.href.trim() === ""
  );
  if (brokenImages.length > 0) {
    console.log(`   ❌ ${brokenImages.length} broken image(s)`);
    brokenImages.forEach((img) => {
      const altText = img.text || "(no alt text)";
      const searchPattern = `![${img.text || ""}]()`;
      const lineNumber = findLineNumber(md, searchPattern);

      issues.push({
        type: "Critical",
        category: "Broken Image",
        line: lineNumber || "Unknown",
        element: searchPattern,
        description: "Image has empty URL",
        additionalInfo: `Alt: "${altText}"`,
      });
    });
  } else if (images.length > 0) {
    console.log("   ✅ All images have URLs");
  }

  // Check for missing alt text
  const imagesNoAlt = images.filter(
    (img) => !img.text || img.text.trim() === ""
  );
  if (imagesNoAlt.length > 0) {
    console.log(`   ⚠️  ${imagesNoAlt.length} image(s) missing alt text`);
    imagesNoAlt.forEach((img) => {
      const searchPattern = `![](${img.href || ""})`;
      const lineNumber = findLineNumber(md, searchPattern);

      issues.push({
        type: "Warning",
        category: "Missing Alt Text",
        line: lineNumber || "Unknown",
        element: searchPattern,
        description: "Image is missing alt text (accessibility issue)",
        additionalInfo: `URL: "${img.href || "(no URL)"}"`,
      });
    });
  } else if (images.length > 0) {
    console.log("   ✅ All images have alt text");
  }

  // Check for broken links
  const brokenLinks = links.filter(
    (link) => !link.href || link.href.trim() === ""
  );
  if (brokenLinks.length > 0) {
    console.log(`   ❌ ${brokenLinks.length} broken link(s)`);
    brokenLinks.forEach((link) => {
      const linkText = link.text || "(no text)";
      const searchPattern = `[${linkText}]()`;
      const lineNumber = findLineNumber(md, searchPattern);

      issues.push({
        type: "Critical",
        category: "Broken Link",
        line: lineNumber || "Unknown",
        element: searchPattern,
        description: "Link has empty URL",
        additionalInfo: `Text: "${linkText}"`,
      });
    });
  } else if (links.length > 0) {
    console.log("   ✅ All links have URLs");
  }

  console.log("\n" + "=".repeat(60) + "\n");

  return { tokens, issues };
}

/**
 * Exports issues to CSV with line numbers
 */
function exportToCSV(issues, filename = "validation-errors.csv") {
  if (issues.length === 0) {
    console.log("✅ No issues found - validation passed!\n");
    return;
  }

  // CSV header
  const headers = [
    "Type",
    "Category",
    "Line",
    "Element",
    "Description",
    "Additional Info",
  ];

  // Escape CSV values
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes('"') || str.includes(",") || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Convert issues to CSV rows
  const rows = issues.map((issue) => {
    return [
      escapeCSV(issue.type),
      escapeCSV(issue.category),
      escapeCSV(issue.line),
      escapeCSV(issue.element),
      escapeCSV(issue.description),
      escapeCSV(issue.additionalInfo),
    ].join(",");
  });

  // Write CSV file
  const csvContent = [headers.join(","), ...rows].join("\n");
  fs.writeFileSync(filename, csvContent, "utf8");

  console.log(`📄 Issues exported to: ${filename}`);
  console.log(`   Total issues: ${issues.length}`);

  // Summary by type
  const critical = issues.filter((i) => i.type === "Critical").length;
  const warnings = issues.filter((i) => i.type === "Warning").length;
  console.log(`   Critical: ${critical}`);
  console.log(`   Warnings: ${warnings}\n`);
}

async function main() {
  try {
    // Fetch markdown
    console.log(`\nFetching markdown from: ${MARKDOWN_URL}`);
    const response = await fetch(MARKDOWN_URL);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch markdown: ${response.status} ${response.statusText}`
      );
    }

    const md = await response.text();
    console.log(`✓ Successfully fetched ${md.length} characters`);

    // Extract title
    const titleMatch = md.match(/^#\s+(.+?)\s*$/m);
    const internalTitle = titleMatch
      ? titleMatch[1].trim()
      : "Untitled Document";

    // Validate markdown
    const { issues } = validateMarkdown(md, internalTitle);

    // Export to CSV
    exportToCSV(issues);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

main();
