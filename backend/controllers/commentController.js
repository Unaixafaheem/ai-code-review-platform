const Comment = require('../models/Comment');
const Review = require('../models/Review');
const Team = require('../models/Team');

async function canAccessReview(review, userId) {
  if (String(review.user) === String(userId)) return true;
  if (!review.team) return false;
  const team = await Team.findById(review.team);
  if (!team) return false;
  return team.members.some((m) => String(m.user) === String(userId));
}

const listComments = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).select('user team');
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (!(await canAccessReview(review, req.user.id))) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const comments = await Comment.find({ review: req.params.id })
      .populate('user', 'name email')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ message: 'Comment body is required' });

    const review = await Review.findById(req.params.id).select('user team');
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (!(await canAccessReview(review, req.user.id))) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const comment = await Comment.create({
      review: req.params.id,
      user: req.user.id,
      body: body.trim(),
    });

    const populated = await comment.populate('user', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (String(comment.user) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { listComments, addComment, deleteComment };
