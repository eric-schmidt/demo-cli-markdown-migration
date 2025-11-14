#!/usr/bin/env node

// validate.js - Validate markdown structure and quality
const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
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

// Parse command line arguments
const args = process.argv.slice(2);
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
🔍 Contentful Markdown Validator
=================================

Usage: node src/validate.js [--url <markdown-url>] [options]

Options:
  --url <url>       URL of the markdown file to validate
                    If not provided, will prompt interactively

  --export-errors   Export validation errors to CSV file (outputs/validation-errors.csv)
                    Includes line numbers, error types, and details for each issue
                    If not provided, will prompt interactively

  --help, -h        Show this help message

Examples:
  # Validate with interactive prompts
  node src/validate.js

  # Validate with URL from command line
  node src/validate.js --url https://raw.githubusercontent.com/user/repo/main/doc.md

  # Validate and export errors to CSV
  node src/validate.js --url <url> --export-errors

  # Or use the npm script
  npm run validate

Features:
  ✓ Validates markdown syntax using 'marked' parser
  ✓ Analyzes content structure (headings, images, links, code blocks)
  ✓ Checks for broken links and missing alt text
  ✓ Detects accessibility and SEO issues
  ✓ Exports detailed error report to CSV (optional)

Output: Validation report (console) + outputs/validation-errors.csv (optional)
`);
  process.exit(0);
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
    return { success: false, issues, warnings, tokens: [], detailedErrors };
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
function exportErrorsToCSV(detailedErrors) {
  if (!detailedErrors || detailedErrors.length === 0) {
    console.log("ℹ️  No errors to export.\n");
    return;
  }

  // Ensure outputs directory exists
  const outputDir = path.join(__dirname, "..", "outputs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = path.join(outputDir, "validation-errors.csv");

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

  console.log(
    `\n📄 Validation errors exported to: outputs/validation-errors.csv`
  );
  console.log(`   Total errors/warnings: ${detailedErrors.length}\n`);
}

/**
 * Main validation function
 */
async function runValidation(markdownUrl, shouldExportErrors) {
  // 1) Fetch markdown from URL
  console.log(`\n📥 Fetching markdown from: ${markdownUrl}`);
  const response = await fetch(markdownUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch markdown: ${response.status} ${response.statusText}`
    );
  }

  const md = await response.text();
  console.log(`✅ Successfully fetched ${md.length} characters`);

  // 2) Derive title from first H1 or fall back
  const titleMatch = md.match(/^#\s+(.+?)\s*$/m);
  const internalTitle = titleMatch
    ? titleMatch[1].trim()
    : "Untitled Markdown Import";

  // 3) Run validation
  const validationResult = validateMarkdown(md, internalTitle);

  // 4) Export errors to CSV if requested
  if (shouldExportErrors && validationResult.detailedErrors.length > 0) {
    exportErrorsToCSV(validationResult.detailedErrors);
  }

  // 5) Exit with appropriate code
  if (!validationResult.success) {
    console.error("❌ Validation failed. Fix issues before importing.\n");
    process.exit(1);
  }

  console.log("💡 Tip: Run 'npm run generate' to create import.json.\n");
}

// Main execution
async function main() {
  try {
    // If URL not provided via CLI, prompt for it
    if (!MARKDOWN_URL) {
      console.log("\n🔍 Validate Markdown & Generate Import File");
      console.log("─".repeat(60) + "\n");

      MARKDOWN_URL = await question("📎 Enter the markdown URL: ");

      if (!MARKDOWN_URL || !MARKDOWN_URL.trim()) {
        console.error("\n❌ Error: URL is required\n");
        rl.close();
        process.exit(1);
      }

      console.log("");
    }

    // If export errors flag not set via CLI, prompt for it (only in interactive mode)
    let shouldExportErrors = EXPORT_ERRORS;
    if (!args.includes("--url")) {
      // Only prompt if running interactively
      shouldExportErrors = await confirm("📄 Export validation errors to CSV?");

      console.log("\n" + "─".repeat(60));
      console.log("\n⚙️  Configuration:");
      console.log(`   URL: ${MARKDOWN_URL}`);
      console.log(`   Mode: Validate`);
      console.log(
        `   Export Errors: ${shouldExportErrors ? "✅ Enabled" : "❌ Disabled"}`
      );
      console.log("\n" + "─".repeat(60));
    }

    await runValidation(MARKDOWN_URL, shouldExportErrors);
  } catch (error) {
    console.error("\n❌ Error during validation:", error.message, "\n");
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
