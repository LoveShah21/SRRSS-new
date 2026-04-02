const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Create an audit log entry.
 * Can be called directly from route handlers or used as middleware.
 */
async function createAuditEntry({ action, userId, userRole, targetType, targetId, metadata, req }) {
  try {
    await AuditLog.create({
      action,
      userId,
      userRole,
      targetType,
      targetId,
      metadata,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get?.('User-Agent'),
    });
  } catch (err) {
    // Audit logging should never break the main flow
    logger.error('Failed to create audit log entry', { error: err.message, action });
  }
}

/**
 * Express middleware factory that automatically logs actions.
 * Attach after the route handler has sent its response.
 *
 * Usage:
 *   router.post('/jobs', authenticate, authorize('recruiter'), asyncHandler(handler), auditMiddleware('job.create', 'job'));
 *
 * Or more commonly, call createAuditEntry() directly inside route handlers.
 */
function auditMiddleware(action, targetType) {
  return (req, res, next) => {
    // Hook into the response finish event
    const originalEnd = res.end;
    res.end = function (...args) {
      // Only log successful mutations (2xx status, non-GET)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.method !== 'GET') {
        createAuditEntry({
          action,
          userId: req.user?._id,
          userRole: req.user?.role,
          targetType,
          targetId: req.params?.id,
          metadata: {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
          },
          req,
        });
      }
      originalEnd.apply(res, args);
    };
    next();
  };
}

module.exports = { createAuditEntry, auditMiddleware };
