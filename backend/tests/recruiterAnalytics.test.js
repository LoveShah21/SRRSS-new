require('./setup');
const { request, createUser, createJob } = require('./helpers');

describe('Recruiter Analytics Regression', () => {
  let recruiterA;
  let recruiterB;
  let admin;
  let candidateA;
  let candidateB;
  let jobA;
  let jobB;

  beforeEach(async () => {
    recruiterA = await createUser({ role: 'recruiter', email: `rec-a-${Date.now()}@test.com` });
    recruiterB = await createUser({ role: 'recruiter', email: `rec-b-${Date.now()}@test.com` });
    admin = await createUser({ role: 'admin', email: `admin-${Date.now()}@test.com` });
    candidateA = await createUser({ role: 'candidate', email: `cand-a-${Date.now()}@test.com` });
    candidateB = await createUser({ role: 'candidate', email: `cand-b-${Date.now()}@test.com` });

    jobA = await createJob(recruiterA.token, {
      title: 'Scoped Job A',
      description: 'Owned by recruiter A',
    });
    jobB = await createJob(recruiterB.token, {
      title: 'Scoped Job B',
      description: 'Owned by recruiter B',
    });

    await request
      .post('/api/applications')
      .set('Authorization', `Bearer ${candidateA.token}`)
      .send({ jobId: jobA._id });

    await request
      .post('/api/applications')
      .set('Authorization', `Bearer ${candidateB.token}`)
      .send({ jobId: jobB._id });
  });

  it('returns recruiter-scoped analytics for recruiter users', async () => {
    const res = await request
      .get('/api/recruiter/analytics')
      .set('Authorization', `Bearer ${recruiterA.token}`);

    expect(res.status).toBe(200);
    expect(res.body.analytics.jobs.total).toBe(1);
    expect(res.body.analytics.applications.total).toBe(1);
    expect(Array.isArray(res.body.analytics.topJobs)).toBe(true);
    expect(Array.isArray(res.body.analytics.weeklyTrend)).toBe(true);
  });

  it('returns system-wide analytics for admin users', async () => {
    const res = await request
      .get('/api/recruiter/analytics')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.analytics.jobs.total).toBeGreaterThanOrEqual(2);
    expect(res.body.analytics.applications.total).toBeGreaterThanOrEqual(2);
  });

  it('returns zeroed analytics for recruiter without jobs', async () => {
    const recruiterNoJobs = await createUser({ role: 'recruiter', email: `rec-empty-${Date.now()}@test.com` });

    const res = await request
      .get('/api/recruiter/analytics')
      .set('Authorization', `Bearer ${recruiterNoJobs.token}`);

    expect(res.status).toBe(200);
    expect(res.body.analytics.jobs.total).toBe(0);
    expect(res.body.analytics.applications.total).toBe(0);
    expect(res.body.analytics.topJobs).toEqual([]);
  });
});
