const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
    index: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true,
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  scheduledAt: {
    type: Date,
    required: [true, 'Scheduled date/time is required'],
    index: true,
  },
  duration: {
    type: Number, // minutes
    default: 60,
    min: 15,
    max: 480,
  },
  timezone: {
    type: String,
    default: 'UTC',
    trim: true,
  },
  link: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['video', 'phone', 'in-person', 'technical', 'hr'],
    default: 'video',
  },
  notes: {
    type: String,
    maxlength: 2000,
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no-show'],
    default: 'scheduled',
    index: true,
  },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comments: String,
    recommendation: {
      type: String,
      enum: ['strong-hire', 'hire', 'no-hire', 'strong-no-hire', 'pending'],
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  calendarEventId: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Prevent double-booking: unique on scheduledAt + recruiterId within a time window
interviewSchema.index({ recruiterId: 1, scheduledAt: 1 });
interviewSchema.index({ candidateId: 1, scheduledAt: 1 });

module.exports = mongoose.model('Interview', interviewSchema);
