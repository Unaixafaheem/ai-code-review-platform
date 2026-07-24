const crypto = require('crypto');
const Review = require('../models/Review');
const Team = require('../models/Team');
const { listComments, addComment, deleteComment } = require('./commentController');

async function accessibleReviewFilter(userId) {
  const teams = await Team.find({ 'members.user': userId }).select('_id');
  const teamIds = teams.map((t) => t._id);
  return {
    $or: [{ user: userId }, ...(teamIds.length ? [{ team: { $in: teamIds } }] : [])],
  };
}

const getReviews = async (req, res) => {
  try {
    const filter = await accessibleReviewFilter(req.user.id);
    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .select('-code -response.improvedCode -files.content')
      .limit(100);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReview = async (req, res) => {
  try {
    const filter = await accessibleReviewFilter(req.user.id);
    const review = await Review.findOne({ _id: req.params.id, ...filter });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const shareReview = async (req, res) => {
  try {
    const filter = await accessibleReviewFilter(req.user.id);
    const review = await Review.findOne({ _id: req.params.id, ...filter });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (!review.shareId) {
      review.shareId = crypto.randomBytes(10).toString('hex');
      await review.save();
    }

    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
    const shareUrl = `${clientUrl}/share/${review.shareId}`;

    res.json({
      shareId: review.shareId,
      shareUrl,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const unshareReview = async (req, res) => {
  try {
    const filter = await accessibleReviewFilter(req.user.id);
    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, ...filter },
      { $unset: { shareId: 1 } },
      { new: true }
    );
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    res.json({ message: 'Share link revoked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSharedReview = async (req, res) => {
  try {
    const review = await Review.findOne({ shareId: req.params.shareId })
      .select('-user')
      .lean();

    if (!review) {
      return res.status(404).json({ message: 'Shared review not found or link revoked' });
    }

    res.json({
      shareId: review.shareId,
      taskType: review.taskType,
      language: review.language,
      targetLanguage: review.targetLanguage,
      githubUrl: review.githubUrl,
      code: review.code,
      files: review.files?.map((f) => ({ path: f.path, language: f.language, content: f.content })),
      response: review.response,
      compareResults: review.compareResults,
      createdAt: review.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getReviews,
  getReview,
  shareReview,
  unshareReview,
  getSharedReview,
  listComments,
  addComment,
  deleteComment,
};
