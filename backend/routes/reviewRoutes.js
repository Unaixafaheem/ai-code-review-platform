const express = require('express');
const {
  getReviews,
  getReview,
  shareReview,
  unshareReview,
  getSharedReview,
  listComments,
  addComment,
  deleteComment,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { attachUser } = require('../middleware/quota');

const router = express.Router();

router.get('/share/:shareId', getSharedReview);

router.use(protect, attachUser);
router.get('/', getReviews);
router.get('/:id', getReview);
router.post('/:id/share', shareReview);
router.delete('/:id/share', unshareReview);
router.get('/:id/comments', listComments);
router.post('/:id/comments', addComment);
router.delete('/:id/comments/:commentId', deleteComment);

module.exports = router;
