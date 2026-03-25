const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    index: true,
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
  },
  requiredSkills: {
    type: [String],
    default: [],
    index: true,
  },
  experienceMin: {
    type: Number,
    default: 0,
    min: 0,
  },
  experienceMax: {
    type: Number,
    default: 99,
  },
  location: {
    type: String,
    trim: true,
  },
  salaryRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'draft'],
    default: 'open',
    index: true,
  },
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  biasFlags: {
    type: [{ term: String, suggestion: String, severity: String }],
    default: [],
  },
  applicantCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Compound index for search
jobSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Job', jobSchema);
