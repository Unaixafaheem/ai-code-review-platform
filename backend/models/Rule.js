const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    enabled: { type: Boolean, default: true },
    language: { type: String, default: 'any' },
  },
  { timestamps: true }
);

ruleSchema.index({ user: 1, enabled: 1 });
ruleSchema.index({ team: 1, enabled: 1 });

module.exports = mongoose.model('Rule', ruleSchema);
