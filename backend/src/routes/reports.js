const express = require('express');
const Application = require('../models/Application');
const User = require('../models/User');
const Job = require('../models/Job');
const Interview = require('../models/Interview');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/reports/candidates — Export candidate report data (CSV-ready JSON)
 */
router.get('/candidates', authenticate, authorize('recruiter', 'admin'), asyncHandler(async (req, res) => {
  const { jobId, status, format = 'json' } = req.query;

  const appQuery = {};
  if (status) appQuery.status = status;

  // Recruiters can only report on their own jobs
  if (req.user.role === 'recruiter') {
    const recruiterJobs = await Job.find({ recruiterId: req.user._id }).select('_id');
    const jobIds = recruiterJobs.map((j) => j._id);
    if (jobId) {
      if (!jobIds.some((jid) => jid.toString() === jobId)) {
        throw new AppError('You can only generate reports for your own jobs.', 403);
      }
      appQuery.jobId = jobId;
    } else {
      appQuery.jobId = { $in: jobIds };
    }
  } else if (jobId) {
    appQuery.jobId = jobId;
  }

  const applications = await Application.find(appQuery)
    .populate('candidateId', 'profile email')
    .populate('jobId', 'title location status')
    .sort({ matchScore: -1 });

  const reportData = applications.map((app) => ({
    candidateName: `${app.candidateId?.profile?.firstName || ''} ${app.candidateId?.profile?.lastName || ''}`.trim(),
    candidateEmail: app.candidateId?.email || '',
    skills: (app.candidateId?.profile?.skills || []).join(', '),
    jobTitle: app.jobId?.title || '',
    jobLocation: app.jobId?.location || '',
    matchScore: app.matchScore,
    skillsScore: app.scoreBreakdown?.skills || 0,
    experienceScore: app.scoreBreakdown?.experience || 0,
    educationScore: app.scoreBreakdown?.education || 0,
    status: app.status,
    appliedAt: app.appliedAt?.toISOString() || '',
  }));

  if (format === 'csv') {
    const headers = [
      'Candidate Name', 'Email', 'Skills', 'Job Title', 'Location',
      'Match Score', 'Skills Score', 'Experience Score', 'Education Score',
      'Status', 'Applied At',
    ];
    const csvRows = [headers.join(',')];
    reportData.forEach((row) => {
      csvRows.push([
        `"${row.candidateName}"`,
        `"${row.candidateEmail}"`,
        `"${row.skills}"`,
        `"${row.jobTitle}"`,
        `"${row.jobLocation}"`,
        row.matchScore,
        row.skillsScore,
        row.experienceScore,
        row.educationScore,
        row.status,
        row.appliedAt,
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="candidate_report_${Date.now()}.csv"`);
    return res.send(csvRows.join('\n'));
  }

  res.json({
    report: reportData,
    summary: {
      totalCandidates: reportData.length,
      averageScore: reportData.length > 0
        ? Math.round(reportData.reduce((sum, r) => sum + r.matchScore, 0) / reportData.length)
        : 0,
      byStatus: reportData.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {}),
    },
    generatedAt: new Date().toISOString(),
  });
}));

/**
 * GET /api/reports/candidates/:id — Single candidate report
 */
router.get('/candidates/:id', authenticate, authorize('recruiter', 'admin'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role !== 'candidate') {
    throw new AppError('Candidate not found.', 404);
  }

  const applications = await Application.find({ candidateId: req.params.id })
    .populate('jobId', 'title location status requiredSkills');

  const interviews = await Interview.find({ candidateId: req.params.id })
    .populate('jobId', 'title')
    .sort({ scheduledAt: -1 });

  res.json({
    candidate: {
      _id: user._id,
      email: user.email,
      profile: user.profile,
      createdAt: user.createdAt,
    },
    applications: applications.map((app) => ({
      _id: app._id,
      job: app.jobId,
      matchScore: app.matchScore,
      scoreBreakdown: app.scoreBreakdown,
      status: app.status,
      statusHistory: app.statusHistory,
      appliedAt: app.appliedAt,
    })),
    interviews: interviews.map((iv) => ({
      _id: iv._id,
      job: iv.jobId,
      scheduledAt: iv.scheduledAt,
      status: iv.status,
      type: iv.type,
      feedback: iv.feedback,
    })),
    generatedAt: new Date().toISOString(),
  });
}));

/**
 * GET /api/reports/overview — System-wide report (admin)
 */
router.get('/overview', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const [
    totalCandidates,
    totalJobs,
    totalApplications,
    totalInterviews,
    statusBreakdown,
    topJobs,
  ] = await Promise.all([
    User.countDocuments({ role: 'candidate' }),
    Job.countDocuments(),
    Application.countDocuments(),
    Interview.countDocuments(),
    Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $group: { _id: '$jobId', count: { $sum: 1 }, avgScore: { $avg: '$matchScore' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: '_id',
          as: 'job',
        },
      },
      { $unwind: '$job' },
      {
        $project: {
          jobTitle: '$job.title',
          applicantCount: '$count',
          averageScore: { $round: ['$avgScore', 1] },
        },
      },
    ]),
  ]);

  const statusMap = {};
  statusBreakdown.forEach((s) => { statusMap[s._id] = s.count; });

  res.json({
    overview: {
      totalCandidates,
      totalJobs,
      totalApplications,
      totalInterviews,
      applicationsByStatus: statusMap,
      topJobs,
    },
    generatedAt: new Date().toISOString(),
  });
}));

module.exports = router;
