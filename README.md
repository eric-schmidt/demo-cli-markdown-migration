# Contentful Markdown Import Tool

A Node.js tool that fetches markdown from any public URL, validates its structure, and generates a Contentful-compatible import file. `example-space-export.json` is included so that you can automatically set up a compatible Contentful Space with the necessary content type + fields in order to test the import.

## Features

- ✅ **Two interactive modes**: Quick generation or validation with error export
- ✅ Fetch markdown from any public URL (GitHub, Contentful assets, etc.)
- ✅ Validate markdown syntax and structure using the `marked` parser
- ✅ Check for broken links and missing alt text
- ✅ Detailed validation reports with metrics and quality checks
- ✅ Export validation errors to CSV with line numbers for easy fixing
- ✅ Generate Contentful CLI import format
- ✅ Automated import to Contentful using environment variables

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup .env file (first time only)
cp .env.example .env
# Edit .env with your Contentful CONTENTFUL_SPACE_ID and CONTENTFUL_ENVIRONMENT_ID

# 3. Generate import file
npm run generate        # Quick generation (no validation)
# OR
npm run validate        # Run a validation & error export

# 4. Import to Contentful using the Space configured in .env file
npm run import
```

## Requirements

- Node.js 18+ (for built-in `fetch()`)
- A Contentful space with a `post` content type containing:
  - `internalTitle` field (Text)
  - `markdown` field (Long text)

## Table of Contents

- [Usage](#usage)
  - [Interactive Mode (Recommended)](#interactive-mode-recommended)
    - [1. Generate Only](#1-generate-only-npm-run-generate)
    - [2. Validate & Generate](#2-validate--generate-npm-run-validate)
  - [Command Line Mode](#command-line-mode)
- [Usage Modes](#usage-modes)
- [Supported URL Types](#supported-url-types)
- [What Gets Validated](#what-gets-validated)
- [Validation Output Example](#validation-output-example)
- [Testing the Validator](#testing-the-validator)
- [NPM Scripts](#npm-scripts)
- [How It Works](#how-it-works)
- [Customization Options](#customization-options)
- [Troubleshooting](#troubleshooting)
- [Complete Workflow Example](#complete-workflow-example)
- [Real-World Examples](#real-world-examples)

---

## Usage

### Interactive Mode (Recommended)

Choose between two interactive scripts depending on your needs:

#### 1. Generate Only (`npm run generate`)

Quickly generate an import file without validation:

```bash
npm run generate
```

**Example session:**

```
📦 Generate Contentful Import File
────────────────────────────────────────────────────────────

📎 Enter the markdown URL: https://example.com/doc.md

────────────────────────────────────────────────────────────

⚙️  Configuration:
   URL: https://example.com/doc.md
   Mode: Generate import.json

🚀 Running command:
   node src/generate-import-file.js --url "https://example.com/doc.md"

────────────────────────────────────────────────────────────
[Processing output...]

✅ Generation completed!

💡 Tip: Use 'npm run validate' to check markdown quality before importing.
```

#### 2. Validate & Generate (`npm run validate`)

Validate markdown structure and optionally export errors:

```bash
npm run validate
```

**Example session:**

```
🔍 Validate Markdown & Generate Import File
────────────────────────────────────────────────────────────

📎 Enter the markdown URL: https://example.com/doc.md

📄 Export validation errors to CSV? (y/n): y

────────────────────────────────────────────────────────────

⚙️  Configuration:
   URL: https://example.com/doc.md
   Mode: Validate & Generate
   Validation: ✅ Enabled
   Export Errors: ✅ Enabled

🚀 Running command:
   node src/generate-import-file.js --url "https://example.com/doc.md" --validate --export-errors

────────────────────────────────────────────────────────────
[Validation output...]

✅ Validation completed!

💡 Next step: Run 'npm run import' to import to Contentful.
```

### Command Line Mode

For automation or scripting, use the direct command:

```bash
node src/generate-import-file.js --url <markdown-url> [options]
```

### Options

| Option            | Description                                                  |
| ----------------- | ------------------------------------------------------------ |
| `--url <url>`     | **Required.** URL of the markdown file to import             |
| `--validate`      | Validate markdown before generating (exits on errors)        |
| `--export-errors` | Export validation errors to CSV file (requires `--validate`) |
| `--help`          | Show help message                                            |

### Quick Examples

```bash
# GitHub raw URL
node src/generate-import-file.js --url https://raw.githubusercontent.com/user/repo/main/README.md

# Contentful asset URL
node src/generate-import-file.js --url https://assets.ctfassets.net/space/asset/file.md

# With validation (recommended)
node src/generate-import-file.js --url <url> --validate

# Validate and export errors to CSV
node src/generate-import-file.js --url <url> --validate --export-errors
```

---

## Usage Modes

### 1. Generate Import (Default)

Generate the `import.json` file without validation:

```bash
node src/generate-import-file.js --url https://raw.githubusercontent.com/user/repo/main/doc.md
```

**Output:**

```
Fetching markdown from: https://raw.githubusercontent.com/...
Successfully fetched 9,845 characters

✅ import.json successfully generated!
   Title: "Markdown Testing Document"
   Publish on import: true
```

### 2. Validate Before Generating (Recommended)

Validate markdown quality and only generate if validation passes:

```bash
node src/generate-import-file.js --url <markdown-url> --validate
```

**Output Example (Success):**

```
============================================================
📋 MARKDOWN VALIDATION REPORT
============================================================

📊 Document Metrics:
   Characters: 9,845
   Lines: 260
   Words (approx): 1,234
   Title: "Markdown Testing Document"

✅ Markdown syntax is valid and parseable

🔍 Content Structure Analysis:
   Headings: 24
      H1: 1
      H2: 8
      H3: 4
   Code blocks: 3
      Languages: javascript, python, json
   Images: 4
   Tables: 2
   Blockquotes: 3
   Lists: 5
   Links: 12

⚠️  Quality Checks:
   ✅ Single H1 heading found
   ✅ All images have URLs
   ⚠️  2 image(s) missing alt text (accessibility concern)
   ✅ All links have URLs
   ℹ️  4 external image(s) - consider uploading to Contentful assets

============================================================
✅ VALIDATION PASSED - No critical issues found

⚠️  WARNINGS (non-critical):
   • 2 image(s) missing alt text
   • 4 external image(s) - consider hosting in Contentful
============================================================

✅ import.json successfully generated!
```

**If validation fails**, the script exits with an error and does NOT generate the import file.

### 3. Export Validation Errors to CSV

For easier tracking and fixing of validation errors, export detailed error information to a CSV file:

```bash
node src/generate-import-file.js --url <markdown-url> --validate --export-errors
```

**Output:**

- Console displays the full validation report (same as `--validate`)
- Creates `validation-errors.csv` with detailed error information

**CSV Contents:**

| Type     | Category         | Line | Element           | Description                | Additional Info     |
| -------- | ---------------- | ---- | ----------------- | -------------------------- | ------------------- |
| Critical | Broken Image     | 41   | ![Broken Image]() | Image has empty URL        | Alt: "Broken Image" |
| Critical | Broken Link      | 44   | [Click here]()    | Link has empty URL         | Text: "Click here"  |
| Warning  | Missing Alt Text | 47   | ![](https://...)  | Image is missing alt text  | URL: "https://..."  |
| Warning  | Multiple H1      | 16   | # Another H1...   | Multiple H1 headings found | Total H1s: 2        |

**Benefits:**

- **Line numbers** - Jump directly to the problem in your markdown file
- **Categorized errors** - Easily filter and prioritize fixes
- **Spreadsheet compatible** - Open in Excel, Google Sheets, or any CSV viewer
- **Track progress** - Check off fixed items as you work through them

**Use case:** When you have many validation errors, the CSV export makes it easy to systematically fix each issue by providing exact line numbers and context.

### 4. Help

Display usage instructions:

```bash
node src/generate-import-file.js --help
```

---

## Supported URL Types

- **GitHub Raw URLs**: `https://raw.githubusercontent.com/user/repo/branch/file.md`
- **Contentful Asset URLs**: `https://assets.ctfassets.net/space/asset/file.md`
- **Any public markdown URL**: Any publicly accessible `.md` file

---

## What Gets Validated

The tool uses the `marked` parser to analyze markdown structure and checks for:

### Critical Issues (will fail validation):

- ❌ Markdown parsing errors
- ❌ Broken image links (no URL)
- ❌ Broken hyperlinks (no URL)

### Warnings (won't fail validation):

- ⚠️ Multiple H1 headings (SEO best practice)
- ⚠️ Images missing alt text (accessibility concern)
- ⚠️ External image URLs (reliability concern)
- ℹ️ Very long lines (>120 chars, readability)

### Validation Success Criteria

The script will generate `import.json` if:

- ✅ Markdown parses successfully
- ✅ All images have URLs
- ✅ All links have URLs
- ✅ No critical syntax errors

Warnings are displayed but don't prevent generation.

### What Gets Analyzed

1. **Markdown Syntax**

   - Uses `marked.lexer()` to parse markdown
   - Detects syntax errors that would cause parsing to fail

2. **Document Structure**
   - Counts all heading levels (H1-H6)
   - Identifies code blocks and their languages
   - Finds all images, links, tables, lists, blockquotes

---

## Validation Output Example

```
============================================================
📋 MARKDOWN VALIDATION REPORT
============================================================

📊 Document Metrics:
   Characters: 9,845
   Lines: 260
   Words (approx): 1,234
   Title: "API Documentation"

✅ Markdown syntax is valid and parseable

🔍 Content Structure Analysis:
   Headings: 24
      H1: 1
      H2: 8
      H3: 4
   Code blocks: 3
      Languages: javascript, python, json
   Images: 4
   Tables: 2
   Links: 12

⚠️  Quality Checks:
   ✅ Single H1 heading found
   ✅ All images have URLs
   ✅ All images have alt text
   ✅ All links have URLs
   ℹ️  4 external image(s) - consider uploading to Contentful

============================================================
✅ VALIDATION PASSED - No critical issues found
============================================================
```

---

## Testing the Validator

This repository includes test markdown files to demonstrate validation:

### Test Files Available

1. **`markdown/markdown.md`** - Contains intentional validation errors

   - Multiple H1 headings (warning)
   - Broken image links with empty URLs (critical error)
   - Broken hyperlinks with empty URLs (critical error)
   - Images missing alt text (warning)

2. **`markdown/markdown-broken.md`** - More extensive error examples
   - All the errors from above
   - Additional broken links and images
   - Comprehensive demonstration file

### Running Validation Tests

Test the validator with the intentionally broken file:

```bash
# This will FAIL validation (expected behavior)
node src/generate-import-file.js \
  --url https://raw.githubusercontent.com/eric-schmidt/demo-cli-markdown-migration/main/markdown/markdown.md \
  --validate
```

**Expected output:**

```
============================================================
📋 MARKDOWN VALIDATION REPORT
============================================================

📊 Document Metrics:
   Characters: 7,200
   Lines: 316
   Title: "Markdown Testing Document"

✅ Markdown syntax is valid and parseable

🔍 Content Structure Analysis:
   Headings: 29
      H1: 2
      H2: 14
      H3: 13
   Code blocks: 3
   Images: 6
   Links: 10

⚠️  Quality Checks:
   ⚠️  Multiple H1 headings (2) - consider using only one
   ❌ 3 broken image link(s)
   ⚠️  1 image(s) missing alt text (accessibility concern)
   ❌ 3 broken link(s)

============================================================
❌ VALIDATION FAILED - Critical issues found:
   • 3 image(s) with missing URLs
   • 3 link(s) with missing URLs
============================================================

❌ Validation failed. Fix issues before generating import.
```

The validation will exit with an error and will NOT generate `import.json` until the issues are fixed.

---

## NPM Scripts

The `package.json` includes convenient shortcuts:

```bash
# Interactive scripts (recommended)
npm run generate              # Generate import file (no validation)
npm run validate              # Validate & generate with optional error export
npm run import                # Import generated file to Contentful

# Direct command examples
npm run help                  # Show help message
npm run example               # Generate from GitHub demo file
npm run example:validate      # Validate and generate from GitHub demo file
npm run example:export-errors # Validate, export errors, and generate
```

**Note:** Example scripts use a demo URL. For your own files, use the full command:

```bash
node src/generate-import-file.js --url <your-markdown-url> [options]
```

---

## How It Works

### Validation Process

The tool uses the `marked` library to parse and validate markdown:

- **Parsing**: Converts markdown into structured tokens using `marked.lexer()`
- **Analysis**: Extracts and categorizes content elements:
  - Headings (with level breakdown)
  - Code blocks (with language detection)
  - Images, tables, lists, blockquotes, links
- **Quality Checks**: Identifies critical issues and warnings
- **Reporting**: Displays detailed validation report with metrics

### Integration Flow

```
┌─────────────────────────────────────────────┐
│ 1. Parse command line arguments             │
│    --url (required), --validate, --help     │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │ URL provided?     │
         └─────────┬─────────┘
                   │ NO
                   ├──────────> EXIT with error message
                   │ YES
┌──────────────────▼──────────────────────────┐
│ 2. Fetch markdown from provided URL         │
│    using fetch() API                        │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│ 3. Extract title from first H1              │
│    or use fallback                          │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │ --validate flag?  │
         └─────────┬─────────┘
                   │ YES
┌──────────────────▼──────────────────────────┐
│ 4. Run validateMarkdown()                   │
│    • Parse with marked.lexer()              │
│    • Analyze tokens & structure             │
│    • Check for issues                       │
│    • Display detailed report                │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │ Validation passed?│
         └─────────┬─────────┘
                   │ FAILED
                   ├──────────> EXIT with error
                   │ PASSED
┌──────────────────▼──────────────────────────┐
│ 5. Build import JSON structure              │
│    • Create entry with sys metadata         │
│    • Add internalTitle & markdown fields    │
│    • Set publish flag                       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│ 6. Write import.json to filesystem          │
└─────────────────────────────────────────────┘
```

---

## Customization Options

### Using Different Markdown Sources

Simply provide different URLs via the `--url` parameter:

```bash
# GitHub repository
node src/generate-import-file.js --url https://raw.githubusercontent.com/org/repo/main/docs/file.md

# Contentful asset
node src/generate-import-file.js --url https://assets.ctfassets.net/space-id/asset-id/file.md

# Other hosting
node src/generate-import-file.js --url https://example.com/docs/markdown.md
```

### Adjust Validation Rules

Modify the `validateMarkdown()` function in `generate-import-file.js` to add custom checks:

```javascript
// Example: Check for minimum word count
if (wordCount < 500) {
  warnings.push("Document is shorter than 500 words");
}

// Example: Check for required sections
if (!md.includes("## Introduction")) {
  issues.push("Missing 'Introduction' section");
}
```

### Toggle Auto-Publish

In the `generateImport()` function, change the `PUBLISH` flag:

```javascript
const PUBLISH = false; // Don't publish on import
```

---

## Troubleshooting

### Missing --url parameter

**Problem:** The script requires a URL to fetch markdown from.

**Solution:** Provide the URL parameter:

```bash
node src/generate-import-file.js --url https://your-markdown-url.com/file.md
```

Example of wrong vs. correct:

```bash
# ❌ Wrong
node src/generate-import-file.js

# ✅ Correct
node src/generate-import-file.js --url https://example.com/file.md
```

### Module not found: marked

**Problem:** The `marked` dependency is not installed.

**Solution:** Install dependencies

```bash
npm install
```

### GitHub URL format

**Problem:** Using the wrong URL format for GitHub files.

**Solution:** Use the "raw" URL format:

```bash
# ❌ Wrong (blob URL)
https://github.com/user/repo/blob/main/file.md

# ✅ Correct (raw URL)
https://raw.githubusercontent.com/user/repo/main/file.md
```

### Failed to fetch markdown: 404

**Problem:** The URL is incorrect or the file doesn't exist.

**Solution:**

- Verify the URL is correct and publicly accessible
- Check that the file exists at the specified URL
- Ensure you're using the "raw" format for GitHub files
- Test the URL in your browser first

### Validation failed

**Problem:** The markdown contains critical issues.

**Solution:** Check the validation report for detailed issues. The validation output shows all problems that need to be fixed:

- Review the "Quality Checks" section for specific errors
- Fix broken links (missing URLs)
- Fix broken images (missing URLs)
- Correct any markdown syntax errors

After fixing the issues in your markdown source, run the command again.

### Node.js version error

**Problem:** The script requires Node.js 18+ for the built-in `fetch()` API.

**Solution:**

- Update Node.js to version 18 or later
- Alternatively, modify the script to use the `https` module for older Node.js versions

### Import script errors

**Problem:** `.env file not found` when running `npm run import`

**Solution:** Create a `.env` file with your Contentful credentials:

```bash
cp .env.example .env
# Edit .env with your CONTENTFUL_SPACE_ID and CONTENTFUL_ENVIRONMENT_ID
```

**Problem:** `import.json not found`

**Solution:** Generate the import file first:

```bash
node src/generate-import-file.js --url <markdown-url> --validate
```

**Problem:** `Contentful CLI not found`

**Solution:** Install the Contentful CLI globally:

```bash
npm install -g contentful-cli
```

Or use npx to run without installing:

```bash
npx contentful-cli space import --space-id <CONTENTFUL_SPACE_ID> --environment-id <CONTENTFUL_ENVIRONMENT_ID> --content-file import.json
```

**Problem:** `CONTENTFUL_SPACE_ID not found in .env file`

**Solution:** Make sure your `.env` file contains:

```bash
CONTENTFUL_SPACE_ID=your-actual-space-id
CONTENTFUL_ENVIRONMENT_ID=master
```

---

## Complete Workflow Example

Here's a complete workflow from start to finish:

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables (first time only)
cp .env.example .env
# Edit .env with your CONTENTFUL_SPACE_ID and CONTENTFUL_ENVIRONMENT_ID

# 3. Generate the import file (choose one)

# Option A: Quick generation (no validation)
npm run generate

# Option B: Validate before generating (recommended for production)
npm run validate

# Alternative: Use command line mode for automation
# node src/generate-import-file.js --url https://raw.githubusercontent.com/user/repo/main/doc.md --validate

# 4. Import to Contentful
npm run import
```

### Alternative: Manual Import

If you prefer to use the Contentful CLI directly:

```bash
# 1. Install Contentful CLI (if not already installed)
npm install -g contentful-cli

# 2. Login to Contentful
contentful login

# 3. Generate import file
node src/generate-import-file.js \
  --url https://raw.githubusercontent.com/org/repo/main/docs/guide.md \
  --validate

# 4. Import manually
contentful space import \
  --space-id <your-space-id> \
  --environment-id master \
  --content-file import.json
```

---

## Real-World Examples

### Example 1: Test with Validation Errors

This repository includes a test markdown file with intentional validation errors:

```bash
# Test with the broken markdown (will fail validation)
node src/generate-import-file.js \
  --url https://raw.githubusercontent.com/eric-schmidt/demo-cli-markdown-migration/main/markdown/markdown-broken.md \
  --validate
```

**Expected output:** Validation will fail with critical errors (broken links and images)

### Example 1b: Export Errors for Systematic Fixing

Export validation errors to CSV for easier tracking:

```bash
# Validate and export errors to CSV
node src/generate-import-file.js \
  --url https://raw.githubusercontent.com/eric-schmidt/demo-cli-markdown-migration/main/markdown/markdown-broken.md \
  --validate --export-errors
```

**Creates:** `validation-errors.csv` with line numbers and detailed error information.

**Workflow:**

1. Run command to generate CSV
2. Open `validation-errors.csv` in Excel or Google Sheets
3. Sort/filter errors by type or category
4. Fix errors in your markdown file using the line numbers
5. Re-run validation to confirm fixes

### Example 2: GitHub Documentation

```bash
node src/generate-import-file.js \
  --url https://raw.githubusercontent.com/contentful/contentful.js/master/README.md \
  --validate
```

### Example 3: Contentful Asset

```bash
node src/generate-import-file.js \
  --url https://assets.ctfassets.net/your-space/your-asset/document.md \
  --validate
```

### Example 4: Remote Documentation

```bash
node src/generate-import-file.js \
  --url https://docs.example.com/api/v1/markdown/guide.md \
  --validate
```

---

## Importing to Contentful

### Setup Environment Variables

1. **Create a `.env` file** in the project root:

```bash
# Copy the example file
cp .env.example .env
```

2. **Edit `.env` with your Contentful credentials:**

```bash
CONTENTFUL_SPACE_ID=your-contentful-space-id
CONTENTFUL_ENVIRONMENT_ID=master
```

You can find your Space ID in the Contentful web app under Settings → General Settings.

### Import Methods

#### Method 1: Using the NPM Script (Recommended)

The easiest way to import is using the built-in script:

```bash
# 1. Generate the import file
node src/generate-import-file.js --url <markdown-url> --validate

# 2. Import to Contentful
npm run import
```

**The script will:**

- ✅ Read credentials from `.env` file
- ✅ Validate that `import.json` exists
- ✅ Check that Contentful CLI is installed
- ✅ Run the import command with proper parameters
- ✅ Show real-time progress

**Example output:**

```
📦 Starting Contentful import process...

🔧 Configuration:
   Space ID: gvk1uqblk4uq
   Environment: master
   Import File: import.json

🚀 Running command:
   contentful space import --space-id gvk1uqblk4uq --environment-id master --content-file import.json

────────────────────────────────────────────────────────────

[Contentful CLI output here]

────────────────────────────────────────────────────────────

✅ Import completed successfully!
```

#### Method 2: Using Contentful CLI Directly

You can also import directly using the Contentful CLI:

```bash
contentful space import --space-id <CONTENTFUL_SPACE_ID> --environment-id <CONTENTFUL_ENVIRONMENT_ID> --content-file import.json
```

### Prerequisites for Import

Make sure you have:

1. **Contentful CLI installed**

   ```bash
   npm install -g contentful-cli
   ```

2. **Authenticated to your space**

   ```bash
   contentful login
   ```

3. **Environment variables configured** (for `npm run import`)

   - Create `.env` file with `CONTENTFUL_SPACE_ID` and `CONTENTFUL_ENVIRONMENT_ID`

4. **Required content type**
   - A `post` content type with:
     - `internalTitle` field (Short text)
     - `markdown` field (Long text)

---

## License

MIT
