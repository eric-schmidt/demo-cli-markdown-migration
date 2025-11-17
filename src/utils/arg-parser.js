/**
 * Parses a command-line argument by flag name
 * @param {string[]} args - Command line arguments array
 * @param {string} flag - The flag to search for (e.g., '--url')
 * @returns {string|null} The value following the flag, or null if not found
 */
function parseArgument(args, flag) {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : null;
}

/**
 * Checks if a flag is present in arguments
 * @param {string[]} args - Command line arguments array
 * @param {...string} flags - One or more flags to check for
 * @returns {boolean} True if any of the flags are present
 */
function hasFlag(args, ...flags) {
  return flags.some((flag) => args.includes(flag));
}

module.exports = { parseArgument, hasFlag };

