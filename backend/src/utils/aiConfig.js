const { parseTrustedHosts } = require('./urlValidator');

function trimTrailingSlash(value = '') {
  return String(value || '').trim().replace(/\/+$/, '');
}

function getAiServiceUrl() {
  const explicitUrl = trimTrailingSlash(process.env.AI_SERVICE_URL);
  if (explicitUrl) return explicitUrl;

  const hostport = String(process.env.AI_SERVICE_HOSTPORT || '').trim();
  if (hostport) return `http://${hostport}`;

  return 'http://localhost:8000';
}

function getAiTrustedInternalHosts() {
  const hosts = new Set(parseTrustedHosts(
    process.env.AI_TRUSTED_INTERNAL_HOSTS || 'localhost,127.0.0.1,::1,ai-service',
  ));

  const addHostname = (rawValue) => {
    const value = String(rawValue || '').trim();
    if (!value) return;

    try {
      const hostname = new URL(value).hostname;
      if (hostname) {
        hosts.add(hostname.toLowerCase());
        return;
      }
    } catch {
      // Fall through for host:port values.
    }

    const host = value.split(':')[0]?.trim().toLowerCase();
    if (host) hosts.add(host);
  };

  addHostname(process.env.AI_SERVICE_URL);
  addHostname(process.env.AI_SERVICE_HOSTPORT);

  return Array.from(hosts);
}

module.exports = {
  getAiServiceUrl,
  getAiTrustedInternalHosts,
};
