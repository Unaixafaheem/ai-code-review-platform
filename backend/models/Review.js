const mongoose = require('mongoose');

const annotationSchema = new mongoose.Schema(
  {
    line: { type: Number, required: true },
    severity: {
      type: String,
      enum: ['error', 'warning', 'info'],
      default: 'warning',
    },
    message: { type: String, required: true },
    file: { type: String },
  },
  { _id: false }
);

const issueSchema = new mongoose.Schema(
  {
    line: { type: Number, default: 1 },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    confidence: { type: Number, min: 0, max: 100, default: 70 },
    message: { type: String, required: true },
    category: { type: String, default: 'general' },
    file: { type: String },
  },
  { _id: false }
);

const fileSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    content: { type: String, required: true },
    language: { type: String },
  },
  { _id: false }
);

const responseSchema = new mongoose.Schema(
  {
    explanation: { type: String, required: true },
    fix: { type: String, required: true },
    improvedCode: { type: String, required: true },
    bestPractices: { type: String, required: true },
    complexity: { type: String, required: true },
    annotations: { type: [annotationSchema], default: [] },
    issues: { type: [issueSchema], default: [] },
  },
  { _id: false }
);

const compareResultSchema = new mongoose.Schema(
  {
    provider: String,
    model: String,
    latencyMs: Number,
    tokensEst: Number,
    estimatedCostUsd: Number,
    response: responseSchema,
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    code: { type: String, required: true },
    language: { type: String, default: 'javascript' },
    targetLanguage: { type: String },
    error: { type: String },
    taskType: {
      type: String,
      enum: [
        'review',
        'debug',
        'optimize',
        'explain',
        'convert',
        'security',
        'docs',
        'github',
        'multifile',
        'pr-review',
        'test',
        'refactor',
        'compare',
      ],
      required: true,
    },
    githubUrl: { type: String },
    files: { type: [fileSchema], default: undefined },
    response: { type: responseSchema, required: true },
    shareId: { type: String, unique: true, sparse: true },
    rulesApplied: [{ type: String }],
    provider: { type: String },
    model: { type: String },
    tokensEst: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    compareResults: { type: [compareResultSchema], default: undefined },
  },
  { timestamps: true }
);

reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ team: 1, createdAt: -1 });
reviewSchema.index({ taskType: 1 });
reviewSchema.index({ shareId: 1 }, { sparse: true });

module.exports = mongoose.model('Review', reviewSchema);
