const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const upload = require('../middleware/upload');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const storageService = require('../services/storageService');
const { isSafeExternalUrl } = require('../utils/urlValidator');
const { getAiServiceUrl, getAiTrustedInternalHosts } = require('../utils/aiConfig');
const logger = require('../utils/logger');

const router = express.Router();

function normalizeYear(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : undefined;
}

function normalizeYears(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : undefined;
}

function splitJoinedWords(value = '') {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/(?<=[A-Z])(?=[A-Z][a-z])/g, ' ')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2');
}

function cleanText(value) {
  if (typeof value !== 'string') return '';
  return splitJoinedWords(value)
    .replace(/[|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSkills(entries = []) {
  if (!Array.isArray(entries)) return [];
  const deduped = [];
  const seen = new Set();

  for (const raw of entries) {
    const skill = cleanText(String(raw || ''));
    if (!skill) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(skill);
  }

  return deduped.slice(0, 40);
}

function normalizeEducation(entries = []) {
  if (!Array.isArray(entries)) return [];
  const seen = new Set();

  return entries
    .map((edu) => {
      const degree = cleanText(edu?.degree || edu?.course || '');
      const institution = cleanText(edu?.institution || edu?.school || '');
      const year = normalizeYear(edu?.year);
      return { degree, institution, year };
    })
    .filter((edu) => {
      const degreeLower = edu.degree.toLowerCase();
      const looksLikeNoise = degreeLower.includes('percentage') || degreeLower.includes('cgpa');
      const duplicateDegreeInstitution = edu.degree && edu.institution && edu.degree.toLowerCase() === edu.institution.toLowerCase();
      const lowValueDuplicate = duplicateDegreeInstitution && !edu.year;
      return !looksLikeNoise && (edu.degree || edu.institution || edu.year) && !lowValueDuplicate;
    })
    .filter((edu) => {
      const key = `${edu.degree.toLowerCase()}|${edu.institution.toLowerCase()}|${edu.year ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function normalizeExperience(entries = []) {
  if (!Array.isArray(entries)) return [];
  const seen = new Set();

  return entries
    .map((exp) => {
      let title = cleanText(exp?.title || exp?.role || exp?.position || '');
      let company = cleanText(exp?.company || exp?.organization || '');
      const description = cleanText(exp?.description || '');
      const years = normalizeYears(exp?.years ?? exp?.duration);

      if (!title && description) title = description;

      if (!company && title.includes(' at ')) {
        const [left, ...rest] = title.split(' at ');
        title = cleanText(left);
        company = cleanText(rest.join(' at '));
      }

      if (company && title.toLowerCase().includes(company.toLowerCase())) {
        title = cleanText(title.replace(new RegExp(escapeRegExp(company), 'ig'), ''));
      }

      if (title.split(' ').length > 16) {
        title = title.split(' ').slice(0, 16).join(' ');
      }

      return { title, company, years, description };
    })
    .filter((exp) => {
      const titleLower = exp.title.toLowerCase();
      const looksLikeNoise = titleLower.includes('percentage') || titleLower.includes('cgpa');
      return !looksLikeNoise && (exp.title || exp.company || Number.isFinite(exp.years) || exp.description);
    })
    .filter((exp) => {
      const key = `${exp.title.toLowerCase()}|${exp.company.toLowerCase()}|${exp.years ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function normalizeProjects(entries = []) {
  if (!Array.isArray(entries)) return [];
  const seen = new Set();

  return entries
    .map((project) => {
      const name = cleanText(project?.name || project?.title || '');
      const description = cleanText(project?.description || project?.summary || '');
      const rawTech = Array.isArray(project?.techStack)
        ? project.techStack
        : cleanText(project?.techStack || project?.stack || '').split(',');
      const techStack = rawTech
        .map((item) => cleanText(String(item || '')))
        .filter(Boolean)
        .slice(0, 12);

      return { name, techStack, description };
    })
    .filter((project) => project.name || project.description || project.techStack.length)
    .filter((project) => {
      const key = `${project.name.toLowerCase()}|${project.description.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function sanitizeProfile(profile = {}) {
  const source = profile?.toObject ? profile.toObject() : profile;
  return {
    ...source,
    skills: normalizeSkills(source?.skills || []),
    education: normalizeEducation(source?.education || []),
    experience: normalizeExperience(source?.experience || []),
    projects: normalizeProjects(source?.projects || []),
  };
}

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
    const aiUrl = getAiServiceUrl();
    const aiApiKey = process.env.AI_SERVICE_API_KEY;
    const isSafe = await isSafeExternalUrl(aiUrl, { allowInternalHosts: getAiTrustedInternalHosts() });
    if (isSafe && aiApiKey) {
      // Generate a temporary download URL so the AI service can fetch the file
      const tempDownloadUrl = await storageService.getDownloadUrl(key, 600); // 10 min expiry

      const result = await axios.post(`${aiUrl}/api/parse-resume`, {
        file_url: tempDownloadUrl,
        file_path: key,          // fallback identifier
        file_type: fileType,
      }, {
        timeout: 15000,
        headers: {
          'X-API-KEY': aiApiKey,
        },
      });

      parsedData = result.data;

      // Auto-fill user profile with parsed data
      const updateFields = {};
      const normalizedSkills = normalizeSkills(parsedData.skills);
      if (normalizedSkills.length) updateFields['profile.skills'] = normalizedSkills;

      const normalizedEducation = normalizeEducation(parsedData.education);
      if (normalizedEducation.length) {
        updateFields['profile.education'] = normalizedEducation;
      }

      const normalizedExperience = normalizeExperience(parsedData.experience);
      if (normalizedExperience.length) {
        updateFields['profile.experience'] = normalizedExperience;
      }

      const normalizedProjects = normalizeProjects(parsedData.projects);
      if (normalizedProjects.length) {
        updateFields['profile.projects'] = normalizedProjects;
      }

      const parsedLinkedIn = cleanText(parsedData?.links?.linkedIn || parsedData?.linkedIn || '');
      if (parsedLinkedIn) {
        updateFields['profile.linkedIn'] = parsedLinkedIn;
      }

      updateFields['profile.parsedAt'] = new Date();

      await User.findByIdAndUpdate(req.user._id, { $set: updateFields });
    } else if (!isSafe) {
      logger.warn('AI service URL blocked — potential SSRF target', { url: aiUrl });
    } else {
      logger.warn('AI_SERVICE_API_KEY missing — skipping resume parsing.');
    }
  } catch (err) {
    // AI service unavailable — file is stored, skip parsing
    logger.warn('Resume AI parse failed', { error: err.message });
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
    profile: sanitizeProfile(user.profile || {}),
  });
}));

/**
 * PUT /api/resume/profile — Manually update parsed profile
 */
router.put('/profile', authenticate, authorize('candidate'), asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    skills,
    education,
    experience,
    projects,
    phone,
    linkedIn,
  } = req.body;

  const updateFields = {};
  if (firstName) updateFields['profile.firstName'] = firstName;
  if (lastName) updateFields['profile.lastName'] = lastName;
  if (skills) updateFields['profile.skills'] = normalizeSkills(skills);
  if (education) updateFields['profile.education'] = normalizeEducation(education);
  if (experience) updateFields['profile.experience'] = normalizeExperience(experience);
  if (projects) updateFields['profile.projects'] = normalizeProjects(projects);
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
  const {
    firstName,
    lastName,
    skills,
    education,
    experience,
    projects,
    phone,
    linkedIn,
  } = req.body;

  const updateFields = {};
  if (firstName) updateFields['profile.firstName'] = firstName;
  if (lastName) updateFields['profile.lastName'] = lastName;
  if (skills) updateFields['profile.skills'] = normalizeSkills(skills);
  if (education) updateFields['profile.education'] = normalizeEducation(education);
  if (experience) updateFields['profile.experience'] = normalizeExperience(experience);
  if (projects) updateFields['profile.projects'] = normalizeProjects(projects);
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
