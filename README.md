# Contentful Markdown Import Tool

> **NOTE:** This script is a proof-of-concept and should be treated as such. Before deploying this script or operating on any production content, be sure to thoroughly test and ensure you understand how the key commands operate at a base level.

A Node.js tool that fetches markdown from any public URL, validates its structure, and generates a Contentful-compatible import file. The tool features clean separation of concerns with dedicated scripts for generation, validation, and import.

## Features

- ✅ **Complete workflow automation**: Single command to validate, generate, and import (`npm run all`)
- ✅ **Clean separation of concerns**: Dedicated scripts for generation, validation, and import
- ✅ **Organized output directory**: All generated files stored in `outputs/` directory
- ✅ **Multiple workflow modes**: Complete workflow, step-by-step, or command-line automation
- ✅ Fetch markdown from any public URL (GitHub, Contentful assets, etc.)
- ✅ Validate markdown syntax and structure using the `marked` parser
- ✅ Check for broken links and missing alt text
- ✅ Detailed validation reports with metrics and quality checks
- ✅ Export validation errors to CSV with line numbers for easy fixing
- ✅ Generate Contentful CLI import format
- ✅ Automated import to Contentful using environment variables
- ✅ Direct links to view imported entries in Contentful web app

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup .env file (first time only)
cat > .env << 'EOF'
CONTENTFUL_SPACE_ID=your-space-id-here
CONTENTFUL_ENVIRONMENT_ID=master
EOF
# Edit .env with your actual CONTENTFUL_SPACE_ID and CONTENTFUL_ENVIRONMENT_ID

# 3. Choose your workflow:

# OPTION A: Complete workflow (recommended for first-time users)
npm run all            # Runs validate → generate → import in one command

# OPTION B: Step-by-step workflow
npm run validate       # 1. Validate markdown (optional but recommended)
npm run generate       # 2. Generate import file
npm run import         # 3. Import to Contentful
```

## Requirements

- Node.js 18+ (for built-in `fetch()`)
- A Contentful space with a content type containing:
  - A text field for the entry title (field ID configurable, e.g., `internalTitle`, `title`)
  - A long text field for the markdown body (field ID configurable, e.g., `markdown`, `body`, `content`)

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

Choose between three interactive scripts depending on your needs:

#### 1. Complete Workflow (`npm run all`)

Run the complete end-to-end workflow: validate → generate → import:

```bash
npm run all
```

**Example session:**

```
🚀 Complete Contentful Markdown Import Workflow
============================================================

📎 Enter the markdown URL: https://example.com/doc.md
📝 Enter the content type ID (e.g., 'post', 'article'): blogPost
🏷️  Enter the title field ID (e.g., 'internalTitle', 'title'): title
📌 Enter the entry title (leave blank to auto-generate): API Documentation
📄 Enter the body field ID (e.g., 'body', 'content'): bodyContent

============================================================
⚙️  Configuration Summary:
   URL: https://example.com/doc.md
   Content Type: blogPost
   Title Field: title
   Entry Title: API Documentation
   Body Field: bodyContent
   Validation: ✅ Enabled (errors will be exported to CSV)
============================================================

🚦 Proceed with this configuration? (y/n): y

============================================================

📋 STEP 1/3: Validating markdown...
============================================================
[Validation output...]
✅ Validation passed with no critical issues!

📝 STEP 2/3: Generating import.json...
============================================================
[Generation output...]
✅ import.json successfully created!

📤 STEP 3/3: Importing to Contentful...
============================================================
[Import output...]

============================================================
🎉 COMPLETE WORKFLOW FINISHED SUCCESSFULLY!
============================================================

✅ Your markdown content has been:
   1. Validated for quality and structure
   2. Converted to Contentful import format
   3. Imported and published to your Contentful space

🔗 View your entry in Contentful:
   https://app.contentful.com/spaces/[space-id]/environments/[env]/entries/[entry-id]
```

This is the **recommended approach for most users** as it handles the entire process in one go.

---

#### 2. Generate Only (`npm run generate`)

Quickly generate an import file without validation:

```bash
npm run generate
```

**Example session:**

```
📦 Generate Contentful Import File
────────────────────────────────────────────────────────────

📎 Enter the markdown URL: https://example.com/doc.md
📝 Enter the content type ID (e.g., 'post', 'article'): blogPost
🏷️  Enter the title field ID (e.g., 'internalTitle', 'title'): title
📌 Enter the entry title (leave blank to auto-generate): API Documentation
📄 Enter the body field ID (e.g., 'body', 'content'): bodyContent

────────────────────────────────────────────────────────────

📥 Fetching markdown from: https://example.com/doc.md
✅ Successfully fetched 9,845 characters

✅ import.json successfully generated!
   Location: outputs/import.json
   Content Type: "blogPost"
   Title Field: "title"
   Title Value: "API Documentation"
   Body Field: "bodyContent"

💡 Next step: Run 'npm run import' to import to Contentful.
```

---

#### 3. Validate & Generate (`npm run validate`)

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

📥 Fetching markdown from: https://example.com/doc.md
✅ Successfully fetched 9,845 characters

[Validation report output...]

✅ VALIDATION PASSED - No critical issues found

📄 Validation errors exported to: outputs/validation-errors.csv
   Total errors/warnings: 3

💡 Tip: Run 'npm run generate' to create import.json.
```

### Command Line Mode

For automation or scripting, use the direct commands:

```bash
# Complete workflow (validate → generate → import)
node src/run-all.js \
  --url <markdown-url> \
  --content-type <content-type-id> \
  --title-field <title-field-id> \
  --title <entry-title> \
  --body-field <body-field-id>

# Generate import file with all parameters
node src/generate.js \
  --url <markdown-url> \
  --content-type <content-type-id> \
  --title-field <title-field-id> \
  --title <entry-title> \
  --body-field <body-field-id>

# Validate markdown
node src/validate.js --url <markdown-url> [--export-errors]

# Import to Contentful
node src/import.js
```

### Options

**Complete Workflow (`src/run-all.js`):**
| Option | Description |
| ------------------------ | --------------------------------------------- |
| `--url <url>` | URL of the markdown file to import (required) |
| `--content-type <id>` | Content type ID (required) |
| `--title-field <id>` | Field ID for entry title (required) |
| `--title <title>` | Entry title value (optional, auto-generated if not provided) |
| `--body-field <id>` | Field ID for markdown body (required) |
| `--help, -h` | Show help message |

**Generate (`src/generate.js`):**
| Option | Description |
| ------------------------ | --------------------------------------------- |
| `--url <url>` | URL of the markdown file to import (required) |
| `--content-type <id>` | Content type ID (required) |
| `--title-field <id>` | Field ID for entry title (required) |
| `--title <title>` | Entry title value (optional, defaults to filename or H1) |
| `--body-field <id>` | Field ID for markdown body (required) |
| `--help, -h` | Show help message |

**Validate (`src/validate.js`):**
| Option | Description |
| ----------------- | ------------------------------------------------------------ |
| `--url <url>` | URL of the markdown file to validate (required if not prompted) |
| `--export-errors` | Export validation errors to CSV file (`outputs/validation-errors.csv`) |
| `--help, -h` | Show help message |

### Quick Examples

```bash
# Complete workflow with all parameters
node src/run-all.js \
  --url https://raw.githubusercontent.com/user/repo/main/README.md \
  --content-type blogPost \
  --title-field title \
  --title "My Blog Post" \
  --body-field bodyContent

# Complete workflow with interactive prompts (recommended)
node src/run-all.js

# Generate import file with all parameters
node src/generate.js \
  --url https://raw.githubusercontent.com/user/repo/main/README.md \
  --content-type blogPost \
  --title-field title \
  --title "My Blog Post" \
  --body-field bodyContent

# Generate import with interactive prompts
node src/generate.js

# Validate markdown and export errors
node src/validate.js --url https://example.com/doc.md --export-errors

# Run validate interactively
node src/validate.js
```

---

## Usage Modes

### 1. Generate Import (Default)

Generate the `outputs/import.json` file without validation:

```bash
node src/generate.js --url https://raw.githubusercontent.com/user/repo/main/doc.md
```

**Output:**

```
📥 Fetching markdown from: https://raw.githubusercontent.com/...
✅ Successfully fetched 9,845 characters

✅ import.json successfully generated!
   Location: outputs/import.json
   Title: "Markdown Testing Document"

💡 Next step: Run 'npm run import' to import to Contentful.
```

### 2. Validate Markdown (Recommended)

Validate markdown quality before generating the import file:

```bash
node src/validate.js --url <markdown-url>
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

💡 Tip: Run 'npm run generate' to create import.json.
```

**If validation fails**, the script exits with an error code.

### 3. Export Validation Errors to CSV

For easier tracking and fixing of validation errors, export detailed error information to a CSV file:

```bash
node src/validate.js --url <markdown-url> --export-errors
```

**Output:**

- Console displays the full validation report
- Creates `outputs/validation-errors.csv` with detailed error information

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
node src/generate.js --help
node src/validate.js --help
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
node src/validate.js \
  --url https://raw.githubusercontent.com/eric-schmidt/demo-cli-markdown-migration/main/markdown/markdown.md
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
# Complete workflow (recommended for most users)
npm run all                    # Run complete workflow: validate → generate → import

# Individual scripts (for step-by-step control)
npm run generate               # Generate import file (interactive)
npm run validate               # Validate markdown (interactive)
npm run import                 # Import generated file to Contentful

# Help and examples
npm run help:all               # Show complete workflow help
npm run help:generate          # Show generate help
npm run help:validate          # Show validate help
npm run example:all            # Complete workflow example with GitHub demo file
npm run example:generate       # Generate from GitHub demo file
npm run example:validate       # Validate GitHub demo file
npm run example:validate-export # Validate and export errors to CSV
```

**Note:** Example scripts use a demo URL. For your own files, use the direct commands:

```bash
node src/run-all.js --url <your-markdown-url> --content-type <type> --title-field <field> --body-field <field>
node src/generate.js --url <your-markdown-url> --content-type <type> --title-field <field> --body-field <field>
node src/validate.js --url <your-markdown-url> --export-errors
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
│ 6. Write import.json to outputs/ directory  │
└─────────────────────────────────────────────┘
```

---

## Customization Options

### Using Different Markdown Sources

Simply provide different URLs via the `--url` parameter:

```bash
# GitHub repository
node src/generate.js --url https://raw.githubusercontent.com/org/repo/main/docs/file.md

# Contentful asset
node src/generate.js --url https://assets.ctfassets.net/space-id/asset-id/file.md

# Other hosting
node src/generate.js --url https://example.com/docs/markdown.md
```

### Adjust Validation Rules

Modify the `validateMarkdown()` function in `src/validate.js` to add custom checks:

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

### Configuration Options

All user-configurable constants are centralized in `src/utils/constants.js` for easy management.

#### Configurable Settings

In `src/utils/constants.js`, you can also configure:

- **`EXPORT_ERRORS`** - Whether to export validation errors to CSV in the complete workflow
- **`DEFAULT_LOCALE`** - Default locale for content (e.g., "en-US", "de-DE")
- **`MAX_LINE_LENGTH`** - Maximum line length before flagging readability issues
- **`LONG_LINE_WARNING_THRESHOLD`** - Number of long lines before showing a warning

---

## Troubleshooting

### Missing --url parameter

**Problem:** The script requires a URL to fetch markdown from.

**Solution:** Provide the URL parameter or run interactively:

```bash
# With URL parameter
node src/generate.js --url https://your-markdown-url.com/file.md

# Or run interactively (will prompt for URL)
node src/generate.js
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
  - If you have [Node Version Manager](https://github.com/nvm-sh/nvm) installed, you can simply run `nvm use` in the repository root.
- Alternatively, modify the script to use the `https` module for older Node.js versions

### Import script errors

**Problem:** `.env file not found` when running `npm run import` or `npm run all`

**Solution:** Create a `.env` file with your Contentful credentials:

```bash
cat > .env << 'EOF'
CONTENTFUL_SPACE_ID=your-space-id-here
CONTENTFUL_ENVIRONMENT_ID=master
EOF
# Then edit .env with your actual CONTENTFUL_SPACE_ID and CONTENTFUL_ENVIRONMENT_ID
```

**Problem:** `outputs/import.json not found`

**Solution:** Generate the import file first:

```bash
npm run generate
# or
node src/generate.js --url <markdown-url>
```

**Problem:** `Contentful CLI not found`

**Solution:** Install the Contentful CLI globally:

```bash
npm install -g contentful-cli
```

Or use npx to run without installing:

```bash
npx contentful-cli space import --space-id <CONTENTFUL_SPACE_ID> --environment-id <CONTENTFUL_ENVIRONMENT_ID> --content-file outputs/import.json
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
cat > .env << 'EOF'
CONTENTFUL_SPACE_ID=your-space-id-here
CONTENTFUL_ENVIRONMENT_ID=master
EOF
# Edit .env with your actual CONTENTFUL_SPACE_ID and CONTENTFUL_ENVIRONMENT_ID

# 3. Choose your workflow approach:

# Option A: Complete workflow in one command (RECOMMENDED)
npm run all

# Option B: Step-by-step workflow
npm run validate      # 1. Validate markdown
npm run generate      # 2. Generate import file
npm run import        # 3. Import to Contentful

# Option C: Command line mode for automation
node src/run-all.js \
  --url https://raw.githubusercontent.com/user/repo/main/doc.md \
  --content-type article \
  --title-field internalTitle \
  --body-field markdown
```

### Alternative: Manual Import

If you prefer to use the Contentful CLI directly:

```bash
# 1. Install Contentful CLI (if not already installed)
npm install -g contentful-cli

# 2. Login to Contentful
contentful login

# 3. Generate import file
node src/generate.js \
  --url https://raw.githubusercontent.com/org/repo/main/docs/guide.md

# 4. Import manually
contentful space import \
  --space-id <your-space-id> \
  --environment-id master \
  --content-file outputs/import.json
```

---

## License

MIT
