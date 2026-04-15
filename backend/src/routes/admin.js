const express = require('express');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { escapeRegex } = require('../utils/security');

const router = express.Router();

/**
 * GET /api/admin/users — List all users (paginated)
 */
router.get('/users', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;

  const query = {};
  if (role) query.role = role;
  if (search) {
    const safeSearch = escapeRegex(search);
    query.$or = [
      { email: { $regex: safeSearch, $options: 'i' } },
      { 'profile.firstName': { $regex: safeSearch, $options: 'i' } },
      { 'profile.lastName': { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    User.countDocuments(query),
  ]);

  res.json({
    users,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
  });
}));

/**
 * PATCH /api/admin/users/:id/role — Update user role
 */
router.patch('/users/:id/role', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { role } = req.body;
  const validRoles = ['candidate', 'recruiter', 'admin'];
  if (!validRoles.includes(role)) {
    throw new AppError(`Role must be one of: ${validRoles.join(', ')}`, 400);
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { returnDocument: 'after' },
  );
  if (!user) throw new AppError('User not found.', 404);

  res.json({ message: `Role updated to "${role}".`, user });
}));

/**
 * DELETE /api/admin/users/:id — Delete user
 */
router.delete('/users/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  res.json({ message: 'User deleted.' });
}));

/**
 * GET /api/admin/analytics — System analytics (admin only)
 */
router.get('/analytics', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalCandidates,
    totalRecruiters,
    totalJobs,
    openJobs,
    totalApplications,
    statusBreakdown,
    recentApplications,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'candidate' }),
    User.countDocuments({ role: 'recruiter' }),
    Job.countDocuments(),
    Job.countDocuments({ status: 'open' }),
    Application.countDocuments(),
    Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Application.countDocuments({
      appliedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  const statusMap = {};
  statusBreakdown.forEach((s) => { statusMap[s._id] = s.count; });

  res.json({
    analytics: {
      users: { total: totalUsers, candidates: totalCandidates, recruiters: totalRecruiters },
      jobs: { total: totalJobs, open: openJobs },
      applications: {
        total: totalApplications,
        lastWeek: recentApplications,
        byStatus: statusMap,
      },
    },
  });
}));

/**
 * GET /api/recruiter/analytics — Recruiter-specific analytics
 */
router.get('/recruiter/analytics', authenticate, authorize('recruiter', 'admin'), asyncHandler(async (req, res) => {
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

module.exports = router;
