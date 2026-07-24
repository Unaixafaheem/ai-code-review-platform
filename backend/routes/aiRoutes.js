const express = require('express');
const multer = require('multer');
const {
  analyze,
  analyzeStream,
  analyzeGithub,
  analyzeMultifileHandler,
  analyzeMultifileStreamHandler,
  compare,
  scanCodeSecrets,
} = require('../controllers/aiController');
const { manualPrReview } = require('../controllers/webhookController');
const { executeCode } = require('../controllers/sandboxController');
const { enqueueGithub, enqueueMultifile } = require('../controllers/jobController');
const { protect } = require('../middleware/auth');
const { attachUser, checkQuota } = require('../middleware/quota');
const { extractZipMiddleware } = require('../middleware/zipUpload');
const { secretScanMiddleware } = require('../services/secretScanner');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.originalname.toLowerCase().endsWith('.zip')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip uploads are supported'));
    }
  },
});

router.use(protect, attachUser);

router.post('/scan-secrets', scanCodeSecrets);
router.post('/execute', checkQuota, executeCode);

router.post('/analyze', checkQuota, secretScanMiddleware, analyze);
router.post('/analyze/stream', checkQuota, secretScanMiddleware, analyzeStream);
router.post('/github', checkQuota, analyzeGithub);
router.post('/github/queue', checkQuota, enqueueGithub);
router.post('/multifile', checkQuota, secretScanMiddleware, analyzeMultifileHandler);
router.post(
  '/multifile/zip',
  checkQuota,
  upload.single('zip'),
  extractZipMiddleware,
  analyzeMultifileHandler
);
router.post('/multifile/queue', checkQuota, secretScanMiddleware, enqueueMultifile);
router.post(
  '/multifile/zip/queue',
  checkQuota,
  upload.single('zip'),
  extractZipMiddleware,
  enqueueMultifile
);
router.post('/multifile/stream', checkQuota, secretScanMiddleware, analyzeMultifileStreamHandler);
router.post('/pr-review', checkQuota, manualPrReview);
router.post('/compare', checkQuota, secretScanMiddleware, compare);

module.exports = router;
