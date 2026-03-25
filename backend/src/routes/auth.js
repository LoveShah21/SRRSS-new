const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Generate JWT tokens
const generateAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

/**
 * POST /api/auth/register
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, role, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    throw new AppError('Email, password, firstName, and lastName are required.', 400);
  }

  // Only allow candidate/recruiter self-registration
  const allowedRoles = ['candidate', 'recruiter'];
  const userRole = allowedRoles.includes(role) ? role : 'candidate';

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email already registered.', 409);
  }

  const user = await User.create({
    email,
    passwordHash: password,
    role: userRole,
    profile: { firstName, lastName },
  });

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.status(201).json({
    message: 'Registration successful.',
    token: accessToken,
    refreshToken,
    user,
  });
}));

/**
 * POST /api/auth/login
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required.', 400);
  }

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password.', 401);
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.json({
    message: 'Login successful.',
    token: accessToken,
    refreshToken,
    user,
  });
}));

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new AppError('Refresh token is required.', 400);
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token.', 401);
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    throw new AppError('Invalid refresh token.', 401);
  }

  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  res.json({
    token: newAccessToken,
    refreshToken: newRefreshToken,
  });
}));

/**
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  res.json({ message: 'Logged out successfully.' });
}));

/**
 * GET /api/auth/me — Get current user
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

module.exports = router;
