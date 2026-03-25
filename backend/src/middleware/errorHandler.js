/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, _next) => {
  // Only log errors outside of test environment to keep test output clean
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[ERROR] ${err.message}`, {
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      path: req.path,
      method: req.method,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: 'Validation failed', details: messages });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ error: `${field} already exists.` });
  }

  // Mongoose cast error (invalid ObjectId) — sanitize to avoid leaking internals
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid resource identifier.' });
  }

  // Custom app errors (operational)
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Default 500 — never expose raw error messages in production
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
};

/**
 * Async route handler wrapper
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Custom AppError class
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { errorHandler, asyncHandler, AppError };
