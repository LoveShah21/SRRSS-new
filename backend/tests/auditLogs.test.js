require('./setup');
const { request, createUser, createJob } = require('./helpers');

describe('Audit Logs API', () => {
  let admin, recruiter, candidate;

  beforeEach(async () => {
    admin = await createUser({ role: 'admin', email: `admin-${Date.now()}@test.com` });
    recruiter = await createUser({ role: 'recruiter', email: `rec-${Date.now()}@test.com` });
    candidate = await createUser({ role: 'candidate', email: `cand-${Date.now()}@test.com` });
  });

  describe('GET /api/audit-logs', () => {
    it('should list audit logs for admin', async () => {
      // Create a manual audit log first
      await request
        .post('/api/audit-logs')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ action: 'test.action', targetType: 'system' });

      const res = await request
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(Array.isArray(res.body.logs)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('should deny recruiter from audit logs', async () => {
      const res = await request
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${recruiter.token}`);

      expect(res.status).toBe(403);
    });

    it('should deny candidate from audit logs', async () => {
      const res = await request
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${candidate.token}`);

      expect(res.status).toBe(403);
    });

    it('should filter by action', async () => {
      await request
        .post('/api/audit-logs')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ action: 'user.create', targetType: 'user' });

      const res = await request
        .get('/api/audit-logs?action=user.create')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.logs.every((l) => l.action.includes('user.create'))).toBe(true);
    });
  });

  describe('POST /api/audit-logs', () => {
    it('should create a manual audit log', async () => {
      const res = await request
        .post('/api/audit-logs')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          action: 'manual.test',
          targetType: 'system',
          metadata: { note: 'Test entry' },
        });

      expect(res.status).toBe(201);
      expect(res.body.log.action).toBe('manual.test');
    });

    it('should require action field', async () => {
      const res = await request
        .post('/api/audit-logs')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('Auto audit logging via mutations', () => {
    it('should auto-log when application status changes', async () => {
      const job = await createJob(recruiter.token);

      const appRes = await request
        .post('/api/applications')
        .set('Authorization', `Bearer ${candidate.token}`)
        .send({ jobId: job._id });

      await request
        .patch(`/api/applications/${appRes.body.application._id}/status`)
        .set('Authorization', `Bearer ${recruiter.token}`)
        .send({ status: 'shortlisted' });

      // Check audit logs for the status change action
      const logsRes = await request
        .get('/api/audit-logs?action=application.statusChange')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(logsRes.status).toBe(200);
      expect(logsRes.body.logs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
