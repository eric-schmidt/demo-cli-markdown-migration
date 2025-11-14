# Contentful Markdown Import Tool (Simplified)

A bare-bones Node.js tool with two simple scripts:

1. **Generate** - Create Contentful import files from markdown URLs
2. **Validate** - Check markdown quality and export issues to CSV

## Installation

```bash
npm install
```

## Requirements

- Node.js 18+ (for built-in `fetch()`)
- A Contentful space with a `post` content type containing:
  - `internalTitle` field (Short text)
  - `markdown` field (Long text)

## Usage

### 1. Generate Import File

Creates a `import.json` file that can be imported into Contentful using the Contentful CLI.

```bash
node src/generate-import-file.js <markdown-url>
```

**Example:**

```bash
node src/generate-import-file.js https://raw.githubusercontent.com/user/repo/main/doc.md
```

**Output:**

- `import.json` - Ready to import into Contentful
- Extracts title from first H1 heading
- Auto-publishes entries on import

**Import to Contentful:**

```bash
contentful space import \
  --space-id <YOUR_SPACE_ID> \
  --environment-id master \
  --content-file import.json
```

### 2. Validate Markdown

Validates markdown structure and exports all issues to a CSV file with line numbers.

```bash
node src/validate.js <markdown-url>
```

**Example:**

```bash
node src/validate.js https://raw.githubusercontent.com/user/repo/main/doc.md
```

**Output:**

- `validation-errors.csv` - CSV file with line numbers for each issue
- Console report showing validation summary

**What Gets Validated:**

- ❌ **Critical**: Broken images (empty URLs)
- ❌ **Critical**: Broken links (empty URLs)
- ⚠️ **Warning**: Multiple H1 headings
- ⚠️ **Warning**: Missing alt text on images

**CSV Format:**
| Type | Category | Line | Element | Description | Additional Info |
|------|----------|------|---------|-------------|-----------------|
| Critical | Broken Image | 41 | ![Alt]() | Image has empty URL | Alt: "Alt" |
| Warning | Missing Alt Text | 47 | ![](url) | Missing alt text | URL: "url" |

## Test Scripts

```bash
# Test generation with a working markdown file
npm run test:generate

# Test validation with a file that has issues
npm run test:validate
```

## Supported URL Types

- GitHub raw URLs: `https://raw.githubusercontent.com/user/repo/branch/file.md`
- Contentful asset URLs: `https://assets.ctfassets.net/space/asset/file.md`
- Any publicly accessible markdown URL

## Examples

### Example 1: Generate and Import

```bash
# 1. Generate import file
node src/generate-import-file.js https://example.com/doc.md

# 2. Import to Contentful
contentful space import \
  --space-id abc123 \
  --environment-id master \
  --content-file import.json
```

### Example 2: Validate Before Importing

```bash
# 1. Validate markdown
node src/validate.js https://example.com/doc.md

# 2. Check validation-errors.csv for issues
# 3. Fix any issues in source markdown
# 4. Re-validate until clean
# 5. Then generate and import
node src/generate-import-file.js https://example.com/doc.md
```

### Example 3: Test with Broken Markdown

The repository includes test files in the `markdown/` directory:

```bash
# This will find validation errors
node src/validate.js https://raw.githubusercontent.com/eric-schmidt/demo-cli-markdown-migration/refs/heads/main/markdown/markdown-broken.md

# Check validation-errors.csv to see all issues with line numbers
```

## Project Structure

```
.
├── src/
│   ├── generate-import-file.js  # Generate Contentful import JSON
│   └── validate.js              # Validate markdown & export CSV
├── markdown/                    # Test markdown files
├── package.json
└── README.md
```

## How It Works

### Generate Import File

1. Fetches markdown from provided URL
2. Extracts title from first H1 heading (or uses fallback)
3. Creates Contentful-compatible JSON structure
4. Writes to `import.json`

### Validate Markdown

1. Fetches markdown from provided URL
2. Parses markdown using the `marked` library
3. Checks for common issues (broken links, missing alt text, etc.)
4. Exports all issues to CSV with line numbers
5. Provides summary in console

## Troubleshooting

### "Missing required URL parameter"

Solution: Provide the markdown URL as the first argument

```bash
node src/generate-import-file.js https://example.com/file.md
```

### "Failed to fetch markdown: 404"

Solution:

- Verify the URL is correct and publicly accessible
- For GitHub files, use the "raw" URL format:
  - ❌ Wrong: `https://github.com/user/repo/blob/main/file.md`
  - ✅ Correct: `https://raw.githubusercontent.com/user/repo/main/file.md`

### "Module not found: marked"

Solution: Install dependencies

```bash
npm install
```

## License

MIT
