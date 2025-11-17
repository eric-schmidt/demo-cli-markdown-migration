#!/usr/bin/env node

// validate.js - Validate markdown structure and quality
const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const { createInterface, question, confirm } = require("./utils/prompts");
const { parseArgument, hasFlag } = require("./utils/arg-parser");
const { arrayToCSV } = require("./utils/csv-helpers");
const { MAX_LINE_LENGTH, LONG_LINE_WARNING_THRESHOLD } = require("./utils/constants");

const rl = createInterface();

// Parse command line arguments
const args = process.argv.slice(2);
const EXPORT_ERRORS = args.includes("--export-errors");
const HELP_MODE = hasFlag(args, "--help", "-h");

let MARKDOWN_URL = parseArgument(args, "--url");

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
 * @param {string} markdown - The markdown content
 * @param {string} searchText - The text to search for
 * @param {number} startIndex - Starting index for search
 * @returns {Object|null} Object with lineNumber and index, or null if not found
 */
function findLineNumber(markdown, searchText, startIndex = 0) {
  const index = markdown.indexOf(searchText, startIndex);
  if (index === -1) return null;

  const beforeText = markdown.substring(0, index);
  const lineNumber = beforeText.split("\n").length;
  return { lineNumber, index };
}

/**
 * Calculates basic document metrics
 * @param {string} md - Markdown content
 * @param {string} internalTitle - Document title
 * @returns {Object} Metrics object
 */
function calculateMetrics(md, internalTitle) {
  const lineCount = md.split("\n").length;
  const wordCount = md.split(/\s+/).length;
  
  return {
    characters: md.length,
    lines: lineCount,
    words: wordCount,
    title: internalTitle,
  };
}

/**
 * Displays the validation report header
 */
function displayReportHeader() {
  console.log("\n" + "=".repeat(60));
  console.log("📋 MARKDOWN VALIDATION REPORT");
  console.log("=".repeat(60) + "\n");
}

/**
 * Displays document metrics
 * @param {Object} metrics - Document metrics
 */
function displayMetrics(metrics) {
  console.log("📊 Document Metrics:");
  console.log(`   Characters: ${metrics.characters.toLocaleString()}`);
  console.log(`   Lines: ${metrics.lines.toLocaleString()}`);
  console.log(`   Words (approx): ${metrics.words.toLocaleString()}`);
  console.log(`   Title: "${metrics.title}"\n`);
}

/**
 * Extracts all links from markdown tokens recursively
 * @param {Array} tokenList - List of tokens to search
 * @returns {Array} All link tokens found
 */
function extractAllLinks(tokenList) {
  const links = [];
  
  function extractLinks(tokens) {
    tokens.forEach((token) => {
      if (token.type === "link") {
        links.push(token);
      }
      if (token.tokens) {
        extractLinks(token.tokens);
      }
    });
  }
  
  extractLinks(tokenList);
  return links;
}

/**
 * Analyzes parsed markdown tokens and extracts structure information
 * @param {Array} tokens - Parsed markdown tokens from marked.lexer()
 * @returns {Object} Structure analysis with counts and elements
 */
function analyzeMarkdownStructure(tokens) {
  const headings = tokens.filter((t) => t.type === "heading");
  const codeBlocks = tokens.filter((t) => t.type === "code");
  const images = tokens.filter((t) => t.type === "image");
  const tables = tokens.filter((t) => t.type === "table");
  const blockquotes = tokens.filter((t) => t.type === "blockquote");
  const lists = tokens.filter((t) => t.type === "list");
  const links = extractAllLinks(tokens);

  return { headings, codeBlocks, images, tables, blockquotes, lists, links };
}

/**
 * Displays structure analysis results
 * @param {Object} structure - Analyzed structure
 */
function displayStructureAnalysis(structure) {
  console.log("🔍 Content Structure Analysis:");

  // Display headings
  console.log(`   Headings: ${structure.headings.length}`);
  if (structure.headings.length > 0) {
    const headingLevels = structure.headings.reduce((acc, h) => {
      acc[h.depth] = (acc[h.depth] || 0) + 1;
      return acc;
    }, {});
    Object.entries(headingLevels).forEach(([level, count]) => {
      console.log(`      H${level}: ${count}`);
    });
  }

  // Display code blocks
  console.log(`   Code blocks: ${structure.codeBlocks.length}`);
  if (structure.codeBlocks.length > 0) {
    const languages = structure.codeBlocks
      .map((cb) => cb.lang || "no-lang")
      .filter((lang, i, arr) => arr.indexOf(lang) === i);
    console.log(`      Languages: ${languages.join(", ")}`);
  }

  console.log(`   Images: ${structure.images.length}`);
  console.log(`   Tables: ${structure.tables.length}`);
  console.log(`   Blockquotes: ${structure.blockquotes.length}`);
  console.log(`   Lists: ${structure.lists.length}`);
  console.log(`   Links: ${structure.links.length}\n`);
}

/**
 * Adds a detailed error to the tracking array
 * @param {Array} detailedErrors - Array to add error to
 * @param {string} type - Error type (Critical/Warning)
 * @param {string} category - Error category
 * @param {string} searchPattern - Pattern to search in markdown
 * @param {string} md - Original markdown content
 * @param {Object} details - Additional error details
 */
function addDetailedError(detailedErrors, type, category, searchPattern, md, details) {
  const location = findLineNumber(md, searchPattern);
  
  detailedErrors.push({
    type,
    category,
    line: location ? location.lineNumber : "Unknown",
    element: searchPattern,
    description: details.description,
    ...details.additionalFields,
  });
}

/**
 * Checks H1 headings for issues
 * @param {Array} headings - All heading tokens
 * @param {string} md - Original markdown content
 * @returns {Object} Issues, warnings, and detailed errors
 */
function checkH1Headings(headings, md) {
  const issues = [];
  const warnings = [];
  const detailedErrors = [];

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
      
      addDetailedError(detailedErrors, "Warning", "Multiple H1", searchPattern, md, {
        description: "Multiple H1 headings found (SEO concern)",
        additionalFields: {
          heading: h1Text,
          count: h1Count,
        },
      });
    });
  } else {
    console.log("   ✅ Single H1 heading found");
  }

  return { issues, warnings, detailedErrors };
}

/**
 * Checks images for broken links and missing alt text
 * @param {Array} images - All image tokens
 * @param {string} md - Original markdown content
 * @returns {Object} Issues, warnings, and detailed errors
 */
function checkImages(images, md) {
  const issues = [];
  const warnings = [];
  const detailedErrors = [];

  // Check for broken image links
  const brokenImages = images.filter(
    (img) => !img.href || img.href.trim() === ""
  );
  if (brokenImages.length > 0) {
    issues.push(`${brokenImages.length} image(s) with missing URLs`);
    console.log(`   ❌ ${brokenImages.length} broken image link(s)`);

    brokenImages.forEach((img) => {
      const altText = img.text || "(no alt text)";
      const searchPattern = `![${img.text || ""}]()`;
      
      addDetailedError(detailedErrors, "Critical", "Broken Image", searchPattern, md, {
        description: "Image has empty URL",
        additionalFields: {
          altText: altText,
          href: "(empty)",
        },
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

    imagesNoAlt.forEach((img) => {
      const searchPattern = `![](${img.href || ""})`;
      
      addDetailedError(detailedErrors, "Warning", "Missing Alt Text", searchPattern, md, {
        description: "Image is missing alt text (accessibility issue)",
        additionalFields: {
          altText: "(missing)",
          href: img.href || "(no URL)",
        },
      });
    });
  } else if (images.length > 0) {
    console.log("   ✅ All images have alt text");
  }

  // Check for external images (warning only)
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

  return { issues, warnings, detailedErrors };
}

/**
 * Checks links for broken URLs
 * @param {Array} links - All link tokens
 * @param {string} md - Original markdown content
 * @returns {Object} Issues, warnings, and detailed errors
 */
function checkLinks(links, md) {
  const issues = [];
  const warnings = [];
  const detailedErrors = [];

  const brokenLinks = links.filter(
    (link) => !link.href || link.href.trim() === ""
  );
  if (brokenLinks.length > 0) {
    issues.push(`${brokenLinks.length} link(s) with missing URLs`);
    console.log(`   ❌ ${brokenLinks.length} broken link(s)`);

    brokenLinks.forEach((link) => {
      const linkText = link.text || "(no text)";
      // Search for the link syntax in markdown - try both () and ( ) variants
      let searchPattern = `[${linkText}]()`;
      let location = findLineNumber(md, searchPattern);

      if (!location) {
        searchPattern = `[${linkText}]( )`;
      }

      addDetailedError(detailedErrors, "Critical", "Broken Link", searchPattern, md, {
        description: "Link has empty URL",
        additionalFields: {
          linkText: linkText,
          href: "(empty)",
        },
      });
    });
  } else if (links.length > 0) {
    console.log("   ✅ All links have URLs");
  }

  return { issues, warnings, detailedErrors };
}

/**
 * Checks for very long lines that may affect readability
 * @param {string} md - Original markdown content
 * @returns {Object} Issues and warnings
 */
function checkLineLengths(md) {
  const warnings = [];

  const longLines = md.split("\n").filter((line) => line.length > MAX_LINE_LENGTH);
  if (longLines.length > LONG_LINE_WARNING_THRESHOLD) {
    warnings.push(`${longLines.length} lines exceed ${MAX_LINE_LENGTH} characters`);
    console.log(
      `   ℹ️  ${longLines.length} long lines (>${MAX_LINE_LENGTH} chars) - may affect readability`
    );
  }

  return { warnings };
}

/**
 * Performs all quality checks on markdown content
 * @param {Object} structure - Analyzed markdown structure
 * @param {string} md - Original markdown content
 * @returns {Object} Combined issues, warnings, and detailed errors
 */
function performQualityChecks(structure, md) {
  console.log("⚠️  Quality Checks:");

  const h1Results = checkH1Headings(structure.headings, md);
  const imageResults = checkImages(structure.images, md);
  const linkResults = checkLinks(structure.links, md);
  const lineLengthResults = checkLineLengths(md);

  return {
    issues: [
      ...h1Results.issues,
      ...imageResults.issues,
      ...linkResults.issues,
    ],
    warnings: [
      ...h1Results.warnings,
      ...imageResults.warnings,
      ...linkResults.warnings,
      ...lineLengthResults.warnings,
    ],
    detailedErrors: [
      ...h1Results.detailedErrors,
      ...imageResults.detailedErrors,
      ...linkResults.detailedErrors,
    ],
  };
}

/**
 * Displays quality check results summary
 * @param {Object} results - Quality check results
 */
function displayQualityResults(results) {
  console.log("\n" + "=".repeat(60));

  const success = results.issues.length === 0;
  if (success) {
    console.log("✅ VALIDATION PASSED - No critical issues found");
  } else {
    console.log("❌ VALIDATION FAILED - Critical issues found:");
    results.issues.forEach((issue) => console.log(`   • ${issue}`));
  }

  if (results.warnings.length > 0) {
    console.log("\n⚠️  WARNINGS (non-critical):");
    results.warnings.forEach((warning) => console.log(`   • ${warning}`));
  }

  console.log("=".repeat(60) + "\n");
}

/**
 * Validates markdown structure and returns analysis results
 * Uses the 'marked' parser to analyze tokens and detect potential issues
 * Displays detailed validation report with metrics and quality checks
 * @param {string} md - Markdown content
 * @param {string} internalTitle - Document title
 * @returns {Object} Validation result with success status and details
 */
function validateMarkdown(md, internalTitle) {
  displayReportHeader();
  
  const metrics = calculateMetrics(md, internalTitle);
  displayMetrics(metrics);

  // Parse markdown with marked
  let tokens;
  try {
    tokens = marked.lexer(md);
    console.log("✅ Markdown syntax is valid and parseable\n");
  } catch (error) {
    console.error("❌ Markdown parsing failed:", error.message);
    const issues = ["Failed to parse markdown - syntax errors present"];
    return { success: false, issues, warnings: [], tokens: [], detailedErrors: [] };
  }

  // Analyze token structure
  const structure = analyzeMarkdownStructure(tokens);
  displayStructureAnalysis(structure);

  // Perform quality checks
  const qualityResults = performQualityChecks(structure, md);

  // Display results
  displayQualityResults(qualityResults);

  return {
    success: qualityResults.issues.length === 0,
    issues: qualityResults.issues,
    warnings: qualityResults.warnings,
    tokens,
    detailedErrors: qualityResults.detailedErrors,
  };
}

/**
 * Converts validation error details to CSV row data
 * @param {Object} error - Error object
 * @returns {Object} CSV row data
 */
function errorToCSVRow(error) {
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

  return {
    Type: error.type,
    Category: error.category,
    Line: error.line,
    Element: error.element,
    Description: error.description,
    "Additional Info": additionalInfo,
  };
}

/**
 * Exports validation errors to a CSV file
 * @param {Array} detailedErrors - Array of detailed error objects
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

  // CSV headers
  const headers = [
    "Type",
    "Category",
    "Line",
    "Element",
    "Description",
    "Additional Info",
  ];

  // Convert errors to CSV rows
  const rows = detailedErrors.map(errorToCSVRow);

  // Generate CSV content
  const csvContent = arrayToCSV(rows, headers);

  // Write to file
  fs.writeFileSync(filename, csvContent, "utf8");

  console.log(
    `\n📄 Validation errors exported to: outputs/validation-errors.csv`
  );
  console.log(`   Total errors/warnings: ${detailedErrors.length}\n`);
}

/**
 * Main validation function
 * @param {string} markdownUrl - URL to fetch markdown from
 * @param {boolean} shouldExportErrors - Whether to export errors to CSV
 */
async function runValidation(markdownUrl, shouldExportErrors) {
  // Fetch markdown from URL
  console.log(`\n📥 Fetching markdown from: ${markdownUrl}`);
  const response = await fetch(markdownUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch markdown: ${response.status} ${response.statusText}`
    );
  }

  const md = await response.text();
  console.log(`✅ Successfully fetched ${md.length} characters`);

  // Derive title from first H1 or fall back
  const titleMatch = md.match(/^#\s+(.+?)\s*$/m);
  const internalTitle = titleMatch
    ? titleMatch[1].trim()
    : "Untitled Markdown Import";

  // Run validation
  const validationResult = validateMarkdown(md, internalTitle);

  // Export errors to CSV if requested
  if (shouldExportErrors && validationResult.detailedErrors.length > 0) {
    exportErrorsToCSV(validationResult.detailedErrors);
  }

  // Exit with appropriate code
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

      MARKDOWN_URL = await question(rl, "📎 Enter the markdown URL: ");

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
      shouldExportErrors = await confirm(rl, "📄 Export validation errors to CSV?");

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
