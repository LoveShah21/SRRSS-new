const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const upload = require('../middleware/upload');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const storageService = require('../services/storageService');

const router = express.Router();

/**
 * POST /api/resume/upload — Upload and parse resume (Candidate)
 * Uploads the file to Cloudflare R2, then triggers AI parsing.
 */
router.post('/upload', authenticate, authorize('candidate'), upload.single('resume'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded.', 400);

  // Upload file buffer to Cloudflare R2
  const r2Key = storageService.generateKey(req.user._id.toString(), req.file.originalname);
  const { key, url } = await storageService.uploadFile({
    buffer: req.file.buffer,
    key: r2Key,
    contentType: req.file.mimetype,
    metadata: {
      userId: req.user._id.toString(),
      originalName: req.file.originalname,
    },
  });

  const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'docx';

  // Save the R2 key and URL to the user's profile
  await User.findByIdAndUpdate(req.user._id, {
    'profile.resumeUrl': url,
    'profile.resumeKey': key, // R2 object key for presigned URL generation
  });

  // Call AI service to parse resume
  let parsedData = null;
  try {
    const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    // Generate a temporary download URL so the AI service can fetch the file
    const tempDownloadUrl = await storageService.getDownloadUrl(key, 600); // 10 min expiry

    const result = await axios.post(`${aiUrl}/api/parse-resume`, {
      file_url: tempDownloadUrl,
      file_path: key,          // fallback identifier
      file_type: fileType,
    }, { timeout: 15000 });

    parsedData = result.data;

    // Auto-fill user profile with parsed data
    const updateFields = {};
    if (parsedData.skills?.length) updateFields['profile.skills'] = parsedData.skills;
    if (parsedData.education?.length) updateFields['profile.education'] = parsedData.education;
    if (parsedData.experience?.length) updateFields['profile.experience'] = parsedData.experience;
    updateFields['profile.parsedAt'] = new Date();

    await User.findByIdAndUpdate(req.user._id, { $set: updateFields });
  } catch (err) {
    // AI service unavailable — file is stored, skip parsing
    console.warn('AI parse failed:', err.message);
  }

  const updatedUser = await User.findById(req.user._id);

  res.status(200).json({
    message: parsedData ? 'Resume uploaded and parsed.' : 'Resume uploaded (parsing pending).',
    parsed: parsedData,
    user: updatedUser,
  });
}));

/**
 * GET /api/resume/download — Get a presigned download URL for the candidate's resume
 */
router.get('/download', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const resumeKey = user?.profile?.resumeKey;

  if (!resumeKey) {
    throw new AppError('No resume found. Please upload a resume first.', 404);
  }

  const downloadUrl = await storageService.getDownloadUrl(resumeKey, 3600); // 1 hour expiry

  res.json({
    url: downloadUrl,
    expiresIn: 3600,
  });
}));

/**
 * GET /api/resume/profile — Get candidate parsed profile
 */
router.get('/profile', authenticate, authorize('candidate'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({
    profile: user.profile,
  });
}));

/**
 * PUT /api/resume/profile — Manually update parsed profile
 */
router.put('/profile', authenticate, authorize('candidate'), asyncHandler(async (req, res) => {
  const { firstName, lastName, skills, education, experience, phone, linkedIn } = req.body;

  const updateFields = {};
  if (firstName) updateFields['profile.firstName'] = firstName;
  if (lastName) updateFields['profile.lastName'] = lastName;
  if (skills) updateFields['profile.skills'] = skills;
  if (education) updateFields['profile.education'] = education;
  if (experience) updateFields['profile.experience'] = experience;
  if (phone) updateFields['profile.phone'] = phone;
  if (linkedIn) updateFields['profile.linkedIn'] = linkedIn;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    { returnDocument: 'after' },
  );

  res.json({ message: 'Profile updated.', profile: user.profile });
}));

/**
 * PATCH /api/resume/profile — Alias for PUT (partial update)
 */
router.patch('/profile', authenticate, authorize('candidate'), asyncHandler(async (req, res) => {
  const { firstName, lastName, skills, education, experience, phone, linkedIn } = req.body;

  const updateFields = {};
  if (firstName) updateFields['profile.firstName'] = firstName;
  if (lastName) updateFields['profile.lastName'] = lastName;
  if (skills) updateFields['profile.skills'] = skills;
  if (education) updateFields['profile.education'] = education;
  if (experience) updateFields['profile.experience'] = experience;
  if (phone) updateFields['profile.phone'] = phone;
  if (linkedIn) updateFields['profile.linkedIn'] = linkedIn;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    { returnDocument: 'after' },
  );

  res.json({ message: 'Profile updated.', profile: user.profile });
}));

module.exports = router;
