const express = require('express');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

/**
 * GET /api/admin/users — List all users (paginated)
 */
router.get('/users', asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;

  const query = {};
  if (role) query.role = role;
  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { 'profile.firstName': { $regex: search, $options: 'i' } },
      { 'profile.lastName': { $regex: search, $options: 'i' } },
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
router.patch('/users/:id/role', asyncHandler(async (req, res) => {
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
router.delete('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  res.json({ message: 'User deleted.' });
}));

/**
 * GET /api/admin/analytics — System analytics
 */
router.get('/analytics', asyncHandler(async (req, res) => {
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

module.exports = router;
