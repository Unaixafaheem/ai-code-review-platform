const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    review: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
  },
  { timestamps: true }
);

commentSchema.index({ review: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
