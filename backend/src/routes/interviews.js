const express = require('express');
const Interview = require('../models/Interview');
const Application = require('../models/Application');
const Job = require('../models/Job');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { createAuditEntry } = require('../middleware/auditLogger');

const router = express.Router();

/**
 * POST /api/interviews — Schedule a new interview
 */
router.post('/', authenticate, authorize('recruiter', 'admin'), asyncHandler(async (req, res) => {
  const { applicationId, scheduledAt, duration, timezone, link, location, type, notes } = req.body;

  if (!applicationId || !scheduledAt) {
    throw new AppError('applicationId and scheduledAt are required.', 400);
  }

  // Validate application exists
  const application = await Application.findById(applicationId).populate('jobId');
  if (!application) throw new AppError('Application not found.', 404);

  const job = await Job.findById(application.jobId);
  if (!job) throw new AppError('Associated job not found.', 404);

  // Ownership check: recruiters can only schedule for their own jobs
  if (req.user.role === 'recruiter' && job.recruiterId.toString() !== req.user._id.toString()) {
    throw new AppError('You can only schedule interviews for your own job postings.', 403);
  }

  const scheduledDate = new Date(scheduledAt);
  const durationMins = duration || 60;

  // Conflict detection — check recruiter and candidate availability
  const endTime = new Date(scheduledDate.getTime() + durationMins * 60000);

  const conflicts = await Interview.find({
    status: { $in: ['scheduled', 'rescheduled'] },
    $or: [
      { recruiterId: req.user._id },
      { candidateId: application.candidateId },
    ],
    scheduledAt: { $lt: endTime },
    $expr: {
      $gt: [
        { $add: ['$scheduledAt', { $multiply: ['$duration', 60000] }] },
        scheduledDate,
      ],
    },
  });

  if (conflicts.length > 0) {
    throw new AppError(
      `Scheduling conflict detected. ${conflicts.length} overlapping interview(s) found.`,
      409,
    );
  }

  const interview = await Interview.create({
    applicationId,
    jobId: application.jobId,
    candidateId: application.candidateId,
    recruiterId: req.user._id,
    scheduledAt: scheduledDate,
    duration: durationMins,
    timezone: timezone || 'UTC',
    link,
    location,
    type: type || 'video',
    notes,
    createdBy: req.user._id,
  });

  // Auto-update application status to 'interview'
  if (application.status !== 'interview') {
    application.status = 'interview';
    application.statusHistory.push({
      status: 'interview',
      changedAt: new Date(),
      changedBy: req.user._id,
    });
    application.interview = { scheduledAt: scheduledDate, link, notes };
    await application.save();
  }

  await createAuditEntry({
    action: 'interview.schedule',
    userId: req.user._id,
    userRole: req.user.role,
    targetType: 'interview',
    targetId: interview._id,
    metadata: { applicationId, scheduledAt, candidateId: application.candidateId.toString() },
    req,
  });

  res.status(201).json({ message: 'Interview scheduled.', interview });
}));

/**
 * GET /api/interviews — List interviews (filtered by role)
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { status, jobId, page = 1, limit = 20 } = req.query;
  const query = {};

  // Candidates see their own interviews
  if (req.user.role === 'candidate') {
    query.candidateId = req.user._id;
  }
  // Recruiters see interviews they created
  if (req.user.role === 'recruiter') {
    query.recruiterId = req.user._id;
  }
  // Admin sees all

  if (status) query.status = status;
  if (jobId) query.jobId = jobId;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [interviews, total] = await Promise.all([
    Interview.find(query)
      .populate('candidateId', 'profile.firstName profile.lastName email')
      .populate('jobId', 'title')
      .populate('applicationId', 'matchScore status')
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Interview.countDocuments(query),
  ]);

  res.json({
    interviews,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
}));

/**
 * GET /api/interviews/:id — Get single interview
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id)
    .populate('candidateId', 'profile email')
    .populate('jobId', 'title description')
    .populate('recruiterId', 'profile.firstName profile.lastName email');

  if (!interview) throw new AppError('Interview not found.', 404);

  // Access control
  if (req.user.role === 'candidate' && interview.candidateId._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied.', 403);
  }
  if (req.user.role === 'recruiter' && interview.recruiterId._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied.', 403);
  }

  res.json({ interview });
}));

/**
 * PATCH /api/interviews/:id — Update/reschedule interview
 */
router.patch('/:id', authenticate, authorize('recruiter', 'admin'), asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new AppError('Interview not found.', 404);

  if (req.user.role === 'recruiter' && interview.recruiterId.toString() !== req.user._id.toString()) {
    throw new AppError('You can only modify your own interviews.', 403);
  }

  const allowedFields = ['scheduledAt', 'duration', 'timezone', 'link', 'location', 'type', 'notes', 'status', 'feedback'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) interview[field] = req.body[field];
  });

  // If rescheduling, update status
  if (req.body.scheduledAt && req.body.scheduledAt !== interview.scheduledAt?.toISOString()) {
    interview.status = 'rescheduled';
  }

  await interview.save();

  await createAuditEntry({
    action: 'interview.update',
    userId: req.user._id,
    userRole: req.user.role,
    targetType: 'interview',
    targetId: interview._id,
    metadata: { changes: Object.keys(req.body) },
    req,
  });

  res.json({ message: 'Interview updated.', interview });
}));

/**
 * DELETE /api/interviews/:id — Cancel interview
 */
router.delete('/:id', authenticate, authorize('recruiter', 'admin'), asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new AppError('Interview not found.', 404);

  if (req.user.role === 'recruiter' && interview.recruiterId.toString() !== req.user._id.toString()) {
    throw new AppError('You can only cancel your own interviews.', 403);
  }

  interview.status = 'cancelled';
  await interview.save();

  await createAuditEntry({
    action: 'interview.cancel',
    userId: req.user._id,
    userRole: req.user.role,
    targetType: 'interview',
    targetId: interview._id,
    req,
  });

  res.json({ message: 'Interview cancelled.' });
}));

module.exports = router;
