require('./setup');
const { request, createUser, createJob } = require('./helpers');

describe('Candidates API', () => {
  let recruiter, admin, candidate1, candidate2, job;

  beforeEach(async () => {
    recruiter = await createUser({ role: 'recruiter', email: `rec-${Date.now()}@test.com` });
    admin = await createUser({ role: 'admin', email: `admin-${Date.now()}@test.com` });
    candidate1 = await createUser({
      role: 'candidate',
      email: `c1-${Date.now()}@test.com`,
      firstName: 'Alice',
      lastName: 'Dev',
    });
    candidate2 = await createUser({
      role: 'candidate',
      email: `c2-${Date.now()}@test.com`,
      firstName: 'Bob',
      lastName: 'Eng',
    });

    job = await createJob(recruiter.token);

    // Both candidates apply
    await request
      .post('/api/applications')
      .set('Authorization', `Bearer ${candidate1.token}`)
      .send({ jobId: job._id });
    await request
      .post('/api/applications')
      .set('Authorization', `Bearer ${candidate2.token}`)
      .send({ jobId: job._id });
  });

  describe('GET /api/candidates', () => {
    it('should list candidates for recruiters', async () => {
      const res = await request
        .get('/api/candidates')
        .set('Authorization', `Bearer ${recruiter.token}`);

      expect(res.status).toBe(200);
      expect(res.body.candidates.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter candidates by job', async () => {
      const res = await request
        .get(`/api/candidates?jobId=${job._id}`)
        .set('Authorization', `Bearer ${recruiter.token}`);

      expect(res.status).toBe(200);
      expect(res.body.candidates.length).toBe(2);
    });

    it('should filter candidates by search term', async () => {
      const res = await request
        .get('/api/candidates?search=Alice')
        .set('Authorization', `Bearer ${recruiter.token}`);

      expect(res.status).toBe(200);
      // At minimum 1 candidate (Alice)
      expect(res.body.candidates.length).toBeGreaterThanOrEqual(1);
    });

    it('should deny candidates from accessing the list', async () => {
      const res = await request
        .get('/api/candidates')
        .set('Authorization', `Bearer ${candidate1.token}`);

      expect(res.status).toBe(403);
    });

    it('should allow admins to list all candidates', async () => {
      const res = await request
        .get('/api/candidates')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
    });
  });
});
