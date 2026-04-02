const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  userRole: {
    type: String,
    enum: ['candidate', 'recruiter', 'admin'],
  },
  targetType: {
    type: String,
    enum: ['user', 'job', 'application', 'interview', 'resume', 'system'],
    index: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
    trim: true,
  },
  userAgent: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
