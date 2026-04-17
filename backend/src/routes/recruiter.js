const express = require('express');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/recruiter/analytics — Recruiter-specific analytics
 */
router.get('/analytics', authenticate, authorize('recruiter', 'admin'), asyncHandler(async (req, res) => {
  const recruiterId = req.user._id;

  const recruiterJobs = await Job.find({ recruiterId }).select('_id title');
  const jobIds = recruiterJobs.map((j) => j._id);

  if (jobIds.length === 0) {
    return res.json({
      analytics: {
        jobs: { total: 0, open: 0 },
        applications: { total: 0, lastWeek: 0, byStatus: {}, averageScore: 0 },
        interviews: { scheduled: 0 },
        hiring: { avgTimeToHire: 0, totalHired: 0 },
        topJobs: [],
        weeklyTrend: [],
      },
    });
  }

  const [
    totalJobs,
    openJobs,
    totalApplications,
    statusBreakdown,
    avgScoreResult,
    recentApplications,
    interviewsScheduled,
    hiredApps,
    jobStats,
    trendData,
  ] = await Promise.all([
    Job.countDocuments({ recruiterId }),
    Job.countDocuments({ recruiterId, status: 'open' }),
    Application.countDocuments({ jobId: { $in: jobIds } }),
    Application.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { jobId: { $in: jobIds }, matchScore: { $gt: 0 } } },
      { $group: { _id: null, avgScore: { $avg: '$matchScore' } } },
    ]),
    Application.countDocuments({
      jobId: { $in: jobIds },
      appliedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
    Interview.countDocuments({ recruiterId }),
    Application.find({ jobId: { $in: jobIds }, status: 'hired' }).select('appliedAt'),
    Application.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: '$jobId', count: { $sum: 1 }, avgScore: { $avg: '$matchScore' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    Application.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$appliedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 14 },
    ]),
  ]);

  const statusMap = {};
  statusBreakdown.forEach((s) => { statusMap[s._id] = s.count; });

  let avgTimeToHire = 0;
  if (hiredApps.length > 0) {
    const totalDays = hiredApps.reduce((sum, app) => {
      const days = (new Date() - new Date(app.appliedAt)) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    avgTimeToHire = Math.round(totalDays / hiredApps.length);
  }

  const topJobs = jobStats.map((stat) => {
    const job = recruiterJobs.find((j) => j._id.toString() === stat._id.toString());
    return {
      jobTitle: job?.title || 'Unknown',
      applicantCount: stat.count,
      averageScore: stat.avgScore ? Math.round(stat.avgScore * 10) / 10 : 0,
    };
  });

  const weeklyTrend = trendData.map((d) => ({ date: d._id, count: d.count }));

  res.json({
    analytics: {
      jobs: { total: totalJobs, open: openJobs },
      applications: {
        total: totalApplications,
        lastWeek: recentApplications,
        byStatus: statusMap,
        averageScore: avgScoreResult[0]?.avgScore ? Math.round(avgScoreResult[0].avgScore) : 0,
      },
      interviews: { scheduled: interviewsScheduled },
      hiring: {
        avgTimeToHire,
        totalHired: statusMap.hired || 0,
      },
      topJobs,
      weeklyTrend,
    },
  });
}));

/**
 * GET /api/recruiter/settings — Recruiter UI settings
 */
router.get('/settings', authenticate, authorize('recruiter', 'admin'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('settings');
  res.json({
    settings: {
      blindScreeningEnabled: !!user?.settings?.recruiter?.blindScreeningEnabled,
    },
  });
}));

/**
 * PATCH /api/recruiter/settings — Update recruiter UI settings
 */
router.patch('/settings', authenticate, authorize('recruiter', 'admin'), asyncHandler(async (req, res) => {
  const { blindScreeningEnabled } = req.body;
  if (blindScreeningEnabled === undefined) {
    throw new AppError('blindScreeningEnabled is required.', 400);
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { 'settings.recruiter.blindScreeningEnabled': !!blindScreeningEnabled } },
    { new: true, runValidators: true },
  ).select('settings');

  res.json({
    message: 'Recruiter settings updated.',
    settings: {
      blindScreeningEnabled: !!user?.settings?.recruiter?.blindScreeningEnabled,
    },
  });
}));

module.exports = router;
