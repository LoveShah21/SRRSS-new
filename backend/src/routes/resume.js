const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const upload = require('../middleware/upload');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * POST /api/resume/upload — Upload and parse resume (Candidate)
 */
router.post('/upload', authenticate, authorize('candidate'), upload.single('resume'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded.', 400);

  const filePath = req.file.path;
  const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'docx';

  // Save resume URL immediately
  await User.findByIdAndUpdate(req.user._id, {
    'profile.resumeUrl': filePath,
  });

  // Call AI service to parse resume
  let parsedData = null;
  try {
    const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const result = await axios.post(`${aiUrl}/api/parse-resume`, {
      file_path: filePath,
      file_type: fileType,
    }, { timeout: 10000 });

    parsedData = result.data;

    // Auto-fill user profile with parsed data
    const updateFields = {};
    if (parsedData.skills?.length) updateFields['profile.skills'] = parsedData.skills;
    if (parsedData.education?.length) updateFields['profile.education'] = parsedData.education;
    if (parsedData.experience?.length) updateFields['profile.experience'] = parsedData.experience;
    updateFields['profile.parsedAt'] = new Date();

    await User.findByIdAndUpdate(req.user._id, { $set: updateFields });
  } catch (err) {
    // AI service unavailable — store file, skip parsing
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
  const { skills, education, experience, phone, linkedIn } = req.body;

  const updateFields = {};
  if (skills) updateFields['profile.skills'] = skills;
  if (education) updateFields['profile.education'] = education;
  if (experience) updateFields['profile.experience'] = experience;
  if (phone) updateFields['profile.phone'] = phone;
  if (linkedIn) updateFields['profile.linkedIn'] = linkedIn;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    { new: true },
  );

  res.json({ message: 'Profile updated.', profile: user.profile });
}));

module.exports = router;
