const express = require('express');
const User = require('../models/User');
const Application = require('../models/Application');
const Job = require('../models/Job');
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
    blind,
    search,
    page = 1,
    limit = 20,
    sortBy = 'matchScore',
    order = 'desc',
  } = req.query;

  let recruiterBlindSetting = false;
  if (req.user.role === 'recruiter') {
    const recruiterUser = await User.findById(req.user._id).select('settings.recruiter.blindScreeningEnabled');
    recruiterBlindSetting = !!recruiterUser?.settings?.recruiter?.blindScreeningEnabled;
  }
  const blindQueryProvided = blind !== undefined;
  const isBlindMode = blindQueryProvided
    ? String(blind).toLowerCase() === 'true'
    : recruiterBlindSetting;

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
    const job = await Job.findById(jobId).select('recruiterId');
    if (!job) throw new AppError('Job not found.', 404);
    if (req.user.role === 'recruiter' && job.recruiterId.toString() !== req.user._id.toString()) {
      throw new AppError('You can only view candidates for your own jobs.', 403);
    }

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
      email: isBlindMode && !app.isIdentityRevealed ? null : app.candidateId?.email,
      profile: isBlindMode && !app.isIdentityRevealed ? {
        firstName: 'Anonymous',
        lastName: 'Candidate',
        skills: app.candidateId?.profile?.skills || [],
        experience: app.candidateId?.profile?.experience || [],
        education: app.candidateId?.profile?.education || [],
      } : app.candidateId?.profile,
      application: {
        _id: app._id,
        matchScore: app.matchScore,
        scoreBreakdown: app.scoreBreakdown,
        aiExplanation: app.aiExplanation,
        status: app.status,
        appliedAt: app.appliedAt,
        isIdentityRevealed: app.isIdentityRevealed,
      },
      job: app.jobId,
    }));

    return res.json({
      candidates,
      blindMode: isBlindMode,
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
    .populate('jobId', 'title requiredSkills');

  const appMap = {};
  latestApps.forEach((app) => {
    if (!appMap[app.candidateId.toString()]) {
      appMap[app.candidateId.toString()] = [];
    }
    appMap[app.candidateId.toString()].push({
      _id: app._id,
      job: app.jobId ? {
        _id: app.jobId._id,
        title: app.jobId.title,
        requiredSkills: app.jobId.requiredSkills || [],
      } : null,
      matchScore: app.matchScore,
      scoreBreakdown: app.scoreBreakdown,
      aiExplanation: app.aiExplanation,
      status: app.status,
      appliedAt: app.appliedAt,
    });
  });

  const candidates = users.map((u) => {
    const candidateApps = appMap[u._id.toString()] || [];
    const latestApp = candidateApps[0] || null;
    return {
      _id: u._id,
      email: isBlindMode ? null : u.email,
      profile: isBlindMode ? {
        firstName: 'Anonymous',
        lastName: 'Candidate',
        skills: u.profile?.skills || [],
        experience: u.profile?.experience || [],
        education: u.profile?.education || [],
      } : u.profile,
      application: latestApp ? {
        _id: latestApp._id,
        matchScore: latestApp.matchScore,
        scoreBreakdown: latestApp.scoreBreakdown,
        aiExplanation: latestApp.aiExplanation,
        status: latestApp.status,
        appliedAt: latestApp.appliedAt,
      } : null,
      job: latestApp?.job || null,
      applications: candidateApps.map((app) => ({
        _id: app._id,
        jobTitle: app.job?.title,
        matchScore: app.matchScore,
        status: app.status,
        appliedAt: app.appliedAt,
      })),
      createdAt: u.createdAt,
    };
  });

  res.json({
    candidates,
    blindMode: isBlindMode,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
}));

module.exports = router;
