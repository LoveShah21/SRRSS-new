/**
 * Escape special regex characters to prevent ReDoS attacks.
 * User-supplied input should be passed through this before
 * being used in MongoDB $regex queries.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
