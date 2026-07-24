const express = require('express');
const { listRules, createRule, updateRule, deleteRule } = require('../controllers/ruleController');
const { protect } = require('../middleware/auth');
const { attachUser } = require('../middleware/quota');

const router = express.Router();
router.use(protect, attachUser);

router.get('/', listRules);
router.post('/', createRule);
router.patch('/:id', updateRule);
router.delete('/:id', deleteRule);

module.exports = router;
