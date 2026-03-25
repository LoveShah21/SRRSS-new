const supertest = require('supertest');
const app = require('../src/app');

const request = supertest(app);

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

  const res = await request.post('/api/auth/register').send(data);
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
