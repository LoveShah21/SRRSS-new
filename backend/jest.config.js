module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  // Run test suites sequentially to avoid MongoDB port conflicts
  maxWorkers: 1,
  // Force exit after tests complete
  forceExit: true,
  detectOpenHandles: true,
};
