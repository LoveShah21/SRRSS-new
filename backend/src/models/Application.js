const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['applied', 'shortlisted', 'interview', 'hired', 'rejected'],
    required: true,
  },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true,
  },
  matchScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  scoreBreakdown: {
    skills: { type: Number, default: 0 },
    experience: { type: Number, default: 0 },
    education: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: ['applied', 'shortlisted', 'interview', 'hired', 'rejected'],
    default: 'applied',
    index: true,
  },
  statusHistory: {
    type: [statusHistorySchema],
    default: function () {
      return [{ status: 'applied', changedAt: new Date() }];
    },
  },
  interview: {
    scheduledAt: Date,
    link: String,
    notes: String,
  },
  appliedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Prevent duplicate applications
applicationSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });

// For recruiter sorted views
applicationSchema.index({ jobId: 1, matchScore: -1 });

module.exports = mongoose.model('Application', applicationSchema);
