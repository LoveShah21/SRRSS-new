require('./setup');
const { request, createUser, createJob } = require('./helpers');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.NODE_ENV = 'test';

describe('Jobs Routes', () => {
  let recruiterToken, candidateToken, adminToken;

  beforeEach(async () => {
    const recruiter = await createUser({ role: 'recruiter', email: 'rec@test.com' });
    recruiterToken = recruiter.token;

    const candidate = await createUser({ role: 'candidate', email: 'cand@test.com' });
    candidateToken = candidate.token;

    // Create admin manually (can't self-register as admin)
    const User = require('../src/models/User');
    const adminUser = await User.create({
      email: 'admin@test.com',
      passwordHash: 'AdminPass1!',
      role: 'admin',
      profile: { firstName: 'Admin', lastName: 'User' },
    });
    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  });

  // ── CREATE JOB ────────────────────────────────────────
  describe('POST /api/jobs', () => {
    it('should create a job as recruiter', async () => {
      const res = await request
        .post('/api/jobs')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          title: 'Full Stack Developer',
          description: 'Build web applications',
          requiredSkills: ['React', 'Node.js'],
          location: 'Remote',
        });

      expect(res.status).toBe(201);
      expect(res.body.job.title).toBe('Full Stack Developer');
      expect(res.body.job.status).toBe('open');
    });

    it('should reject job creation by candidate', async () => {
      const res = await request
        .post('/api/jobs')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          title: 'Hacker Job',
          description: 'Candidates cannot post jobs',
        });

      expect(res.status).toBe(403);
    });

    it('should reject missing title', async () => {
      const res = await request
        .post('/api/jobs')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ description: 'No title here' });

      expect(res.status).toBe(400);
    });

    it('should allow admin to create jobs', async () => {
      const res = await request
        .post('/api/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Job',
          description: 'Created by admin',
        });

      expect(res.status).toBe(201);
    });
  });

  // ── LIST JOBS ─────────────────────────────────────────
  describe('GET /api/jobs', () => {
    beforeEach(async () => {
      await createJob(recruiterToken, { title: 'Backend Dev', location: 'NYC' });
      await createJob(recruiterToken, { title: 'Frontend Dev', location: 'Remote' });
    });

    it('should list jobs for candidate (open only)', async () => {
      const res = await request
        .get('/api/jobs')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.jobs.length).toBe(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter by location', async () => {
      const res = await request
        .get('/api/jobs?location=NYC')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.jobs.every((j) => j.location.includes('NYC'))).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request.get('/api/jobs');
      expect(res.status).toBe(401);
    });
  });

  // ── GET SINGLE JOB ────────────────────────────────────
  describe('GET /api/jobs/:id', () => {
    it('should return a single job', async () => {
      const job = await createJob(recruiterToken);

      const res = await request
        .get(`/api/jobs/${job._id}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.job.title).toBe(job.title);
    });

    it('should 404 for non-existent job', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request
        .get(`/api/jobs/${fakeId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ── UPDATE JOB ────────────────────────────────────────
  describe('PUT /api/jobs/:id', () => {
    it('should update own job as recruiter', async () => {
      const job = await createJob(recruiterToken);

      const res = await request
        .put(`/api/jobs/${job._id}`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ title: 'Senior Backend Dev' });

      expect(res.status).toBe(200);
      expect(res.body.job.title).toBe('Senior Backend Dev');
    });

    it('should reject update by candidate', async () => {
      const job = await createJob(recruiterToken);

      const res = await request
        .put(`/api/jobs/${job._id}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
    });
  });

  // ── DELETE JOB (Admin only) ───────────────────────────
  describe('DELETE /api/jobs/:id', () => {
    it('should delete job as admin', async () => {
      const job = await createJob(recruiterToken);

      const res = await request
        .delete(`/api/jobs/${job._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });

    it('should reject delete by recruiter', async () => {
      const job = await createJob(recruiterToken);

      const res = await request
        .delete(`/api/jobs/${job._id}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(403);
    });

    it('should reject delete by candidate', async () => {
      const job = await createJob(recruiterToken);

      const res = await request
        .delete(`/api/jobs/${job._id}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(403);
    });
  });
});
