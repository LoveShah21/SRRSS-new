const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { sendEmailVerification, sendPasswordReset } = require('../services/emailService');
const { createAuditEntry } = require('../middleware/auditLogger');

const router = express.Router();

// Cookie configuration for httpOnly tokens
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

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

  res.cookie('srrss_access_token', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie('srrss_refresh_token', refreshToken, cookieOptions);

  res.status(201).json({
    message: 'Registration successful.',
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
    await createAuditEntry({
      action: 'auth.login.failed',
      targetType: 'user',
      metadata: { email },
      req,
    });
    throw new AppError('Invalid email or password.', 401);
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie('srrss_access_token', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie('srrss_refresh_token', refreshToken, cookieOptions);

  res.json({
    message: 'Login successful.',
    user,
  });
}));

/**
 * POST /api/auth/refresh
 */
/**
 * POST /api/auth/refresh
 * Reads the refresh token from the httpOnly cookie rather than the request body.
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.srrss_refresh_token;
  if (!refreshToken) {
    throw new AppError('Refresh token is required.', 400);
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    res.clearCookie('srrss_access_token');
    res.clearCookie('srrss_refresh_token');
    throw new AppError('Invalid or expired refresh token.', 401);
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    res.clearCookie('srrss_access_token');
    res.clearCookie('srrss_refresh_token');
    throw new AppError('Invalid refresh token.', 401);
  }

  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie('srrss_access_token', newAccessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('srrss_refresh_token', newRefreshToken, cookieOptions);

  res.json({ message: 'Token refreshed.' });
}));

/**
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  res.clearCookie('srrss_access_token');
  res.clearCookie('srrss_refresh_token');
  res.json({ message: 'Logged out successfully.' });
}));

/**
 * GET /api/auth/me — Get current user
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

/**
 * POST /api/auth/verify-email — Send verification email
 */
router.post('/verify-email', authenticate, asyncHandler(async (req, res) => {
  const user = req.user;
  
  if (user.isEmailVerified) {
    throw new AppError('Email already verified.', 400);
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = verificationExpires;
  await user.save({ validateBeforeSave: false });

  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;
  await sendEmailVerification({
    to: user.email,
    firstName: user.profile?.firstName || 'User',
    verificationUrl,
  });

  res.json({ message: 'Verification email sent.' });
}));

/**
 * GET /api/auth/verify/:token — Verify email with token
 */
router.get('/verify/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError('Invalid or expired verification token.', 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({ message: 'Email verified successfully.' });
}));

/**
 * POST /api/auth/resend-verification — Resend verification email
 */
router.post('/resend-verification', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required.', 400);
  }

  const user = await User.findOne({ email });

  if (user && !user.isEmailVerified) {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save({ validateBeforeSave: false });

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;
    await sendEmailVerification({
      to: user.email,
      firstName: user.profile?.firstName || 'User',
      verificationUrl,
    });
  }

  // Always return the same message to prevent email enumeration
  res.json({ message: 'If that email exists, a verification link has been sent.' });
}));

/**
 * POST /api/auth/forgot-password — Generate password reset token
 */
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required.', 400);
  }

  const user = await User.findOne({ email });

  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    await sendPasswordReset({
      to: user.email,
      firstName: user.profile?.firstName || 'User',
      resetUrl,
    });
  }

  // Always return the same message to prevent email enumeration
  res.json({ message: 'If that email exists, a password reset link has been sent.' });
}));

/**
 * POST /api/auth/reset-password — Reset password using token
 */
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    throw new AppError('Token and new password are required.', 400);
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user) {
    throw new AppError('Invalid or expired reset token.', 400);
  }

  user.passwordHash = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  // Invalidate all existing sessions
  user.refreshToken = undefined;
  await user.save();

  await createAuditEntry({
    action: 'auth.passwordReset',
    userId: user._id,
    targetType: 'user',
    metadata: { email: user.email },
    req,
  });

  res.json({ message: 'Password reset successful. Please log in with your new password.' });
}));
