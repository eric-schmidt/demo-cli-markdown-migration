// TODO: See this Glean output: https://app.glean.com/chat/340189ce616f48908b126dcbe72f705f?qe=https://contentful-be.glean.com

// generate-import-file.js
const fs = require("fs");
const { marked } = require("marked");

// Parse command line arguments
const args = process.argv.slice(2);
const VALIDATE_MODE = args.includes("--validate");
const EXPORT_ERRORS = args.includes("--export-errors");
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

Usage: node generate-import-file.js --url <markdown-url> [options]

Required:
  --url <url>   URL of the markdown file to import
                Can be a GitHub raw URL, Contentful asset URL, or any publicly
                accessible markdown file URL

Options:
  --validate       Validate markdown structure and quality before generating import
                   Checks for syntax errors, broken links, missing alt text, etc.
                   Shows detailed validation report.
                   Exits with error if critical issues found.

  --export-errors  Export validation errors to CSV file (validation-errors.csv)
                   Includes line numbers, error types, and details for each issue.
                   Must be used with --validate flag.

  --help, -h       Show this help message

Examples:
  # Generate import from GitHub URL
  node generate-import-file.js --url https://raw.githubusercontent.com/user/repo/main/doc.md

  # Generate import from Contentful asset URL
  node generate-import-file.js --url https://assets.ctfassets.net/space/asset/file.md

  # Validate before generating
  node generate-import-file.js --url <url> --validate

Features:
  ✓ Fetches markdown from any public URL
  ✓ Validates markdown syntax using 'marked' parser
  ✓ Analyzes content structure (headings, images, links, code blocks)
  ✓ Checks for broken links and accessibility issues
  ✓ Generates Contentful CLI import format

Output: import.json (ready for 'contentful space import')
`);
  process.exit(0);
}

// Validate that URL was provided
if (!MARKDOWN_URL) {
  console.error(`
❌ Error: Missing required --url parameter

Usage: node generate-import-file.js --url <markdown-url> [options]

Example:
  node generate-import-file.js --url https://raw.githubusercontent.com/user/repo/main/doc.md

For more information, run:
  node generate-import-file.js --help
`);
  process.exit(1);
}

/**
 * Finds the line number for a given substring in the markdown
 */
function findLineNumber(markdown, searchText, startIndex = 0) {
  const index = markdown.indexOf(searchText, startIndex);
  if (index === -1) return null;

  const beforeText = markdown.substring(0, index);
  const lineNumber = beforeText.split("\n").length;
  return { lineNumber, index };
}

/**
 * Validates markdown structure and returns analysis results
 * Uses the 'marked' parser to analyze tokens and detect potential issues
 * Displays detailed validation report with metrics and quality checks
 */
function validateMarkdown(md, internalTitle) {
  const issues = [];
  const warnings = [];
  const detailedErrors = []; // Track errors with line numbers and details

  console.log("\n" + "=".repeat(60));
  console.log("📋 MARKDOWN VALIDATION REPORT");
  console.log("=".repeat(60) + "\n");

  // Basic metrics
  const lineCount = md.split("\n").length;
  const wordCount = md.split(/\s+/).length;
  console.log("📊 Document Metrics:");
  console.log(`   Characters: ${md.length.toLocaleString()}`);
  console.log(`   Lines: ${lineCount.toLocaleString()}`);
  console.log(`   Words (approx): ${wordCount.toLocaleString()}`);
  console.log(`   Title: "${internalTitle}"\n`);

  // Parse markdown with marked
  let tokens;
  try {
    tokens = marked.lexer(md);
    console.log("✅ Markdown syntax is valid and parseable\n");
  } catch (error) {
    console.error("❌ Markdown parsing failed:", error.message);
    issues.push("Failed to parse markdown - syntax errors present");
    return { success: false, issues, warnings, tokens: [] };
  }

  // Analyze token structure
  console.log("🔍 Content Structure Analysis:");

  const headings = tokens.filter((t) => t.type === "heading");
  const codeBlocks = tokens.filter((t) => t.type === "code");
  const images = tokens.filter((t) => t.type === "image");
  const tables = tokens.filter((t) => t.type === "table");
  const blockquotes = tokens.filter((t) => t.type === "blockquote");
  const lists = tokens.filter((t) => t.type === "list");
  const links = [];

  // Extract links from tokens (they're nested in text tokens)
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

  // Display findings
  console.log(`   Headings: ${headings.length}`);
  if (headings.length > 0) {
    const headingLevels = headings.reduce((acc, h) => {
      acc[h.depth] = (acc[h.depth] || 0) + 1;
      return acc;
    }, {});
    Object.entries(headingLevels).forEach(([level, count]) => {
      console.log(`      H${level}: ${count}`);
    });
  }

  console.log(`   Code blocks: ${codeBlocks.length}`);
  if (codeBlocks.length > 0) {
    const languages = codeBlocks
      .map((cb) => cb.lang || "no-lang")
      .filter((lang, i, arr) => arr.indexOf(lang) === i);
    console.log(`      Languages: ${languages.join(", ")}`);
  }

  console.log(`   Images: ${images.length}`);
  console.log(`   Tables: ${tables.length}`);
  console.log(`   Blockquotes: ${blockquotes.length}`);
  console.log(`   Lists: ${lists.length}`);
  console.log(`   Links: ${links.length}\n`);

  // Check for potential issues
  console.log("⚠️  Quality Checks:");

  // Check for H1
  const h1Headings = headings.filter((h) => h.depth === 1);
  const h1Count = h1Headings.length;

  if (h1Count === 0) {
    issues.push("No H1 heading found");
    console.log("   ❌ No H1 heading (will use fallback title)");
  } else if (h1Count > 1) {
    warnings.push(`Multiple H1 headings found (${h1Count})`);
    console.log(
      `   ⚠️  Multiple H1 headings (${h1Count}) - consider using only one`
    );

    // Track each H1 heading with line number
    h1Headings.forEach((h1) => {
      const h1Text = h1.text || "(no text)";
      const searchPattern = `# ${h1Text}`;
      const location = findLineNumber(md, searchPattern);

      detailedErrors.push({
        type: "Warning",
        category: "Multiple H1",
        line: location ? location.lineNumber : "Unknown",
        element: `# ${h1Text}`,
        description: "Multiple H1 headings found (SEO concern)",
        heading: h1Text,
        count: h1Count,
      });
    });
  } else {
    console.log("   ✅ Single H1 heading found");
  }

  // Check for broken image links
  const brokenImages = images.filter(
    (img) => !img.href || img.href.trim() === ""
  );
  if (brokenImages.length > 0) {
    issues.push(`${brokenImages.length} image(s) with missing URLs`);
    console.log(`   ❌ ${brokenImages.length} broken image link(s)`);

    // Track detailed error information with line numbers
    brokenImages.forEach((img) => {
      const altText = img.text || "(no alt text)";
      // Search for the image syntax in markdown
      const searchPattern = `![${img.text || ""}]()`;
      const location = findLineNumber(md, searchPattern);

      detailedErrors.push({
        type: "Critical",
        category: "Broken Image",
        line: location ? location.lineNumber : "Unknown",
        element: `![${altText}]()`,
        description: "Image has empty URL",
        altText: altText,
        href: "(empty)",
      });
    });
  } else if (images.length > 0) {
    console.log("   ✅ All images have URLs");
  }

  // Check for images missing alt text
  const imagesNoAlt = images.filter(
    (img) => !img.text || img.text.trim() === ""
  );
  if (imagesNoAlt.length > 0) {
    warnings.push(`${imagesNoAlt.length} image(s) missing alt text`);
    console.log(
      `   ⚠️  ${imagesNoAlt.length} image(s) missing alt text (accessibility concern)`
    );

    // Track detailed warning information
    imagesNoAlt.forEach((img) => {
      const searchPattern = `![](${img.href || ""})`;
      const location = findLineNumber(md, searchPattern);

      detailedErrors.push({
        type: "Warning",
        category: "Missing Alt Text",
        line: location ? location.lineNumber : "Unknown",
        element: `![](${img.href || ""})`,
        description: "Image is missing alt text (accessibility issue)",
        altText: "(missing)",
        href: img.href || "(no URL)",
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
    issues.push(`${brokenLinks.length} link(s) with missing URLs`);
    console.log(`   ❌ ${brokenLinks.length} broken link(s)`);

    // Track detailed error information with line numbers
    brokenLinks.forEach((link) => {
      const linkText = link.text || "(no text)";
      // Search for the link syntax in markdown - try both () and ( ) variants
      let searchPattern = `[${linkText}]()`;
      let location = findLineNumber(md, searchPattern);

      if (!location) {
        searchPattern = `[${linkText}]( )`;
        location = findLineNumber(md, searchPattern);
      }

      detailedErrors.push({
        type: "Critical",
        category: "Broken Link",
        line: location ? location.lineNumber : "Unknown",
        element: `[${linkText}]()`,
        description: "Link has empty URL",
        linkText: linkText,
        href: "(empty)",
      });
    });
  } else if (links.length > 0) {
    console.log("   ✅ All links have URLs");
  }

  // Check for external images (may cause issues if URLs change)
  const externalImages = images.filter(
    (img) =>
      img.href &&
      (img.href.startsWith("http://") || img.href.startsWith("https://"))
  );
  if (externalImages.length > 0) {
    warnings.push(
      `${externalImages.length} external image(s) - consider hosting in Contentful`
    );
    console.log(
      `   ℹ️  ${externalImages.length} external image(s) - consider uploading to Contentful assets`
    );
  }

  // Check for very long lines (may indicate formatting issues)
  const longLines = md.split("\n").filter((line) => line.length > 120);
  if (longLines.length > 10) {
    warnings.push(`${longLines.length} lines exceed 120 characters`);
    console.log(
      `   ℹ️  ${longLines.length} long lines (>120 chars) - may affect readability`
    );
  }

  console.log("\n" + "=".repeat(60));

  const success = issues.length === 0;
  if (success) {
    console.log("✅ VALIDATION PASSED - No critical issues found");
  } else {
    console.log("❌ VALIDATION FAILED - Critical issues found:");
    issues.forEach((issue) => console.log(`   • ${issue}`));
  }

  if (warnings.length > 0) {
    console.log("\n⚠️  WARNINGS (non-critical):");
    warnings.forEach((warning) => console.log(`   • ${warning}`));
  }

  console.log("=".repeat(60) + "\n");

  return { success, issues, warnings, tokens, detailedErrors };
}

/**
 * Exports validation errors to a CSV file
 */
function exportErrorsToCSV(detailedErrors, filename = "validation-errors.csv") {
  if (!detailedErrors || detailedErrors.length === 0) {
    console.log("ℹ️  No errors to export.\n");
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

  // Convert errors to CSV rows
  const rows = detailedErrors.map((error) => {
    let additionalInfo = "";

    if (error.category === "Broken Image") {
      additionalInfo = `Alt: "${error.altText}"`;
    } else if (error.category === "Broken Link") {
      additionalInfo = `Text: "${error.linkText}"`;
    } else if (error.category === "Missing Alt Text") {
      additionalInfo = `URL: "${error.href}"`;
    } else if (error.category === "Multiple H1") {
      additionalInfo = `Total H1s: ${error.count}`;
    }

    // Escape quotes and wrap in quotes for CSV
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      // Escape quotes by doubling them and wrap in quotes if contains comma, quote, or newline
      if (str.includes('"') || str.includes(",") || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      escapeCSV(error.type),
      escapeCSV(error.category),
      escapeCSV(error.line),
      escapeCSV(error.element),
      escapeCSV(error.description),
      escapeCSV(additionalInfo),
    ].join(",");
  });

  // Combine header and rows
  const csvContent = [headers.join(","), ...rows].join("\n");

  // Write to file
  fs.writeFileSync(filename, csvContent, "utf8");

  console.log(`\n📄 Validation errors exported to: ${filename}`);
  console.log(`   Total errors/warnings: ${detailedErrors.length}\n`);
}

async function generateImport() {
  // 1) Fetch markdown from URL
  console.log(`Fetching markdown from: ${MARKDOWN_URL}`);
  const response = await fetch(MARKDOWN_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch markdown: ${response.status} ${response.statusText}`
    );
  }

  const md = await response.text();
  console.log(`Successfully fetched ${md.length} characters`);

  // 2) Derive title from first H1 or fall back
  const titleMatch = md.match(/^#\s+(.+?)\s*$/m);
  const internalTitle = titleMatch
    ? titleMatch[1].trim()
    : "Untitled Markdown Import";

  // 3) Run validation if requested
  if (VALIDATE_MODE) {
    const validationResult = validateMarkdown(md, internalTitle);

    // Export errors to CSV if requested
    if (EXPORT_ERRORS && validationResult.detailedErrors.length > 0) {
      exportErrorsToCSV(validationResult.detailedErrors);
    }

    // If validation failed, exit with error
    if (!validationResult.success) {
      console.error(
        "\n❌ Validation failed. Fix issues before generating import.\n"
      );
      process.exit(1);
    }
  } else if (EXPORT_ERRORS) {
    // If --export-errors is used without --validate, show a warning
    console.warn(
      "\n⚠️  Warning: --export-errors requires --validate flag to be set.\n"
    );
  }

  // 4) Toggle publish behavior (true => publish on import)
  const PUBLISH = true;

  // 5) Build import JSON
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
        // If you want tags later, add: "metadata": { "tags": [] }
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

  // 6) Write file
  fs.writeFileSync("./import.json", JSON.stringify(importDoc, null, 2), "utf8");

  console.log("\n✅ import.json successfully generated!");
  console.log(`   Title: "${internalTitle}"`);
  console.log(`   Publish on import: ${PUBLISH}\n`);
}

// Run the async function
generateImport().catch((error) => {
  console.error("Error generating import:", error.message);
  process.exit(1);
});
