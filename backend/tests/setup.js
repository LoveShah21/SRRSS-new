const mongoose = require('mongoose');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

// Use a dedicated test database on local MongoDB
const TEST_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/srrss_test';

// Increase timeout for slow CI environments
jest.setTimeout(30000);

// Connect to test database before all tests
beforeAll(async () => {
  await mongoose.connect(TEST_URI);
});

// Clear all collections after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Drop test database and disconnect after all tests
afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});
