const url = require('url');
const net = require('net');

/**
 * Check if an IP address is internal/private
 */
function isInternalIP(ip) {
  if (!ip) return true;

  // Loopback
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;

  // Private ranges
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (link-local / cloud metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0
    if (parts[0] === 0) return true;
    // Cloud metadata endpoint
    if (ip === '169.254.169.254') return true;
  }

  return false;
}

/**
 * Validate that a URL does not point to an internal address.
 * Resolves the hostname to check for SSRF.
 */
async function isSafeExternalUrl(targetUrl) {
  try {
    const { hostname, protocol } = new URL(targetUrl);

    // Only allow http/https
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false;
    }

    // Resolve hostname to IP
    const addresses = await new Promise((resolve, reject) => {
      require('dns').lookup(hostname, (err, address) => {
        if (err) reject(err);
        else resolve([address]);
      });
    });

    // Check all resolved IPs
    for (const addr of addresses) {
      if (isInternalIP(addr)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

module.exports = { isSafeExternalUrl, isInternalIP };
