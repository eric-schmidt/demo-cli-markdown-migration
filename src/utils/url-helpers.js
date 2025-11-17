/**
 * Extracts and formats a filename from a URL to use as a title
 * Converts dashes and underscores to spaces and capitalizes words
 * @param {string} url - The URL to extract filename from
 * @returns {string} Formatted title or fallback
 */
function getFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop();
    const nameWithoutExt = filename.replace(/\.(md|markdown)$/i, "");
    const formattedName = nameWithoutExt
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
    return formattedName || "Untitled Markdown Import";
  } catch (error) {
    return "Untitled Markdown Import";
  }
}

module.exports = { getFilenameFromUrl };

