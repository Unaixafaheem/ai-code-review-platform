const express = require('express');
const { handleGithubWebhook } = require('../controllers/webhookController');

const router = express.Router();

// Raw body is attached in server.js for signature verification
router.post('/github', handleGithubWebhook);

module.exports = router;
