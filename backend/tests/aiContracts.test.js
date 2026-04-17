require('./setup');

jest.mock('axios');
jest.mock('../src/utils/urlValidator', () => ({
  isSafeExternalUrl: jest.fn().mockResolvedValue(true),
  parseTrustedHosts: jest.fn(() => []),
}));
jest.mock('../src/services/storageService', () => ({
  generateKey: jest.fn(() => 'resumes/test-user/resume.pdf'),
  uploadFile: jest.fn().mockResolvedValue({
    key: 'resumes/test-user/resume.pdf',
    url: 'r2://srrss/resumes/test-user/resume.pdf',
  }),
  getDownloadUrl: jest.fn().mockResolvedValue('https://files.example.com/resume.pdf'),
  deleteFile: jest.fn(),
  isConfigured: jest.fn(() => true),
}));

const axios = require('axios');
const { request, createUser, createJob } = require('./helpers');
const storageService = require('../src/services/storageService');

describe('Backend ↔ AI contract', () => {
  let recruiter;
  let candidate;
  let job;
  const originalAiUrl = process.env.AI_SERVICE_URL;
  const originalAiKey = process.env.AI_SERVICE_API_KEY;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.AI_SERVICE_URL = 'https://ai.example.com';
    process.env.AI_SERVICE_API_KEY = 'test-ai-key';

    recruiter = await createUser({ role: 'recruiter', email: `rec-ai-${Date.now()}@test.com` });
    candidate = await createUser({ role: 'candidate', email: `cand-ai-${Date.now()}@test.com` });
    job = await createJob(recruiter.token, {
      title: 'ML Engineer',
      description: 'Build fair and explainable ranking systems.',
      requiredSkills: ['Python', 'FastAPI'],
      experienceMin: 2,
    });
  });

  afterAll(() => {
    process.env.AI_SERVICE_URL = originalAiUrl;
    process.env.AI_SERVICE_API_KEY = originalAiKey;
  });

  it('maps bias detection response contract on job create', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        biasFlags: [
          { term: 'rockstar', suggestion: 'Use neutral role language', severity: 'medium' },
        ],
        biasScore: 42,
        isBiased: true,
        recommendation: 'Use inclusive wording',
      },
    });

    const res = await request
      .post('/api/jobs')
      .set('Authorization', `Bearer ${recruiter.token}`)
      .send({
        title: 'Senior Platform Engineer',
        description: 'Looking for a rockstar engineer with aggressive mindset.',
        requiredSkills: ['Node.js', 'MongoDB'],
      });

    expect(res.status).toBe(201);
    expect(Array.isArray(res.body.job.biasFlags)).toBe(true);
    expect(res.body.job.biasFlags.length).toBe(1);
    expect(res.body.job.biasFlags[0].term).toBe('rockstar');

    expect(axios.post).toHaveBeenCalledWith(
      'https://ai.example.com/api/detect-bias',
      expect.objectContaining({ job_description: expect.any(String) }),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-API-KEY': 'test-ai-key' }),
      }),
    );
  });

  it('maps score candidate response contract on apply', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        matchScore: 87.5,
        breakdown: { skills: 90, experience: 80, education: 70 },
        explanation: {
          matchedSkills: ['Python'],
          missingSkills: ['FastAPI'],
          experienceNote: 'Strong backend background.',
        },
      },
    });

    const res = await request
      .post('/api/applications')
      .set('Authorization', `Bearer ${candidate.token}`)
      .send({ jobId: job._id });

    expect(res.status).toBe(201);
    expect(res.body.application.matchScore).toBe(87.5);
    expect(res.body.application.scoreBreakdown.skills).toBe(90);
    expect(res.body.application.aiExplanation.matchedSkills).toContain('Python');
    expect(res.body.application.aiExplanation.missingSkills).toContain('FastAPI');
    expect(res.body.application.aiExplanation.experienceNote).toMatch(/Strong backend/i);

    expect(axios.post).toHaveBeenCalledWith(
      'https://ai.example.com/api/score-candidate',
      expect.objectContaining({
        candidate_profile: expect.any(Object),
        job_description: expect.any(Object),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-API-KEY': 'test-ai-key' }),
      }),
    );
  });

  it('maps parse-resume response contract on upload', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        skills: ['React', 'Node.js'],
        education: [{ institution: 'Test University', year: '2022', degree: 'B.Tech' }],
        experience: [{ company: 'Acme', role: 'Developer', duration: '2 years' }],
        projects: [{ name: 'Portfolio Site', techStack: ['React', 'Node.js'], description: 'Built full-stack app.' }],
      },
    });

    const res = await request
      .post('/api/resume/upload')
      .set('Authorization', `Bearer ${candidate.token}`)
      .attach('resume', Buffer.from('%PDF-1.4 contract test'), {
        filename: 'resume.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(200);
    expect(res.body.parsed).toBeDefined();
    expect(res.body.parsed.skills).toContain('React');
    expect(res.body.user.profile.projects[0].name).toBe('Portfolio Site');
    expect(storageService.uploadFile).toHaveBeenCalledTimes(1);
    expect(storageService.getDownloadUrl).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      'https://ai.example.com/api/parse-resume',
      expect.objectContaining({
        file_url: expect.any(String),
        file_type: 'pdf',
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-API-KEY': 'test-ai-key' }),
      }),
    );
  });

  it('falls back safely when AI key is missing', async () => {
    process.env.AI_SERVICE_API_KEY = '';

    const res = await request
      .post('/api/resume/upload')
      .set('Authorization', `Bearer ${candidate.token}`)
      .attach('resume', Buffer.from('%PDF-1.4 fallback test'), {
        filename: 'resume.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(200);
    expect(res.body.parsed).toBeNull();
    expect(res.body.message).toMatch(/parsing pending/i);
    const parseResumeCalls = axios.post.mock.calls.filter(([url]) => url.includes('/api/parse-resume'));
    expect(parseResumeCalls.length).toBe(0);
  });
});
