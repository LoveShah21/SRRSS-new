require('./setup');

jest.mock('axios');
jest.mock('../src/utils/urlValidator', () => ({
  isSafeExternalUrl: jest.fn().mockResolvedValue(true),
  parseTrustedHosts: jest.fn(() => []),
}));
jest.mock('../src/services/storageService', () => ({
  generateKey: jest.fn(() => 'resumes/happy-path/resume.pdf'),
  uploadFile: jest.fn().mockResolvedValue({
    key: 'resumes/happy-path/resume.pdf',
    url: 'r2://srrss/resumes/happy-path/resume.pdf',
  }),
  getDownloadUrl: jest.fn().mockResolvedValue('https://files.example.com/resume.pdf'),
  deleteFile: jest.fn(),
  isConfigured: jest.fn(() => true),
}));

const axios = require('axios');
const { request, createUser, createJob } = require('./helpers');

describe('Happy-path E2E flow', () => {
  let recruiter;
  let candidate;
  let job;
  const originalAiUrl = process.env.AI_SERVICE_URL;
  const originalAiKey = process.env.AI_SERVICE_API_KEY;

  beforeEach(async () => {
    process.env.AI_SERVICE_URL = 'https://ai.example.com';
    process.env.AI_SERVICE_API_KEY = 'test-ai-key';
    jest.clearAllMocks();

    axios.post.mockImplementation(async (url) => {
      if (url.endsWith('/api/parse-resume')) {
        return {
          data: {
            skills: ['Node.js', 'React'],
            education: [{ institution: 'Demo Institute', year: '2021' }],
            experience: [{ company: 'Demo Corp', role: 'Developer', duration: '2 years' }],
          },
        };
      }
      if (url.endsWith('/api/score-candidate')) {
        return {
          data: {
            matchScore: 83,
            breakdown: { skills: 85, experience: 80, education: 75 },
            explanation: {
              matchedSkills: ['Node.js'],
              missingSkills: ['MongoDB'],
              experienceNote: 'Relevant full-stack experience.',
            },
          },
        };
      }
      return { data: { biasFlags: [] } };
    });

    recruiter = await createUser({ role: 'recruiter', email: `rec-hp-${Date.now()}@test.com` });
    candidate = await createUser({ role: 'candidate', email: `cand-hp-${Date.now()}@test.com` });
    job = await createJob(recruiter.token, {
      title: 'Full Stack Engineer',
      description: 'Build and ship candidate workflows.',
      requiredSkills: ['Node.js', 'MongoDB'],
      experienceMin: 2,
    });
  });

  afterAll(() => {
    process.env.AI_SERVICE_URL = originalAiUrl;
    process.env.AI_SERVICE_API_KEY = originalAiKey;
  });

  it('covers resume upload → apply → rank → schedule → candidate visibility', async () => {
    const resumeUpload = await request
      .post('/api/resume/upload')
      .set('Authorization', `Bearer ${candidate.token}`)
      .attach('resume', Buffer.from('%PDF-1.4 happy path'), {
        filename: 'resume.pdf',
        contentType: 'application/pdf',
      });

    expect(resumeUpload.status).toBe(200);
    expect(resumeUpload.body.parsed.skills).toContain('Node.js');

    const applyRes = await request
      .post('/api/applications')
      .set('Authorization', `Bearer ${candidate.token}`)
      .send({ jobId: job._id });

    expect(applyRes.status).toBe(201);
    expect(applyRes.body.application.matchScore).toBeGreaterThan(0);
    const applicationId = applyRes.body.application._id;

    const rankRes = await request
      .post(`/api/applications/job/${job._id}/rank`)
      .set('Authorization', `Bearer ${recruiter.token}`)
      .send();

    expect(rankRes.status).toBe(200);
    expect(rankRes.body.rankedApplications.length).toBe(1);
    expect(rankRes.body.rankedApplications[0]._id).toBe(applicationId);

    const shortlistRes = await request
      .patch(`/api/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${recruiter.token}`)
      .send({ status: 'shortlisted' });

    expect(shortlistRes.status).toBe(200);
    expect(shortlistRes.body.application.status).toBe('shortlisted');

    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const scheduleRes = await request
      .post('/api/interviews')
      .set('Authorization', `Bearer ${recruiter.token}`)
      .send({
        applicationId,
        scheduledAt,
        duration: 60,
        type: 'video',
        link: 'https://meet.example.com/session-1',
      });

    expect(scheduleRes.status).toBe(201);
    expect(scheduleRes.body.interview.status).toBe('scheduled');

    const candidateInterviews = await request
      .get('/api/interviews')
      .set('Authorization', `Bearer ${candidate.token}`);

    expect(candidateInterviews.status).toBe(200);
    expect(candidateInterviews.body.interviews.length).toBeGreaterThan(0);
    expect(candidateInterviews.body.interviews[0].applicationId.status).toBe('interview');
  });
});
