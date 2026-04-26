function getAllowedClientOrigins() {
  return (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getPrimaryClientUrl() {
  return getAllowedClientOrigins()[0] || 'http://localhost:5173';
}

module.exports = {
  getAllowedClientOrigins,
  getPrimaryClientUrl,
};
