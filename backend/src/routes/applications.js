const express = require('express');
const axios = require('axios');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { createAuditEntry } = require('../middleware/auditLogger');
const { sendStatusChange, sendApplicationReceived } = require('../services/emailService');

const router = express.Router();

/**
 * POST /api/applications — Apply to a job (Candidate)
 */
router.post('/', authenticate, authorize('candidate'), asyncHandler(async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) throw new AppError('jobId is required.', 400);

  const job = await Job.findById(jobId);
  if (!job) throw new AppError('Job not found.', 404);
  if (job.status !== 'open') throw new AppError('This job is no longer accepting applications.', 400);

  // Check for duplicate application
  const existing = await Application.findOne({ candidateId: req.user._id, jobId });
  if (existing) throw new AppError('You have already applied to this job.', 409);

  // Score the candidate against the job (AI service)
  let matchScore = 0;
  let scoreBreakdown = { skills: 0, experience: 0, education: 0 };

  try {
    const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const scoreResult = await axios.post(`${aiUrl}/api/score-candidate`, {
      candidate_profile: req.user.profile,
      job_description: {
        title: job.title,
        description: job.description,
        requiredSkills: job.requiredSkills,
        experienceMin: job.experienceMin,
      },
    }, { timeout: 5000 });

    if (scoreResult.data) {
      matchScore = scoreResult.data.matchScore || 0;
      scoreBreakdown = scoreResult.data.breakdown || scoreBreakdown;
    }
  } catch {
    // AI unavailable — score remains 0, will be recalculated later
  }

  const application = await Application.create({
    candidateId: req.user._id,
    jobId,
    matchScore,
    scoreBreakdown,
  });

  // Increment applicant count
  await Job.findByIdAndUpdate(jobId, { $inc: { applicantCount: 1 } });

  // Send confirmation email (non-blocking)
  sendApplicationReceived({
    candidateEmail: req.user.email,
    candidateName: `${req.user.profile?.firstName || ''} ${req.user.profile?.lastName || ''}`.trim(),
    jobTitle: job.title,
  }).catch(() => {});

  res.status(201).json({ message: 'Application submitted.', application });
}));

/**
 * GET /api/applications/me — Get candidate's own applications
 */
router.get('/me', authenticate, authorize('candidate'), asyncHandler(async (req, res) => {
  const applications = await Application.find({ candidateId: req.user._id })
    .populate('jobId', 'title location status recruiterId')
    .sort({ appliedAt: -1 });

  res.json({ applications });
}));

/**
 * GET /api/applications/job/:jobId — Get applications for a job (Recruiter/Admin)
 */
router.get('/job/:jobId', authenticate, authorize('recruiter', 'admin'), asyncHandler(async (req, res) => {
  const { sortBy = 'matchScore', order = 'desc', status, page = 1, limit = 20 } = req.query;

  const job = await Job.findById(req.params.jobId);
  if (!job) throw new AppError('Job not found.', 404);

  // Recruiters can only see applications for their own jobs
  if (req.user.role === 'recruiter' && job.recruiterId.toString() !== req.user._id.toString()) {
    throw new AppError('You can only view applications for your own jobs.', 403);
  }

  const query = { jobId: req.params.jobId };
  if (status) query.status = status;

  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [applications, total] = await Promise.all([
    Application.find(query)
      .populate('candidateId', 'profile email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit)),
    Application.countDocuments(query),
  ]);

  res.json({
    applications,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
  });
}));

/**
 * PATCH /api/applications/:id/status — Update application status (Recruiter/Admin)
 */
router.patch('/:id/status', authenticate, authorize('recruiter', 'admin'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['applied', 'shortlisted', 'interview', 'hired', 'rejected'];
  if (!validStatuses.includes(status)) {
    throw new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400);
  }

  const application = await Application.findById(req.params.id)
    .populate('candidateId', 'profile email')
    .populate('jobId', 'title');

  if (!application) throw new AppError('Application not found.', 404);

  const previousStatus = application.status;
  application.status = status;
  application.statusHistory.push({
    status,
    changedAt: new Date(),
    changedBy: req.user._id,
  });

  await application.save();

  // Send email notification on significant status changes (non-blocking)
  if (status !== previousStatus && ['shortlisted', 'interview', 'hired', 'rejected'].includes(status)) {
    sendStatusChange({
      candidateEmail: application.candidateId?.email,
      candidateName: `${application.candidateId?.profile?.firstName || ''} ${application.candidateId?.profile?.lastName || ''}`.trim(),
      jobTitle: application.jobId?.title || 'Unknown Position',
      newStatus: status,
    }).catch(() => {});
  }

  // Audit log
  await createAuditEntry({
    action: 'application.statusChange',
    userId: req.user._id,
    userRole: req.user.role,
    targetType: 'application',
    targetId: application._id,
    metadata: { previousStatus, newStatus: status },
    req,
  });

  res.json({ message: `Status updated to "${status}".`, application });
}));

/**
 * PATCH /api/applications/:id/interview — Schedule interview (legacy endpoint)
 */
router.patch('/:id/interview', authenticate, authorize('recruiter', 'admin'), asyncHandler(async (req, res) => {
  const { scheduledAt, link, notes } = req.body;
  if (!scheduledAt) throw new AppError('scheduledAt is required.', 400);

  const application = await Application.findById(req.params.id);
  if (!application) throw new AppError('Application not found.', 404);

  application.interview = { scheduledAt, link, notes };
  if (application.status !== 'interview') {
    application.status = 'interview';
    application.statusHistory.push({
      status: 'interview',
      changedAt: new Date(),
      changedBy: req.user._id,
    });
  }

  await application.save();

  await createAuditEntry({
    action: 'interview.schedule',
    userId: req.user._id,
    userRole: req.user.role,
    targetType: 'application',
    targetId: application._id,
    metadata: { scheduledAt },
    req,
  });

  res.json({ message: 'Interview scheduled.', application });
}));

module.exports = router;
