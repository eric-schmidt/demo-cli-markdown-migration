const readline = require("readline");

/**
 * Creates a readline interface for user input
 * @returns {readline.Interface} Readline interface
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompts user for input
 * @param {readline.Interface} rl - Readline interface
 * @param {string} query - Question to ask the user
 * @returns {Promise<string>} User's response
 */
function question(rl, query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

/**
 * Prompts user for yes/no confirmation
 * @param {readline.Interface} rl - Readline interface
 * @param {string} query - Question to ask the user
 * @returns {Promise<boolean>} True if user answered yes
 */
function confirm(rl, query) {
  return new Promise((resolve) => {
    rl.question(`${query} (y/n): `, (answer) => {
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

/**
 * Prompts user for required input and validates it's not empty
 * @param {readline.Interface} rl - Readline interface
 * @param {string} promptMessage - The prompt to display
 * @param {string} fieldName - Name of the field for error messages
 * @returns {Promise<string>} The validated user input
 */
async function promptRequired(rl, promptMessage, fieldName) {
  const value = await question(rl, promptMessage);
  
  if (!value || !value.trim()) {
    console.error(`\n❌ Error: ${fieldName} is required\n`);
    rl.close();
    process.exit(1);
  }
  
  return value;
}

module.exports = { createInterface, question, confirm, promptRequired };

