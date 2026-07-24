const mongoose = require('mongoose');

const usageEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    taskType: { type: String, required: true },
    language: { type: String, default: 'javascript' },
    provider: { type: String },
    model: { type: String },
    tokensEst: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

usageEventSchema.index({ user: 1, createdAt: -1 });
usageEventSchema.index({ team: 1, createdAt: -1 });
usageEventSchema.index({ createdAt: 1 });

module.exports = mongoose.model('UsageEvent', usageEventSchema);
