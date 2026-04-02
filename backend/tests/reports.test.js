require('./setup');
const { request, createUser, createJob } = require('./helpers');

describe('Reports API', () => {
  let recruiter, admin, candidate, job;

  beforeEach(async () => {
    recruiter = await createUser({ role: 'recruiter', email: `rec-${Date.now()}@test.com` });
    admin = await createUser({ role: 'admin', email: `admin-${Date.now()}@test.com` });
    candidate = await createUser({ role: 'candidate', email: `cand-${Date.now()}@test.com` });

    job = await createJob(recruiter.token);

    await request
      .post('/api/applications')
      .set('Authorization', `Bearer ${candidate.token}`)
      .send({ jobId: job._id });
  });

  describe('GET /api/reports/candidates', () => {
    it('should generate JSON report for recruiter', async () => {
      const res = await request
        .get('/api/reports/candidates')
        .set('Authorization', `Bearer ${recruiter.token}`);

      expect(res.status).toBe(200);
      expect(res.body.report).toBeDefined();
      expect(Array.isArray(res.body.report)).toBe(true);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.totalCandidates).toBeGreaterThanOrEqual(1);
    });

    it('should filter report by job', async () => {
      const res = await request
        .get(`/api/reports/candidates?jobId=${job._id}`)
        .set('Authorization', `Bearer ${recruiter.token}`);

      expect(res.status).toBe(200);
      expect(res.body.report.length).toBe(1);
    });

    it('should export CSV when format=csv', async () => {
      const res = await request
        .get('/api/reports/candidates?format=csv')
        .set('Authorization', `Bearer ${recruiter.token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Candidate Name');
    });

    it('should deny candidates from accessing reports', async () => {
      const res = await request
        .get('/api/reports/candidates')
        .set('Authorization', `Bearer ${candidate.token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/reports/overview', () => {
    it('should return system overview for admin', async () => {
      const res = await request
        .get('/api/reports/overview')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.overview).toBeDefined();
      expect(res.body.overview.totalJobs).toBeGreaterThanOrEqual(1);
    });

    it('should deny recruiter from overview', async () => {
      const res = await request
        .get('/api/reports/overview')
        .set('Authorization', `Bearer ${recruiter.token}`);

      expect(res.status).toBe(403);
    });
  });
});
