const { isSafeExternalUrl } = require('../src/utils/urlValidator');

describe('urlValidator', () => {
  it('blocks internal hosts by default', async () => {
    const isSafe = await isSafeExternalUrl('http://localhost:8000');
    expect(isSafe).toBe(false);
  });

  it('allows explicitly trusted internal hosts', async () => {
    const isSafe = await isSafeExternalUrl('http://localhost:8000', {
      allowInternalHosts: ['localhost'],
    });
    expect(isSafe).toBe(true);
  });

  it('allows public IP endpoints', async () => {
    const isSafe = await isSafeExternalUrl('https://8.8.8.8');
    expect(isSafe).toBe(true);
  });
});
