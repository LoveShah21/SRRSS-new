describe('aiConfig', () => {
  const originalAiServiceUrl = process.env.AI_SERVICE_URL;
  const originalAiServiceHostport = process.env.AI_SERVICE_HOSTPORT;
  const originalTrustedHosts = process.env.AI_TRUSTED_INTERNAL_HOSTS;

  afterEach(() => {
    if (originalAiServiceUrl === undefined) delete process.env.AI_SERVICE_URL;
    else process.env.AI_SERVICE_URL = originalAiServiceUrl;

    if (originalAiServiceHostport === undefined) delete process.env.AI_SERVICE_HOSTPORT;
    else process.env.AI_SERVICE_HOSTPORT = originalAiServiceHostport;

    if (originalTrustedHosts === undefined) delete process.env.AI_TRUSTED_INTERNAL_HOSTS;
    else process.env.AI_TRUSTED_INTERNAL_HOSTS = originalTrustedHosts;

    jest.resetModules();
  });

  it('builds the AI URL from AI_SERVICE_HOSTPORT when AI_SERVICE_URL is unset', () => {
    delete process.env.AI_SERVICE_URL;
    process.env.AI_SERVICE_HOSTPORT = 'resume-ai.internal:10000';

    const { getAiServiceUrl } = require('../src/utils/aiConfig');

    expect(getAiServiceUrl()).toBe('http://resume-ai.internal:10000');
  });

  it('adds the configured AI hostname to trusted internal hosts', () => {
    delete process.env.AI_SERVICE_URL;
    process.env.AI_SERVICE_HOSTPORT = 'resume-ai.internal:10000';
    process.env.AI_TRUSTED_INTERNAL_HOSTS = 'localhost,127.0.0.1,::1';

    const { getAiTrustedInternalHosts } = require('../src/utils/aiConfig');

    expect(getAiTrustedInternalHosts()).toEqual(
      expect.arrayContaining(['localhost', '127.0.0.1', '::1', 'resume-ai.internal']),
    );
  });
});
