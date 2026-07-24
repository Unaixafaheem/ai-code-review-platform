const express = require('express');
const { getJob } = require('../controllers/jobController');
const { protect } = require('../middleware/auth');
const { attachUser } = require('../middleware/quota');

const router = express.Router();
router.use(protect, attachUser);
router.get('/:id', getJob);

module.exports = router;
