const express = require('express');
const { listAuditLogs } = require('../controllers/auditController');
const { protect } = require('../middleware/auth');
const { attachUser } = require('../middleware/quota');

const router = express.Router();
router.use(protect, attachUser);
router.get('/', listAuditLogs);

module.exports = router;
