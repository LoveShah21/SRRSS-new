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
    totalAdmins,
    totalJobs,
    openJobs,
    jobStatusBreakdown,
    totalApplications,
    statusBreakdown,
    recentApplications,
    signupTrend,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'candidate' }),
    User.countDocuments({ role: 'recruiter' }),
    User.countDocuments({ role: 'admin' }),
    Job.countDocuments(),
    Job.countDocuments({ status: 'open' }),
    Job.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Application.countDocuments(),
    Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Application.countDocuments({
      appliedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
    User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]),
  ]);

  const statusMap = {};
  statusBreakdown.forEach((s) => { statusMap[s._id] = s.count; });
  const jobStatusMap = {};
  jobStatusBreakdown.forEach((s) => { jobStatusMap[s._id] = s.count; });

  res.json({
    analytics: {
      users: {
        total: totalUsers,
        candidates: totalCandidates,
        recruiters: totalRecruiters,
        admins: totalAdmins,
        signupsTrend: signupTrend.map((point) => ({ date: point._id, count: point.count })),
      },
      jobs: { total: totalJobs, open: openJobs, byStatus: jobStatusMap },
      applications: {
        total: totalApplications,
        lastWeek: recentApplications,
        byStatus: statusMap,
      },
    },
  });
}));

module.exports = router;
