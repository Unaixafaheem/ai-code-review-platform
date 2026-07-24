const express = require('express');
const { getAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { attachUser } = require('../middleware/quota');

const router = express.Router();
router.use(protect, attachUser);
router.get('/usage', getAnalytics);

module.exports = router;
