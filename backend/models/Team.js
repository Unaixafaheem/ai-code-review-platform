const mongoose = require('mongoose');
const crypto = require('crypto');

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [memberSchema], default: [] },
    inviteCode: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(6).toString('hex'),
    },
  },
  { timestamps: true }
);

teamSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Team', teamSchema);
