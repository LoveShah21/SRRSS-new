const supertest = require('supertest');
const app = require('../src/app');

const request = supertest(app);

const User = require('../src/models/User');
const jwt = require('jsonwebtoken');

/**
 * Register a user and return { user, token, refreshToken }
 */
async function createUser(overrides = {}) {
  const defaults = {
    email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'candidate',
  };
  const data = { ...defaults, ...overrides };

  if (data.role === 'admin') {
    const user = await User.create({
      email: data.email,
      passwordHash: data.password,
      role: 'admin',
      profile: { firstName: data.firstName, lastName: data.lastName },
    });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
      user: JSON.parse(JSON.stringify(user)),
      token,
      refreshToken,
      email: data.email,
      password: data.password,
    };
  }

  const res = await request.post('/api/auth/register').send(data);
  if (res.status >= 400) {
    throw new Error(`Test setup failed to register user: ${res.text}`);
  }
  return {
    user: res.body.user,
    token: res.body.token,
    refreshToken: res.body.refreshToken,
    email: data.email,
    password: data.password,
  };
}

/**
 * Create a job posting. Requires a recruiter token.
 */
async function createJob(token, overrides = {}) {
  const defaults = {
    title: 'Software Engineer',
    description: 'Build amazing software products',
    requiredSkills: ['JavaScript', 'Node.js'],
    experienceMin: 2,
    experienceMax: 5,
    location: 'Remote',
  };
  const data = { ...defaults, ...overrides };

  const res = await request
    .post('/api/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send(data);
  return res.body.job;
}

module.exports = { request, createUser, createJob };
