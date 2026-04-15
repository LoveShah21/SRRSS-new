const express = require('express');
const User = require('../models/User');
const Application = require('../models/Application');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { escapeRegex } = require('../utils/security');

const router = express.Router();

/**
 * GET /api/candidates — Recruiter candidate filter API
 * Query params: skills, experience_min, experience_max, score_min, status, jobId, search, page, limit
 */
router.get('/', authenticate, authorize('recruiter', 'admin'), asyncHandler(async (req, res) => {
  const {
    skills,
    experience_min,
    experience_max,
    score_min,
    status,
    jobId,
    search,
    page = 1,
    limit = 20,
    sortBy = 'matchScore',
    order = 'desc',
  } = req.query;

  // Build user query for candidates
  const userQuery = { role: 'candidate' };

  if (skills) {
    const skillList = skills.split(',').map((s) => s.trim());
    userQuery['profile.skills'] = { $in: skillList };
  }

  if (search) {
    const safeSearch = escapeRegex(search);
    userQuery.$or = [
      { email: { $regex: safeSearch, $options: 'i' } },
      { 'profile.firstName': { $regex: safeSearch, $options: 'i' } },
      { 'profile.lastName': { $regex: safeSearch, $options: 'i' } },
    ];
  }

  // If filtering by job, start from applications
  if (jobId) {
    const appQuery = { jobId };
    if (status) appQuery.status = status;
    if (score_min) appQuery.matchScore = { $gte: parseFloat(score_min) };

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [applications, total] = await Promise.all([
      Application.find(appQuery)
        .populate('candidateId', 'profile email')
        .populate('jobId', 'title')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Application.countDocuments(appQuery),
    ]);

    const candidates = applications.map((app) => ({
      _id: app.candidateId?._id,
      email: app.candidateId?.email,
      profile: app.candidateId?.profile,
      application: {
        _id: app._id,
        matchScore: app.matchScore,
        scoreBreakdown: app.scoreBreakdown,
        status: app.status,
        appliedAt: app.appliedAt,
      },
      job: app.jobId,
    }));

    return res.json({
      candidates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  }

  // General candidate listing (no specific job)
  if (experience_min || experience_max) {
    // Filter by total years of experience across all entries
    userQuery['profile.experience'] = { $exists: true };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(userQuery)
      .select('profile email createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(userQuery),
  ]);

  // Optionally attach latest application info
  const candidateIds = users.map((u) => u._id);
  const latestApps = await Application.find({ candidateId: { $in: candidateIds } })
    .sort({ appliedAt: -1 })
    .populate('jobId', 'title');

  const appMap = {};
  latestApps.forEach((app) => {
    if (!appMap[app.candidateId.toString()]) {
      appMap[app.candidateId.toString()] = [];
    }
    appMap[app.candidateId.toString()].push({
      _id: app._id,
      jobTitle: app.jobId?.title,
      matchScore: app.matchScore,
      status: app.status,
      appliedAt: app.appliedAt,
    });
  });

  const candidates = users.map((u) => ({
    _id: u._id,
    email: u.email,
    profile: u.profile,
    applications: appMap[u._id.toString()] || [],
    createdAt: u.createdAt,
  }));

  res.json({
    candidates,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
}));

module.exports = router;
