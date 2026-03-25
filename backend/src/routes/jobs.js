const express = require('express');
const axios = require('axios');
const Job = require('../models/Job');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/jobs — List all open jobs (with search/filter)
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { search, skills, location, status, page = 1, limit = 20 } = req.query;

  const query = {};

  // Default: show only open jobs for candidates
  if (req.user.role === 'candidate') {
    query.status = 'open';
  } else if (status) {
    query.status = status;
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Filter by skills
  if (skills) {
    const skillList = skills.split(',').map((s) => s.trim());
    query.requiredSkills = { $in: skillList };
  }

  // Filter by location
  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }

  // Recruiter can only see their own jobs
  if (req.user.role === 'recruiter') {
    query.recruiterId = req.user._id;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [jobs, total] = await Promise.all([
    Job.find(query)
      .populate('recruiterId', 'profile.firstName profile.lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Job.countDocuments(query),
  ]);

  res.json({
    jobs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
}));

/**
 * GET /api/jobs/:id — Get single job
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id)
    .populate('recruiterId', 'profile.firstName profile.lastName email');

  if (!job) throw new AppError('Job not found.', 404);
  res.json({ job });
}));

/**
 * POST /api/jobs — Create a new job
 */
router.post('/', authenticate, authorize('recruiter', 'admin'), asyncHandler(async (req, res) => {
  const { title, description, requiredSkills, experienceMin, experienceMax, location, salaryRange } = req.body;

  if (!title || !description) {
    throw new AppError('Title and description are required.', 400);
  }

  const jobData = {
    title,
    description,
    requiredSkills: requiredSkills || [],
    experienceMin, experienceMax,
    location,
    salaryRange,
    recruiterId: req.user._id,
  };

  // Call AI bias detection (non-blocking, best effort)
  try {
    const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const biasResult = await axios.post(`${aiUrl}/api/detect-bias`, {
      job_description: description,
    }, { timeout: 3000 });
    if (biasResult.data?.biasFlags?.length > 0) {
      jobData.biasFlags = biasResult.data.biasFlags;
    }
  } catch {
    // AI service unavailable — continue without bias check
  }

  const job = await Job.create(jobData);
  res.status(201).json({ message: 'Job created successfully.', job });
}));

/**
 * PUT /api/jobs/:id — Update a job
 */
router.put('/:id', authenticate, authorize('recruiter', 'admin'), asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new AppError('Job not found.', 404);

  // Recruiters can only update their own jobs
  if (req.user.role === 'recruiter' && job.recruiterId.toString() !== req.user._id.toString()) {
    throw new AppError('You can only edit your own job postings.', 403);
  }

  const allowedFields = ['title', 'description', 'requiredSkills', 'experienceMin', 'experienceMax', 'location', 'salaryRange', 'status'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) job[field] = req.body[field];
  });

  await job.save();
  res.json({ message: 'Job updated.', job });
}));

/**
 * DELETE /api/jobs/:id — Delete a job (Admin only)
 */
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const job = await Job.findByIdAndDelete(req.params.id);
  if (!job) throw new AppError('Job not found.', 404);
  res.json({ message: 'Job deleted.' });
}));

module.exports = router;
