const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    action: { type: String, required: true },
    resourceType: { type: String, default: 'review' },
    resourceId: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

auditSchema.index({ actor: 1, createdAt: -1 });
auditSchema.index({ team: 1, createdAt: -1 });
auditSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditSchema);
