const express = require('express');
const {
  createTeam,
  listTeams,
  getTeam,
  joinTeam,
  setActiveTeam,
  clearActiveTeam,
  regenerateInvite,
  updateMemberRole,
} = require('../controllers/teamController');
const { protect } = require('../middleware/auth');
const { attachUser } = require('../middleware/quota');

const router = express.Router();
router.use(protect, attachUser);

router.get('/', listTeams);
router.post('/', createTeam);
router.post('/join', joinTeam);
router.delete('/active', clearActiveTeam);
router.get('/:id', getTeam);
router.post('/:id/activate', setActiveTeam);
router.post('/:id/invite', regenerateInvite);
router.patch('/:id/members/:userId', updateMemberRole);

module.exports = router;
