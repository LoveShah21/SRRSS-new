require('./setup');
const { request, createUser, createJob } = require('./helpers');

describe('Interviews API', () => {
  let recruiter, candidate, job, application;

  beforeEach(async () => {
    recruiter = await createUser({ role: 'recruiter', email: `rec-${Date.now()}@test.com` });
    candidate = await createUser({ role: 'candidate', email: `cand-${Date.now()}@test.com` });

    job = await createJob(recruiter.token);

    // Apply
    const appRes = await request
      .post('/api/applications')
      .set('Authorization', `Bearer ${candidate.token}`)
      .send({ jobId: job._id });
    application = appRes.body.application;

    await request
      .patch(`/api/applications/${application._id}/status`)
      .set('Authorization', `Bearer ${recruiter.token}`)
      .send({ status: 'shortlisted' });
  });

  describe('POST /api/interviews', () => {
    it('should schedule an interview for a valid application', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const res = await request
        .post('/api/interviews')
        .set('Authorization', `Bearer ${recruiter.token}`)
        .send({
          applicationId: application._id,
          scheduledAt: futureDate,
          duration: 60,
          type: 'video',
          link: 'https://zoom.us/j/123',
        });

      expect(res.status).toBe(201);
      expect(res.body.interview).toBeDefined();
      expect(res.body.interview.status).toBe('scheduled');
      expect(res.body.interview.candidateId).toBe(candidate.user._id);
    });

    it('should reject scheduling without applicationId', async () => {
      const res = await request
        .post('/api/interviews')
        .set('Authorization', `Bearer ${recruiter.token}`)
        .send({ scheduledAt: new Date().toISOString() });

      expect(res.status).toBe(400);
    });

    it('should reject scheduling by candidates', async () => {
      const res = await request
        .post('/api/interviews')
        .set('Authorization', `Bearer ${candidate.token}`)
        .send({
          applicationId: application._id,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(res.status).toBe(403);
    });

    it('should reject scheduling for non-shortlisted applications', async () => {
      const secondCandidate = await createUser({ role: 'candidate', email: `cand2-${Date.now()}@test.com` });
      const appRes = await request
        .post('/api/applications')
        .set('Authorization', `Bearer ${secondCandidate.token}`)
        .send({ jobId: job._id });

      const res = await request
        .post('/api/interviews')
        .set('Authorization', `Bearer ${recruiter.token}`)
        .send({
          applicationId: appRes.body.application._id,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/interviews', () => {
    it('should list interviews for recruiter', async () => {
      // Schedule one first
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      await request
        .post('/api/interviews')
        .set('Authorization', `Bearer ${recruiter.token}`)
        .send({ applicationId: application._id, scheduledAt: futureDate });

      const res = await request
        .get('/api/interviews')
        .set('Authorization', `Bearer ${recruiter.token}`);

      expect(res.status).toBe(200);
      expect(res.body.interviews.length).toBe(1);
      expect(res.body.pagination).toBeDefined();
    });

    it('should list interviews for candidate (own only)', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      await request
        .post('/api/interviews')
        .set('Authorization', `Bearer ${recruiter.token}`)
        .send({ applicationId: application._id, scheduledAt: futureDate });

      const res = await request
        .get('/api/interviews')
        .set('Authorization', `Bearer ${candidate.token}`);

      expect(res.status).toBe(200);
      expect(res.body.interviews.length).toBe(1);
    });
  });

  describe('PATCH /api/interviews/:id', () => {
    it('should update interview details', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const create = await request
        .post('/api/interviews')
        .set('Authorization', `Bearer ${recruiter.token}`)
        .send({ applicationId: application._id, scheduledAt: futureDate });

      const res = await request
        .patch(`/api/interviews/${create.body.interview._id}`)
        .set('Authorization', `Bearer ${recruiter.token}`)
        .send({ notes: 'Updated notes', duration: 90 });

      expect(res.status).toBe(200);
      expect(res.body.interview.notes).toBe('Updated notes');
      expect(res.body.interview.duration).toBe(90);
    });
  });

  describe('DELETE /api/interviews/:id', () => {
    it('should cancel an interview', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const create = await request
        .post('/api/interviews')
        .set('Authorization', `Bearer ${recruiter.token}`)
        .send({ applicationId: application._id, scheduledAt: futureDate });

      const res = await request
        .delete(`/api/interviews/${create.body.interview._id}`)
        .set('Authorization', `Bearer ${recruiter.token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('cancelled');
    });
  });
});
