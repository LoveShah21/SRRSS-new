const express = require('express');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// All audit-log routes require admin role
router.use(authenticate, authorize('admin'));

/**
 * GET /api/audit-logs — List audit logs (paginated, filterable)
 */
router.get('/', asyncHandler(async (req, res) => {
  const { action, userId, targetType, startDate, endDate, page = 1, limit = 50 } = req.query;

  const query = {};
  if (action) query.action = { $regex: action, $options: 'i' };
  if (userId) query.userId = userId;
  if (targetType) query.targetType = targetType;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('userId', 'profile.firstName profile.lastName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    AuditLog.countDocuments(query),
  ]);

  res.json({
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
}));

/**
 * POST /api/audit-logs — Manual audit log entry (restricted to system actions only)
 * Admins cannot create arbitrary audit entries — this endpoint is reserved for
 * system-generated events originating from external integrations.
 */
router.post('/', asyncHandler(async (req, res) => {
  const { action, targetType, targetId, metadata } = req.body;

  if (!action) throw new AppError('Action is required.', 400);

  // Only allow system-prefixed actions — prevent admins from fabricating audit entries
  if (!action.startsWith('system.')) {
    throw new AppError('Manual audit logs must use actions prefixed with "system.".', 400);
  }

  const log = await AuditLog.create({
    action,
    userId: req.user._id,
    userRole: req.user.role,
    targetType,
    targetId,
    metadata: { ...metadata, manual: true },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(201).json({ message: 'Audit log created.', log });
}));

module.exports = router;
