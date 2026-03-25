require('./setup');
const { request, createUser, createJob } = require('./helpers');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.NODE_ENV = 'test';

describe('Applications Routes', () => {
  let recruiterToken, candidateToken, recruiterId, candidateId;
  let jobId;

  beforeEach(async () => {
    const recruiter = await createUser({ role: 'recruiter', email: 'rec@app.com' });
    recruiterToken = recruiter.token;
    recruiterId = recruiter.user._id;

    const candidate = await createUser({ role: 'candidate', email: 'cand@app.com' });
    candidateToken = candidate.token;
    candidateId = candidate.user._id;

    const job = await createJob(recruiterToken);
    jobId = job._id;
  });

  // ── APPLY TO JOB ──────────────────────────────────────
  describe('POST /api/applications', () => {
    it('should submit an application as candidate', async () => {
      const res = await request
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobId });

      expect(res.status).toBe(201);
      expect(res.body.application.status).toBe('applied');
      expect(res.body.application.jobId).toBe(jobId);
      expect(res.body.application.candidateId).toBe(candidateId);
    });

    it('should reject duplicate application', async () => {
      await request
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobId });

      const res = await request
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobId });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already applied/i);
    });

    it('should reject application by recruiter', async () => {
      const res = await request
        .post('/api/applications')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ jobId });

      expect(res.status).toBe(403);
    });

    it('should reject application to non-existent job', async () => {
      const res = await request
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobId: '507f1f77bcf86cd799439011' });

      expect(res.status).toBe(404);
    });

    it('should reject missing jobId', async () => {
      const res = await request
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ── MY APPLICATIONS ───────────────────────────────────
  describe('GET /api/applications/me', () => {
    it('should return candidate applications', async () => {
      // Apply first
      await request
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobId });

      const res = await request
        .get('/api/applications/me')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.applications.length).toBe(1);
    });

    it('should deny recruiter access', async () => {
      const res = await request
        .get('/api/applications/me')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ── VIEW APPLICATIONS FOR JOB ─────────────────────────
  describe('GET /api/applications/job/:jobId', () => {
    beforeEach(async () => {
      await request
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobId });
    });

    it('should list applications for recruiter who owns the job', async () => {
      const res = await request
        .get(`/api/applications/job/${jobId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.applications.length).toBe(1);
      expect(res.body.pagination.total).toBe(1);
    });

    it('should deny candidate access', async () => {
      const res = await request
        .get(`/api/applications/job/${jobId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ── STATUS TRANSITIONS ────────────────────────────────
  describe('PATCH /api/applications/:id/status', () => {
    let applicationId;

    beforeEach(async () => {
      const applyRes = await request
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobId });
      applicationId = applyRes.body.application._id;
    });

    it('should transition to shortlisted', async () => {
      const res = await request
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: 'shortlisted' });

      expect(res.status).toBe(200);
      expect(res.body.application.status).toBe('shortlisted');
      expect(res.body.application.statusHistory.length).toBeGreaterThan(1);
    });

    it('should transition to interview', async () => {
      const res = await request
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: 'interview' });

      expect(res.status).toBe(200);
      expect(res.body.application.status).toBe('interview');
    });

    it('should transition to hired', async () => {
      const res = await request
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: 'hired' });

      expect(res.status).toBe(200);
      expect(res.body.application.status).toBe('hired');
    });

    it('should reject invalid status', async () => {
      const res = await request
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: 'promoted' });

      expect(res.status).toBe(400);
    });

    it('should reject status change by candidate', async () => {
      const res = await request
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ status: 'hired' });

      expect(res.status).toBe(403);
    });
  });

  // ── SCHEDULE INTERVIEW ────────────────────────────────
  describe('PATCH /api/applications/:id/interview', () => {
    let applicationId;

    beforeEach(async () => {
      const applyRes = await request
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobId });
      applicationId = applyRes.body.application._id;
    });

    it('should schedule an interview', async () => {
      const res = await request
        .patch(`/api/applications/${applicationId}/interview`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          scheduledAt: '2026-04-15T10:00:00.000Z',
          link: 'https://meet.google.com/abc-def-ghi',
          notes: 'Technical round',
        });

      expect(res.status).toBe(200);
      expect(res.body.application.interview.link).toBeDefined();
      expect(res.body.application.status).toBe('interview');
    });

    it('should reject missing scheduledAt', async () => {
      const res = await request
        .patch(`/api/applications/${applicationId}/interview`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ notes: 'No date' });

      expect(res.status).toBe(400);
    });
  });
});
